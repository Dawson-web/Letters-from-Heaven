import path from 'node:path'

import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import type { Plugin } from 'vite'
import tailwindcss from 'tailwindcss'
import { UnifiedViteWeappTailwindcssPlugin } from 'weapp-tailwindcss/vite'

import devConfig from './dev'
import prodConfig from './prod'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'vite'>(async (merge) => {
  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'yunduan-huixin',
    date: '2026-3-19',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [
      "@tarojs/plugin-generator"
    ],
    defineConstants: {
      __API_BASE_URL__: JSON.stringify(process.env.TARO_APP_API_BASE_URL || ''),
      __CLOUD_ENV__: JSON.stringify(process.env.TARO_APP_CLOUD_ENV || ''),
      __CLOUD_SERVICE__: JSON.stringify(process.env.TARO_APP_CLOUD_SERVICE || ''),
      __LOCAL_USER_ID__: JSON.stringify(process.env.TARO_APP_LOCAL_USER_ID || ''),
    },
    copy: {
      patterns: [
        {
          from: 'src/assets/lottie/',
          to: 'dist/assets/lottie/',
        },
      ],
      options: {
      }
    },
    alias: {
      '@': path.resolve(__dirname, '..', 'src')
    },
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: [
        {
          name: 'tailwindcss-config-loader',
          config(config) {
            if (typeof config.css?.postcss === 'object') {
              config.css.postcss.plugins = config.css.postcss.plugins ?? []
              config.css.postcss.plugins.unshift(tailwindcss() as any)
            }
          }
        } as Plugin,
        UnifiedViteWeappTailwindcssPlugin({
          rem2rpx: true
        })
      ]
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',

      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  }


  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
