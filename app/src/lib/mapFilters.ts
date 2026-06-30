// Expressões de filtro e leitura de features das camadas do dashboard.
// No modo tiles não há FeatureCollection em memória, então filtros de
// localização e seleção viram expressões aplicadas direto nas layers MVT.
import { parseSegregationProperties } from '@/lib/segregation';
import type { LocationLookups } from '@/hooks/useLocationLookups';
import type {
	LayerId,
	LocationFilter,
	SelectedGeometryInfo,
} from '@/types/dashboard.types';
import type { FilterSpecification, MapGeoJSONFeature } from 'maplibre-gl';

export function resolveAllowedMunis(
	filter: LocationFilter,
	lookups: LocationLookups,
	opcoes?: { expandirMuniParaRm?: boolean },
): Set<string> | null {
	if (filter.scope === 'municipio') {
		// Município dentro de RM: na camada de setores plota-se a RM
		// inteira (o município ganha contorno de destaque em outra layer).
		if (opcoes?.expandirMuniParaRm) {
			const nameMetro = lookups.muniInfo.get(filter.code)?.name_metro;
			if (nameMetro) {
				return (
					lookups.rmToMunis.get(nameMetro) ?? new Set([filter.code])
				);
			}
		}
		return new Set([filter.code]);
	}
	if (filter.scope === 'estado') {
		return lookups.estadoToMunis.get(filter.code) ?? new Set();
	}
	if (filter.scope === 'reg_metro') {
		return lookups.rmToMunis.get(filter.code) ?? new Set();
	}
	return null;
}

// Contorno destacado do município selecionado, desenhado sobre a fonte de
// MUNICÍPIOS (um polígono por município) — não sobre setores. Assim a borda
// forte fica só no perímetro do município, em vez de contornar cada setor (o
// que polui a visualização em zooms altos). Ativa sempre que a camada de
// setores está filtrada por um município. code_muni é numérico no MVT.
export function buildMuniBoundaryFilter(
	layerId: LayerId,
	locationFilter: LocationFilter | null,
): FilterSpecification {
	if (
		layerId !== 'setores' ||
		!locationFilter ||
		locationFilter.scope !== 'municipio'
	) {
		return ['boolean', false];
	}
	return ['==', ['get', 'code_muni'], Number(locationFilter.code)];
}

// Filtro de localizacao aplicado direto na layer MVT (nao ha FeatureCollection
// para filtrar em JS quando a fonte e vetorial). Setores/municipios filtram por
// code_muni (inteiro no MVT); RM filtra por name_metro (string).
export function buildTileLocationFilter(
	layerId: LayerId,
	locationFilter: LocationFilter | null,
	lookups: LocationLookups,
): FilterSpecification | undefined {
	if (!locationFilter) return undefined;

	if (layerId === 'regioes-metropolitanas') {
		if (locationFilter.scope === 'reg_metro') {
			return ['==', ['get', 'name_metro'], locationFilter.code];
		}
		if (locationFilter.scope === 'estado') {
			// Mantem RMs com pelo menos um municipio no estado.
			const allowed =
				lookups.estadoToMunis.get(locationFilter.code) ?? new Set();
			const rms = [...lookups.rmToMunis.entries()]
				.filter(([, munis]) =>
					[...munis].some((muni) => allowed.has(muni)),
				)
				.map(([rm]) => rm);
			if (rms.length === 0) return ['boolean', false];
			return ['match', ['get', 'name_metro'], rms, true, false];
		}
		return undefined;
	}

	const allowed = resolveAllowedMunis(locationFilter, lookups, {
		expandirMuniParaRm: layerId === 'setores',
	});
	if (allowed === null) return undefined;

	const codes = [...allowed]
		.map((code) => Number(code))
		.filter((code) => Number.isFinite(code));

	if (codes.length === 0) {
		// Nenhum municipio compativel: nao renderiza nenhuma geometria.
		return ['boolean', false];
	}

	return ['match', ['get', 'code_muni'], codes, true, false];
}

// Realce da geometria selecionada via filtro na propria fonte vetorial
// (sem GeoJSON em memoria, nao da para extrair a feature como antes).
export function buildTileSelectionFilter(
	layerId: LayerId,
	selectedGeometry: SelectedGeometryInfo | null,
): FilterSpecification {
	if (!selectedGeometry) return ['boolean', false];
	const { properties } = selectedGeometry;

	if (layerId === 'setores' && properties.code_tract) {
		return ['==', ['get', 'cod_setor'], Number(properties.code_tract)];
	}
	if (layerId === 'municipios' && properties.code_muni) {
		return ['==', ['get', 'code_muni'], Number(properties.code_muni)];
	}
	if (layerId === 'regioes-metropolitanas' && properties.name_metro) {
		return ['==', ['get', 'name_metro'], properties.name_metro];
	}
	return ['boolean', false];
}

export function getFeatureId(
	feature: MapGeoJSONFeature,
): number | string | null {
	if (typeof feature.id === 'number' || typeof feature.id === 'string') {
		return feature.id;
	}

	const fallback =
		feature.properties?.code_tract ??
		feature.properties?.cod_setor ??
		feature.properties?.code_muni ??
		feature.properties?.name_metro;

	if (typeof fallback === 'number' || typeof fallback === 'string') {
		return fallback;
	}

	return null;
}

export function getSelectedInfo(
	feature: MapGeoJSONFeature,
	layerLabel: string,
): SelectedGeometryInfo {
	return {
		layerLabel,
		properties: parseSegregationProperties(
			(feature.properties ?? {}) as Record<string, unknown>,
		),
	};
}

// Mapeia o filtro de localização para o query param do tile de setores
// (filtragem server-side). RM e município-em-RM plotam a RM inteira (param
// `metro`); município isolado usa `codMunicipio`. Estado não se aplica a setores.
export function buildSetoresTileFilterParam(
	locationFilter: LocationFilter | null,
	lookups: LocationLookups,
): Record<string, string> | null {
	if (!locationFilter) return null;

	if (locationFilter.scope === 'reg_metro') {
		return { metro: locationFilter.code };
	}

	if (locationFilter.scope === 'municipio') {
		const nameMetro = lookups.muniInfo.get(locationFilter.code)?.name_metro;
		if (nameMetro) return { metro: nameMetro };
		return { codMunicipio: locationFilter.code };
	}

	return null;
}
