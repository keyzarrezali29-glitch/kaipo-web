import { Link } from 'react-router-dom'
import { 
  ShieldCheck, Wrench, Package, BadgeCheck, 
  ArrowRight, Phone, Mail, MapPin, Settings, 
  Users, Clock, Star, CheckCircle, Zap, Award
} from 'lucide-react'
import logoKaipo from '../assets/logo-kai-po.png'

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

      {/* HERO SECTION */}
      <section className="mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28">
        <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-2">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-[#0a1128] border border-slate-200">
              <span className="h-2 w-2 rounded-full bg-[#0a1128]" /> Bengkel Terpercaya
            </span>
            
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-[#0a1128] md:text-7xl">
              Perawatan <br />
              Terbaik Untuk <br />
              <span className="text-slate-400">Kendaraan Anda</span>
            </h1>
            
            <p className="max-w-md text-base text-slate-500 leading-relaxed">
              Platform bengkel modern dengan teknisi profesional dan teknologi terkini. 
              Kami memastikan performa kendaraan Anda selalu dalam kondisi prima.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-4">
              <a href="#layanan" className="rounded-lg bg-[#0a1128] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0a1128]/20 transition hover:scale-105 hover:bg-[#182a72]">
                Lihat Layanan
              </a>
              <Link to="/register" className="rounded-lg border-2 border-slate-200 px-8 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-[#0a1128] hover:bg-slate-50">
                Daftar Sekarang
              </Link>
            </div>
          </div>

          {/* Area Visual Kanan */}
          <div className="relative h-[450px] w-full rounded-3xl overflow-hidden shadow-2xl md:h-[550px] bg-gradient-to-br from-[#0a1128] via-[#16224d] to-[#2a3f80]">
            <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4yIj48cGF0aCBkPSJNMzYgMzR2LTRoLTR2NGg0em0wIDB2LTRoLTR2NGg0eiIvPjwvZz48L2c+PC9zdmc+')]" />
            <div className="absolute top-20 right-10 w-64 h-64 rounded-full border border-white/10" />
            <div className="absolute bottom-10 left-10 w-40 h-40 rounded-full border border-white/10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Settings className="text-white/5" size={250} strokeWidth={1} />
            </div>
            <div className="absolute bottom-10 right-10 flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-5 py-2.5 text-white">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium">Siap Melayani 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* BAGIAN BARU 1: TENTANG KAMI (About Us) */}
      <section id="tentang" className="border-y border-slate-100 bg-slate-50/50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
            <div>
              <span className="mb-4 inline-block text-xs font-bold uppercase tracking-widest text-[#0a1128] bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                Tentang KAI-PO
              </span>
              <h2 className="text-4xl font-extrabold text-[#0a1128] mb-6">
                Lebih dari Sekadar <br /> Bengkel Biasa
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
                  <Award className="mb-2" size={32} />
                  <p className="text-2xl font-black">20+</p>
                  <p className="text-xs text-white/60">Tahun Pengalaman</p>
                </div>
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-lg">
                  <Zap className="mb-2 text-[#0a1128]" size={32} />
                  <p className="text-2xl font-black text-[#0a1128]">1K+</p>
                  <p className="text-xs text-slate-400">Pelanggan Puas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATISTIK */}
      <section className="border-y border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-2 gap-12 md:grid-cols-4 text-center">
            <Stat number="2.4K+" label="Layanan Selesai" icon={<Wrench className="text-[#0a1128]" size={24} />} />
            <Stat number="98%" label="Kepuasan Pelanggan" icon={<Star className="text-[#0a1128]" size={24} />} />
            <Stat number="15+" label="Teknisi Ahli" icon={<Users className="text-[#0a1128]" size={24} />} />
            <Stat number="24/7" label="Dukungan" icon={<Clock className="text-[#0a1128]" size={24} />} />
          </div>
        </div>
      </section>

      {/* LAYANAN */}
      <section id="layanan" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto mb-16 max-w-lg text-center">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#0a1128] bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
            Layanan Kami
          </span>
          <h2 className="text-4xl font-extrabold text-[#0a1128] md:text-5xl">Solusi Perawatan Lengkap</h2>
          <p className="mt-4 text-slate-500 text-base">
            Kami menyediakan layanan terbaik untuk memastikan kendaraan Anda selalu dalam performa puncak.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Servis Berkala', desc: 'Pengecekan & perawatan rutin menyeluruh.', icon: Wrench },
            { title: 'Perbaikan Mesin', desc: 'Diagnosa dan perbaikan mesin presisi tinggi.', icon: Wrench },
            { title: 'Tune Up', desc: 'Optimalkan tenaga & efisiensi bahan bakar.', icon: Wrench },
            { title: 'Rem & Kaki-Kaki', desc: 'Cek kampas, suspensi & spooring balancing.', icon: Wrench },
          ].map((service, idx) => (
            <div key={idx} className="group relative rounded-2xl border border-slate-100 bg-white p-8 shadow-md transition-all hover:-translate-y-2 hover:shadow-xl hover:border-[#0a1128]/10 hover:bg-slate-50">
              <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-[#0a1128]/5 transition group-hover:bg-[#0a1128]/10" />
              <div className="mb-5 relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a1128] text-white shadow-lg shadow-[#0a1128]/20 transition group-hover:bg-white group-hover:text-[#0a1128] group-hover:shadow-[#0a1128]/10">
                <service.icon size={24} />
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

      {/* BAGIAN BARU 2: TESTIMONI (Apa Kata Pelanggan) */}
      <section id="testimoni" className="bg-slate-50/50 border-y border-slate-100 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#0a1128] bg-white px-4 py-1.5 rounded-full border border-slate-200">
              Testimoni
            </span>
            <h2 className="text-4xl font-extrabold text-[#0a1128] md:text-5xl">Apa Kata Pelanggan Kami?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Budi Santoso", text: "Servis sangat cepat dan teknisi ramah. Mobil saya jadi terasa seperti baru lagi!", car: "Toyota Avanza" },
              { name: "Siti Aminah", text: "Harga yang ditawarkan sangat masuk akal dengan kualitas perbaikan yang bener-bener profesional. Recommended!", car: "Honda Brio" },
              { name: "Andi Wijaya", text: "Pertama kali bawa mobil kesini, langsung puas. Suku cadang original dan pengerjaannya rapi.", car: "Daihatsu Xenia" },
            ].map((review, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition">
                <div className="flex gap-1 mb-4 text-[#0a1128]">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <p className="text-slate-600 italic mb-6">"{review.text}"</p>
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                  <span className="font-bold text-[#0a1128] text-sm">{review.name}</span>
                  <span className="text-xs text-slate-400">{review.car}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BAGIAN BARU 3: FAQ (Pertanyaan Umum) */}
      <section id="faq" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center mb-16">
          <span className="mb-3 inline-block text-xs font-bold uppercase tracking-widest text-[#0a1128] bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
            FAQ
          </span>
          <h2 className="text-4xl font-extrabold text-[#0a1128] md:text-5xl">Pertanyaan Umum</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { q: "Apakah garansi berlaku untuk semua jenis kendaraan?", a: "Garansi berlaku untuk semua jenis mobil dan motor dengan ketentuan standar layanan kami." },
            { q: "Berapa lama waktu yang dibutuhkan untuk servis berkala?", a: "Rata-rata servis berkala memakan waktu 1-2 jam tergantung pada kondisi kendaraan Anda." },
            { q: "Apakah ada biaya konsultasi sebelum servis?", a: "Tidak, kami memberikan layanan konsultasi gratis terkait kondisi kendaraan Anda." },
            { q: "Bagaimana cara booking janji servis?", a: "Anda bisa langsung mendaftar di website kami, lalu melakukan booking melalui aplikasi mobile KAI-PO." },
          ].map((faq, idx) => (
            <details key={idx} className="group rounded-xl bg-white border border-slate-100 p-6 cursor-pointer hover:shadow-md transition">
              <summary className="flex justify-between items-center font-bold text-slate-800 list-none">
                {faq.q}
                <span className="text-[#0a1128] transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-4 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* PROMO BANNER */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="relative flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl bg-[#0a1128] p-12 shadow-2xl md:flex-row md:p-16">
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full border-[40px] border-white/5" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full border-[40px] border-white/5" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1128] to-[#16224d]" />

          <div className="relative z-10 max-w-xl">
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Siap Merawat Kendaraan Anda?
            </h2>
            <p className="mt-3 text-white/60 text-base">
              Daftar sekarang dan dapatkan layanan eksklusif dengan teknisi terbaik kami.
            </p>
          </div>
          <Link to="/register" className="relative z-10 whitespace-nowrap rounded-full bg-white px-10 py-4 text-sm font-bold text-[#0a1128] shadow-lg transition hover:scale-105 hover:bg-slate-50">
            Daftar & Booking
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="kontak" className="bg-[#0a1128] pt-20 pb-8 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4 mb-16">
            <div className="col-span-1 md:col-span-1 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <img src={logoKaipo} alt="Kai-Po" className="h-10 w-10 object-contain brightness-0 invert" />
                <span className="text-2xl font-black tracking-widest">KAI-PO</span>
              </div>
              <p className="text-sm text-white/40 max-w-xs leading-relaxed">
                Solusi perawatan kendaraan modern dengan teknologi terkini dan tenaga ahli profesional.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest">Layanan</h4>
              <ul className="space-y-3 text-sm text-white/40">
                <li><a href="#" className="hover:text-white transition">Servis Berkala</a></li>
                <li><a href="#" className="hover:text-white transition">Perbaikan Mesin</a></li>
                <li><a href="#" className="hover:text-white transition">Tune Up</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest">Perusahaan</h4>
              <ul className="space-y-3 text-sm text-white/40">
                <li><a href="#" className="hover:text-white transition">Tentang Kami</a></li>
                <li><a href="#" className="hover:text-white transition">Karir</a></li>
                <li><a href="#" className="hover:text-white transition">Kebijakan Privasi</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-5 text-sm uppercase tracking-widest">Kontak</h4>
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
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30">
            <span>© 2026 KAI-PO Garage. All rights reserved.</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition">Instagram</a>
              <a href="#" className="hover:text-white transition">Facebook</a>
              <a href="#" className="hover:text-white transition">YouTube</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Komponen Statistik
function Stat({ number, label, icon }) {
  return (
    <div className="flex flex-col items-center justify-center group">
      <div className="flex items-center justify-center mb-3 transition group-hover:scale-110">
        {icon}
      </div>
      <span className="text-3xl font-black text-[#0a1128]">{number}</span>
      <span className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-widest">{label}</span>
    </div>
  )
}