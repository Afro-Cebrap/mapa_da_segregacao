// Índice de busca de localidades (estados, RMs e municípios) montado a
// partir da lista estática de municípios. Usado pela SearchBar.
import { ESTADOS } from '@/constants/estados';
import { mergeBbox, type Bbox } from '@/lib/geo';
import type { MunicipioListaDto } from '@/services/setores/Setores.interface';

export type ResultType = 'estado' | 'municipio' | 'reg_metro';

export interface SearchResult {
	id: string;
	label: string;
	sublabel: string;
	type: ResultType;
	bbox: Bbox | null;
}

export function buildIndex(items: MunicipioListaDto[]): SearchResult[] {
	const estadoBboxes = new Map<string, Bbox | null>();
	const rmBboxes = new Map<string, Bbox | null>();
	const municipios: SearchResult[] = [];

	for (const item of items) {
		const codeMuni = item.code_muni;
		if (!codeMuni) continue;

		// The bbox is precomputed in the lista artifact, so the search index no
		// longer needs the full municipality geometry.
		const bbox: Bbox | null =
			item.min_lng != null &&
			item.min_lat != null &&
			item.max_lng != null &&
			item.max_lat != null
				? [
						[item.min_lng, item.min_lat],
						[item.max_lng, item.max_lat],
					]
				: null;

		const nameMuni = item.name_muni ?? codeMuni;
		const codeState = item.code_state ?? null;
		const nameMetro = item.name_metro;
		const abbrevState = item.abbrev_state;

		municipios.push({
			id: `muni-${codeMuni}`,
			label: abbrevState ? `${nameMuni} (${abbrevState})` : nameMuni,
			sublabel: `Município · ${codeMuni}`,
			type: 'municipio',
			bbox,
		});

		if (codeState) {
			estadoBboxes.set(
				codeState,
				mergeBbox(estadoBboxes.get(codeState) ?? null, bbox),
			);
		}
		if (nameMetro) {
			rmBboxes.set(
				nameMetro,
				mergeBbox(rmBboxes.get(nameMetro) ?? null, bbox),
			);
		}
	}

	const estados: SearchResult[] = ESTADOS.map((estado) => ({
		id: `estado-${estado.code}`,
		label: `${estado.name} (${estado.abbrev})`,
		sublabel: 'Estado',
		type: 'estado' as const,
		bbox: estadoBboxes.get(estado.code) ?? null,
	}));

	const regioes: SearchResult[] = Array.from(rmBboxes.entries())
		.map(([name, bbox]) => ({
			id: `rm-${name}`,
			label: name,
			sublabel: 'Região Metropolitana',
			type: 'reg_metro' as const,
			bbox,
		}))
		.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

	municipios.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

	return [...estados, ...regioes, ...municipios];
}
