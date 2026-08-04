import { MapeamentoDespesasPjRepository } from './mapeamento-despesas-pj.repository';
import { ClientRepository } from '../clients/client.repository';
import { AppError } from '../../shared/utils/error-handler';
import { runExpenseMapping } from './classification-engine';
import { RULES_VERSION, getActiveCatalog } from './catalog';
import type {
  AnalyzeExpenseMappingInput,
  CreateDiagnosisInput,
  UpdateDiagnosisInput,
  ExpenseMappingResult,
  DiagnosisContext,
  ExpenseItemAnswer,
} from '@shared/core';

export class MapeamentoDespesasPjService {
  constructor(
    private repo: MapeamentoDespesasPjRepository,
    private clientRepo: ClientRepository
  ) {}

  private async assertClient(clientId: string): Promise<void> {
    const client = await this.clientRepo.findById(clientId);
    if (!client) throw new AppError('Cliente não encontrado', 'CLIENT_NOT_FOUND', 404);
  }

  getCatalog() { return getActiveCatalog(); }

  /** Calcula sem persistir. */
  analyze(input: AnalyzeExpenseMappingInput): ExpenseMappingResult {
    return runExpenseMapping({ context: input.context, items: input.items });
  }

  async createDiagnosis(input: CreateDiagnosisInput, userId?: string) {
    await this.assertClient(input.context.client_id);
    const result = runExpenseMapping({ context: input.context, items: input.items });

    const diagnosis = await this.repo.createDiagnosis({
      client_id: input.context.client_id,
      title: input.context.title ?? null,
      reference_year: input.context.reference_year,
      activity: input.context.activity ?? null,
      tax_regime: input.context.tax_regime,
      ibs_cbs_treatment: input.context.ibs_cbs_treatment,
      objective: input.context.objective ?? null,
      reviewer_user_id: input.context.reviewer_user_id ?? null,
      status: 'draft',
      rules_version: RULES_VERSION,
      totals: result.totals,
      created_by: userId ?? null,
    });

    await this.repo.replaceItems(diagnosis.id, result.items);
    await this.repo.replaceAnswers(diagnosis.id, RULES_VERSION, input.answers ?? []);
    await this.repo.audit(diagnosis.id, 'diagnosis', diagnosis.id, 'create', userId ?? null, null, { totals: result.totals });

    return this.getDiagnosisFull(diagnosis.id);
  }

  async getDiagnosisFull(id: string) {
    const diagnosis = await this.repo.getDiagnosis(id);
    if (!diagnosis) throw new AppError('Diagnóstico não encontrado', 'DIAGNOSIS_NOT_FOUND', 404);
    const [items, answers, pendencies, evidence] = await Promise.all([
      this.repo.listItems(id),
      this.repo.listAnswers(id),
      this.repo.listPendencies(id),
      this.repo.listEvidence(id),
    ]);
    return { diagnosis, items, answers, pendencies, evidence };
  }

  list(filters: { client_id?: string; reference_year?: number; status?: string; page: number; limit: number }) {
    return this.repo.listDiagnoses(filters);
  }

  async updateDiagnosis(id: string, input: UpdateDiagnosisInput, userId?: string) {
    const existing = await this.repo.getDiagnosis(id);
    if (!existing) throw new AppError('Diagnóstico não encontrado', 'DIAGNOSIS_NOT_FOUND', 404);
    if (existing.status === 'completed') {
      throw new AppError('Diagnóstico concluído. Reabra antes de editar.', 'DIAGNOSIS_LOCKED', 409);
    }

    // Recompor contexto + itens efetivos
    const mergedContext: DiagnosisContext = {
      client_id: input.context?.client_id ?? existing.client_id,
      title: input.context?.title ?? existing.title,
      reference_year: input.context?.reference_year ?? existing.reference_year,
      activity: input.context?.activity ?? existing.activity,
      tax_regime: (input.context?.tax_regime ?? existing.tax_regime) as DiagnosisContext['tax_regime'],
      ibs_cbs_treatment: (input.context?.ibs_cbs_treatment ?? existing.ibs_cbs_treatment) as DiagnosisContext['ibs_cbs_treatment'],
      objective: input.context?.objective ?? existing.objective,
      reviewer_user_id: input.context?.reviewer_user_id ?? existing.reviewer_user_id,
    };

    let result: ExpenseMappingResult | null = null;
    if (input.items) {
      result = runExpenseMapping({ context: mergedContext, items: input.items as ExpenseItemAnswer[] });
      await this.repo.replaceItems(id, result.items);
    }
    if (input.answers) {
      await this.repo.replaceAnswers(id, RULES_VERSION, input.answers);
    }

    await this.repo.updateDiagnosis(id, {
      title: mergedContext.title,
      reference_year: mergedContext.reference_year,
      activity: mergedContext.activity,
      tax_regime: mergedContext.tax_regime,
      ibs_cbs_treatment: mergedContext.ibs_cbs_treatment,
      objective: mergedContext.objective,
      reviewer_user_id: mergedContext.reviewer_user_id,
      status: input.status ?? existing.status,
      updated_by: userId ?? null,
      ...(result ? { totals: result.totals } : {}),
    });
    await this.repo.audit(id, 'diagnosis', id, 'update', userId ?? null, { status: existing.status }, { status: input.status ?? existing.status });

    return this.getDiagnosisFull(id);
  }

