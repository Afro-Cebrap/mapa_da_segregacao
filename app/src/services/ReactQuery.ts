import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import axios from 'axios';

const MAX_RETRIES = 2;

const shouldRetry = (failureCount: number, error: unknown) => {
	if (failureCount >= MAX_RETRIES) return false;

	if (axios.isAxiosError(error)) {
		const status = error.response?.status;
		if (status && [400, 401, 403, 404, 429].includes(status)) {
			return false;
		}
	}

	return true;
};

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: shouldRetry,
			refetchOnWindowFocus: false,
			refetchOnReconnect: true,
			staleTime: 1000 * 60 * 5,
			gcTime: 1000 * 60 * 30,
		},
	},
	queryCache: new QueryCache(),
	mutationCache: new MutationCache(),
});
