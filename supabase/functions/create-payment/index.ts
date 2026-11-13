// supabase/functions/create-payment/index.ts
//
// Dipanggil dari frontend saat customer membayar booking (langsung setelah mengajukan booking,
// atau dari Detail/Riwayat Booking kalau popup tadi ditutup sebelum bayar).
// Alurnya:
//  1. Terima booking_id dari frontend
//  2. Validasi: booking milik user yang login, belum dibatalkan, belum dibayar
//  3. Hitung total di SERVER: biaya final dari admin, atau harga layanan dikurangi diskon promo
//     (promo diverifikasi ulang ke tabel promo, jadi tidak bisa dimanipulasi dari browser)
//  4. Buat baris baru di tabel `transaksi` (status: 'menunggu')
//  5. Panggil Midtrans Snap API pakai Server Key (rahasia, aman di sini)
//  6. Balikin snap `token` ke frontend buat dibuka lewat Snap.js

import { createClient } from 'jsr:@supabase/supabase-js@2'

const MIDTRANS_SERVER_KEY = Deno.env.get('MIDTRANS_SERVER_KEY')!.trim()
const MIDTRANS_IS_PRODUCTION = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
const MIDTRANS_SNAP_URL = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { booking_id } = await req.json()
    if (!booking_id) return jsonResponse({ error: 'booking_id wajib diisi' }, 400)

    // Validasi identitas user dari token login yang memanggil
    const authHeader = req.headers.get('Authorization')
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader ?? '' } } }
    )
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Belum login' }, 401)

    // Query data pakai service role supaya bisa join semua tabel dengan aman
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('booking')
      .select(`
        id, kode_booking, status, catatan, biaya_final, customer_id,
        layanan:layanan_id ( nama, harga ),
        customer:customer_id ( full_name, email, phone )
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) return jsonResponse({ error: 'Booking nggak ketemu' }, 404)
    if (booking.customer_id !== user.id) return jsonResponse({ error: 'Booking ini bukan milik Anda' }, 403)
    if (booking.status === 'dibatalkan') return jsonResponse({ error: 'Booking ini sudah dibatalkan' }, 400)

    // Sudah dibayar? Jangan buat tagihan lagi
    const { data: sudahBayar } = await supabaseAdmin
      .from('transaksi')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('jenis', 'servis')
      .eq('status', 'berhasil')
      .limit(1)
    if (sudahBayar && sudahBayar.length > 0) {
      return jsonResponse({ error: 'Booking ini sudah dibayar' }, 400)
    }

    // ---- Hitung total di server ----
    let total: number
    if (booking.biaya_final !== null && booking.biaya_final !== undefined) {
      total = Number(booking.biaya_final) // biaya final yang ditetapkan admin
    } else {
      const harga = Number(booking.layanan?.harga ?? 0)
      let diskon = 0

      // Kode promo dicatat di catatan booking: [Kode Promo: KODE — estimasi diskon Rp X]
      const match = booking.catatan?.match(/\[Kode Promo:\s*([A-Za-z0-9_-]+)/)
      if (match) {
        const hariIni = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) // tanggal WIB
        const { data: promo } = await supabaseAdmin
          .from('promo')
          .select('*')
          .eq('kode', match[1].toUpperCase())
          .eq('is_active', true)
          .lte('berlaku_dari', hariIni)
          .gte('berlaku_sampai', hariIni)
          .maybeSingle()

        if (promo && (!promo.min_transaksi || harga >= Number(promo.min_transaksi))) {
          diskon = promo.tipe_diskon === 'persen'
            ? Math.round((harga * Number(promo.nilai)) / 100)
            : Math.min(Number(promo.nilai), harga)
        }
      }
      total = harga - diskon
    }

    if (!total || total <= 0) {
      return jsonResponse({ error: 'Biaya servis belum ditentukan, hubungi admin dulu' }, 400)
    }

    const kodeTransaksi = `TRX${Date.now()}`

    // Buat baris transaksi dulu dengan status "menunggu"
    const { error: transaksiError } = await supabaseAdmin
      .from('transaksi')
      .insert({
        kode_transaksi: kodeTransaksi,
        customer_id: booking.customer_id,
        booking_id: booking.id,
        jenis: 'servis',
        total,
        metode_pembayaran: 'midtrans',
        status: 'menunggu',
      })
    if (transaksiError) throw transaksiError

    // Panggil Midtrans Snap API
    const midtransRes = await fetch(MIDTRANS_SNAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(MIDTRANS_SERVER_KEY + ':'),
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: kodeTransaksi,
          gross_amount: Math.round(total),
        },
        customer_details: {
          first_name: booking.customer?.full_name ?? 'Customer',
          email: booking.customer?.email,
          phone: booking.customer?.phone,
        },
        item_details: [
          {
            id: booking.id,
            price: Math.round(total),
            quantity: 1,
            name: (booking.layanan?.nama ?? 'Servis Kai-Po').slice(0, 50),
          },
        ],
      }),
    })

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok) {
      console.error('Midtrans error:', midtransData)
      return jsonResponse({ error: midtransData.error_messages?.[0] ?? 'Gagal membuat transaksi Midtrans' }, 500)
    }

    return jsonResponse({
      snap_token: midtransData.token,
      redirect_url: midtransData.redirect_url,
      kode_transaksi: kodeTransaksi,
      total,
    })
  } catch (err) {
    console.error('create-payment error:', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})