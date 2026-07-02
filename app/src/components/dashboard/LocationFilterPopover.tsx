import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { ESTADOS, siglaPorCodigoEstado } from '@/constants/estados';
import { useLocationLookups } from '@/hooks/useLocationLookups';
import { layerForScope } from '@/lib/location';
import type {
	LocationFilter,
	LocationFilterPopoverProps,
	LocationFilterScope,
} from '@/types/dashboard.types';

type TabKey = LocationFilterScope;

// Rótulos das abas conforme o Figma (Estados | Municípios | RM).
const TAB_LABEL: Record<TabKey, string> = {
	estado: 'Estados',
	municipio: 'Municípios',
	reg_metro: 'RM',
};

// Placeholder da busca no singular/por extenso (os rótulos das abas são curtos).
const TAB_PLACEHOLDER: Record<TabKey, string> = {
	estado: 'Buscar estado...',
	municipio: 'Buscar município...',
	reg_metro: 'Buscar região metropolitana...',
};

// Ordem fixa das abas do botão "Filtros", conforme o layout de referência.
const FILTER_TABS: TabKey[] = ['estado', 'municipio', 'reg_metro'];

export interface LocationFilterMenuProps {
	tabs: TabKey[];
	locationFilter: LocationFilter | null;
	onSelect: (filter: LocationFilter) => void;
}

// Miolo reutilizável do menu de local (abas + busca + lista). Usado pelo
// botão "Filtros" e pelo item "Setores" da lista de escalas da sidebar.
export function LocationFilterMenu({
	tabs,
	locationFilter,
	onSelect,
}: LocationFilterMenuProps) {
	const [query, setQuery] = useState('');
	const initialTab: TabKey =
		locationFilter && tabs.includes(locationFilter.scope)
			? locationFilter.scope
			: (tabs[0] ?? 'estado');
	const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

	const { data: lookups } = useLocationLookups();

	const items = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (activeTab === 'estado') {
			return ESTADOS.filter(
				(e) =>
					!q ||
					e.name.toLowerCase().includes(q) ||
					e.abbrev.toLowerCase().includes(q),
			).map((e) => ({
				key: e.code,
				label: `${e.name} (${e.abbrev})`,
				code: e.code,
				name: e.name,
			}));
		}
		if (activeTab === 'municipio') {
			return lookups.municipios
				.filter((m) => {
					if (!q) return true;
					const sigla = siglaPorCodigoEstado(m.code_state);
					return (
						m.name_muni.toLowerCase().includes(q) ||
						(sigla ? sigla.toLowerCase().includes(q) : false)
					);
				})
				.slice(0, 200)
				.map((m) => {
					const sigla = siglaPorCodigoEstado(m.code_state);
					return {
						key: m.code_muni,
						label: sigla
							? `${m.name_muni} (${sigla})`
							: m.name_muni,
						code: m.code_muni,
						name: m.name_muni,
					};
				});
		}
		// reg_metro
		return lookups.regioesMetropolitanas
			.filter((r) => !q || r.name_metro.toLowerCase().includes(q))
			.map((r) => ({
				key: r.name_metro,
				label: r.name_metro,
				code: r.name_metro,
				name: r.name_metro,
			}));
	}, [activeTab, lookups, query]);

	const handleSelect = (item: { code: string; name: string }) => {
		onSelect({
			scope: activeTab,
			code: item.code,
			name: item.name,
		});
		setQuery('');
	};

	return (
		<>
			{/* Abas (Estados | Municípios | RM): aba ativa em laranja bold,
			    inativas em verde, com linha separadora — conforme o Figma. */}
			<div className="flex items-center border-b border-primary/40">
				{tabs.map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => {
							setActiveTab(tab);
							setQuery('');
						}}
						className={cn(
							'flex-1 px-3 py-2 text-xs transition-colors',
							activeTab === tab
								? 'font-bold text-primary'
								: 'font-normal text-marca-verde hover:text-primary',
						)}
					>
						{TAB_LABEL[tab]}
					</button>
				))}
			</div>
			<Command
				shouldFilter={false}
				className="rounded-none bg-transparent text-marca-verde"
			>
				<CommandInput
					placeholder={TAB_PLACEHOLDER[activeTab]}
					value={query}
					onValueChange={setQuery}
					className="text-marca-verde placeholder:text-marca-verde/50"
				/>
				<CommandList className="scrollbar-laranja">
					<CommandEmpty>Nenhum resultado.</CommandEmpty>
					<CommandGroup className="p-0">
						{items.map((item) => {
							const isActive =
								locationFilter?.scope === activeTab &&
								locationFilter?.code === item.code;
							return (
								<CommandItem
									key={item.key}
									value={item.key}
									onSelect={() => handleSelect(item)}
									className={cn(
										// Item escolhido vira a barra laranja do design
										// (sem ícone de check); o realce de teclado/hover
										// fica num tom sutil de laranja.
										'cursor-pointer rounded-none px-3 py-2.5 text-xs text-marca-verde data-[selected=true]:bg-marca-laranja/15 data-[selected=true]:text-marca-laranja',
										isActive &&
											'bg-primary font-bold data-[selected=true]:bg-primary data-[selected=true]:text-marca-verde',
									)}
								>
									<span className="truncate">
										{item.label}
									</span>
								</CommandItem>
							);
						})}
					</CommandGroup>
				</CommandList>
			</Command>
		</>
	);
}

function LocationFilterPopover({
	activeLayerId,
	locationFilter,
	onLocationFilterChange,
	onLayerChange,
}: LocationFilterPopoverProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="h-auto gap-1.5 rounded-none bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-marca-verde shadow-sm hover:bg-primary/90"
				>
					Filtros
					<Filter size={12} fill="currentColor" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-64 rounded-none border-0 bg-marca-creme p-0 text-marca-verde shadow-[0_20px_50px_rgba(77,53,25,0.25)]"
				side="bottom"
				align="start"
				collisionPadding={8}
			>
				<LocationFilterMenu
					tabs={FILTER_TABS}
					locationFilter={locationFilter}
					onSelect={(filter) => {
						// Ativa a camada natural do escopo escolhido (ex.:
						// Município → Setores) antes de aplicar o filtro.
						const targetLayer = layerForScope(
							filter.scope,
							activeLayerId,
						);
						if (targetLayer !== activeLayerId) {
							onLayerChange(targetLayer);
						}
						onLocationFilterChange(filter);
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}

export default LocationFilterPopover;
