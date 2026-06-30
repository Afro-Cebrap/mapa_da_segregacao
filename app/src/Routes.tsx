import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import HomePage from '@/pages/Home';
import NotFound from '@/pages/NotFound';
import PageLoader from '@/components/PageLoader';
import { ScrollToTop } from '@/components/ScrollToTop';

// O Dashboard carrega o MapLibre (pesado); fica em chunk separado para nao
// inflar o bundle inicial da landing.
const Dashboard = lazy(() => import('@/pages/Dashboard'));

const router = createBrowserRouter([
	{
		path: '/',
		element: (
			<>
				<ScrollToTop />
				<MainLayout />
			</>
		),
		children: [
			{ index: true, element: <HomePage /> },
			{ path: '*', element: <NotFound /> },
		],
	},
	{
		path: '/dashboard',
		element: (
			<>
				<ScrollToTop />
				<DashboardLayout />
			</>
		),
		children: [
			{
				index: true,
				element: (
					<Suspense fallback={<PageLoader />}>
						<Dashboard />
					</Suspense>
				),
			},
		],
	},
]);

export default router;
