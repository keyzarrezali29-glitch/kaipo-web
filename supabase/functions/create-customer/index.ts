// supabase/functions/create-customer/index.ts
//
// Dipanggil dari halaman Admin > Data Customer pas klik "Tambah Customer".
// Butuh service role key buat bikin akun Auth baru, makanya harus lewat
// Edge Function (gak boleh dari frontend langsung).
//
// Alurnya:
//  1. Pastikan yang manggil ini beneran admin yang login
//  2. Bikin akun Auth baru (email + password sementara), auto-confirmed
//  3. Trigger `handle_new_user` otomatis bikin baris di `profiles` (role default)
//  4. Update baris profiles itu: full_name, phone, role = 'customer'

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { email, password, full_name, phone } = await req.json()

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'Email, password, dan nama lengkap wajib diisi' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password minimal 6 karakter' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // --- Pastikan yang manggil ini admin ---
    const authHeader = req.headers.get('Authorization')
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader ?? '' } } }
    )
    const { data: { user: caller }, error: callerError } = await supabaseAuth.auth.getUser()
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Belum login' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()
    if (callerProfileError || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Hanya admin yang boleh menambah customer' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // --- Bikin akun Auth baru ---
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createUserError || !newUser?.user) {
      console.error('Gagal membuat auth user:', createUserError)
      return new Response(JSON.stringify({ error: createUserError?.message ?? 'Gagal membuat akun' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const newUserId = newUser.user.id

    // --- Update profile (trigger handle_new_user sudah bikin baris dasarnya) ---
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, phone: phone || null, role: 'customer' })
      .eq('id', newUserId)
    if (profileError) {
      console.error('Gagal update profile customer:', profileError)
      // Rollback: hapus auth user biar gak nyangkut akun setengah jadi
      await supabaseAdmin.auth.admin.deleteUser(newUserId)
      throw profileError
    }

    return new Response(JSON.stringify({ message: 'Customer berhasil ditambahkan', profile_id: newUserId }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-customer error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})