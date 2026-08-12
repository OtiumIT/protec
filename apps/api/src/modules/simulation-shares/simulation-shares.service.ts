import { randomBytes, createHash } from 'crypto';
import { query } from '../../db/client';
import { AppError } from '../../shared/utils/error-handler';

type SimulationType = 'in_2306' | 'irpf_alta_renda' | 'distribuicao_lucros' | 'locacao_pf_pj' | 'ganho_capital_imovel' | 'comparativo_regimes' | 'precificador' | 'split_payment';

const TABLE_MAP: Record<SimulationType, { table: string; cols: string }> = {
  in_2306: {
    table: 'in_2306_simulations',
    cols: 'id, ano, input_data, result_data, title, created_at',
  },
  irpf_alta_renda: {
    table: 'irpf_alta_renda',
    cols: `id, ano, contribuinte_nome, rendimentos_tributaveis, dados_dividendos, base_calculo_combinada, resultado_simulacao, title, created_at`,
  },
  distribuicao_lucros: {
    table: 'distribuicao_lucros_simulations',
    cols: 'id, ano, input_data, result_data, title, created_at',
  },
  locacao_pf_pj: {
    table: 'property_simulations',
    cols: 'id, ano, simulation_kind, input_data, result_data, title, created_at',
  },
  ganho_capital_imovel: {
    table: 'property_simulations',
    cols: 'id, ano, simulation_kind, input_data, result_data, title, created_at',
  },
  comparativo_regimes: {
    table: 'comparativo_regimes_simulations',
    cols: 'id, ano, input_data, result_data, title, created_at',
  },
  precificador: {
    table: 'precificador_simulations',
    cols: 'id, input_data, result_data, title, created_at',
  },
  split_payment: {
    table: 'split_payment_simulations',
    cols: 'id, input_data, result_data, title, created_at',
  },
};

export class SimulationSharesService {
  async createShare(
    data: { simulation_type: SimulationType; simulation_id: string; title?: string; expires_in_days?: number },
    companyId: string,
    userId?: string,
  ) {
    const mapping = TABLE_MAP[data.simulation_type];
    if (!mapping) throw new AppError('Tipo de simulação inválido', 'INVALID_TYPE', 400);

    const simResult = await query(
      `SELECT ${mapping.cols} FROM ${mapping.table} WHERE id = $1`,
      [data.simulation_id],
    );
    if (!simResult.rows[0]) throw new AppError('Simulação não encontrada', 'NOT_FOUND', 404);

    const snapshot = simResult.rows[0];
    const rawToken = randomBytes(24).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresInDays = data.expires_in_days ?? 30;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO simulation_shares
        (simulation_type, simulation_id, snapshot_data, token_hash, title, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [data.simulation_type, data.simulation_id, JSON.stringify(snapshot), tokenHash, data.title ?? snapshot.title ?? null, expiresAt, userId ?? null],
    );

    await query(
      `INSERT INTO public.simulation_share_tokens_generic (token_hash, company_id, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (token_hash) DO NOTHING`,
      [tokenHash, companyId, expiresAt],
    );

    return { token: rawToken, expires_at: expiresAt.toISOString() };
  }

  async getPublicShare(tokenHash: string) {
    const shareResult = await query<{
      id: string; simulation_type: string; snapshot_data: Record<string, unknown>;
      title: string | null; revoked_at: Date | null; expires_at: Date;
    }>(
      `SELECT id, simulation_type, snapshot_data, title, revoked_at, expires_at
       FROM simulation_shares WHERE token_hash = $1`,
      [tokenHash],
    );
    const share = shareResult.rows[0];
    if (!share) throw new AppError('Link inválido', 'SHARE_NOT_FOUND', 404);
    if (share.revoked_at) throw new AppError('Este link foi revogado', 'SHARE_REVOKED', 403);
    if (new Date(share.expires_at).getTime() < Date.now()) {
      throw new AppError('Este link expirou', 'SHARE_EXPIRED', 403);
    }

    await query(
      `UPDATE simulation_shares SET access_count = access_count + 1 WHERE token_hash = $1`,
      [tokenHash],
    );

    return {
      simulation_type: share.simulation_type,
      snapshot: share.snapshot_data,
      title: share.title,
    };
  }
}
