import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Calendar, Car, Wrench, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatTanggal(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function inisial(nama) {
  if (!nama) return '?'
  return nama.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const AVATAR_COLORS = ['bg-indigo-900', 'bg-violet-600', 'bg-sky-700', 'bg-emerald-700', 'bg-rose-700']
function avatarColor(seed) {
  const i = (seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu', dijadwalkan: 'Dijadwalkan', diproses: 'Diproses',
  selesai: 'Selesai', dibatalkan: 'Dibatalkan',
}
const STATUS_CLASS = {
  menunggu_konfirmasi: 'bg-amber-100 text-amber-700',
  dijadwalkan: 'bg-amber-100 text-amber-700',
  diproses: 'bg-blue-100 text-blue-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  dibatalkan: 'bg-rose-100 text-rose-700',
}

export default function DetailCustomer() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [kendaraan, setKendaraan] = useState([])
  const [riwayatBooking, setRiwayatBooking] = useState([])

  async function loadData() {
    try {
      setError(null)
      const [profileRes, kendaraanRes, bookingRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('kendaraan').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        supabase
          .from('booking')
          .select(`
            id, tanggal, waktu, status, biaya_estimasi, biaya_final,
            kendaraan:kendaraan_id ( merek, model, plat_nomor ),
            layanan:layanan_id ( nama )
          `)
          .eq('customer_id', id)
          .order('tanggal', { ascending: false })
          .limit(10),
      ])

      if (profileRes.error) throw profileRes.error
      if (kendaraanRes.error) throw kendaraanRes.error
      if (bookingRes.error) throw bookingRes.error

      setCustomer(profileRes.data)
      setKendaraan(kendaraanRes.data ?? [])
      setRiwayatBooking(bookingRes.data ?? [])
    } catch (err) {
      console.error('Gagal memuat detail customer:', err)
      setError(err.message || 'Gagal memuat detail customer')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat detail customer...</div>
  }

  if (error || !customer) {
    return (
      <div className="min-h-full bg-slate-100 px-8 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="rounded-2xl bg-white p-6 text-sm text-rose-600 shadow-sm">
          {error || 'Customer tidak ditemukan.'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Kembali ke Data Customer
      </button>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white ${avatarColor(customer.full_name)}`}>
            {inisial(customer.full_name)}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{customer.full_name}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${customer.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {customer.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">Bergabung {formatTanggal(customer.created_at)}</p>
          </div>
        </div>
        <Link
          to={`/admin/customer/${id}/edit`}
          className="flex items-center gap-2 rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]"
        >
          <Pencil size={15} /> Edit Customer
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Kontak</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-slate-600">
                <Mail size={16} className="text-slate-400" /> {customer.email}
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Phone size={16} className="text-slate-400" /> {customer.phone || '-'}
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Calendar size={16} className="text-slate-400" /> Bergabung {formatTanggal(customer.created_at)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Car size={16} /> Kendaraan ({kendaraan.length})
            </h2>
            {kendaraan.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada kendaraan terdaftar.</p>
            ) : (
              <ul className="space-y-3">
                {kendaraan.map((k) => (
                  <li key={k.id} className="rounded-xl border border-slate-100 p-3">
                    <p className="text-sm font-semibold text-slate-900">{k.merek} {k.model}</p>
                    <p className="text-xs text-slate-400">{k.plat_nomor} • {k.tahun ?? '-'} • {k.warna ?? '-'}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Wrench size={16} /> Riwayat Booking
            </h2>
            {riwayatBooking.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada riwayat booking.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {riwayatBooking.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{b.layanan?.nama ?? '-'}</p>
                      <p className="text-xs text-slate-400">
                        {[b.kendaraan?.merek, b.kendaraan?.model].filter(Boolean).join(' ')} {b.kendaraan?.plat_nomor} • {formatTanggal(b.tanggal)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[b.status] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}