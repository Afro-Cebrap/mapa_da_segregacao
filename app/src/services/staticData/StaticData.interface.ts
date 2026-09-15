import type { RankingIndicadoresRow } from '@/services/setores/Setores.interface';

export type SetoresScope = 'reg_metro' | 'municipio';

export type MetroSlugIndex = Record<string, string>;

export interface SetoresScopePayload {
	// One entry per metric in the pipeline's SCALE_METRICS; null when the
	// scope had no usable values for that metric.
	breaks: Record<string, [number, number, number, number] | null>;
	rows: RankingIndicadoresRow[];
}
