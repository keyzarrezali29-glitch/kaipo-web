import { useEffect, useMemo, useState } from 'react'
import { Search, Eye, Pencil, Car, X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const PER_PAGE = 5

const AKTIF_BOOKING_STATUS = ['menunggu_konfirmasi', 'dijadwalkan', 'diproses']

const STATUS_CLASS = {
  'Sedang Servis': 'bg-amber-100 text-amber-700',
  Baik: 'bg-emerald-100 text-emerald-700',
  'Perlu Perhatian': 'bg-rose-100 text-rose-700',
}

const EMPTY_FORM = {
  customer_id: '',
  merek: '',
  model: '',
  plat_nomor: '',
  tahun: '',
  warna: '',
  transmisi: '',
  kondisi: 'Baik',
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function DataKendaraan() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [kendaraanList, setKendaraanList] = useState([])

  const [merekFilter, setMerekFilter] = useState('semua')
  const [statusFilter, setStatusFilter] = useState('semua')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [customerOptions, setCustomerOptions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const [detailKendaraan, setDetailKendaraan] = useState(null)
  const [riwayatServis, setRiwayatServis] = useState([])
  const [loadingRiwayat, setLoadingRiwayat] = useState(false)

  async function loadData() {
    try {
      setError(null)
      const [kendaraanRes, bookingRes, customerRes] = await Promise.all([
        supabase
          .from('kendaraan')
          .select(`
            id, customer_id, merek, model, plat_nomor, tahun, foto_url, kondisi,
            customer:customer_id ( full_name )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('booking').select('kendaraan_id, status'),
        supabase.from('profiles').select('id, full_name').eq('role', 'customer').order('full_name'),
      ])

      if (kendaraanRes.error) throw kendaraanRes.error
      if (bookingRes.error) throw bookingRes.error
      if (customerRes.error) throw customerRes.error

      // Hitung total servis & cek apakah lagi ada booking aktif, per kendaraan
      const totalServis = new Map()
      const sedangServis = new Set()
      for (const b of bookingRes.data ?? []) {
        totalServis.set(b.kendaraan_id, (totalServis.get(b.kendaraan_id) || 0) + 1)
        if (AKTIF_BOOKING_STATUS.includes(b.status)) sedangServis.add(b.kendaraan_id)
      }

      const merged = (kendaraanRes.data ?? []).map((k) => ({
        ...k,
        totalServis: totalServis.get(k.id) || 0,
        statusTampil: sedangServis.has(k.id) ? 'Sedang Servis' : (k.kondisi || 'Baik'),
      }))

      setKendaraanList(merged)
      setCustomerOptions(customerRes.data ?? [])
    } catch (err) {
      console.error('Gagal memuat data kendaraan:', err)
      setError(err.message || 'Gagal memuat data kendaraan')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  function openTambah() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(k) {
    setEditingId(k.id)
    setForm({
      customer_id: k.customer_id || '',
      merek: k.merek || '',
      model: k.model || '',
      plat_nomor: k.plat_nomor || '',
      tahun: k.tahun ?? '',
      warna: k.warna || '',
      transmisi: k.transmisi || '',
      kondisi: k.kondisi || 'Baik',
    })
    setFormError('')
    setShowModal(true)
  }

  async function openDetail(k) {
    setDetailKendaraan(k)
    setLoadingRiwayat(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('booking')
        .select(`
          id, kode_booking, tanggal, waktu, status,
          layanan:layanan_id ( nama ),
          mekanik:mekanik_id ( full_name )
        `)
        .eq('kendaraan_id', k.id)
        .order('tanggal', { ascending: false })
      if (fetchError) throw fetchError
      setRiwayatServis(data ?? [])
    } catch (err) {
      console.error('Gagal memuat riwayat servis:', err)
      setRiwayatServis([])
    } finally {
      setLoadingRiwayat(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!form.customer_id || !form.merek.trim() || !form.model.trim() || !form.plat_nomor.trim()) {
      setFormError('Pemilik, merek, model, dan plat nomor wajib diisi.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        customer_id: form.customer_id,
        merek: form.merek.trim(),
        model: form.model.trim(),
        plat_nomor: form.plat_nomor.trim().toUpperCase(),
        tahun: form.tahun ? Number(form.tahun) : null,
        warna: form.warna.trim() || null,
        transmisi: form.transmisi.trim() || null,
        kondisi: form.kondisi,
      }

      if (editingId) {
        const { error: updateError } = await supabase.from('kendaraan').update(payload).eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('kendaraan').insert(payload)
        if (insertError) throw insertError
      }

      setShowModal(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await loadData()
    } catch (err) {
      console.error('Gagal menyimpan kendaraan:', err)
      if (err.code === '23505') {
        setFormError('Plat nomor ini udah terdaftar di sistem.')
      } else {
        setFormError(err.message || 'Gagal menyimpan kendaraan.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(k) {
    const konfirmasi = window.confirm(`Hapus kendaraan "${k.merek} ${k.model}" (${k.plat_nomor})? Tindakan ini nggak bisa dibatalkan.`)
    if (!konfirmasi) return

    setDeletingId(k.id)
    try {
      const { error: deleteError } = await supabase.from('kendaraan').delete().eq('id', k.id)
      if (deleteError) throw deleteError
      setKendaraanList((prev) => prev.filter((row) => row.id !== k.id))
    } catch (err) {
      console.error('Gagal hapus kendaraan:', err)
      if (err.code === '23503') {
        alert(
          `Kendaraan "${k.merek} ${k.model}" nggak bisa dihapus karena masih ada riwayat booking servis yang terhubung. Riwayat itu perlu tetap ada demi data historis.`
        )
      } else {
        alert('Gagal hapus kendaraan: ' + err.message)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const merekOptions = useMemo(() => {
    return [...new Set(kendaraanList.map((k) => k.merek).filter(Boolean))].sort()
  }, [kendaraanList])

  const filtered = useMemo(() => {
    let rows = [...kendaraanList]

    if (merekFilter !== 'semua') rows = rows.filter((k) => k.merek === merekFilter)
    if (statusFilter !== 'semua') rows = rows.filter((k) => k.statusTampil === statusFilter)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (k) =>
          k.plat_nomor?.toLowerCase().includes(q) ||
          k.customer?.full_name?.toLowerCase().includes(q)
      )
    }

    return rows
  }, [kendaraanList, merekFilter, statusFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const pageSafe = Math.min(page, totalPages)
  const paginated = filtered.slice((pageSafe - 1) * PER_PAGE, pageSafe * PER_PAGE)

  useEffect(() => setPage(1), [merekFilter, statusFilter, search])

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat data kendaraan...</div>
  }

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Kendaraan</h1>
          <p className="mt-1 text-sm text-slate-400">Semua kendaraan customer yang terdaftar di sistem</p>
        </div>
        <button
          onClick={openTambah}
          className="rounded-lg bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52]"
        >
          + Tambah Kendaraan
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Gagal memuat sebagian data: {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={merekFilter}
          onChange={(e) => setMerekFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="semua">Semua Merek</option>
          {merekOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-[#2e4bd6]"
        >
          <option value="semua">Semua Status</option>
          <option value="Baik">Baik</option>
          <option value="Sedang Servis">Sedang Servis</option>
          <option value="Perlu Perhatian">Perlu Perhatian</option>
        </select>

        <div className="relative ml-auto">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari plat nomor / pemilik..."
            className="w-72 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#2e4bd6]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        {paginated.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">Tidak ada kendaraan yang cocok dengan filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-medium">Kendaraan</th>
                  <th className="px-4 py-3 font-medium">Pemilik</th>
                  <th className="px-4 py-3 font-medium">Tahun</th>
                  <th className="px-4 py-3 font-medium">Total Servis</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((k) => (
                  <tr key={k.id} className="border-t border-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {k.foto_url ? (
                          <img src={k.foto_url} alt={k.merek} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                            <Car size={16} />
                          </span>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{k.merek} {k.model}</p>
                          <p className="text-xs text-slate-400">{k.plat_nomor}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{k.customer?.full_name ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{k.tahun ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{k.totalServis}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[k.statusTampil] || 'bg-slate-100 text-slate-600'}`}>
                        {k.statusTampil}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetail(k)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          title="Lihat detail"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(k)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(k)}
                          disabled={deletingId === k.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
          <p>
            Menampilkan {(pageSafe - 1) * PER_PAGE + 1}–{Math.min(pageSafe * PER_PAGE, filtered.length)} dari {filtered.length.toLocaleString('id-ID')} kendaraan
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

      {/* Modal tambah kendaraan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Kendaraan' : 'Tambah Kendaraan'}</h3>
              <button onClick={() => { setShowModal(false); setEditingId(null) }} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Pemilik (Customer) *</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                >
                  <option value="">Pilih customer...</option>
                  {customerOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Merek *</label>
                  <input
                    type="text"
                    value={form.merek}
                    onChange={(e) => setForm((f) => ({ ...f, merek: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="Toyota"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Model *</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="Avanza"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Plat Nomor *</label>
                  <input
                    type="text"
                    value={form.plat_nomor}
                    onChange={(e) => setForm((f) => ({ ...f, plat_nomor: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none focus:border-[#2e4bd6]"
                    placeholder="B 1234 ABC"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Tahun</label>
                  <input
                    type="number"
                    value={form.tahun}
                    onChange={(e) => setForm((f) => ({ ...f, tahun: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="2021"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Warna</label>
                  <input
                    type="text"
                    value={form.warna}
                    onChange={(e) => setForm((f) => ({ ...f, warna: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                    placeholder="Hitam"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Transmisi</label>
                  <select
                    value={form.transmisi}
                    onChange={(e) => setForm((f) => ({ ...f, transmisi: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                  >
                    <option value="">Pilih...</option>
                    <option value="Manual">Manual</option>
                    <option value="Automatic">Automatic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">Kondisi</label>
                <select
                  value={form.kondisi}
                  onChange={(e) => setForm((f) => ({ ...f, kondisi: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#2e4bd6]"
                >
                  <option value="Baik">Baik</option>
                  <option value="Perlu Perhatian">Perlu Perhatian</option>
                </select>
              </div>

              {formError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{formError}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null) }}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-[#12123a] py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal detail kendaraan */}
      {detailKendaraan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Detail Kendaraan</h3>
              <button onClick={() => setDetailKendaraan(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              {detailKendaraan.foto_url ? (
                <img src={detailKendaraan.foto_url} alt={detailKendaraan.merek} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-400">
                  <Car size={22} />
                </span>
              )}
              <div>
                <p className="font-semibold text-slate-900">{detailKendaraan.merek} {detailKendaraan.model}</p>
                <p className="text-sm text-slate-500">{detailKendaraan.plat_nomor}</p>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Pemilik</p>
                <p className="font-medium text-slate-800">{detailKendaraan.customer?.full_name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Tahun</p>
                <p className="font-medium text-slate-800">{detailKendaraan.tahun ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Servis</p>
                <p className="font-medium text-slate-800">{detailKendaraan.totalServis}x</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[detailKendaraan.statusTampil] || 'bg-slate-100 text-slate-600'}`}>
                  {detailKendaraan.statusTampil}
                </span>
              </div>
            </div>

            <h4 className="mb-2 text-sm font-semibold text-slate-900">Riwayat Servis</h4>
            {loadingRiwayat ? (
              <p className="text-sm text-slate-400">Memuat riwayat...</p>
            ) : riwayatServis.length === 0 ? (
              <p className="text-sm text-slate-400">Belum ada riwayat servis buat kendaraan ini.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {riwayatServis.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-800">{r.layanan?.nama ?? '-'}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      #{r.kode_booking} · {r.tanggal} · Mekanik: {r.mekanik?.full_name ?? 'Belum ditugaskan'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}