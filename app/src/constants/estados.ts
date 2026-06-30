export interface EstadoOption {
	code: string;
	abbrev: string;
	name: string;
}

export const ESTADOS: EstadoOption[] = [
	{ code: '12', abbrev: 'AC', name: 'Acre' },
	{ code: '27', abbrev: 'AL', name: 'Alagoas' },
	{ code: '16', abbrev: 'AP', name: 'Amapá' },
	{ code: '13', abbrev: 'AM', name: 'Amazonas' },
	{ code: '29', abbrev: 'BA', name: 'Bahia' },
	{ code: '23', abbrev: 'CE', name: 'Ceará' },
	{ code: '53', abbrev: 'DF', name: 'Distrito Federal' },
	{ code: '32', abbrev: 'ES', name: 'Espírito Santo' },
	{ code: '52', abbrev: 'GO', name: 'Goiás' },
	{ code: '21', abbrev: 'MA', name: 'Maranhão' },
	{ code: '51', abbrev: 'MT', name: 'Mato Grosso' },
	{ code: '50', abbrev: 'MS', name: 'Mato Grosso do Sul' },
	{ code: '31', abbrev: 'MG', name: 'Minas Gerais' },
	{ code: '15', abbrev: 'PA', name: 'Pará' },
	{ code: '25', abbrev: 'PB', name: 'Paraíba' },
	{ code: '41', abbrev: 'PR', name: 'Paraná' },
	{ code: '26', abbrev: 'PE', name: 'Pernambuco' },
	{ code: '22', abbrev: 'PI', name: 'Piauí' },
	{ code: '33', abbrev: 'RJ', name: 'Rio de Janeiro' },
	{ code: '24', abbrev: 'RN', name: 'Rio Grande do Norte' },
	{ code: '43', abbrev: 'RS', name: 'Rio Grande do Sul' },
	{ code: '11', abbrev: 'RO', name: 'Rondônia' },
	{ code: '14', abbrev: 'RR', name: 'Roraima' },
	{ code: '42', abbrev: 'SC', name: 'Santa Catarina' },
	{ code: '35', abbrev: 'SP', name: 'São Paulo' },
	{ code: '28', abbrev: 'SE', name: 'Sergipe' },
	{ code: '17', abbrev: 'TO', name: 'Tocantins' },
];

const SIGLA_POR_CODIGO = new Map(ESTADOS.map((e) => [e.code, e.abbrev]));

// Sigla da UF a partir do `code_state` (2 primeiros dígitos do code_muni do
// IBGE). Usada para desambiguar municípios homônimos na busca.
export function siglaPorCodigoEstado(
	code: string | null | undefined,
): string | null {
	if (!code) return null;
	return SIGLA_POR_CODIGO.get(code) ?? null;
}
