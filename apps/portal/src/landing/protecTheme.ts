/**
 * Tema Protec – classes scoped para a landing Protec.
 * NÃO altera tailwind.config.js nem index.css – uso apenas nos componentes *Protec.
 *
 * Cores: teal/verde escuro + bege (protec.cnt.br)
 */
export const PROTEC = {
  primary: '#1a4d3d',
  primaryDark: '#0f3428',
  primaryLight: '#2a5d4a',
  accent: '#e8dfd0',
  accentHover: '#d4c9b8',
} as const;

/** Classes Tailwind com cores Protec (arbitrary values) */
export const protecClasses = {
  bgPrimary: 'bg-[#1a4d3d]',
  bgPrimaryDark: 'bg-[#0f3428]',
  bgPrimaryHover: 'hover:bg-[#0f3428]',
  textPrimary: 'text-[#1a4d3d]',
  textPrimaryHover: 'hover:text-[#1a4d3d]',
  borderPrimary: 'border-[#1a4d3d]',
  bgPrimary10: 'bg-[#1a4d3d]/10',
  bgPrimary20: 'bg-[#1a4d3d]/20',
  fromPrimary: 'from-[#1a4d3d]',
  toPrimaryDark: 'to-[#0f3428]',
  /** Bege para CTAs principais (tema escuro) */
  bgAccent: 'bg-[#e8dfd0]',
  bgAccentHover: 'hover:bg-[#d4c9b8]',
  textAccent: 'text-[#1a4d3d]',
  /** Tema escuro */
  bgDark: 'bg-[#1a4d3d]',
  bgDarkDarker: 'bg-[#0f3428]',
  textLight: 'text-white',
  textLightMuted: 'text-slate-300',
  borderLight: 'border-white/20',
} as const;
