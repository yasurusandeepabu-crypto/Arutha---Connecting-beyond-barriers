import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { navy: '#080f1e', card: '#151e2f', steel: '#7696b4', accent: '#a5bfdf' }, maxWidth: { site: '1200px' } } }, plugins: [] };
export default config;
