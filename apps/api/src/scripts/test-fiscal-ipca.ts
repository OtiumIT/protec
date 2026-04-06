import assert from 'node:assert/strict';
import {
  calcularFatorIpcaAcumuladoLc214,
  calcularIndicesLc214,
  monthKey,
  mesReferenciaFimIpcaParaAnoCalendario,
} from '@shared/core';

function run(): void {
  const empty = new Map<string, number>();
  const { fator: f0 } = calcularFatorIpcaAcumuladoLc214(empty, 2025, 1);
  assert.equal(f0, 1, 'Antes de fev/2025 sem meses no intervalo → fator 1');

  const map = new Map<string, number>([
    [monthKey(2025, 2), 0.5],
    [monthKey(2025, 3), 0.5],
  ]);
  const { fator } = calcularFatorIpcaAcumuladoLc214(map, 2025, 3);
  const esperado = 1.005 * 1.005;
  assert.ok(Math.abs(fator - esperado) < 0.0001, 'Dois meses 0,5% compõem o fator esperado');

  const idx = calcularIndicesLc214(empty, 2024);
  assert.equal(idx.fator_acumulado_desde_publicacao, 1);
  assert.equal(idx.redutor_social_mensal_efetivo, 600);

  const r2026 = mesReferenciaFimIpcaParaAnoCalendario(2026);
  assert.equal(r2026.year, 2025);
  assert.equal(r2026.month, 12);

  console.log('OK: test-fiscal-ipca');
}

run();
