import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../db/client';

// Carregar .env da raiz do projeto
config({ path: resolve(process.cwd(), '../../.env') });

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
    // IMPORTANTE: Sempre que criar um novo módulo, adicione-o aqui e também na migration 020_create_default_modules.sql
    // Esta lista deve estar sincronizada com a migration para garantir consistência
    const modules = [
      { name: 'Billing', key: 'BILLING', description: 'Sistema de cobrança e assinaturas' },
      { name: 'Fiscal Files', key: 'FISCAL_FILES', description: 'Gerenciamento de arquivos fiscais (SPED, ECD, PGDAS, etc)' },
      { name: 'Transação Tributária - Análise da capacidade de pagamento', key: 'RATING_VALIDATOR', description: 'Avaliação se a classificação da capacidade de pagamento feita pela Receita Federal está correta, possibilitando a revisão do enquadramento com os dados contábeis analisados pelo sistema, com a emissão de relatório para fundamentação.' },
      { name: 'Simulação do aumento da tributação do lucro presumido - LC 224/2025', key: 'SIMULADOR_IN_2306', description: 'Possibilita fazer a comparação da tributação do lucro presumido antes e depois da alteração trazida pela LC 224/2025, identificando quanto será o aumento para o contribuinte.' },
      { name: 'Tributação da alta renda/dividendos - IRPFM - Lei 12.570/2025', key: 'IRPF_ALTA_RENDA', description: 'Análise da declaração do IR do contribuinte e simulação da nova tributação da alta renda, com a indicação da alíquota aplicável e o valor a ser pago, comparando os cenários antes e depois da nova legislação, apontando possíveis soluções para redução (ex.: constituição de holding, segregação da renda com cônjuge/filhos).' },
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

// Executar se chamado diretamente
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('seed.ts') ||
                     process.argv[1]?.endsWith('seed.js');

if (isMainModule) {
  seed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seed };
