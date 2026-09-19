/** Model types — Dual Momentum */

export type ModelType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

export type AbsFilterVariant = 'all' | '12m_only' | 'majority';

export type RankingBasis = 'composite' | '12m';

export interface ModelHParams {
  w12: number;
  w6: number;
  w3: number;
  abs_filter: AbsFilterVariant;
  ranking_basis: RankingBasis;
  rotation_threshold: number; // 0.005 = 0.5%
}

/** Defaults confirmados por el usuario */
export const MODEL_H_DEFAULTS: ModelHParams = {
  w12: 0.5,
  w6: 0.3,
  w3: 0.2,
  abs_filter: 'all',
  ranking_basis: 'composite',
  rotation_threshold: 0.005,
};

export interface Model {
  id: string;
  user_id: string;
  name: string;
  type: ModelType;
  params: ModelHParams | Record<string, unknown>;
  /** ISINs introducidos por el usuario */
  universe: string[];
  /** ISIN de cash (puerto seguro). Obligatorio para filtro absoluto. */
  cash_isin: string | null;
  created_at: string;
  updated_at: string;
}
