import React, { createContext, useEffect, useContext, useMemo } from 'react'
import { IntlProvider as ReactIntlProvider } from 'react-intl'
import { messages, getLocaleFromUrl, Locale, getTimeLocale } from './locales'

interface IntlContextValue {
  locale: Locale
  timeLocale: string
}

const IntlContext = createContext<IntlContextValue>({
  locale: 'zh-CN',
  timeLocale: 'zh-CN',
})

export const useLocale = () => useContext(IntlContext)

interface IntlProviderProps {
  children: React.ReactNode
}

export function IntlProvider({ children }: IntlProviderProps) {
  const locale = useMemo(() => getLocaleFromUrl(), [])
  const timeLocale = useMemo(() => getTimeLocale(locale), [locale])

  const contextValue = useMemo(
    () => ({
      locale,
      timeLocale,
    }),
    [locale, timeLocale]
  )

  useEffect(() => {
    // 根据语言设置 html lang 属性，用于 CSS :lang() 选择器
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  return (
    <IntlContext.Provider value={contextValue}>
      <ReactIntlProvider
        locale={locale}
        messages={messages[locale]}
        defaultLocale="zh-CN"
      >
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  )
}
