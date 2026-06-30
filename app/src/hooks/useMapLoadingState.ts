import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from '@vis.gl/react-maplibre';

interface Options {
	// Vira true quando o <Map> dispara onLoad — só então o mapa existe para
	// anexarmos listeners.
	mapReady: boolean;
	// Sinal de carregamento de dados via React Query (modo mock/GeoJSON). No
	// modo tiles a query fica desabilitada e isso é sempre false.
	dataLoading?: boolean;
}

// Deriva o estado de carregamento do mapa a partir dos eventos do MapLibre.
// `initialLoading` cobre o primeiro render (overlay); `tilesLoading` cobre as
// recargas seguintes (spinner de canto). No modo mock, `dataLoading` (React
// Query) complementa os eventos, já que o fetch do GeoJSON acontece antes de a
// fonte ser populada.
export function useMapLoadingState(
	mapRef: RefObject<MapRef | null>,
	{ mapReady, dataLoading = false }: Options,
): { initialLoading: boolean; tilesLoading: boolean } {
	// Há tiles/dados sendo carregados pelo MapLibre neste instante.
	const [mapBusy, setMapBusy] = useState(true);
	// Vira true no primeiro momento ocioso (sem dados pendentes) e não volta —
	// é o que encerra o overlay inicial.
	const [settledOnce, setSettledOnce] = useState(false);
	// Lido dentro do handler de `idle` para enxergar o valor atual sem reanexar
	// os listeners a cada mudança de `dataLoading`. Atualizado num efeito (não
	// no corpo do render) para não acessar o ref durante a renderização.
	const dataLoadingRef = useRef(dataLoading);
	useEffect(() => {
		dataLoadingRef.current = dataLoading;
	}, [dataLoading]);

	useEffect(() => {
		const map = mapRef.current?.getMap();
		if (!mapReady || !map) return;

		const handleLoading = () => setMapBusy(true);
		const handleIdle = () => {
			setMapBusy(false);
			// Só encerra o overlay inicial quando os dados (mock) terminaram.
			if (!dataLoadingRef.current) setSettledOnce(true);
		};

		map.on('dataloading', handleLoading);
		map.on('idle', handleIdle);
		// Caso o mapa já esteja ocioso quando o efeito monta.
		if (map.areTilesLoaded()) handleIdle();

		return () => {
			map.off('dataloading', handleLoading);
			map.off('idle', handleIdle);
		};
	}, [mapRef, mapReady]);

	// No modo mock o mapa pode ficar ocioso antes de o GeoJSON chegar; quando o
	// fetch termina e não há tiles pendentes, encerra o overlay inicial.
	useEffect(() => {
		if (settledOnce || dataLoading || !mapReady) return;
		const map = mapRef.current?.getMap();
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (map?.areTilesLoaded()) setSettledOnce(true);
	}, [dataLoading, mapReady, settledOnce, mapRef]);

	return {
		initialLoading: !settledOnce,
		tilesLoading: mapBusy || dataLoading,
	};
}
