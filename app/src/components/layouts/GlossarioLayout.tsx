import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Header } from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';

// Layout da página de Glossário: fundo verde-escuro (variante escura do Header),
// reaproveitando Header e Footer compartilhados.
function GlossarioLayout() {
	return (
		<ThemeProvider defaultTheme="system" storageKey="segregacao-ui-theme">
			<div className="relative flex min-h-screen flex-col bg-accent text-accent-foreground">
				<Header variant="dark" />
				<main className="flex-1">
					<Outlet />
				</main>
				<Footer />
			</div>
		</ThemeProvider>
	);
}

export default GlossarioLayout;
