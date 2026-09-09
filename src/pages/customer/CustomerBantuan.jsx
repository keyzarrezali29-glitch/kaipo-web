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
    a: 'Salin kode promo dari menu "Promo", lalu sampaikan kode tersebut kepada admin/mekanik saat booking dikonfirmasi agar diskon diterapkan pada biaya servis Anda.',
  },
  {
    q: 'Apakah saya bisa menambahkan lebih dari satu kendaraan?',
    a: 'Bisa. Buka menu "Kendaraan" dan klik "Tambah Kendaraan" untuk mendaftarkan kendaraan baru. Anda juga bisa menandai salah satu sebagai kendaraan utama.',
  },
]

function formatTelepon(telepon) {
  if (!telepon) return ''
  return telepon.replace(/\D/g, '')
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

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bantuan</h1>
        <p className="mt-1 text-sm text-slate-400">Pertanyaan umum dan cara menghubungi kami</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* FAQ */}
        <div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <HelpCircle size={16} className="text-indigo-600" /> Pertanyaan Umum
          </h2>

          <div className="divide-y divide-slate-100">
            {FAQ_LIST.map((item, i) => {
              const isOpen = openIndex === i
              return (
                <div key={i} className="py-3">
                  <button
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-800">{item.q}</span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.a}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Kontak */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#12123a] p-5 text-white shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
              <MessageCircle size={16} className="text-amber-400" /> Hubungi Kami
            </h2>

            {loading ? (
              <p className="text-xs text-white/50">Memuat info kontak...</p>
            ) : bengkel ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-white">{bengkel.nama_bengkel}</p>
                  {bengkel.deskripsi && <p className="mt-1 text-xs text-white/50">{bengkel.deskripsi}</p>}
                </div>

                {bengkel.alamat && (
                  <div className="flex items-start gap-2 text-xs text-white/70">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-white/40" />
                    <span>{bengkel.alamat}</span>
                  </div>
                )}

                {bengkel.jam_operasional && (
                  <div className="flex items-start gap-2 text-xs text-white/70">
                    <Clock size={14} className="mt-0.5 shrink-0 text-white/40" />
                    <span>{bengkel.jam_operasional}</span>
                  </div>
                )}

                {bengkel.telepon && (
                  <>
                    <div className="flex items-start gap-2 text-xs text-white/70">
                      <Phone size={14} className="mt-0.5 shrink-0 text-white/40" />
                      <span>{bengkel.telepon}</span>
                    </div>

                    <a
                      href={`https://wa.me/${formatTelepon(bengkel.telepon)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl bg-amber-500 py-2.5 text-center text-xs font-semibold text-[#12123a] hover:bg-amber-400"
                    >
                      Chat via WhatsApp
                    </a>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/50">Info kontak belum tersedia.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}