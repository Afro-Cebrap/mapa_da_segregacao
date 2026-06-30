import axios from 'axios';

const env = import.meta.env;

const defaultHeaders: Record<string, string> = {
	accept: 'application/json',
};

if (env.VITE_API_KEY) {
	defaultHeaders['x-api-key'] = env.VITE_API_KEY;
}

export const api = axios.create({
	baseURL: env.VITE_API_URL || 'http://127.0.0.1:8000',
	headers: defaultHeaders,
});

api.interceptors.request.use((config) => {
	const token = sessionStorage.getItem('token');

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => Promise.reject(error),
);
