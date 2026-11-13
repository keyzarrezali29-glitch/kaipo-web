import { supabase } from './supabase'

// ------------------------------------------------------------
// Loader Snap.js — dimuat sekali saja, ditaruh di <head> saat dibutuhkan
// ------------------------------------------------------------
let snapScriptPromise = null

function loadSnapScript() {
  if (snapScriptPromise) return snapScriptPromise

  snapScriptPromise = new Promise((resolve, reject) => {
    if (window.snap) {
      resolve(window.snap)
      return
    }
    const script = document.createElement('script')
    script.src = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY)
    script.onload = () => resolve(window.snap)
    script.onerror = () => {
      snapScriptPromise = null // biar bisa dicoba lagi
      reject(new Error('Gagal memuat Snap.js dari Midtrans'))
    }
    document.head.appendChild(script)
  })

  return snapScriptPromise
}

/**
 * Mulai pembayaran Midtrans untuk satu booking:
 * 1. Panggil Edge Function create-payment (membuat transaksi + snap token)
 * 2. Buka popup Snap
 *
 * Callback (semua opsional): onSuccess, onPending, onError, onClose.
 * Fungsi ini selesai begitu popup dibuka (bukan saat popup ditutup).
 * Melempar error kalau gagal sebelum popup terbuka.
 */
let sedangMemulai = false // cegah klik ganda saat transaksi sedang disiapkan

export async function mulaiPembayaran(bookingId, { onSuccess, onPending, onError, onClose } = {}) {
  if (sedangMemulai) throw new Error('Pembayaran sedang disiapkan, tunggu sebentar.')
  sedangMemulai = true
  try {
    return await mulaiPembayaranInternal(bookingId, { onSuccess, onPending, onError, onClose })
  } finally {
    sedangMemulai = false
  }
}

async function mulaiPembayaranInternal(bookingId, { onSuccess, onPending, onError, onClose }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Belum login')

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Gagal membuat transaksi')

  const snap = await loadSnapScript()

  // Popup Snap dari percobaan sebelumnya bisa masih "menggantung" (misalnya setelah pindah halaman),
  // dan snap.pay() menolak dipanggil kalau popup lain masih terbuka. Tutup dulu, lalu beri jeda singkat.
  try {
    snap.hide()
  } catch {
    // tidak ada popup yang terbuka: abaikan
  }
  await new Promise((resolve) => setTimeout(resolve, 300))

  snap.pay(data.snap_token, {
    onSuccess: (result) => onSuccess?.(result),
    onPending: (result) => onPending?.(result),
    onError: (result) => onError?.(result),
    onClose: () => onClose?.(),
  })

  return data
}