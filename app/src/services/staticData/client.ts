import { dataUrl } from './config';
import { resolveScopePath } from './scopeKey';
import type {
	MetroSlugIndex,
	SetoresScope,
	SetoresScopePayload,
} from './StaticData.interface';
import type {
	MunicipioListaDto,
	RankingIndicadoresRow,
	SegregationEndpoint,
} from '@/services/setores/Setores.interface';
import type { CensusYear } from '@/types/dashboard.types';

const RANKING_FILE_BY_ENDPOINT: Record<SegregationEndpoint, string | null> = {
	// Setor rankings are per scope; they never load as one file.
	setores: null,
	municipios: 'indicadores_municipios',
	reg_metro: 'indicadores_reg_metro',
};

async function fetchJson<T>(path: string): Promise<T> {
	const response = await fetch(dataUrl(path));
	if (!response.ok) {
		throw new Error(`${response.status} ao buscar ${path}`);
	}
	return (await response.json()) as T;
}

export const staticDataService = {
	fetchMetroSlugs(year: CensusYear): Promise<{ metro: MetroSlugIndex }> {
		return fetchJson(`scopes/setores/${year}/index.json`);
	},

	fetchMunicipiosLista(year: CensusYear): Promise<MunicipioListaDto[]> {
		return fetchJson(`meta/municipios_lista_${year}.json`);
	},

	fetchRankings(
		endpoint: SegregationEndpoint,
		year: CensusYear,
	): Promise<RankingIndicadoresRow[]> {
		const file = RANKING_FILE_BY_ENDPOINT[endpoint];
		if (!file) {
			throw new Error(`${endpoint} usa arquivos por escopo, não um arquivo único`);
		}
		return fetchJson(`meta/${file}_${year}.json`);
	},

	async fetchSetoresScope(
		scope: SetoresScope,
		code: string,
		year: CensusYear,
		metroSlugs: MetroSlugIndex,
	): Promise<SetoresScopePayload> {
		const path = resolveScopePath(scope, code, year, metroSlugs);
		if (!path) {
			throw new Error(`Escopo desconhecido: ${scope}/${code}`);
		}
		return fetchJson<SetoresScopePayload>(path);
	},
};
