import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/hooks/usePageMeta';
import iconExploracao from '@/assets/icon-exploracao.svg';
import iconExtracao from '@/assets/icon-extracao.svg';
import iconAnalise from '@/assets/icon-analise.svg';
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
		<div className="overflow-x-hidden">
			{/* Hero */}
			<section className="mx-auto max-w-7xl px-6 pt-10 pb-24 md:px-16 md:pt-16 md:pb-32">
				<h1 className="font-display text-6xl font-black uppercase leading-none sm:text-8xl lg:text-9xl">
					<span className="block text-foreground">MAPA DA</span>
					<span className="block text-primary">SEGREGAÇÃO</span>
				</h1>

				<p className="mt-10 max-w-lg text-lg leading-7 text-foreground md:text-xl">
					Explore dados de segregação com precisão granular.
					Ferramenta que possibilita a transformação de números em
					políticas públicas e decisões estratégicas.
				</p>

				<div className="mt-9">
					<Button
						asChild
						className="h-12 rounded-none bg-primary px-6 font-display text-xl font-medium tracking-wide text-primary-foreground hover:bg-primary/90"
					>
						<Link to="/dashboard">Acesse os dados</Link>
					</Button>
				</div>
			</section>

			{/* Ferramenta criada para */}
			<section className="mx-auto max-w-7xl px-6 py-16 md:px-16 md:py-20">
				<h2 className="font-display text-5xl font-black uppercase leading-none text-foreground md:text-6xl">
					<span className="block">FERRAMENTA</span>
					<span className="block md:ml-24">CRIADA PARA</span>
				</h2>

				<div className="mt-14 grid grid-cols-1 gap-x-18 gap-y-12 sm:grid-cols-2 md:ml-24 md:grid-cols-3">
					{FERRAMENTAS.map((item) => (
						<div key={item.title} className="max-w-72">
							<img
								src={item.icon}
								alt=""
								aria-hidden="true"
								className="h-11 w-auto"
							/>
							<h3 className="mt-6 font-display text-4xl font-bold normal-case leading-tight tracking-normal text-primary">
								{item.title}
							</h3>
							<p className="mt-3 text-lg leading-normal text-foreground">
								{item.description}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* O AFROCEBRAP */}
			<section className="dark-panel w-full">
				<div className="mx-auto max-w-7xl px-6 py-16 md:px-16 md:py-24">
					<h2 className="font-display text-5xl uppercase leading-none md:text-6xl">
						<span className="font-medium text-accent-foreground">
							O{' '}
						</span>
						<span className="font-black text-accent-foreground">
							AFROCEBRAP
						</span>
					</h2>

					<div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-x-20">
						<h3 className="max-w-lg font-display text-3xl font-bold normal-case leading-tight tracking-normal text-primary md:text-4xl">
							Núcleo de pesquisa, formação e difusão sobre a
							temática racial
						</h3>
						<div>
							<p className="max-w-lg text-lg leading-7 text-accent-foreground md:text-xl">
								Vinculado ao CEBRAP, o núcleo tem como
								prioridades a produção de pesquisa com alto
								rigor metodológico, a formação de novos
								pesquisadores e a divulgação científica
							</p>
							<Button
								asChild
								className="mt-10 h-11 rounded-none bg-background px-6 font-display text-lg font-medium tracking-wide text-foreground hover:bg-background/90"
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
			<section className="mx-auto max-w-7xl px-6 py-16 md:px-16 md:py-24">
				<div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
					<div>
						<h2 className="font-display text-5xl font-black uppercase leading-none text-foreground md:text-6xl">
							<span className="block font-medium">NOSSOS</span>
							<span className="block md:ml-24">PARCEIROS</span>
						</h2>
						<p className="mt-4 max-w-60 text-md leading-normal font-semibold text-foreground md:ml-24">
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
