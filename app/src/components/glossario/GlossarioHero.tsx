import { Search } from 'lucide-react';

type GlossarioHeroProps = {
	busca: string;
	onBuscaChange: (valor: string) => void;
};

// Cabeçalho da página: título, subtítulo e a introdução em duas colunas
// (parágrafo + busca à esquerda; parágrafo + botão de contato à direita).
export function GlossarioHero({ busca, onBuscaChange }: GlossarioHeroProps) {
	return (
		<div className="flex flex-col gap-12">
			{/* Título + subtítulo */}
			<div className="flex flex-col gap-8">
				<h1 className="font-display uppercase leading-[0.72] text-accent-foreground">
					<span className="text-7xl font-medium sm:text-8xl md:text-[100px]">
						O{' '}
					</span>
					<span className="text-7xl font-black sm:text-8xl md:text-[100px]">
						Glossário
					</span>
				</h1>
				<p className="max-w-[685px] font-display text-3xl font-bold leading-tight text-primary md:text-[40px] md:leading-[45px]">
					Aqui você encontra o significado dos nomes dados aos grupos
					e indicadores
				</p>
			</div>

			{/* Introdução em duas colunas */}
			<div className="flex flex-col gap-12 md:flex-row md:gap-20">
				{/* Esquerda: texto + busca */}
				<div className="flex flex-col gap-6 md:w-[484px]">
					<p className="text-xl leading-[1.42] text-accent-foreground">
						Explore as nomenclaturas por meio da disposição
						alfabética ou digite abaixo a palavra que deseja
						conhecer.
					</p>
					<div className="flex items-center gap-6">
						<div className="w-[282px] max-w-full bg-background px-4 py-2">
							<label className="flex flex-col gap-2">
								<span className="sr-only">
									Buscar termo no glossário
								</span>
								<input
									type="search"
									value={busca}
									onChange={(event) =>
										onBuscaChange(event.target.value)
									}
									placeholder="Busca..."
									className="w-full border-0 border-b border-foreground/30 bg-transparent pb-1 font-display text-xl text-foreground placeholder:text-foreground/50 focus:border-primary focus:outline-none"
								/>
							</label>
						</div>
						<Search
							className="size-5 shrink-0 text-accent-foreground"
							aria-hidden="true"
						/>
					</div>
				</div>

				{/* Direita: texto + botão de contato */}
				<div className="flex flex-col items-start gap-6 md:w-[482px]">
					<p className="text-xl leading-[1.42] text-accent-foreground">
						Caso ainda tenha dúvidas, ao final da página você
						encontra uma seção de contato onde pode nos mandar uma
						mensagem.
					</p>
					<a
						href="#contato"
						className="inline-flex items-center justify-center bg-primary px-3 py-3 font-display text-xl font-bold tracking-wide text-marca-verde-escuro transition-opacity hover:opacity-90"
					>
						Queremos te ouvir
					</a>
				</div>
			</div>
		</div>
	);
}
