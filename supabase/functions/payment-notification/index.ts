// supabase/functions/payment-notification/index.ts
//
// Webhook yang DIPANGGIL OLEH MIDTRANS (bukan dari frontend kita), tiap kali
// status pembayaran berubah (pending -> settlement/capture, expire, cancel, dll).
// Deploy pakai --no-verify-jwt karena request datangnya dari server Midtrans,
// bukan user yang login, jadi gak ada JWT Supabase yang bisa dicek.
//
// Alurnya:
//  1. Terima payload notifikasi dari Midtrans (order_id, transaction_status, dll)
//  2. Verifikasi signature_key -> mastiin notifikasi ini beneran dari Midtrans,
//     bukan orang lain yang nembak endpoint ini secara langsung
//  3. Mapping transaction_status Midtrans -> enum status_pembayaran kita
//     (menunggu | berhasil | gagal | refund)
//  4. Update tabel `transaksi` (kolom status)
//
// CATATAN: tabel `booking` TIDAK punya kolom status pembayaran terpisah —
// kolom `status`-nya (enum booking_status) itu buat progress servis
// (menunggu/dikonfirmasi/selesai/dll), bukan status bayar. Jadi status
// pembayaran cukup disimpan di tabel `transaksi` aja; halaman Admin/Laporan
// query status bayar dari situ, bukan dari booking.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!.trim()

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapping status Midtrans -> nilai enum status_pembayaran kita.
// Enum kita cuma punya 4 nilai: menunggu, berhasil, gagal, refund.
// cancel & expire gak punya padanan sendiri, jadi dipetakan ke 'gagal'.
function mapMidtransStatus(transactionStatus: string, fraudStatus: string | undefined) {
  switch (transactionStatus) {
    case 'capture':
      // Khusus kartu kredit, capture masih perlu dicek fraud_status
      if (fraudStatus === 'challenge') return 'menunggu'
      if (fraudStatus === 'accept') return 'berhasil'
      return 'menunggu'
    case 'settlement':
      return 'berhasil'
    case 'pending':
      return 'menunggu'
    case 'deny':
    case 'cancel':
    case 'expire':
      return 'gagal'
    case 'refund':
    case 'partial_refund':
      return 'refund'
    default:
      return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const payload = await req.json()
    const {
      order_id,
      status_code,
      gross_amount,
      transaction_status,
      fraud_status,
      signature_key,
      payment_type,
    } = payload

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      return new Response(JSON.stringify({ error: 'Payload notifikasi tidak lengkap' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // --- Verifikasi signature ---
    // Rumus resmi Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey)
    const rawSignature = `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-512', encoder.encode(rawSignature))
    const computedSignature = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (computedSignature !== signature_key) {
      console.error('Signature tidak cocok untuk order_id:', order_id)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const statusBaru = mapMidtransStatus(transaction_status, fraud_status)
    if (!statusBaru) {
      // Status yang belum kita handle, gak perlu di-update, tapi tetap balas 200
      // biar Midtrans gak nganggep gagal & retry terus-terusan.
      console.log('Status Midtrans belum di-handle:', transaction_status, 'order_id:', order_id)
      return new Response(JSON.stringify({ message: 'Diabaikan, status belum di-handle' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- Update transaksi (satu-satunya tempat status pembayaran disimpan) ---
    const { data: transaksi, error: transaksiError } = await supabaseAdmin
      .from('transaksi')
      .update({
        status: statusBaru,
        metode_pembayaran: payment_type ?? undefined,
      })
      .eq('kode_transaksi', order_id)
      .select('id, booking_id, jenis')
      .single()

    if (transaksiError || !transaksi) {
      console.error('Transaksi tidak ditemukan untuk order_id:', order_id, transaksiError)
      return new Response(JSON.stringify({ error: 'Transaksi tidak ditemukan' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ message: 'Notifikasi diproses', status: statusBaru }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('payment-notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})