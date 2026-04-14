const HeroSection = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `linear-gradient(hsl(var(--cyan)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--cyan)) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan/5 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet/5 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <div className="mb-8 flex justify-center">
          <img
            src="/Grid Ne_n Sin Fondo.png"
            alt="GridXD"
            className="w-32 h-32 animate-float object-contain"
          />
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
          <span className="text-gradient-cyan">GridXD</span>
        </h1>

        <p className="text-xl md:text-2xl font-bold text-foreground mb-4">
          Inteligencia Invisible — Captura, Extrae, Crea
        </p>

        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
          Sube una imagen con iconos. Obtén cada uno separado, sin fondo, listo para usar.
          De captura a assets en 5 segundos.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onGetStarted}
            className="px-8 py-4 rounded-lg bg-primary text-primary-foreground font-bold text-lg transition-all hover:scale-105 glow-cyan"
          >
            Empezar gratis
          </button>
          <a
            href="#pricing"
            className="px-8 py-4 rounded-lg border border-border text-foreground font-semibold text-lg transition-all hover:border-primary/50 hover:bg-muted"
          >
            Ver planes
          </a>
        </div>

        <p className="text-muted-foreground text-sm mt-6">
          3 imágenes/día gratis · Sin registro
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
