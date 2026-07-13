// Conversão e leitura das propriedades de segregação que chegam do mapa
// (GeoJSON no modo mock, MVT no modo API — por isso os campos podem vir como
// string, número ou ausentes).
import { COMPOSITION_GROUPS } from '@/constants/metrics';
import { asPercent } from '@/lib/format';
import type { CensusSectorProperties } from '@/types/dashboard.types';

export interface CompositionGroup {
	key: keyof CensusSectorProperties;
	label: string;
	color: string;
	value: number;
}

export function toNullableNumber(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

export function toNullableString(value: unknown): string | null {
	if (value === null || value === undefined || value === '') return null;
	return String(value);
}

export function parseSegregationProperties(
	properties: Record<string, unknown>,
): CensusSectorProperties {
	return {
		code_tract: toNullableString(
			properties.code_tract ?? properties.cod_setor,
		),
		code_muni: toNullableString(properties.code_muni),
		name_muni: toNullableString(properties.name_muni),
		code_neighborhood: toNullableNumber(properties.code_neighborhood),
		name_neighborhood: toNullableString(properties.name_neighborhood),
		code_district: toNullableNumber(properties.code_district),
		name_district: toNullableString(properties.name_district),
		code_subdistrict: toNullableNumber(properties.code_subdistrict),
		name_subdistrict: toNullableString(properties.name_subdistrict),
		zone: toNullableString(properties.zone),
		code_state: toNullableString(properties.code_state),
		abbrev_state: toNullableString(properties.abbrev_state),
		name_state: toNullableString(properties.name_state),
		code_region: toNullableNumber(properties.code_region),
		name_region: toNullableString(properties.name_region),
		year: toNullableNumber(properties.year),
		name_metro: toNullableString(properties.name_metro),
		dissimilarity: toNullableNumber(
			properties.dissimilarity ?? properties.dissimil,
		),
		index_h: toNullableNumber(properties.index_h),
		exp_branca_pp: toNullableNumber(properties.exp_branca_pp),
		exp_pp_branca: toNullableNumber(properties.exp_pp_branca),
		iso_branca_branca: toNullableNumber(properties.iso_branca_branca),
		iso_pp_pp: toNullableNumber(properties.iso_pp_pp),
		n_branca: toNullableNumber(properties.n_branca),
		n_preta: toNullableNumber(properties.n_preta),
		n_parda: toNullableNumber(properties.n_parda),
		n_amarela: toNullableNumber(properties.n_amarela),
		n_indigena: toNullableNumber(properties.n_indigena),
		n_preta_ou_parda: toNullableNumber(properties.n_preta_ou_parda),
		n_total: toNullableNumber(properties.n_total),
		percent_branca: toNullableNumber(properties.percent_branca),
		percent_preta: toNullableNumber(properties.percent_preta),
		percent_parda: toNullableNumber(properties.percent_parda),
		percent_amarela: toNullableNumber(properties.percent_amarela),
		percent_indigena: toNullableNumber(properties.percent_indigena),
		percent_preta_ou_parda: toNullableNumber(
			properties.percent_preta_ou_parda,
		),
	};
}

// Nome de exibição da geometria (município, RM, bairro ou código).
export function getEntityName(properties: CensusSectorProperties): string {
	return (
		properties.name_muni ??
		properties.name_metro ??
		properties.name_neighborhood ??
		properties.code_muni ??
		properties.code_tract ??
		'N/A'
	);
}

export function getComposition(
	properties: CensusSectorProperties,
): CompositionGroup[] {
	return COMPOSITION_GROUPS.map((group) => ({
		...group,
		value: asPercent(properties[group.key] as number | null),
	}));
}
