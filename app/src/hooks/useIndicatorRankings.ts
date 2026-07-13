import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LAYERS_CONFIG } from '@/constants/layers';
import { setoresService } from '@/services/setores/Setores.services';
import { useLocationLookups } from '@/hooks/useLocationLookups';
import { resolveAllowedMunis } from '@/lib/mapFilters';
import type {
	RankingIndicadoresRow,
	SegregationProperties,
} from '@/services/setores/Setores.interface';
import type {
	CensusYear,
	LayerId,
	LocationFilter,
} from '@/types/dashboard.types';

export type RankedMetric =
	| 'dissimilarity'
	| 'index_h'
	| 'exp_branca_pp'
	| 'exp_pp_branca'
	| 'iso_pp_pp'
	| 'iso_branca_branca';

export const RANKED_METRICS: {
	key: RankedMetric;
	label: string;
	title?: string;
}[] = [
	{ key: 'dissimilarity', label: 'Dissimilaridade' },
	{ key: 'index_h', label: 'Index H' },
	{
		key: 'exp_branca_pp',
		label: 'Exp | B - PP',
		title: 'Exposição Branca a Preta/Parda',
	},
	{
		key: 'exp_pp_branca',
		label: 'Exp | PP - B',
		title: 'Exposição Preta/Parda a Branca',
	},
	{
		key: 'iso_pp_pp',
		label: 'Iso | PP - PP',
		title: 'Isolamento Preta/Parda',
	},
	{
		key: 'iso_branca_branca',
		label: 'Iso | B - B',
		title: 'Isolamento Branca',
	},
];

export interface IndicatorRank {
	rank: number;
	total: number;
	value: number | null;
}

export interface MetricStats {
	min: number;
	max: number;
	mean: number;
}

export type RankingsByMetric = Record<RankedMetric, IndicatorRank | null>;
export type StatsByMetric = Record<RankedMetric, MetricStats | null>;

function getEntityKey(
	props: RankingIndicadoresRow,
	layerId: LayerId,
): string | null {
	if (layerId === 'setores') return props.code_tract;
	if (layerId === 'municipios') return props.code_muni;
	if (layerId === 'regioes-metropolitanas') return props.name_metro;
	return null;
}

function emptyStats(): StatsByMetric {
	return {
		dissimilarity: null,
		index_h: null,
		exp_branca_pp: null,
		exp_pp_branca: null,
		iso_pp_pp: null,
		iso_branca_branca: null,
	};
}

function computeRankings(
	rows: RankingIndicadoresRow[],
	layerId: LayerId,
): { rankings: Map<string, RankingsByMetric>; stats: StatsByMetric } {
	const byKey = new Map<string, RankingsByMetric>();
	const stats: StatsByMetric = emptyStats();

	for (const metric of RANKED_METRICS) {
		const entries: { key: string; value: number }[] = [];
		for (const row of rows) {
			const key = getEntityKey(row, layerId);
			if (!key) continue;
			const raw = row[metric.key];
			if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
			entries.push({ key, value: raw });
		}
		entries.sort((a, b) => b.value - a.value);

		const total = entries.length;
		if (total > 0) {
			let sum = 0;
			let min = Infinity;
			let max = -Infinity;
			for (const entry of entries) {
				sum += entry.value;
				if (entry.value < min) min = entry.value;
				if (entry.value > max) max = entry.value;
			}
			stats[metric.key] = { min, max, mean: sum / total };
		}

		let lastValue: number | null = null;
		let lastRank = 0;
		entries.forEach((entry, i) => {
			const rank = entry.value === lastValue ? lastRank : i + 1;
			lastValue = entry.value;
			lastRank = rank;

			let bucket = byKey.get(entry.key);
			if (!bucket) {
				bucket = {
					dissimilarity: null,
					index_h: null,
					exp_branca_pp: null,
					exp_pp_branca: null,
					iso_pp_pp: null,
					iso_branca_branca: null,
				};
				byKey.set(entry.key, bucket);
			}
			bucket[metric.key] = { rank, total, value: entry.value };
		});
	}

	return { rankings: byKey, stats };
}

export function isRankedMetric(metric: string): metric is RankedMetric {
	return RANKED_METRICS.some((m) => m.key === metric);
}

// Posição da localidade por tercis do escopo atual (percentis 33,33/66,66).
// O ranking é ordenado do maior para o menor valor (rank 1 = maior), então o
// primeiro terço do ranking é "Alto" e o último terço é "Baixo".
export function classifyPosition(
	rank: IndicatorRank | null,
): 'Baixo' | 'Médio' | 'Alto' | null {
	if (!rank || rank.total <= 0) return null;
	const fracao = rank.rank / rank.total;
	if (fracao <= 1 / 3) return 'Alto';
	if (fracao <= 2 / 3) return 'Médio';
	return 'Baixo';
}

