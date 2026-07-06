import { useMemo, useState } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import topLinesUrl from '@/assets/top-lines.svg';
import bottomLinesUrl from '@/assets/bottom-lines2.svg';
import { TERMOS_GLOSSARIO, normalizar, primeiraLetra } from '@/data/glossario';
import { GlossarioHero } from '@/components/glossario/GlossarioHero';
import { AlfabetoNav } from '@/components/glossario/AlfabetoNav';
import { ListaTermos } from '@/components/glossario/ListaTermos';
import { SecaoContato } from '@/components/glossario/SecaoContato';

// Conjunto de letras iniciais que possuem termos.
const LETRAS_DISPONIVEIS = new Set(
	TERMOS_GLOSSARIO.map((item) => primeiraLetra(item.termo)),
);

const PRIMEIRA_LETRA = [...LETRAS_DISPONIVEIS].sort()[0] ?? 'A';

function GlossarioPage() {
	usePageMeta({
		title: 'Glossário — Mapa da Segregação',
		description:
			'Significado dos nomes dados aos grupos e indicadores usados no Mapa da Segregação.',
		canonicalPath: '/glossario',
	});

	const [letraAtiva, setLetraAtiva] = useState(PRIMEIRA_LETRA);
	const [busca, setBusca] = useState('');

	// Com busca ativa, filtra por termo/definição em toda a lista; sem busca,
	// mostra apenas os termos da letra selecionada.
	const termosVisiveis = useMemo(() => {
		const termoBusca = normalizar(busca.trim());
		if (termoBusca) {
			return TERMOS_GLOSSARIO.filter(
				(item) =>
					normalizar(item.termo).includes(termoBusca) ||
					normalizar(item.definicao).includes(termoBusca),
			);
		}
		return TERMOS_GLOSSARIO.filter(
			(item) => primeiraLetra(item.termo) === letraAtiva,
		);
	}, [busca, letraAtiva]);

	const handleSelectLetra = (letra: string) => {
		setBusca('');
		setLetraAtiva(letra);
	};

	return (
		<div className="relative overflow-x-clip">
			{/* Ilustração: leque de linhas no canto superior direito (desktop).
			   Sobe atrás do header (transparente) até o topo da página, como no
			   Figma (-top-30 compensa a altura do header). */}
			<img
				src={topLinesUrl}
				alt=""
				aria-hidden="true"
				className="pointer-events-none absolute -top-30 right-0 hidden w-64 lg:block xl:w-120 2xl:w-[589px]"
			/>

			{/* Ilustração: leque de linhas na borda direita, sobre a seção de
			   contato. O wrapper overflow-hidden termina onde o footer começa,
			   recortando a base do leque no limite do laranja — assim o offset
			   negativo pode descer a arte sem a ponta escapar por baixo do
			   footer. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
			>
				<img
					src={bottomLinesUrl}
					alt=""
					className="absolute right-0 -bottom-[315px] w-[460px] xl:-bottom-[480px] xl:w-[780px] 2xl:-bottom-[600px] 2xl:w-[940px]"
				/>
			</div>

			<div className="relative z-10 mx-auto max-w-7xl px-6 pt-12 pb-24 md:px-16 md:pt-16 md:pb-32">
				<GlossarioHero busca={busca} onBuscaChange={setBusca} />

				<div className="mt-24 flex flex-col gap-14 md:mt-32">
					<AlfabetoNav
						letraAtiva={letraAtiva}
						letrasDisponiveis={LETRAS_DISPONIVEIS}
						onSelect={handleSelectLetra}
					/>
					<ListaTermos termos={termosVisiveis} />
				</div>

				<div className="mt-28 md:mt-40">
					<SecaoContato />
				</div>
			</div>
		</div>
	);
}

export default GlossarioPage;
