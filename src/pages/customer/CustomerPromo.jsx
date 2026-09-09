import { useEffect, useState } from 'react'
import { Tag, Copy, Check, CalendarClock } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}
function formatDiskon(promo) {
  return promo.tipe_diskon === 'persen' ? `${promo.nilai}%` : formatRupiah(promo.nilai)
}
function sisaHari(tanggalStr) {
  if (!tanggalStr) return null
  const now = new Date()
  const target = new Date(tanggalStr)
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return diff
}

export default function CustomerPromo() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [promoList, setPromoList] = useState([])
  const [kodeTersalin, setKodeTersalin] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const todayStr = new Date().toISOString().slice(0, 10)
        const { data, error } = await supabase
          .from('promo')
          .select('*')
          .eq('is_active', true)
          .gte('berlaku_sampai', todayStr)
          .order('nilai', { ascending: false })
        if (error) throw error
        setPromoList(data ?? [])
      } catch (err) {
        console.error('Gagal memuat promo:', err)
        setError(err.message || 'Gagal memuat promo')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleSalinKode(kode) {
    navigator.clipboard.writeText(kode)
    setKodeTersalin(kode)
    setTimeout(() => setKodeTersalin(''), 2000)
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat promo...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Promo</h1>
        <p className="mt-1 text-sm text-slate-400">Kupon dan diskon yang bisa Anda pakai untuk servis berikutnya</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      )}

      {promoList.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <Tag size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">Belum ada promo aktif saat ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promoList.map((p) => {
            const hariTersisa = sisaHari(p.berlaku_sampai)
            const segeraBerakhir = hariTersisa !== null && hariTersisa <= 3
            return (
              <div key={p.id} className="overflow-hidden rounded-2xl bg-[#12123a] text-white shadow-sm">
                <div className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-amber-400">
                      <Tag size={16} />
                    </span>
                    {segeraBerakhir && (
                      <span className="rounded-full bg-rose-500/20 px-2.5 py-1 text-[10px] font-semibold text-rose-300">
                        Segera Berakhir
                      </span>
                    )}
                  </div>

                  <p className="text-2xl font-extrabold text-amber-400">{formatDiskon(p)}</p>
                  <p className="mb-1 text-sm font-semibold text-white">{p.judul}</p>
                  {p.deskripsi && <p className="mb-3 text-xs text-white/50">{p.deskripsi}</p>}

                  <div className="mb-4 space-y-1 text-xs text-white/50">
                    {p.min_transaksi > 0 && <p>Min. transaksi {formatRupiah(p.min_transaksi)}</p>}
                    <p className="flex items-center gap-1.5">
                      <CalendarClock size={12} />
                      Berlaku sampai {formatTanggal(p.berlaku_sampai)}
                      {hariTersisa !== null && hariTersisa >= 0 && ` (${hariTersisa} hari lagi)`}
                    </p>
                  </div>

                  {p.kode && (
                    <button
                      onClick={() => handleSalinKode(p.kode)}
                      className="flex w-full items-center justify-between rounded-xl border border-dashed border-white/30 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
                    >
                      <span className="font-mono text-sm font-bold tracking-wider text-white">{p.kode}</span>
                      {kodeTersalin === p.kode ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <Copy size={16} className="text-white/50" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}