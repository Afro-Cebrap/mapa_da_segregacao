import type { MapRef } from '@vis.gl/react-maplibre';
import type { RefObject } from 'react';

export type LngLat = [number, number];
export type Bbox = [LngLat, LngLat];

// Enquadra o mapa no bbox informado (no-op se não houver bbox).
export function fitMapToBbox(
	mapRef: RefObject<MapRef | null>,
	bbox: Bbox | null,
	opcoes: { padding?: number; duration?: number } = {},
) {
	if (!bbox) return;

	mapRef.current?.fitBounds(bbox, {
		padding: opcoes.padding ?? 70,
		duration: opcoes.duration ?? 1200,
	});
}

export function computeBbox(geometry: GeoJSON.Geometry): Bbox | null {
	let minLng = Infinity;
	let minLat = Infinity;
	let maxLng = -Infinity;
	let maxLat = -Infinity;

	function visit(
		coords:
			| GeoJSON.Position
			| GeoJSON.Position[]
			| GeoJSON.Position[][]
			| GeoJSON.Position[][][],
	) {
		if (typeof coords[0] === 'number') {
			const [lng, lat] = coords as GeoJSON.Position;
			if (lng < minLng) minLng = lng;
			if (lat < minLat) minLat = lat;
			if (lng > maxLng) maxLng = lng;
			if (lat > maxLat) maxLat = lat;
			return;
		}
		for (const c of coords as Array<
			GeoJSON.Position | GeoJSON.Position[] | GeoJSON.Position[][]
		>) {
			visit(c);
		}
	}

	if (geometry.type === 'Point') visit(geometry.coordinates);
	else if (geometry.type === 'LineString' || geometry.type === 'MultiPoint')
		visit(geometry.coordinates);
	else if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString')
		visit(geometry.coordinates);
	else if (geometry.type === 'MultiPolygon') visit(geometry.coordinates);
	else return null;

	if (!Number.isFinite(minLng)) return null;
	return [
		[minLng, minLat],
		[maxLng, maxLat],
	];
}

export function mergeBbox(a: Bbox | null, b: Bbox | null): Bbox | null {
	if (!a) return b;
	if (!b) return a;
	return [
		[Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])],
		[Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])],
	];
}
