import { Outlet } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeProvider';

function DashboardLayout() {
	return (
		<ThemeProvider defaultTheme="system" storageKey="segregacao-ui-theme">
			<div className="h-dvh w-dvw overflow-hidden bg-background">
				<Outlet />
			</div>
		</ThemeProvider>
	);
}

export default DashboardLayout;
