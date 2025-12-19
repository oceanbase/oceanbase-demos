import zhCN from './zh-CN.json';
import enUS from './en-US.json';

export type Locale = 'zh-CN' | 'en-US';

export const messages: Record<Locale, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export const defaultLocale: Locale = 'zh-CN';

/**
 * 从 URL searchParams 获取语言设置
 * 支持 ?language=zh-CN 或 ?language=en-US
 */
export function getLocaleFromUrl(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }
  
  const searchParams = new URLSearchParams(window.location.search);
  const language = searchParams.get('language');
  
  if (language === 'en-US' || language === 'zh-CN') {
    return language;
  }
  
  return defaultLocale;
}

/**
 * 获取时间格式的 locale 字符串
 */
export function getTimeLocale(locale: Locale): string {
  return locale === 'zh-CN' ? 'zh-CN' : 'en-US';
}

