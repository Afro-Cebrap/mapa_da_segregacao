import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeProvider';
import { Header } from '@/components/layouts/Header';
import Footer from '@/components/layouts/Footer';

function MainLayout() {
	return (
		<ThemeProvider defaultTheme="system" storageKey="segregacao-ui-theme">
			<div className="relative flex min-h-screen flex-col">
				<Header />
				<main className="flex-1">
					<Outlet />
				</main>
				<Footer />
			</div>
		</ThemeProvider>
	);
}

export default MainLayout;
