import { cn } from '@/lib/utils';
import type {
	CensusYearFilterProps,
	CensusYear,
} from '@/types/dashboard.types';

const CENSUS_YEARS: CensusYear[] = [2010, 2022];

function CensusYearFilter({
	censusYear,
	onCensusYearChange,
	onDark = false,
}: CensusYearFilterProps) {
	return (
		<div className="flex items-center gap-[18px]">
			<span
				className={cn(
					'font-display text-3xl font-bold uppercase leading-none tracking-[0.01em]',
					onDark ? 'text-marca-creme' : 'text-foreground',
				)}
			>
				Censo
			</span>
			{/* Botões com a mesma receita dos indicadores (31px de altura)
			    e 16px de gap entre eles, conforme o Figma. */}
			<div className="flex gap-4">
				{CENSUS_YEARS.map((year) => {
					const isActive = censusYear === year;
					return (
						<button
							key={year}
							type="button"
							onClick={() => onCensusYearChange(year)}
							className={cn(
								'rounded-none border px-2.5 py-2.5 text-base font-bold leading-none tabular-nums transition-colors md:py-1.5',
								isActive
									? 'border-primary bg-primary text-marca-verde-escuro'
									: onDark
										? 'border-primary text-marca-creme hover:bg-primary/10'
										: 'border-primary text-marca-verde hover:bg-primary/10',
							)}
						>
							{year}
						</button>
					);
				})}
			</div>
		</div>
	);
}

export default CensusYearFilter;
