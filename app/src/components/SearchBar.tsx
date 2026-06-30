import type { MapRef } from '@vis.gl/react-maplibre';
import { useQuery } from '@tanstack/react-query';
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
import { MapIcon, MapPin, Navigation, Search } from 'lucide-react';
import { useMemo, useState, type RefObject } from 'react';
import {
	setoresDtoToFeatureCollection,
	setoresService,
} from '@/services/setores/Setores.services';
import { fitMapToBbox } from '@/lib/geo';
import { normalizeText } from '@/lib/format';
import {
	buildIndex,
	type ResultType,
	type SearchResult,
} from '@/lib/searchIndex';

const TYPE_GROUP_LABEL: Record<ResultType, string> = {
	estado: 'Estados',
	municipio: 'Municípios',
	reg_metro: 'Regiões Metropolitanas',
};

const TYPE_ORDER: ResultType[] = ['estado', 'reg_metro', 'municipio'];

function iconFor(type: ResultType) {
	if (type === 'estado')
		return <MapIcon size={16} className="text-blue-500 shrink-0" />;
	if (type === 'reg_metro')
		return <Navigation size={16} className="shrink-0 text-marca-laranja" />;
	return <MapPin size={16} className="text-green-500 shrink-0" />;
}

function SearchBar({ mapRef }: { mapRef: RefObject<MapRef | null> }) {
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const layerQuery = useQuery({
		queryKey: ['layer-geometry', 'municipios'],
		queryFn: async () => {
			const items = await setoresService.listarPorEndpoint('municipios');
			return setoresDtoToFeatureCollection(items);
		},
		staleTime: 1000 * 60 * 60,
	});

	const index = useMemo(() => {
		if (!layerQuery.data) return [];
		return buildIndex(layerQuery.data.features);
	}, [layerQuery.data]);

	const groupedResults = useMemo(() => {
		if (searchQuery.length < 2)
			return [] as { type: ResultType; items: SearchResult[] }[];
		const q = normalizeText(searchQuery);
		const filtered = index.filter(
			(item) =>
				normalizeText(item.label).includes(q) ||
				item.id.includes(searchQuery),
		);
		const byType = new Map<ResultType, SearchResult[]>();
		for (const item of filtered) {
			const bucket = byType.get(item.type) ?? [];
			bucket.push(item);
			byType.set(item.type, bucket);
		}
		return TYPE_ORDER.filter((type) => byType.has(type)).map((type) => ({
			type,
			items: (byType.get(type) ?? []).slice(0, 25),
		}));
	}, [searchQuery, index]);

	const isLoading = layerQuery.isLoading;
	const hasAnyResult = groupedResults.some((g) => g.items.length > 0);

	const handleSelectLocation = (item: SearchResult) => {
		setSearchOpen(false);
		setSearchQuery('');
		fitMapToBbox(mapRef, item.bbox, { padding: 60, duration: 1500 });
	};

	return (
		<div className="pointer-events-auto w-full min-w-0">
			<Popover open={searchOpen} onOpenChange={setSearchOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="default"
						role="combobox"
						aria-expanded={searchOpen}
						className="h-9 w-full justify-start rounded-full border-border bg-card text-muted-foreground shadow-[0_10px_24px_rgba(26,48,20,0.18)] font-normal hover:bg-card/90"
					>
						<Search size={18} className="mr-2" />
						<span className="truncate">
							Localizar estado, município ou região
							metropolitana...
						</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className="w-(--radix-popover-trigger-width) rounded-[1.5rem] border border-border/70 p-0 shadow-[0_20px_50px_rgba(77,53,25,0.14)]"
					align="start"
				>
					<Command shouldFilter={false}>
						<CommandInput
							placeholder="Ex: Recife, Bahia, RM de Curitiba..."
							value={searchQuery}
							onValueChange={setSearchQuery}
						/>
						<CommandList>
							<CommandEmpty>
								{isLoading
									? 'Carregando base de localidades...'
									: searchQuery.length < 2
										? 'Digite pelo menos 2 caracteres.'
										: 'Nenhum resultado encontrado.'}
							</CommandEmpty>

							{hasAnyResult &&
								groupedResults.map((group) => (
									<CommandGroup
										key={group.type}
										heading={TYPE_GROUP_LABEL[group.type]}
									>
										{group.items.map((result) => (
											<CommandItem
												key={result.id}
												value={result.id}
												onSelect={() =>
													handleSelectLocation(result)
												}
												className="cursor-pointer gap-3 py-3"
											>
												{iconFor(result.type)}
												<div className="flex flex-col overflow-hidden">
													<span className="truncate font-medium">
														{result.label}
													</span>
													<span className="text-xs text-muted-foreground truncate">
														{result.sublabel}
													</span>
												</div>
											</CommandItem>
										))}
									</CommandGroup>
								))}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}

export default SearchBar;
