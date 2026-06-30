import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoAfroUrl from '@/assets/logo-afro-header.svg';

interface MapLoadingOverlayProps {
	// Controla a visibilidade; quando false o overlay some com fade.
	visible: boolean;
}

// Overlay sobre a área do mapa exibido durante o carregamento inicial. Bloqueia
// a interação enquanto visível e some com fade quando o mapa fica pronto.
function MapLoadingOverlay({ visible }: MapLoadingOverlayProps) {
	return (
		<div
			role="status"
			aria-busy={visible}
			aria-live="polite"
			aria-hidden={!visible}
			className={cn(
				'absolute inset-0 z-30 flex flex-col items-center justify-center gap-5',
				'bg-[linear-gradient(180deg,rgba(242,233,204,0.96),rgba(244,236,222,0.98))]',
				'backdrop-blur-md transition-opacity duration-500',
				visible
					? 'pointer-events-auto opacity-100'
					: 'pointer-events-none opacity-0',
			)}
		>
			<img
				src={logoAfroUrl}
				alt="Mapa da Segregação"
				className="h-14 w-auto"
			/>
			<div className="flex items-center gap-2.5 text-marca-verde">
				<Loader2
					size={20}
					className="animate-spin motion-reduce:animate-none"
				/>
				<span className="font-display text-sm font-semibold">
					Carregando o mapa…
				</span>
			</div>
		</div>
	);
}

export default MapLoadingOverlay;
