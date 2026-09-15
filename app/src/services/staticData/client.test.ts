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
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response),
		);

		await expect(staticDataService.fetchMunicipiosLista(2022)).rejects.toBeInstanceOf(
			StaticDataHttpError,
		);
	});
});
