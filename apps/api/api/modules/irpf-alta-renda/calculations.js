"use strict";
/**
 * Motor de cálculo IRPF Alta Renda - Lei 15.270/2025
 *
 * Fórmula legal (Art. 16-A § 2º II): Alíquota % = (REND/60.000) − 10
 * Para rendimentos entre 600k e 1,2M. Acima de 1,2M: 10% fixo.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_LEI_15270_2025 = void 0;
exports.calcularBCC = calcularBCC;
exports.aplicarFaixas = aplicarFaixas;
exports.avaliarRiscoRetencao = avaliarRiscoRetencao;
exports.gerarSugestoesPlanejamento = gerarSugestoesPlanejamento;
exports.comporRendaParaDashboard = comporRendaParaDashboard;
exports.calcularImpactoIncrementalBase = calcularImpactoIncrementalBase;
exports.construirMemoriaLegalExclusoes = construirMemoriaLegalExclusoes;
exports.simularOtimizacaoIsentoVsTributado = simularOtimizacaoIsentoVsTributado;
exports.classificarIsentosArt16A = classificarIsentosArt16A;
exports.identificarOutrosExcluidosArt16A = identificarOutrosExcluidosArt16A;
exports.compararEficienciaPfPj = compararEficienciaPfPj;
/** Parâmetros da Lei 15.270/2025 – alterar aqui quando houver regulamentação ou nova lei */
exports.CONFIG_LEI_15270_2025 = {
    limite_isento: 600_000,
    limite_progressiva: 1_200_000,
    aliquota_fixa_percentual: 10,
    limite_retencao_mensal: 50_000,
    fonte_normativa: 'Lei 15.270/2025',
    observacao_progressiva: 'Alíquota % = (REND/60.000) − 10 (Art. 16-A § 2º II). Faixa 600k–1,2M.',
};
const LIMITE_ISENTO = exports.CONFIG_LEI_15270_2025.limite_isento;
const LIMITE_PROGRESSIVA = exports.CONFIG_LEI_15270_2025.limite_progressiva;
const ALIQUOTA_FIXA = exports.CONFIG_LEI_15270_2025.aliquota_fixa_percentual / 100;
const LIMITE_RETENCAO_MENSAL = exports.CONFIG_LEI_15270_2025.limite_retencao_mensal;
/**
 * Calcula BCC = RT + soma isentos (09, 13) − lucros aprovados até 31/12/2025 − ganho capital − FIIs.
 * Art. 16-A § 1º: exclui ganho de capital (I), FIIs qualificados (V-j), lucros aprovados até 31/12/2025 (XII).
 */
function calcularBCC(rendimentosTributaveis, rendimentosIsentosDividendos, lucrosAprovadosAte31dez2025 = 0, ganhoCapitalExcluido = 0, rendimentosFiisExcluidos = 0, outrosIsentosQueEntramBase = 0, outrosExcluidosArt16A = 0) {
    const somaDividendos = rendimentosIsentosDividendos.reduce((s, d) => s + d.valor, 0);
    const bruto = rendimentosTributaveis +
        somaDividendos +
        outrosIsentosQueEntramBase -
        lucrosAprovadosAte31dez2025 -
        ganhoCapitalExcluido -
        rendimentosFiisExcluidos -
        outrosExcluidosArt16A;
    return round2(Math.max(0, bruto));
}
/**
 * Aplica faixas da Lei 15.270/2025 e retorna alíquota e imposto.
 * Progressiva 600k–1,2M: interpolada até 10% (ver CONFIG_LEI_15270_2025.observacao_progressiva).
 */
