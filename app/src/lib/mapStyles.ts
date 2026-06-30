// Construtores dos estilos das camadas MapLibre do dashboard. Os ids das
// layers vivem aqui junto dos estilos que os usam; o DashboardMap importa
// ambos. Cores de destaque vêm da paleta da marca (sem tons roxos).
import { CORES_MARCA } from '@/constants/cores';
import type { MetricType } from '@/types/dashboard.types';
import type { LayerProps } from '@vis.gl/react-maplibre';

export const BASE_FILL_LAYER_ID = 'active-geometry-base-fill';
export const ACTIVE_FILL_LAYER_ID = 'active-geometry-fill';
export const ACTIVE_LINE_LAYER_ID = 'active-geometry-line';
export const ACTIVE_HOVER_LINE_LAYER_ID = 'active-geometry-hover-line';
export const SELECTION_LINE_LAYER_ID = 'selection-line';
export const MUNI_HIGHLIGHT_LINE_LAYER_ID =
	'active-geometry-muni-highlight-line';
export const ESCOLAS_CIRCLE_LAYER_ID = 'escolas-circle';

// Fundo branco opaco desenhado SOB o choropleth, cobrindo apenas as feições
// que têm dados. Como o choropleth é semi-transparente, ele passa a misturar
// com branco (cores fiéis/vivas) em vez do verde do mapa-base, fazendo o
// choropleth se destacar. Onde não há feição de dados, o verde-Brasil do
// BASEMAP_STYLE continua aparecendo. Usa o mesmo filtro de localização do
// choropleth, então áreas não selecionadas seguem verdes.
export function buildBaseFillStyle(): LayerProps {
	return {
		id: BASE_FILL_LAYER_ID,
		type: 'fill',
		paint: {
			'fill-color': '#ffffff',
			'fill-opacity': 1,
		},
	};
}

export function buildFillStyle(
	prop: MetricType,
	breaks: readonly number[],
	palette: readonly string[],
): LayerProps {
	return {
		id: ACTIVE_FILL_LAYER_ID,
		type: 'fill',
		paint: {
			'fill-color': [
				'case',
				['==', ['typeof', ['get', prop]], 'null'],
				'#f6dfc4',
				[
					'interpolate',
					['linear'],
					['to-number', ['get', prop], 0],
					breaks[0],
					palette[0],
					breaks[1],
					palette[1],
					breaks[2],
					palette[2],
					breaks[3],
					palette[3],
				],
			],
			'fill-opacity': [
				'case',
				['boolean', ['feature-state', 'hover'], false],
				0.84,
				0.68,
			],
		},
	};
}

export function buildLineStyle(color: string): LayerProps {
	return {
		id: ACTIVE_LINE_LAYER_ID,
		type: 'line',
		paint: {
			'line-color': color,
			'line-width': 0.7,
			'line-opacity': 0.42,
		},
	};
}

export function buildHoverLineStyle(color: string): LayerProps {
	return {
		id: ACTIVE_HOVER_LINE_LAYER_ID,
		type: 'line',
		paint: {
			'line-color': color,
			'line-width': [
				'case',
				['boolean', ['feature-state', 'hover'], false],
				3,
				0,
			],
			'line-opacity': [
				'case',
				['boolean', ['feature-state', 'hover'], false],
				1,
				0,
			],
		},
	};
}

export function buildEscolasStyle(): LayerProps {
	return {
		id: ESCOLAS_CIRCLE_LAYER_ID,
		type: 'circle',
		paint: {
			'circle-radius': [
				'interpolate',
				['linear'],
				['zoom'],
				4,
				1.5,
				10,
				3.5,
				14,
				6,
			],
			'circle-color': [
				'match',
				['get', 'rede'],
				'publica',
				'#1d4ed8',
				'privada',
				'#e05b6c',
				'#6b7280',
			],
			'circle-stroke-color': '#ffffff',
			'circle-stroke-width': 0.6,
			'circle-opacity': 0.85,
		},
	};
}

export function buildSelectionStyle(): LayerProps {
	return {
		id: SELECTION_LINE_LAYER_ID,
		type: 'line',
		paint: {
			'line-color': CORES_MARCA.verde,
			'line-width': 3,
			'line-opacity': 0.95,
		},
	};
}

export function buildMuniHighlightStyle(): LayerProps {
	return {
		id: MUNI_HIGHLIGHT_LINE_LAYER_ID,
		type: 'line',
		paint: {
			'line-color': CORES_MARCA.laranja,
			'line-width': 2.5,
			'line-opacity': 0.95,
		},
	};
}
