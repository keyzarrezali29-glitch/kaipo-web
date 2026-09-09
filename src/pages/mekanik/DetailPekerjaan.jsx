import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Wrench, Car, User, Phone, MapPin, StickyNote,
  CheckCircle2, Circle, XCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function formatWaktuSingkat(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' • ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

const STATUS_LABEL = { dijadwalkan: 'Menunggu', diproses: 'Dikerjakan', selesai: 'Selesai', dibatalkan: 'Dibatalkan' }
const STATUS_CLASS = {
  dijadwalkan: 'bg-amber-100 text-amber-700',
  diproses: 'bg-blue-100 text-blue-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  dibatalkan: 'bg-rose-100 text-rose-700',
}

export default function DetailPekerjaan() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [job, setJob] = useState(null)
  const [logStatus, setLogStatus] = useState([])
  const [updating, setUpdating] = useState(false)

  async function load() {
    try {
      setError(null)
      const [jobRes, logRes] = await Promise.all([
        supabase
          .from('booking')
          .select(`
            id, kode_booking, tanggal, waktu, status, lokasi, catatan, biaya_estimasi, biaya_final,
            customer:customer_id ( full_name, phone, email ),
            kendaraan:kendaraan_id ( merek, model, plat_nomor, tahun, warna ),
            layanan:layanan_id ( nama, deskripsi, estimasi_waktu, harga )
          `)
          .eq('id', id)
          .single(),
        supabase
          .from('booking_status_log')
          .select('*')
          .eq('booking_id', id)
          .order('created_at', { ascending: true }),
      ])

      if (jobRes.error) throw jobRes.error
      setJob(jobRes.data)
      setLogStatus(logRes.data ?? [])
    } catch (err) {
      console.error('Gagal memuat detail pekerjaan:', err)
      setError(err.message || 'Pekerjaan tidak ditemukan')
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [id])

  async function handleUpdateStatus(statusBaru) {
    setUpdating(true)
    try {
      const { error: updateError } = await supabase.from('booking').update({ status: statusBaru }).eq('id', id)
      if (updateError) throw updateError
      await load()
    } catch (err) {
      alert('Gagal update status: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat detail pekerjaan...</div>
  }

  if (error || !job) {
    return (
      <div className="min-h-full bg-slate-100 px-8 py-6">
        <Link to="/mekanik/pekerjaan" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={16} /> Kembali
        </Link>
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-rose-500 shadow-sm">
          {error ?? 'Pekerjaan tidak ditemukan.'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <Link to="/mekanik/pekerjaan" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> Kembali ke Daftar Pekerjaan
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">Kode Booking</p>
          <h1 className="text-2xl font-bold text-slate-900">{job.kode_booking}</h1>
        </div>
        <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${STATUS_CLASS[job.status]}`}>
          {STATUS_LABEL[job.status]}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Info Customer */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Info Customer</h2>
            <div className="space-y-4">
              <InfoRow icon={<User size={16} />} label="Nama" value={job.customer?.full_name ?? '-'} />
              {job.customer?.phone && (
                <InfoRow
                  icon={<Phone size={16} />}
                  label="Telepon"
                  value={
                    <a href={`https://wa.me/${job.customer.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                      {job.customer.phone}
                    </a>
                  }
                />
              )}
            </div>
          </div>

          {/* Info Kendaraan & Servis */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Kendaraan &amp; Servis</h2>
            <div className="space-y-4">
              <InfoRow
                icon={<Car size={16} />}
                label="Kendaraan"
                value={[job.kendaraan?.merek, job.kendaraan?.model].filter(Boolean).join(' ') || '-'}
                sub={[job.kendaraan?.plat_nomor, job.kendaraan?.tahun, job.kendaraan?.warna].filter(Boolean).join(' · ')}
              />
              <InfoRow
                icon={<Wrench size={16} />}
                label="Layanan"
                value={job.layanan?.nama ?? '-'}
                sub={job.layanan?.deskripsi}
              />
              <InfoRow
                icon={<MapPin size={16} />}
                label="Jadwal"
                value={`${formatTanggal(job.tanggal)} • ${job.waktu?.slice(0, 5)} WIB`}
                sub={job.lokasi}
              />
              {job.catatan && (
                <InfoRow icon={<StickyNote size={16} />} label="Keluhan / Catatan" value={job.catatan} />
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Riwayat Status</h2>
            {logStatus.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada perubahan status.</p>
            ) : (
              <ol className="space-y-0">
                {logStatus.map((log, i) => {
                  const isLast = i === logStatus.length - 1
                  const isDibatalkan = log.status === 'dibatalkan'
                  return (
                    <li key={log.id} className="relative flex gap-3 pb-6 last:pb-0">
                      {!isLast && <span className="absolute left-[9px] top-5 h-full w-px bg-slate-100" />}
                      <span className="mt-0.5 shrink-0">
                        {isDibatalkan ? (
                          <XCircle size={19} className="text-rose-500" />
                        ) : isLast ? (
                          <CheckCircle2 size={19} className="text-indigo-600" />
                        ) : (
                          <Circle size={19} className="text-slate-300" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{STATUS_LABEL[log.status] ?? log.status}</p>
                        {log.catatan && <p className="text-xs text-slate-400">{log.catatan}</p>}
                        <p className="text-xs text-slate-400">{formatWaktuSingkat(log.created_at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Sidebar: Biaya & Aksi */}
        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Biaya</h3>
            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-sm text-slate-400">
                {job.biaya_final ? 'Total Biaya' : 'Estimasi Biaya'}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatRupiah(job.biaya_final ?? job.biaya_estimasi ?? job.layanan?.harga)}
              </span>
            </div>

            {job.status === 'diproses' && (
              <button
                onClick={() => handleUpdateStatus('selesai')}
                disabled={updating}
                className="w-full rounded-xl bg-[#12123a] py-3 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
              >
                {updating ? 'Memproses...' : 'Tandai Selesai'}
              </button>
            )}
            {job.status === 'dijadwalkan' && (
              <button
                onClick={() => handleUpdateStatus('diproses')}
                disabled={updating}
                className="w-full rounded-xl bg-[#12123a] py-3 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
              >
                {updating ? 'Memproses...' : 'Mulai Servis'}
              </button>
            )}
            {job.status === 'selesai' && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> Servis Selesai
              </div>
            )}
            {job.status === 'dibatalkan' && (
              <p className="text-center text-sm text-slate-400">Booking ini sudah dibatalkan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
        {icon}
      </span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}