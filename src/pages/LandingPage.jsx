import { Link } from 'react-router-dom'
import { 
  Wrench, Settings, Zap, ShieldCheck, ArrowRight, ArrowUpRight,
  Phone, Mail, MapPin, CheckCircle, Award, Star, 
  CalendarCheck, ClipboardCheck, ThumbsUp
} from 'lucide-react'
import logoKaipo from '../assets/logo-kai-po.png'

const services = [
  { title: 'Servis Berkala', desc: 'Pengecekan & perawatan rutin menyeluruh.', icon: Wrench, harga: '250rb' },
  { title: 'Perbaikan Mesin', desc: 'Diagnosa dan perbaikan mesin presisi tinggi.', icon: Settings, harga: '450rb' },
  { title: 'Tune Up', desc: 'Optimalkan tenaga & efisiensi bahan bakar.', icon: Zap, harga: '350rb' },
  { title: 'Rem & Kaki-Kaki', desc: 'Cek kampas, suspensi & spooring balancing.', icon: ShieldCheck, harga: '300rb' },
]

const testimonials = [
  { name: 'Budi Santoso', text: 'Servis sangat cepat dan teknisi ramah. Mobil saya jadi terasa seperti baru lagi!', car: 'Toyota Avanza' },
  { name: 'Siti Aminah', text: 'Harga yang ditawarkan sangat masuk akal dengan kualitas perbaikan yang bener-bener profesional.', car: 'Honda Brio' },
  { name: 'Andi Wijaya', text: 'Pertama kali bawa mobil kesini, langsung puas. Suku cadang original dan pengerjaannya rapi.', car: 'Daihatsu Xenia' },
]

const faqs = [
  { q: 'Apakah garansi berlaku untuk semua jenis kendaraan?', a: 'Garansi berlaku untuk semua jenis mobil dan motor dengan ketentuan standar layanan kami.' },
  { q: 'Berapa lama waktu yang dibutuhkan untuk servis berkala?', a: 'Rata-rata servis berkala memakan waktu 1-2 jam tergantung pada kondisi kendaraan Anda.' },
  { q: 'Apakah ada biaya konsultasi sebelum servis?', a: 'Tidak, kami memberikan layanan konsultasi gratis terkait kondisi kendaraan Anda.' },
  { q: 'Bagaimana cara booking janji servis?', a: 'Anda bisa langsung mendaftar di website kami, lalu melakukan booking melalui aplikasi mobile KAI-PO.' },
]

const langkah = [
  { icon: CalendarCheck, title: 'Booking Online', desc: 'Pilih layanan, kendaraan, dan jadwal yang sesuai lewat website atau aplikasi.' },
  { icon: ClipboardCheck, title: 'Diagnosa & Konfirmasi', desc: 'Teknisi kami memeriksa kendaraan dan mengonfirmasi biaya sebelum dikerjakan.' },
  { icon: ThumbsUp, title: 'Servis & Ambil', desc: 'Kendaraan dikerjakan oleh teknisi ahli, siap diambil sesuai estimasi waktu.' },
]

const FOTO = {
  hero: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
  tentang: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80',
  strip1: 'https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=600&q=80',
  strip2: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80',
  strip3: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80',
  promo: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=80',
}

