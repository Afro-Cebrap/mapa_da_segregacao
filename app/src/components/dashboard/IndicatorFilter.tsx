import { useState } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import { cn } from '@/lib/utils';
import type {
	IndicatorFilterProps,
	MetricGroup,
	MetricType,
} from '@/types/dashboard.types';

// Rótulos das categorias (grupos) exibidas na grade de INDICADORES.
const GROUP_LABELS: Record<MetricGroup, string> = {
	segregacao: 'Segregação',
	composicao: 'Raça / Cor',
};

const GROUP_ORDER: MetricGroup[] = ['segregacao', 'composicao'];

// Badge de ajuda "?" (quadrado laranja) com tooltip creme, conforme o Figma
// (Atualização 18/06 — "Grupo de indicadores + Hover Tooltips"). O tooltip
// abre à direita, com a seta apontando para o badge.
function GroupHelp({ group }: { group: MetricGroup }) {
	// Controlado: mantém o hover no desktop e também permite abrir no toque
	// (mobile), onde não existe hover. Badge maior no mobile p/ área de toque.
	const [open, setOpen] = useState(false);
	return (
		<TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
			<TooltipPrimitive.Trigger asChild>
				<button
					type="button"
					aria-label={`Sobre o grupo ${GROUP_LABELS[group]}`}
					// O badge não troca o indicador ativo: só revela a ajuda.
					onClick={(event) => {
						event.preventDefault();
						setOpen((v) => !v);
					}}
					className="flex size-5 shrink-0 items-center justify-center bg-primary text-xs font-bold leading-none text-marca-verde transition-opacity hover:opacity-90 md:size-[15px] md:text-[11px]"
				>
					?
				</button>
			</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content
					side="right"
					align="center"
					sideOffset={6}
					collisionPadding={12}
					className="z-50 w-[302px] origin-(--radix-tooltip-content-transform-origin) bg-marca-creme p-4 text-marca-verde shadow-[0_12px_40px_rgba(2,38,4,0.35)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95"
				>
					<div className="flex flex-col gap-[17px] text-[14px] font-light leading-[19px]">
						<p>
							O grupo de indicadores{' '}
							<span className="font-bold">
								{GROUP_LABELS[group]}
							</span>{' '}
							representa X, Y e Z.
						</p>
						<p>
							Para saber mais sobre os indicadores acesse o{' '}
							<span className="font-bold">
								Glossário do Mapa da Segregação.
							</span>
						</p>
					</div>
					<TooltipPrimitive.Arrow
						className="fill-marca-creme"
						width={13}
						height={7}
					/>
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	);
}

function IndicatorFilter({
	activeMetric,
	onMetricChange,
	metricsConfig,
}: IndicatorFilterProps) {
	const metrics = Object.entries(metricsConfig) as [
		MetricType,
		(typeof metricsConfig)[MetricType],
	][];

	const activeGroup = metricsConfig[activeMetric].group;

	const firstMetricOf = (group: MetricGroup): MetricType =>
		metrics.find(([, config]) => config.group === group)![0];

	return (
		<div>
			<p className="font-display text-3xl font-bold uppercase leading-none tracking-[0.01em] text-marca-creme">
				Indicadores
			</p>

			{/* Tabs de categorias (grupos de métricas) — abas sublinhadas com
			    badge de ajuda "?". Tipografia condensada (Acumin Pro Condensed ≈
			    font-display) e espaçamentos do Figma: 22px após o título. */}
			<TooltipPrimitive.Provider delayDuration={120}>
				<div className="mt-[22px] flex flex-wrap items-center gap-x-12 gap-y-3">
					{GROUP_ORDER.map((group) => {
						const isActive = activeGroup === group;
						return (
							<div
								key={group}
								className="flex items-center gap-2"
							>
								<button
									type="button"
									onClick={() =>
										onMetricChange(firstMetricOf(group))
									}
									className={cn(
										'font-display pb-0.5 text-2xl leading-none transition-colors',
										isActive
											? 'font-bold text-primary underline decoration-2 underline-offset-[6px]'
											: 'font-medium text-marca-creme hover:text-sidebar-foreground',
									)}
								>
									{GROUP_LABELS[group]}
								</button>
								<GroupHelp group={group} />
							</div>
						);
					})}
				</div>
			</TooltipPrimitive.Provider>

			{/* Métricas do grupo ativo: cada botão tem a largura natural do seu
			    rótulo (sem grow, sem ajuste de largura), padding de 10px em todos
			    os lados e fica alinhado à esquerda, empacotando da esquerda para a
			    direita com gap de 10px.

			    Todos os grupos são renderizados sobrepostos na mesma célula de
			    grid (col/row-start-1). Só o grupo ativo fica visível; os demais
			    ficam invisíveis mas continuam ocupando espaço, então o contêiner
			    mantém sempre a altura do MAIOR grupo. Assim a seção "Escala"
			    abaixo não muda de posição ao alternar o modo de segregação
			    (ex.: Segregação → Raça / Cor). */}
			<div className="mt-7 grid">
				{GROUP_ORDER.map((group) => {
					const isActiveGroup = activeGroup === group;
					const groupMetrics = metrics.filter(
						([, config]) => config.group === group,
					);
					return (
						<div
							key={group}
							aria-hidden={!isActiveGroup}
							className={cn(
								// content-start / items-start: como o grupo ativo
								// é esticado até a altura do maior grupo, ancoramos
								// as linhas e os botões no topo em vez de deixar o
								// flex esticá-los (align-content/items: stretch é o
								// padrão) — assim os botões mantêm o tamanho natural.
								'col-start-1 row-start-1 flex flex-wrap content-start items-start gap-2.5',
								!isActiveGroup &&
									'invisible pointer-events-none',
							)}
						>
							{groupMetrics.map(([key, config]) => {
								const isActive = activeMetric === key;
								return (
									<button
										key={key}
										type="button"
										onClick={() => onMetricChange(key)}
										title={config.label}
										className={cn(
											'flex items-center justify-start whitespace-nowrap rounded-none border p-2.5 text-base font-semibold leading-none transition-all',
											isActive
												? 'border-primary bg-primary text-marca-verde-escuro'
												: 'border-primary/60 text-sidebar-foreground hover:bg-primary/10',
										)}
									>
										{config.label}
									</button>
								);
							})}
						</div>
					);
				})}
			</div>
		</div>
	);
}

export default IndicatorFilter;
