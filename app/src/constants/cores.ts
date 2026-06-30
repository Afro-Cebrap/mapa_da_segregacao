// Paleta da marca (Figma MDS_Interface_VS2). Os mesmos valores são expostos
// como tokens `--color-marca-*` no index.css para uso via classes Tailwind
// (ex.: bg-marca-creme, text-marca-verde); este módulo serve o código TS que
// não passa por CSS (estilos MapLibre, paletas de camadas).
export const CORES_MARCA = {
	creme: '#f2e9cc',
	laranja: '#c37103',
	laranjaClaro: '#dfa151',
	verde: '#022604',
	verdeEscuro: '#041401',
} as const;
