import type { TermoGlossario } from '@/data/glossario';

type ListaTermosProps = {
	termos: TermoGlossario[];
};

// Lista de verbetes (termo + definição). Renderizada como lista de definição
// (<dl>) por semântica de glossário.
export function ListaTermos({ termos }: ListaTermosProps) {
	if (termos.length === 0) {
		return (
			<p className="text-xl leading-relaxed text-accent-foreground/70">
				Nenhum termo encontrado.
			</p>
		);
	}

	return (
		<dl className="flex w-full max-w-[891px] flex-col gap-14">
			{termos.map((item) => (
				<div key={item.termo} className="flex flex-col gap-4">
					<dt className="font-display text-4xl font-bold leading-none text-accent-foreground md:text-[40px]">
						{item.termo}
					</dt>
					<dd className="max-w-[660px] text-xl leading-[1.42] text-accent-foreground">
						{item.definicao}
					</dd>
				</div>
			))}
		</dl>
	);
}
