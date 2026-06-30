import { useLocationLookups } from '@/hooks/useLocationLookups';
import { buildSegments } from '@/lib/location';
import type { LocationFilter } from '@/types/dashboard.types';

interface LocationBreadcrumbProps {
	locationFilter: LocationFilter | null;
}

function LocationBreadcrumb({ locationFilter }: LocationBreadcrumbProps) {
	const { data: lookups } = useLocationLookups();
	const segments = buildSegments(locationFilter, lookups);

	return (
		<p className="text-xs font-medium text-marca-creme">
			{segments.join(' › ')}
		</p>
	);
}

export default LocationBreadcrumb;
