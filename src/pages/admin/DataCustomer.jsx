import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, Pencil, X, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function formatTanggalGabung(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PER_PAGE = 5
const FORM_KOSONG = { email: '', password: '', full_name: '', phone: '' }

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DataCustomer() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])

  const [statusFilter, setStatusFilter] = useState('semua')
  const [sortBy, setSortBy] = useState('terbaru')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [togglingId, setTogglingId] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(FORM_KOSONG)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })

  async function loadData() {
    try {
      setError(null)
      const [profilesRes, kendaraanRes, bookingRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, phone, avatar_url, is_active, created_at').eq('role', 'customer'),
        supabase.from('kendaraan').select('customer_id'),
        supabase.from('booking').select('customer_id'),
      ])

      if (profilesRes.error) throw profilesRes.error
      if (kendaraanRes.error) throw kendaraanRes.error
      if (bookingRes.error) throw bookingRes.error

      const kendaraanCount = new Map()
      for (const k of kendaraanRes.data ?? []) {
        kendaraanCount.set(k.customer_id, (kendaraanCount.get(k.customer_id) || 0) + 1)
      }
      const servisCount = new Map()
      for (const b of bookingRes.data ?? []) {
        servisCount.set(b.customer_id, (servisCount.get(b.customer_id) || 0) + 1)
      }

      const merged = (profilesRes.data ?? []).map((c) => ({
        ...c,
        jumlahKendaraan: kendaraanCount.get(c.id) || 0,
        jumlahServis: servisCount.get(c.id) || 0,
      }))

      setCustomers(merged)
    } catch (err) {
      console.error('Gagal memuat data customer:', err)
      setError(err.message || 'Gagal memuat data customer')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  async function toggleStatus(customer) {
    setTogglingId(customer.id)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: !customer.is_active })
        .eq('id', customer.id)
      if (updateError) throw updateError
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, is_active: !c.is_active } : c)))
    } catch (err) {
      console.error('Gagal ubah status:', err)
      alert('Gagal ubah status: ' + err.message)
    } finally {
      setTogglingId(null)
    }
  }

  function bukaModal() {
    setForm(FORM_KOSONG)
    setNotice({ type: '', message: '' })
    setModalOpen(true)
  }

  async function handleTambahCustomer() {
    setNotice({ type: '', message: '' })
    if (!form.email || !form.password || !form.full_name) {
      setNotice({ type: 'error', message: 'Email, password, dan nama lengkap wajib diisi.' })
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Belum login')

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-customer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            full_name: form.full_name,
            phone: form.phone,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menambahkan customer')

      setModalOpen(false)
      await loadData()
    } catch (err) {
      console.error('Gagal menambah customer:', err)
      setNotice({ type: 'error', message: err.message || 'Gagal menambahkan customer' })
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    let rows = [...customers]

    if (statusFilter === 'aktif') rows = rows.filter((c) => c.is_active)
    if (statusFilter === 'nonaktif') rows = rows.filter((c) => !c.is_active)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q)
      )
    }

    if (sortBy === 'nama') {
      rows.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
    } else {
      rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return rows
  }, [customers, statusFilter, sortBy, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE)

  useEffect(() => setPage(1), [statusFilter, sortBy, search])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data customer...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Customer</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola data pelanggan yang terdaftar di Kai-Po</p>
        </div>
        <button
          onClick={bukaModal}
          className="rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]"
        >
          + Tambah Customer
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="semua">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="terbaru">Urutkan: Terbaru</option>
          <option value="nama">Urutkan: Nama (A-Z)</option>
        </select>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau no. HP..."
            className="w-72 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-2 shadow-sm">
        {paginated.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada customer yang cocok dengan filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Kontak</th>
                  <th className="px-4 py-3 font-medium">Kendaraan</th>
                  <th className="px-4 py-3 font-medium">Total Servis</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar nama={c.full_name} url={c.avatar_url} className="h-9 w-9 text-xs" />
                        <div>
                          <p className="font-medium text-slate-900">{c.full_name}</p>
                          <p className="text-xs text-slate-400">Bergabung {formatTanggalGabung(c.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{c.email}</p>
                      <p className="text-xs text-slate-400">{c.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.jumlahKendaraan} kendaraan</td>
                    <td className="px-4 py-3 text-slate-700">{c.jumlahServis}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(c)}
                        disabled={togglingId === c.id}
                        title="Klik buat ubah status"
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-40 ${
                          c.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/customer/${c.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          title="Lihat detail"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          to={`/admin/customer/${c.id}/edit`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
          <p>
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length.toLocaleString('id-ID')} customer
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, pageSafe - 3), pageSafe + 2)
              .map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-8 w-8 rounded-lg text-xs font-medium ${
                    n === pageSafe ? 'bg-[#12123a] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Tambah Customer</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={20} />
              </button>
            </div>

            {notice.message && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-600">
                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {notice.message}
              </div>
            )}

            <div className="space-y-3">
              <FieldFull label="Nama Lengkap" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} placeholder="Siti Aminah" />
              <FieldFull label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="siti@gmail.com" />
              <FieldFull label="Password Sementara" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Minimal 6 karakter" />
              <FieldFull label="No. Telepon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="08xxxxxxxxxx" />
            </div>

            <button
              onClick={handleTambahCustomer}
              disabled={submitting}
              className="mt-5 w-full rounded-xl bg-[#12123a] py-3 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
            >
              {submitting ? 'Menyimpan...' : 'Tambah Customer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldFull({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
      />
    </div>
  )
}