  /** Congela o resultado (snapshot imutável) e marca como concluído. */
  async complete(id: string, userId?: string) {
    const existing = await this.repo.getDiagnosis(id);
    if (!existing) throw new AppError('Diagnóstico não encontrado', 'DIAGNOSIS_NOT_FOUND', 404);
    const items = await this.repo.listItems(id);

    const context: DiagnosisContext = {
      client_id: existing.client_id,
      title: existing.title,
      reference_year: existing.reference_year,
      activity: existing.activity,
      tax_regime: existing.tax_regime as DiagnosisContext['tax_regime'],
      ibs_cbs_treatment: existing.ibs_cbs_treatment as DiagnosisContext['ibs_cbs_treatment'],
      objective: existing.objective,
      reviewer_user_id: existing.reviewer_user_id,
    };
    // Reconstitui itens de entrada a partir dos itens classificados para reproduzir o snapshot
    const snapshot: ExpenseMappingResult = {
      reference_year: existing.reference_year,
      rules_version: existing.rules_version,
      tax_regime: existing.tax_regime,
      ibs_cbs_treatment: existing.ibs_cbs_treatment,
      totals: existing.totals as ExpenseMappingResult['totals'],
      matriz: {
        priorizar: items.filter((i: any) => i.pf_pj_lens === 'migrate' && i.credit_lens === 'potential').map((i: any) => i.label),
        organizar: items.filter((i: any) => i.pf_pj_lens === 'migrate' && i.credit_lens !== 'potential').map((i: any) => i.label),
        corrigir_antes: items.filter((i: any) => i.pf_pj_lens === 'organize' || i.pf_pj_lens === 'defer').map((i: any) => i.label),
        evitar: items.filter((i: any) => i.pf_pj_lens === 'avoid').map((i: any) => i.label),
      },
      items: items as any,
      alertas: [],
      disclaimer: 'Snapshot congelado na conclusão. Não é parecer; não autoriza crédito automático.',
    };

    await this.repo.updateDiagnosis(id, {
      status: 'completed',
      result_snapshot: snapshot,
      completed_at: new Date().toISOString(),
      completed_by: userId ?? null,
    });
    await this.repo.audit(id, 'diagnosis', id, 'complete', userId ?? null, { status: existing.status }, { status: 'completed' });
    void context;
    return this.getDiagnosisFull(id);
  }

  async reopen(id: string, userId?: string) {
    const existing = await this.repo.getDiagnosis(id);
    if (!existing) throw new AppError('Diagnóstico não encontrado', 'DIAGNOSIS_NOT_FOUND', 404);
    await this.repo.updateDiagnosis(id, { status: 'in_review', completed_at: null });
    await this.repo.audit(id, 'diagnosis', id, 'reopen', userId ?? null, { status: existing.status }, { status: 'in_review' });
    return this.getDiagnosisFull(id);
  }

  async delete(id: string, userId?: string) {
    const existing = await this.repo.getDiagnosis(id);
    if (!existing) throw new AppError('Diagnóstico não encontrado', 'DIAGNOSIS_NOT_FOUND', 404);
    await this.repo.audit(null, 'diagnosis', id, 'delete', userId ?? null, { client_id: existing.client_id }, null);
    await this.repo.deleteDiagnosis(id);
  }

  // ---- Pendências ----
  async createPendency(diagnosisId: string, data: any, userId?: string) {
    await this.getDiagnosisFull(diagnosisId);
    return this.repo.createPendency(diagnosisId, data, userId ?? null);
  }
  listPendencies(diagnosisId: string) { return this.repo.listPendencies(diagnosisId); }
  updatePendency(id: string, data: any) { return this.repo.updatePendency(id, data); }
  deletePendency(id: string) { return this.repo.deletePendency(id); }

  // ---- Evidências ----
  async createEvidence(diagnosisId: string, data: any, userId?: string) {
    await this.getDiagnosisFull(diagnosisId);
    const evidence = await this.repo.createEvidence(diagnosisId, data, userId ?? null);
    return { evidence, integration_status: 'em_criacao' as const, message: 'Evidência registrada. O armazenamento do arquivo está em criação.' };
  }
  listEvidence(diagnosisId: string) { return this.repo.listEvidence(diagnosisId); }
  deleteEvidence(id: string) { return this.repo.deleteEvidence(id); }

  // ---- Importação documental (stub) ----
  async createImportBatch(diagnosisId: string | null, data: any, userId?: string) {
    const batch = await this.repo.createImportBatch(diagnosisId, data, userId ?? null);
    return { batch, integration_status: 'em_criacao' as const, message: 'Lote de importação criado. O processamento/OCR está em criação.' };
  }
  listImportBatches(diagnosisId?: string) { return this.repo.listImportBatches(diagnosisId); }

  // ---- Auditoria e dashboard ----
  listAudit(diagnosisId: string) { return this.repo.listAudit(diagnosisId); }
  getDashboard() { return this.repo.getPortfolioSummary(); }
}
