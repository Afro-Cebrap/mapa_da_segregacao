import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { usePageMeta } from '@/hooks/usePageMeta';

function NotFound() {
	usePageMeta({
		title: 'Pagina nao encontrada — Mapa da Segregacao',
		description: 'A pagina que voce procura nao existe ou foi movida.',
	});

	return (
		<section className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">
			<p className="font-display text-7xl font-black text-primary">404</p>
			<h1 className="mt-4 font-display text-3xl font-bold uppercase tracking-[0.01em] text-foreground">
				Página não encontrada
			</h1>
			<p className="mt-3 max-w-md text-foreground">
				A página que você procura não existe ou foi movida.
			</p>
			<Button
				asChild
				className="mt-8 h-12 rounded-none bg-primary px-6 font-display text-lg font-medium text-primary-foreground hover:bg-primary/90"
			>
				<Link to="/">Voltar para a Home</Link>
			</Button>
		</section>
	);
}

export default NotFound;
