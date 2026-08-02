type BackendApiUnavailableProps = {
  frame?: "page" | "panel";
  surface: "Admin" | "Storefront" | "SHRESTA";
};

export function BackendApiUnavailable({ frame = "page", surface }: BackendApiUnavailableProps) {
  const className = frame === "page"
    ? "flex min-h-screen items-center justify-center bg-[var(--wine-950)] px-4 text-[var(--shresta-text-primary)]"
    : "flex min-h-[70vh] items-center justify-center px-4 text-[var(--shresta-text-primary)]";
  const copy = unavailableCopy(surface);

  return (
    <div className={className}>
      <section className="max-w-xl rounded-lg border border-[var(--wine-800)] bg-[var(--wine-900)] p-8 text-center shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-400)]">SHRESTA EXCLUSIVE</p>
        <h1 className="mt-4 font-serif text-4xl font-light text-white">{copy.title}</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--shresta-text-secondary)]">
          {copy.description}
        </p>
      </section>
    </div>
  );
}

function unavailableCopy(surface: BackendApiUnavailableProps["surface"]): { title: string; description: string } {
  if (surface === "Admin") {
    return {
      title: "Admin tools are not reachable",
      description: "We could not load the SHRESTA operations tools right now. Refresh in a moment or check the service connection."
    };
  }
  if (surface === "Storefront") {
    return {
      title: "We could not load SHRESTA right now",
      description: "Please refresh in a moment. Your shopping experience should be back shortly."
    };
  }
  return {
    title: "SHRESTA is not reachable right now",
    description: "Please refresh in a moment or try again shortly."
  };
}
