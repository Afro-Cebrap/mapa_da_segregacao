import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

type PolymorphicProps<C extends React.ElementType> = {
	as?: C;
	children: React.ReactNode;
	className?: string;
	withAnimation?: boolean;
	delay?: number;
} & Omit<
	React.ComponentPropsWithoutRef<C>,
	'onAnimationStart' | 'onDrag' | 'onDragEnd' | 'onDragStart' | 'style'
>;

function Container<C extends React.ElementType = 'div'>({
	as,
	children,
	className,
	withAnimation = false,
	delay = 0,
	...rest
}: PolymorphicProps<C>) {
	const Component = as || 'div';

	if (!withAnimation) {
		return (
			<Component
				className={cn(
					'px-4 md:px-6 lg:px-8 max-w-7xl mx-auto',
					className,
				)}
				{...rest}
			>
				{children}
			</Component>
		);
	}

	// Use motion.div directly and apply polymorphism via its own 'as' prop or fallback
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const MotionComp = motion.div as any;

	return (
		<MotionComp
			as={Component}
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: '-50px' }}
			transition={{ duration: 0.5, delay: delay, ease: 'easeOut' }}
			className={cn('px-4 md:px-6 lg:px-8 max-w-7xl mx-auto', className)}
			{...rest}
		>
			{children}
		</MotionComp>
	);
}

export default Container;
