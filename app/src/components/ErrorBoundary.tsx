import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Captura erros de renderizacao em qualquer ponto da arvore e exibe um
// fallback amigavel em vez de uma tela branca. Substituir o console.error por
// um servico de observabilidade (Sentry etc.) quando houver.
class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('ErrorBoundary capturou um erro:', error, info);
	}

	handleReload = () => {
		window.location.assign('/');
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
					<h1 className="font-display text-3xl font-bold uppercase tracking-[0.01em] text-foreground">
						Algo deu errado
					</h1>
					<p className="max-w-md text-foreground">
						Ocorreu um erro inesperado. Tente recarregar a página.
					</p>
					<button
						type="button"
						onClick={this.handleReload}
						className="mt-2 h-11 rounded-none bg-primary px-6 font-display font-medium text-primary-foreground hover:bg-primary/90"
					>
						Recarregar
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
