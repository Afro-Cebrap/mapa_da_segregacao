import { useEffect } from 'react';
import { SITE_URL } from '@/constants/site';

type PageMeta = {
	title: string;
	description?: string;
	/** Caminho canonico (ex: '/dashboard'). Default: pathname atual. */
	canonicalPath?: string;
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
	let el = document.head.querySelector<HTMLMetaElement>(
		`meta[${attr}="${key}"]`,
	);
	if (!el) {
		el = document.createElement('meta');
		el.setAttribute(attr, key);
		document.head.appendChild(el);
	}
	el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
	let el = document.head.querySelector<HTMLLinkElement>(
		'link[rel="canonical"]',
	);
	if (!el) {
		el = document.createElement('link');
		el.setAttribute('rel', 'canonical');
		document.head.appendChild(el);
	}
	el.setAttribute('href', href);
}

// Define title + meta description + canonical + Open Graph por rota. Como o
// app e uma SPA, o index.html traz apenas os valores de fallback; cada pagina
// sobrescreve via este hook.
export function usePageMeta({ title, description, canonicalPath }: PageMeta) {
	useEffect(() => {
		document.title = title;
		upsertMeta('property', 'og:title', title);

		if (description) {
			upsertMeta('name', 'description', description);
			upsertMeta('property', 'og:description', description);
		}

		const path = canonicalPath ?? window.location.pathname;
		const url = `${SITE_URL}${path}`;
		upsertCanonical(url);
		upsertMeta('property', 'og:url', url);
	}, [title, description, canonicalPath]);
}
