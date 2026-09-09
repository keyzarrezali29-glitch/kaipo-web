import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, Car, CalendarDays, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'

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
              mekanik:mekanik_id ( full_name )
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
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Riwayat Servis</h1>
        <p className="mt-1 text-sm text-slate-400">Semua servis yang sudah selesai dikerjakan</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      )}

      {/* Ringkasan + filter */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs text-slate-400">Total Servis Selesai</p>
          <p className="text-xl font-bold text-slate-900">
            {riwayatTerfilter.length} servis · <span className="text-indigo-600">{formatRupiah(totalPengeluaran)}</span>
          </p>
        </div>

        {kendaraanList.length > 0 && (
          <select
            value={filterKendaraan}
            onChange={(e) => setFilterKendaraan(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-400"
          >
            <option value="semua">Semua Kendaraan</option>
            {kendaraanList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.merek} {k.model} · {k.plat_nomor}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Daftar riwayat */}
      {riwayatTerfilter.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
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
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Wrench size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{r.layanan?.nama ?? '-'}</p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <Car size={12} />
                    {[r.kendaraan?.merek, r.kendaraan?.model].filter(Boolean).join(' ')} · {r.kendaraan?.plat_nomor}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-400">
                    <CalendarDays size={12} /> {formatTanggal(r.tanggal)}
                  </p>
                  {r.mekanik?.full_name && (
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <User size={12} /> Dikerjakan oleh {r.mekanik.full_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="mb-1 block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Selesai
                </span>
                <p className="text-sm font-bold text-slate-900">
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