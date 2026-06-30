import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import CensusYearFilter from '@/components/dashboard/CensusYearFilter';
import SidebarControls from '@/components/dashboard/SidebarControls';
import type { DashboardSidebarProps } from '@/types/dashboard.types';

function DashboardSidebar({
	censusYear,
	onCensusYearChange,
	activeMetric,
	onMetricChange,
	activeLayerId,
	onLayerChange,
	locationFilter,
	onLocationFilterChange,
	mapRef,
	isCollapsed,
}: DashboardSidebarProps) {
	return (
		<motion.aside
			initial={false}
			animate={{ width: isCollapsed ? 64 : 380 }}
			transition={{ type: 'spring', stiffness: 300, damping: 30 }}
			className="relative z-20 flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-[10px_0_34px_-6px_rgba(0,0,0,0.55)]"
		>
			{/* ── Zona 1: cabeçalho creme (medidas do Figma: 34px no topo,
			    24px até o CENSO, 44px até o fim, conteúdo a ~39px da borda) ── */}
			<div className="shrink-0 bg-background px-10 pb-11 pt-8 text-foreground">
				<div className="flex items-start justify-between gap-2">
					{!isCollapsed && (
						<Link to="/" className="block hover:opacity-80">
							<h1 className="font-display text-[2.7rem] font-black uppercase leading-[0.88] tracking-[0.005em] text-primary">
								Mapa da
								<br />
								<span className="text-foreground">
									Segregação
								</span>
							</h1>
						</Link>
					)}
					{/* <button
						type="button"
						onClick={onToggleCollapse}
						aria-label={
							isCollapsed
								? 'Expandir sidebar'
								: 'Recolher sidebar'
						}
						className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground"
					>
						{isCollapsed ? (
							<ChevronsRight size={16} />
						) : (
							<ChevronsLeft size={16} />
						)}
					</button> */}
				</div>

				{!isCollapsed && (
					<div className="mt-6">
						<CensusYearFilter
							censusYear={censusYear}
							onCensusYearChange={onCensusYearChange}
						/>
					</div>
				)}
			</div>

			{/* ── Zona 2/3: corpo verde (55px até o 1º título e ~48px entre
			    seções, conforme o Figma). O corpo inteiro rola como um bloco
			    único: as seções fluem de cima para baixo com o gap do Figma,
			    sem esticar os Indicadores para empurrar a Escala ao rodapé. ── */}
			{!isCollapsed && (
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-10 pb-8 pt-14">
					<SidebarControls
						activeMetric={activeMetric}
						onMetricChange={onMetricChange}
						activeLayerId={activeLayerId}
						onLayerChange={onLayerChange}
						locationFilter={locationFilter}
						onLocationFilterChange={onLocationFilterChange}
						mapRef={mapRef}
					/>
				</div>
			)}
		</motion.aside>
	);
}

export default DashboardSidebar;
