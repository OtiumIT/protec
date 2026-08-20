import type {
  RealEstateDevelopment,
  RealEstateUnit,
  SaleContractDetail,
} from '@shared/core';

function cell(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v).replace(/\|/g, '/').replace(/\r?\n/g, ' ').trim();
}

function brDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = String(iso).slice(0, 10);
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return '';
  return `${day}/${m}/${y}`;
}

function brNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '';
  return Number(n).toFixed(2).replace('.', ',');
}

export function buildDominioExport(
  development: RealEstateDevelopment,
  units: RealEstateUnit[],
  contracts: SaleContractDetail[],
): string {
  const lines: string[] = [];
  const emp = cell(development.codigo);

  lines.push([
    '0500', emp, cell(development.nome), cell(development.tipo), cell(development.natureza),
    brDate(development.data_inicio), cell(development.cno), brDate(development.cno_data),
    brNum(development.area_total_m2), brNum(development.area_credito_m2),
    cell(development.cep), cell(development.logradouro), cell(development.numero),
    cell(development.complemento), cell(development.bairro), cell(development.cidade),
    cell(development.uf), cell(development.processo_numero),
  ].join('|'));

  for (const u of units) {
    lines.push([
      '0510', emp, cell(u.codigo), cell(u.descricao), cell(u.matricula),
      cell(u.tipo_unidade), brNum(u.area_m2), brNum(u.custo), brNum(u.valor_atribuido),
      cell(u.situacao),
    ].join('|'));
  }

  for (const d of contracts) {
    const c = d.contract;
    const num = cell(c.numero);
    lines.push([
      '7100', num, brDate(c.data_contrato), brNum(Number(c.valor_venda)),
      cell(c.operacao), emp, cell(c.indice_atualizacao), brNum(c.taxa_juros), cell(c.status),
    ].join('|'));

    for (const p of d.parties) {
      lines.push([
        '7110', num, cell(p.client_documento), cell(p.client_name), brNum(Number(p.participacao_pct)),
      ].join('|'));
    }
    for (const u of d.units) {
      lines.push([
        '7120', num, cell(u.unit_codigo), brNum(Number(u.valor_atribuido_contrato)),
      ].join('|'));
    }
    for (const i of d.installments) {
      lines.push([
        '7150', num, String(i.sequencia), brDate(i.vencimento),
        brNum(Number(i.principal)), cell(i.fonte_pagadora), cell(i.status),
      ].join('|'));
    }
  }

  return `${lines.join('\r\n')}\r\n`;
}
