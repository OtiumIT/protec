import { config } from 'dotenv';
import { resolve } from 'path';
import { getClient } from '../db/client';
import { dropTenantSchema } from '../db/schema-manager';

// Carregar .env da raiz do projeto
config({ path: resolve(process.cwd(), '../../.env') });

/**
 * Script para limpar empresas e schemas de tenant (exceto Sistema)
 */
async function cleanupTenants() {
  console.log('🧹 Limpando empresas e schemas de tenant...\n');

  try {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // 1. Listar todas as empresas (exceto Sistema)
      const companiesResult = await client.query(
        `SELECT id, name FROM companies WHERE name != 'Sistema' ORDER BY created_at`
      );

      if (companiesResult.rows.length === 0) {
        console.log('✅ Nenhuma empresa para remover (exceto Sistema)');
        await client.query('COMMIT');
        return;
      }

      console.log(`📋 Encontradas ${companiesResult.rows.length} empresa(s) para remover:\n`);

      // 2. Para cada empresa, remover schema e depois a empresa
      for (const company of companiesResult.rows) {
        console.log(`🗑️  Removendo empresa: ${company.name} (ID: ${company.id})`);
        
        try {
          // Remover schema do tenant
          try {
            await dropTenantSchema(company.id);
            console.log(`   ✅ Schema removido`);
          } catch (error: any) {
            // Schema pode não existir, continuar
            if (error.message.includes('does not exist')) {
              console.log(`   ⚠️  Schema não existe (já removido)`);
            } else {
              console.log(`   ⚠️  Erro ao remover schema: ${error.message}`);
            }
          }

          // Remover assinaturas
          const subResult = await client.query('DELETE FROM subscriptions WHERE company_id = $1', [company.id]);
          console.log(`   ✅ Assinaturas removidas (${subResult.rowCount || 0})`);

          // Remover refresh tokens dos usuários da empresa
          const tokenResult = await client.query(
            `DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE company_id = $1)`,
            [company.id]
          );
          console.log(`   ✅ Refresh tokens removidos (${tokenResult.rowCount || 0})`);

          // Remover usuários da empresa
          const userResult = await client.query('DELETE FROM users WHERE company_id = $1', [company.id]);
          console.log(`   ✅ Usuários removidos (${userResult.rowCount || 0})`);

          // Remover empresa
          await client.query('DELETE FROM companies WHERE id = $1', [company.id]);
          console.log(`   ✅ Empresa removida\n`);
        } catch (error: any) {
          console.log(`   ❌ Erro ao remover empresa: ${error.message}`);
          throw error;
        }
      }

      await client.query('COMMIT');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Limpeza concluída com sucesso!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('💡 Agora você pode criar uma nova empresa via tela e ver a criação automática do schema.\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Erro ao limpar tenants:', error.message);
    process.exit(1);
  }
}

// Executar
cleanupTenants()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