const AVATAR_COLORS = ['bg-indigo-900', 'bg-violet-600', 'bg-sky-700']
function inisial(nama) {
  return nama.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function TreadDivider() {
  return (
    <div
      className="h-3 w-full"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, #0a1128 0px, #0a1128 3px, transparent 3px, transparent 9px)',
        opacity: 0.08,
      }}
    />
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#0a1128] selection:text-white">

      {/* NAVBAR — full width, sticky, aman dari overlap saat scroll/anchor */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <img src={logoKaipo} alt="Kai-Po" className="h-9 w-9 object-contain mix-blend-multiply" />
            <span className="text-lg font-black tracking-tight text-[#0a1128]">KAI-PO</span>
          </div>

          <div className="hidden gap-8 text-sm font-medium text-slate-500 md:flex">
            <a href="#tentang" className="transition hover:text-[#0a1128]">Tentang</a>
            <a href="#layanan" className="transition hover:text-[#0a1128]">Layanan</a>
            <a href="#testimoni" className="transition hover:text-[#0a1128]">Testimoni</a>
            <a href="#faq" className="transition hover:text-[#0a1128]">FAQ</a>
            <a href="#kontak" className="transition hover:text-[#0a1128]">Kontak</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:text-[#0a1128]">
              Login
            </Link>
            <Link to="/register" className="rounded-full bg-[#0a1128] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#182a72]">
              Daftar
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO — foto mobil full-bleed */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={FOTO.hero} alt="Sport car" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1128] via-[#0a1128]/85 to-[#0a1128]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128] via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-xl space-y-7 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={11} fill="currentColor" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-white">4.9 dari 500+ pelanggan</span>
              </div>
            </div>

            <h1 className="text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
              Perawatan terbaik <br />
              untuk kendaraan <br />
              <span className="text-white/40">performa tinggi.</span>
            </h1>

            <p className="max-w-md text-base text-white/70 leading-relaxed">
              Platform bengkel modern dengan teknisi profesional dan teknologi terkini.
              Kami memastikan performa kendaraan Anda selalu dalam kondisi prima.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <a href="#layanan" className="rounded-full bg-white px-8 py-3.5 text-sm font-bold text-[#0a1128] transition hover:bg-slate-100">
                Lihat Layanan
              </a>
              <Link to="/register" className="rounded-full border-2 border-white/30 px-8 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10">
                Daftar Sekarang
              </Link>
            </div>
          </div>
        </div>

        {/* Kartu statistik ngambang di bawah hero */}
        <div className="relative mx-auto -mb-16 max-w-5xl px-6">
          <div className="grid grid-cols-2 divide-x divide-slate-100 rounded-3xl bg-white px-4 py-8 shadow-2xl sm:grid-cols-4 sm:px-2">
            <Stat icon={Wrench} number="2.4K+" label="Layanan selesai" />
            <Stat icon={ThumbsUp} number="98%" label="Kepuasan pelanggan" />
            <Stat icon={ShieldCheck} number="15+" label="Teknisi ahli" />
            <Stat icon={Phone} number="24/7" label="Dukungan" />
          </div>
        </div>
      </section>

      {/* Spacer buat ngasih ruang kartu ngambang */}
      <div className="h-16" />

      {/* STRIP FOTO — 3 potongan bengkel/mesin */}
      <section className="mx-auto max-w-7xl px-6 pt-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { src: FOTO.strip1, label: 'Diagnostik mesin presisi' },
            { src: FOTO.strip2, label: 'Teknisi berpengalaman' },
            { src: FOTO.strip3, label: 'Komponen original' },
          ].map((item, i) => (
            <div key={i} className="group relative h-56 overflow-hidden rounded-3xl">
              <img
                src={item.src}
                alt={item.label}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1128]/80 via-[#0a1128]/10 to-transparent" />
              <p className="absolute bottom-4 left-5 text-sm font-bold text-white">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <TreadDivider />

      {/* TENTANG — foto + teks */}
      <section id="tentang" className="scroll-mt-20 border-b border-slate-100 bg-slate-50/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div className="relative">
              <img src={FOTO.tentang} alt="Teknisi Kai-Po" className="h-[420px] w-full rounded-3xl object-cover" />
              <div className="absolute -bottom-6 -right-4 rounded-2xl bg-[#0a1128] px-6 py-5 text-white shadow-xl sm:-right-6">
                <p className="font-mono text-3xl font-bold">20+</p>
                <p className="text-xs text-white/60">Tahun pengalaman</p>
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-extrabold text-[#0a1128] mb-6">
                Lebih dari sekadar <br /> bengkel biasa
              </h2>
              <p className="text-slate-500 leading-relaxed mb-6">
                Berdiri sejak 2024, KAI-PO hadir untuk mengubah standar perawatan kendaraan.
                Kami menggabungkan keahlian teknisi berpengalaman dengan peralatan diagnostik
                modern untuk memastikan setiap kendaraan keluar dalam kondisi terbaiknya.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <CheckCircle className="text-[#0a1128]" size={18} />
                  <span>Teknisi bersertifikat & profesional</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <CheckCircle className="text-[#0a1128]" size={18} />
                  <span>Garansi kepuasan hingga 6 bulan</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <CheckCircle className="text-[#0a1128]" size={18} />
                  <span>Harga transparan tanpa biaya tersembunyi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CARA KERJA — 3 langkah */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 max-w-lg">
          <h2 className="text-4xl font-extrabold text-[#0a1128] md:text-5xl">Booking semudah tiga langkah</h2>
          <p className="mt-4 text-slate-500 text-base">
            Prosesnya cepat, transparan, dan bisa dipantau dari mana saja.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {langkah.map((l, idx) => (
            <div key={idx} className="relative rounded-3xl bg-slate-50 p-8">
              <span className="absolute right-6 top-6 font-mono text-5xl font-black text-[#0a1128]/[0.06]">
                0{idx + 1}
              </span>
              <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0a1128] text-white">
                <l.icon size={20} />
              </div>
              <h3 className="relative mb-2 text-lg font-bold text-slate-900">{l.title}</h3>
              <p className="relative text-sm text-slate-500 leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <TreadDivider />

      {/* LAYANAN — icon mur/baut + harga */}
      <section id="layanan" className="scroll-mt-20 mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 max-w-lg">
          <h2 className="text-4xl font-extrabold text-[#0a1128] md:text-5xl">Solusi perawatan lengkap</h2>
          <p className="mt-4 text-slate-500 text-base">
            Kami menyediakan layanan terbaik untuk memastikan kendaraan Anda selalu dalam performa puncak.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, idx) => (
            <div key={idx} className="group rounded-3xl border border-slate-100 p-8 transition hover:border-[#0a1128]/15 hover:bg-slate-50">
              <div className="mb-5 flex items-start justify-between">
                <div
                  className="flex h-14 w-14 items-center justify-center bg-[#0a1128] text-white"
                  style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
                >
                  <service.icon size={22} />
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                  mulai {service.harga}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-bold text-slate-900">{service.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{service.desc}</p>
              <div className="mt-4 flex items-center text-xs font-bold text-[#0a1128] opacity-0 transition group-hover:opacity-100">
                Detail Layanan <ArrowRight size={14} className="ml-1 transition group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <TreadDivider />

      {/* TESTIMONI */}
      <section id="testimoni" className="scroll-mt-20 bg-slate-50/50 border-b border-slate-100 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-14 text-4xl font-extrabold text-[#0a1128] md:text-5xl">Apa kata pelanggan kami?</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((review, idx) => (
              <div key={idx} className="rounded-3xl border-t-4 border-[#0a1128] bg-white p-8">
                <div className="mb-4 flex gap-1 text-[#0a1128]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6">&ldquo;{review.text}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
                    {inisial(review.name)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#0a1128]">{review.name}</p>
                    <p className="text-xs text-slate-400">{review.car}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 mx-auto max-w-7xl px-6 py-24">
        <h2 className="mb-14 text-4xl font-extrabold text-[#0a1128] md:text-5xl">Pertanyaan umum</h2>
        <div className="mx-auto max-w-3xl space-y-3">
          {faqs.map((faq, idx) => (
            <details key={idx} className="group rounded-2xl border border-slate-100 bg-white p-6 cursor-pointer">
              <summary className="flex list-none items-center justify-between font-bold text-slate-800">
                {faq.q}
                <span className="text-[#0a1128] transition group-open:rotate-180">▾</span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* PROMO BANNER — foto mobil malam */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl p-12 md:flex-row md:p-16">
          <img src={FOTO.promo} alt="Sport car" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1128]/95 via-[#0a1128]/85 to-[#0a1128]/50" />

          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Siap merawat kendaraan Anda?
            </h2>
            <p className="mt-3 text-white/60 text-base">
              Daftar sekarang dan dapatkan layanan eksklusif dengan teknisi terbaik kami.
            </p>
          </div>
          <Link to="/register" className="relative z-10 flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-10 py-4 text-sm font-bold text-[#0a1128] transition hover:bg-slate-50">
            Daftar & Booking <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="kontak" className="scroll-mt-20 bg-[#0a1128] pt-20 pb-8 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="col-span-1 space-y-4 md:col-span-1">
              <div className="mb-2 flex items-center gap-3">
                <img src={logoKaipo} alt="Kai-Po" className="h-10 w-10 object-contain brightness-0 invert" />
                <span className="text-2xl font-black tracking-widest">KAI-PO</span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-white/40">
                Solusi perawatan kendaraan modern dengan teknologi terkini dan tenaga ahli profesional.
              </p>
            </div>

            <div>
              <h4 className="mb-5 font-bold text-white">Layanan</h4>
              <ul className="space-y-3 text-sm text-white/40">
                <li><a href="#layanan" className="transition hover:text-white">Servis Berkala</a></li>
                <li><a href="#layanan" className="transition hover:text-white">Perbaikan Mesin</a></li>
                <li><a href="#layanan" className="transition hover:text-white">Tune Up</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-5 font-bold text-white">Perusahaan</h4>
              <ul className="space-y-3 text-sm text-white/40">
                <li><a href="#tentang" className="transition hover:text-white">Tentang Kami</a></li>
                <li><a href="#" className="transition hover:text-white">Karir</a></li>
                <li><a href="#" className="transition hover:text-white">Kebijakan Privasi</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-5 font-bold text-white">Kontak</h4>
              <ul className="space-y-4 text-sm text-white/40">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-white/20" />
                  <span>Jl. Raya Bengkel No. 1, Jakarta</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="shrink-0 text-white/20" />
                  <span>+62 812 3456 7890</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="shrink-0 text-white/20" />
                  <span>support@kaipo.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/30 md:flex-row">
            <span>© 2026 KAI-PO Garage. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="transition hover:text-white">Instagram</a>
              <a href="#" className="transition hover:text-white">Facebook</a>
              <a href="#" className="transition hover:text-white">YouTube</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ icon: Icon, number, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-3 py-1 text-center sm:px-4">
      <Icon size={18} className="text-[#0a1128]/40" />
      <span className="font-mono text-3xl font-black leading-none text-[#0a1128] sm:text-4xl">{number}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  )
}