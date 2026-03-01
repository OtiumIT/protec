import { config } from 'dotenv';
import { resolve } from 'path';
import { PlanRepository } from '../modules/plans/plan.repository';

// Carregar .env da raiz do projeto
config({ path: resolve(process.cwd(), '../../.env') });

/**
 * Script de teste: altera o preço de um plano (ex.: Pro ou Standard).
 * Uso: pnpm run test-update-plan [nome-do-plano] [novo-preco]
 * Ex.: pnpm run test-update-plan Pro 149.90
 *      pnpm run test-update-plan Standard 199
 */
async function main() {
  const planName = process.argv[2] ?? 'Pro';
  const newPriceStr = process.argv[3] ?? '149.90';
  const newPrice = parseFloat(newPriceStr);

  if (Number.isNaN(newPrice) || newPrice < 0) {
    console.error('❌ Preço inválido. Use um número >= 0. Ex.: 149.90');
    process.exit(1);
  }

  console.log(`\n🧪 Teste: alterar preço do plano "${planName}" para R$ ${newPrice.toFixed(2)}\n`);

  const planRepo = new PlanRepository();

  try {
    const plan = await planRepo.findByName(planName);
    if (!plan) {
      console.error(`❌ Plano "${planName}" não encontrado.`);
      console.log('   Planos existentes: liste com SELECT name, price FROM plans;');
      process.exit(1);
    }

    const oldPrice = typeof (plan as any).price === 'string' ? parseFloat((plan as any).price) : (plan as any).price;
    console.log(`   Antes: ${(plan as any).name} — R$ ${Number(oldPrice).toFixed(2)}`);

    const updated = await planRepo.update((plan as any).id, { price: newPrice });
    const updatedPrice = typeof (updated as any).price === 'string' ? parseFloat((updated as any).price) : (updated as any).price;
    console.log(`   Depois: ${(updated as any).name} — R$ ${Number(updatedPrice).toFixed(2)}`);

    console.log('\n✅ Preço atualizado com sucesso.\n');
  } catch (err) {
    console.error('❌ Erro ao atualizar plano:', err);
    process.exit(1);
  }
}

main();
