import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarPlus, ClipboardList, CheckCircle2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

function formatWaktu(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const diffMenit = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMenit < 1) return 'Baru saja'
  if (diffMenit < 60) return `${diffMenit} menit lalu`
  const diffJam = Math.floor(diffMenit / 60)
  if (diffJam < 24) return `${diffJam} jam lalu`
  const diffHari = Math.floor(diffJam / 24)
  if (diffHari < 7) return `${diffHari} hari lalu`
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function IconNotif({ tipe, size = 16 }) {
  if (tipe === 'booking_baru') return <CalendarPlus size={size} />
  if (tipe === 'tugas_baru') return <ClipboardList size={size} />
  if (tipe === 'status_booking') return <CheckCircle2 size={size} />
  return <Bell size={size} />
}

export default function NotifikasiBell() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const wrapRef = useRef(null)

  const load = useCallback(async (uid) => {
    const { data, error } = await supabase
      .from('notifikasi')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setItems(data ?? [])
  }, [])

  // Muat notif awal + dengarkan notif baru secara realtime
  useEffect(() => {
    let channel = null
    let timer = null
    let batal = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || batal) return

      await load(user.id)
      if (batal) return

      channel = supabase
        .channel(`notifikasi-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifikasi', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setItems((prev) => [payload.new, ...prev].slice(0, 20))
            setToast(payload.new)
            clearTimeout(timer)
            timer = setTimeout(() => setToast(null), 5000)
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifikasi', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setItems((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)))
          }
        )
        .subscribe()
    }

    init()

    return () => {
      batal = true
      clearTimeout(timer)
      if (channel) supabase.removeChannel(channel)
    }
  }, [load])

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    function handleClickLuar(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickLuar)
    return () => document.removeEventListener('mousedown', handleClickLuar)
  }, [])

  const belumDibaca = items.filter((n) => !n.is_read).length

  async function tandaiDibaca(notif) {
    if (notif.is_read) return
    setItems((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)))
    await supabase.from('notifikasi').update({ is_read: true }).eq('id', notif.id)
  }

  async function tandaiSemua() {
    const idBelumDibaca = items.filter((n) => !n.is_read).map((n) => n.id)
    if (idBelumDibaca.length === 0) return
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    await supabase.from('notifikasi').update({ is_read: true }).in('id', idBelumDibaca)
  }

  async function bukaNotif(notif) {
    await tandaiDibaca(notif)
    setOpen(false)
    setToast(null)
    if (notif.link) navigate(notif.link)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 transition hover:text-[#12123a]"
        title="Notifikasi"
      >
        <Bell size={18} />
        {belumDibaca > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-100">
            {belumDibaca > 9 ? '9+' : belumDibaca}
          </span>
        )}
      </button>

      {/* Dropdown daftar notifikasi */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-[15px] font-semibold text-slate-900">Notifikasi</h3>
            {belumDibaca > 0 && (
              <button onClick={tandaiSemua} className="text-xs font-semibold text-[#12123a] hover:underline">
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto border-t border-slate-100">
            {items.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Bell size={20} />
                </span>
                <p className="text-sm text-slate-400">Belum ada notifikasi.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => bukaNotif(n)}
                      className={`flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50 ${
                        n.is_read ? '' : 'bg-indigo-50/40'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          n.is_read ? 'bg-slate-100 text-slate-500' : 'bg-[#12123a] text-white'
                        }`}
                      >
                        <IconNotif tipe={n.tipe} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${n.is_read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                            {n.judul}
                          </p>
                          {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                        </div>
                        {n.pesan && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.pesan}</p>}
                        <p className="mt-1 text-[11px] text-slate-400">{formatWaktu(n.created_at)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Popup kecil pas ada notif baru masuk */}
      {toast && !open && (
        <div className="fixed right-6 top-6 z-[70] w-80 max-w-[calc(100vw-3rem)]">
          <button
            onClick={() => bukaNotif(toast)}
            className="flex w-full items-start gap-3 rounded-3xl bg-[#12123a] p-4 text-left text-white shadow-2xl"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
              <IconNotif tipe={toast.tipe} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.judul}</p>
              {toast.pesan && <p className="mt-0.5 text-xs leading-relaxed text-white/70">{toast.pesan}</p>}
            </div>
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                setToast(null)
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X size={14} />
            </span>
          </button>
        </div>
      )}
    </div>
  )
}