import { Loader2, X } from 'lucide-react';
import IndicatorRanking from '@/components/dashboard/IndicatorRanking';
import { useIndicatorRankings } from '@/hooks/useIndicatorRankings';
import { formatNumber, formatPercent } from '@/lib/format';
import { getComposition, getEntityName } from '@/lib/segregation';
import type {
	LayerId,
	LocationFilter,
	SelectedGeometryInfo,
} from '@/types/dashboard.types';

interface PlaceDetailsProps {
	selectedGeometry: SelectedGeometryInfo;
	onClose: () => void;
	activeLayerId: LayerId;
	locationFilter: LocationFilter | null;
	onExploreSetores: () => void;
	showClose?: boolean;
}

// Conteúdo do painel de detalhes de uma geometria (Composição Racial +
// Ranking de Indicadores). Sem contêiner posicional: a sidebar flutuante
// (desktop) e a folha inferior (mobile) fornecem o invólucro.
function PlaceDetails({
	selectedGeometry,
	onClose,
	activeLayerId,
	locationFilter,
	onExploreSetores,
	showClose = true,
}: PlaceDetailsProps) {
	const {
		getRankings,
		stats: rankingStats,
		isLoading: isRankingLoading,
		levelLabel,
	} = useIndicatorRankings(activeLayerId, locationFilter);

	const { properties, layerLabel } = selectedGeometry;
	const composition = getComposition(properties);
	const compositionTotal = composition.reduce(
		(sum, group) => sum + group.value,
		0,
	);
	const hasComposition = compositionTotal > 0;

	const rankings = getRankings(properties);
	const totalPosicoes = rankings
		? (Object.values(rankings).find((rank) => rank && rank.total > 0)
				?.total ?? null)
		: null;

	return (
		<>
			{/* ── Cabeçalho (verde) ── */}
			<div className="relative shrink-0 px-3 pb-3 pt-4">
				{showClose && (
					<button
						type="button"
						onClick={onClose}
						className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-none text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
						aria-label="Fechar painel"
					>
						<X size={14} />
					</button>
				)}

				<div className={`grid gap-2.5${showClose ? ' pr-8' : ''}`}>
					<div className="min-w-0">
						<span className="text-sm font-semibold text-sidebar-foreground">
							{layerLabel}
						</span>
						<h3 className="mt-0.5 truncate font-display text-xl font-bold uppercase leading-none tracking-[0.01em] text-sidebar-foreground">
							{getEntityName(properties)}
							{properties.abbrev_state
								? ` | ${properties.abbrev_state}`
								: ''}
						</h3>
					</div>

					{activeLayerId !== 'setores' && (
						<button
							type="button"
							onClick={onExploreSetores}
							className="inline-flex items-center justify-center justify-self-start rounded-none bg-primary px-3 py-1.5 text-xs font-normal text-marca-verde-escuro transition-colors hover:bg-primary/90"
						>
							Explorar setores censitários
						</button>
					)}
				</div>
			</div>

			{/* ── Corpo: cartões creme ── */}
			<div className="flex flex-col gap-3 overflow-y-auto px-3 pb-3">
				{/* Composição Racial */}
				<section className="rounded-none bg-marca-creme px-3.5 py-3 text-card-foreground">
					<div className="flex items-baseline justify-between gap-2">
						<h4 className="font-display text-xl font-semibold leading-none text-foreground">
							Composição Racial
						</h4>
						{typeof properties.n_total === 'number' && (
							<span className="shrink-0 text-xs font-bold text-foreground">
								População:{' '}
								<span className="tabular-nums">
									{formatNumber(properties.n_total)}
								</span>
							</span>
						)}
					</div>

					{hasComposition ? (
						<div className="mt-3 flex h-5 w-full overflow-hidden rounded-none">
							{composition
								.filter((group) => group.value > 0)
								.map((group) => (
									<span
										key={group.key}
										title={`${group.label}: ${formatPercent(group.value, 1)}`}
										style={{
											backgroundColor: group.color,
											width: `${(group.value / compositionTotal) * 100}%`,
										}}
									/>
								))}
						</div>
					) : (
						<div className="mt-3 h-5 w-full rounded-none bg-muted/60" />
					)}

					<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
						{composition.map((group) => (
							<div
								key={group.key}
								className="flex items-center gap-2 text-xs text-marca-verde-escuro"
							>
								<span
									className="h-2 w-2 shrink-0 rounded-none"
									style={{ backgroundColor: group.color }}
								/>
								<span>
									{group.label}{' '}
									<span className="font-bold tabular-nums">
										{formatPercent(group.value, 1)}
									</span>
								</span>
							</div>
						))}
					</div>
				</section>

				{/* Ranking de Indicadores */}
				<section className="rounded-none bg-marca-creme px-3.5 py-3 text-card-foreground">
					<div className="flex items-baseline justify-between gap-2">
						<h4 className="font-display text-xl font-semibold leading-none text-foreground">
							Ranking de Indicadores
						</h4>
						{isRankingLoading ? (
							<span
								role="status"
								aria-label="Carregando ranking de indicadores"
								className="flex shrink-0 items-center gap-1 text-xs font-bold text-foreground"
							>
								<Loader2
									size={12}
									className="animate-spin text-marca-laranja motion-reduce:animate-none"
									aria-hidden
								/>
								Carregando…
							</span>
						) : (
							totalPosicoes !== null && (
								<span className="shrink-0 text-xs font-bold tabular-nums text-foreground">
									{totalPosicoes}° posições
								</span>
							)
						)}
					</div>
					<div className="mb-3 mt-1 flex items-start justify-between gap-3">
						<p className="max-w-[170px] font-sans text-xs font-light italic leading-snug text-foreground">
							A linha tracejada indica a média do indicador na
							amostra avaliada
						</p>
						<span className="shrink-0 font-display text-xs font-bold text-foreground">
							Nível: {levelLabel}
						</span>
					</div>

					<IndicatorRanking
						rankings={rankings}
						stats={rankingStats}
						isLoading={isRankingLoading}
					/>
				</section>
			</div>
		</>
	);
}

export default PlaceDetails;
