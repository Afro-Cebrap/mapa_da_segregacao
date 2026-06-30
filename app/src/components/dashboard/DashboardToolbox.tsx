import { useCallback } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DashboardToolboxProps } from '@/types/dashboard.types';

// Extensão aproximada do Brasil para o "Ver tudo".
const BRASIL_BOUNDS: [[number, number], [number, number]] = [
	[-74, -33.8],
	[-34.7, 5.3],
];

// Metadados estaticos das acoes (sem referencia ao mapRef): manter fora do
// render evita que a regra react-hooks/refs "contamine" o array com o ref.
const TOOLS = [
	{ id: 'zoom-in', label: 'Aumentar zoom', icon: Plus },
	{ id: 'zoom-out', label: 'Diminuir zoom', icon: Minus },
	{ id: 'fit-extent', label: 'Ver tudo', icon: Maximize },
] as const;

type ToolId = (typeof TOOLS)[number]['id'];

function DashboardToolbox({ mapRef }: DashboardToolboxProps) {
	const handleAction = useCallback(
		(id: ToolId) => {
			const map = mapRef.current;
			if (!map) return;
			if (id === 'zoom-in') map.zoomIn({ duration: 300 });
			else if (id === 'zoom-out') map.zoomOut({ duration: 300 });
			else map.fitBounds(BRASIL_BOUNDS, { duration: 1500, padding: 40 });
		},
		[mapRef],
	);

	return (
		<div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center pointer-events-auto md:bottom-6">
			{/* Barra de ações flutuante (alinhada à marca) */}
			<TooltipProvider>
				<motion.div
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
					className={cn(
						'flex items-center justify-center gap-[19px] px-[15px] py-2.5',
						'rounded-none bg-marca-creme shadow-[0_4px_4px_rgba(0,0,0,0.25)]',
					)}
				>
					{TOOLS.map((tool) => (
						<Tooltip key={tool.id}>
							<TooltipTrigger asChild>
								<button
									onClick={() => handleAction(tool.id)}
									aria-label={tool.label}
									className={cn(
										'flex items-center justify-center text-marca-verde',
										'transition-colors duration-150 hover:text-marca-laranja',
									)}
								>
									<tool.icon size={17} strokeWidth={2} />
								</button>
							</TooltipTrigger>
							<TooltipContent
								side="top"
								sideOffset={8}
								className="rounded-none"
							>
								{tool.label}
							</TooltipContent>
						</Tooltip>
					))}
				</motion.div>
			</TooltipProvider>
		</div>
	);
}

export default DashboardToolbox;
