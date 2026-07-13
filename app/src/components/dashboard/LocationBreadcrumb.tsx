import { useLocationLookups } from '@/hooks/useLocationLookups';
import { buildSegments } from '@/lib/location';
import type { CensusYear, LocationFilter } from '@/types/dashboard.types';

interface LocationBreadcrumbProps {
	censusYear: CensusYear;
	locationFilter: LocationFilter | null;
}

function LocationBreadcrumb({
	censusYear,
	locationFilter,
}: LocationBreadcrumbProps) {
	const { data: lookups } = useLocationLookups(censusYear);
	const segments = buildSegments(locationFilter, lookups);

	return (
		<p className="text-xs font-medium text-marca-creme">
			{segments.join(' › ')}
		</p>
	);
}

export default LocationBreadcrumb;
