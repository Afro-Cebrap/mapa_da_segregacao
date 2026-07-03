import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/hooks/usePageMeta';
import iconExploracao from '@/assets/icon-exploracao.svg';
import iconExtracao from '@/assets/icon-extracao.svg';
import iconAnalise from '@/assets/icon-analise.svg';
import brasilArtUrl from '@/assets/brasil-art.svg';
import leftLinesUrl from '@/assets/left-lines.svg';
import bottomLinesUrl from '@/assets/bottom-lines-.svg';
import logoIpeaUrl from '@/assets/logo-ipea.svg';
import logoCebrapUrl from '@/assets/logo-cebrap-partners.png';

const FERRAMENTAS = [
	{
		icon: iconExploracao,
		title: 'Exploração interativa',
		description:
			'São apresentadas camadas de visualização para ampliação de análises permitindo mais especificidade.',
	},
	{
		icon: iconExtracao,
		title: 'Extração e inserção de dados',
		description:
			'A plataforma permite que os dados sejam exportados e que outros possam ser incluídos à visualização.',
	},
	{
		icon: iconAnalise,
		title: 'Análise territorial de desigualdades',
		description:
			'Ideal para reforçar e assegurar técnicos e tomadores de decisão sobre políticas de raça/cor no Brasil.',
	},
];

