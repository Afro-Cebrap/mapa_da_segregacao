import { useState, type FormEvent } from 'react';

// Seção "Queremos te ouvir" / "Qual a sua dúvida?" — formulário de contato.
// O envio é placeholder (sem backend), no mesmo padrão do NewsletterForm.
export function SecaoContato() {
	const [enviado, setEnviado] = useState(false);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setEnviado(true);
	};

	const campoBox =
		'w-full bg-background p-2 [&_input]:w-full [&_input]:border-0 [&_input]:border-b [&_input]:border-foreground/30 [&_input]:bg-transparent [&_input]:px-1 [&_input]:py-1 [&_input]:font-display [&_input]:text-xl [&_input]:text-foreground [&_input]:placeholder:text-foreground/50 [&_input]:focus:border-primary [&_input]:focus:outline-none';

	return (
		<section
			id="contato"
			aria-labelledby="contato-titulo"
			className="max-w-[890px] scroll-mt-24"
		>
			{/* Título + texto (alinhados pela base, como no Figma) */}
			<div className="flex flex-col gap-8 md:flex-row md:items-end md:gap-24">
				<h2
					id="contato-titulo"
					className="font-display uppercase leading-[0.9] text-primary"
				>
					<span className="block text-5xl font-medium md:text-[65px]">
						Qual a sua
					</span>
					<span className="block text-5xl font-black md:ml-44 md:text-[65px]">
						Dúvida?
					</span>
				</h2>
				<p className="max-w-[405px] text-xl leading-[1.42] text-accent-foreground">
					Nos envie uma mensagem e responderemos assim que pudermos.
					Você receberá sua resposta pelo endereço{' '}
					<span className="font-bold">
						afrocebrap@mapadasegregacao.br
					</span>
				</p>
			</div>

			{/* Formulário: campos (esquerda) · textarea · botão.
			    A textarea estica (items-stretch) para ter a mesma altura da
			    coluna dos 3 campos somados; o botão fica colado na base. */}
			<form
				onSubmit={handleSubmit}
				className="mt-14 flex flex-col items-start gap-6 md:flex-row md:items-stretch"
			>
				<div className="flex w-[282px] max-w-full flex-col gap-4">
					<div className={campoBox}>
						<input
							type="text"
							placeholder="Nome"
							aria-label="Nome"
							required
						/>
					</div>
					<div className={campoBox}>
						<input
							type="email"
							placeholder="Email"
							aria-label="Email"
							required
						/>
					</div>
					<div className={campoBox}>
						<input
							type="text"
							placeholder="Instituição"
							aria-label="Instituição"
						/>
					</div>
				</div>

				<textarea
					placeholder="Digite aqui sua mensagem..."
					aria-label="Mensagem"
					className="min-h-[146px] w-full max-w-[484px] resize-none self-stretch bg-background p-4 font-display text-xl text-foreground placeholder:text-foreground/50 focus:outline-none md:w-[484px]"
				/>

				<button
					type="submit"
					className="self-end bg-primary p-3 font-display text-xl font-medium tracking-wide text-marca-verde-escuro transition-opacity hover:opacity-90"
				>
					Enviar
				</button>
			</form>

			{enviado && (
				<p className="mt-4 text-lg text-primary">
					Obrigado! Em breve entraremos em contato.
				</p>
			)}
		</section>
	);
}
