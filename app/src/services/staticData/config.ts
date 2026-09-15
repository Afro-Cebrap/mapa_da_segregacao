// Base URL of the public Cloud Storage bucket holding the generated tiles and
// JSON. Set by VITE_DATA_URL at build time; the local default matches the
// pipeline's `out/` directory served by `bun dev`.
const env = import.meta.env;

export function joinDataUrl(base: string, path: string): string {
	return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export const dataBaseUrl: string =
	env.VITE_DATA_URL || 'http://localhost:3000/data';

export function dataUrl(path: string): string {
	return joinDataUrl(dataBaseUrl, path);
}