function HomePage() {
	usePageMeta({
		title: 'Mapa da Segregação — Segregação racial no Brasil',
		description:
			'Explore dados de segregação racial no Brasil com precisão granular por setor censitário, município e região metropolitana.',
		canonicalPath: '/',
	});

	return (
		<div className="relative overflow-x-clip">
			{/* Ilustração: mapa do Brasil em linhas radiais (hero, desktop).
			   Sobe atrás do header (transparente) como no Figma. */}
			<img
				src={brasilArtUrl}
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute -top-20 right-16 -z-10 hidden w-[50vw] max-w-[720px] lg:block"
			/>

			{/* Hero */}
			<section className="mx-auto max-w-7xl px-6 pt-12 pb-16 md:px-16 md:pt-16 md:pb-32">
				<h1 className="font-display text-[clamp(3.25rem,16.7vw,4.1875rem)] font-black uppercase leading-[0.93] sm:text-8xl sm:leading-none lg:text-9xl">
					<span className="block text-foreground">MAPA DA</span>
					<span className="block text-primary">SEGREGAÇÃO</span>
				</h1>

				<p className="mt-2 max-w-[296px] text-base leading-snug text-foreground sm:mt-10 sm:max-w-lg sm:text-lg sm:leading-7 md:text-xl">
					Explore dados de segregação com precisão granular.
					Ferramenta que possibilita a transformação de números em
					políticas públicas e decisões estratégicas.
				</p>

				<div className="mt-11 md:mt-9">
					<Button
						asChild
						className="h-12 rounded-none bg-primary px-3 font-display text-[26px] font-bold tracking-wide text-primary-foreground hover:bg-primary/90 md:px-6 md:text-xl md:font-medium"
					>
						<Link to="/dashboard">Acesse os dados</Link>
					</Button>
				</div>
			</section>

			{/* Ferramenta criada para */}
			<section className="relative mx-auto max-w-7xl px-6 py-16 md:px-16 md:py-20">
				{/* Ilustração: leque de linhas na borda esquerda (desktop).
				   z-[1] deixa as linhas visíveis sobre o painel verde abaixo;
				   o conteúdo das seções fica acima via z-10. */}
				<img
					src={leftLinesUrl}
					alt=""
					aria-hidden="true"
					className="pointer-events-none absolute top-56 -left-[calc((100vw-100%)/2)] z-[1] hidden w-40 lg:block xl:w-72 2xl:w-[392px]"
				/>
				<h2 className="relative z-10 font-display text-[45px] font-black uppercase leading-none text-foreground md:text-6xl">
					<span className="block font-medium md:font-black">
						FERRAMENTA
					</span>
					<span className="block ml-[78px] md:ml-24">
						CRIADA PARA
					</span>
				</h2>

				<div className="relative z-10 mt-7 grid grid-cols-1 gap-x-18 gap-y-10 sm:grid-cols-2 md:mt-14 md:ml-24 md:grid-cols-3 md:gap-y-12">
					{FERRAMENTAS.map((item) => (
						<div
							key={item.title}
							className="flex items-start gap-8 sm:block sm:max-w-72"
						>
							<img
								src={item.icon}
								alt=""
								aria-hidden="true"
								className="h-10 w-11 shrink-0 object-contain object-left sm:h-11 sm:w-auto"
							/>
							<div>
								<h3 className="font-display text-3xl font-bold normal-case leading-tight tracking-normal text-primary sm:mt-6 md:text-4xl">
									{item.title}
								</h3>
								<p className="mt-2 text-base leading-snug text-foreground sm:mt-3 sm:text-lg sm:leading-normal">
									{item.description}
								</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* O AFROCEBRAP */}
			<section className="dark-panel relative w-full">
				{/* Ilustração: leque de linhas na borda direita — cruza o painel
				   verde e a seção de parceiros; o footer (relative) cobre o
				   restante, como no Figma. Em telas menores a arte encolhe e o
				   top desce junto, mantendo a base sempre sob o footer
				   (base ≈ topo do painel + 1222px em todas as larguras). */}
				<img
					src={bottomLinesUrl}
					alt=""
					aria-hidden="true"
					className="pointer-events-none absolute top-[677px] right-0 hidden w-32 max-w-none lg:block xl:top-[541px] xl:w-40 2xl:top-32 2xl:w-[257px]"
				/>
				<div className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:px-16 md:py-24">
					<h2 className="font-display text-[45px] uppercase leading-none md:text-6xl">
						<span className="font-medium text-accent-foreground">
							O{' '}
						</span>
						<span className="font-black text-accent-foreground">
							AFROCEBRAP
						</span>
					</h2>

					<div className="mt-7 grid grid-cols-1 gap-10 md:mt-12 md:grid-cols-2 md:gap-x-20">
						<h3 className="max-w-lg font-display text-3xl font-bold normal-case leading-tight tracking-normal text-primary md:text-4xl">
							Núcleo de pesquisa, formação e difusão sobre a
							temática racial
						</h3>
						<div>
							<p className="max-w-lg text-base leading-snug text-accent-foreground md:text-xl md:leading-7">
								Vinculado ao CEBRAP, o núcleo tem como
								prioridades a produção de pesquisa com alto
								rigor metodológico, a formação de novos
								pesquisadores e a divulgação científica
							</p>
							<Button
								asChild
								className="mt-6 h-11 rounded-none bg-background px-3 font-display text-xl font-medium tracking-wide text-foreground hover:bg-background/90 md:mt-10 md:px-6 md:text-lg"
							>
								<a
									href="https://cebrap.org.br"
									target="_blank"
									rel="noopener noreferrer"
								>
									Conheça o AfroCEBRAP
								</a>
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Nossos parceiros */}
			<section className="relative mx-auto max-w-7xl px-6 py-16 md:px-16 md:py-24">
				<div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
					<div>
						<h2 className="font-display text-[45px] font-black uppercase leading-none text-foreground md:text-6xl">
							<span className="block font-medium">NOSSOS</span>
							<span className="block ml-[83px] md:ml-24">
								PARCEIROS
							</span>
						</h2>
						<p className="mt-1 ml-[84px] max-w-[265px] text-base leading-snug font-semibold text-foreground md:mt-4 md:ml-24 md:max-w-60 md:leading-normal">
							Instituições parceiras que tornam o Mapa da
							Segregação possível:
						</p>
					</div>

					<div className="flex items-center justify-between gap-4">
						<button
							type="button"
							className="shrink-0 text-primary transition-opacity hover:opacity-70"
							aria-label="Parceiros anteriores"
						>
							<svg
								viewBox="0 0 22 22"
								fill="currentColor"
								className="h-7 w-7"
								aria-hidden="true"
							>
								<path d="M16 2 4 11l12 9z" />
							</svg>
						</button>
						<div className="flex flex-1 items-center justify-evenly gap-10">
							<img
								src={logoIpeaUrl}
								alt="ipea"
								className="h-12 w-auto md:h-16"
							/>
							<img
								src={logoCebrapUrl}
								alt="CEBRAP"
								className="h-12 w-auto md:h-16"
							/>
						</div>
						<button
							type="button"
							className="shrink-0 text-primary transition-opacity hover:opacity-70"
							aria-label="Próximos parceiros"
						>
							<svg
								viewBox="0 0 22 22"
								fill="currentColor"
								className="h-7 w-7"
								aria-hidden="true"
							>
								<path d="M6 2l12 9-12 9z" />
							</svg>
						</button>
					</div>
				</div>
			</section>
		</div>
	);
}

export default HomePage;
