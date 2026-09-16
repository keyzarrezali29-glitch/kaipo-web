import { Link } from 'react-router-dom'
import { 
  Wrench, Settings, Zap, ShieldCheck, ArrowRight, 
  Phone, Mail, MapPin, CheckCircle, Award, Star 
} from 'lucide-react'
import logoKaipo from '../assets/logo-kai-po.png'

const services = [
  { title: 'Servis Berkala', desc: 'Pengecekan & perawatan rutin menyeluruh.', icon: Wrench },
  { title: 'Perbaikan Mesin', desc: 'Diagnosa dan perbaikan mesin presisi tinggi.', icon: Settings },
  { title: 'Tune Up', desc: 'Optimalkan tenaga & efisiensi bahan bakar.', icon: Zap },
  { title: 'Rem & Kaki-Kaki', desc: 'Cek kampas, suspensi & spooring balancing.', icon: ShieldCheck },
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

function Wheel({ cx, cy }) {
  return (
    <g stroke="#0a1128" strokeWidth="3" fill="none">
      <circle cx={cx} cy={cy} r="34" />
      <circle cx={cx} cy={cy} r="14" strokeWidth="2" />
      {[0, 90, 180, 270].map((deg) => {
        const a = (deg * Math.PI) / 180
        return (
          <line
            key={deg}
            x1={cx + 10 * Math.cos(a)}
            y1={cy + 10 * Math.sin(a)}
            x2={cx + 30 * Math.cos(a)}
            y2={cy + 30 * Math.sin(a)}
            strokeWidth="2"
          />
        )
      })}
    </g>
  )
}

function CarBlueprint() {
  return (
    <div className="relative w-full">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(10,17,40,0.18) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <svg viewBox="0 0 600 270" className="relative w-full h-auto">
        {/* bayangan */}
        <ellipse cx="300" cy="215" rx="260" ry="10" fill="#0a1128" opacity="0.06" />

        {/* bodi mobil */}
        <path
          d="M40,185 C40,160 60,150 90,148 L150,145 C175,105 230,80 300,78 C365,80 410,100 430,130 L480,138 C505,140 525,155 530,175 L530,185 L500,185 C500,170 485,160 470,160 C455,160 440,170 440,185 L160,185 C160,170 145,160 130,160 C115,160 100,170 100,185 Z"
          fill="none"
          stroke="#0a1128"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* garis kaca depan */}
        <line x1="195" y1="110" x2="230" y2="145" stroke="#0a1128" strokeWidth="2" />
        {/* garis karakter body */}
        <line x1="100" y1="160" x2="470" y2="160" stroke="#0a1128" strokeWidth="1" opacity="0.3" />
        {/* lampu depan */}
        <rect x="505" y="155" width="14" height="8" rx="4" fill="#0a1128" />
        {/* spoiler belakang */}
        <rect x="40" y="135" width="35" height="4" rx="2" fill="#0a1128" />
        <line x1="55" y1="139" x2="55" y2="148" stroke="#0a1128" strokeWidth="2" />
        <line x1="75" y1="139" x2="75" y2="148" stroke="#0a1128" strokeWidth="2" />

        <Wheel cx={170} cy={185} />
        <Wheel cx={430} cy={185} />

        {/* anotasi teknis */}
        <g stroke="#0a1128" strokeWidth="1">
          <circle cx="500" cy="140" r="3" fill="#0a1128" />
          <line x1="500" y1="140" x2="505" y2="55" />
          <text x="510" y="50" fontSize="12" fill="#0a1128" fontFamily="monospace">Mesin & transmisi</text>

          <circle cx="430" cy="185" r="3" fill="#0a1128" />
          <line x1="430" y1="185" x2="430" y2="222" />
          <text x="430" y="238" fontSize="12" fill="#0a1128" fontFamily="monospace" textAnchor="middle">Rem & kaki-kaki</text>

          <circle cx="300" cy="78" r="3" fill="#0a1128" />
          <line x1="300" y1="78" x2="300" y2="28" />
          <text x="300" y="20" fontSize="12" fill="#0a1128" fontFamily="monospace" textAnchor="middle">Bodi & cat</text>
        </g>

        {/* garis dimensi */}
        <g stroke="#0a1128" strokeWidth="1" opacity="0.4">
          <line x1="40" y1="255" x2="530" y2="255" />
          <line x1="40" y1="249" x2="40" y2="261" />
          <line x1="530" y1="249" x2="530" y2="261" />
        </g>
        <text x="285" y="267" fontSize="11" fill="#0a1128" fontFamily="monospace" textAnchor="middle" opacity="0.6">
          4.720 mm
        </text>
      </svg>
    </div>
  )
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

      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <img src={logoKaipo} alt="Kai-Po" className="h-10 w-10 object-contain mix-blend-multiply" />
            <span className="text-xl font-black tracking-tight text-[#0a1128]">KAI-PO</span>
          </div>

          <div className="hidden gap-10 text-sm font-medium text-slate-500 md:flex">
            <a href="#tentang" className="transition hover:text-[#0a1128]">Tentang</a>
            <a href="#layanan" className="transition hover:text-[#0a1128]">Layanan</a>
            <a href="#testimoni" className="transition hover:text-[#0a1128]">Testimoni</a>
            <a href="#faq" className="transition hover:text-[#0a1128]">FAQ</a>
            <a href="#kontak" className="transition hover:text-[#0a1128]">Kontak</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-[#0a1128] hover:text-[#0a1128]">
              Login
            </Link>
            <Link to="/register" className="rounded-lg bg-[#0a1128] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#182a72] shadow-lg shadow-[#0a1128]/10">
              Daftar
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-20 md:pt-24">
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
          <div className="space-y-8">
            <div className="flex items-center gap-3 text-slate-500">
              <span className="h-px w-8 bg-[#0a1128]" />
              <span className="text-sm">Bengkel spesialis mobil sport</span>
            </div>

            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-[#0a1128] md:text-7xl">
              Perawatan terbaik <br />
              untuk kendaraan <br />
              <span className="text-slate-300">performa tinggi.</span>
            </h1>

            <p className="max-w-md text-base text-slate-500 leading-relaxed">
              Platform bengkel modern dengan teknisi profesional dan teknologi terkini.
              Kami memastikan performa kendaraan Anda selalu dalam kondisi prima.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <a href="#layanan" className="rounded-lg bg-[#0a1128] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0a1128]/20 transition hover:bg-[#182a72]">
                Lihat Layanan
              </a>
              <Link to="/register" className="rounded-lg border-2 border-slate-200 px-8 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-[#0a1128] hover:bg-slate-50">
                Daftar Sekarang
              </Link>
            </div>
          </div>

          <CarBlueprint />
        </div>
      </section>

      <TreadDivider />

      {/* TENTANG */}
      <section id="tentang" className="relative overflow-hidden border-b border-slate-100 bg-slate-50/50 py-24">
        <Wrench className="pointer-events-none absolute -left-10 -top-10 text-[#0a1128]/5" size={280} strokeWidth={1} />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
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
            <div className="flex justify-center">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0a1128] text-white p-6 rounded-2xl shadow-xl">
                  <Award className="mb-2" size={28} />
                  <p className="font-mono text-2xl font-bold">20+</p>
                  <p className="text-xs text-white/60">Tahun pengalaman</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl">
                  <Zap className="mb-2 text-[#0a1128]" size={28} />
                  <p className="font-mono text-2xl font-bold text-[#0a1128]">1K+</p>
                  <p className="text-xs text-slate-400">Pelanggan puas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIK — dashboard cluster */}
      <section className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 md:grid-cols-4 md:divide-y-0">
            <Stat number="2.4K+" label="Layanan selesai" />
            <Stat number="98%" label="Kepuasan pelanggan" />
            <Stat number="15+" label="Teknisi ahli" />
            <Stat number="24/7" label="Dukungan" />
          </div>
        </div>
      </section>

      {/* LAYANAN — icon mur/baut */}
      <section id="layanan" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 max-w-lg">
          <h2 className="text-4xl font-extrabold text-[#0a1128] md:text-5xl">Solusi perawatan lengkap</h2>
          <p className="mt-4 text-slate-500 text-base">
            Kami menyediakan layanan terbaik untuk memastikan kendaraan Anda selalu dalam performa puncak.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, idx) => (
            <div key={idx} className="group rounded-2xl border border-slate-100 p-8 transition hover:border-[#0a1128]/15 hover:bg-slate-50">
              <div
                className="mb-5 flex h-14 w-14 items-center justify-center bg-[#0a1128] text-white"
                style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }}
              >
                <service.icon size={22} />
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
      <section id="testimoni" className="bg-slate-50/50 border-b border-slate-100 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-14 text-4xl font-extrabold text-[#0a1128] md:text-5xl">Apa kata pelanggan kami?</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((review, idx) => (
              <div key={idx} className="border-t-2 border-[#0a1128] bg-white p-8">
                <div className="mb-4 flex gap-1 text-[#0a1128]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-slate-600 mb-6">&ldquo;{review.text}&rdquo;</p>
                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-sm font-bold text-[#0a1128]">{review.name}</span>
                  <span className="text-xs text-slate-400">{review.car}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="mb-14 text-4xl font-extrabold text-[#0a1128] md:text-5xl">Pertanyaan umum</h2>
        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, idx) => (
            <details key={idx} className="group rounded-xl border border-slate-100 bg-white p-6 cursor-pointer">
              <summary className="flex list-none items-center justify-between font-bold text-slate-800">
                {faq.q}
                <span className="text-[#0a1128] transition group-open:rotate-180">▾</span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* PROMO BANNER — aksen checkered flag */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-2xl bg-[#0a1128] p-12 md:flex-row md:p-16">
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rotate-12"
            style={{
              backgroundImage: 'repeating-conic-gradient(#ffffff 0% 25%, transparent 0% 50%)',
              backgroundSize: '16px 16px',
              opacity: 0.15,
            }}
          />

          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Siap merawat kendaraan Anda?
            </h2>
            <p className="mt-3 text-white/60 text-base">
              Daftar sekarang dan dapatkan layanan eksklusif dengan teknisi terbaik kami.
            </p>
          </div>
          <Link to="/register" className="relative z-10 whitespace-nowrap rounded-full bg-white px-10 py-4 text-sm font-bold text-[#0a1128] transition hover:bg-slate-50">
            Daftar & Booking
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="kontak" className="bg-[#0a1128] pt-20 pb-8 text-white">
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

function Stat({ number, label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-8">
      <span className="font-mono text-3xl font-black text-[#0a1128]">{number}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  )
}