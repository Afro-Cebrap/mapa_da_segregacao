import { Link, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import logoAfroUrl from '@/assets/logo-afro-header.svg';

const NAV_ITEMS = [
	{ name: 'Home', to: '/' },
	{ name: 'Dados', to: '/dashboard' },
	{ name: 'Sobre', to: '/sobre' },
];

export function Header() {
	return (
		<header className="relative z-40 w-full bg-background">
			<div className="mx-auto flex max-w-7xl items-center px-6 py-7 md:px-16">
				<Link
					to="/"
					className="flex items-center"
					aria-label="Mapa da Segregação"
				>
					<img
						src={logoAfroUrl}
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
									isActive
										? 'font-bold text-foreground underline'
										: 'font-medium text-foreground/85 hover:text-foreground',
								)
							}
						>
							{item.name}
						</NavLink>
					))}
				</nav>

				<button
					type="button"
					className="ml-auto hidden font-display text-2xl font-medium leading-none tracking-wide text-foreground/85 transition-colors hover:text-foreground md:inline-flex"
					aria-label="Idiomas"
				>
					Idiomas
				</button>
			</div>
		</header>
	);
}
