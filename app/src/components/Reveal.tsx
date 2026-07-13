import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

type RevealProps = {
	children: ReactNode;
	className?: string;
	/** Atraso da animação, em segundos. */
	delay?: number;
	/** Elemento renderizado — mantém a semântica do markup original. */
	as?: 'div' | 'section';
};

// Wrapper de animação de entrada: fade + leve deslize para cima quando o
// elemento entra na viewport. Anima uma única vez (viewport.once). Não impõe
// classes de layout — o posicionamento é responsabilidade de quem usa.
export function Reveal({
	children,
	className,
	delay = 0,
	as = 'div',
}: RevealProps) {
	const Componente = as === 'section' ? motion.section : motion.div;
	const reduzirMovimento = useReducedMotion();

	return (
		<Componente
			className={className}
			// Com "reduzir movimento" ativo no SO, renderiza direto no estado
			// final — sem fade nem deslize.
			initial={reduzirMovimento ? false : { opacity: 0, y: 24 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-60px' }}
			transition={{ duration: 0.6, delay, ease: 'easeOut' }}
		>
			{children}
		</Componente>
	);
}
