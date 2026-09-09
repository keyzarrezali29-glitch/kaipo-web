import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_CLASS = {
  tersedia: 'bg-emerald-100 text-emerald-700',
  bertugas: 'bg-blue-100 text-blue-700',
  libur: 'bg-slate-100 text-slate-600',
}
const STATUS_LABEL = {
  tersedia: 'Tersedia',
  bertugas: 'Bertugas',
  libur: 'Libur',
}

export default function ProfilMekanikAdmin() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [detail, setDetail] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [stats, setStats] = useState({ total: 0, bulanIni: 0 })

  useEffect(() => {
    async function load() {
      try {
        const { data: p, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email, phone, created_at')
          .eq('id', id)
          .single()
        if (profileError) throw profileError
        setProfile(p)

        const { data: d, error: detailError } = await supabase
          .from('mekanik_detail')
          .select('*')
          .eq('profile_id', id)
          .single()
        if (detailError) throw detailError
        setDetail(d)

        const { data: jobs, error: jobsError } = await supabase
          .from('booking')
          .select(`
            id, tanggal, biaya_final,
            kendaraan:kendaraan_id ( merek, model, plat_nomor ),
            layanan:layanan_id ( nama )
          `)
          .eq('mekanik_id', id)
          .eq('status', 'selesai')
          .order('tanggal', { ascending: false })
          .limit(5)
        if (jobsError) throw jobsError
        setRiwayat(jobs ?? [])

        const { count: totalCount } = await supabase
          .from('booking')
          .select('id', { count: 'exact', head: true })
          .eq('mekanik_id', id)
          .eq('status', 'selesai')

        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        const { count: bulanIniCount } = await supabase
          .from('booking')
          .select('id', { count: 'exact', head: true })
          .eq('mekanik_id', id)
          .eq('status', 'selesai')
          .gte('created_at', startOfMonth.toISOString())

        setStats({ total: totalCount ?? 0, bulanIni: bulanIniCount ?? 0 })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat profil mekanik...</div>
  }

  if (error) {
    return <div className="p-8 text-sm text-rose-600">{error}</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <button
        onClick={() => navigate('/admin/mekanik')}
        className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} /> Kembali ke Data Mekanik
      </button>

      <div className="mb-4 flex items-start justify-between rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-[#0f1b4c] text-lg font-bold text-white">
            {(profile?.full_name ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">{profile?.full_name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[detail?.status_kerja] || 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABEL[detail?.status_kerja] || detail?.status_kerja}
              </span>
            </div>
            <p className="text-xs text-slate-400">{profile?.email} • {profile?.phone || 'No. HP belum diisi'}</p>
          </div>
        </div>
        <Link
          to={`/admin/mekanik/${id}/edit`}
          className="flex items-center gap-2 rounded-xl bg-[#0f1b4c] px-4 py-2 text-xs font-semibold text-white"
        >
          <Pencil size={13} /> Edit
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatBox label="Pengalaman" value={`${detail?.pengalaman_tahun ?? 0} tahun`} />
        <StatBox label="Rating" value={`★ ${detail?.rating ?? 0}`} />
        <StatBox label="Total Servis Selesai" value={stats.total} />
        <StatBox label="Selesai Bulan Ini" value={stats.bulanIni} />
      </div>

      <div className="mb-4 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Spesialisasi</h3>
        <div className="flex flex-wrap gap-2">
          {(detail?.spesialisasi ?? []).length === 0 ? (
            <span className="text-xs text-slate-400">Belum ada spesialisasi.</span>
          ) : (
            detail.spesialisasi.map((s) => (
              <span key={s} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">{s}</span>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Riwayat Pekerjaan Terakhir</h3>
        {riwayat.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada riwayat pekerjaan.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {riwayat.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{r.layanan?.nama ?? '-'}</p>
                  <p className="text-xs text-slate-400">
                    {[r.kendaraan?.merek, r.kendaraan?.model].filter(Boolean).join(' ')} {r.kendaraan?.plat_nomor} • {formatTanggal(r.tanggal)}
                  </p>
                </div>
                <span className="font-medium text-slate-700">Rp {Number(r.biaya_final ?? 0).toLocaleString('id-ID')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{label}</p>
    </div>
  )
}