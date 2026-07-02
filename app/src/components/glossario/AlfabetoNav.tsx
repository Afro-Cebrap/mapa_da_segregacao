import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ALFABETO } from '@/data/glossario';

// Quantas letras por página. O alfabeto é dividido em páginas navegáveis pelas
// setas (em vez de uma caixa com rolagem).
const TAMANHO_PAGINA = 10;

const PAGINAS: string[][] = [];
for (let i = 0; i < ALFABETO.length; i += TAMANHO_PAGINA) {
	PAGINAS.push(ALFABETO.slice(i, i + TAMANHO_PAGINA));
}

type AlfabetoNavProps = {
	letraAtiva: string;
	/** Letras que possuem ao menos um termo. */
	letrasDisponiveis: Set<string>;
	onSelect: (letra: string) => void;
};

function Seta({ direcao }: { direcao: 'left' | 'right' }) {
	return (
		<svg
			viewBox="0 0 22 22"
			fill="currentColor"
			className="h-full w-full"
			aria-hidden="true"
		>
			<path
				d={direcao === 'right' ? 'M6 2l12 9-12 9z' : 'M16 2 4 11l12 9z'}
			/>
		</svg>
	);
}

// Navegação alfabética A–Z paginada. A seta da direita avança as páginas; ao
// sair da primeira, a seta da esquerda aparece para voltar. Os espaços das
// setas ficam reservados para o layout não "pular" quando elas aparecem/somem.
export function AlfabetoNav({
	letraAtiva,
	letrasDisponiveis,
	onSelect,
}: AlfabetoNavProps) {
	const [pagina, setPagina] = useState(0);
	const temAnterior = pagina > 0;
	const temProxima = pagina < PAGINAS.length - 1;

	const slot =
		'flex h-10 w-10 shrink-0 items-center justify-center md:h-12 md:w-12';

	return (
		<div className="flex items-center gap-4 md:gap-6">
			{temAnterior ? (
				<button
					type="button"
					onClick={() => setPagina((p) => p - 1)}
					aria-label="Letras anteriores"
					className={cn(
						slot,
						'text-primary transition-opacity hover:opacity-70',
					)}
				>
					<Seta direcao="left" />
				</button>
			) : (
				<span className={slot} aria-hidden="true" />
			)}

			<div className="flex min-w-0 flex-1 items-center justify-between font-display text-4xl uppercase leading-none sm:text-6xl lg:text-[100px]">
				{PAGINAS[pagina].map((letra) => {
					const disponivel = letrasDisponiveis.has(letra);
					const ativa = letra === letraAtiva;
					return (
						<button
							key={letra}
							type="button"
							disabled={!disponivel}
							onClick={() => onSelect(letra)}
							aria-pressed={ativa}
							className={cn(
								'font-medium transition-colors',
								ativa
									? 'text-accent-foreground underline decoration-2 underline-offset-4'
									: disponivel
										? 'text-accent-foreground hover:text-primary'
										: 'cursor-default text-accent-foreground/30',
							)}
						>
							{letra}
						</button>
					);
				})}
			</div>

			{temProxima ? (
				<button
					type="button"
					onClick={() => setPagina((p) => p + 1)}
					aria-label="Próximas letras"
					className={cn(
						slot,
						'text-primary transition-opacity hover:opacity-70',
					)}
				>
					<Seta direcao="right" />
				</button>
			) : (
				<span className={slot} aria-hidden="true" />
			)}
		</div>
	);
}