function aplicarFaixas(bcc) {
    let faixa;
    let aliquotaPercentual;
    let imposto;
    let excedenteSobre600k = 0;
    if (bcc <= LIMITE_ISENTO) {
        faixa = 'isento';
        aliquotaPercentual = 0;
        imposto = 0;
    }
    else if (bcc <= LIMITE_PROGRESSIVA) {
        faixa = 'progressiva';
        excedenteSobre600k = round2(bcc - LIMITE_ISENTO);
        // Art. 16-A § 2º II: Alíquota % = (REND/60.000) − 10
        aliquotaPercentual = bcc / 60_000 - 10;
        if (aliquotaPercentual < 0)
            aliquotaPercentual = 0;
        if (aliquotaPercentual > 10)
            aliquotaPercentual = 10;
        imposto = round2(bcc * (aliquotaPercentual / 100));
    }
    else {
        faixa = 'fixa_10';
        excedenteSobre600k = round2(bcc - LIMITE_ISENTO);
        aliquotaPercentual = exports.CONFIG_LEI_15270_2025.aliquota_fixa_percentual;
        imposto = round2(bcc * ALIQUOTA_FIXA);
    }
    return {
        base_calculo_combinada: bcc,
        faixa,
        aliquota_percentual: round2(aliquotaPercentual),
        imposto_estimado: imposto,
        excedente_sobre_600k: excedenteSobre600k > 0 ? excedenteSobre600k : undefined,
        memoria_calculo: {
            limite_isento: LIMITE_ISENTO,
            limite_progressiva: LIMITE_PROGRESSIVA,
            aliquota_fixa_percentual: exports.CONFIG_LEI_15270_2025.aliquota_fixa_percentual,
            fonte_normativa: exports.CONFIG_LEI_15270_2025.fonte_normativa,
            observacao_progressiva: exports.CONFIG_LEI_15270_2025.observacao_progressiva,
        },
    };
}
/**
 * Verifica risco de retenção 10% na fonte (Art. 5º): pagamento no mês > R$ 50.000.
 * Simplificação: se alguma fonte tem valor anual que, dividido por 12, supera 50k, sinaliza risco.
 */
function avaliarRiscoRetencao(rendimentosIsentosDividendos) {
    const fontesAcima = rendimentosIsentosDividendos.filter((d) => d.valor / 12 > LIMITE_RETENCAO_MENSAL);
    if (fontesAcima.length === 0) {
        return { risco_retencao_mensal: false };
    }
    const nomes = fontesAcima.map((f) => f.nome_fonte || f.cnpj_fonte || 'Fonte').join(', ');
    return {
        risco_retencao_mensal: true,
        risco_retencao_detalhe: `Possível retenção de 10% na fonte: valor mensal superior a R$ 50.000 em uma ou mais fontes (${nomes}).`,
    };
}
/**
 * Gera sugestões de planejamento tributário com base nos dados e no resultado da simulação.
 * Lei 15.270/2025 – estratégias para holding, segregação e redução do impacto.
 */
