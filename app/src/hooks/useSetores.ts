import { useQuery } from '@tanstack/react-query';

import { staticDataService } from '@/services/staticData/client';
import type { CensusYear, MetricType } from '@/types/dashboard.types';

// The slug index is tiny and cached for the session; every scope lookup
// needs it, so it is fetched once per year rather than per scope.
export function useMetroSlugs(year: CensusYear) {
	return useQuery({
		queryKey: ['static', 'metro-slugs', year],
		queryFn: () => staticDataService.fetchMetroSlugs(year),
		staleTime: Infinity,
	});
}

// One scope file serves both the ranking rows and the scale breaks, so a
// single query owns it and both consumers read this cache entry.
export function useSetoresScope(
	escopo: 'reg_metro' | 'municipio' | null,
	codigo: string | null,
	year: CensusYear,
) {
	const { data: slugIndex } = useMetroSlugs(year);
	const metroSlugs = slugIndex?.metro ?? {};
	const ready = Boolean(escopo && codigo && slugIndex);

	return useQuery({
		queryKey: ['static', 'setores-scope', escopo, codigo, year],
		queryFn: () =>
			staticDataService.fetchSetoresScope(escopo!, codigo!, year, metroSlugs),
		enabled: ready,
		staleTime: 1000 * 60 * 60 * 24,
	});
}

export function useEscalaSetores(
	metrica: MetricType | null,
	escopo: 'reg_metro' | 'municipio' | null,
	codigo: string | null,
	year: CensusYear,
) {
	const scopeQuery = useSetoresScope(escopo, codigo, year);
	const breaks = metrica ? scopeQuery.data?.breaks[metrica] : undefined;

	// Preserves the previous contract: undefined until resolved, and undefined
	// when the scope has no usable values (the old endpoint answered 404).
	return { ...scopeQuery, data: breaks ?? undefined };
}
