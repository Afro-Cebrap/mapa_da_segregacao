import { useRef, type ReactNode } from 'react';
import { motion, type PanInfo } from 'motion/react';
import { cn } from '@/lib/utils';

export type SheetSnap = 'peek' | 'half' | 'full';

const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full'];

function stepSnap(current: SheetSnap, direction: 1 | -1): SheetSnap {
	const idx = SNAP_ORDER.indexOf(current);
	const next = Math.min(SNAP_ORDER.length - 1, Math.max(0, idx + direction));
	return SNAP_ORDER[next];
}

interface MobileBottomSheetProps {
	snap: SheetSnap;
	onSnapChange: (snap: SheetSnap) => void;
	summary: ReactNode;
	tabBar?: ReactNode;
	children: ReactNode;
}

// Folha inferior arrastável (peek → half → full) com a identidade da marca
// (verde, cantos retos). A altura anima entre os pontos de ancoragem; a alça
// permite arrastar para subir/descer um nível ou tocar para alternar.
function MobileBottomSheet({
	snap,
	onSnapChange,
	summary,
	tabBar,
	children,
}: MobileBottomSheetProps) {
	// Após um arraste, o motion ainda dispara onClick; este ref evita que o
	// arraste-para-ancorar também execute o toque-alternar (passo duplo).
	const didDragRef = useRef(false);

	const handleDragEnd = (
		_event: MouseEvent | TouchEvent | PointerEvent,
		info: PanInfo,
	) => {
		didDragRef.current = true;
		// Arrastar para cima (offset/velocity negativos) sobe um nível; para
		// baixo, desce. Limiares pequenos para uma sensação responsiva.
		if (info.offset.y < -40 || info.velocity.y < -350) {
			onSnapChange(stepSnap(snap, 1));
		} else if (info.offset.y > 40 || info.velocity.y > 350) {
			onSnapChange(stepSnap(snap, -1));
		}
	};

	const toggleSnap = () => {
		onSnapChange(stepSnap(snap, snap === 'full' ? -1 : 1));
	};

	// O peek precisa de mais altura quando as abas estão presentes, para não
	// cortar alça + resumo + abas.
	const snapHeight: Record<SheetSnap, string> = {
		peek: tabBar ? '128px' : '92px',
		half: '52dvh',
		full: '88dvh',
	};

	// Borda superior creme + sombra escura separam a folha do mapa
	// verde-escuro: o fundo bg-sidebar tem quase a mesma cor da terra, então
	// a sombra verde original ficava invisível sobre o mapa.
	return (
		<motion.section
			initial={false}
			animate={{ height: snapHeight[snap] }}
			transition={{ type: 'spring', stiffness: 320, damping: 34 }}
			className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-none border-t border-marca-creme/20 bg-sidebar text-sidebar-foreground shadow-[0_-8px_28px_rgba(0,0,0,0.45)]"
		>
			{/* Alça arrastável + resumo (sempre visível) */}
			<motion.div
				drag="y"
				dragConstraints={{ top: 0, bottom: 0 }}
				dragElastic={0.2}
				onDragEnd={handleDragEnd}
				onClick={() => {
					// Ignora o clique fantasma logo após um arraste.
					if (didDragRef.current) {
						didDragRef.current = false;
						return;
					}
					toggleSnap();
				}}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						toggleSnap();
					}
				}}
				role="button"
				tabIndex={0}
				aria-label="Ajustar painel"
				className="flex shrink-0 cursor-grab touch-none flex-col items-stretch gap-2 px-5 pb-1.5 pt-2.5 active:cursor-grabbing"
			>
				<span className="mx-auto h-1 w-10 rounded-full bg-marca-creme/70" />
				<span className="truncate font-display text-lg font-bold uppercase leading-none tracking-[0.01em] text-marca-creme">
					{summary}
				</span>
			</motion.div>

			{/* Abas Navegação/Dados — só aparecem quando há seleção (mobile). */}
			{tabBar && <div className="shrink-0 px-5 pb-2">{tabBar}</div>}

			{/* Conteúdo rolável (oculto/desativado no peek) */}
			<div
				className={cn(
					'scrollbar-laranja min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]',
					snap === 'peek' && 'pointer-events-none opacity-0',
				)}
			>
				{children}
			</div>
		</motion.section>
	);
}

export default MobileBottomSheet;
