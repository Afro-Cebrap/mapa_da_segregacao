import { Popup } from '@vis.gl/react-maplibre';
import { formatMetricValue, formatNumber } from '@/lib/format';
import { getEntityName } from '@/lib/segregation';
import type { MapPopupProps, MetricType } from '@/types/dashboard.types';

function MapPopup({
	hoverInfo,
	activeMetric,
	metricsConfig,
	levelLabel,
	positionLabel,
}: MapPopupProps) {
	const { properties } = hoverInfo;

	const allMetrics = Object.entries(metricsConfig) as [
		MetricType,
		(typeof metricsConfig)[MetricType],
	][];

	const composicaoRows = allMetrics.filter(
		([, config]) => config.group === 'composicao',
	);

	// Tooltip mostra apenas o indicador atualmente selecionado (não a lista
	// inteira), conforme o layout do Figma.
	const activeConfig = metricsConfig[activeMetric];

	const entityName = getEntityName(properties);

	return (
		<Popup
			longitude={hoverInfo.longitude}
			latitude={hoverInfo.latitude}
			closeButton={false}
			closeOnClick={false}
			anchor="bottom"
			offset={15}
			className="z-50 [&_.maplibregl-popup-content]:!p-0 [&_.maplibregl-popup-content]:!bg-transparent [&_.maplibregl-popup-content]:!shadow-none [&_.maplibregl-popup-tip]:!border-t-transparent"
			style={{ padding: 0 }}
		>
			<div className="w-[270px] rounded-none border-[0.3px] border-marca-verde bg-marca-creme pb-3 text-marca-verde shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
				{/* ── Topo (creme): título + indicador selecionado ── */}
				<div className="px-[17px] pb-3.5 pt-[22px]">
					<h4 className="truncate font-display text-xl font-bold leading-none text-marca-verde">
						{entityName}
						{properties.abbrev_state
							? ` | ${properties.abbrev_state}`
							: ''}
					</h4>

					<div className="mt-3.5 flex items-start justify-between gap-4 text-marca-verde">
						{/* Esquerda: termo da variável com o valor logo abaixo */}
						<div className="min-w-0">
							<p className="text-xs font-normal leading-6">
								{activeConfig.label}
							</p>
							<p className="text-xs font-bold leading-6 tabular-nums">
								{formatMetricValue(
									properties[activeMetric],
									activeConfig.format,
								)}
							</p>
						</div>

						{/* Direita: posição por tercis no escopo + "nível"
						    (escopo do ranking, o mesmo da sidebar) */}
						<div className="shrink-0 text-right text-[11px] font-normal leading-6">
							<p>
								Posição:{' '}
								<span className="font-bold">
									{positionLabel ?? '—'}
								</span>
							</p>
							<p className="truncate">
								Nível:{' '}
								<span className="font-bold">{levelLabel}</span>
							</p>
						</div>
					</div>
				</div>

				{/* ── Sub-card verde: composição racial ── */}
				<div className="mx-[9px] bg-marca-verde px-2 py-4 text-marca-creme">
					<div className="flex justify-between gap-3">
						<div className="shrink-0">
							<p className="font-display text-xl font-semibold leading-[1.1] text-marca-laranja">
								Composição
								<br />
								Racial
							</p>
							{typeof properties.n_total === 'number' && (
								<p className="mt-2 text-xs font-light tabular-nums">
									n={formatNumber(properties.n_total)}
								</p>
							)}
						</div>

						<div className="min-w-0 flex-1">
							{composicaoRows.map(([key, config]) => (
								<div
									key={key}
									className="flex items-center justify-between gap-2 leading-6"
								>
									<span className="text-xs font-normal">
										{config.label}
									</span>
									<span className="text-xs font-bold tabular-nums">
										{typeof properties[key] === 'number'
											? formatMetricValue(
													properties[key],
													config.format,
												)
											: '-'}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</Popup>
	);
}

export default MapPopup;
