import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { MapRef } from '@vis.gl/react-maplibre';
import type { RefObject } from 'react';
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
import { useFlyToLocation } from '@/hooks/useFlyToLocation';
import { useLocationLookups } from '@/hooks/useLocationLookups';
import type { CensusYear } from '@/types/dashboard.types';

interface LocationSearchPopoverProps {
	mapRef: RefObject<MapRef | null>;
	censusYear: CensusYear;
}

type SearchItem = {
	key: string;
	scope: 'estado' | 'municipio' | 'reg_metro';
	label: string;
	detail: string;
	code: string;
};

function LocationSearchPopover({
	mapRef,
	censusYear,
}: LocationSearchPopoverProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const { data: lookups } = useLocationLookups(censusYear);
	const flyToLocation = useFlyToLocation(mapRef, censusYear);

	const items = useMemo(() => {
		const q = query.trim().toLowerCase();

		const estados: SearchItem[] = ESTADOS.filter(
			(estado) =>
				!q ||
				estado.name.toLowerCase().includes(q) ||
				estado.abbrev.toLowerCase().includes(q),
		).map((estado) => ({
			key: `estado-${estado.code}`,
			scope: 'estado',
			label: `${estado.name} (${estado.abbrev})`,
			detail: 'Estado',
			code: estado.code,
		}));

		const municipios: SearchItem[] = lookups.municipios
			.filter((municipio) => {
				if (!q) return true;
				const sigla = siglaPorCodigoEstado(municipio.code_state);
				return (
					municipio.name_muni.toLowerCase().includes(q) ||
					(sigla ? sigla.toLowerCase().includes(q) : false)
				);
			})
			.slice(0, 80)
			.map((municipio) => {
				const sigla = siglaPorCodigoEstado(municipio.code_state);
				return {
					key: `municipio-${municipio.code_muni}`,
					scope: 'municipio',
					label: sigla
						? `${municipio.name_muni} (${sigla})`
						: municipio.name_muni,
					detail: 'Municipio',
					code: municipio.code_muni,
				};
			});

		const regioesMetropolitanas: SearchItem[] =
			lookups.regioesMetropolitanas
				.filter(
					(regiao) =>
						!q || regiao.name_metro.toLowerCase().includes(q),
				)
				.map((regiao) => ({
					key: `rm-${regiao.name_metro}`,
					scope: 'reg_metro',
					label: regiao.name_metro,
					detail: 'Regiao metropolitana',
					code: regiao.name_metro,
				}));

		return [...estados, ...municipios, ...regioesMetropolitanas].slice(
			0,
			120,
		);
	}, [lookups, query]);

	const handleSelect = (item: SearchItem) => {
		flyToLocation({ scope: item.scope, code: item.code });
		setQuery('');
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					aria-label="Pesquisar localidade"
					className="size-7.5 rounded-none bg-primary text-marca-verde shadow-sm hover:bg-primary/90"
				>
					<Search className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-64 rounded-none border-0 bg-marca-creme p-0 text-marca-verde shadow-[0_20px_50px_rgba(77,53,25,0.25)]"
				side="bottom"
				align="start"
				collisionPadding={8}
			>
				<Command
					shouldFilter={false}
					className="rounded-none bg-transparent text-marca-verde"
				>
					<CommandInput
						placeholder="Buscar localidade..."
						value={query}
						onValueChange={setQuery}
						className="text-marca-verde placeholder:text-marca-verde/50"
					/>
					<CommandList className="scrollbar-laranja">
						<CommandEmpty>Nenhum resultado.</CommandEmpty>
						<CommandGroup className="p-0">
							{items.map((item) => (
								<CommandItem
									key={item.key}
									value={item.key}
									onSelect={() => handleSelect(item)}
									className="cursor-pointer rounded-none px-3 py-2.5 text-marca-verde data-[selected=true]:bg-marca-laranja/15 data-[selected=true]:text-marca-laranja"
								>
									<span className="min-w-0 flex-1 truncate">
										{item.label}
									</span>
									<span className="shrink-0 text-xs font-bold uppercase tracking-wide text-muted-foreground">
										{item.detail}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

export default LocationSearchPopover;
