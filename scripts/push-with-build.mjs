#!/usr/bin/env node
/**
 * Push com build da API: reconstrói o bundle Lambda (artefatos gerados), commita e envia.
 * Uso: pnpm run push "feat: descrição da alteração"
 *
 * Fluxo:
 * 1. pnpm run build:lambda (version.generated.ts, migrations-embedded.ts, dist-lambda local)
 * 2. git add (version.generated.ts, migrations-embedded.ts; dist-lambda fica no .gitignore)
 * 3. git commit -m "<mensagem>"
 * 4. git push → GitHub Actions faz SAM deploy (Lambda + API Gateway)
 *
 * A API em produção é deployada na AWS; não use mais Vercel para a API.
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

console.log('1/4 Reconstruindo artefatos da API (Lambda bundle + arquivos gerados)...');
execSync('pnpm run build:lambda', { cwd: root, stdio: 'inherit' });

console.log('2/4 Adicionando alterações ao staging...');
execSync('git add -A', { cwd: root, stdio: 'inherit' });
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
