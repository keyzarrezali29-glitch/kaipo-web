import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, CalendarDays, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Tag, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const HARI = ['S', 'S', 'R', 'K', 'J', 'S', 'M']
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const JAM_SLOT = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']

const STATUS_LABEL = {
  menunggu_konfirmasi: 'Menunggu Konfirmasi',
  dijadwalkan: 'Dijadwalkan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
}
const STATUS_CLASS = {
  menunggu_konfirmasi: 'bg-amber-100 text-amber-700',
  dijadwalkan: 'bg-amber-100 text-amber-700',
  diproses: 'bg-blue-100 text-blue-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  dibatalkan: 'bg-rose-100 text-rose-700',
}

function generateKalender(bulanOffset = 0) {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth() + bulanOffset, 1)
  const tahun = target.getFullYear()
  const bulan = target.getMonth()
  const jumlahHari = new Date(tahun, bulan + 1, 0).getDate()
  const hariPertama = new Date(tahun, bulan, 1).getDay()
  const offset = (hariPertama + 6) % 7

  const days = []
  for (let i = 0; i < offset; i++) days.push(null)
  for (let d = 1; d <= jumlahHari; d++) {
    days.push({ tanggal: `${tahun}-${String(bulan + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, label: d })
  }
  return { days, label: `${BULAN[bulan]} ${tahun}` }
}

function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-'
  const d = new Date(tanggalStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatRupiah(n) {
  return `Rp ${Number(n || 0).toLocaleString('id-ID')}`
}
function hitungDiskon(promo, harga) {
  if (!promo) return 0
  if (promo.tipe_diskon === 'persen') return Math.round((harga * promo.nilai) / 100)
  return Math.min(promo.nilai, harga) // nominal, gak boleh lebih besar dari harga aslinya
}

export default function CustomerBooking() {
  const [tab, setTab] = useState('buat')

  return (
    <div className="min-h-full bg-slate-100 px-8 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Booking Servis</h1>
        <p className="mt-1 text-sm text-slate-400">Pilih layanan dan jadwal yang sesuai untuk kendaraan Anda</p>
      </header>

      <div className="mb-6 flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm">
        <button
          onClick={() => setTab('buat')}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === 'buat' ? 'bg-[#12123a] text-white' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Buat Booking
        </button>
        <button
          onClick={() => setTab('riwayat')}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${tab === 'riwayat' ? 'bg-[#12123a] text-white' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Riwayat Booking
        </button>
      </div>

      {tab === 'buat' ? <BuatBookingTab /> : <RiwayatBookingTab />}
    </div>
  )
}

// ============================================================
// TAB: BUAT BOOKING
// ============================================================
function BuatBookingTab() {
  const [loading, setLoading] = useState(true)
  const [layananList, setLayananList] = useState([])
  const [kendaraanList, setKendaraanList] = useState([])

  const [selectedLayanan, setSelectedLayanan] = useState(null)
  const [selectedKendaraan, setSelectedKendaraan] = useState(null)
  const [bulanOffset, setBulanOffset] = useState(0)
  const [selectedTanggal, setSelectedTanggal] = useState(null)
  const [selectedJam, setSelectedJam] = useState(null)
  const [catatan, setCatatan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })

  // --- Kode promo ---
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(null) // baris promo yang udah divalidasi & dipakai
  const [checkingPromo, setCheckingPromo] = useState(false)
  const [promoNotice, setPromoNotice] = useState({ type: '', message: '' })

  const kalender = generateKalender(bulanOffset)
  const bisaMundur = bulanOffset > 0 // gak bisa balik ke bulan yang udah lewat

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const [layananRes, kendaraanRes] = await Promise.all([
          supabase.from('layanan').select('*').eq('is_active', true).order('nama'),
          supabase.from('kendaraan').select('*').eq('customer_id', user.id).order('is_default', { ascending: false }),
        ])
        setLayananList(layananRes.data ?? [])
        setKendaraanList(kendaraanRes.data ?? [])
        if (kendaraanRes.data?.length) setSelectedKendaraan(kendaraanRes.data[0])
      } catch (err) {
        console.error('Gagal memuat data booking:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function gantiBulan(arah) {
    setBulanOffset((prev) => Math.max(0, prev + arah))
    setSelectedTanggal(null) // reset tanggal terpilih pas ganti bulan biar gak nyangkut ke tanggal bulan lain
  }

  async function handleCekPromo() {
    setPromoNotice({ type: '', message: '' })
    const kode = promoInput.trim().toUpperCase()
    if (!kode) return

    if (!selectedLayanan) {
      setPromoNotice({ type: 'error', message: 'Pilih layanan dulu sebelum pakai kode promo.' })
      return
    }

    setCheckingPromo(true)
    try {
      const todayStr = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('promo')
        .select('*')
        .eq('kode', kode)
        .eq('is_active', true)
        .lte('berlaku_dari', todayStr)
        .gte('berlaku_sampai', todayStr)
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setPromoNotice({ type: 'error', message: 'Kode promo tidak valid atau sudah tidak berlaku.' })
        setPromoApplied(null)
        return
      }

      const harga = Number(selectedLayanan.harga)
      if (data.min_transaksi && harga < Number(data.min_transaksi)) {
        setPromoNotice({
          type: 'error',
          message: `Minimum transaksi untuk promo ini ${formatRupiah(data.min_transaksi)}.`,
        })
        setPromoApplied(null)
        return
      }

      setPromoApplied(data)
      setPromoNotice({ type: 'success', message: `Kode promo "${data.kode}" berhasil dipakai!` })
    } catch (err) {
      console.error('Gagal cek promo:', err)
      setPromoNotice({ type: 'error', message: err.message || 'Gagal memeriksa kode promo.' })
    } finally {
      setCheckingPromo(false)
    }
  }

  function hapusPromo() {
    setPromoApplied(null)
    setPromoInput('')
    setPromoNotice({ type: '', message: '' })
  }

  async function handleAjukan() {
    setNotice({ type: '', message: '' })
    if (!selectedLayanan) return setNotice({ type: 'error', message: 'Pilih layanan dulu ya.' })
    if (!selectedKendaraan) return setNotice({ type: 'error', message: 'Pilih kendaraan dulu ya.' })
    if (!selectedTanggal || !selectedJam) return setNotice({ type: 'error', message: 'Pilih tanggal dan jam dulu ya.' })

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Kode promo dicatat di catatan booking biar Admin lihat & terapkan manual
      // pas nentuin biaya_final (belum ada kolom promo terpisah di tabel booking).
      let catatanFinal = catatan.trim()
      if (promoApplied) {
        const diskon = hitungDiskon(promoApplied, Number(selectedLayanan.harga))
        const catatanPromo = `[Kode Promo: ${promoApplied.kode} — estimasi diskon ${formatRupiah(diskon)}]`
        catatanFinal = catatanFinal ? `${catatanFinal}\n${catatanPromo}` : catatanPromo
      }

      const { data, error } = await supabase
        .from('booking')
        .insert({
          customer_id: user.id,
          kendaraan_id: selectedKendaraan.id,
          layanan_id: selectedLayanan.id,
          tanggal: selectedTanggal,
          waktu: `${selectedJam}:00`,
          catatan: catatanFinal || null,
        })
        .select()
        .single()
      if (error) throw error

      setNotice({ type: 'success', message: `Booking berhasil diajukan! Kode: ${data.kode_booking}` })
      setSelectedLayanan(null)
      setSelectedTanggal(null)
      setSelectedJam(null)
      setCatatan('')
      hapusPromo()
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Gagal membuat booking.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">Memuat data...</div>
  }

  const hargaAsli = selectedLayanan ? Number(selectedLayanan.harga) : 0
  const diskon = promoApplied ? hitungDiskon(promoApplied, hargaAsli) : 0
  const estimasiAkhir = hargaAsli - diskon

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* STEP 1: LAYANAN */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <StepTitle num={1} title="Pilih Layanan" />
          <div className="space-y-2">
            {layananList.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelectedLayanan(l)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                  selectedLayanan?.id === l.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${selectedLayanan?.id === l.id ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Wrench size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{l.nama}</p>
                  {l.deskripsi && <p className="text-xs text-slate-400">{l.deskripsi}</p>}
                </div>
                <span className="text-sm font-semibold text-slate-700">Rp {Number(l.harga).toLocaleString('id-ID')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* STEP 2: KENDARAAN */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <StepTitle num={2} title="Pilih Kendaraan" />
          {kendaraanList.length === 0 ? (
            <p className="text-sm text-slate-400">
              Belum ada kendaraan terdaftar. <Link to="/customer/kendaraan" className="text-indigo-600 underline">Tambah dulu di sini</Link>.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {kendaraanList.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setSelectedKendaraan(k)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selectedKendaraan?.id === k.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{k.merek} {k.model}</p>
                  <p className="text-xs text-slate-400">{k.plat_nomor}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* STEP 3: TANGGAL & WAKTU */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <StepTitle num={3} title="Tanggal & Waktu" />
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CalendarDays size={16} className="text-indigo-600" /> {kalender.label}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => gantiBulan(-1)}
                disabled={!bisaMundur}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                title="Bulan sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => gantiBulan(1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                title="Bulan berikutnya"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
            {HARI.map((h, i) => <span key={i}>{h}</span>)}
          </div>
          <div className="mb-5 grid grid-cols-7 gap-1">
            {kalender.days.map((d, i) => (
              <button
                key={i}
                disabled={!d}
                onClick={() => d && setSelectedTanggal(d.tanggal)}
                className={`aspect-square rounded-lg text-xs transition ${
                  !d ? '' : selectedTanggal === d.tanggal ? 'bg-[#12123a] font-bold text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {d?.label}
              </button>
            ))}
          </div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Jam Kedatangan</p>
          <div className="grid grid-cols-4 gap-2">
            {JAM_SLOT.map((j) => (
              <button
                key={j}
                onClick={() => setSelectedJam(j)}
                className={`rounded-lg border py-2 text-xs font-semibold transition ${
                  selectedJam === j ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {j}
              </button>
            ))}
          </div>
        </div>

        {/* STEP 4: KODE PROMO */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <StepTitle num={4} title="Kode Promo (Opsional)" />

          {promoApplied ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">{promoApplied.kode}</p>
                  <p className="text-xs text-emerald-600">{promoApplied.judul}</p>
                </div>
              </div>
              <button onClick={hapusPromo} className="text-emerald-600 hover:text-emerald-800" title="Batalkan promo">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Masukkan kode promo"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono outline-none focus:border-indigo-400"
              />
              <button
                onClick={handleCekPromo}
                disabled={checkingPromo || !promoInput.trim()}
                className="rounded-xl bg-[#12123a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
              >
                {checkingPromo ? 'Cek...' : 'Terapkan'}
              </button>
            </div>
          )}

          {promoNotice.message && (
            <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-xs font-medium ${promoNotice.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {promoNotice.type === 'error' ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
              <span>{promoNotice.message}</span>
            </div>
          )}

          <p className="mt-3 text-[11px] text-slate-400">
            *Diskon akan diverifikasi dan diterapkan oleh Admin saat mengonfirmasi biaya servis Anda.
          </p>
        </div>

        {/* STEP 5: CATATAN */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <StepTitle num={5} title="Catatan Tambahan" />
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: mobil bunyi kasar saat direm."
            rows={4}
            className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* RINGKASAN */}
      <div className="lg:sticky lg:top-6 lg:h-fit">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Ringkasan Booking</h3>

          {notice.message && (
            <div className={`mb-4 flex items-start gap-2 rounded-lg p-3 text-xs font-medium ${notice.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'}`}>
              {notice.type === 'error' ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
              <span>{notice.message}</span>
            </div>
          )}

          <div className="space-y-2 border-b border-slate-100 pb-4 text-sm">
            <SummaryRow label="Layanan" value={selectedLayanan?.nama ?? '-'} />
            <SummaryRow label="Kendaraan" value={selectedKendaraan ? `${selectedKendaraan.merek} ${selectedKendaraan.model}` : '-'} />
            <SummaryRow label="Tanggal" value={selectedTanggal ? formatTanggal(selectedTanggal) : '-'} />
            <SummaryRow label="Waktu" value={selectedJam ? `${selectedJam} WIB` : '-'} />
            {promoApplied && <SummaryRow label="Promo" value={promoApplied.kode} />}
          </div>

          {promoApplied ? (
            <div className="space-y-1.5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Harga Layanan</span>
                <span className="text-slate-500 line-through">{formatRupiah(hargaAsli)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Diskon</span>
                <span className="font-medium text-emerald-600">-{formatRupiah(diskon)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-slate-400">Estimasi Akhir</span>
                <span className="text-lg font-bold text-slate-900">{formatRupiah(estimasiAkhir)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-4">
              <span className="text-sm text-slate-400">Estimasi Biaya</span>
              <span className="text-lg font-bold text-slate-900">
                {selectedLayanan ? formatRupiah(hargaAsli) : '-'}
              </span>
            </div>
          )}

          <button
            onClick={handleAjukan}
            disabled={submitting}
            className="w-full rounded-xl bg-[#12123a] py-3 text-sm font-semibold text-white hover:bg-[#1c1c52] disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : 'Ajukan Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TAB: RIWAYAT BOOKING
// ============================================================
function RiwayatBookingTab() {
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('booking')
        .select(`*, kendaraan:kendaraan_id ( merek, model, plat_nomor ), layanan:layanan_id ( nama )`)
        .eq('customer_id', user.id)
        .order('tanggal', { ascending: false })
      if (!error) setBookings(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">Memuat riwayat...</div>
  }

  if (bookings.length === 0) {
    return <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400 shadow-sm">Belum ada riwayat booking.</div>
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <Link
          key={b.id}
          to={`/customer/booking/${b.id}`}
          className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div>
            <p className="text-sm font-semibold text-slate-900">{b.layanan?.nama ?? '-'}</p>
            <p className="text-xs text-slate-400">
              {[b.kendaraan?.merek, b.kendaraan?.model].filter(Boolean).join(' ')} {b.kendaraan?.plat_nomor}
            </p>
            <p className="text-xs text-slate-400">{formatTanggal(b.tanggal)} · {b.waktu?.slice(0, 5)} WIB</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASS[b.status]}`}>
            {STATUS_LABEL[b.status]}
          </span>
        </Link>
      ))}
    </div>
  )
}

function StepTitle({ num, title }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#12123a] text-xs font-bold text-white">{num}</span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  )
}