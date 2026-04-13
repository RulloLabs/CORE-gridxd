import { 
  Clock, 
  Maximize2, 
  Sparkles, 
  Rocket, 
  Palette, 
  Zap, 
  FileStack, 
  Code2
} from "lucide-react";

const testimonials = [
  {
    name: "Carlos M.",
    role: "Lead Designer · Fintech Startup",
    avatar: "CM",
    quote:
      "Procesé un sheet de 48 iconos en 12 segundos. Lo que antes me llevaba 2h de Figma ahora es un clic. Impresionante.",
    rating: 5,
    badge: "Pro",
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-500/20",
  },
  {
    name: "Laura T.",
    role: "Product Manager · SaaS B2B",
    avatar: "LT",
    quote:
      "Finalmente puedo darle a mi equipo los assets en SVG y PNG HD sin depender de fecha de entrega del diseñador. El output es limpio y profesional.",
    rating: 5,
    badge: "Pro+",
    color: "from-cyan-500/20 to-blue-500/20",
    border: "border-cyan-500/20",
  },
  {
    name: "Alex R.",
    role: "Freelance UI Engineer",
    avatar: "AR",
    quote:
      "El renombrado automático GRIDXD_PROJ_XX_2K es un game-changer. Mis clientes reciben todo organizado sin que yo toque nada.",
    rating: 5,
    badge: "Pro",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/20",
  },
];

const useCases = [
  {
    icon: <Palette className="w-8 h-8 text-primary" />,
    title: "Design Systems",
    description:
      "Extrae iconos de capturas de pantalla de productos y convierte tu inspiración en activos listos para producción.",
  },
  {
    icon: <Zap className="w-8 h-8 text-primary" />,
    title: "Sprints de Producto",
    description:
      "Importa iconos de cualquier fuente durante un sprint sin perder tiempo en recortes manuales.",
  },
  {
    icon: <FileStack className="w-8 h-8 text-primary" />,
    title: "Migración de Assets",
    description:
      "Convierte bibliotecas de iconos antiguas a SVG vectorial con un solo upload.",
  },
  {
    icon: <Code2 className="w-8 h-8 text-primary" />,
    title: "Handoff a Desarrollo",
    description:
      "Genera ZIPs con nombres estandarizados listos para consumir por cualquier equipo de ingeniería.",
  },
];

const StarRating = ({ count }: { count: number }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: count }).map((_, i) => (
      <svg key={i} className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

const SocialProofSection = () => {
  return (
    <section id="social-proof" className="py-24 px-4 relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
            Casos de Uso Reales
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Diseñadores que recuperan{" "}
            <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              horas cada semana
            </span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            GridXD está siendo usado por equipos de producto, freelancers y
            agencias que necesitan velocidad sin sacrificar calidad.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className={`relative rounded-2xl border ${t.border} bg-gradient-to-br ${t.color} backdrop-blur-sm p-6 flex flex-col gap-4 hover:scale-[1.02] transition-transform duration-300`}
            >
              <div className="flex items-center justify-between">
                <StarRating count={t.rating} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {t.badge}
                </span>
              </div>
              <p className="text-foreground/90 text-sm leading-relaxed flex-1">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/40 to-cyan-400/40 flex items-center justify-center text-xs font-bold text-foreground">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stat bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {[
            { value: "2h", label: "Ahorradas por imagen", icon: <Clock className="w-6 h-6 text-primary" /> },
            { value: "48px→2K", label: "Resolución garantizada", icon: <Maximize2 className="w-6 h-6 text-primary" /> },
            { value: "SVG", label: "Vector listo para producción", icon: <Sparkles className="w-6 h-6 text-primary" /> },
            { value: "< 30s", label: "Tiempo de proceso", icon: <Rocket className="w-6 h-6 text-primary" /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-card p-5 text-center hover:border-primary/30 transition-colors flex flex-col items-center justify-center gap-2"
            >
              <div className="mb-1">{stat.icon}</div>
              <p className="text-2xl font-black text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Use Cases Grid */}
        <div className="text-center mb-10">
          <h3 className="text-2xl font-bold text-foreground mb-2">¿Para quién es GridXD?</h3>
          <p className="text-muted-foreground text-sm">
            Desde freelancers hasta equipos de 50 personas.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="rounded-xl border border-border/50 bg-card/50 p-5 hover:bg-card hover:border-primary/20 transition-all duration-300 group"
            >
              <div className="mb-3">{uc.icon}</div>
              <h4 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {uc.title}
              </h4>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
