// supabase/functions/create-transaction/index.ts
//
// Dipanggil dari frontend pas customer klik "Bayar" di suatu booking.
// Alurnya:
//  1. Terima booking_id dari frontend
//  2. Ambil detail booking (layanan, harga) dari database pakai service role
//  3. Bikin baris baru di tabel `transaksi` (status: 'menunggu')
//  4. Panggil Midtrans Snap API pakai Server Key (rahasia, aman di sini)
//  5. Balikin snap `token` ke frontend buat dibuka lewat Snap.js

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { booking_id } = await req.json()
    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'booking_id wajib diisi' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Pakai token login user yang manggil (bukan service role) buat validasi identitas,
    // tapi query datanya sendiri pakai service role biar bisa join semua tabel dengan aman
    const authHeader = req.headers.get('Authorization')
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader ?? '' } } }
    )
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Belum login' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Ambil booking + layanan + profil customer, sekalian pastiin booking ini emang punya user yang login
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('booking')
      .select(`
        id, kode_booking, biaya_estimasi, biaya_final, customer_id,
        layanan:layanan_id ( nama, harga ),
        customer:customer_id ( full_name, email, phone )
      `)
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: 'Booking nggak ketemu' }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    if (booking.customer_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Booking ini bukan milik Anda' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const total = booking.biaya_final ?? booking.biaya_estimasi ?? booking.layanan?.harga
    if (!total || total <= 0) {
      return new Response(JSON.stringify({ error: 'Biaya servis belum ditentukan, hubungi admin dulu' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const kodeTransaksi = `TRX${Date.now()}`

    // Bikin baris transaksi dulu dengan status "menunggu"
    const { data: transaksi, error: transaksiError } = await supabaseAdmin
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
      .select()
      .single()

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
      return new Response(JSON.stringify({ error: midtransData.error_messages?.[0] ?? 'Gagal membuat transaksi Midtrans' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        snap_token: midtransData.token,
        redirect_url: midtransData.redirect_url,
        kode_transaksi: kodeTransaksi,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('create-transaction error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})