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
    <div className="min-h-full">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Promo</h1>
        <p className="mt-1 text-sm text-slate-400">Kupon dan diskon yang bisa Anda pakai untuk servis berikutnya</p>
      </header>

      {error && <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      {promoList.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Tag size={24} />
          </span>
          <p className="text-sm text-slate-400">Belum ada promo aktif saat ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {promoList.map((p, i) => (
            <PromoCard
              key={p.id}
              promo={p}
              highlight={i === 0}
              tersalin={kodeTersalin === p.kode}
              onSalin={handleSalinKode}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function PromoCard({ promo: p, highlight, tersalin, onSalin }) {
  const hariTersisa = sisaHari(p.berlaku_sampai)
  const segeraBerakhir = hariTersisa !== null && hariTersisa <= 3

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl p-6 ${
        highlight ? 'bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] text-white' : 'bg-white text-slate-900'
      }`}
    >
      {highlight && (
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-52 w-52 rounded-full border-[22px] border-white/5" />
      )}

      <div className="relative mb-5 flex items-start justify-between gap-2">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            highlight ? 'bg-white/10 text-white' : 'bg-slate-100 text-[#12123a]'
          }`}
        >
          <Tag size={17} />
        </span>
        {segeraBerakhir && (
          <span className="rounded-md bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-100">
            Segera berakhir
          </span>
        )}
      </div>

      <p className="relative text-4xl font-bold tracking-tight">{formatDiskon(p)}</p>
      <p className={`relative mt-1 text-sm font-semibold ${highlight ? 'text-white' : 'text-slate-800'}`}>{p.judul}</p>
      {p.deskripsi && (
        <p className={`relative mt-1 text-xs ${highlight ? 'text-white/60' : 'text-slate-400'}`}>{p.deskripsi}</p>
      )}

      <div className={`relative mt-4 flex-1 space-y-1.5 text-xs ${highlight ? 'text-white/60' : 'text-slate-400'}`}>
        {p.min_transaksi > 0 && <p>Min. transaksi {formatRupiah(p.min_transaksi)}</p>}
        <p className="flex items-center gap-1.5">
          <CalendarClock size={12} />
          Berlaku sampai {formatTanggal(p.berlaku_sampai)}
          {hariTersisa !== null && hariTersisa >= 0 && ` (${hariTersisa} hari lagi)`}
        </p>
      </div>

      {p.kode && (
        <button
          onClick={() => onSalin(p.kode)}
          className={`relative mt-5 flex w-full items-center justify-between rounded-full border border-dashed px-5 py-3 text-left transition ${
            highlight
              ? 'border-white/30 bg-white/5 hover:bg-white/10'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          }`}
        >
          <span className="font-mono text-sm font-bold tracking-wider">{p.kode}</span>
          {tersalin ? (
            <Check size={16} className={highlight ? 'text-emerald-300' : 'text-emerald-600'} />
          ) : (
            <Copy size={16} className={highlight ? 'text-white/60' : 'text-slate-400'} />
          )}
        </button>
      )}
    </div>
  )
}