import PlaceDetails from '@/components/dashboard/PlaceDetails';
import type {
	CensusYear,
	LayerId,
	LocationFilter,
	SelectedGeometryInfo,
} from '@/types/dashboard.types';

interface GeometryDetailsPanelProps {
	censusYear: CensusYear;
	selectedGeometry: SelectedGeometryInfo | null;
	onClose: () => void;
	activeLayerId: LayerId;
	locationFilter: LocationFilter | null;
	onExploreSetores: () => void;
}

function GeometryDetailsPanel({
	censusYear,
	selectedGeometry,
	onClose,
	activeLayerId,
	locationFilter,
	onExploreSetores,
}: GeometryDetailsPanelProps) {
	if (!selectedGeometry) return null;

	return (
		<aside className="absolute right-4 top-4 z-30 flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-[320px] flex-col overflow-hidden rounded-none bg-sidebar text-sidebar-foreground shadow-[0_18px_40px_rgba(2,38,4,0.35)] md:right-5 md:w-[320px]">
			<PlaceDetails
				censusYear={censusYear}
				selectedGeometry={selectedGeometry}
				onClose={onClose}
				activeLayerId={activeLayerId}
				locationFilter={locationFilter}
				onExploreSetores={onExploreSetores}
			/>
		</aside>
	);
}

export default GeometryDetailsPanel;
