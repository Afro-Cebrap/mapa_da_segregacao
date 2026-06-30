import { Sigma, UserCircle, Users } from 'lucide-react';
import { formatDecimalMetric, formatPercent } from '@/lib/format';
import type {
	CensusSectorProperties,
	MetricsConfigMap,
} from '@/types/dashboard.types';

// Paleta categórica da composição racial — espelha as cores REAIS do mapa
// (índice 2 da palette de cada raça em METRICS_CONFIG), para a legenda do
// painel de detalhes bater com o choropleth. Ordem por contraste de leitura:
// Branco > Pardo > Preto > Amarelo > Indígena.
export const COMPOSITION_GROUPS = [
	{
		key: 'percent_branca',
		label: 'Branco',
		color: '#e9c996',
	},
	{
		key: 'percent_parda',
		label: 'Pardo',
		color: '#5ECD78',
	},
	{
		key: 'percent_preta',
		label: 'Preto',
		color: '#E05B6C',
	},
	{
		key: 'percent_amarela',
		label: 'Amarelo',
		color: '#5d9ee9',
	},
	{
		key: 'percent_indigena',
		label: 'Indígena',
		color: '#9c54b7',
	},
] satisfies ReadonlyArray<{
	key: keyof CensusSectorProperties;
	label: string;
	color: string;
}>;

export const METRICS_CONFIG: MetricsConfigMap = {
	dissimilarity: {
		prop: 'dissimilarity',
		label: 'Dissimilaridade',
		icon: Users,
		group: 'segregacao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#FBD4A7', '#E8A571', '#C46823', '#7D3401'],
		format: formatDecimalMetric,
	},
	index_h: {
		prop: 'index_h',
		label: 'Index H',
		icon: Sigma,
		// Escala casada com a distribuição real do Index H (municípios vão a
		// ~0.41, p50≈0.05; setores ficam quase todos perto de 0). Os breaks
		// antigos (~1e-6) saturavam tudo na cor extrema. Ajustar se a paleta
		// precisar de mais contraste no nível de setor.
		group: 'segregacao',
		breaks: [0, 0.05, 0.15, 0.3],
		palette: ['#FBD4A7', '#E8A571', '#C46823', '#7D3401'],
		format: formatDecimalMetric,
	},
	exp_branca_pp: {
		prop: 'exp_branca_pp',
		label: 'Exp | Branco - PP',
		icon: Users,
		group: 'segregacao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#FBD4A7', '#E8A571', '#C46823', '#7D3401'],
		format: formatDecimalMetric,
	},
	exp_pp_branca: {
		prop: 'exp_pp_branca',
		label: 'Exp | PP - Branco',
		icon: Users,
		group: 'segregacao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#FBD4A7', '#E8A571', '#C46823', '#7D3401'],
		format: formatDecimalMetric,
	},
	iso_pp_pp: {
		prop: 'iso_pp_pp',
		label: 'Iso | PP - PP',
		icon: Users,
		group: 'segregacao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#FBD4A7', '#E8A571', '#C46823', '#7D3401'],
		format: formatDecimalMetric,
	},
	iso_branca_branca: {
		prop: 'iso_branca_branca',
		label: 'Iso | B - B',
		icon: Users,
		group: 'segregacao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#FBD4A7', '#E8A571', '#C46823', '#7D3401'],
		format: formatDecimalMetric,
	},
	percent_branca: {
		prop: 'percent_branca',
		label: 'Branco',
		icon: UserCircle,
		group: 'composicao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#FFF9E4', '#FFE5BC', '#e9c996', '#D7AF64'],
		format: formatPercent,
	},
	percent_preta: {
		prop: 'percent_preta',
		label: 'Preto',
		icon: UserCircle,
		group: 'composicao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#FFD5C8', '#FFA396', '#E05B6C', '#BC385A'],
		format: formatPercent,
	},
	percent_amarela: {
		prop: 'percent_amarela',
		label: 'Amarelo',
		icon: UserCircle,
		group: 'composicao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#D7F0FF', '#87D2FF', '#5d9ee9', '#4678BE'],
		format: formatPercent,
	},
	percent_parda: {
		prop: 'percent_parda',
		label: 'Pardo',
		icon: UserCircle,
		group: 'composicao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#C3FFCD', '#7CF599', '#5ECD78', '#5BA25D'],
		format: formatPercent,
	},
	percent_indigena: {
		prop: 'percent_indigena',
		label: 'Indígena',
		icon: UserCircle,
		group: 'composicao',
		breaks: [0, 0.25, 0.5, 0.75],
		palette: ['#F5B9FF', '#D791E1', '#9c54b7', '#784B96'],
		format: formatPercent,
	},
};
