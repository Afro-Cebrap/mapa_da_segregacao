import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { setoresService } from '@/services/setores/Setores.services';
import type { SetoresViewportParams } from '@/services/setores/Setores.interface';
import type { MetricType } from '@/types/dashboard.types';

type ZoomBucket = 'low' | 'mid' | 'high';

function getZoomBucket(zoom: number): ZoomBucket {
	if (zoom < 8) return 'low';
	if (zoom < 12) return 'mid';
	return 'high';
}

function getBboxPrecision(bucket: ZoomBucket) {
	if (bucket === 'low') return 2;
	if (bucket === 'mid') return 3;
	return 4;
}

function normalizeViewportParams(params: SetoresViewportParams) {
	const zoom = Math.max(0, Math.floor(params.zoom));
	const zoomBucket = getZoomBucket(zoom);
	const precision = getBboxPrecision(zoomBucket);
	const bbox = params.bbox.map((coordinate) =>
		Number(coordinate.toFixed(precision)),
	) as SetoresViewportParams['bbox'];

	return {
		bbox,
		zoom,
		zoomBucket,
	};
}

export function useSetores() {
	return useQuery({
		queryKey: ['setores', 'all'],
		queryFn: () => setoresService.listarSetores(),
	});
}

export function useSetoresPorMunicipio(codMunicipio?: string | number | null) {
	return useQuery({
		queryKey: ['setores', 'municipio', codMunicipio],
		queryFn: () => setoresService.listarSetoresPorMunicipio(codMunicipio!),
		enabled:
			codMunicipio !== null &&
			codMunicipio !== undefined &&
			`${codMunicipio}` !== '',
	});
}

export function useEscalaSetores(
	metrica: MetricType | null,
	escopo: 'reg_metro' | 'municipio' | null,
	codigo: string | null,
) {
	return useQuery({
		queryKey: ['setores', 'escala', metrica, escopo, codigo],
		queryFn: () =>
			setoresService.obterEscalaSetores(metrica!, escopo!, codigo!),
		enabled: Boolean(metrica && escopo && codigo),
		staleTime: 1000 * 60 * 60 * 24,
	});
}

export function useSetoresViewport(params: SetoresViewportParams | null) {
	const normalizedParams = params ? normalizeViewportParams(params) : null;

	return useQuery({
		queryKey: normalizedParams
			? [
					'setores',
					'viewport',
					normalizedParams.zoomBucket,
					...normalizedParams.bbox,
				]
			: ['setores', 'viewport', 'idle'],
		queryFn: () =>
			setoresService.listarSetoresPorViewport(normalizedParams!),
		enabled: Boolean(normalizedParams),
		placeholderData: keepPreviousData,
	});
}
