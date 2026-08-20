import { AtividadeImobiliariaRepository } from './atividade-imobiliaria.repository';
import { AppError } from '../../shared/utils/error-handler';
import type {
  RealEstateDevelopment,
  RealEstateUnit,
  DevelopmentIntegrity,
  CreateDevelopmentInput,
  UpdateDevelopmentInput,
  CreateUnitInput,
  UpdateUnitInput,
  ListDevelopmentsQuery,
} from '@shared/core';

export class AtividadeImobiliariaService {
  constructor(private repo: AtividadeImobiliariaRepository) {}

  // ========================================================================
  // Empreendimentos
  // ========================================================================

  async createDevelopment(data: CreateDevelopmentInput): Promise<RealEstateDevelopment> {
    if (await this.repo.codigoExists(data.codigo)) {
      throw new AppError('Código de empreendimento já existe', 'DEVELOPMENT_CODE_EXISTS', 409);
    }
    return this.repo.createDevelopment(data as Record<string, unknown>);
  }

  async listDevelopments(query: ListDevelopmentsQuery): Promise<{ developments: RealEstateDevelopment[]; total: number }> {
    const { rows, total } = await this.repo.listDevelopments({
      status: query.status,
      search: query.search,
      page: query.page,
      limit: query.limit,
    });
    return { developments: rows, total };
  }

  async getDevelopment(id: string): Promise<RealEstateDevelopment> {
    const dev = await this.repo.getDevelopment(id);
    if (!dev) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);
    const integrity = await this.repo.getIntegrity(id);
    return { ...dev, integrity };
  }

  async updateDevelopment(id: string, data: UpdateDevelopmentInput): Promise<RealEstateDevelopment> {
    const existing = await this.repo.getDevelopment(id);
    if (!existing) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);

    if (data.codigo && data.codigo !== existing.codigo) {
      if (await this.repo.codigoExists(data.codigo, id)) {
        throw new AppError('Código de empreendimento já existe', 'DEVELOPMENT_CODE_EXISTS', 409);
      }
    }

    if (data.status === 'ativo' && existing.status !== 'ativo') {
      const integrity = await this.repo.getIntegrity(id);
      if (!integrity.area_ok) {
        throw new AppError(
          `Não é possível ativar: diferença de área = ${integrity.area_diff} m². A soma das unidades deve fechar com a área total.`,
          'INTEGRITY_AREA_MISMATCH',
          422,
        );
      }
    }

    const updated = await this.repo.updateDevelopment(id, data as Record<string, unknown>);
    if (!updated) throw new AppError('Falha ao atualizar', 'UPDATE_FAILED', 500);
    return updated;
  }

  async deleteDevelopment(id: string): Promise<void> {
    const dev = await this.repo.getDevelopment(id);
    if (!dev) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);
    await this.repo.deleteDevelopment(id);
  }

  // ========================================================================
  // Unidades
  // ========================================================================

  async createUnit(developmentId: string, data: CreateUnitInput): Promise<RealEstateUnit> {
    await this.assertDevelopment(developmentId);
    if (await this.repo.unitCodigoExists(developmentId, data.codigo)) {
      throw new AppError('Código de unidade já existe neste empreendimento', 'UNIT_CODE_EXISTS', 409);
    }
    return this.repo.createUnit(developmentId, data as Record<string, unknown>);
  }

  async createUnitsBatch(developmentId: string, units: CreateUnitInput[]): Promise<RealEstateUnit[]> {
    await this.assertDevelopment(developmentId);

    const codigos = units.map((u) => u.codigo);
    const unique = new Set(codigos);
    if (unique.size !== codigos.length) {
      throw new AppError('Códigos de unidade duplicados no lote', 'UNIT_BATCH_DUPLICATE', 422);
    }

    for (const u of units) {
      if (await this.repo.unitCodigoExists(developmentId, u.codigo)) {
        throw new AppError(`Código "${u.codigo}" já existe neste empreendimento`, 'UNIT_CODE_EXISTS', 409);
      }
    }

    return this.repo.createUnitsBatch(developmentId, units as Array<Record<string, unknown>>);
  }

  async listUnits(developmentId: string): Promise<RealEstateUnit[]> {
    await this.assertDevelopment(developmentId);
    return this.repo.listUnits(developmentId);
  }

  async updateUnit(unitId: string, data: UpdateUnitInput): Promise<RealEstateUnit> {
    const unit = await this.repo.getUnit(unitId);
    if (!unit) throw new AppError('Unidade não encontrada', 'UNIT_NOT_FOUND', 404);

    if (data.codigo && data.codigo !== unit.codigo) {
      if (await this.repo.unitCodigoExists(unit.development_id, data.codigo, unitId)) {
        throw new AppError('Código de unidade já existe neste empreendimento', 'UNIT_CODE_EXISTS', 409);
      }
    }

    const updated = await this.repo.updateUnit(unitId, data as Record<string, unknown>);
    if (!updated) throw new AppError('Falha ao atualizar unidade', 'UPDATE_FAILED', 500);
    return updated;
  }

  async deleteUnit(unitId: string): Promise<void> {
    const unit = await this.repo.getUnit(unitId);
    if (!unit) throw new AppError('Unidade não encontrada', 'UNIT_NOT_FOUND', 404);
    await this.repo.deleteUnit(unitId);
  }

  // ========================================================================
  // Integridade
  // ========================================================================

  async getIntegrity(developmentId: string): Promise<DevelopmentIntegrity> {
    await this.assertDevelopment(developmentId);
    return this.repo.getIntegrity(developmentId);
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  private async assertDevelopment(id: string): Promise<void> {
    const dev = await this.repo.getDevelopment(id);
    if (!dev) throw new AppError('Empreendimento não encontrado', 'DEVELOPMENT_NOT_FOUND', 404);
  }
}
