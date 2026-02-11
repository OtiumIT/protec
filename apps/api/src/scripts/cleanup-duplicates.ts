import { getClient } from '../db/client.js';
import { dropTenantSchema } from '../db/schema-manager.js';

async function cleanupDuplicates() {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Encontrar empresas duplicadas (mesmo nome, sem CNPJ)
    const duplicates = await client.query(`
      SELECT id, name, cnpj, created_at,
             ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at) as rn
      FROM companies
      WHERE name = 'Protec' AND (cnpj IS NULL OR cnpj = '')
      ORDER BY created_at
    `);
    
    console.log(`Encontradas ${duplicates.rows.length} empresas duplicadas`);
    
    // Manter a primeira, deletar as outras
    for (const row of duplicates.rows) {
      if (row.rn > 1) {
        const companyId = row.id;
        const schemaName = `tenant_${companyId.replace(/-/g, '_')}`;
        
        console.log(`🗑️  Removendo empresa duplicada: ${companyId} (${row.name})`);
        console.log(`🗑️  Removendo schema: ${schemaName}`);
        
        // Remover schema do tenant
        try {
          await dropTenantSchema(companyId);
        } catch (error) {
          console.error(`⚠️  Erro ao remover schema ${schemaName}:`, error);
        }
        
        // Remover empresa
        await client.query('DELETE FROM companies WHERE id = $1', [companyId]);
        console.log(`✅ Empresa ${companyId} removida`);
      } else {
        console.log(`✅ Mantendo empresa: ${row.id} (primeira criada)`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Limpeza concluída');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na limpeza:', error);
    throw error;
  } finally {
    client.release();
  }
}

cleanupDuplicates()
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
