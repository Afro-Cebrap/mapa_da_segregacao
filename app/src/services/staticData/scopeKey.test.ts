import { describe, expect, it } from 'vitest';
import { resolveScopePath } from './scopeKey';

const SLUGS = { 'RM São Paulo': 'rm-sao-paulo' };

describe('resolveScopePath', () => {
	it('resolves a metro scope through the published slug index', () => {
		expect(resolveScopePath('reg_metro', 'RM São Paulo', 2022, SLUGS)).toBe(
			'scopes/setores/2022/metro/rm-sao-paulo.json',
		);
	});

	it('resolves a municipality scope by its code', () => {
		expect(resolveScopePath('municipio', '3304557', 2010, SLUGS)).toBe(
			'scopes/setores/2010/muni/3304557.json',
		);
	});

	it('returns null for a metro area missing from the index', () => {
		// Never guess the slug locally: the pipeline owns that normalization,
		// and a guess that drifts would 404 silently.
		expect(resolveScopePath('reg_metro', 'RM Inexistente', 2022, SLUGS)).toBeNull();
	});
});
