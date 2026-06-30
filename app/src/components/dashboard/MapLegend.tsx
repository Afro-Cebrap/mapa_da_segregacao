import { cn } from '@/lib/utils';
import type { MapLegendProps } from '@/types/dashboard.types';

function MapLegend({
	activeMetric,
	metricsConfig,
	activeLayerLabel,
	compact = false,
}: MapLegendProps) {
	const config = metricsConfig[activeMetric];

	return (
		<div className="rounded-none bg-marca-creme px-3 pb-3 pt-2.5 text-marca-verde shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
			{!compact && (
				<div className="flex items-start justify-between gap-3">
					<h4 className="min-w-0 truncate text-xs font-medium text-marca-verde">
						{config.label} • {activeLayerLabel}
					</h4>
					<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-none bg-primary text-xs font-semibold leading-none text-marca-verde">
						?
					</span>
				</div>
			)}

			<div
				className={cn(
					'relative h-4 w-full rounded-none',
					compact ? 'mt-0' : 'mt-2.5',
				)}
				style={{
					backgroundImage: `linear-gradient(90deg, ${config.palette[0]} 0%, ${config.palette[1]} 35%, ${config.palette[2]} 68%, ${config.palette[3]} 100%)`,
				}}
			>
				{[3, 35, 65, 97].map((pos) => (
					<span
						key={pos}
						aria-hidden
						className="absolute top-1/2 h-[22px] w-0.5 -translate-x-1/2 -translate-y-1/2 bg-primary outline outline-1 outline-black/60"
						style={{ left: `${pos}%` }}
					/>
				))}
			</div>
			<div className="mt-2 flex justify-between text-xs font-light text-marca-verde">
				<span>Baixo</span>
				<span>Alto</span>
			</div>
		</div>
	);
}

export default MapLegend;
