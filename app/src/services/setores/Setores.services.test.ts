import { describe, expect, it } from 'vitest';
import { buildTileUrl } from './Setores.services';

describe('buildTileUrl', () => {
	it('returns a pmtiles protocol URL for the archive', () => {
		expect(buildTileUrl('https://data.example.com', 'setores', 2022)).toBe(
			'pmtiles://https://data.example.com/tiles/setores_2022.pmtiles/{z}/{x}/{y}',
		);
	});

	it('maps the reg_metro endpoint to its archive name', () => {
		// The API endpoint is reg_metro but the tables and archives are
		// reg_metropo; the two names must not be conflated.
		expect(
			buildTileUrl('https://data.example.com', 'reg_metro', 2010),
		).toBe(
			'pmtiles://https://data.example.com/tiles/reg_metropo_2010.pmtiles/{z}/{x}/{y}',
		);
	});

	it('maps the municipios endpoint to its archive name', () => {
		expect(
			buildTileUrl('https://data.example.com', 'municipios', 2022),
		).toBe(
			'pmtiles://https://data.example.com/tiles/municipios_2022.pmtiles/{z}/{x}/{y}',
		);
	});
});
