import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../db/client';
import { hashPassword } from '../shared/utils/password';

// Carregar .env da raiz do projeto
config({ path: resolve(process.cwd(), '../../.env') });

/**
 * Script para resetar senha de um usuário
 */
async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.log('❌ Uso: pnpm run reset-password <email> <nova-senha>');
    console.log('Exemplo: pnpm run reset-password jose.neto.fc@gmail.com MinhaNovaSenha123');
    process.exit(1);
  }

  console.log(`🔐 Resetando senha para: ${email}\n`);

  try {
    // Buscar usuário
    const userResult = await query(
      `SELECT id, email, name, role, company_id FROM users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ Usuário ${email} não encontrado!`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✅ Usuário encontrado: ${user.name} (${user.role})`);

    // Hash da nova senha
    console.log('🔐 Gerando hash da nova senha...');
    const passwordHash = await hashPassword(newPassword);

    // Atualizar senha
    if (user.company_id) {
      await query(
        `UPDATE users SET password_hash = $1 WHERE id = $2 AND company_id = $3`,
        [passwordHash, user.id, user.company_id]
      );
    } else {
      // Super admin sem company_id
      await query(
        `UPDATE users SET password_hash = $1 WHERE id = $2 AND company_id IS NULL`,
        [passwordHash, user.id]
      );
    }

    console.log(`✅ Senha atualizada com sucesso!\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('🔑 Nova Senha:', newPassword);
    console.log('👤 Nome:', user.name);
    console.log('👑 Role:', user.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANTE: Anote a nova senha! Você precisará dela para fazer login.\n');

  } catch (error: any) {
    console.error('❌ Erro ao resetar senha:', error.message);
    process.exit(1);
  }
}

// Executar
resetPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
