import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapTilesSpinnerProps {
	// Mostra o spinner enquanto há tiles carregando.
	visible: boolean;
	// No mobile há a barra superior; desce o spinner para não colidir (top-16),
	// seguindo o mesmo offset do DashboardLayersPanel.
	isMobile?: boolean;
}

// Spinner pequeno e sem texto no canto superior direito do mapa, exibido
// enquanto novos tiles carregam (pan, zoom, troca de camada/filtro).
function MapTilesSpinner({ visible, isMobile = false }: MapTilesSpinnerProps) {
	return (
		<div
			role="status"
			aria-busy={visible}
			aria-label="Carregando dados do mapa"
			aria-hidden={!visible}
			className={cn(
				'pointer-events-none absolute right-6 z-20 flex h-9 w-9 items-center justify-center',
				'rounded-full border border-border/70 bg-background/90 text-marca-laranja shadow-sm backdrop-blur-md',
				'transition-opacity duration-200',
				isMobile ? 'top-16' : 'top-32',
				visible ? 'opacity-100' : 'opacity-0',
			)}
		>
			<Loader2
				size={18}
				className="animate-spin motion-reduce:animate-none"
			/>
		</div>
	);
}

export default MapTilesSpinner;
