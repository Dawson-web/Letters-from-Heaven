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
        card: '0 1px 2px rgba(139, 126, 106, 0.06), 0 4px 16px rgba(139, 126, 106, 0.04)',
      },
      borderRadius: {
        'card': '16px',
        'pill': '9999px',
      },
      fontSize: {
        'display': ['32px', { lineHeight: '1.25', letterSpacing: '-0.5px', fontWeight: '600' }],
        'heading': ['18px', { lineHeight: '1.35', letterSpacing: '-0.3px', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '1.8', letterSpacing: '0.2px' }],
        'caption': ['13px', { lineHeight: '1.5', letterSpacing: '0.1px' }],
        'overline': ['11px', { lineHeight: '1.4', letterSpacing: '0.5px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
