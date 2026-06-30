import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SheetView = 'navegacao' | 'dados';

interface SheetViewTabsProps {
	view: SheetView;
	onViewChange: (view: SheetView) => void;
	onClear: () => void;
}

const TABS: { key: SheetView; label: string }[] = [
	{ key: 'navegacao', label: 'Navegação' },
	{ key: 'dados', label: 'Dados' },
];

// Abas segmentadas (Navegação | Dados) do cabeçalho da folha mobile, mais um
// "limpar seleção" à direita. Estilo conforme o Figma: abas retas, ativa em
// laranja com texto verde-escuro, inativas em creme sobre o verde da folha.
function SheetViewTabs({ view, onViewChange, onClear }: SheetViewTabsProps) {
	return (
		<div className="flex items-stretch gap-2">
			<div className="flex min-w-0 flex-1 gap-2">
				{TABS.map((tab) => {
					const isActive = view === tab.key;
					return (
						<button
							key={tab.key}
							type="button"
							aria-pressed={isActive}
							onClick={() => onViewChange(tab.key)}
							className={cn(
								'flex-1 rounded-none border px-3 py-2.5 font-display text-sm font-bold uppercase leading-none tracking-[0.01em] transition-colors',
								isActive
									? 'border-primary bg-primary text-marca-verde-escuro'
									: 'border-primary text-marca-creme hover:bg-primary/10',
							)}
						>
							{tab.label}
						</button>
					);
				})}
			</div>
			<button
				type="button"
				onClick={onClear}
				aria-label="Limpar seleção"
				className="flex w-10 shrink-0 items-center justify-center rounded-none border border-marca-creme/30 text-marca-creme/70 transition-colors hover:border-marca-creme/60 hover:text-marca-creme"
			>
				<X size={16} />
			</button>
		</div>
	);
}

export default SheetViewTabs;
