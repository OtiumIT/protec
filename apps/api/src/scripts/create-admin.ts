import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../db/client';
import { hashPassword } from '../shared/utils/password';

// Carregar .env da raiz do projeto
config({ path: resolve(process.cwd(), '../../.env') });

/**
 * Script para criar o primeiro usuário admin e empresa
 */
async function createAdmin() {
  console.log('👤 Criando primeiro usuário admin...\n');

  // Dados do admin
  const adminEmail = process.argv[2] || 'jose.neto.fc@gmail.com';
  const adminName = process.argv[3] || 'Admin Geral';
  const adminPassword = process.argv[4] || generateTempPassword();

  if (!process.argv[4]) {
    console.log(`⚠️  Senha não fornecida. Gerando senha temporária: ${adminPassword}`);
    console.log('   Você pode alterar depois no sistema.\n');
  }

  try {
    // 1. Verificar se usuário super_admin já existe
    const existingUser = await query(
      `SELECT id, email FROM public.users WHERE lower(trim(email)) = lower(trim($1)) AND tenant_id IS NULL LIMIT 1`,
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      console.log(`⚠️  Super admin ${adminEmail} já existe!`);
      console.log(`   User ID: ${existingUser.rows[0].id}\n`);
      return;
    }

    // 2. Hash da senha
    console.log('🔐 Gerando hash da senha...');
    const passwordHash = await hashPassword(adminPassword);

    // 3. Criar usuário super_admin (sem tenant_id)
    console.log('👤 Criando super admin (sem empresa)...');
    const userResult = await query(
      `INSERT INTO public.users (email, name, password_hash, tenant_id, role, status) 
       VALUES ($1, $2, $3, NULL, $4, 'active') 
       RETURNING id, email, name, role, tenant_id, created_at`,
      [adminEmail, adminName, passwordHash, 'super_admin']
    );

    if (userResult.rows.length === 0) {
      throw new Error('Erro ao criar usuário');
    }

    const user = userResult.rows[0];
    console.log(`✅ Super admin criado: ${user.email} (ID: ${user.id})\n`);

    // Resumo
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SUPER ADMIN CRIADO COM SUCESSO!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Senha:', adminPassword);
    console.log('👤 Nome:', adminName);
    console.log('👑 Role: super_admin');
    console.log('🆔 User ID:', user.id);
    console.log('🏢 Empresa: Nenhuma (admin global)');
    console.log('\n⚠️  IMPORTANTE: Anote a senha! Você precisará dela para fazer login.');
    console.log('💡 Este é um super admin global que pode criar e gerenciar todas as empresas.');
    console.log('💡 Após fazer login, você pode criar empresas via tela.');
    console.log('💡 Quando criar uma empresa, o schema será criado automaticamente.\n');

  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      if (error.constraint?.includes('email')) {
        console.error('❌ Erro: Este email já está cadastrado!');
        console.error('   Use outro email ou delete o usuário existente.\n');
      } else if (error.constraint?.includes('companies_name')) {
        console.error('❌ Erro: Já existe uma empresa com este nome!');
        console.error('   Delete a empresa existente ou use outro nome.\n');
      }
    } else {
      console.error('❌ Erro ao criar admin:', error.message);
      console.error(error);
    }
    process.exit(1);
  }
}

/**
 * Gerar senha temporária
 */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Executar
createAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
