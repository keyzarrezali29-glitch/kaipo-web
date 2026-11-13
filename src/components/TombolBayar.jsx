import { useState } from 'react'
import { mulaiPembayaran } from '../lib/bayar'

// ------------------------------------------------------------
// Tombol bayar untuk satu booking (dipakai di halaman detail booking customer).
// Logika Midtrans-nya ada di src/lib/bayar.js supaya bisa dipakai juga dari halaman Booking.
// ------------------------------------------------------------
export default function TombolBayar({ bookingId, onSukses, className = '', children }) {
  const [loading, setLoading] = useState(false)

  async function handleBayar() {
    setLoading(true)
    try {
      await mulaiPembayaran(bookingId, {
        onSuccess: () => {
          alert('Pembayaran berhasil! Status akan ter-update otomatis dalam beberapa saat.')
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
          // Customer menutup popup sebelum bayar: tidak perlu aksi apa-apa,
          // transaksi tetap tersimpan dengan status "menunggu".
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