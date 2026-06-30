import { useState } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from '@vis.gl/react-maplibre';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LAYERS_CONFIG } from '@/constants/layers';
import { METRICS_CONFIG } from '@/constants/metrics';
import IndicatorFilter from '@/components/dashboard/IndicatorFilter';
import LocationBreadcrumb from '@/components/dashboard/LocationBreadcrumb';
import LocationFilterPopover, {
	LocationFilterMenu,
} from '@/components/dashboard/LocationFilterPopover';
import LocationSearchPopover from '@/components/dashboard/LocationSearchPopover';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import type {
	LayerId,
	LocationFilter,
	MetricType,
} from '@/types/dashboard.types';

// Ordem de exibição das escalas (camadas), conforme o layout de referência.
const SCALE_ORDER: LayerId[] = [
	'regioes-metropolitanas',
	'municipios',
	'setores',
];

interface SidebarControlsProps {
	activeMetric: MetricType;
	onMetricChange: (metric: MetricType) => void;
	activeLayerId: LayerId;
	onLayerChange: (layerId: LayerId) => void;
	locationFilter: LocationFilter | null;
	onLocationFilterChange: (filter: LocationFilter | null) => void;
	mapRef: RefObject<MapRef | null>;
}

// Conteúdo compartilhado da sidebar (Indicadores + Escala). Usado tanto pela
// sidebar desktop quanto pela folha inferior no mobile — cada um fornece seu
// próprio contêiner/padding.
function SidebarControls({
	activeMetric,
	onMetricChange,
	activeLayerId,
	onLayerChange,
	locationFilter,
	onLocationFilterChange,
	mapRef,
}: SidebarControlsProps) {
	const [setoresMenuOpen, setSetoresMenuOpen] = useState(false);

	return (
		<>
			<IndicatorFilter
				activeMetric={activeMetric}
				onMetricChange={onMetricChange}
				metricsConfig={METRICS_CONFIG}
			/>

			{/* Escala: ~48px abaixo da grade de indicadores (Figma) */}
			<div className="space-y-2 pt-12">
				<div className="flex items-center justify-between gap-2">
					<p className="font-display text-3xl font-bold uppercase leading-none tracking-[0.01em] text-marca-creme">
						Escala
					</p>
					<div className="flex shrink-0 items-center gap-1">
						<LocationFilterPopover
							activeLayerId={activeLayerId}
							locationFilter={locationFilter}
							onLocationFilterChange={onLocationFilterChange}
						/>
						<LocationSearchPopover mapRef={mapRef} />
					</div>
				</div>

				<div className="flex items-center justify-between gap-2">
					<LocationBreadcrumb locationFilter={locationFilter} />
					{locationFilter && (
						<button
							type="button"
							onClick={() => onLocationFilterChange(null)}
							className="flex shrink-0 items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
						>
							<X size={12} />
							Limpar
						</button>
					)}
				</div>

				<ul className="space-y-0 pt-5">
					{SCALE_ORDER.map((id) => {
						const layer = LAYERS_CONFIG.find(
							(item) => item.id === id,
						);
						if (!layer) return null;
						const isActive = activeLayerId === id;
						const buttonClassName = cn(
							'flex w-full py-3 text-[1.375rem] font-semibold leading-none transition-colors',
							isActive
								? 'text-primary underline decoration-2 underline-offset-[5px]'
								: 'text-marca-creme hover:text-sidebar-foreground',
						);

						// "Setores" nunca troca a camada direto: abre o menu de
						// local (município/RM) e só ativa a camada após a escolha.
						if (id === 'setores') {
							return (
								<li key={id}>
									<Popover
										open={setoresMenuOpen}
										onOpenChange={setSetoresMenuOpen}
									>
										<PopoverTrigger asChild>
											<button
												type="button"
												className={buttonClassName}
											>
												<span className="text-left leading-tight">
													Setores
													<br />
													Censitários
												</span>
											</button>
										</PopoverTrigger>
										<PopoverContent
											className="w-64 rounded-none border-0 bg-marca-creme p-0 text-marca-verde shadow-[0_20px_50px_rgba(77,53,25,0.25)]"
											align="start"
										>
											<LocationFilterMenu
												tabs={[
													'municipio',
													'reg_metro',
												]}
												locationFilter={locationFilter}
												onSelect={(filter) => {
													onLayerChange('setores');
													onLocationFilterChange(
														filter,
													);
													setSetoresMenuOpen(false);
												}}
											/>
										</PopoverContent>
									</Popover>
								</li>
							);
						}

						return (
							<li key={id}>
								<button
									type="button"
									onClick={() => onLayerChange(id)}
									className={buttonClassName}
								>
									{id === 'regioes-metropolitanas' ? (
										<span className="text-left leading-tight">
											Regiões
											<br />
											Metropolitanas
										</span>
									) : (
										layer.label
									)}
								</button>
							</li>
						);
					})}
				</ul>
			</div>
		</>
	);
}

export default SidebarControls;
