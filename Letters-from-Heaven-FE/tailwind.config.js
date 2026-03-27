/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx,html}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        linen: '#F4EFE6',
        parchment: '#FBF7EF',
        'parchment-strong': '#FFFDF8',
        charcoal: '#352F2A',
        driftwood: '#756A5D',
        fog: '#B5AB9C',
        ink: '#211B18',
        'linen-edge': '#DED4C7',
        stone: '#7C6854',
        'stone-deep': '#5F4F41',
        'stone-light': '#A69481',
        amber: '#C8A26B',
        'amber-soft': '#E5D0AF',
        sage: '#7F9B8E',
        'sage-soft': '#D8E5DF',
        terracotta: '#B56C59',
        'terracotta-soft': '#F3DDD5',
        'warm-glow': '#E9D8BF',
        'distant-blue': '#C9D4DD',
        'cloud-shadow': '#EAE4DA',
      },
      boxShadow: {
        card: '0 10px 28px rgba(86, 68, 49, 0.08)',
        panel: '0 18px 48px rgba(86, 68, 49, 0.12)',
        lifted: '0 24px 60px rgba(86, 68, 49, 0.16)',
      },
      borderRadius: {
        card: '24px',
        sheet: '32px',
        'pill': '9999px',
      },
      fontSize: {
        display: ['38px', { lineHeight: '1.18', letterSpacing: '-0.8px', fontWeight: '600' }],
        heading: ['22px', { lineHeight: '1.35', letterSpacing: '-0.3px', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.75', letterSpacing: '0.18px' }],
        caption: ['14px', { lineHeight: '1.65', letterSpacing: '0.08px' }],
        overline: ['12px', { lineHeight: '1.45', letterSpacing: '1px', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
