import type { LucideIcon } from 'lucide-react';
import type { MapRef } from '@vis.gl/react-maplibre';
import type { RefObject } from 'react';
import type { SegregationProperties } from '@/services/setores/Setores.interface';

// ── Census & Metrics ──────────────────────────────────────────────

export type CensusYear = 2010 | 2022;

export type MetricType =
	| 'dissimilarity'
	| 'index_h'
	| 'percent_branca'
	| 'percent_preta'
	| 'percent_amarela'
	| 'percent_parda'
	| 'percent_indigena'
	| 'exp_branca_pp'
	| 'exp_pp_branca'
	| 'iso_pp_pp'
	| 'iso_branca_branca';

export type MetricGroup = 'segregacao' | 'composicao';

export interface MetricConfig {
	prop: MetricType;
	label: string;
	icon: LucideIcon;
	group: MetricGroup;
	breaks: [number, number, number, number];
	palette: [string, string, string, string];
	/** Formatação customizada do valor no tooltip. Se omitido, usa toLocaleString padrão. */
	format?: (value: number) => string;
}

export type MetricsConfigMap = Record<MetricType, MetricConfig>;

// ── GeoJSON Feature Properties ────────────────────────────────────

export type CensusSectorProperties = SegregationProperties;

// ── Map Hover ─────────────────────────────────────────────────────

export interface HoverInfo {
	longitude: number;
	latitude: number;
	properties: CensusSectorProperties;
	layerLabel: string;
}

export interface SelectedGeometryInfo {
	properties: CensusSectorProperties;
	layerLabel: string;
}

// ── Map Layers ────────────────────────────────────────────────────

export type LayerId = 'municipios' | 'setores' | 'regioes-metropolitanas';

export interface MapLayerConfig {
	id: LayerId;
	label: string;
	icon: LucideIcon;
	color: string;
	endpoint: 'municipios' | 'setores' | 'reg_metro';
}

// ── Camadas auxiliares (CAMADAS) ──────────────────────────────────

// Redes de escolas disponíveis nos mocks.
export type EscolaRede = 'publica' | 'privada';

// ── Component Props ───────────────────────────────────────────────

export interface DashboardSidebarProps {
	censusYear: CensusYear;
	onCensusYearChange: (year: CensusYear) => void;
	activeMetric: MetricType;
	onMetricChange: (metric: MetricType) => void;
	activeLayerId: LayerId;
	onLayerChange: (layerId: LayerId) => void;
	locationFilter: LocationFilter | null;
	onLocationFilterChange: (filter: LocationFilter | null) => void;
	mapRef: RefObject<MapRef | null>;
	isCollapsed: boolean;
	onToggleCollapse: () => void;
}

export interface DashboardMapProps {
	censusYear: CensusYear;
	activeMetric: MetricType;
	metricsConfig: MetricsConfigMap;
	hoverInfo: HoverInfo | null;
	onHoverChange: (
		infoOrUpdater:
			| HoverInfo
			| null
			| ((prev: HoverInfo | null) => HoverInfo | null),
	) => void;
	mapRef: RefObject<MapRef | null>;
	activeLayerId: LayerId;
	onGeometrySelect: (info: SelectedGeometryInfo | null) => void;
	locationFilter: LocationFilter | null;
	selectedGeometry: SelectedGeometryInfo | null;
	activeEscolas: EscolaRede[];
	// No mobile (toque) desliga a interação de hover: sem handlers de mouse
	// nem popups ao passar sobre região/escola — a seleção é por toque.
	isMobile?: boolean;
}

export interface DashboardLayersPanelProps {
	activeEscolas: EscolaRede[];
	onToggleEscola: (rede: EscolaRede) => void;
	className?: string;
	// Versão compacta para o mobile (título e itens menores, largura reduzida).
	compact?: boolean;
}

export interface DashboardToolboxProps {
	mapRef: RefObject<MapRef | null>;
}

export interface MapLegendProps {
	activeMetric: MetricType;
	metricsConfig: MetricsConfigMap;
	activeLayerLabel: string;
	// Versão enxuta para o mobile: só a barra de gradiente + Baixo/Alto,
	// sem a linha de título nem o badge de ajuda (o indicador ativo já
	// aparece no resumo da folha inferior).
	compact?: boolean;
}

export interface MapPopupProps {
	hoverInfo: HoverInfo;
	activeMetric: MetricType;
	metricsConfig: MetricsConfigMap;
	// Escopo ("nível") do ranking mostrado na sidebar — exibido também no tooltip.
	levelLabel: string;
	// Posição da localidade por tercis dentro do escopo (Baixo/Médio/Alto);
	// null quando não há ranking para o indicador/escopo atual.
	positionLabel: 'Baixo' | 'Médio' | 'Alto' | null;
}

export interface CensusYearFilterProps {
	censusYear: CensusYear;
	onCensusYearChange: (year: CensusYear) => void;
	// Quando renderizado sobre fundo escuro (folha inferior do mobile), usa
	// texto creme em vez do verde do cabeçalho creme do desktop.
	onDark?: boolean;
}

export interface IndicatorFilterProps {
	activeMetric: MetricType;
	onMetricChange: (metric: MetricType) => void;
	metricsConfig: MetricsConfigMap;
}

// ── Location Filter ───────────────────────────────────────────────

export type LocationFilterScope = 'estado' | 'municipio' | 'reg_metro';

export interface LocationFilter {
	scope: LocationFilterScope;
	code: string; // code_state / code_muni / name_metro (para RM, code = name_metro)
	name: string;
}

export interface LocationFilterPopoverProps {
	activeLayerId: LayerId;
	locationFilter: LocationFilter | null;
	censusYear: CensusYear;
	onLocationFilterChange: (filter: LocationFilter | null) => void;
	// Escolher um filtro cujo escopo é incompatível com a camada atual troca
	// para a camada natural (ex.: Município → Setores).
	onLayerChange: (layerId: LayerId) => void;
}
