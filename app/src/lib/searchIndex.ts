// Índice de busca de localidades (estados, RMs e municípios) montado a
// partir do GeoJSON de municípios. Usado pela SearchBar.
import { ESTADOS } from '@/constants/estados';
import { computeBbox, mergeBbox, type Bbox } from '@/lib/geo';
import type { SegregationFeature } from '@/services/setores/Setores.interface';

export type ResultType = 'estado' | 'municipio' | 'reg_metro';

export interface SearchResult {
	id: string;
	label: string;
	sublabel: string;
	type: ResultType;
	bbox: Bbox | null;
}

export function buildIndex(features: SegregationFeature[]): SearchResult[] {
	const estadoBboxes = new Map<string, Bbox | null>();
	const rmBboxes = new Map<string, Bbox | null>();
	const municipios: SearchResult[] = [];

	for (const feature of features) {
		const codeMuni = feature.properties.code_muni;
		if (!codeMuni) continue;
		const bbox = feature.geometry ? computeBbox(feature.geometry) : null;
		const nameMuni = feature.properties.name_muni ?? codeMuni;
		const codeState = feature.properties.code_state ?? null;
		const nameMetro = feature.properties.name_metro;
		const abbrevState = feature.properties.abbrev_state;

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
