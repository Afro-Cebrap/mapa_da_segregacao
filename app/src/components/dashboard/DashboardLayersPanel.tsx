import { useState } from 'react';
import { Layers, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import type {
	DashboardLayersPanelProps,
	EscolaRede,
} from '@/types/dashboard.types';

// Redes de escola exibidas no submenu (a cor de cada uma no mapa é definida
// em buildEscolasStyle em lib/mapStyles.ts, fonte da verdade).
const REDES: { rede: EscolaRede; label: string }[] = [
	{ rede: 'publica', label: 'Públicas' },
	{ rede: 'privada', label: 'Privadas' },
];

// Categorias presentes no Figma mas sem dados de origem: aparecem por
// fidelidade visual, desabilitadas. Só "Escolas" é funcional.
const CATEGORIAS_SEM_DADOS = ['Bairros', 'Centros de Saúde'];

function DashboardLayersPanel({
	activeEscolas,
	onToggleEscola,
	className,
	compact = false,
}: DashboardLayersPanelProps) {
	const escolasAtivas = activeEscolas.length > 0;
	// Painel recolhido por padrão: o cabeçalho "Camadas" é o botão que,
	// ao ser apertado, revela as opções de camadas.
	const [aberto, setAberto] = useState(false);

	// Tamanhos reduzidos no mobile para o painel não dominar a tela — mas com
	// área de toque maior (py-2) que a versão desktop densa (py-1).
	const itemTextClass = compact ? 'text-sm' : 'text-xl';
	const itemPadClass = compact ? 'py-2' : 'py-1';

	return (
		<div
			className={cn(
				'pointer-events-auto absolute left-4 z-30 rounded-none bg-marca-creme text-marca-verde shadow-[0_4px_4px_rgba(0,0,0,0.25)]',
				compact ? 'w-36' : 'w-48',
				className ?? 'top-4',
			)}
		>
			<button
				type="button"
				onClick={() => setAberto((v) => !v)}
				aria-expanded={aberto}
				className={cn(
					'flex w-full items-center justify-between gap-2',
					compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
				)}
			>
				<span
					className={cn(
						'font-display font-bold uppercase leading-none tracking-[0.01em] text-marca-verde',
						compact ? 'text-base' : 'text-[30px]',
					)}
				>
					Camadas
				</span>
				<Layers
					size={compact ? 15 : 22}
					className="shrink-0 text-marca-verde"
				/>
			</button>

			{aberto && (
				<ul
					className={cn(
						'space-y-0.5 pb-3',
						compact ? 'px-3' : 'px-3.5',
					)}
				>
					{CATEGORIAS_SEM_DADOS.map((nome) => (
						<li
							key={nome}
							title="Sem dados disponíveis"
							className={cn(
								'flex cursor-default items-center justify-between font-normal text-marca-verde/40',
								itemTextClass,
								itemPadClass,
							)}
						>
							{nome}
							<Play
								size={12}
								fill="currentColor"
								strokeWidth={0}
							/>
						</li>
					))}

					{/* Escolas — camada funcional (Públicas / Privadas) */}
					<li>
						<Popover>
							<PopoverTrigger asChild>
								<button
									type="button"
									className={cn(
										'flex w-full items-center justify-between font-display transition-colors',
										itemTextClass,
										itemPadClass,
										escolasAtivas
											? 'font-bold text-marca-laranja'
											: 'font-normal text-marca-verde hover:text-marca-laranja',
									)}
								>
									Escolas
									<Play
										size={12}
										fill="currentColor"
										strokeWidth={0}
									/>
								</button>
							</PopoverTrigger>
							<PopoverContent
								side="right"
								align="start"
								sideOffset={12}
								className="w-44 rounded-none border-0 bg-marca-verde p-1.5 text-marca-creme shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
							>
								{REDES.map(({ rede, label }) => {
									const isActive =
										activeEscolas.includes(rede);
									return (
										<div
											key={rede}
											className="flex items-center gap-2.5 rounded-none px-2 py-2 transition-colors hover:bg-marca-creme/10"
										>
											<Checkbox
												id={`escola-${rede}`}
												checked={isActive}
												onCheckedChange={() =>
													onToggleEscola(rede)
												}
											/>
											<label
												htmlFor={`escola-${rede}`}
												className={cn(
													'flex-1 cursor-pointer text-sm text-marca-creme',
													isActive
														? 'font-bold'
														: 'font-semibold',
												)}
											>
												{label}
											</label>
										</div>
									);
								})}
							</PopoverContent>
						</Popover>
					</li>
				</ul>
			)}
		</div>
	);
}

export default DashboardLayersPanel;
