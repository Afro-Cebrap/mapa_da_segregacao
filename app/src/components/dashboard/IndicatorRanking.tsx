import { RANKED_METRICS } from '@/hooks/useIndicatorRankings';
import type {
	RankingsByMetric,
	StatsByMetric,
} from '@/hooks/useIndicatorRankings';
import { formatNumber, ratio } from '@/lib/format';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

// Recebe o ranking já computado de PlaceDetails (que chama useIndicatorRankings
// uma única vez), em vez de recalcular — antes pai e filho rodavam computeRankings
// sobre os ~316k setores em paralelo a cada abertura/filtro do painel.
interface IndicatorRankingProps {
	rankings: RankingsByMetric | null;
	stats: StatsByMetric;
	isLoading: boolean;
}

function IndicatorRanking({
	rankings,
	stats,
	isLoading,
}: IndicatorRankingProps) {
	return (
		<section>
			<TooltipProvider delayDuration={0}>
				<div className="space-y-4">
					{RANKED_METRICS.map((metric) => {
						const rank = rankings?.[metric.key] ?? null;
						const metricStats = stats[metric.key];
						const value =
							rank?.value !== null &&
							rank?.value !== undefined &&
							Number.isFinite(rank.value)
								? (rank.value as number)
								: null;
						const valuePct =
							metricStats && value !== null
								? ratio(value, metricStats) * 100
								: null;
						const meanPct = metricStats
							? ratio(metricStats.mean, metricStats) * 100
							: null;

						return (
							<div key={metric.key}>
								<div className="flex items-center justify-between gap-2">
									<span
										className="text-xs font-bold text-foreground"
										title={metric.title}
									>
										{metric.label}
									</span>
									<span className="text-xs font-bold tabular-nums text-foreground">
										{isLoading ? (
											<span
												className="inline-block h-3 w-5 animate-pulse rounded-none bg-marca-verde/30 align-middle motion-reduce:animate-none"
												aria-hidden
											/>
										) : rank && rank.total > 0 ? (
											`${rank.rank}°`
										) : (
											'—'
										)}
									</span>
								</div>

								<div className="relative my-2 h-1.5 w-full bg-marca-verde">
									{isLoading && (
										<div
											className="absolute inset-0 animate-pulse bg-marca-verde/50 motion-reduce:animate-none"
											aria-hidden
										/>
									)}
									{!isLoading && meanPct !== null && (
										<div
											className="absolute top-1/2 h-3.5 -translate-x-1/2 -translate-y-1/2 border-l border-dashed border-marca-verde"
											style={{ left: `${meanPct}%` }}
											aria-hidden
										/>
									)}
									{valuePct !== null && value !== null && (
										<Tooltip>
											<TooltipTrigger asChild>
												<div
													className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-primary"
													style={{
														left: `${valuePct}%`,
													}}
													aria-label={`Valor: ${formatNumber(value)}`}
												/>
											</TooltipTrigger>
											<TooltipContent
												side="bottom"
												sideOffset={6}
												className="rounded-none bg-primary px-2 py-1 font-bold text-marca-verde [&_svg]:bg-primary [&_svg]:fill-primary"
											>
												<span className="tabular-nums">
													{formatNumber(value)}
												</span>
											</TooltipContent>
										</Tooltip>
									)}
								</div>

								<div className="flex items-center justify-between font-display text-xs font-light text-foreground">
									<span>Baixo</span>
									<span>Alto</span>
								</div>
							</div>
						);
					})}
				</div>
			</TooltipProvider>
		</section>
	);
}

export default IndicatorRanking;
