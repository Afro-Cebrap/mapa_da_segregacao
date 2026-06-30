// Utilitários numéricos e de formatação (pt-BR) compartilhados pelo painel.

// Normaliza texto para busca: minúsculas e sem acentos.
export function normalizeText(value: string): string {
	return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function formatNumber(value: number | null | undefined): string {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return 'Sem dados';
	}

	return value.toLocaleString('pt-BR', {
		maximumFractionDigits: 6,
	});
}

export function formatPercent(value: number, casasDecimais = 2): string {
	// Tiles MVT ainda emitem inf/NaN em percent_amarela/indigena de setores
	// defeituosos (o saneamento do backend cobre so o caminho GeoJSON).
	if (!Number.isFinite(value)) {
		return 'Sem dados';
	}

	return (
		(value * 100).toLocaleString('pt-BR', {
			minimumFractionDigits: casasDecimais,
			maximumFractionDigits: casasDecimais,
		}) + '%'
	);
}

// Métricas decimais pequenas (índices de segregação) com precisão adaptativa.
export function formatDecimalMetric(value: number): string {
	const absoluteValue = Math.abs(value);

	if (absoluteValue === 0) {
		return '0';
	}

	if (absoluteValue < 0.000001) {
		return value.toLocaleString('pt-BR', {
			minimumFractionDigits: 8,
			maximumFractionDigits: 8,
		});
	}

	if (absoluteValue < 0.001) {
		return value.toLocaleString('pt-BR', {
			minimumFractionDigits: 6,
			maximumFractionDigits: 6,
		});
	}

	return value.toLocaleString('pt-BR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 6,
	});
}

// Versão curta para extremos de escalas (min/max do ranking).
export function formatCompact(value: number): string {
	const abs = Math.abs(value);
	if (abs === 0) return '0';
	if (abs < 0.001) {
		return value.toLocaleString('pt-BR', {
			minimumFractionDigits: 4,
			maximumFractionDigits: 4,
		});
	}
	return value.toLocaleString('pt-BR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 3,
	});
}

// Formata o valor de uma métrica usando o formatador da configuração, se houver.
export function formatMetricValue(
	value: unknown,
	format?: (value: number) => string,
): string {
	if (typeof value !== 'number' || !Number.isFinite(value))
		return 'Sem dados';
	if (format) return format(value);
	return value.toLocaleString('pt-BR', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 6,
	});
}

// Percentual saneado para uso em barras/gráficos (nunca negativo ou NaN).
export function asPercent(value: number | null): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
		return 0;
	}

	return value;
}

// Posição relativa de um valor dentro do intervalo [min, max], em [0, 1].
export function ratio(
	value: number,
	stats: { min: number; max: number },
): number {
	if (stats.max === stats.min) return 0.5;
	return Math.max(
		0,
		Math.min(1, (value - stats.min) / (stats.max - stats.min)),
	);
}
