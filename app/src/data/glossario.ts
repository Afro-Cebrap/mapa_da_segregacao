// Dados do Glossário.
//
// ATENÇÃO: conteúdo de exemplo (placeholder). No Figma os termos aparecem
// apenas como "aba" repetido; aqui usamos termos plausíveis do domínio de
// segregação para tornar a busca/navegação demonstráveis. Substituir por
// conteúdo real ou por uma fonte de dados (API) posteriormente.

export type TermoGlossario = {
	termo: string;
	definicao: string;
};

export const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Remove acentos e normaliza para minúsculas (busca/ordenação sem acento). */
export function normalizar(texto: string): string {
	return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Primeira letra (maiúscula, sem acento) de um termo. */
export function primeiraLetra(termo: string): string {
	return normalizar(termo).charAt(0).toUpperCase();
}

const TERMOS: TermoGlossario[] = [
	{
		termo: 'Aglomerado subnormal',
		definicao:
			'Forma de ocupação irregular de terrenos para fins de habitação, conforme classificação do IBGE.',
	},
	{
		termo: 'Autodeclaração',
		definicao:
			'Método de identificação de raça/cor em que a própria pessoa declara seu pertencimento, base dos dados do Censo.',
	},
	{
		termo: 'Densidade demográfica',
		definicao:
			'Número de habitantes por unidade de área, geralmente expressa em habitantes por quilômetro quadrado.',
	},
	{
		termo: 'Dissimilaridade',
		definicao:
			'Mede o quão desigualmente dois grupos estão distribuídos pelo território; varia de 0 (nenhuma segregação) a 1 (segregação total).',
	},
	{
		termo: 'IBGE',
		definicao:
			'Instituto Brasileiro de Geografia e Estatística, responsável pelo Censo Demográfico e pela base territorial usada na plataforma.',
	},
	{
		termo: 'Isolamento',
		definicao:
			'Indica a probabilidade de um membro de um grupo compartilhar a mesma área com membros do próprio grupo.',
	},
	{
		termo: 'Município',
		definicao:
			'Menor unidade autônoma da federação; um dos recortes territoriais de visualização da plataforma.',
	},
	{
		termo: 'Raça/cor',
		definicao:
			'Classificação usada pelo IBGE em cinco categorias: branca, preta, parda, amarela e indígena.',
	},
	{
		termo: 'Região metropolitana',
		definicao:
			'Agrupamento de municípios limítrofes integrados social e economicamente, com serviços de interesse comum.',
	},
	{
		termo: 'Segregação residencial',
		definicao:
			'Separação espacial de grupos sociais ou raciais nas áreas de moradia de uma cidade.',
	},
	{
		termo: 'Setor censitário',
		definicao:
			'Menor unidade territorial de coleta do Censo; base granular dos indicadores de segregação da plataforma.',
	},
];

/** Termos ordenados alfabeticamente (sem acento) pelo nome. */
export const TERMOS_GLOSSARIO: TermoGlossario[] = [...TERMOS].sort((a, b) =>
	normalizar(a.termo).localeCompare(normalizar(b.termo)),
);
