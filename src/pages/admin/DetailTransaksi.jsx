import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Wrench, CreditCard, Package } from 'lucide-react'
import { supabase } from '../../lib/supabase'

function formatRupiah(angka) {
  return `Rp ${Number(angka || 0).toLocaleString('id-ID')}`
}

function formatTanggal(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABEL = { menunggu: 'Menunggu', berhasil: 'Berhasil', gagal: 'Gagal', refund: 'Refund' }
const STATUS_CLASS = {
  menunggu: 'bg-amber-100 text-amber-700',
  berhasil: 'bg-emerald-100 text-emerald-700',
  gagal: 'bg-rose-100 text-rose-700',
  refund: 'bg-slate-100 text-slate-500',
}
const JENIS_LABEL = { servis: 'Servis', produk: 'Produk' }
const JENIS_CLASS = { servis: 'bg-blue-100 text-blue-700', produk: 'bg-indigo-100 text-indigo-700' }

export default function DetailTransaksi() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [transaksi, setTransaksi] = useState(null)
  const [items, setItems] = useState([])
  const [updating, setUpdating] = useState(false)

  async function loadData() {
    try {
      setError(null)
      const { data: t, error: tErr } = await supabase
        .from('transaksi')
        .select(`
          id, kode_transaksi, jenis, total, metode_pembayaran, status, created_at,
          customer:customer_id ( full_name, phone, email ),
          booking:booking_id (
            kode_booking, tanggal, waktu, lokasi, catatan, biaya_estimasi, biaya_final, status,
            kendaraan:kendaraan_id ( merek, model, plat_nomor ),
            layanan:layanan_id ( nama, harga ),
            mekanik:mekanik_id ( full_name )
          )
        `)
        .eq('id', id)
        .single()

      if (tErr) throw tErr
      setTransaksi(t)

      if (t.jenis === 'produk') {
        const { data: itemData, error: itemErr } = await supabase
          .from('transaksi_item')
          .select('id, qty, harga_satuan, produk:produk_id ( nama, foto_url )')
          .eq('transaksi_id', id)

        if (itemErr) throw itemErr
        setItems(itemData ?? [])
      }
    } catch (err) {
      console.error('Gagal memuat detail transaksi:', err)
      setError(err.message || 'Gagal memuat detail transaksi')
    }
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [id])

  async function ubahStatus(statusBaru) {
    setUpdating(true)
    try {
      const { error: updateError } = await supabase
        .from('transaksi')
        .update({ status: statusBaru })
        .eq('id', id)
      if (updateError) throw updateError
      setTransaksi((prev) => ({ ...prev, status: statusBaru }))
    } catch (err) {
      console.error('Gagal ubah status:', err)
      alert('Gagal ubah status: ' + err.message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-400">Memuat detail transaksi...</div>
  }

  if (error || !transaksi) {
    return (
      <div className="min-h-full bg-slate-100 px-8 py-6">
        <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={16} /> Kembali
        </button>
        <div className="rounded-2xl bg-white p-6 text-sm text-rose-600 shadow-sm">
          {error || 'Transaksi tidak ditemukan.'}
        </div>
      </div>
    )
  }

  const b = transaksi.booking

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={16} /> Kembali ke Transaksi
      </button>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">#{transaksi.kode_transaksi}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[transaksi.status] || 'bg-slate-100 text-slate-600'}`}>
              {STATUS_LABEL[transaksi.status] || transaksi.status}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${JENIS_CLASS[transaksi.jenis] || 'bg-slate-100 text-slate-600'}`}>
              {JENIS_LABEL[transaksi.jenis] || transaksi.jenis}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{formatTanggal(transaksi.created_at)}</p>
        </div>

        {transaksi.status === 'menunggu' && (
          <div className="flex gap-2">
            <button
              onClick={() => ubahStatus('berhasil')}
              disabled={updating}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Tandai Berhasil
            </button>
            <button
              onClick={() => ubahStatus('gagal')}
              disabled={updating}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Tandai Gagal
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {transaksi.jenis === 'servis' ? (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Wrench size={16} /> Detail Servis
              </h2>
              {b ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoRow label="Kode Booking" value={b.kode_booking ? `#${b.kode_booking}` : '-'} />
                  <InfoRow label="Layanan" value={b.layanan?.nama ?? '-'} />
                  <InfoRow label="Jadwal" value={`${formatTanggal(b.tanggal)}${b.waktu ? ' · ' + b.waktu : ''}`} />
                  <InfoRow label="Lokasi" value={b.lokasi ?? '-'} />
                  <InfoRow label="Kendaraan" value={b.kendaraan ? `${b.kendaraan.merek} ${b.kendaraan.model} · ${b.kendaraan.plat_nomor}` : '-'} />
                  <InfoRow label="Mekanik" value={b.mekanik?.full_name ?? 'Belum ditugaskan'} />
                  <InfoRow label="Status Pengerjaan" value={b.status ?? '-'} />
                  <InfoRow label="Catatan" value={b.catatan || '-'} />
                </div>
              ) : (
                <p className="text-sm text-slate-400">Data booking tidak ditemukan.</p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Package size={16} /> Item Produk
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400">Tidak ada item produk.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        {it.produk?.foto_url ? (
                          <img src={it.produk.foto_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                            <Package size={16} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-800">{it.produk?.nama ?? 'Produk tidak ditemukan'}</p>
                          <p className="text-xs text-slate-400">{it.qty} x {formatRupiah(it.harga_satuan)}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{formatRupiah(it.qty * it.harga_satuan)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <User size={16} /> Customer
            </h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Nama" value={transaksi.customer?.full_name ?? '-'} />
              <InfoRow label="Telepon" value={transaksi.customer?.phone ?? '-'} />
              <InfoRow label="Email" value={transaksi.customer?.email ?? '-'} />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CreditCard size={16} /> Pembayaran
            </h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="Metode" value={transaksi.metode_pembayaran || '-'} />
              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-slate-500">Total</span>
                <span className="text-lg font-bold text-slate-900">{formatRupiah(transaksi.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}