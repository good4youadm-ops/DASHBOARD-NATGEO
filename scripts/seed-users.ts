import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tenantId = process.env.SYNC_DEFAULT_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

if (!url || !svcKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios no .env');
  process.exit(1);
}

const admin = createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } });

const USERS = [
  { email: 'ferrerjoao2206@gmail.com', password: 'Falcao127@', name: 'João Ferrer',  role: 'owner' },
  { email: 'master@natgeo.local',       password: 'Master@2025!',  name: 'Master NatGeo',     role: 'owner' },
  { email: 'admin@natgeo.local',        password: 'Admin@2025!',   name: 'Administrador',      role: 'admin' },
  { email: 'colaborador@natgeo.local',  password: 'Colab@2025!',   name: 'Colaborador',        role: 'viewer' },
];

async function run() {
  for (const u of USERS) {
    process.stdout.write(`Criando ${u.email} (${u.role})… `);

    // Cria ou recupera o usuário no Supabase Auth
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users.find(x => x.email === u.email);

    let userId: string;

    if (found) {
      // Atualiza a senha caso o usuário já exista
      const { error } = await admin.auth.admin.updateUserById(found.id, { password: u.password });
      if (error) { console.error('ERRO (update):', error.message); continue; }
      userId = found.id;
      process.stdout.write('(já existia — senha atualizada) ');
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error || !data?.user) { console.error('ERRO (create):', error?.message); continue; }
      userId = data.user.id;
    }

    // Upsert no user_profiles
    const { error: profErr } = await admin
      .from('user_profiles')
      .upsert({
        id: userId,
        tenant_id: tenantId,
        full_name: u.name,
        role: u.role,
        is_active: true,
      }, { onConflict: 'id' });

    if (profErr) { console.error('ERRO (profile):', profErr.message); continue; }

    console.log('OK');
  }

  console.log('\nUsuários criados:');
  console.log('  ferrerjoao2206@gmail.com   senha: Falcao127@     role: owner (MASTER)');
  console.log('  master@natgeo.local        senha: Master@2025!   role: owner');
  console.log('  admin@natgeo.local         senha: Admin@2025!    role: admin (ADMINISTRADOR)');
  console.log('  colaborador@natgeo.local   senha: Colab@2025!    role: viewer (COLABORADOR)');
}

run().catch(err => { console.error(err); process.exit(1); });
