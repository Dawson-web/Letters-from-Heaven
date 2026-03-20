/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx,html}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        // 页面底色 — 未漂白的亚麻布
        linen: '#F6F4F0',
        // 信纸/卡片色
        parchment: '#FFFDF8',
        // 正文色层
        charcoal: '#3D3A36',
        driftwood: '#9B958D',
        fog: '#C7C2BA',
        // 分割线/描边
        'linen-edge': '#E8E4DD',
        // 行动引导
        stone: '#8B7E6A',
        'stone-deep': '#7A6E5B',
        'stone-light': '#A69C8B',
        // 等待/酝酿
        amber: '#C4A882',
        // 送达/可阅读
        sage: '#8FA89A',
        // 警告/边界提示
        terracotta: '#C2907E',
        // 装饰色
        'warm-glow': '#F0E6D3',
        'distant-blue': '#D5DAE0',
        'cloud-shadow': '#EAE7E2',
      },
      boxShadow: {
        card: '0 2px 3px rgba(139, 126, 106, 0.08), 0 10px 26px rgba(139, 126, 106, 0.08)',
      },
      borderRadius: {
        'card': '20px',
        'pill': '9999px',
      },
      fontSize: {
        'display': ['34px', { lineHeight: '1.25', letterSpacing: '-0.5px', fontWeight: '600' }],
        'heading': ['20px', { lineHeight: '1.4', letterSpacing: '-0.3px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.75', letterSpacing: '0.2px' }],
        'caption': ['14px', { lineHeight: '1.6', letterSpacing: '0.1px' }],
        'overline': ['12px', { lineHeight: '1.45', letterSpacing: '0.6px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
