import { Loader2 } from 'lucide-react';

// Fallback de Suspense para rotas carregadas sob demanda (lazy).
function PageLoader() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<Loader2
				className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none"
				aria-label="Carregando"
			/>
		</div>
	);
}

export default PageLoader;
