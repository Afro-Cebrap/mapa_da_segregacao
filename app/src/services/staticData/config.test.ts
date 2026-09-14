import { describe, expect, it } from 'vitest';
import { joinDataUrl } from './config';

describe('joinDataUrl', () => {
	it('joins a base and a path with a single slash', () => {
		expect(joinDataUrl('https://example.com/bucket', 'meta/x.json')).toBe(
			'https://example.com/bucket/meta/x.json',
		);
	});

	it('tolerates a trailing slash on the base', () => {
		expect(joinDataUrl('https://example.com/bucket/', 'meta/x.json')).toBe(
			'https://example.com/bucket/meta/x.json',
		);
	});

	it('tolerates a leading slash on the path', () => {
		expect(joinDataUrl('https://example.com/bucket', '/meta/x.json')).toBe(
			'https://example.com/bucket/meta/x.json',
		);
	});
});
