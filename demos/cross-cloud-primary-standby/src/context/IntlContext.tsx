import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react'
import { IntlProvider as ReactIntlProvider } from 'react-intl'
import { messages, defaultLocale, Locale } from '../locales'

interface IntlContextType {
  locale: Locale
}

const IntlContext = createContext<IntlContextType | undefined>(undefined)

interface IntlProviderProps {
  children: ReactNode
}

// 从 URL 参数获取语言设置
function getLocaleFromURL(): Locale {
  const urlParams = new URLSearchParams(window.location.search)
  const langParam = urlParams.get('language')

  if (langParam === 'en-US') {
    return 'en-US'
  }
  if (langParam === 'zh-CN') {
    return 'zh-CN'
  }

  // 默认使用中文
  return defaultLocale
}

export function IntlProvider({ children }: IntlProviderProps) {
  const [locale, setLocale] = useState<Locale>(getLocaleFromURL)

  // 监听 URL 变化（支持浏览器前进后退）
  useEffect(() => {
    const handlePopState = () => {
      setLocale(getLocaleFromURL())
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    // 根据语言设置 html lang 属性，用于 CSS :lang() 选择器
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  return (
    <IntlContext.Provider value={{ locale }}>
      <ReactIntlProvider
        locale={locale}
        messages={messages[locale]}
        defaultLocale={defaultLocale}
      >
        {children}
      </ReactIntlProvider>
    </IntlContext.Provider>
  )
}

export function useIntl() {
  const context = useContext(IntlContext)
  if (!context) {
    throw new Error('useIntl must be used within an IntlProvider')
  }
  return context
}
