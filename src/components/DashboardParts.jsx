import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

export const HATCH = 'repeating-linear-gradient(135deg, #cbd5e1 0px, #cbd5e1 2px, #f1f5f9 2px, #f1f5f9 8px)'
const ARC = 'M 20 100 A 80 80 0 0 1 180 100'

export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getWeekDays() {
  const now = new Date()
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
  const labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  return labels.map((label, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    return { key: toISO(d), label, isCurrent: toISO(d) === toISO(now) }
  })
}

export function getLastMonths(n = 6) {
  const now = new Date()
  const list = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    list.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('id-ID', { month: 'short' }),
      isCurrent: i === 0,
    })
  }
  return list
}

export function monthKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}`
}

// ------------------------------------------------------------
// Grafik batang berbentuk pil. data: [{ key, label, jumlah, isCurrent }]
// ------------------------------------------------------------
export function PillChart({ data }) {
  const max = Math.max(...data.map((d) => d.jumlah), 1)

  return (
    <div className="flex h-52 items-end justify-between gap-2 sm:gap-4">
      {data.map((d) => {
        const ada = d.jumlah > 0
        const tinggi = ada ? 56 + (d.jumlah / max) * 88 : 56
        const tertinggi = ada && d.jumlah === max
        const gaya = ada
          ? { height: tinggi, backgroundColor: tertinggi ? '#12123a' : '#818cf8' }
          : { height: tinggi, backgroundImage: HATCH }

        return (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative w-full max-w-[56px] rounded-full" style={gaya}>
              {ada && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                  {d.jumlah}
                </span>
              )}
            </div>
            <span className={`text-xs ${d.isCurrent ? 'font-bold text-[#12123a]' : 'text-slate-400'}`}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------
// Gauge setengah lingkaran + legenda
// ------------------------------------------------------------
export function Gauge({ selesai, diproses, pending, caption = 'Selesai', pendingLabel = 'Menunggu' }) {
  const total = selesai + diproses + pending
  const L = Math.PI * 80
  const persen = total > 0 ? Math.round((selesai / total) * 100) : 0
  const segments = [
    { v: selesai, stroke: '#12123a' },
    { v: diproses, stroke: '#4f46e5' },
    { v: pending, stroke: 'url(#hatch-gauge)' },
  ]
  let offset = 0

  return (
    <div>
      <div className="relative mx-auto w-full max-w-[300px]">
        <svg viewBox="0 0 200 110" className="w-full">
          <defs>
            <pattern id="hatch-gauge" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#f1f5f9" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#94a3b8" strokeWidth="2.5" />
            </pattern>
          </defs>
          <path d={ARC} fill="none" stroke="#f1f5f9" strokeWidth="26" />
          {total > 0 &&
            segments
              .filter((s) => s.v > 0)
              .map((s, i) => {
                const len = (s.v / total) * L
                const el = (
                  <path
                    key={i}
                    d={ARC}
                    fill="none"
                    stroke={s.stroke}
                    strokeWidth="26"
                    strokeDasharray={`${len} ${L}`}
                    strokeDashoffset={-offset}
                  />
                )
                offset += len
                return el
              })}
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <p className="text-4xl font-bold tracking-tight text-slate-900">{persen}%</p>
          <p className="text-xs text-slate-400">{caption}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#12123a]" /> Selesai
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#4f46e5]" /> Diproses
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundImage: HATCH }} /> {pendingLabel}
        </span>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Kartu statistik dengan tombol panah bulat
// ------------------------------------------------------------
export function StatCard({ title, value, note, badge, href, highlight = false }) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 ${
        highlight ? 'bg-gradient-to-br from-[#12123a] via-[#181850] to-[#2b2b7a] text-white' : 'bg-white text-slate-900'
      }`}
    >
      {highlight && <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full border-[18px] border-white/5" />}
      <div className="relative flex items-start justify-between">
        <p className={`text-[15px] font-medium ${highlight ? 'text-white' : 'text-slate-800'}`}>{title}</p>
        <Link
          to={href}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            highlight ? 'bg-white text-[#12123a] hover:bg-slate-100' : 'text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
          }`}
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
      <p className="relative mt-5 text-4xl font-bold tracking-tight">{value}</p>
      <div className={`relative mt-3 flex items-center gap-2 text-xs ${highlight ? 'text-white/60' : 'text-slate-400'}`}>
        {badge && (
          <span
            className={`rounded-md px-1.5 py-0.5 font-semibold ring-1 ring-inset ${
              highlight ? 'text-white ring-white/30' : 'text-emerald-700 ring-emerald-200'
            }`}
          >
            {badge}
          </span>
        )}
        <span>{note}</span>
      </div>
    </div>
  )
}