import type { MetroSlugIndex, SetoresScope } from './StaticData.interface';

// Path of the artifact serving both the ranking rows and the scale breaks for
// one scope. Metro slugs come from the published index.json rather than being
// recomputed here, so the frontend and the pipeline cannot drift apart.
export function resolveScopePath(
	scope: SetoresScope,
	code: string,
	year: number,
	metroSlugs: MetroSlugIndex,
): string | null {
	if (scope === 'municipio') {
		return `scopes/setores/${year}/muni/${code}.json`;
	}

	const slug = metroSlugs[code];
	if (!slug) return null;
	return `scopes/setores/${year}/metro/${slug}.json`;
}
