import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import escolasPublicasUrl from '@/mocks/escolasPublicas.json?url';
import escolasPrivadasUrl from '@/mocks/escolasPrivadas.json?url';
import type { EscolaRede } from '@/types/dashboard.types';

interface EscolaProperties {
	Escola: string;
	rede: EscolaRede;
}

type EscolaFeature = GeoJSON.Feature<GeoJSON.Point, EscolaProperties>;

const URL_BY_REDE: Record<EscolaRede, string> = {
	publica: escolasPublicasUrl,
	privada: escolasPrivadasUrl,
};

async function carregarEscolas(rede: EscolaRede): Promise<EscolaFeature[]> {
	const resposta = await fetch(URL_BY_REDE[rede]);
	const colecao = (await resposta.json()) as GeoJSON.FeatureCollection<
		GeoJSON.Point,
		{ Escola?: string }
	>;

	return colecao.features.map((feature) => ({
		...feature,
		properties: {
			Escola: feature.properties?.Escola ?? 'Escola',
			rede,
		},
	}));
}

// Carrega sob demanda as redes de escola ativas e devolve uma única
// FeatureCollection de pontos pronta para o mapa. Cada rede é cacheada
// para sempre (mock estático), então alternar a visibilidade é instantâneo.
export function useEscolas(
	activeRedes: EscolaRede[],
): GeoJSON.FeatureCollection {
	const publica = useQuery({
		queryKey: ['escolas', 'publica'],
		queryFn: () => carregarEscolas('publica'),
		enabled: activeRedes.includes('publica'),
		staleTime: Infinity,
		gcTime: Infinity,
	});

	const privada = useQuery({
		queryKey: ['escolas', 'privada'],
		queryFn: () => carregarEscolas('privada'),
		enabled: activeRedes.includes('privada'),
		staleTime: Infinity,
		gcTime: Infinity,
	});

	return useMemo(() => {
		// Concat (não spread) para não estourar a pilha com dezenas de
		// milhares de pontos.
		const datasets: EscolaFeature[][] = [];
		if (activeRedes.includes('publica') && publica.data) {
			datasets.push(publica.data);
		}
		if (activeRedes.includes('privada') && privada.data) {
			datasets.push(privada.data);
		}
		return {
			type: 'FeatureCollection',
			features: datasets.flat(),
		};
	}, [activeRedes, publica.data, privada.data]);
}
