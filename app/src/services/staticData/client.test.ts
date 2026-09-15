import { afterEach, describe, expect, it, vi } from 'vitest';
import { staticDataService, StaticDataHttpError } from './client';

describe('staticDataService error handling', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('attaches the HTTP status to the thrown error on a failed fetch', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 404 } as Response),
		);

		await expect(staticDataService.fetchMunicipiosLista(2022)).rejects.toMatchObject({
			status: 404,
		});
	});

	it('throws a StaticDataHttpError instance, distinct from a network TypeError', async () => {
		// Simulates a DNS/CORS/offline failure: fetch itself rejects, rather
		// than resolving with a non-ok response.
		vi.stubGlobal(
			'fetch',
			vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
		);

		const rejection = staticDataService.fetchMunicipiosLista(2022);

		await expect(rejection).rejects.not.toBeInstanceOf(StaticDataHttpError);
		await expect(rejection).rejects.not.toHaveProperty('status');
	});
});
