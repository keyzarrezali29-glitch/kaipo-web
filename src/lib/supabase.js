// src/lib/supabase.js
// Untuk project WEB (React + Vite) — dashboard Admin & Mekanik

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================
// CONTOH PENGGUNAAN
// ============================================================

// --- LOGIN ---
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data // data.user, data.session
}

// --- CEK ROLE USER YANG LOGIN (buat redirect ke dashboard admin/mekanik) ---
export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser()

  console.log("USER:", user)

  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  console.log("PROFILE:", data)
  console.log("ERROR:", error)

  if (error) throw error

  return data
}

// --- AMBIL SEMUA BOOKING (buat halaman Booking Servis admin) ---
export async function getAllBookings() {
  const { data, error } = await supabase
    .from('booking')
    .select(`
      *,
      customer:customer_id ( full_name, phone ),
      kendaraan:kendaraan_id ( merek, model, plat_nomor ),
      layanan:layanan_id ( nama, harga ),
      mekanik:mekanik_id ( full_name )
    `)
    .order('tanggal', { ascending: false })

  if (error) throw error
  return data
}

// --- KONFIRMASI BOOKING + ASSIGN MEKANIK (admin action) ---
export async function konfirmasiBooking(bookingId, mekanikId) {
  const { data, error } = await supabase
    .from('booking')
    .update({ status: 'dijadwalkan', mekanik_id: mekanikId })
    .eq('id', bookingId)
    .select()

  if (error) throw error

  await supabase.from('booking_status_log').insert({
    booking_id: bookingId,
    status: 'dijadwalkan',
  })

  return data
}

// --- UPDATE STATUS PENGERJAAN (mekanik action) ---
export async function updateStatusServis(bookingId, status, catatan = '') {
  const { data, error } = await supabase
    .from('booking')
    .update({ status })
    .eq('id', bookingId)
    .select()

  if (error) throw error

  await supabase.from('booking_status_log').insert({
    booking_id: bookingId,
    status,
    catatan,
  })

  return data
}

// --- BUAT TRANSAKSI PEMBAYARAN (manggil Edge Function create-payment) ---
export async function buatPembayaran(transaksiId) {
  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: { transaksiId },
  })

  if (error) throw error
  return data // data.token (buat Snap.js) dan data.redirect_url
}