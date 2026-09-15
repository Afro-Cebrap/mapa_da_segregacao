import type { SegregationEndpoint } from '@/services/setores/Setores.interface';
import type { CensusYear } from '@/types/dashboard.types';
import { dataBaseUrl } from '@/services/staticData/config';

// The API endpoint names and the archive names differ for one resource:
// the route is /api/reg_metro but the tables and archives are reg_metropo.
const TILE_ARCHIVE_BY_ENDPOINT: Record<SegregationEndpoint, string> = {
	setores: 'setores',
	municipios: 'municipios',
	reg_metro: 'reg_metropo',
};

export function buildTileUrl(
	baseUrl: string,
	endpoint: SegregationEndpoint,
	year: CensusYear,
) {
	const archive = TILE_ARCHIVE_BY_ENDPOINT[endpoint];
	const base = baseUrl.replace(/\/+$/, '');
	return `pmtiles://${base}/tiles/${archive}_${year}.pmtiles/{z}/{x}/{y}`;
}

export function getSegregationTileUrl(
	endpoint: SegregationEndpoint,
	year: CensusYear,
) {
	return buildTileUrl(dataBaseUrl, endpoint, year);
}
