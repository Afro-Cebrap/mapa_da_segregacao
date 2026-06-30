'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { MapRef } from '@vis.gl/react-maplibre';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardMap, {
	INITIAL_VIEW_STATE,
} from '@/components/dashboard/DashboardMap';
import DashboardLayersPanel from '@/components/dashboard/DashboardLayersPanel';
import DashboardToolbox from '@/components/dashboard/DashboardToolbox';
import GeometryDetailsPanel from '@/components/dashboard/GeometryDetailsPanel';
import MapLegend from '@/components/dashboard/MapLegend';
import CensusYearFilter from '@/components/dashboard/CensusYearFilter';
import SidebarControls from '@/components/dashboard/SidebarControls';
import PlaceDetails from '@/components/dashboard/PlaceDetails';
import MobileTopBar from '@/components/dashboard/MobileTopBar';
import MobileBottomSheet, {
	type SheetSnap,
} from '@/components/dashboard/MobileBottomSheet';
import SheetViewTabs, {
	type SheetView,
} from '@/components/dashboard/SheetViewTabs';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePageMeta } from '@/hooks/usePageMeta';
import { getEntityName } from '@/lib/segregation';
import { LAYERS_CONFIG } from '@/constants/layers';
import { METRICS_CONFIG } from '@/constants/metrics';
import { computeBbox, fitMapToBbox } from '@/lib/geo';
import { isFilterCompatible } from '@/lib/location';
import { useFlyToLocation } from '@/hooks/useFlyToLocation';
import { useLocationLookups } from '@/hooks/useLocationLookups';
import { useEscalaSetores } from '@/hooks/useSetores';
import type {
	CensusYear,
	EscolaRede,
	HoverInfo,
	LayerId,
	LocationFilter,
	MetricType,
	MetricsConfigMap,
	SelectedGeometryInfo,
} from '@/types/dashboard.types';

// Resumo do cabeçalho da folha inferior (mobile): deixa claro o tipo
// selecionado (Município / RM / Setor) e inclui a UF quando houver.
function buildSelectionSummary(selected: SelectedGeometryInfo): string {
	const p = selected.properties;
	const uf = p.abbrev_state ? ` | ${p.abbrev_state}` : '';
	if (p.code_tract) {
		// Setor censitário: mostra o município/UF a que pertence como contexto.
		const contexto = p.name_muni ? `${p.name_muni}${uf}` : p.code_tract;
		return `Setor · ${contexto}`;
	}
	if (p.name_metro && !p.name_muni) {
		return `RM · ${p.name_metro}`;
	}
	return `Município · ${getEntityName(p)}${uf}`;
}

