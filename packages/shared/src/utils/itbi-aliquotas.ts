/**
 * Tabela de alíquotas de ITBI por UF e município.
 *
 * Fontes: legislações municipais vigentes (2024-2026).
 * Capitais + principais municípios por população.
 * A alíquota pode variar por faixa de valor em algumas cidades —
 * aqui usamos a alíquota-padrão (geral) mais comum.
 */

export interface ItbiMunicipio {
  nome: string;
  aliquota: number;
}

export interface ItbiUfData {
  uf: string;
  municipios: ItbiMunicipio[];
}

export const ITBI_ALIQUOTAS: ItbiUfData[] = [
  {
    uf: 'AC',
    municipios: [
      { nome: 'Rio Branco', aliquota: 2 },
    ],
  },
  {
    uf: 'AL',
    municipios: [
      { nome: 'Maceió', aliquota: 2 },
      { nome: 'Arapiraca', aliquota: 2 },
    ],
  },
  {
    uf: 'AM',
    municipios: [
      { nome: 'Manaus', aliquota: 2 },
      { nome: 'Parintins', aliquota: 2 },
    ],
  },
  {
    uf: 'AP',
    municipios: [
      { nome: 'Macapá', aliquota: 2 },
    ],
  },
  {
    uf: 'BA',
    municipios: [
      { nome: 'Salvador', aliquota: 3 },
      { nome: 'Feira de Santana', aliquota: 2 },
      { nome: 'Vitória da Conquista', aliquota: 2 },
      { nome: 'Camaçari', aliquota: 2 },
      { nome: 'Lauro de Freitas', aliquota: 3 },
      { nome: 'Ilhéus', aliquota: 2 },
    ],
  },
  {
    uf: 'CE',
    municipios: [
      { nome: 'Fortaleza', aliquota: 3 },
      { nome: 'Caucaia', aliquota: 2 },
      { nome: 'Juazeiro do Norte', aliquota: 2 },
      { nome: 'Maracanaú', aliquota: 2 },
      { nome: 'Sobral', aliquota: 2 },
      { nome: 'Eusébio', aliquota: 2 },
    ],
  },
  {
    uf: 'DF',
    municipios: [
      { nome: 'Brasília', aliquota: 3 },
    ],
  },
  {
    uf: 'ES',
    municipios: [
      { nome: 'Vitória', aliquota: 2 },
      { nome: 'Vila Velha', aliquota: 2 },
      { nome: 'Serra', aliquota: 2 },
      { nome: 'Cariacica', aliquota: 2 },
    ],
  },
  {
    uf: 'GO',
    municipios: [
      { nome: 'Goiânia', aliquota: 2 },
      { nome: 'Aparecida de Goiânia', aliquota: 2 },
      { nome: 'Anápolis', aliquota: 2 },
    ],
  },
  {
    uf: 'MA',
    municipios: [
      { nome: 'São Luís', aliquota: 2 },
      { nome: 'Imperatriz', aliquota: 2 },
    ],
  },
  {
    uf: 'MG',
    municipios: [
      { nome: 'Belo Horizonte', aliquota: 3 },
      { nome: 'Uberlândia', aliquota: 2 },
      { nome: 'Contagem', aliquota: 2.5 },
      { nome: 'Juiz de Fora', aliquota: 2 },
      { nome: 'Betim', aliquota: 2 },
      { nome: 'Montes Claros', aliquota: 2 },
      { nome: 'Ribeirão das Neves', aliquota: 2 },
      { nome: 'Uberaba', aliquota: 2 },
      { nome: 'Governador Valadares', aliquota: 2 },
      { nome: 'Nova Lima', aliquota: 2 },
    ],
  },
  {
    uf: 'MS',
    municipios: [
      { nome: 'Campo Grande', aliquota: 2 },
      { nome: 'Dourados', aliquota: 2 },
    ],
  },
  {
    uf: 'MT',
    municipios: [
      { nome: 'Cuiabá', aliquota: 2 },
      { nome: 'Várzea Grande', aliquota: 2 },
      { nome: 'Rondonópolis', aliquota: 2 },
      { nome: 'Sinop', aliquota: 2 },
    ],
  },
  {
    uf: 'PA',
    municipios: [
      { nome: 'Belém', aliquota: 2 },
      { nome: 'Ananindeua', aliquota: 2 },
      { nome: 'Santarém', aliquota: 2 },
      { nome: 'Marabá', aliquota: 2 },
    ],
  },
  {
    uf: 'PB',
    municipios: [
      { nome: 'João Pessoa', aliquota: 2 },
      { nome: 'Campina Grande', aliquota: 2 },
    ],
  },
  {
    uf: 'PE',
    municipios: [
      { nome: 'Recife', aliquota: 3 },
      { nome: 'Jaboatão dos Guararapes', aliquota: 2 },
      { nome: 'Olinda', aliquota: 2 },
      { nome: 'Caruaru', aliquota: 2 },
      { nome: 'Petrolina', aliquota: 2 },
    ],
  },
  {
    uf: 'PI',
    municipios: [
      { nome: 'Teresina', aliquota: 2 },
    ],
  },
  {
    uf: 'PR',
    municipios: [
      { nome: 'Curitiba', aliquota: 2.7 },
      { nome: 'Londrina', aliquota: 2 },
      { nome: 'Maringá', aliquota: 2 },
      { nome: 'Ponta Grossa', aliquota: 2 },
      { nome: 'Cascavel', aliquota: 2 },
      { nome: 'São José dos Pinhais', aliquota: 2 },
      { nome: 'Foz do Iguaçu', aliquota: 2 },
      { nome: 'Colombo', aliquota: 2 },
    ],
  },
  {
    uf: 'RJ',
    municipios: [
      { nome: 'Rio de Janeiro', aliquota: 3 },
      { nome: 'São Gonçalo', aliquota: 2 },
      { nome: 'Duque de Caxias', aliquota: 2 },
      { nome: 'Nova Iguaçu', aliquota: 2 },
      { nome: 'Niterói', aliquota: 3 },
      { nome: 'Belford Roxo', aliquota: 2 },
      { nome: 'São João de Meriti', aliquota: 2 },
      { nome: 'Petrópolis', aliquota: 2 },
      { nome: 'Volta Redonda', aliquota: 2 },
      { nome: 'Campos dos Goytacazes', aliquota: 2 },
      { nome: 'Macaé', aliquota: 2 },
    ],
  },
  {
    uf: 'RN',
    municipios: [
      { nome: 'Natal', aliquota: 3 },
      { nome: 'Mossoró', aliquota: 2 },
      { nome: 'Parnamirim', aliquota: 2 },
    ],
  },
  {
    uf: 'RO',
    municipios: [
      { nome: 'Porto Velho', aliquota: 2 },
      { nome: 'Ji-Paraná', aliquota: 2 },
    ],
  },
  {
    uf: 'RR',
    municipios: [
      { nome: 'Boa Vista', aliquota: 2 },
    ],
  },
  {
    uf: 'RS',
    municipios: [
      { nome: 'Porto Alegre', aliquota: 3 },
      { nome: 'Caxias do Sul', aliquota: 2 },
      { nome: 'Canoas', aliquota: 2 },
      { nome: 'Pelotas', aliquota: 2 },
      { nome: 'Santa Maria', aliquota: 2 },
      { nome: 'Gravataí', aliquota: 2 },
      { nome: 'Novo Hamburgo', aliquota: 2 },
      { nome: 'São Leopoldo', aliquota: 2 },
    ],
  },
  {
    uf: 'SC',
    municipios: [
      { nome: 'Florianópolis', aliquota: 2 },
      { nome: 'Joinville', aliquota: 2 },
      { nome: 'Blumenau', aliquota: 2 },
      { nome: 'São José', aliquota: 2 },
      { nome: 'Chapecó', aliquota: 2 },
      { nome: 'Criciúma', aliquota: 2 },
      { nome: 'Itajaí', aliquota: 2 },
      { nome: 'Balneário Camboriú', aliquota: 2 },
    ],
  },
  {
    uf: 'SE',
    municipios: [
      { nome: 'Aracaju', aliquota: 2 },
    ],
  },
  {
    uf: 'SP',
    municipios: [
      { nome: 'São Paulo', aliquota: 3 },
      { nome: 'Guarulhos', aliquota: 2 },
      { nome: 'Campinas', aliquota: 3 },
      { nome: 'São Bernardo do Campo', aliquota: 3 },
      { nome: 'Santo André', aliquota: 2.5 },
      { nome: 'Osasco', aliquota: 2 },
      { nome: 'São José dos Campos', aliquota: 2.5 },
      { nome: 'Ribeirão Preto', aliquota: 2 },
      { nome: 'Sorocaba', aliquota: 2 },
      { nome: 'Santos', aliquota: 3 },
      { nome: 'São José do Rio Preto', aliquota: 2 },
      { nome: 'Mauá', aliquota: 2 },
      { nome: 'Mogi das Cruzes', aliquota: 2 },
      { nome: 'Diadema', aliquota: 2 },
      { nome: 'Jundiaí', aliquota: 2 },
      { nome: 'Piracicaba', aliquota: 2.5 },
      { nome: 'Barueri', aliquota: 2 },
      { nome: 'Carapicuíba', aliquota: 2 },
      { nome: 'Bauru', aliquota: 2 },
      { nome: 'Itaquaquecetuba', aliquota: 2 },
      { nome: 'São Vicente', aliquota: 2 },
      { nome: 'Praia Grande', aliquota: 2 },
      { nome: 'Guarujá', aliquota: 2 },
      { nome: 'Taubaté', aliquota: 2 },
      { nome: 'Cotia', aliquota: 2 },
      { nome: 'Indaiatuba', aliquota: 2 },
      { nome: 'Alphaville / Santana de Parnaíba', aliquota: 2 },
    ],
  },
  {
    uf: 'TO',
    municipios: [
      { nome: 'Palmas', aliquota: 2 },
    ],
  },
];

const ufMap = new Map<string, ItbiMunicipio[]>(
  ITBI_ALIQUOTAS.map((u) => [u.uf, u.municipios])
);

/**
 * Retorna a lista de municípios para uma UF.
 * Resultado ordenado alfabeticamente.
 */
export function getItbiMunicipios(uf: string): ItbiMunicipio[] {
  const list = ufMap.get(uf.toUpperCase());
  if (!list) return [];
  return [...list].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Busca a alíquota de ITBI para um município específico.
 * Retorna `undefined` se não encontrado (o usuário deve informar manualmente).
 */
export function getItbiAliquota(uf: string, municipio: string): number | undefined {
  const list = ufMap.get(uf.toUpperCase());
  if (!list) return undefined;
  const normalized = municipio.trim().toLowerCase();
  const found = list.find((m) => m.nome.toLowerCase() === normalized);
  return found?.aliquota;
}
