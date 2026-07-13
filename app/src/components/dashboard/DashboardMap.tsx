import { useCallback, useMemo, useRef, useState } from 'react';
import { useFlyToLocation } from '@/hooks/useFlyToLocation';
import { useLocationLookups } from '@/hooks/useLocationLookups';
import { useEscolas } from '@/hooks/useEscolas';
import { computeBbox, fitMapToBbox } from '@/lib/geo';
import { getSegregationTileUrl } from '@/services/setores/Setores.services';
import type { EscolaRede, LayerId } from '@/types/dashboard.types';
import {
	AttributionControl,
	Layer,
	Map,
	Popup,
	Source,
	type LayerProps,
} from '@vis.gl/react-maplibre';
import { BASEMAP_STYLE } from '@/constants/basemap';
import { CORES_MARCA } from '@/constants/cores';
import { LAYERS_CONFIG } from '@/constants/layers';
import { useTheme } from '@/contexts/theme-context';
import {
	buildMuniBoundaryFilter,
	buildSetoresTileFilterParam,
	buildTileLocationFilter,
	buildTileSelectionFilter,
	getFeatureId,
	getSelectedInfo,
} from '@/lib/mapFilters';
import {
	ACTIVE_FILL_LAYER_ID,
	ESCOLAS_CIRCLE_LAYER_ID,
	buildBaseFillStyle,
	buildEscolasStyle,
	buildFillStyle,
	buildHoverLineStyle,
	buildLineStyle,
	buildMuniHighlightStyle,
	buildSelectionStyle,
} from '@/lib/mapStyles';
import { parseSegregationProperties } from '@/lib/segregation';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapPopup from '@/components/dashboard/MapPopup';
import MapLoadingOverlay from '@/components/dashboard/MapLoadingOverlay';
import MapTilesSpinner from '@/components/dashboard/MapTilesSpinner';
import {
	classifyPosition,
	isRankedMetric,
	useIndicatorRankings,
} from '@/hooks/useIndicatorRankings';
import { useMapLoadingState } from '@/hooks/useMapLoadingState';
import type { DashboardMapProps, HoverInfo } from '@/types/dashboard.types';

const ACTIVE_SOURCE_ID = 'active-geometry-data';
// Fonte de municípios usada só para desenhar o contorno destacado do município
// selecionado quando a camada ativa é de setores. Separada da fonte de setores
// para que a borda forte fique no perímetro do município, não em cada setor.
const MUNI_HIGHLIGHT_SOURCE_ID = 'muni-highlight-source';

// Camada interna do MVT emitido pelo backend (ST_AsMVT('setores_layer', ...));
// os tres endpoints usam o mesmo nome.
const TILE_SOURCE_LAYER = 'setores_layer';
// Acima deste zoom o MapLibre reaproveita (overzoom) as tiles ja baixadas em
// vez de pedir tiles novas ao backend, segurando a carga do servidor.
// Municipios/RM atingem detalhe maximo (tabela base) a partir de z12.
const TILE_MAXZOOM: Record<LayerId, number> = {
	setores: 14,
	municipios: 12,
	'regioes-metropolitanas': 12,
};

const ESCOLAS_SOURCE_ID = 'escolas-source';

const REDE_LABEL: Record<EscolaRede, string> = {
	publica: 'Rede pública',
	privada: 'Rede privada',
};

interface EscolaHoverState {
	longitude: number;
	latitude: number;
	nome: string;
	rede: EscolaRede;
}

export const INITIAL_VIEW_STATE = {
	longitude: -54,
	latitude: -14.5,
	zoom: 3.4,
} as const;

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' } as const;

interface HoveredFeatureState {
	source: string;
	// Fontes vetoriais (tiles) exigem sourceLayer no setFeatureState; GeoJSON nao.
	sourceLayer?: string;
	id: number | string;
}

