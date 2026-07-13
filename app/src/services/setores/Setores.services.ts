import { api } from '@/services/api';
import type {
	RankingIndicadoresRow,
	SegregationDto,
	SegregationFeature,
	SegregationFeatureCollection,
	SegregationProperties,
	SetoresViewportParams,
	MunicipioListaDto,
} from '@/services/setores/Setores.interface';
import type { CensusYear } from '@/types/dashboard.types';

type SegregationEndpoint = 'municipios' | 'setores' | 'reg_metro';

const apiBaseUrl =
	(import.meta.env.VITE_API_URL as string | undefined) ||
	'http://127.0.0.1:8000';

function normalizeBaseUrl(url: string) {
	return url.endsWith('/') ? url.slice(0, -1) : url;
}

function hasGeometry(
	item: SegregationDto,
): item is SegregationDto & { geometry: GeoJSON.Geometry } {
	return item.geometry !== null && item.geometry !== undefined;
}

function normalizeGeometry(item: SegregationDto): SegregationDto {
	if (item.geometry || !item.geom) return item;
	return {
		...item,
		geometry: item.geom,
	};
}

function mapDtoToFeature(
	item: SegregationDto & { geometry: GeoJSON.Geometry },
): SegregationFeature {
	const { geometry, ...propertiesWithGeom } = item;
	const { geom, ...properties } = propertiesWithGeom;
	void geom;
	const id =
		properties.code_tract ??
		properties.code_muni ??
		properties.name_metro ??
		undefined;

	return {
		type: 'Feature',
		id: id ? String(id) : undefined,
		geometry,
		properties: properties as SegregationProperties,
	};
}

export function setoresDtoToFeatureCollection(
	setores: SegregationDto[],
): SegregationFeatureCollection {
	return {
		type: 'FeatureCollection',
		features: setores
			.map(normalizeGeometry)
			.filter(hasGeometry)
			.map(mapDtoToFeature),
	};
}

function serializeBbox([
	minLng,
	minLat,
	maxLng,
	maxLat,
]: SetoresViewportParams['bbox']) {
	return [minLng, minLat, maxLng, maxLat].join(',');
}

export function getSegregationTileUrl(
	endpoint: SegregationEndpoint,
	year: CensusYear,
) {
	return `${normalizeBaseUrl(apiBaseUrl)}/api/${endpoint}/tiles/{z}/{x}/{y}.pbf?year=${year}`;
}

export const setoresService = {
	async listarPorEndpoint(endpoint: SegregationEndpoint, year: CensusYear) {
		const { data } = await api.get<SegregationDto[]>(`/api/${endpoint}/`, {
			params: { year },
		});
		return data;
	},

	async listarSetores(year: CensusYear) {
		const { data } = await api.get<SegregationDto[]>('/api/setores/', {
			params: { year },
		});
		return data;
	},

	// Lista enxuta (sem geometria) para o ranking de indicadores de qualquer
	// camada. Para setores, `scope` e `code` filtram no servidor (RM ou
	// município), reduzindo o payload de ~316k para apenas os setores relevantes.
	async listarIndicadores(
		endpoint: SegregationEndpoint,
		year: CensusYear,
		scope?: string,
		code?: string,
	): Promise<RankingIndicadoresRow[]> {
		const { data } = await api.get<RankingIndicadoresRow[]>(
			`/api/${endpoint}/indicadores`,
			{
				params:
					scope && code ? { scope, code, year } : { year },
			},
		);
		return data;
	},

	async listarSetoresPorMunicipio(
		codMunicipio: string | number,
		year: CensusYear,
	) {
		const { data } = await api.get<SegregationDto[]>(
			'/api/setores/municipio',
			{
				params: { codMunicipio, year },
			},
		);
		return data;
	},

	async listarSetoresPorViewport(
		{ bbox, zoom }: SetoresViewportParams,
		year: CensusYear,
	) {
		const { data } = await api.get<SegregationFeatureCollection>(
			'/api/setores/viewport',
			{
				params: {
					bbox: serializeBbox(bbox),
					zoom,
					year,
				},
			},
		);
		// O /viewport nao emite "id" no topo da feature; sem ele o
		// feature-state (realce de hover) nao casa. Promovemos code_tract.
		return {
			...data,
			features: data.features.map((feature) => ({
				...feature,
				id: feature.properties?.code_tract ?? feature.id,
			})),
		};
	},

	async listarMunicipios(year: CensusYear) {
		const { data } = await api.get<SegregationDto[]>('/api/municipios/', {
			params: { year },
		});
		return data;
	},

	async listarMunicipiosLista(year: CensusYear): Promise<MunicipioListaDto[]> {
		const { data } = await api.get<MunicipioListaDto[]>(
			'/api/municipios/lista',
			{ params: { year } },
		);
		return data;
	},

	async obterEscalaSetores(
		metrica: string,
		escopo: 'reg_metro' | 'municipio',
		codigo: string,
		year: CensusYear,
	): Promise<[number, number, number, number]> {
		const { data } = await api.get<{
			breaks: [number, number, number, number];
		}>('/api/setores/escala', {
			params: { metric: metrica, scope: escopo, code: codigo, year },
		});
		return data.breaks;
	},

	async listarRegioesMetropolitanas(year: CensusYear) {
		const { data } = await api.get<SegregationDto[]>('/api/reg_metro/', {
			params: { year },
		});
		return data;
	},

	async listarMunicipiosPorViewport(
		{ bbox, zoom }: SetoresViewportParams,
		year: CensusYear,
	) {
		const { data } = await api.get<SegregationFeatureCollection>(
			'/api/municipios/viewport',
			{
				params: {
					bbox: serializeBbox(bbox),
					zoom,
					year,
				},
			},
		);
		return data;
	},
};
