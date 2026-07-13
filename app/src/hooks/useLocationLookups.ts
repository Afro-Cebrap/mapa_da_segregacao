import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { setoresService } from '@/services/setores/Setores.services';
import type { MunicipioListaDto } from '@/services/setores/Setores.interface';
import type { Bbox } from '@/lib/geo';
import type { CensusYear } from '@/types/dashboard.types';

export interface LocationLookups {
	// code_state → Set<code_muni>
	estadoToMunis: Map<string, Set<string>>;
	// name_metro → Set<code_muni>
	rmToMunis: Map<string, Set<string>>;
	// code_muni → { code_state, name_metro }
	muniInfo: Map<
		string,
		{ code_state: string | null; name_metro: string | null }
	>;
	// code_muni → bbox [[minLng, minLat], [maxLng, maxLat]] (EPSG:4326)
	muniBounds: Map<string, Bbox>;
	// nomes ordenados alfabeticamente
	municipios: Array<{
		code_muni: string;
		name_muni: string;
		code_state: string | null;
	}>;
	regioesMetropolitanas: Array<{ name_metro: string }>;
}

const EMPTY_LOOKUPS: LocationLookups = {
	estadoToMunis: new Map(),
	rmToMunis: new Map(),
	muniInfo: new Map(),
	muniBounds: new Map(),
	municipios: [],
	regioesMetropolitanas: [],
};

function buildLookups(items: MunicipioListaDto[]): LocationLookups {
	const estadoToMunis = new Map<string, Set<string>>();
	const rmToMunis = new Map<string, Set<string>>();
	const muniInfo = new Map<
		string,
		{ code_state: string | null; name_metro: string | null }
	>();
	const muniBounds = new Map<string, Bbox>();
	const municipios: LocationLookups['municipios'] = [];
	const rmSet = new Set<string>();

	for (const item of items) {
		const codeMuni = item.code_muni;
		if (!codeMuni) continue;

		const codeState = item.code_state;
		const nameMetro = item.name_metro;
		const nameMuni = item.name_muni ?? codeMuni;

		muniInfo.set(codeMuni, {
			code_state: codeState,
			name_metro: nameMetro,
		});

		if (
			item.min_lng != null &&
			item.min_lat != null &&
			item.max_lng != null &&
			item.max_lat != null
		) {
			muniBounds.set(codeMuni, [
				[item.min_lng, item.min_lat],
				[item.max_lng, item.max_lat],
			]);
		}

		municipios.push({
			code_muni: codeMuni,
			name_muni: nameMuni,
			code_state: codeState,
		});

		if (codeState) {
			let bucket = estadoToMunis.get(codeState);
			if (!bucket) {
				bucket = new Set();
				estadoToMunis.set(codeState, bucket);
			}
			bucket.add(codeMuni);
		}

		if (nameMetro) {
			let bucket = rmToMunis.get(nameMetro);
			if (!bucket) {
				bucket = new Set();
				rmToMunis.set(nameMetro, bucket);
			}
			bucket.add(codeMuni);
			rmSet.add(nameMetro);
		}
	}

	municipios.sort((a, b) => a.name_muni.localeCompare(b.name_muni, 'pt-BR'));
	const regioesMetropolitanas = Array.from(rmSet)
		.sort((a, b) => a.localeCompare(b, 'pt-BR'))
		.map((name_metro) => ({ name_metro }));

	return {
		estadoToMunis,
		rmToMunis,
		muniInfo,
		muniBounds,
		municipios,
		regioesMetropolitanas,
	};
}

export function useLocationLookups(year: CensusYear): {
	data: LocationLookups;
	isLoading: boolean;
} {
	const query = useQuery({
		queryKey: ['municipios', 'lista', year],
		queryFn: () => setoresService.listarMunicipiosLista(year),
		staleTime: 1000 * 60 * 60,
	});

	const data = useMemo(() => {
		if (!query.data) return EMPTY_LOOKUPS;
		return buildLookups(query.data);
	}, [query.data]);

	return { data, isLoading: query.isLoading };
}
