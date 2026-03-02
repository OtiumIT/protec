import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Plan } from '@shared/core';
export declare class PlanRepository extends BaseRepository {
    findById(id: string): Promise<Plan | null>;
    findAll(): Promise<Plan[]>;
}
//# sourceMappingURL=plan.repository.d.ts.map