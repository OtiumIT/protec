#!/usr/bin/env node
/**
 * Push com build da API: reconstrói o bundle Lambda, commita tudo e envia.
 * Uso: pnpm run push "feat: descrição da alteração"
 *
 * Fluxo:
 * 1. pnpm run build:lambda (reconstrói bundle da API para Lambda)
 * 2. git add . (inclui version.generated.ts e migrations-embedded.ts)
 * 3. git commit -m "<mensagem>"
 * 4. git push (GitHub Actions faz deploy na AWS Lambda)
 */
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const message = process.argv[2];
if (!message || !message.trim()) {
  console.error('Uso: pnpm run push "feat: descrição da alteração"');
  process.exit(1);
}

console.log('1/4 Reconstruindo bundle da API (Lambda)...');
execSync('pnpm run build:lambda', { cwd: root, stdio: 'inherit' });

console.log('2/4 Adicionando alterações ao staging...');
execSync('git add -A', { cwd: root, stdio: 'inherit' });
// Force-add build artifacts (version e migrations embutidas)
try {
  execSync('git add -f apps/api/src/version.generated.ts apps/api/src/db/migrations-embedded.ts', {
    cwd: root,
    stdio: 'ignore',
  });
} catch {
  // Ignorar se algum caminho não existir
}

console.log('3/4 Committando...');
execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: root, stdio: 'inherit', shell: true });

console.log('4/4 Fazendo push...');
execSync('git push', { cwd: root, stdio: 'inherit' });

console.log('✅ Push concluído com sucesso.');
