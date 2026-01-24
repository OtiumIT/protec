import { query } from '../db/client';

/**
 * Seed de dados iniciais
 * Cria planos e módulos padrão
 */
async function seed() {
  console.log('🌱 Iniciando seed...');

  try {
    // Criar planos
    const plans = [
      { name: 'Free', maxUsers: 1, price: 0, billingCycle: 'monthly' },
      { name: 'Pro', maxUsers: 10, price: 29.99, billingCycle: 'monthly' },
      { name: 'Enterprise', maxUsers: 100, price: 99.99, billingCycle: 'monthly' },
    ];

    for (const plan of plans) {
      const result = await query(
        `INSERT INTO plans (name, max_users, price, billing_cycle) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT DO NOTHING
         RETURNING id, name`,
        [plan.name, plan.maxUsers, plan.price, plan.billingCycle]
      );
      if (result.rows.length > 0) {
        console.log(`✅ Plano criado: ${result.rows[0].name}`);
      }
    }

    // Criar módulos padrão
    const modules = [
      { name: 'Billing', key: 'BILLING', description: 'Sistema de cobrança e assinaturas' },
      { name: 'Reports', key: 'REPORTS', description: 'Relatórios e análises' },
      { name: 'Analytics', key: 'ANALYTICS', description: 'Analytics avançado' },
    ];

    for (const module of modules) {
      const result = await query(
        `INSERT INTO modules (name, key, description) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (key) DO NOTHING
         RETURNING id, name`,
        [module.name, module.key, module.description]
      );
      if (result.rows.length > 0) {
        console.log(`✅ Módulo criado: ${result.rows[0].name}`);
      }
    }

    console.log('✅ Seed concluído com sucesso');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seed };
