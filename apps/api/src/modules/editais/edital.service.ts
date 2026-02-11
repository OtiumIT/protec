import { EditalRepository, type CreateEditalData, type UpdateEditalData } from './edital.repository';
import { AppError } from '../../shared/utils/error-handler';

export class EditalService {
  constructor(private editalRepo: EditalRepository) {}

  /**
   * Listar editais
   */
  async list(options: {
    modality?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    return this.editalRepo.list(options);
  }

  /**
   * Buscar edital por ID
   */
  async findById(id: string) {
    const edital = await this.editalRepo.findById(id);
    if (!edital) {
      throw new AppError('Edital not found', 'EDITAL_NOT_FOUND', 404);
    }
    return edital;
  }

  /**
   * Buscar edital por código
   */
  async findByCode(code: string) {
    const edital = await this.editalRepo.findByCode(code);
    if (!edital) {
      throw new AppError('Edital not found', 'EDITAL_NOT_FOUND', 404);
    }
    return edital;
  }

  /**
   * Criar novo edital
   */
  async create(data: CreateEditalData, userId?: string) {
    // Verificar se código já existe
    const existing = await this.editalRepo.findByCode(data.code);
    if (existing) {
      throw new AppError('Edital with this code already exists', 'EDITAL_CODE_EXISTS', 400);
    }

    return this.editalRepo.create({
      ...data,
      created_by: userId,
    });
  }

  /**
   * Atualizar edital
   */
  async update(id: string, data: UpdateEditalData) {
    const edital = await this.editalRepo.findById(id);
    if (!edital) {
      throw new AppError('Edital not found', 'EDITAL_NOT_FOUND', 404);
    }

    return this.editalRepo.update(id, data);
  }

  /**
   * Deletar edital
   */
  async delete(id: string) {
    const edital = await this.editalRepo.findById(id);
    if (!edital) {
      throw new AppError('Edital not found', 'EDITAL_NOT_FOUND', 404);
    }

    const deleted = await this.editalRepo.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete edital', 'DELETE_FAILED', 500);
    }

    return { success: true };
  }

  /**
   * Buscar editais ativos
   */
  async findActive(date?: string) {
    return this.editalRepo.findActive(date);
  }
}
