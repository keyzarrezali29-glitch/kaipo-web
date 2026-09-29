import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Car, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

export default function CustomerRiwayatServis() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [kendaraanList, setKendaraanList] = useState([])
  const [filterKendaraan, setFilterKendaraan] = useState('semua')

  useEffect(() => {
    async function load() {
      try {
        setError(null)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Belum login')

        const [riwayatRes, kendaraanRes] = await Promise.all([
          supabase
            .from('booking')
            .select(`
              id, kode_booking, tanggal, waktu, biaya_estimasi, biaya_final,
              kendaraan:kendaraan_id ( id, merek, model, plat_nomor ),
              layanan:layanan_id ( nama ),
              mekanik:mekanik_id ( full_name, avatar_url )
            `)
            .eq('customer_id', user.id)
            .eq('status', 'selesai')
            .order('tanggal', { ascending: false }),
          supabase.from('kendaraan').select('id, merek, model, plat_nomor').eq('customer_id', user.id),
        ])

        if (riwayatRes.error) throw riwayatRes.error
        if (kendaraanRes.error) throw kendaraanRes.error

        setRiwayat(riwayatRes.data ?? [])
        setKendaraanList(kendaraanRes.data ?? [])
      } catch (err) {
        console.error('Gagal memuat riwayat servis:', err)
        setError(err.message || 'Gagal memuat riwayat servis')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const riwayatTerfilter = useMemo(() => {
    if (filterKendaraan === 'semua') return riwayat
    return riwayat.filter((r) => r.kendaraan?.id === filterKendaraan)
  }, [riwayat, filterKendaraan])

  const totalPengeluaran = useMemo(
    () => riwayatTerfilter.reduce((sum, r) => sum + Number(r.biaya_final ?? r.biaya_estimasi ?? 0), 0),
    [riwayatTerfilter]
  )

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat riwayat servis...</div>
  }

  return (
    <div className="min-h-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Riwayat Servis</h1>
          <p className="mt-1 text-sm text-slate-400">Semua servis yang sudah selesai dikerjakan</p>
        </div>

        {kendaraanList.length > 0 && (
          <select
            value={filterKendaraan}
            onChange={(e) => setFilterKendaraan(e.target.value)}
            className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
          >
            <option value="semua">Semua Kendaraan</option>
            {kendaraanList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.merek} {k.model} · {k.plat_nomor}
              </option>
            ))}
          </select>
        )}
      </header>

      {error && <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}

      {/* Ringkasan */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] p-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-white/5" />
          <p className="relative text-[15px] font-medium">Servis Selesai</p>
          <p className="relative mt-5 text-4xl font-bold tracking-tight">{riwayatTerfilter.length}</p>
          <p className="relative mt-3 text-xs text-white/60">
            {filterKendaraan === 'semua' ? 'dari semua kendaraan' : 'untuk kendaraan terpilih'}
          </p>
        </div>
        <div className="rounded-3xl bg-white p-6">
          <p className="text-[15px] font-medium text-slate-800">Total Pengeluaran</p>
          <p className="mt-5 text-4xl font-bold tracking-tight text-slate-900">{formatRupiah(totalPengeluaran)}</p>
          <p className="mt-3 text-xs text-slate-400">berdasarkan biaya final atau estimasi</p>
        </div>
      </div>

      {/* Daftar riwayat */}
      {riwayatTerfilter.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-sm text-slate-400">
          {filterKendaraan === 'semua'
            ? 'Belum ada riwayat servis.'
            : 'Belum ada riwayat servis untuk kendaraan ini.'}
        </div>
      ) : (
        <div className="space-y-3">
          {riwayatTerfilter.map((r) => (
            <Link
              key={r.id}
              to={`/customer/booking/${r.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-5 transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#12123a]">
                  <Wrench size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{r.layanan?.nama ?? '-'}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <Car size={12} />
                    {[r.kendaraan?.merek, r.kendaraan?.model].filter(Boolean).join(' ')} · {r.kendaraan?.plat_nomor}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <CalendarDays size={12} /> {formatTanggal(r.tanggal)}
                  </p>
                  {r.mekanik?.full_name && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Avatar nama={r.mekanik.full_name} url={r.mekanik.avatar_url} className="h-6 w-6 text-[10px]" />
                      Dikerjakan oleh {r.mekanik.full_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="mb-2 inline-block rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                  Selesai
                </span>
                <p className="text-base font-bold text-slate-900">
                  {formatRupiah(r.biaya_final ?? r.biaya_estimasi)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}