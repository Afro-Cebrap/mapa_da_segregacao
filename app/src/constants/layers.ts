import { Building2, Grid3X3, Map } from 'lucide-react';
import type { MapLayerConfig } from '@/types/dashboard.types';

export const LAYERS_CONFIG: MapLayerConfig[] = [
	{
		id: 'municipios',
		label: 'Municípios',
		icon: Map,
		color: '#c45a2f',
		endpoint: 'municipios',
	},
	{
		id: 'setores',
		label: 'Setores',
		icon: Grid3X3,
		color: '#2563eb',
		endpoint: 'setores',
	},
	{
		id: 'regioes-metropolitanas',
		label: 'Regiões Metropolitanas',
		icon: Building2,
		color: '#16a34a',
		endpoint: 'reg_metro',
	},
];
