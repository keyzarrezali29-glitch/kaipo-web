import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wrench, CalendarDays, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Tag, X, MapPin, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { mulaiPembayaran } from '../../lib/bayar'

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
  menunggu_konfirmasi: 'bg-amber-50 text-amber-700 ring-amber-100',
  dijadwalkan: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  diproses: 'bg-blue-50 text-blue-700 ring-blue-100',
  selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  dibatalkan: 'bg-rose-50 text-rose-700 ring-rose-100',
}

// Tanggal lokal (WIB) format YYYY-MM-DD. JANGAN pakai toISOString() karena itu UTC
// dan bisa meleset sehari kalau dijalankan sebelum jam 07.00 pagi.
function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  // Parse manual (YYYY-MM-DD) supaya tidak kena pergeseran zona waktu
  const [y, m, d] = String(tanggalStr).slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
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
    <div className="min-h-full">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Booking Servis</h1>
        <p className="mt-1 text-sm text-slate-400">Pilih layanan dan jadwal yang sesuai untuk kendaraan Anda</p>
      </header>

      <div className="mb-6 flex w-fit gap-1 rounded-full bg-white p-1.5">
        <button
          onClick={() => setTab('buat')}
          className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${tab === 'buat' ? 'bg-[#12123a] text-white' : 'text-slate-500 hover:text-slate-800'}`}
        >
          Buat Booking
        </button>
        <button
          onClick={() => setTab('riwayat')}
          className={`rounded-full px-6 py-2.5 text-sm font-semibold transition ${tab === 'riwayat' ? 'bg-[#12123a] text-white' : 'text-slate-500 hover:text-slate-800'}`}
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
  const [bengkel, setBengkel] = useState(null)

  const [selectedLayanan, setSelectedLayanan] = useState(null)
  const [selectedKendaraan, setSelectedKendaraan] = useState(null)
  const [bulanOffset, setBulanOffset] = useState(0)
  const [selectedTanggal, setSelectedTanggal] = useState(null)
  const [selectedJam, setSelectedJam] = useState(null)
  const [catatan, setCatatan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState({ type: '', message: '' })

  // --- Slot yang sudah dipakai booking lain: { 'YYYY-MM-DD': Set(['09:00', ...]) } ---
  const [slotTerisi, setSlotTerisi] = useState({})
  const [slotError, setSlotError] = useState(false) // true kalau gagal memuat slot terisi dari database
  const [kapasitas, setKapasitas] = useState(null) // jumlah mekanik aktif yang tidak libur = maks booking per jam

  // --- Kode promo ---
  const [promoInput, setPromoInput] = useState('')
  const [promoApplied, setPromoApplied] = useState(null) // baris promo yang udah divalidasi & dipakai
  const [checkingPromo, setCheckingPromo] = useState(false)
  const [promoNotice, setPromoNotice] = useState({ type: '', message: '' })

  const kalender = generateKalender(bulanOffset)
  const bisaMundur = bulanOffset > 0 // gak bisa balik ke bulan yang udah lewat

  // Waktu sekarang (dihitung tiap render, jadi selalu ikut hari ini)
  const sekarang = new Date()
  const todayStr = toYMD(sekarang)
  const menitSekarang = sekarang.getHours() * 60 + sekarang.getMinutes()

  // Jam sudah lewat? (hanya berlaku kalau tanggalnya hari ini)
  function jamSudahLewat(tanggal, jam) {
    if (tanggal !== todayStr) return false
    const [h, m] = jam.split(':').map(Number)
    return h * 60 + m <= menitSekarang
  }
  // Jam penuh kalau jumlah booking aktif di jam itu sudah sama dengan jumlah mekanik yang tersedia
  function jamSudahDipakai(tanggal, jam) {
    const jumlah = slotTerisi[tanggal]?.[jam] ?? 0
    if (jumlah === Infinity) return true // ditandai penuh secara lokal setelah ditolak database
    return kapasitas !== null && jumlah >= kapasitas
  }
  function jamTidakTersedia(tanggal, jam) {
    return jamSudahDipakai(tanggal, jam) || jamSudahLewat(tanggal, jam)
  }
  // Tanggal penuh = semua jam sudah dipakai / sudah lewat
  function tanggalPenuh(tanggal) {
    return JAM_SLOT.every((j) => jamTidakTersedia(tanggal, j))
  }

  async function muatSlotTerisi() {
    const [slotRes, kapRes] = await Promise.all([
      supabase.rpc('get_slot_terisi', { p_dari: toYMD(new Date()) }),
      supabase.rpc('get_kapasitas_mekanik'),
    ])
    if (slotRes.error || kapRes.error) {
      console.error('Gagal memuat slot terisi:', slotRes.error || kapRes.error)
      setSlotError(true)
      return
    }
    setSlotError(false)
    setKapasitas(Number(kapRes.data ?? 0))
    // peta[tanggal][jam] = jumlah booking aktif
    const peta = {}
    for (const r of slotRes.data ?? []) {
      const tgl = String(r.tanggal).slice(0, 10)
      if (!peta[tgl]) peta[tgl] = {}
      peta[tgl][String(r.waktu).slice(0, 5)] = Number(r.jumlah)
    }
    setSlotTerisi(peta)
  }

  // Tandai satu slot sebagai terisi secara lokal (dipakai saat database menolak karena slot sudah diambil)
  function tandaiTerisi(tanggal, jam) {
    setSlotTerisi((prev) => {
      const salinan = { ...prev }
      salinan[tanggal] = { ...(prev[tanggal] ?? {}), [jam]: Infinity }
      return salinan
    })
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const [layananRes, kendaraanRes, bengkelRes] = await Promise.all([
          supabase.from('layanan').select('*').eq('is_active', true).order('nama'),
          supabase.from('kendaraan').select('*').eq('customer_id', user.id).order('is_default', { ascending: false }),
          supabase.from('pengaturan_bengkel').select('*').maybeSingle(),
        ])
        setLayananList(layananRes.data ?? [])
        setKendaraanList(kendaraanRes.data ?? [])
        if (kendaraanRes.data?.length) setSelectedKendaraan(kendaraanRes.data[0])
        setBengkel(bengkelRes.data ?? null)
        await muatSlotTerisi()
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
    setSelectedJam(null)
  }

  function pilihTanggal(tanggal) {
    setSelectedTanggal(tanggal)
    setSelectedJam(null) // jam direset, karena ketersediaan jam beda tiap tanggal
    muatSlotTerisi() // refresh biar datanya paling baru
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
      const hariIni = toYMD(new Date())
      const { data, error } = await supabase
        .from('promo')
        .select('*')
        .eq('kode', kode)
        .eq('is_active', true)
        .lte('berlaku_dari', hariIni)
        .gte('berlaku_sampai', hariIni)
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

    // Validasi ulang tepat sebelum kirim (misal halaman dibiarkan terbuka lama)
    if (selectedTanggal < todayStr || jamSudahLewat(selectedTanggal, selectedJam)) {
      setSelectedJam(null)
      return setNotice({ type: 'error', message: 'Jadwal yang dipilih sudah lewat. Pilih tanggal dan jam yang baru.' })
    }

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

      if (error) {
        // 23505 = unique violation (index booking_slot_unik): slot baru saja diambil orang lain
        if (error.code === '23505' || error.message?.includes('SLOT_PENUH')) {
          const jamBentrok = selectedJam
          tandaiTerisi(selectedTanggal, jamBentrok)
          setSelectedJam(null)
          await muatSlotTerisi()
          setNotice({ type: 'error', message: `Jam ${jamBentrok} pada tanggal ini sudah penuh dipesan customer lain. Silakan pilih jam lain.` })
          return
        }
        throw error
      }

      const kodeBooking = data.kode_booking
      const bookingId = data.id
      setSelectedLayanan(null)
      setSelectedTanggal(null)
      setSelectedJam(null)
      setCatatan('')
      hapusPromo()
      await muatSlotTerisi()

      // Booking tersimpan -> langsung bayar. Admin baru bisa menugaskan mekanik setelah lunas.
      setNotice({ type: 'success', message: `Booking ${kodeBooking} tersimpan. Menyiapkan pembayaran...` })
      let selesai = false
      try {
        await mulaiPembayaran(bookingId, {
          onSuccess: () => {
            selesai = true
            setNotice({ type: 'success', message: `Pembayaran berhasil! Booking ${kodeBooking} menunggu konfirmasi admin.` })
          },
          onPending: () => {
            selesai = true
            setNotice({
              type: 'success',
              message: `Menunggu pembayaran selesai. Booking ${kodeBooking} diproses admin setelah pembayaran diterima.`,
            })
          },
          onError: () => {
            selesai = true
            setNotice({
              type: 'error',
              message: `Pembayaran gagal. Booking ${kodeBooking} tetap tersimpan, bayar ulang dari tab Riwayat Booking.`,
            })
          },
          onClose: () => {
            if (!selesai) {
              setNotice({
                type: 'error',
                message: `Pembayaran belum diselesaikan. Booking ${kodeBooking} baru bisa diproses setelah dibayar. Lanjutkan dari tab Riwayat Booking dalam 30 menit supaya jadwalnya tidak dilepas.`,
              })
            }
          },
        })
      } catch (payErr) {
        setNotice({
          type: 'error',
          message: `Booking ${kodeBooking} tersimpan, tapi pembayaran gagal dimulai: ${payErr.message}. Bayar dari tab Riwayat Booking.`,
        })
      }
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* STEP 1: LAYANAN */}
        <div className="rounded-3xl bg-white p-6">
          <StepTitle num={1} title="Pilih Layanan" />
          <div className="space-y-2.5">
            {layananList.map((l) => {
              const aktif = selectedLayanan?.id === l.id
              return (
                <button
                  key={l.id}
                  onClick={() => setSelectedLayanan(l)}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                    aktif ? 'border-[#12123a] bg-slate-50 ring-1 ring-[#12123a]' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      aktif ? 'bg-[#12123a] text-white' : 'bg-slate-100 text-[#12123a]'
                    }`}
                  >
                    <Wrench size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{l.nama}</p>
                    {l.deskripsi && <p className="truncate text-xs text-slate-400">{l.deskripsi}</p>}
                  </div>
                  <span className="text-sm font-bold text-slate-900">{formatRupiah(l.harga)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* STEP 2: KENDARAAN */}
        <div className="rounded-3xl bg-white p-6">
          <StepTitle num={2} title="Pilih Kendaraan" />
          {kendaraanList.length === 0 ? (
            <p className="text-sm text-slate-400">
              Belum ada kendaraan terdaftar.{' '}
              <Link to="/customer/kendaraan" className="font-semibold text-[#12123a] underline">
                Tambah dulu di sini
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {kendaraanList.map((k) => {
                const aktif = selectedKendaraan?.id === k.id
                return (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKendaraan(k)}
                    className={`rounded-2xl border px-5 py-3 text-left transition ${
                      aktif ? 'border-[#12123a] bg-slate-50 ring-1 ring-[#12123a]' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{k.merek} {k.model}</p>
                    <p className="text-xs text-slate-400">{k.plat_nomor}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* STEP 3: TANGGAL & WAKTU */}
        <div className="rounded-3xl bg-white p-6">
          <StepTitle num={3} title="Tanggal & Waktu" />
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CalendarDays size={16} className="text-[#12123a]" /> {kalender.label}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => gantiBulan(-1)}
                disabled={!bisaMundur}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                title="Bulan sebelumnya"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => gantiBulan(1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                title="Bulan berikutnya"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
            {HARI.map((h, i) => <span key={i}>{h}</span>)}
          </div>
          <div className="mb-6 grid grid-cols-7 gap-1">
            {kalender.days.map((d, i) => {
              if (!d) return <span key={i} />

              const sudahLewat = d.tanggal < todayStr
              const penuh = !sudahLewat && tanggalPenuh(d.tanggal)
              const nonaktif = sudahLewat || penuh
              const terpilih = selectedTanggal === d.tanggal

              let kelas = 'text-slate-700 hover:bg-slate-100'
              if (nonaktif) kelas = 'cursor-not-allowed text-slate-300'
              else if (terpilih) kelas = 'bg-[#12123a] font-bold text-white'

              return (
                <button
                  key={i}
                  disabled={nonaktif}
                  onClick={() => pilihTanggal(d.tanggal)}
                  title={penuh ? 'Semua jam sudah terisi' : sudahLewat ? 'Tanggal sudah lewat' : undefined}
                  className={`aspect-square rounded-full text-xs transition ${kelas} ${penuh ? 'line-through' : ''}`}
                >
                  {d.label}
                </button>
              )
            })}
          </div>
          <p className="mb-2 text-xs font-semibold text-slate-500">Jam kedatangan</p>
          <div className="grid grid-cols-4 gap-2">
            {JAM_SLOT.map((j) => {
              const belumPilihTanggal = !selectedTanggal
              const terisi = !belumPilihTanggal && jamSudahDipakai(selectedTanggal, j)
              const lewat = !belumPilihTanggal && jamSudahLewat(selectedTanggal, j)
              const nonaktif = belumPilihTanggal || terisi || lewat
              const terpilih = selectedJam === j

              let kelas = 'border-slate-200 text-slate-700 hover:border-slate-300'
              if (nonaktif) kelas = 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
              else if (terpilih) kelas = 'border-[#12123a] bg-[#12123a] text-white'

              return (
                <button
                  key={j}
                  disabled={nonaktif}
                  onClick={() => setSelectedJam(j)}
                  title={terisi ? 'Jam ini sudah penuh dipesan customer lain' : lewat ? 'Jam ini sudah lewat' : undefined}
                  className={`flex flex-col items-center justify-center rounded-full border py-2 text-xs font-semibold transition ${kelas}`}
                >
                  <span className={terisi ? 'line-through' : ''}>{j}</span>
                  {terisi && <span className="text-[10px] font-medium leading-tight">Penuh</span>}
                  {!nonaktif && kapasitas > 1 && (slotTerisi[selectedTanggal]?.[j] ?? 0) > 0 && (
                    <span className="text-[10px] font-medium leading-tight opacity-70">
                      Sisa {kapasitas - slotTerisi[selectedTanggal][j]}
                    </span>
                  )}
                  {!terisi && lewat && <span className="text-[10px] font-medium leading-tight">Lewat</span>}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            {(() => {
              if (!selectedTanggal) return 'Pilih tanggal dulu untuk melihat jam yang tersedia.'
              if (kapasitas === 0) return 'Saat ini belum ada mekanik yang tersedia, jadi booking belum bisa dibuat.'
              const terisiList = JAM_SLOT.filter((j) => jamSudahDipakai(selectedTanggal, j))
              const pesan = []
              if (terisiList.length) pesan.push(`Jam ${terisiList.join(', ')} sudah penuh dipesan customer lain, jadi tidak bisa dipilih.`)
              if (selectedTanggal === todayStr) pesan.push('Jam yang sudah lewat juga tidak bisa dipilih.')
              return pesan.join(' ') || 'Semua jam pada tanggal ini masih tersedia.'
            })()}
          </p>
          {slotError && (
            <p className="mt-2 text-[11px] font-medium text-rose-500">
              Gagal memuat daftar jam yang sudah dipesan, jadi ketersediaan di atas mungkin belum akurat. Coba refresh halaman.
            </p>
          )}
        </div>

        {/* STEP 4: KODE PROMO */}
        <div className="rounded-3xl bg-white p-6">
          <StepTitle num={4} title="Kode Promo (Opsional)" />

          {promoApplied ? (
            <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-inset ring-emerald-100">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-600">
                  <Tag size={15} />
                </span>
                <div>
                  <p className="font-mono text-sm font-bold text-emerald-800">{promoApplied.kode}</p>
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
                className="flex-1 rounded-full border border-slate-200 px-5 py-3 font-mono text-sm outline-none focus:border-[#12123a]"
              />
              <button
                onClick={handleCekPromo}
                disabled={checkingPromo || !promoInput.trim()}
                className="rounded-full bg-[#12123a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
              >
                {checkingPromo ? 'Cek...' : 'Terapkan'}
              </button>
            </div>
          )}

          <Notice type={promoNotice.type} message={promoNotice.message} className="mt-3" />

          <p className="mt-3 text-[11px] text-slate-400">
            Diskon akan diverifikasi dan diterapkan oleh Admin saat mengonfirmasi biaya servis Anda.
          </p>
        </div>

        {/* STEP 5: CATATAN */}
        <div className="rounded-3xl bg-white p-6">
          <StepTitle num={5} title="Catatan Tambahan" />
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Contoh: mobil bunyi kasar saat direm."
            rows={4}
            className="w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-[#12123a]"
          />
        </div>
      </div>

      {/* RINGKASAN + LOKASI */}
      <div className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
        <LokasiCard bengkel={bengkel} />

        <div className="rounded-3xl bg-white p-6">
          <h3 className="mb-4 text-[15px] font-semibold text-slate-900">Ringkasan Booking</h3>

          <Notice type={notice.type} message={notice.message} className="mb-4" />

          <div className="space-y-2.5 text-sm">
            <SummaryRow label="Layanan" value={selectedLayanan?.nama ?? '-'} />
            <SummaryRow label="Kendaraan" value={selectedKendaraan ? `${selectedKendaraan.merek} ${selectedKendaraan.model}` : '-'} />
            <SummaryRow label="Tanggal" value={selectedTanggal ? formatTanggal(selectedTanggal) : '-'} />
            <SummaryRow label="Waktu" value={selectedJam ? `${selectedJam} WIB` : '-'} />
            {promoApplied && <SummaryRow label="Promo" value={promoApplied.kode} />}
          </div>

          <div className="my-5 rounded-2xl bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] p-5 text-white">
            {promoApplied ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Harga layanan</span>
                  <span className="line-through">{formatRupiah(hargaAsli)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>Diskon</span>
                  <span className="font-semibold text-emerald-300">-{formatRupiah(diskon)}</span>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-white/60">Estimasi akhir</p>
                  <p className="text-2xl font-bold tracking-tight">{formatRupiah(estimasiAkhir)}</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-white/60">Estimasi biaya</p>
                <p className="mt-1 text-2xl font-bold tracking-tight">{selectedLayanan ? formatRupiah(hargaAsli) : '-'}</p>
              </>
            )}
          </div>

          <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
            Pembayaran dilakukan langsung setelah booking diajukan. Mekanik baru ditugaskan setelah pembayaran lunas.
          </p>
          <button
            onClick={handleAjukan}
            disabled={submitting}
            className="w-full rounded-full bg-[#12123a] py-3.5 text-sm font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
          >
            {submitting ? 'Memproses...' : 'Ajukan & Bayar'}
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
  const [lunasSet, setLunasSet] = useState(new Set())
  const [payingId, setPayingId] = useState(null)
  const [notice, setNotice] = useState({ type: '', message: '' })

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const [bookingRes, trxRes] = await Promise.all([
      supabase
        .from('booking')
        .select(`*, kendaraan:kendaraan_id ( merek, model, plat_nomor ), layanan:layanan_id ( nama )`)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('transaksi')
        .select('booking_id')
        .eq('customer_id', user.id)
        .eq('jenis', 'servis')
        .eq('status', 'berhasil'),
    ])
    if (!bookingRes.error) setBookings(bookingRes.data ?? [])
    setLunasSet(new Set((trxRes.data ?? []).map((t) => t.booking_id)))
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function bayarSekarang(e, b) {
    // Kartu ini berupa link ke detail booking; tombol bayar tidak boleh ikut membuka halaman detail
    e.preventDefault()
    e.stopPropagation()
    setNotice({ type: '', message: '' })
    setPayingId(b.id)
    let selesai = false
    try {
      await mulaiPembayaran(b.id, {
        onSuccess: () => {
          selesai = true
          setNotice({ type: 'success', message: `Pembayaran booking ${b.kode_booking} berhasil. Menunggu konfirmasi admin.` })
          setTimeout(load, 2500)
        },
        onPending: () => {
          selesai = true
          setNotice({ type: 'success', message: `Menunggu pembayaran booking ${b.kode_booking} selesai.` })
          setTimeout(load, 2500)
        },
        onError: () => {
          selesai = true
          setNotice({ type: 'error', message: 'Pembayaran gagal. Coba lagi atau pilih metode lain.' })
        },
        onClose: () => {
          if (!selesai) setNotice({ type: 'error', message: 'Pembayaran belum diselesaikan.' })
        },
      })
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Gagal memulai pembayaran.' })
    } finally {
      setPayingId(null)
    }
  }

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">Memuat riwayat...</div>
  }

  if (bookings.length === 0) {
    return <div className="rounded-3xl bg-white p-12 text-center text-sm text-slate-400">Belum ada riwayat booking.</div>
  }

  return (
    <div className="space-y-3">
      <Notice type={notice.type} message={notice.message} />
      {bookings.map((b) => {
        const lunas = lunasSet.has(b.id)
        const belumBayar = b.status === 'menunggu_konfirmasi' && !lunas
        return (
          <Link
            key={b.id}
            to={`/customer/booking/${b.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-5 transition hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#12123a]">
                <Wrench size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{b.layanan?.nama ?? '-'}</p>
                <p className="text-xs text-slate-400">
                  {[b.kendaraan?.merek, b.kendaraan?.model].filter(Boolean).join(' ')} {b.kendaraan?.plat_nomor}
                </p>
                <p className="text-xs text-slate-400">{formatTanggal(b.tanggal)} · {b.waktu?.slice(0, 5)} WIB</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {belumBayar && (
                  <span className="rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
                    Belum dibayar
                  </span>
                )}
                {lunas && b.status !== 'dibatalkan' && (
                  <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                    Lunas
                  </span>
                )}
                <span className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${STATUS_CLASS[b.status]}`}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>
              {belumBayar && (
                <button
                  type="button"
                  onClick={(e) => bayarSekarang(e, b)}
                  disabled={payingId === b.id}
                  className="rounded-full bg-[#12123a] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#1c1c52] disabled:opacity-50"
                >
                  {payingId === b.id ? 'Memproses...' : 'Bayar Sekarang'}
                </button>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ============================================================
// KARTU LOKASI SERVIS — embed Google Maps tanpa API key
// ============================================================
function LokasiCard({ bengkel }) {
  const alamat = bengkel?.alamat?.trim()
  const namaBengkel = bengkel?.nama_bengkel || 'Kai-Po Elite Garage'

  if (!alamat) {
    return (
      <div className="rounded-3xl bg-white p-6">
        <div className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <MapPin size={16} className="text-[#12123a]" /> Lokasi Servis
        </div>
        <p className="mt-2 text-sm text-slate-400">Alamat bengkel belum diatur oleh admin.</p>
      </div>
    )
  }

  const query = encodeURIComponent(alamat)
  const embedUrl = `https://maps.google.com/maps?q=${query}&z=15&output=embed`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`

  return (
    <div className="overflow-hidden rounded-3xl bg-white">
      <div className="relative h-40 w-full">
        <iframe
          title="Lokasi bengkel"
          src={embedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="p-5">
        <p className="text-[15px] font-semibold text-slate-900">{namaBengkel}</p>
        <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-400">
          <MapPin size={13} className="mt-0.5 shrink-0" />
          {alamat}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 rounded-full border border-[#12123a] py-2.5 text-xs font-semibold text-[#12123a] transition hover:bg-slate-50"
        >
          Buka di Google Maps <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}

function StepTitle({ num, title }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#12123a] text-xs font-bold text-white">{num}</span>
      <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  )
}

function Notice({ type, message, className = '' }) {
  if (!message) return null
  const error = type === 'error'
  return (
    <div className={`flex items-start gap-2 rounded-2xl p-3 text-xs font-medium ${error ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'} ${className}`}>
      {error ? <AlertCircle size={14} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}
      <span>{message}</span>
    </div>
  )
}