import { useEffect, useMemo, useState } from 'react'
import { Download, Wallet, CheckCircle2, XCircle, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`
}

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function Laporan() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [dariTanggal, setDariTanggal] = useState(daysAgoISO(30))
  const [sampaiTanggal, setSampaiTanggal] = useState(todayISO())

  const [transaksiList, setTransaksiList] = useState([])
  const [bookingList, setBookingList] = useState([])
  const [customerBaru, setCustomerBaru] = useState(0)
  const [trenBulanan, setTrenBulanan] = useState([])
  const [topLayanan, setTopLayanan] = useState([])
  const [topMekanik, setTopMekanik] = useState([])

  async function loadData() {
    try {
      setError(null)

      // batas akhir tanggal filter (inklusif, sampai akhir hari)
      const sampaiInklusif = new Date(sampaiTanggal)
      sampaiInklusif.setDate(sampaiInklusif.getDate() + 1)
      const sampaiISO = sampaiInklusif.toISOString().slice(0, 10)

      const enamBulanLalu = new Date()
      enamBulanLalu.setMonth(enamBulanLalu.getMonth() - 5)
      enamBulanLalu.setDate(1)

      const [transaksiRes, bookingRes, customerRes, trenRes] = await Promise.all([
        supabase
          .from('transaksi')
          .select('id, total, status, created_at')
          .gte('created_at', dariTanggal)
          .lt('created_at', sampaiISO),
        supabase
          .from('booking')
          .select(`
            id, status, tanggal,
            layanan:layanan_id ( nama ),
            mekanik:mekanik_id ( full_name )
          `)
          .gte('tanggal', dariTanggal)
          .lt('tanggal', sampaiISO),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'customer')
          .gte('created_at', dariTanggal)
          .lt('created_at', sampaiISO),
        supabase
          .from('transaksi')
          .select('total, status, created_at')
          .eq('status', 'berhasil')
          .gte('created_at', enamBulanLalu.toISOString().slice(0, 10)),
      ])

      if (transaksiRes.error) throw transaksiRes.error
      if (bookingRes.error) throw bookingRes.error
      if (customerRes.error) throw customerRes.error
      if (trenRes.error) throw trenRes.error

      setTransaksiList(transaksiRes.data ?? [])
      setBookingList(bookingRes.data ?? [])
      setCustomerBaru(customerRes.count ?? 0)

      // Tren pendapatan 6 bulan terakhir (fixed, nggak ikut filter tanggal di atas)
      const monthBuckets = new Map()
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        monthBuckets.set(key, { label: `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`, total: 0 })
      }
      for (const t of trenRes.data ?? []) {
        const d = new Date(t.created_at)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        if (monthBuckets.has(key)) monthBuckets.get(key).total += Number(t.total || 0)
      }
      setTrenBulanan([...monthBuckets.values()])

      // Layanan terpopuler dalam rentang tanggal
      const layananCount = new Map()
      const mekanikCount = new Map()
      for (const b of bookingRes.data ?? []) {
        const namaLayanan = b.layanan?.nama
        if (namaLayanan) layananCount.set(namaLayanan, (layananCount.get(namaLayanan) || 0) + 1)

        if (b.status === 'selesai' && b.mekanik?.full_name) {
          const nama = b.mekanik.full_name
          mekanikCount.set(nama, (mekanikCount.get(nama) || 0) + 1)
        }
      }
      setTopLayanan([...layananCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5))
      setTopMekanik([...mekanikCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5))
    } catch (err) {
      console.error('Gagal memuat laporan:', err)
      setError(err.message || 'Gagal memuat laporan')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dariTanggal, sampaiTanggal])

  const ringkasan = useMemo(() => {
    const pendapatan = transaksiList.filter((t) => t.status === 'berhasil').reduce((sum, t) => sum + Number(t.total || 0), 0)
    const selesai = bookingList.filter((b) => b.status === 'selesai').length
    const dibatalkan = bookingList.filter((b) => b.status === 'dibatalkan').length
    return { pendapatan, selesai, dibatalkan, customerBaru }
  }, [transaksiList, bookingList, customerBaru])

  const maxTren = Math.max(1, ...trenBulanan.map((m) => m.total))
  const maxLayanan = Math.max(1, ...topLayanan.map(([, c]) => c))
  const maxMekanik = Math.max(1, ...topMekanik.map(([, c]) => c))

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat laporan...</div>
  }

  return (
    <div className="min-h-full print:bg-white">
      {/* CSS khusus buat export/cetak PDF — sembunyikan sidebar & kontrol filter */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          main { margin-left: 0 !important; }
          body { background: white !important; }
        }
      `}</style>

      <header className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Laporan</h1>
          <p className="mt-1 text-sm text-slate-400">Ringkasan performa operasional dan pendapatan Kai-Po</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dariTanggal}
            onChange={(e) => setDariTanggal(e.target.value)}
            className="rounded-full bg-white px-4 py-2.5 text-sm text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
          />
          <span className="text-sm text-slate-400">—</span>
          <input
            type="date"
            value={sampaiTanggal}
            onChange={(e) => setSampaiTanggal(e.target.value)}
            className="rounded-full bg-white px-4 py-2.5 text-sm text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
          />
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-full bg-[#12123a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
          >
            <Download size={15} />
            Export PDF
          </button>
        </div>
      </header>

      {/* Judul cuma keliatan pas print/PDF */}
      <div className="mb-4 hidden print:block">
        <h1 className="text-xl font-bold text-slate-900">Laporan Kai-Po</h1>
        <p className="text-sm text-slate-500">Periode {dariTanggal} s/d {sampaiTanggal}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Ringkasan */}
      <div className="mb-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <StatCard icon={<Wallet size={18} />} label="Pendapatan (Berhasil)" value={formatRupiah(ringkasan.pendapatan)} accent="emerald" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Booking Selesai" value={ringkasan.selesai} accent="blue" />
        <StatCard icon={<XCircle size={18} />} label="Booking Dibatalkan" value={ringkasan.dibatalkan} accent="rose" />
        <StatCard icon={<UserPlus size={18} />} label="Customer Baru" value={ringkasan.customerBaru} />
      </div>

      <p className="mb-5 mt-2 text-xs text-slate-400">
        Empat angka di atas dihitung dari rentang tanggal yang dipilih ({dariTanggal} s/d {sampaiTanggal})
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 print:grid-cols-1">
        {/* Tren pendapatan 6 bulan */}
        <div className="rounded-3xl bg-white p-6 print:break-inside-avoid print:border print:border-slate-200">
          <h2 className="mb-1 text-[15px] font-semibold text-slate-900">Tren Pendapatan 6 Bulan Terakhir</h2>
          <p className="mb-5 text-xs text-slate-400">Dari transaksi berstatus "berhasil" (nggak ikut filter tanggal di atas)</p>
          <div className="flex items-end gap-3" style={{ height: 140 }}>
            {trenBulanan.map((m) => (
              <div key={m.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] font-medium text-slate-500">
                  {m.total > 0 ? formatRupiah(m.total).replace('Rp ', '') : ''}
                </span>
                <div
                  className="w-full rounded-full bg-[#12123a]"
                  style={{ height: `${Math.max(4, (m.total / maxTren) * 100)}px` }}
                />
                <span className="text-[10px] text-slate-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Layanan terpopuler */}
        <div className="rounded-3xl bg-white p-6 print:break-inside-avoid print:border print:border-slate-200">
          <h2 className="mb-5 text-[15px] font-semibold text-slate-900">Layanan Terpopuler (periode dipilih)</h2>
          {topLayanan.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada booking di periode ini.</p>
          ) : (
            <ul className="space-y-4">
              {topLayanan.map(([nama, jumlah]) => (
                <li key={nama}>
                  <div className="mb-1.5 flex justify-between text-sm text-slate-700">
                    <span>{nama}</span>
                    <span className="text-xs text-slate-400">{jumlah}x</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#12123a]" style={{ width: `${(jumlah / maxLayanan) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Performa mekanik */}
        <div className="rounded-3xl bg-white p-6 print:break-inside-avoid print:border print:border-slate-200 lg:col-span-2 print:col-span-1">
          <h2 className="mb-1 text-[15px] font-semibold text-slate-900">Performa Mekanik (periode dipilih)</h2>
          <p className="mb-5 text-xs text-slate-400">Jumlah booking yang berhasil diselesaikan per mekanik</p>
          {topMekanik.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada booking selesai di periode ini.</p>
          ) : (
            <ul className="space-y-4">
              {topMekanik.map(([nama, jumlah]) => (
                <li key={nama}>
                  <div className="mb-1.5 flex justify-between text-sm text-slate-700">
                    <span>{nama}</span>
                    <span className="text-xs text-slate-400">{jumlah} servis selesai</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(jumlah / maxMekanik) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, accent = 'indigo' }) {
  const accents = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-500',
  }
  return (
    <div className="rounded-3xl bg-white p-6 print:border print:border-slate-200">
      <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}>{icon}</span>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}