function Dashboard() {
	usePageMeta({
		title: 'Dashboard — Mapa da Segregação',
		description:
			'Visualize e compare indicadores de segregação racial no mapa interativo, por setor censitário, município e região metropolitana.',
		canonicalPath: '/dashboard',
	});

	const mapRef = useRef<MapRef | null>(null);

	const [censusYear, setCensusYear] = useState<CensusYear>(2010);
	const [activeMetric, setActiveMetric] =
		useState<MetricType>('dissimilarity');
	const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
	const [selectedGeometry, setSelectedGeometry] =
		useState<SelectedGeometryInfo | null>(null);

	const isMobile = useIsMobile();
	// No mobile a sidebar nem é montada; o estado serve ao desktop. Forçamos o
	// colapso ao entrar em largura mobile (o usuário ainda pode alternar
	// manualmente), reusando o breakpoint de useIsMobile em vez de um segundo
	// matchMedia.
	const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (isMobile) setSidebarCollapsed(true);
	}, [isMobile]);

	const [activeLayerId, setActiveLayerId] = useState<LayerId>('municipios');
	const [activeEscolas, setActiveEscolas] = useState<EscolaRede[]>([]);
	const [locationFilter, setLocationFilter] = useState<LocationFilter | null>(
		null,
	);

	const handleToggleEscola = useCallback((rede: EscolaRede) => {
		setActiveEscolas((prev) =>
			prev.includes(rede)
				? prev.filter((item) => item !== rede)
				: [...prev, rede],
		);
	}, []);

	const flyToLocation = useFlyToLocation(mapRef);

	// Escolher uma localidade no filtro ou na escala de setores também enquadra
	// ("tp") o mapa nela. Limpar o filtro (null) na escala de setores não faz
	// sentido — mostraria o Brasil inteiro —, então volta para Municípios.
	const handleLocationFilterChange = useCallback(
		(filter: LocationFilter | null) => {
			setLocationFilter(filter);
			if (filter) {
				flyToLocation({ scope: filter.scope, code: filter.code });
				return;
			}
			if (activeLayerId === 'setores') {
				setActiveLayerId('municipios');
				setHoverInfo(null);
				setSelectedGeometry(null);
			}
		},
		[flyToLocation, activeLayerId],
	);

	const handleHoverChange = useCallback(
		(
			infoOrUpdater:
				| HoverInfo
				| null
				| ((prev: HoverInfo | null) => HoverInfo | null),
		) => {
			if (typeof infoOrUpdater === 'function') {
				setHoverInfo(infoOrUpdater);
			} else {
				setHoverInfo(infoOrUpdater);
			}
		},
		[],
	);

	const handleToggleSidebar = useCallback(() => {
		setSidebarCollapsed((prev) => !prev);
	}, []);

	const handleLayerChange = useCallback(
		(layerId: LayerId) => {
			setActiveLayerId(layerId);
			setHoverInfo(null);
			setSelectedGeometry(null);
			if (
				locationFilter &&
				!isFilterCompatible(locationFilter.scope, layerId)
			) {
				setLocationFilter(null);
			}
			// RM e Municípios são escalas de nível nacional: ao escolhê-las,
			// o mapa volta ao enquadramento do Brasil.
			if (
				layerId === 'regioes-metropolitanas' ||
				layerId === 'municipios'
			) {
				mapRef.current?.getMap()?.flyTo({
					center: [
						INITIAL_VIEW_STATE.longitude,
						INITIAL_VIEW_STATE.latitude,
					],
					zoom: INITIAL_VIEW_STATE.zoom,
					duration: 1200,
				});
			}
		},
		[locationFilter],
	);

	const handleExploreSetores = useCallback(() => {
		if (!selectedGeometry) return;
		const { properties } = selectedGeometry;

		setActiveLayerId('setores');

		if (properties.code_muni && properties.name_muni) {
			setLocationFilter({
				scope: 'municipio',
				code: properties.code_muni,
				name: properties.name_muni,
			});
		} else if (properties.name_metro) {
			setLocationFilter({
				scope: 'reg_metro',
				code: properties.name_metro,
				name: properties.name_metro,
			});
		}

		// Reenquadra o mapa na geometria de origem (município ou RM) antes
		// da troca de camada, enquanto o source atual ainda a contém.
		const fitToFeature = (
			key: 'code_muni' | 'name_metro',
			value: string,
		) => {
			const map = mapRef.current?.getMap();
			if (!map) return;
			// Na fonte vetorial o code_muni vem como inteiro e o sourceLayer e
			// obrigatorio.
			const filterValue = key === 'code_muni' ? Number(value) : value;
			const sourceFeatures = map.querySourceFeatures(
				'active-geometry-data',
				{
					sourceLayer: 'setores_layer',
					filter: ['==', ['get', key], filterValue],
				},
			);
			const first = sourceFeatures[0];
			if (first?.geometry) {
				fitMapToBbox(mapRef, computeBbox(first.geometry), {
					padding: 60,
					duration: 1200,
				});
			}
		};

		if (properties.code_muni) {
			fitToFeature('code_muni', properties.code_muni);
		} else if (properties.name_metro) {
			fitToFeature('name_metro', properties.name_metro);
		}

		setSelectedGeometry(null);
	}, [selectedGeometry]);

	// ── Escala dinâmica de setores ────────────────────────────────────────────
	// Quando a camada ativa é setores, os breaks do choropleth são calculados
	// com base nos dados reais do escopo relevante:
	//   · município em RM  → todos os setores da RM inteira
	//   · município isolado → apenas os setores daquele município
	const { data: lookups } = useLocationLookups();

	const escalaParams = useMemo(() => {
		if (activeLayerId !== 'setores' || !locationFilter) return null;

		if (locationFilter.scope === 'reg_metro') {
			return {
				escopo: 'reg_metro' as const,
				codigo: locationFilter.code,
			};
		}

		if (locationFilter.scope === 'municipio') {
			const info = lookups.muniInfo.get(locationFilter.code);
			if (info?.name_metro) {
				return {
					escopo: 'reg_metro' as const,
					codigo: info.name_metro,
				};
			}
			return {
				escopo: 'municipio' as const,
				codigo: locationFilter.code,
			};
		}

		return null;
	}, [activeLayerId, locationFilter, lookups]);

	const { data: escalaBreaks } = useEscalaSetores(
		activeMetric,
		escalaParams?.escopo ?? null,
		escalaParams?.codigo ?? null,
	);

	const activeMetricsConfig = useMemo((): MetricsConfigMap => {
		if (!escalaBreaks) return METRICS_CONFIG;
		return {
			...METRICS_CONFIG,
			[activeMetric]: {
				...METRICS_CONFIG[activeMetric],
				breaks: escalaBreaks,
			},
		};
	}, [escalaBreaks, activeMetric]);
	// ─────────────────────────────────────────────────────────────────────────

	//const isMobile = useIsMobile();
	const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');
	const [sheetView, setSheetView] = useState<SheetView>('navegacao');

	// Ao selecionar uma geometria no mobile, sobe a folha para metade da tela e
	// abre direto a aba Dados; ao limpar, volta ao peek e à Navegação. Trocar de
	// aba manualmente NÃO mexe em selectedGeometry, então não dispara este efeito.
	useEffect(() => {
		if (!isMobile) return;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setSheetSnap(selectedGeometry ? 'half' : 'peek');
		setSheetView(selectedGeometry ? 'dados' : 'navegacao');
	}, [isMobile, selectedGeometry]);

	const activeLayerLabel =
		LAYERS_CONFIG.find((layer) => layer.id === activeLayerId)?.label ??
		'Municípios';

	return (
		<div className="flex h-full w-full overflow-hidden bg-[linear-gradient(180deg,rgba(255,250,240,0.9),rgba(244,236,222,0.94))]">
			{!isMobile && (
				<DashboardSidebar
					censusYear={censusYear}
					onCensusYearChange={setCensusYear}
					activeMetric={activeMetric}
					onMetricChange={setActiveMetric}
					activeLayerId={activeLayerId}
					onLayerChange={handleLayerChange}
					locationFilter={locationFilter}
					onLocationFilterChange={handleLocationFilterChange}
					mapRef={mapRef}
					isCollapsed={sidebarCollapsed}
					onToggleCollapse={handleToggleSidebar}
				/>
			)}

			<div className="relative flex-1 h-full overflow-hidden">
				<DashboardMap
					activeMetric={activeMetric}
					metricsConfig={activeMetricsConfig}
					hoverInfo={hoverInfo}
					onHoverChange={handleHoverChange}
					mapRef={mapRef}
					activeLayerId={activeLayerId}
					onGeometrySelect={setSelectedGeometry}
					locationFilter={locationFilter}
					selectedGeometry={selectedGeometry}
					activeEscolas={activeEscolas}
					isMobile={isMobile}
				/>

				<DashboardLayersPanel
					activeEscolas={activeEscolas}
					onToggleEscola={handleToggleEscola}
					className={isMobile ? 'top-16' : undefined}
					compact={isMobile}
				/>

				{!isMobile && (
					<GeometryDetailsPanel
						selectedGeometry={selectedGeometry}
						onClose={() => setSelectedGeometry(null)}
						activeLayerId={activeLayerId}
						locationFilter={locationFilter}
						onExploreSetores={handleExploreSetores}
					/>
				)}

				{!isMobile && <DashboardToolbox mapRef={mapRef} />}

				{!isMobile && (
					<div className="pointer-events-auto absolute bottom-6 left-4 z-20 hidden w-[273px] max-w-[calc(100%-2rem)] md:block">
						<MapLegend
							activeMetric={activeMetric}
							metricsConfig={activeMetricsConfig}
							activeLayerLabel={activeLayerLabel}
						/>
					</div>
				)}

				{isMobile && (
					<>
						<MobileTopBar mapRef={mapRef} />

						{/* Legenda visível no mapa (acima do peek da folha); ao
						    expandir a folha ela fica coberta. */}
						<div className="pointer-events-none absolute bottom-[100px] left-4 z-30 w-[240px] max-w-[calc(100%-2rem)]">
							<MapLegend
								activeMetric={activeMetric}
								metricsConfig={activeMetricsConfig}
								activeLayerLabel={activeLayerLabel}
								compact
							/>
						</div>

						<MobileBottomSheet
							snap={sheetSnap}
							onSnapChange={setSheetSnap}
							summary={
								selectedGeometry && sheetView === 'dados'
									? buildSelectionSummary(selectedGeometry)
									: activeMetricsConfig[activeMetric].label
							}
							tabBar={
								selectedGeometry ? (
									<SheetViewTabs
										view={sheetView}
										onViewChange={setSheetView}
										onClear={() =>
											setSelectedGeometry(null)
										}
									/>
								) : undefined
							}
						>
							{selectedGeometry && sheetView === 'dados' ? (
								<PlaceDetails
									selectedGeometry={selectedGeometry}
									onClose={() => setSelectedGeometry(null)}
									activeLayerId={activeLayerId}
									locationFilter={locationFilter}
									onExploreSetores={handleExploreSetores}
									showClose={false}
								/>
							) : (
								<div className="flex flex-col gap-8 pt-2">
									<CensusYearFilter
										censusYear={censusYear}
										onCensusYearChange={setCensusYear}
										onDark
									/>
									<SidebarControls
										activeMetric={activeMetric}
										onMetricChange={setActiveMetric}
										activeLayerId={activeLayerId}
										onLayerChange={handleLayerChange}
										locationFilter={locationFilter}
										onLocationFilterChange={
											handleLocationFilterChange
										}
										mapRef={mapRef}
									/>
								</div>
							)}
						</MobileBottomSheet>
					</>
				)}
			</div>
		</div>
	);
}

export default Dashboard;
