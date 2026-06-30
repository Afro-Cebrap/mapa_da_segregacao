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

export function getSegregationTileUrl(endpoint: SegregationEndpoint) {
	return `${normalizeBaseUrl(apiBaseUrl)}/api/${endpoint}/tiles/{z}/{x}/{y}.pbf`;
}

export const setoresService = {
	async listarPorEndpoint(endpoint: SegregationEndpoint) {
		const { data } = await api.get<SegregationDto[]>(`/api/${endpoint}/`);
		return data;
	},

	async listarSetores() {
		const { data } = await api.get<SegregationDto[]>('/api/setores/');
		return data;
	},

	// Lista enxuta (sem geometria) para o ranking de indicadores de qualquer
	// camada. A lista com geometria pesa demais (setores passam de 600MB;
	// clicar num município não precisa baixar todas as geometrias) — esta traz
	// só identificador + métricas.
	// Para setores, `scope` e `code` filtram no servidor (RM ou município),
	// reduzindo o payload de ~316k para apenas os setores relevantes.
	async listarIndicadores(
		endpoint: SegregationEndpoint,
		scope?: string,
		code?: string,
	): Promise<RankingIndicadoresRow[]> {
		const { data } = await api.get<RankingIndicadoresRow[]>(
			`/api/${endpoint}/indicadores`,
			scope && code ? { params: { scope, code } } : undefined,
		);
		return data;
	},

	async listarSetoresPorMunicipio(codMunicipio: string | number) {
		const { data } = await api.get<SegregationDto[]>(
			'/api/setores/municipio',
			{
				params: { codMunicipio },
			},
		);
		return data;
	},

	async listarSetoresPorViewport({ bbox, zoom }: SetoresViewportParams) {
		const { data } = await api.get<SegregationFeatureCollection>(
			'/api/setores/viewport',
			{
				params: {
					bbox: serializeBbox(bbox),
					zoom,
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

	async listarMunicipios() {
		const { data } = await api.get<SegregationDto[]>('/api/municipios/');
		return data;
	},

	async listarMunicipiosLista(): Promise<MunicipioListaDto[]> {
		const { data } = await api.get<MunicipioListaDto[]>(
			'/api/municipios/lista',
		);
		return data;
	},

	async obterEscalaSetores(
		metrica: string,
		escopo: 'reg_metro' | 'municipio',
		codigo: string,
	): Promise<[number, number, number, number]> {
		const { data } = await api.get<{
			breaks: [number, number, number, number];
		}>('/api/setores/escala', {
			params: { metric: metrica, scope: escopo, code: codigo },
		});
		return data.breaks;
	},

	async listarRegioesMetropolitanas() {
		const { data } = await api.get<SegregationDto[]>('/api/reg_metro/');
		return data;
	},

	async listarMunicipiosPorViewport({ bbox, zoom }: SetoresViewportParams) {
		const { data } = await api.get<SegregationFeatureCollection>(
			'/api/municipios/viewport',
			{
				params: {
					bbox: serializeBbox(bbox),
					zoom,
				},
			},
		);
		return data;
	},
};
