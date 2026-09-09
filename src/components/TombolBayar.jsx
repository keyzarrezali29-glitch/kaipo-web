import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ------------------------------------------------------------
// Loader Snap.js — dimuat sekali aja, ditaruh di <head> pas dibutuhkan
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
    script.onerror = () => reject(new Error('Gagal memuat Snap.js dari Midtrans'))
    document.head.appendChild(script)
  })

  return snapScriptPromise
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function TombolBayar({ bookingId, onSukses, className = '', children }) {
  const [loading, setLoading] = useState(false)

  async function handleBayar() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Belum login')

      // Panggil Edge Function create-transaction
      const res = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ booking_id: bookingId }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat transaksi')

      // Muat Snap.js kalau belum ada, terus buka popup pembayaran
      const snap = await loadSnapScript()
      snap.pay(data.snap_token, {
        onSuccess: () => {
          alert('Pembayaran berhasil! Status bakal ke-update otomatis dalam beberapa saat.')
          onSukses?.()
        },
        onPending: () => {
          alert('Pembayaran kamu masih diproses. Cek status transaksi beberapa saat lagi.')
          onSukses?.()
        },
        onError: () => {
          alert('Pembayaran gagal. Coba lagi atau pilih metode lain.')
        },
        onClose: () => {
          // Customer nutup popup sebelum bayar — nggak perlu action apa-apa,
          // transaksi tetap kesimpen dengan status "menunggu"
        },
      })
    } catch (err) {
      console.error('Gagal memulai pembayaran:', err)
      alert('Gagal memulai pembayaran: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleBayar} disabled={loading} className={className}>
      {loading ? 'Memproses...' : children ?? 'Bayar Sekarang'}
    </button>
  )
}