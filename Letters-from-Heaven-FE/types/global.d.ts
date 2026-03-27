/// <reference types="@tarojs/taro" />

declare module '*.png';
declare module '*.gif';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';
declare module '*.styl';

declare namespace NodeJS {
  interface ProcessEnv {
    /** NODE 内置环境变量, 会影响到最终构建生成产物 */
    NODE_ENV: 'development' | 'production',
    /** 当前构建的平台 */
    TARO_ENV: 'weapp' | 'swan' | 'alipay' | 'h5' | 'rn' | 'tt' | 'qq' | 'jd' | 'harmony' | 'jdrn'
    /**
     * 当前构建的小程序 appid
     * @description 若不同环境有不同的小程序，可通过在 env 文件中配置环境变量`TARO_APP_ID`来方便快速切换 appid， 而不必手动去修改 dist/project.config.json 文件
     * @see https://taro-docs.jd.com/docs/next/env-mode-config#特殊环境变量-taro_app_id
     */
    TARO_APP_ID: string
    TARO_APP_API_BASE_URL?: string
    TARO_APP_CLOUD_ENV?: string
    TARO_APP_CLOUD_SERVICE?: string
    TARO_APP_LOCAL_USER_ID?: string
    TARO_APP_AI_MODEL_GROUP?: string
    TARO_APP_AI_MODEL?: string
    TARO_APP_AI_IMAGE_FUNCTION?: string
  }
}

declare const __API_BASE_URL__: string
declare const __CLOUD_ENV__: string
declare const __CLOUD_SERVICE__: string
declare const __LOCAL_USER_ID__: string
declare const __AI_MODEL_GROUP__: string
declare const __AI_MODEL__: string
declare const __AI_IMAGE_FUNCTION__: string
