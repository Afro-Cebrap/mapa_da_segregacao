import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import App from './App.tsx';

// Teaches MapLibre to read `pmtiles://` sources, which it fetches with HTTP
// range requests straight from the bucket. Must run before any map mounts.
const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