function DashboardMap({
	censusYear,
	activeMetric,
	metricsConfig,
	hoverInfo,
	onHoverChange,
	mapRef,
	activeLayerId,
	onGeometrySelect,
	locationFilter,
	selectedGeometry,
	activeEscolas,
	isMobile = false,
}: DashboardMapProps) {
	const { theme } = useTheme();
	const isDark = theme === 'dark';
	// Mesmo ranking da sidebar (query compartilhada/deduplicada): fornece o
	// "nível" (escopo) e a posição por tercis da localidade sob hover.
	const { getRankings, levelLabel } = useIndicatorRankings(
		activeLayerId,
		locationFilter,
		censusYear,
	);
	const hoverPositionLabel =
		hoverInfo && isRankedMetric(activeMetric)
			? classifyPosition(
					getRankings(hoverInfo.properties)?.[activeMetric] ?? null,
				)
			: null;
	const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hoveredFeatureRef = useRef<HoveredFeatureState | null>(null);
	const [escolaHover, setEscolaHover] = useState<EscolaHoverState | null>(
		null,
	);

	// As tres camadas vem do backend como vector tiles (/api/<recurso>/tiles/
	// .pbf): o MapLibre baixa apenas protobufs pequenos por tile, cacheia
	// nativamente e carrega/descarta sob demanda — nada de GeoJSON do Brasil
	// inteiro em memoria.

	// Vira true no onLoad do <Map>; só então o hook consegue anexar listeners.
	const [mapReady, setMapReady] = useState(false);

	// Estado de carregamento derivado dos eventos do MapLibre.
	const { initialLoading, tilesLoading } = useMapLoadingState(mapRef, {
		mapReady,
	});

	const activeLayerConfig = useMemo(
		() =>
			LAYERS_CONFIG.find((layer) => layer.id === activeLayerId) ??
			LAYERS_CONFIG[0],
		[activeLayerId],
	);

	const config = metricsConfig[activeMetric];

	const fillStyle = useMemo(
		() => buildFillStyle(config.prop, config.breaks, config.palette),
		[config.prop, config.breaks, config.palette],
	);

	// O fundo branco só faz sentido sobre o mapa-base verde do tema claro; no
	// dark-matter (tema escuro) ele destoaria, então fica desativado.
	const baseFillStyle = useMemo(() => buildBaseFillStyle(), []);
	const showBaseFill = !isDark;

	const lineStyle = useMemo(
		() => buildLineStyle(activeLayerConfig.color),
		[activeLayerConfig.color],
	);

	const hoverLineStyle = useMemo(
		() => buildHoverLineStyle(isDark ? '#ffffff' : CORES_MARCA.verdeEscuro),
		[isDark],
	);

	// Tema claro usa o mapa-base do design (oceano laranja / terra verde);
	// o escuro segue no dark-matter da CARTO.
	const mapStyle = useMemo(
		() =>
			isDark
				? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
				: BASEMAP_STYLE,
		[isDark],
	);

	const beforeId = isDark ? 'transportation' : 'vias';

	// A borda do município precisa ficar ACIMA dos preenchimentos de setores.
	// Como a fonte de setores remonta quando o filtro muda (a URL do tile muda)
	// e re-insere seus preenchimentos antes de `vias`, usar o mesmo beforeId aqui
	// deixaria a ordem dependente da montagem — e os setores acabam cobrindo o
	// perímetro. Ancorar num layer acima do choropleth (rótulos de cidade, no
	// tema claro) garante que a borda fique sempre por cima dos setores e abaixo
	// dos rótulos. No tema escuro caímos para o topo da pilha (sem beforeId).
	const muniHighlightBeforeId = isDark ? undefined : 'rotulo-cidades';

	const { data: lookups } = useLocationLookups(censusYear);
	const flyToLocation = useFlyToLocation(mapRef, censusYear);

	const escolasGeojson = useEscolas(activeEscolas);
	const hasEscolas = escolasGeojson.features.length > 0;
	const escolasStyle = useMemo(() => buildEscolasStyle(), []);

	const selectionStyle = useMemo(() => buildSelectionStyle(), []);

	// ── Camadas via vector tiles (modo API) ──────────────────────────
	// Sem GeoJSON em memoria, o filtro de localizacao e o realce da selecao
	// viram expressoes de filtro aplicadas direto nas layers da fonte vetorial.
	const tileUrl = useMemo(() => {
		const base = getSegregationTileUrl(activeLayerConfig.endpoint, censusYear);
		// Só setores filtra no servidor; municípios/RM seguem com a URL base.
		if (activeLayerId !== 'setores') return base;
		const param = buildSetoresTileFilterParam(locationFilter, lookups);
		if (!param) return base;
		const separator = base.includes('?') ? '&' : '?';
		return `${base}${separator}${new URLSearchParams(param).toString()}`;
	}, [activeLayerConfig.endpoint, activeLayerId, censusYear, locationFilter, lookups]);
	const tileLocationFilter = useMemo(
		() => buildTileLocationFilter(activeLayerId, locationFilter, lookups),
		[activeLayerId, locationFilter, lookups],
	);
	const tileSelectionFilter = useMemo(
		() => buildTileSelectionFilter(activeLayerId, selectedGeometry),
		[activeLayerId, selectedGeometry],
	);

	// Reaproveita os estilos do choropleth amarrando-os a camada interna do MVT
	// (source-layer) e aos filtros de localizacao/selecao. O cast e necessario
	// porque LayerProps e uma uniao por tipo de layer e nao infere bem com o
	// spread + props extras.
	// IMPORTANTE: quando nao ha filtro de localizacao, a chave `filter` precisa
	// ser OMITIDA (nao `undefined`). O map.addLayer do MapLibre valida o spec
	// completo e rejeita `filter: undefined` ("array expected, undefined found"),
	// derrubando a layer inteira e deixando o mapa vazio. O spread condicional
	// garante que a chave so exista quando ha um filtro valido.
	const tileBaseFillLayer = useMemo(
		() =>
			({
				...baseFillStyle,
				'source-layer': TILE_SOURCE_LAYER,
				...(tileLocationFilter ? { filter: tileLocationFilter } : {}),
			}) as LayerProps,
		[baseFillStyle, tileLocationFilter],
	);
	const tileFillLayer = useMemo(
		() =>
			({
				...fillStyle,
				'source-layer': TILE_SOURCE_LAYER,
				...(tileLocationFilter ? { filter: tileLocationFilter } : {}),
			}) as LayerProps,
		[fillStyle, tileLocationFilter],
	);
	const tileLineLayer = useMemo(
		() =>
			({
				...lineStyle,
				'source-layer': TILE_SOURCE_LAYER,
				...(tileLocationFilter ? { filter: tileLocationFilter } : {}),
			}) as LayerProps,
		[lineStyle, tileLocationFilter],
	);
	const tileHoverLineLayer = useMemo(
		() =>
			({
				...hoverLineStyle,
				'source-layer': TILE_SOURCE_LAYER,
			}) as LayerProps,
		[hoverLineStyle],
	);
	const tileSelectionLayer = useMemo(
		() =>
			({
				...selectionStyle,
				'source-layer': TILE_SOURCE_LAYER,
				filter: tileSelectionFilter,
			}) as LayerProps,
		[selectionStyle, tileSelectionFilter],
	);
	const muniHighlightStyle = useMemo(() => buildMuniHighlightStyle(), []);
	// Contorno do município selecionado desenhado sobre a fonte de MUNICÍPIOS
	// (um polígono por município), não sobre setores — assim a borda forte fica
	// só no perímetro do município. A fonte de municípios só é montada quando o
	// filtro está ativo, para não baixar tiles à toa.
	const muniBoundaryFilter = useMemo(
		() => buildMuniBoundaryFilter(activeLayerId, locationFilter),
		[activeLayerId, locationFilter],
	);
	const showMuniBoundary =
		Array.isArray(muniBoundaryFilter) && muniBoundaryFilter[0] === '==';
	const muniBoundaryTileUrl = useMemo(
		() => getSegregationTileUrl('municipios', censusYear),
		[censusYear],
	);
	const tileMuniHighlightLayer = useMemo(
		() =>
			({
				...muniHighlightStyle,
				'source-layer': TILE_SOURCE_LAYER,
				filter: muniBoundaryFilter,
			}) as LayerProps,
		[muniHighlightStyle, muniBoundaryFilter],
	);
	const interactiveLayerIds = useMemo(() => {
		const ids: string[] = [ACTIVE_FILL_LAYER_ID];
		if (hasEscolas) ids.push(ESCOLAS_CIRCLE_LAYER_ID);
		return ids;
	}, [hasEscolas]);

	const clearHoveredFeatureState = useCallback(() => {
		const hoveredFeature = hoveredFeatureRef.current;
		const map = mapRef.current?.getMap();

		if (!map || hoveredFeature === null) return;

		try {
			map.setFeatureState(hoveredFeature, { hover: false });
		} catch {
			// A fonte pode ter sido trocada durante uma mudanca de camada.
		}

		hoveredFeatureRef.current = null;
	}, [mapRef]);

	const setHoveredFeatureState = useCallback(
		(nextFeature: HoveredFeatureState | null) => {
			if (
				nextFeature === null ||
				(hoveredFeatureRef.current?.id === nextFeature.id &&
					hoveredFeatureRef.current.source === nextFeature.source)
			) {
				return;
			}

			clearHoveredFeatureState();

			const map = mapRef.current?.getMap();
			if (!map) return;

			try {
				map.setFeatureState(nextFeature, { hover: true });
				hoveredFeatureRef.current = nextFeature;
			} catch {
				hoveredFeatureRef.current = null;
			}
		},
		[clearHoveredFeatureState, mapRef],
	);

	const onHover = useCallback(
		(event: maplibregl.MapLayerMouseEvent) => {
			if (hoverTimeout.current) {
				clearTimeout(hoverTimeout.current);
			}

			// Escolas: tooltip com o nome, sem acionar o hover do choropleth.
			const escolaFeature = event.features?.find(
				(item) => item.layer?.id === ESCOLAS_CIRCLE_LAYER_ID,
			);
			if (escolaFeature) {
				clearHoveredFeatureState();
				onHoverChange(null);
				const props = escolaFeature.properties ?? {};
				setEscolaHover({
					longitude: event.lngLat.lng,
					latitude: event.lngLat.lat,
					nome: String(props.Escola ?? 'Escola'),
					rede: props.rede === 'privada' ? 'privada' : 'publica',
				});
				return;
			}
			setEscolaHover(null);

			const feature = event.features?.[0];

			if (!feature) {
				clearHoveredFeatureState();
				onHoverChange(null);
				return;
			}

			const featureId = getFeatureId(feature);
			const properties = parseSegregationProperties(
				(feature.properties ?? {}) as Record<string, unknown>,
			);

			if (featureId !== null) {
				setHoveredFeatureState({
					source: ACTIVE_SOURCE_ID,
					sourceLayer: TILE_SOURCE_LAYER,
					id: featureId,
				});
			}

			hoverTimeout.current = setTimeout(() => {
				onHoverChange((prev: HoverInfo | null) => {
					const previousKey =
						prev?.properties?.code_tract ??
						prev?.properties?.code_muni ??
						prev?.properties?.name_metro ??
						null;
					const nextKey =
						properties.code_tract ??
						properties.code_muni ??
						properties.name_metro ??
						null;

					if (
						previousKey === nextKey &&
						prev &&
						prev.layerLabel === activeLayerConfig.label
					) {
						return prev;
					}

					return {
						longitude: event.lngLat.lng,
						latitude: event.lngLat.lat,
						properties,
						layerLabel: activeLayerConfig.label,
					};
				});
			}, 40);
		},
		[
			activeLayerConfig.label,
			clearHoveredFeatureState,
			onHoverChange,
			setHoveredFeatureState,
		],
	);

	const onClick = useCallback(
		(event: maplibregl.MapLayerMouseEvent) => {
			// Seleciona apenas geometrias do choropleth (ignora pontos de escola).
			const feature = event.features?.find(
				(item) => item.layer?.id === ACTIVE_FILL_LAYER_ID,
			);
			onGeometrySelect(
				feature
					? getSelectedInfo(feature, activeLayerConfig.label)
					: null,
			);

			if (!feature) return;

			// "tp": enquadra o mapa na localidade clicada. Municípios/RM usam o
			// bbox completo das geometrias de referência (o feature do tile pode
			// vir recortado); setores usam a própria geometria do tract clicado.
			const props = feature.properties ?? {};
			if (
				activeLayerId === 'regioes-metropolitanas' &&
				props.name_metro
			) {
				flyToLocation({
					scope: 'reg_metro',
					code: String(props.name_metro),
				});
			} else if (
				activeLayerId === 'municipios' &&
				props.code_muni != null
			) {
				flyToLocation({
					scope: 'municipio',
					code: String(props.code_muni),
				});
			} else if (feature.geometry) {
				fitMapToBbox(
					mapRef,
					computeBbox(feature.geometry as GeoJSON.Geometry),
				);
			}
		},
		[
			activeLayerConfig.label,
			activeLayerId,
			flyToLocation,
			mapRef,
			onGeometrySelect,
		],
	);

	const onMouseEnter = useCallback((e: maplibregl.MapLayerMouseEvent) => {
		(e.target as maplibregl.Map).getCanvas().style.cursor = 'pointer';
	}, []);

	const onMouseLeave = useCallback(
		(e: maplibregl.MapLayerMouseEvent) => {
			(e.target as maplibregl.Map).getCanvas().style.cursor = '';
			if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
			clearHoveredFeatureState();
			onHoverChange(null);
			setEscolaHover(null);
		},
		[clearHoveredFeatureState, onHoverChange],
	);

	return (
		<div className="absolute inset-0 z-0">
			<MapLoadingOverlay visible={initialLoading} />

			<MapTilesSpinner
				visible={!initialLoading && tilesLoading}
				isMobile={isMobile}
			/>

			<Map
				ref={mapRef}
				initialViewState={INITIAL_VIEW_STATE}
				mapStyle={mapStyle}
				style={MAP_CONTAINER_STYLE}
				interactiveLayerIds={interactiveLayerIds}
				attributionControl={false}
				// Norte travado: sem rotacao por arraste (botao direito),
				// pitch ou toque — o mapa fica sempre apontado ao norte.
				// (teclado mantido para pan/zoom por acessibilidade).
				dragRotate={false}
				pitchWithRotate={false}
				touchPitch={false}
				onLoad={(e) => {
					e.target.touchZoomRotate.disableRotation();
					setMapReady(true);
				}}
				onClick={onClick}
				// No mobile não há hover: desliga os handlers de mouse para
				// não disparar popups com eventos sintéticos de toque.
				onMouseMove={isMobile ? undefined : onHover}
				onMouseEnter={isMobile ? undefined : onMouseEnter}
				onMouseLeave={isMobile ? undefined : onMouseLeave}
			>
				<AttributionControl position="bottom-right" compact />

				<Source
					key={`tiles-${activeLayerId}-${tileUrl}`}
					id={ACTIVE_SOURCE_ID}
					type="vector"
					tiles={[tileUrl]}
					maxzoom={TILE_MAXZOOM[activeLayerId]}
				>
					{showBaseFill && (
						<Layer {...tileBaseFillLayer} beforeId={beforeId} />
					)}
					<Layer {...tileFillLayer} beforeId={beforeId} />
					<Layer {...tileLineLayer} beforeId={beforeId} />
					<Layer {...tileHoverLineLayer} beforeId={beforeId} />
					<Layer {...tileSelectionLayer} beforeId={beforeId} />
				</Source>

				{showMuniBoundary && (
					<Source
						key={`muni-highlight-${muniBoundaryTileUrl}`}
						id={MUNI_HIGHLIGHT_SOURCE_ID}
						type="vector"
						tiles={[muniBoundaryTileUrl]}
						maxzoom={TILE_MAXZOOM.municipios}
					>
						<Layer
							{...tileMuniHighlightLayer}
							beforeId={muniHighlightBeforeId}
						/>
					</Source>
				)}

				{hasEscolas && (
					<Source
						id={ESCOLAS_SOURCE_ID}
						type="geojson"
						data={escolasGeojson}
					>
						<Layer {...escolasStyle} />
					</Source>
				)}

				{!isMobile && hoverInfo && (
					<MapPopup
						hoverInfo={hoverInfo}
						activeMetric={activeMetric}
						metricsConfig={metricsConfig}
						levelLabel={levelLabel}
						positionLabel={hoverPositionLabel}
					/>
				)}

				{!isMobile && escolaHover && (
					<Popup
						longitude={escolaHover.longitude}
						latitude={escolaHover.latitude}
						closeButton={false}
						closeOnClick={false}
						offset={12}
						className="school-tooltip"
					>
						<div className="rounded-md border border-border bg-card px-2.5 py-1.5 shadow-md">
							<p className="text-sm font-semibold text-foreground">
								{escolaHover.nome}
							</p>
							<p className="text-xs font-medium text-muted-foreground">
								{REDE_LABEL[escolaHover.rede]}
							</p>
						</div>
					</Popup>
				)}
			</Map>
		</div>
	);
}

export default DashboardMap;
