import { Link } from 'react-router-dom';
import { Instagram, Linkedin } from 'lucide-react';
import logoAfroUrl from '@/assets/logo-afro-footer.svg';
import NewsletterForm from '@/components/layouts/NewsletterForm';

const NAV_ITEMS = [
	{ name: 'Home', to: '/' },
	{ name: 'Sobre', to: '/sobre' },
	{ name: 'Dados', to: '/dashboard' },
];

function XIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className={className}
			aria-hidden="true"
		>
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}

const SOCIAL_LINKS = [
	{ href: 'https://instagram.com', label: 'Instagram', icon: Instagram },
	{ href: 'https://x.com', label: 'X (Twitter)', icon: XIcon },
	{ href: 'https://linkedin.com', label: 'LinkedIn', icon: Linkedin },
];

function Footer() {
	return (
		<footer className="w-full bg-primary">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 pt-24 pb-32 md:flex-row md:items-start md:justify-between md:px-16">
				{/* Bloco da esquerda */}
				<div className="flex flex-col">
					{/* Wordmark + navegação */}
					<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-16">
						<h3 className="font-display text-4xl font-black uppercase leading-none">
							<span className="block text-foreground">
								MAPA DA
							</span>
							<span className="block text-accent-foreground">
								SEGREGAÇÃO
							</span>
						</h3>
						<nav className="flex flex-row items-center gap-8">
							{NAV_ITEMS.map((item) => (
								<Link
									key={item.to}
									to={item.to}
									className="font-display text-2xl font-medium tracking-wide text-foreground transition-opacity hover:opacity-70"
								>
									{item.name}
								</Link>
							))}
						</nav>
					</div>

					{/* Redes sociais */}
					<div className="mt-6 flex items-center gap-5">
						{SOCIAL_LINKS.map((link) => (
							<a
								key={link.label}
								href={link.href}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={link.label}
								className="flex text-foreground transition-opacity hover:opacity-70"
							>
								<link.icon className="h-5 w-5" />
							</a>
						))}
					</div>

					{/* Logo + copyright */}
					<div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-12">
						<img
							src={logoAfroUrl}
							alt="AFRO — Núcleo de Pesquisa e Formação em Raça, Gênero e Justiça Racial"
							className="h-12 w-auto shrink-0"
						/>
						<p className="text-sm text-accent-foreground/90">
							Copyright© 2026 Mapa da Segregação. Desenvolvido por
							Tavus Data.
						</p>
					</div>
				</div>

				{/* Bloco da direita: newsletter */}
				<div className="w-full shrink-0 md:w-112">
					<NewsletterForm />
				</div>
			</div>
		</footer>
	);
}

export default Footer;
