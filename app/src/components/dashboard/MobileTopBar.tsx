import { Link } from 'react-router-dom';
import type { RefObject } from 'react';
import type { MapRef } from '@vis.gl/react-maplibre';
import LocationSearchPopover from '@/components/dashboard/LocationSearchPopover';
import type { CensusYear } from '@/types/dashboard.types';

interface MobileTopBarProps {
	mapRef: RefObject<MapRef | null>;
	censusYear: CensusYear;
}

// Barra superior compacta do dashboard no mobile: marca + pesquisa de local.
function MobileTopBar({ mapRef, censusYear }: MobileTopBarProps) {
	return (
		<header className="pointer-events-auto absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-2 bg-marca-creme/90 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-sm">
			<Link to="/" className="min-w-0 hover:opacity-80">
				<span className="block truncate font-display text-xl font-black uppercase leading-none tracking-[0.005em] text-primary">
					Mapa da <span className="text-foreground">Segregação</span>
				</span>
			</Link>
			<LocationSearchPopover mapRef={mapRef} censusYear={censusYear} />
		</header>
	);
}

export default MobileTopBar;
