import { describe, expect, it } from 'vitest';
import { buildIndex } from './searchIndex';

const ROWS = [
	{
		code_muni: '3550308',
		name_muni: 'São Paulo',
		code_state: '35',
		name_metro: 'RM São Paulo',
		abbrev_state: 'SP',
		min_lng: -46.8,
		min_lat: -24.0,
		max_lng: -46.3,
		max_lat: -23.3,
	},
];

describe('buildIndex', () => {
	it('labels a municipality with its state abbreviation', () => {
		const municipio = buildIndex(ROWS).find((item) => item.type === 'municipio');

		expect(municipio?.label).toBe('São Paulo (SP)');
	});

	it('takes the bbox from the lista row instead of geometry', () => {
		const municipio = buildIndex(ROWS).find((item) => item.type === 'municipio');

		expect(municipio?.bbox).toEqual([
			[-46.8, -24.0],
			[-46.3, -23.3],
		]);
	});

	it('derives a metro area entry from the rows', () => {
		const rm = buildIndex(ROWS).find((item) => item.type === 'reg_metro');

		expect(rm?.label).toBe('RM São Paulo');
	});

	it('skips rows with no municipality code', () => {
		expect(buildIndex([{ ...ROWS[0], code_muni: '' }])).toHaveLength(
			// Only the 27 static state entries remain.
			27,
		);
	});
});