function gerarSugestoesPlanejamento(dados, resultado) {
    const sugestoes = [];
    const bcc = resultado.base_calculo_combinada;
    const dividendos = dados.rendimentos_isentos_dividendos ?? [];
    // Retenção 10%: fontes com valor mensal > R$ 50k → holding/fracionamento
    const fontesAcima = dividendos.filter((d) => (d.valor ?? 0) / 12 > LIMITE_RETENCAO_MENSAL);
    if (fontesAcima.length > 0) {
        fontesAcima.forEach((f) => {
            const nome = f.nome_fonte ?? f.cnpj_fonte ?? 'Fonte';
            sugestoes.push(`Retenção 10% na fonte: "${nome}" com valor anual ${formatBRL(f.valor ?? 0)} (média mensal > R$ 50k). Considere holding ou fracionamento de recebimentos.`);
        });
    }
    // Aluguéis gerando carnê-leão → holding imobiliária
    const carneLeao = dados.imposto_ja_pago_carne_leao ?? 0;
    const rt = dados.rendimentos_tributaveis ?? 0;
    if (carneLeao > 0 && rt > 0) {
        sugestoes.push(`Aluguéis/receitas PF gerando carnê-leão (IR pago: ${formatBRL(carneLeao)}). Avalie constituição de holding imobiliária para reorganização tributária.`);
    }
    // Base acima de R$ 1,2M → segregação com cônjuge/filhos
    if (bcc > LIMITE_PROGRESSIVA) {
        sugestoes.push(`Base de cálculo (${formatBRL(bcc)}) acima de R$ 1,2M. Considere segregação da renda com cônjuge ou filhos (dentro dos limites legais) para reduzir a alíquota efetiva.`);
    }
    // Base entre 600k e 1,2M – alíquota progressiva
    if (bcc > LIMITE_ISENTO && bcc <= LIMITE_PROGRESSIVA) {
        sugestoes.push(`Base na faixa progressiva. Revisão do momento e da forma de recebimento dos rendimentos pode auxiliar no planejamento.`);
    }
    // Fallback genérico se não houver sugestões específicas
    if (sugestoes.length === 0) {
        sugestoes.push('Revisão do momento e da forma de recebimento dos rendimentos pode auxiliar no planejamento. Consulte seu consultor tributário para simulações específicas à Lei 15.270/2025.');
    }
    return sugestoes;
}
function comporRendaParaDashboard(dados) {
    const tributaveis = round2(dados.rendimentos_tributaveis ?? 0);
    const dividendos = round2((dados.rendimentos_isentos_dividendos ?? []).reduce((s, i) => s + (i.valor ?? 0), 0));
    const outrosIsentosBase = round2((dados.outros_isentos_que_entram_base ?? []).reduce((s, i) => s + (i.valor ?? 0), 0));
    const exclusoes = round2(dados.lucros_aprovados_ate_31dez2025 ?? 0) +
        round2(dados.ganho_capital_excluido ?? 0) +
        round2(dados.rendimentos_fiis_excluidos ?? 0) +
        round2(dados.outros_excluidos_art_16a ?? 0);
    const tributacaoExclusivaLei7713 = round2((dados.rendimentos_tributados_exclusivamente_lei_7713 ?? []).reduce((s, i) => s + (i.valor_bruto ?? 0), 0));
    return {
        tributaveis,
        isentos_que_entram_base: round2(dividendos + outrosIsentosBase),
        dividendos_09_13: dividendos,
        isentos_excluidos: round2(exclusoes),
        tributacao_exclusiva_lei_7713: tributacaoExclusivaLei7713,
    };
}
function calcularImpactoIncrementalBase(dados) {
    const composicao = comporRendaParaDashboard(dados);
    const base = composicao.tributaveis +
        composicao.isentos_que_entram_base +
        composicao.tributacao_exclusiva_lei_7713;
    if (base <= 0)
        return [];
    return [
        {
            categoria: 'Rendimentos tributaveis',
            valor: composicao.tributaveis,
            percentual_base: round2((composicao.tributaveis / base) * 100),
        },
        {
            categoria: 'Isentos que entram na base',
            valor: composicao.isentos_que_entram_base,
            percentual_base: round2((composicao.isentos_que_entram_base / base) * 100),
        },
        {
            categoria: 'Tributacao exclusiva Lei 7.713',
            valor: composicao.tributacao_exclusiva_lei_7713,
            percentual_base: round2((composicao.tributacao_exclusiva_lei_7713 / base) * 100),
        },
    ].filter((i) => i.valor > 0);
}
function construirMemoriaLegalExclusoes(dados) {
    const itens = [];
    if ((dados.lucros_aprovados_ate_31dez2025 ?? 0) > 0) {
        itens.push({
            item: 'Lucros e dividendos aprovados ate 31/12/2025',
            valor: round2(dados.lucros_aprovados_ate_31dez2025 ?? 0),
            base_legal: 'Lei 15.270/2025, Art. 16-A, §1º, XII',
            motivo: 'Regra de transicao da lei para lucros aprovados ate o marco temporal.',
        });
    }
    if ((dados.ganho_capital_excluido ?? 0) > 0) {
        itens.push({
            item: 'Ganho de capital excluido',
            valor: round2(dados.ganho_capital_excluido ?? 0),
            base_legal: 'Lei 15.270/2025, Art. 16-A, §1º, I',
            motivo: 'Ganho de capital fora de bolsa/mercado organizado nao integra a base minima.',
        });
    }
    if ((dados.rendimentos_fiis_excluidos ?? 0) > 0) {
        itens.push({
            item: 'Rendimentos de FIIs qualificados',
            valor: round2(dados.rendimentos_fiis_excluidos ?? 0),
            base_legal: 'Lei 15.270/2025, Art. 16-A, §1º, V-j',
            motivo: 'Rendimentos de FIIs com requisitos legais sao excluidos da base.',
        });
    }
    if ((dados.outros_excluidos_art_16a ?? 0) > 0) {
        itens.push({
            item: 'Outros excluidos (CRI/CRA/LCI/LCA/LIG/Poupanca/Debentures Infra)',
            valor: round2(dados.outros_excluidos_art_16a ?? 0),
            base_legal: 'Lei 15.270/2025, Art. 16-A, §1º',
            motivo: 'Ativos incentivados e instrumentos listados pela lei ficam fora da base minima.',
        });
    }
    return itens;
}
function simularOtimizacaoIsentoVsTributado(dados, baseCalculoAtual, impostoComplementarAtual, deducoesAtuais) {
    const migraveis = dados.outros_isentos_que_entram_base ?? [];
    const valorMigrado = round2(migraveis.reduce((s, i) => s + (i.valor ?? 0), 0));
    if (valorMigrado <= 0)
        return undefined;
    const rendTribLei7713 = dados.rendimentos_tributados_exclusivamente_lei_7713 ?? [];
    const irrfCompensavel = round2(rendTribLei7713.reduce((s, i) => {
        if ((i.irrf ?? 0) > 0)
            return s + (i.irrf ?? 0);
        const aliq = i.aliquota_irrf_percentual ?? 15;
        return s + ((i.valor_bruto ?? 0) * aliq) / 100;
    }, 0));
    const baseSemIsento = round2(Math.max(0, baseCalculoAtual - valorMigrado));
    const impostoSemIsento = aplicarFaixas(baseSemIsento).imposto_estimado;
    const impostoComplementarSemCredito = Math.max(0, impostoSemIsento - deducoesAtuais);
    const deducoesComTributado = round2(deducoesAtuais + irrfCompensavel);
    const impostoComplementarOtimizado = round2(Math.max(0, impostoSemIsento - deducoesComTributado));
    const adicionalIrpfmNoCenarioIsento = round2(Math.max(0, impostoComplementarAtual - impostoComplementarSemCredito));
    const adicionalIrpfmNoCenarioTributado = round2(Math.max(0, adicionalIrpfmNoCenarioIsento - irrfCompensavel));
    const rendimentoLiquidoIsento = round2(Math.max(0, valorMigrado - adicionalIrpfmNoCenarioIsento));
    const rendimentoLiquidoTributado = round2(Math.max(0, valorMigrado - adicionalIrpfmNoCenarioTributado));
    return {
        valor_migrado: valorMigrado,
        bcc_cenario_atual: round2(baseCalculoAtual),
        bcc_cenario_otimizado: baseSemIsento,
        imposto_complementar_atual: round2(impostoComplementarAtual),
        imposto_complementar_otimizado: impostoComplementarOtimizado,
        irrf_compensavel_estimado: irrfCompensavel,
        rendimento_liquido_cenario_isento: rendimentoLiquidoIsento,
        rendimento_liquido_cenario_tributado: rendimentoLiquidoTributado,
        ganho_liquido_estimado: round2(rendimentoLiquidoTributado - rendimentoLiquidoIsento),
        observacao: baseCalculoAtual > LIMITE_PROGRESSIVA
            ? 'Em base acima de R$ 1,2M, ativo tributado com IRRF compensavel tende a reduzir imposto complementar versus isento que entra na base.'
            : 'Simulacao simplificada para comparacao de estrategia. Confirmar enquadramento e compensacao com documentacao fiscal.',
    };
}
const PALAVRAS_EXCLUSAO_ART16A = ['cri', 'cra', 'lci', 'lca', 'lig', 'poupanca', 'debenture', 'debentures', 'infraestrutura'];
const CODIGOS_DOACAO_HERANCA = new Set(['01', '03']);
/** Códigos com tributação exclusiva na fonte (06=applicações, 10=JCP) — não entram na BCC; IR pago deduzível */
const CODIGOS_TRIBUTACAO_EXCLUSIVA = new Set(['06', '10']);
/** Códigos LCI/LCA/poupança — excluídos da BCC (Art. 16-A) */
const CODIGOS_LCI_LCA_POUPANCA = new Set(['11', '12']);
/** Código 05 = outros isentos — NÃO excluir automaticamente; usar descrição (keywords Art. 16-A) ou classificação manual */
const PALAVRAS_DOACAO_HERANCA = ['doacao', 'heranca', 'legitima', 'adiantamento da legitima', 'transferencia patrimonial'];
const PALAVRAS_FII = ['fii', 'fundo imobili', 'fundo de investimento imobili'];
const PALAVRAS_GANHO_CAPITAL = ['ganho de capital', 'alienacao', 'venda de imovel', 'venda de participacao'];
const PALAVRAS_TRANSICAO_2025 = ['31/12/2025', '31-12-2025', 'ate 31/12/2025', 'assembleia', 'aprovad'];
function normalizarTexto(s) {
    return String(s ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}
function temPalavra(texto, palavras) {
    return palavras.some((p) => texto.includes(normalizarTexto(p)));
}
function classificarIsentosArt16A(itens) {
    let outrosExcluidos = 0;
    let fiisExcluidos = 0;
    let ganhoCapitalExcluido = 0;
    let lucrosTransicao = 0;
    const outrosEntramBase = [];
    const tributacaoExclusivaLei7713 = [];
    for (const item of itens) {
        const valor = round2(item.valor ?? 0);
        if (valor <= 0)
            continue;
        const codigo = String(item.codigo ?? '').trim().padStart(2, '0').slice(-2);
        const desc = normalizarTexto(item.descricao ?? item.nome_fonte ?? '');
        const isFii = temPalavra(desc, PALAVRAS_FII);
        const isGanhoCapital = temPalavra(desc, PALAVRAS_GANHO_CAPITAL);
        const isTransicao = temPalavra(desc, PALAVRAS_TRANSICAO_2025);
        const isExclArt16A = temPalavra(desc, PALAVRAS_EXCLUSAO_ART16A);
        const isDoacaoHeranca = CODIGOS_DOACAO_HERANCA.has(codigo) || temPalavra(desc, PALAVRAS_DOACAO_HERANCA);
        if (isTransicao) {
            lucrosTransicao += valor;
            continue;
        }
        if (codigo === '09' || codigo === '13')
            continue;
        if (isFii) {
            fiisExcluidos += valor;
            continue;
        }
        if (isGanhoCapital) {
            ganhoCapitalExcluido += valor;
            continue;
        }
        if (CODIGOS_TRIBUTACAO_EXCLUSIVA.has(codigo)) {
            tributacaoExclusivaLei7713.push({
                descricao: item.descricao ?? item.nome_fonte ?? `Rendimento codigo ${codigo} (tributacao exclusiva)`,
                valor_bruto: valor,
                irrf: 0,
                aliquota_irrf_percentual: 15,
            });
            continue;
        }
        if (CODIGOS_LCI_LCA_POUPANCA.has(codigo)) {
            outrosExcluidos += valor;
            continue;
        }
        // Código 05: excluir apenas se descrição contém keywords Art. 16-A (LCI/LCA/CRI/CRA/etc);
        // caso contrário, entra em outros_isentos_que_entram_base (ex.: rendimentos do exterior)
        if (isExclArt16A) {
            outrosExcluidos += valor;
            continue;
        }
        if (isDoacaoHeranca) {
            outrosExcluidos += valor;
            continue;
        }
        outrosEntramBase.push({
            descricao: item.descricao ?? item.nome_fonte ?? `Rendimento isento ${codigo || ''}`.trim(),
            tipo_ativo: 'outro_isento',
            valor,
        });
    }
    return {
        outros_excluidos_art_16a: round2(outrosExcluidos),
        rendimentos_fiis_excluidos: round2(fiisExcluidos),
        ganho_capital_excluido: round2(ganhoCapitalExcluido),
        lucros_aprovados_ate_31dez2025: round2(lucrosTransicao),
        outros_isentos_que_entram_base: outrosEntramBase,
        rendimentos_tributados_exclusivamente_lei_7713: tributacaoExclusivaLei7713,
    };
}
function identificarOutrosExcluidosArt16A(itens) {
    return classificarIsentosArt16A(itens).outros_excluidos_art_16a;
}
/** Parâmetros PJ Lucro Presumido — receitas financeiras 100% na base (sem presunção) */
const CONFIG_PJ_LUCRO_PRESUMIDO = {
    irpj_aliquota_percentual: 15,
    adicional_irpj_percentual: 10,
    limite_adicional_mensal: 20_000, // R$ 20k/mês
    csll_percentual: 9,
};
/**
 * Compara eficiência tributária: mesma aplicação financeira em PF vs PJ (Lucro Presumido).
 * PF: IR retido na fonte + impacto IRPFM (base combinada) com IRRF compensável.
 * PJ: base 100%, IRPJ 15%, Adicional 10% sobre excedente R$ 20k/mês, CSLL 9% — carga até ~34%.
 */
function compararEficienciaPfPj(valorAplicacao, dados, resultadoSimulacao, rendimentosFinanceirosPj = 0) {
    if (valorAplicacao <= 0)
        return undefined;
    const lucrosExcl = dados.lucros_aprovados_ate_31dez2025 ?? 0;
    const ganhoCapitalExcl = dados.ganho_capital_excluido ?? 0;
    const fiisExcl = dados.rendimentos_fiis_excluidos ?? 0;
    const outrosExclArt16A = dados.outros_excluidos_art_16a ?? 0;
    const outrosIsentosQueEntramBase = (dados.outros_isentos_que_entram_base ?? []).reduce((s, i) => s + (i.valor ?? 0), 0);
    const rt = dados.rendimentos_tributaveis ?? 0;
    // ── Cenário PF A: Tributação exclusiva (Lei 7.713) — aplicação NÃO entra na BCC ───
    // CDB, JCP etc: IRRF na fonte é final (ou compensável), mas o valor não aumenta a BCC.
    const aliquotaIrrf = (dados.aliquota_irrf_comparativo_percentual ?? 15) / 100;
    const irrfRetido = round2(valorAplicacao * aliquotaIrrf);
    const impostoTotalPfTribExclusiva = irrfRetido;
    const rendimentoLiquidoPfTribExclusiva = round2(Math.max(0, valorAplicacao - impostoTotalPfTribExclusiva));
    // ── Cenário PF B: Aplicação entra na base — impacto IRPFM + IRRF compensável ─────
    const deducoesAtuais = resultadoSimulacao.deducoes_imposto_ja_pago;
    const bccComAplicacao = calcularBCC(rt + valorAplicacao, dados.rendimentos_isentos_dividendos ?? [], lucrosExcl, ganhoCapitalExcl, fiisExcl, outrosIsentosQueEntramBase, outrosExclArt16A);
    const resultadoComAplicacao = aplicarFaixas(bccComAplicacao);
    const impostoMinimoComAplicacao = resultadoComAplicacao.imposto_estimado;
    const deducoesComIrrf = round2(deducoesAtuais + irrfRetido);
    const impostoComplementarComAplicacao = round2(Math.max(0, impostoMinimoComAplicacao - deducoesComIrrf));
    const impostoComplementarSemAplicacao = resultadoSimulacao.imposto_estimado;
    const incrementoIrpfm = round2(Math.max(0, impostoComplementarComAplicacao - impostoComplementarSemAplicacao));
    const impostoTotalPfEntraBase = round2(irrfRetido + incrementoIrpfm);
    const rendimentoLiquidoPfEntraBase = round2(Math.max(0, valorAplicacao - impostoTotalPfEntraBase));
    // ── Cenário PJ (Lucro Presumido) ───────────────────────────────────────────
    // Base 100% tributada (receitas financeiras sem presunção). rendimentosFinanceirosPj
    // usado para calcular adicional (excedente R$ 20k/mês) quando há receitas pré-existentes.
    const basePj = round2(valorAplicacao);
    const basePjComExistente = round2(valorAplicacao + rendimentosFinanceirosPj);
    const irpj = round2(basePj * (CONFIG_PJ_LUCRO_PRESUMIDO.irpj_aliquota_percentual / 100));
    const lucroAnualParaAdicional = basePjComExistente;
    const limiteAnualAdicional = CONFIG_PJ_LUCRO_PRESUMIDO.limite_adicional_mensal * 12; // R$ 240k/ano
    const excedenteAnual = Math.max(0, lucroAnualParaAdicional - limiteAnualAdicional);
    const adicionalIrpj = round2(excedenteAnual * (CONFIG_PJ_LUCRO_PRESUMIDO.adicional_irpj_percentual / 100));
    const csll = round2(basePj * (CONFIG_PJ_LUCRO_PRESUMIDO.csll_percentual / 100));
    const impostoTotalPj = round2(irpj + adicionalIrpj + csll);
    const cargaEfetivaPj = basePj > 0 ? round2((impostoTotalPj / basePj) * 100) : 0;
    const rendimentoLiquidoPj = round2(Math.max(0, valorAplicacao - impostoTotalPj));
    const diferencaPercentual = rendimentoLiquidoPfTribExclusiva > 0
        ? round2(((impostoTotalPj - impostoTotalPfTribExclusiva) / rendimentoLiquidoPfTribExclusiva) * 100)
        : impostoTotalPj > 0 ? 100 : 0;
    return {
        rendimento_bruto: round2(valorAplicacao),
        cenario_pf_tributacao_exclusiva: {
            imposto_total: impostoTotalPfTribExclusiva,
            irrf: irrfRetido,
            rendimento_liquido: rendimentoLiquidoPfTribExclusiva,
        },
        cenario_pf_entra_base: {
            imposto_total: impostoTotalPfEntraBase,
            irrf_compensavel: irrfRetido,
            rendimento_liquido: rendimentoLiquidoPfEntraBase,
        },
        cenario_pf: {
            imposto_total: impostoTotalPfTribExclusiva,
            irrf_compensavel: irrfRetido,
            rendimento_liquido: rendimentoLiquidoPfTribExclusiva,
        },
        cenario_pj: {
            irpj,
            adicional_irpj: adicionalIrpj,
            csll,
            carga_efetiva_percentual: cargaEfetivaPj,
            rendimento_liquido: rendimentoLiquidoPj,
        },
        diferenca_percentual_pj_mais_caro: diferencaPercentual,
    };
}
function formatBRL(n) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(n);
}
function round2(n) {
    return Math.round(n * 100) / 100;
}
