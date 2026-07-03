import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';

function NewsletterForm() {
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSubmitted(true);
	};

	return (
		<div className="flex h-full min-h-48 flex-col justify-center bg-accent p-6 md:p-7">
			<h3 className="font-display text-3xl font-bold normal-case leading-9 text-primary">
				Assine a nossa newsletter
			</h3>
			<p className="mt-2 max-w-64 text-sm leading-5 text-accent-foreground">
				Fique informado sobre as pesquisas e atualizações da plataforma
			</p>
			<form
				onSubmit={handleSubmit}
				className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3"
			>
				<input
					type="text"
					placeholder="Nome"
					required
					aria-label="Nome"
					className="min-w-0 flex-1 border-0 border-b border-accent-foreground/40 bg-transparent px-1 py-1 text-sm text-accent-foreground placeholder:text-accent-foreground/60 focus:border-primary focus:outline-none"
				/>
				<input
					type="email"
					placeholder="Email"
					required
					aria-label="Email"
					className="min-w-0 flex-1 border-0 border-b border-accent-foreground/40 bg-transparent px-1 py-1 text-sm text-accent-foreground placeholder:text-accent-foreground/60 focus:border-primary focus:outline-none"
				/>
				<Button
					type="submit"
					className="mt-1 h-10 shrink-0 self-start rounded-none bg-primary px-5 font-display font-medium tracking-wide text-primary-foreground hover:bg-primary/90 sm:mt-0 sm:h-9 sm:self-auto"
				>
					Enviar
				</Button>
			</form>
			{submitted && (
				<p className="mt-3 text-xs text-primary-foreground">
					Obrigado! Em breve entraremos em contato.
				</p>
			)}
		</div>
	);
}

export default NewsletterForm;
