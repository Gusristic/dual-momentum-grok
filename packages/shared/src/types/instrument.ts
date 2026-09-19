/** Instrument types — shared between frontend and backend */

export type VerificationSource =
  | 'openfigi'
  | 'cnmv'
  | 'morningstar'
  | 'quefondos'
  | 'ft'
  | 'yahoo'
  | 'manual';

export interface Instrument {
  isin: string;
  name: string | null;
  issuer: string | null;
  ter: number | null;
  category: string | null;
  currency: string | null;
  is_ucits: boolean | null;
  is_etf: boolean | null;
  is_accumulating: boolean | null;
  /** true solo si CNMV/QueFondos confirman traspasabilidad art. 94 LIRPF */
  cn_cmv_traspassable: boolean | null;
  figi: string | null;
  verified: boolean;
  verified_at: string | null;
  verification_source: VerificationSource | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Resultado de validación en tiempo real */
export interface IsinValidationResult {
  isin: string;
  status: 'VERIFIED' | 'NO_VERIFICADO' | 'ERROR';
  instrument: Partial<Instrument> | null;
  errors: string[];
  sources_tried: string[];
}
