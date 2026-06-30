import { useEffect, useState } from 'react';

// Breakpoint mobile do dashboard (mesmo limite usado no restante do app).
const MOBILE_QUERY = '(max-width: 767px)';

// Retorna true quando a viewport está no tamanho mobile e reage a mudanças
// (rotação, redimensionamento da janela).
export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(
		() =>
			typeof window !== 'undefined' &&
			window.matchMedia(MOBILE_QUERY).matches,
	);

	useEffect(() => {
		const mql = window.matchMedia(MOBILE_QUERY);
		const handler = (event: MediaQueryListEvent) =>
			setIsMobile(event.matches);
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsMobile(mql.matches);
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	}, []);

	return isMobile;
}
