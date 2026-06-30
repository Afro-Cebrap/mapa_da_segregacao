import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import './index.css';
import router from '@/Routes';
import { queryClient } from '@/services/ReactQuery';
import ErrorBoundary from '@/components/ErrorBoundary';
import 'maplibre-gl/dist/maplibre-gl.css';

function App() {
	return (
		<ErrorBoundary>
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</ErrorBoundary>
	);
}

export default App;
