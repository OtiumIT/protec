/**
 * Script para popular a tabela de editais com os editais iniciais
 * Execute: pnpm tsx apps/api/src/scripts/seed-editais.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../db/client';
import { EDITAIS } from '@shared/core';

// Carregar .env
config({ path: resolve(process.cwd(), '../../.env') });

async function seedEditais() {
  console.log('🌱 Iniciando seed de editais...\n');

  try {
    for (const edital of EDITAIS) {
      // Verificar se já existe
      const existing = await query<{ id: string }>(
        'SELECT id FROM editais WHERE code = $1',
        [edital.code]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Edital ${edital.code} já existe, pulando...`);
        continue;
      }

      // Inserir edital
      await query(
        `INSERT INTO editais (
          code, name, description, start_date, end_date, extended,
          modality, payment_terms, discount_rules, eligibility,
          notes, official_link, active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )`,
        [
          edital.code,
          edital.name,
          edital.description || null,
          edital.startDate,
          edital.endDate,
          edital.extended || false,
          edital.modality,
          JSON.stringify(edital.paymentTerms),
          JSON.stringify(edital.discountRules),
          JSON.stringify(edital.eligibility),
          edital.notes || null,
          edital.officialLink || null,
          true, // active
        ]
      );

      console.log(`✅ Edital ${edital.code} criado com sucesso!`);
    }

    console.log('\n✨ Seed de editais concluído!');
  } catch (error) {
    console.error('❌ Erro ao fazer seed de editais:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('seed-editais.ts') ||
                     process.argv[1]?.endsWith('seed-editais.js');

if (isMainModule) {
  seedEditais()
    .then(() => {
      console.log('✅ Processo finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export { seedEditais };
