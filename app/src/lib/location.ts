// Regras de localização compartilhadas: rótulos de UF, trilha de navegação e
// compatibilidade entre o filtro de local e a camada ativa.
import { ESTADOS } from '@/constants/estados';
import type { LocationLookups } from '@/hooks/useLocationLookups';
import type {
	LayerId,
	LocationFilter,
	LocationFilterScope,
} from '@/types/dashboard.types';

const ABBREV_BY_CODE = new Map(
	ESTADOS.map((estado) => [estado.code, estado.abbrev]),
);

const ROOT = 'BR';

export function abbrevForState(code: string | null | undefined): string | null {
	if (!code) return null;
	return ABBREV_BY_CODE.get(code) ?? null;
}

// Monta o caminho completo até a localidade selecionada (ex.: BR › MG › Belo Horizonte).
export function buildSegments(
	filter: LocationFilter | null,
	lookups: LocationLookups,
): string[] {
	if (!filter) return [ROOT];

	if (filter.scope === 'estado') {
		return [ROOT, abbrevForState(filter.code) ?? filter.name];
	}

	if (filter.scope === 'municipio') {
		const abbrev = abbrevForState(
			lookups.muniInfo.get(filter.code)?.code_state,
		);
		return abbrev ? [ROOT, abbrev, filter.name] : [ROOT, filter.name];
	}

	// reg_metro: deriva o estado a partir de um município da RM.
	const firstMuni = lookups.rmToMunis.get(filter.code)?.values().next().value;
	const abbrev = abbrevForState(
		firstMuni ? lookups.muniInfo.get(firstMuni)?.code_state : null,
	);
	return abbrev ? [ROOT, abbrev, filter.name] : [ROOT, filter.name];
}

// Camada natural ao escolher um filtro cujo escopo é incompatível com a
// camada ativa. Se o escopo já é compatível com a camada atual, mantém-na;
// caso contrário, abre a escala esperada: Estado → Municípios, Município →
// Setores, RM → Municípios (nível nacional).
export function layerForScope(
	scope: LocationFilterScope,
	activeLayerId: LayerId,
): LayerId {
	if (isFilterCompatible(scope, activeLayerId)) return activeLayerId;
	if (scope === 'municipio') return 'setores';
	return 'municipios';
}

// Regras de compatibilidade ao trocar de camada:
// estado vale só p/ municipios; municipio vale p/ setores; RM vale p/ municipios e setores.
export function isFilterCompatible(
	scope: LocationFilter['scope'],
	layerId: LayerId,
): boolean {
	if (layerId === 'regioes-metropolitanas')
		return scope === 'estado' || scope === 'reg_metro';
	if (scope === 'estado') return layerId === 'municipios';
	if (scope === 'reg_metro')
		return layerId === 'municipios' || layerId === 'setores';
	if (scope === 'municipio') return layerId === 'setores';
	return false;
}
