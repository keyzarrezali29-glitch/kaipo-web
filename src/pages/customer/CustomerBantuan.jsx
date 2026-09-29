import { useEffect, useState } from 'react'
import { ChevronDown, MapPin, Phone, Clock, HelpCircle, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const FAQ_LIST = [
  {
    q: 'Bagaimana cara membuat booking servis?',
    a: 'Buka menu "Booking", pilih layanan yang diinginkan, pilih kendaraan, tentukan tanggal dan jam kedatangan, lalu ajukan booking. Anda bisa memantau statusnya di menu "Riwayat Servis" atau lewat detail booking.',
  },
  {
    q: 'Kapan saya harus membayar servis?',
    a: 'Pembayaran bisa dilakukan setelah admin mengonfirmasi biaya servis (biasanya setelah kendaraan diperiksa). Tombol "Bayar Sekarang" akan muncul di Dashboard atau halaman Detail Booking begitu biaya sudah ditentukan.',
  },
  {
    q: 'Metode pembayaran apa saja yang didukung?',
    a: 'Kai-Po mendukung berbagai metode pembayaran melalui Midtrans, termasuk QRIS, transfer virtual account (BCA, BNI, BRI, Mandiri, dll), dan kartu kredit/debit.',
  },
  {
    q: 'Bagaimana jika saya ingin membatalkan booking?',
    a: 'Silakan hubungi kami melalui nomor telepon di bawah untuk pembatalan booking yang belum dikonfirmasi. Untuk booking yang sudah dijadwalkan atau sedang diproses, hubungi admin secepatnya.',
  },
  {
    q: 'Bagaimana cara memakai kode promo?',
    a: 'Salin kode promo dari menu "Promo", lalu masukkan di langkah "Kode Promo" saat membuat booking. Diskon akan diverifikasi dan diterapkan oleh admin saat biaya servis Anda dikonfirmasi.',
  },
  {
    q: 'Apakah saya bisa menambahkan lebih dari satu kendaraan?',
    a: 'Bisa. Buka menu "Kendaraan" dan klik "Tambah Kendaraan" untuk mendaftarkan kendaraan baru. Anda juga bisa menandai salah satu sebagai kendaraan utama.',
  },
]

// Nomor lokal 08xxx diubah ke format internasional 628xxx biar link WhatsApp valid
function formatTelepon(telepon) {
  let nomor = String(telepon || '').replace(/\D/g, '')
  if (nomor.startsWith('0')) nomor = '62' + nomor.slice(1)
  return nomor
}

export default function CustomerBantuan() {
  const [loading, setLoading] = useState(true)
  const [bengkel, setBengkel] = useState(null)
  const [openIndex, setOpenIndex] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('pengaturan_bengkel').select('*').single()
        if (error) throw error
        setBengkel(data)
      } catch (err) {
        console.error('Gagal memuat info bengkel:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function bukaWhatsApp() {
    const nomor = formatTelepon(bengkel?.telepon)
    if (!nomor) return
    window.open(`https://wa.me/${nomor}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-full">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bantuan</h1>
        <p className="mt-1 text-sm text-slate-400">Pertanyaan umum dan cara menghubungi kami</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* FAQ */}
        <div className="rounded-3xl bg-white p-6 lg:col-span-2">
          <h2 className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <HelpCircle size={17} className="text-[#12123a]" /> Pertanyaan Umum
          </h2>

          <div className="space-y-2.5">
            {FAQ_LIST.map((item, i) => {
              const isOpen = openIndex === i
              return (
                <div
                  key={i}
                  className={`rounded-2xl border px-5 py-4 transition ${
                    isOpen ? 'border-[#12123a] bg-slate-50' : 'border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-800">{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-[#12123a]' : ''}`}
                    />
                  </button>
                  {isOpen && <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.a}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Kontak */}
        <div className="relative h-fit overflow-hidden rounded-3xl bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] p-6 text-white">
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full border-[22px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-6 -right-6 h-32 w-32 rounded-full border-[14px] border-white/5" />

          <h2 className="relative mb-5 flex items-center gap-2 text-[15px] font-semibold">
            <MessageCircle size={17} /> Hubungi Kami
          </h2>

          {loading ? (
            <p className="relative text-xs text-white/50">Memuat info kontak...</p>
          ) : bengkel ? (
            <div className="relative space-y-4">
              <div>
                <p className="text-lg font-bold">{bengkel.nama_bengkel}</p>
                {bengkel.deskripsi && <p className="mt-1 text-xs leading-relaxed text-white/60">{bengkel.deskripsi}</p>}
              </div>

              {bengkel.alamat && (
                <div className="flex items-start gap-3 text-xs text-white/80">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-white/50" />
                  <span>{bengkel.alamat}</span>
                </div>
              )}

              {bengkel.jam_operasional && (
                <div className="flex items-start gap-3 text-xs text-white/80">
                  <Clock size={15} className="mt-0.5 shrink-0 text-white/50" />
                  <span>{bengkel.jam_operasional}</span>
                </div>
              )}

              {bengkel.telepon && (
                <>
                  <div className="flex items-start gap-3 text-xs text-white/80">
                    <Phone size={15} className="mt-0.5 shrink-0 text-white/50" />
                    <span>{bengkel.telepon}</span>
                  </div>

                  <button
                    onClick={bukaWhatsApp}
                    className="w-full rounded-full bg-white py-3.5 text-center text-sm font-semibold text-[#12123a] transition hover:bg-slate-100"
                  >
                    Chat via WhatsApp
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="relative text-xs text-white/50">Info kontak belum tersedia.</p>
          )}
        </div>
      </div>
    </div>
  )
}