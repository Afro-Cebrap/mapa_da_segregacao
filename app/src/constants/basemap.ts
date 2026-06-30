import { CORES_MARCA } from '@/constants/cores';
import type { StyleSpecification } from 'maplibre-gl';

// Estilo do mapa-base com a paleta da marca, conforme o design do Figma
// (node 434-376): oceano laranja-claro, águas interiores em creme,
// continente em verde-escuro, Brasil em destaque num verde um pouco mais
// claro (mesmo tom do token --accent) e fronteiras sutis.
// As geometrias vêm dos vector tiles públicos da CARTO (mesma fonte dos
// estilos voyager/dark-matter usados antes); o polígono do Brasil é um
// GeoJSON estático (Natural Earth 1:50m) servido de /brasil-contorno.json.
const COR_OCEANO = CORES_MARCA.laranjaClaro;
// Águas interiores (rios, lagos, represas) separadas do oceano — a camada
// `water` da CARTO traz o atributo `class` (ocean | lake | river | pond...).
const COR_AGUA_INTERIOR = '#102e44';
const COR_TERRA = CORES_MARCA.verdeEscuro;
const COR_BRASIL = CORES_MARCA.verde;
const COR_FRONTEIRA = '#1e4f13';
const COR_TEXTO = CORES_MARCA.creme;

// Mesmas pilhas de fontes do estilo voyager — o servidor de glyphs da CARTO
// só resolve combinações conhecidas.
const FONTE_REGULAR = [
	'Montserrat Regular',
	'Open Sans Regular',
	'Noto Sans Regular',
	'HanWangHeiLight Regular',
	'NanumBarunGothic Regular',
];
const FONTE_MEDIA = [
	'Montserrat Medium',
	'Open Sans Bold',
	'Noto Sans Regular',
	'HanWangHeiLight Regular',
	'NanumBarunGothic Regular',
];

export const BASEMAP_STYLE: StyleSpecification = {
	version: 8,
	name: 'Mapa da Segregação',
	glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
	sources: {
		carto: {
			type: 'vector',
			url: 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json',
		},
		'brasil-contorno': {
			type: 'geojson',
			data: '/brasil-contorno.json',
		},
	},
	layers: [
		{
			id: 'fundo-terra',
			type: 'background',
			paint: { 'background-color': COR_TERRA },
		},
		{
			id: 'brasil-destaque',
			type: 'fill',
			source: 'brasil-contorno',
			paint: { 'fill-color': COR_BRASIL },
		},
		// A água desenha por cima do polígono do Brasil: a costa simplificada
		// do Natural Earth fica recortada pela costa detalhada da CARTO.
		{
			id: 'agua-oceano',
			type: 'fill',
			source: 'carto',
			'source-layer': 'water',
			filter: ['==', 'class', 'ocean'],
			paint: { 'fill-color': COR_OCEANO },
		},
		{
			id: 'agua-interior',
			type: 'fill',
			source: 'carto',
			'source-layer': 'water',
			filter: ['!=', 'class', 'ocean'],
			paint: { 'fill-color': COR_AGUA_INTERIOR },
		},
		{
			id: 'rios',
			type: 'line',
			source: 'carto',
			'source-layer': 'waterway',
			minzoom: 8,
			paint: {
				'line-color': COR_AGUA_INTERIOR,
				'line-opacity': 0.55,
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					8,
					0.5,
					14,
					2,
				],
			},
		},
		{
			id: 'vias',
			type: 'line',
			source: 'carto',
			'source-layer': 'transportation',
			minzoom: 9,
			paint: {
				'line-color': COR_OCEANO,
				'line-opacity': 0.3,
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					9,
					0.3,
					12,
					0.8,
					16,
					2.5,
				],
			},
		},
		{
			id: 'fronteira-estados',
			type: 'line',
			source: 'carto',
			'source-layer': 'boundary',
			minzoom: 5,
			filter: ['all', ['==', 'admin_level', 4], ['==', 'maritime', 0]],
			paint: {
				'line-color': COR_FRONTEIRA,
				'line-opacity': 0.45,
				'line-width': 0.6,
			},
		},
		{
			id: 'fronteira-paises',
			type: 'line',
			source: 'carto',
			'source-layer': 'boundary',
			filter: ['all', ['==', 'admin_level', 2], ['==', 'maritime', 0]],
			paint: {
				'line-color': COR_FRONTEIRA,
				'line-opacity': 0.7,
				'line-width': 1,
			},
		},
		{
			id: 'rotulo-cidades',
			type: 'symbol',
			source: 'carto',
			'source-layer': 'place',
			minzoom: 6,
			maxzoom: 14,
			filter: ['all', ['==', 'class', 'city']],
			layout: {
				'text-field': '{name}',
				'text-font': FONTE_REGULAR,
				'text-size': [
					'interpolate',
					['linear'],
					['zoom'],
					6,
					10,
					12,
					15,
				],
			},
			paint: {
				'text-color': COR_TEXTO,
				'text-halo-color': COR_TERRA,
				'text-halo-width': 1,
				'text-halo-blur': 0.5,
				'text-opacity': 0.85,
			},
		},
		{
			id: 'rotulo-estados',
			type: 'symbol',
			source: 'carto',
			'source-layer': 'place',
			minzoom: 5,
			maxzoom: 9,
			filter: ['all', ['==', 'class', 'state'], ['<=', 'rank', 4]],
			layout: {
				'text-field': '{name}',
				'text-font': FONTE_REGULAR,
				'text-transform': 'uppercase',
				'text-letter-spacing': 0.1,
				'text-size': 10,
			},
			paint: {
				'text-color': COR_TEXTO,
				'text-halo-color': COR_TERRA,
				'text-halo-width': 1,
				'text-halo-blur': 0.5,
				'text-opacity': 0.7,
			},
		},
		{
			id: 'rotulo-paises',
			type: 'symbol',
			source: 'carto',
			'source-layer': 'place',
			minzoom: 2,
			maxzoom: 7,
			filter: ['all', ['==', 'class', 'country']],
			layout: {
				'text-field': '{name}',
				'text-font': FONTE_MEDIA,
				'text-transform': 'uppercase',
				'text-letter-spacing': 0.12,
				'text-size': [
					'interpolate',
					['linear'],
					['zoom'],
					2,
					10,
					6,
					14,
				],
			},
			paint: {
				'text-color': COR_TEXTO,
				'text-halo-color': COR_TERRA,
				'text-halo-width': 1.2,
				'text-halo-blur': 0.5,
			},
		},
	],
};
