export interface SegregationProperties {
	code_tract: string | null;
	code_muni: string | null;
	name_muni: string | null;
	code_neighborhood: number | null;
	name_neighborhood: string | null;
	code_district: number | null;
	name_district: string | null;
	code_subdistrict: number | null;
	name_subdistrict: string | null;
	zone: string | null;
	code_state: string | null;
	abbrev_state: string | null;
	name_state: string | null;
	code_region: number | null;
	name_region: string | null;
	year: number | null;
	name_metro: string | null;
	dissimilarity: number | null;
	index_h: number | null;
	exp_branca_pp: number | null;
	exp_pp_branca: number | null;
	iso_branca_branca: number | null;
	iso_pp_pp: number | null;
	n_branca: number | null;
	n_preta: number | null;
	n_parda: number | null;
	n_amarela: number | null;
	n_indigena: number | null;
	n_preta_ou_parda: number | null;
	n_total: number | null;
	percent_branca: number | null;
	percent_preta: number | null;
	percent_parda: number | null;
	percent_amarela: number | null;
	percent_indigena: number | null;
	percent_preta_ou_parda: number | null;
}

export interface SegregationDto extends SegregationProperties {
	geometry?: GeoJSON.Geometry | null;
	geom?: GeoJSON.Geometry | null;
}

// Linha enxuta do ranking de indicadores (endpoint /api/setores/indicadores):
// identificador + métricas de segregação, sem geometria nem composição racial.
export type RankingIndicadoresRow = Pick<
	SegregationProperties,
	| 'code_tract'
	| 'code_muni'
	| 'name_metro'
	| 'dissimilarity'
	| 'index_h'
	| 'exp_branca_pp'
	| 'exp_pp_branca'
	| 'iso_branca_branca'
	| 'iso_pp_pp'
>;

export interface SegregationFeature extends GeoJSON.Feature<
	GeoJSON.Geometry,
	SegregationProperties
> {
	type: 'Feature';
	id?: string;
	geometry: GeoJSON.Geometry;
	properties: SegregationProperties;
}

export interface SegregationFeatureCollection extends GeoJSON.FeatureCollection<
	GeoJSON.Geometry,
	SegregationProperties
> {
	type: 'FeatureCollection';
	features: SegregationFeature[];
}

export interface SetoresViewportParams {
	bbox: [number, number, number, number];
	zoom: number;
}

export type SetorProperties = SegregationProperties;
export type SetorDto = SegregationDto;
export type SetoresFeature = SegregationFeature;
export type SetoresFeatureCollection = SegregationFeatureCollection;

export const EMPTY_SETORES_FEATURE_COLLECTION: SegregationFeatureCollection = {
	type: 'FeatureCollection',
	features: [],
};

export interface MunicipioListaDto {
	code_muni: string;
	name_muni: string | null;
	code_state: string | null;
	name_metro: string | null;
	min_lng?: number | null;
	min_lat?: number | null;
	max_lng?: number | null;
	max_lat?: number | null;
}
