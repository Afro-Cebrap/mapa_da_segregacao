import { useCallback } from 'react';
import type { MapRef } from '@vis.gl/react-maplibre';
import type { RefObject } from 'react';
import { useLocationLookups } from '@/hooks/useLocationLookups';
import { fitMapToBbox, mergeBbox, type Bbox } from '@/lib/geo';
import type { LocationFilterScope } from '@/types/dashboard.types';

export interface FlyToTarget {
	scope: LocationFilterScope;
	// code_state / code_muni / name_metro (RM usa o name_metro como código).
	code: string;
}

// Une os bboxes dos municípios informados (RM/estado não têm bbox próprio nos
// lookups; derivam dos municípios membros).
function unirBboxesDeMunicipios(
	codigos: Set<string> | undefined,
	muniBounds: Map<string, Bbox>,
): Bbox | null {
	if (!codigos) return null;
	let bbox: Bbox | null = null;
	for (const codigo of codigos) {
		bbox = mergeBbox(bbox, muniBounds.get(codigo) ?? null);
	}
	return bbox;
}

// Enquadra ("tp") o mapa numa localidade (estado/município/RM) usando apenas os
// bboxes leves dos lookups — sem baixar a geometria completa de municípios/RMs.
export function useFlyToLocation(mapRef: RefObject<MapRef | null>) {
	const { data: lookups } = useLocationLookups();

	return useCallback(
		(target: FlyToTarget) => {
			let bbox: Bbox | null = null;

			if (target.scope === 'municipio') {
				bbox = lookups.muniBounds.get(target.code) ?? null;
			} else if (target.scope === 'reg_metro') {
				bbox = unirBboxesDeMunicipios(
					lookups.rmToMunis.get(target.code),
					lookups.muniBounds,
				);
			} else if (target.scope === 'estado') {
				bbox = unirBboxesDeMunicipios(
					lookups.estadoToMunis.get(target.code),
					lookups.muniBounds,
				);
			}

			fitMapToBbox(mapRef, bbox);
		},
		[mapRef, lookups],
	);
}
