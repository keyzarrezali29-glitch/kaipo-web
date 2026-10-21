import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Eye, Pencil, X, AlertCircle, Mail, Phone, Car } from 'lucide-react'
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
    <div className="min-h-full">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Data Customer</h1>
          <p className="mt-1 text-sm text-slate-400">Kelola data pelanggan yang terdaftar di Kai-Po</p>
        </div>
        <button
          onClick={bukaModal}
          className="rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52]"
        >
          + Tambah Customer
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full bg-white px-4 py-2.5 text-sm text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
        >
          <option value="semua">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-full bg-white px-4 py-2.5 text-sm text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
        >
          <option value="terbaru">Urutkan: Terbaru</option>
          <option value="nama">Urutkan: Nama (A-Z)</option>
        </select>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau no. HP..."
            className="w-72 rounded-full bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-[#12123a]"
          />
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-3xl bg-white p-3">
        {paginated.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-400">Tidak ada customer yang cocok dengan filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-500">
                  <th className="rounded-l-2xl px-5 py-3.5 font-medium">Customer</th>
                  <th className="px-4 py-3.5 font-medium">Kontak</th>
                  <th className="px-4 py-3.5 font-medium">Kendaraan</th>
                  <th className="px-4 py-3.5 font-medium">Total servis</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="rounded-r-2xl px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3.5">
                        <Avatar nama={c.full_name} url={c.avatar_url} className="h-11 w-11 text-sm" />
                        <div>
                          <p className="font-semibold text-slate-900">{c.full_name}</p>
                          <p className="text-xs text-slate-400">Bergabung {formatTanggalGabung(c.created_at)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <p className="flex items-center gap-2 text-slate-700">
                        <Mail size={13} className="shrink-0 text-slate-400" />
                        {c.email}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <Phone size={13} className="shrink-0" />
                        {c.phone || 'Belum diisi'}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                          c.jumlahKendaraan > 0 ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        <Car size={13} />
                        {c.jumlahKendaraan} kendaraan
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-base font-bold text-slate-900">{c.jumlahServis}</span>
                      <span className="ml-1 text-xs text-slate-400">servis</span>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleStatus(c)}
                        disabled={togglingId === c.id}
                        title="Klik buat ubah status"
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition disabled:opacity-40 ${
                          c.is_active
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 ring-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {c.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/customer/${c.id}`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 ring-1 ring-slate-200 transition hover:bg-[#12123a] hover:text-white hover:ring-[#12123a]"
                          title="Lihat detail"
                        >
                          <Eye size={15} />
                        </Link>
                        <Link
                          to={`/admin/customer/${c.id}/edit`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 ring-1 ring-slate-200 transition hover:bg-[#12123a] hover:text-white hover:ring-[#12123a]"
                          title="Edit"
                        >
                          <Pencil size={15} />
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
        <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
          <p>
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length.toLocaleString('id-ID')} customer
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="rounded-full bg-white px-3 py-2 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, pageSafe - 3), pageSafe + 2)
              .map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-9 w-9 rounded-full text-xs font-medium ${
                    n === pageSafe ? 'bg-[#12123a] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages}
              className="rounded-full bg-white px-3 py-2 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Tambah Customer</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {notice.message && (
              <div className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-medium text-rose-600">
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
              className="mt-6 w-full rounded-full bg-[#12123a] py-3.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
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
      <label className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#12123a]"
      />
    </div>
  )
}