// Rótulo do escopo ("nível") do ranking: Brasil, RM, Município ou o nome da
// localidade filtrada. Compartilhado entre a sidebar (PlaceDetails) e o
// tooltip de hover do mapa (MapPopup).
export function useLevelLabel(
	activeLayerId: LayerId,
	locationFilter: LocationFilter | null,
	year: CensusYear,
): string {
	const { data: lookups } = useLocationLookups(year);

	return useMemo(() => {
		if (!locationFilter) return 'Brasil';
		if (activeLayerId === 'setores') {
			let rmName: string | null = null;
			if (locationFilter.scope === 'reg_metro') {
				rmName = locationFilter.name;
			} else if (locationFilter.scope === 'municipio') {
				rmName =
					lookups.muniInfo.get(locationFilter.code)?.name_metro ??
					null;
			}
			return rmName !== null ? 'RM' : 'Município';
		}
		return locationFilter.name;
	}, [activeLayerId, locationFilter, lookups]);
}

export function useIndicatorRankings(
	activeLayerId: LayerId,
	locationFilter: LocationFilter | null,
	year: CensusYear,
): {
	getRankings: (props: SegregationProperties) => RankingsByMetric | null;
	stats: StatsByMetric;
	isLoading: boolean;
	levelLabel: string;
} {
	const endpoint = LAYERS_CONFIG.find(
		(l) => l.id === activeLayerId,
	)?.endpoint;

	const { data: lookups } = useLocationLookups(year);

	// Para setores: resolve o escopo de ranking (RM ou município) antes da
	// requisição, para filtrar no servidor e reduzir o payload de ~316k linhas
	// para apenas os setores do escopo relevante.
	const setoresApiParams = useMemo(() => {
		if (activeLayerId !== 'setores' || !locationFilter) return null;
		if (locationFilter.scope === 'reg_metro') {
			return {
				escopo: 'reg_metro' as const,
				codigo: locationFilter.code,
			};
		}
		if (locationFilter.scope === 'municipio') {
			const info = lookups.muniInfo.get(locationFilter.code);
			if (info?.name_metro) {
				return {
					escopo: 'reg_metro' as const,
					codigo: info.name_metro,
				};
			}
			return {
				escopo: 'municipio' as const,
				codigo: locationFilter.code,
			};
		}
		return null;
	}, [activeLayerId, locationFilter, lookups]);

	const layerQuery = useQuery({
		// Para setores, o escopo faz parte da cache key: cada RM/município tem
		// seu próprio cache entry e não reaproveitará dados de outro escopo.
		queryKey: [
			'layer-ranking',
			endpoint,
			setoresApiParams?.escopo ?? null,
			setoresApiParams?.codigo ?? null,
			year,
		],
		queryFn: () =>
			setoresService.listarIndicadores(
				endpoint!,
				year,
				setoresApiParams?.escopo,
				setoresApiParams?.codigo,
			),
		// Setores só busca quando o escopo está resolvido (locationFilter presente).
		enabled:
			!!endpoint &&
			(activeLayerId !== 'setores' || setoresApiParams !== null),
		staleTime: 1000 * 60 * 60,
	});

	// levelLabel: calculado independente de os dados já terem chegado,
	// para que o cabeçalho mostre o escopo correto mesmo durante o loading.
	const levelLabel = useLevelLabel(activeLayerId, locationFilter, year);

	const { rankings, stats } = useMemo(() => {
		if (!layerQuery.data)
			return {
				rankings: new Map<string, RankingsByMetric>(),
				stats: emptyStats(),
			};

		let rows = layerQuery.data;

		// Setores: o filtro já foi aplicado no servidor via setoresApiParams;
		// não é necessário filtrar novamente no cliente.
		// Demais camadas: filtra client-side por município permitido no escopo.
		if (activeLayerId !== 'setores' && locationFilter) {
			const allowed = resolveAllowedMunis(locationFilter, lookups);
			if (allowed !== null) {
				rows = rows.filter((row) => {
					const codeMuni = row.code_muni;
					return codeMuni ? allowed.has(codeMuni) : false;
				});
			}
		}

		return computeRankings(rows, activeLayerId);
	}, [layerQuery.data, locationFilter, activeLayerId, lookups]);

	return {
		isLoading: layerQuery.isLoading,
		stats,
		levelLabel,
		getRankings: (props) => {
			const key = getEntityKey(props, activeLayerId);
			if (!key) return null;
			return rankings.get(key) ?? null;
		},
	};
}
