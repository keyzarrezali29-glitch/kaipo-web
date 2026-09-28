import { useState } from 'react'

const AVATAR_COLORS = ['bg-indigo-900', 'bg-violet-600', 'bg-sky-700', 'bg-emerald-700', 'bg-rose-700']

function avatarColor(seed) {
  const i = (seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}

function inisial(nama) {
  if (!nama) return '?'
  return nama.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// Pakai: <Avatar nama="Budi" url={profil.avatar_url} className="h-9 w-9 text-xs" />
export default function Avatar({ nama, url, className = 'h-9 w-9 text-xs' }) {
  const [gagalUrl, setGagalUrl] = useState(null)

  if (url && url !== gagalUrl) {
    return (
      <img
        src={url}
        alt={nama || 'Foto profil'}
        onError={() => setGagalUrl(url)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${avatarColor(nama)} ${className}`}
    >
      {inisial(nama)}
    </span>
  )
}