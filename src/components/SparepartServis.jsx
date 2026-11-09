import { useCallback, useEffect, useState } from 'react'
import { Package, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}

// Pesan error yang lebih mudah dipahami
function pesanError(err) {
  const pesan = String(err?.message ?? '')
  if (pesan.includes('STOK_KURANG')) return 'Stok sparepart tidak cukup.'
  if (err?.code === '42501' || pesan.toLowerCase().includes('row-level security')) {
    return 'Tidak punya izin mencatat sparepart. Pastikan status servis sedang Diproses.'
  }
  return pesan || 'Terjadi kesalahan.'
}

/**
 * Pencatatan sparepart pada servis.
 *
 * Props:
 * - bookingId : id booking
 * - status    : status booking saat ini (menunggu_konfirmasi / dijadwalkan / diproses / selesai / dibatalkan)
 * - readOnly  : true kalau hanya untuk melihat daftar (dipakai di halaman admin / customer)
 *
 * Form tambah / hapus hanya aktif saat status = 'diproses' dan readOnly = false.
 */
export default function SparepartServis({ bookingId, status, readOnly = false }) {
  const editable = !readOnly && status === 'diproses'

  const [items, setItems] = useState([])
  const [produkList, setProdukList] = useState([])
  const [loading, setLoading] = useState(true)

  const [produkId, setProdukId] = useState('')
  const [qty, setQty] = useState(1)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [notice, setNotice] = useState({ type: '', message: '' })

  const muatItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('servis_sparepart')
      .select('id, qty, produk:produk_id ( id, nama, harga, kategori )')
      .eq('booking_id', bookingId)
    if (error) throw error
    const rows = (data ?? []).slice().sort((a, b) => (a.produk?.nama ?? '').localeCompare(b.produk?.nama ?? ''))
    setItems(rows)
  }, [bookingId])

  const muatProduk = useCallback(async () => {
    if (!editable) return
    const { data, error } = await supabase
      .from('produk')
      .select('id, nama, harga, stok, kategori')
      .eq('is_active', true)
      .order('nama')
    if (error) throw error
    setProdukList(data ?? [])
  }, [editable])

  useEffect(() => {
    let batal = false
    async function load() {
      setLoading(true)
      try {
        await Promise.all([muatItems(), muatProduk()])
      } catch (err) {
        console.error('Gagal memuat sparepart:', err)
        if (!batal) setNotice({ type: 'error', message: `Gagal memuat sparepart: ${pesanError(err)}` })
      } finally {
        if (!batal) setLoading(false)
      }
    }
    load()
    return () => {
      batal = true
    }
  }, [muatItems, muatProduk])

  async function handleTambah() {
    setNotice({ type: '', message: '' })
    const produk = produkList.find((p) => p.id === produkId)
    const jumlah = Number(qty)

    if (!produk) return setNotice({ type: 'error', message: 'Pilih sparepart dulu ya.' })
    if (!Number.isInteger(jumlah) || jumlah < 1) return setNotice({ type: 'error', message: 'Jumlah minimal 1.' })
    if (jumlah > Number(produk.stok)) {
      return setNotice({ type: 'error', message: `Stok ${produk.nama} hanya ${produk.stok}.` })
    }

    setSaving(true)
    try {
      const sudahAda = items.find((i) => i.produk?.id === produk.id)
      let hasil
      if (sudahAda) {
        // Sparepart yang sama sudah dicatat -> tambahkan jumlahnya, jangan bikin baris ganda
        hasil = await supabase
          .from('servis_sparepart')
          .update({ qty: Number(sudahAda.qty) + jumlah })
          .eq('id', sudahAda.id)
          .select('id')
      } else {
        hasil = await supabase
          .from('servis_sparepart')
          .insert({ booking_id: bookingId, produk_id: produk.id, qty: jumlah })
          .select('id')
      }
      if (hasil.error) throw hasil.error
      if (!hasil.data || hasil.data.length === 0) {
        throw new Error('Tidak punya izin mencatat sparepart. Pastikan status servis sedang Diproses.')
      }

      await Promise.all([muatItems(), muatProduk()])
      setProdukId('')
      setQty(1)
      setNotice({ type: 'success', message: `${produk.nama} (${jumlah}) berhasil dicatat.` })
    } catch (err) {
      console.error('Gagal mencatat sparepart:', err)
      setNotice({ type: 'error', message: pesanError(err) })
    } finally {
      setSaving(false)
    }
  }

  async function handleHapus(item) {
    setNotice({ type: '', message: '' })
    setDeletingId(item.id)
    try {
      const { data, error } = await supabase.from('servis_sparepart').delete().eq('id', item.id).select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Tidak punya izin menghapus sparepart. Pastikan status servis sedang Diproses.')
      }
      await Promise.all([muatItems(), muatProduk()])
    } catch (err) {
      console.error('Gagal menghapus sparepart:', err)
      setNotice({ type: 'error', message: pesanError(err) })
    } finally {
      setDeletingId(null)
    }
  }

  const totalSparepart = items.reduce((sum, i) => sum + Number(i.qty || 0) * Number(i.produk?.harga || 0), 0)

  return (
    <div className="rounded-3xl bg-white p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#12123a]">
          <Package size={17} />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900">Sparepart yang dipakai</h3>
          <p className="text-xs text-slate-400">
            {editable
              ? 'Catat sparepart yang digunakan selama servis berlangsung'
              : 'Daftar sparepart yang dipakai pada servis ini'}
          </p>
        </div>
      </div>

      {notice.message && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-2xl p-3 text-xs font-medium ${
            notice.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {notice.type === 'error' ? (
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Memuat sparepart...</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          {editable ? 'Belum ada sparepart yang dicatat.' : 'Tidak ada sparepart yang dipakai pada servis ini.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{item.produk?.nama ?? 'Produk dihapus'}</p>
                <p className="text-xs text-slate-400">
                  {item.qty} × {formatRupiah(item.produk?.harga)}
                  {item.produk?.kategori ? ` · ${item.produk.kategori}` : ''}
                </p>
              </div>
              <span className="text-sm font-bold text-slate-900">
                {formatRupiah(Number(item.qty) * Number(item.produk?.harga || 0))}
              </span>
              {editable && (
                <button
                  type="button"
                  onClick={() => handleHapus(item)}
                  disabled={deletingId === item.id}
                  title="Hapus sparepart"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200 transition hover:text-rose-600 disabled:opacity-40"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <span className="text-slate-400">Estimasi biaya sparepart</span>
          <span className="font-bold text-slate-900">{formatRupiah(totalSparepart)}</span>
        </div>
      )}

      {editable && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <p className="mb-2 text-xs font-semibold text-slate-500">Tambah sparepart</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={produkId}
              onChange={(e) => setProdukId(e.target.value)}
              disabled={produkList.length === 0}
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#12123a] disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">
                {produkList.length === 0 ? 'Belum ada sparepart aktif' : 'Pilih sparepart'}
              </option>
              {produkList.map((p) => (
                <option key={p.id} value={p.id} disabled={Number(p.stok) < 1}>
                  {p.nama}
                  {p.kategori ? ` (${p.kategori})` : ''} · stok {p.stok}
                  {Number(p.stok) < 1 ? ' · habis' : ''}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-24 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#12123a]"
            />
            <button
              type="button"
              onClick={handleTambah}
              disabled={saving || !produkId}
              className="flex items-center gap-1.5 rounded-full bg-[#12123a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} />
              {saving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            Biaya final servis tetap ditentukan oleh admin.
          </p>
        </div>
      )}

      {!editable && !readOnly && status === 'dijadwalkan' && (
        <p className="mt-4 text-[11px] text-slate-400">
          Pencatatan sparepart dibuka setelah servis dimulai (status Diproses).
        </p>
      )}
    </div>
  )
}