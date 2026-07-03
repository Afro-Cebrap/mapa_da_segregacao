import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
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
	const [menuAberto, setMenuAberto] = useState(false);

	return (
		<header className="relative z-40 w-full bg-transparent">
			<div className="mx-auto flex max-w-7xl items-center px-6 py-7 md:px-16">
				<Link
					to="/"
					className="flex items-center"
					aria-label="Mapa da Segregação"
				>
					<img
						src={escuro ? logoAfroLight : logoAfroDark}
						alt="Mapa da Segregação"
						className="h-12 w-auto md:h-16"
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

				<button
					type="button"
					onClick={() => setMenuAberto((aberto) => !aberto)}
					aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
					aria-expanded={menuAberto}
					className={cn(
						'-mr-2 ml-auto p-2 transition-opacity hover:opacity-70 md:hidden',
						escuro ? 'text-accent-foreground' : 'text-foreground',
					)}
				>
					{menuAberto ? (
						<X className="h-6 w-6" aria-hidden="true" />
					) : (
						<Menu className="h-6 w-6" aria-hidden="true" />
					)}
				</button>
			</div>

			{menuAberto && (
				<nav
					className={cn(
						'absolute inset-x-0 top-full flex flex-col gap-5 px-6 pt-2 pb-7 shadow-lg md:hidden',
						escuro ? 'bg-accent' : 'bg-background',
					)}
				>
					{NAV_ITEMS.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === '/'}
							onClick={() => setMenuAberto(false)}
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
			)}
		</header>
	);
}
