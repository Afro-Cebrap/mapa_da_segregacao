import { Link, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import logoAfroDark from '@/assets/logo-afro-header.svg';
import logoAfroLight from '@/assets/logo-afro-footer.svg';

const NAV_ITEMS = [
	{ name: 'Home', to: '/' },
	{ name: 'Dados', to: '/dashboard' },
	{ name: 'Glossário', to: '/glossario' },
];

type HeaderProps = {
	/**
	 * `light` (padrão): fundo creme, logo escuro — usado nas páginas claras.
	 * `dark`: fundo transparente sobre o verde, logo claro, textos em creme —
	 * usado na página de Glossário.
	 */
	variant?: 'light' | 'dark';
};

export function Header({ variant = 'light' }: HeaderProps) {
	const escuro = variant === 'dark';

	return (
		<header
			className={cn(
				'relative z-40 w-full',
				escuro ? 'bg-transparent' : 'bg-background',
			)}
		>
			<div className="mx-auto flex max-w-7xl items-center px-6 py-7 md:px-16">
				<Link
					to="/"
					className="flex items-center"
					aria-label="Mapa da Segregação"
				>
					<img
						src={escuro ? logoAfroLight : logoAfroDark}
						alt="Mapa da Segregação"
						className="h-16 w-auto"
					/>
				</Link>

				<nav className="ml-16 hidden items-center gap-10 md:flex">
					{NAV_ITEMS.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === '/'}
							className={({ isActive }) =>
								cn(
									'font-display text-2xl leading-none tracking-wide normal-case transition-colors',
									escuro
										? isActive
											? 'font-bold text-accent-foreground underline'
											: 'font-medium text-accent-foreground/85 hover:text-accent-foreground'
										: isActive
											? 'font-bold text-foreground underline'
											: 'font-medium text-foreground/85 hover:text-foreground',
								)
							}
						>
							{item.name}
						</NavLink>
					))}
				</nav>

				{!escuro && (
					<button
						type="button"
						className="ml-auto hidden font-display text-2xl font-medium leading-none tracking-wide text-foreground/85 transition-colors hover:text-foreground md:inline-flex"
						aria-label="Idiomas"
					>
						Idiomas
					</button>
				)}
			</div>
		</header>
	);
}
