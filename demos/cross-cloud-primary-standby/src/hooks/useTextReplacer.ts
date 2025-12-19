import { useEffect, useRef, useCallback } from 'react'
import { useIntl } from 'react-intl'

// 中文文案到翻译 key 的映射
const textToKeyMap: Record<string, string> = {
  // Tab 标签
  主备切换: 'tab.primaryBackup',
  容灾切换: 'tab.disasterRecovery',

  // 场景选择
  云服务商故障: 'scenario.cloudFailure',
  地域故障: 'scenario.regionFailure',

  // 按钮
  切换为主实例: 'button.switchToPrimary',
  创建跨云主备库: 'button.createCrossCloudBackup',
  释放实例: 'button.releaseInstance',

  // 实例
  上海主实例: 'instance.shanghaiPrimary',
  上海备实例: 'instance.shanghaiBackup',
  杭州主实例: 'instance.hangzhouPrimary',
  杭州备实例: 'instance.hangzhouBackup',

  // 应用
  上海主应用: 'app.shanghaiPrimary',
  上海备应用: 'app.shanghaiBackup',
  杭州备应用: 'app.hangzhouBackup',

  // VPC
  'VPC（主）': 'vpc.primary',
  'VPC（备 1）': 'vpc.backup1',
  'VPC（备 2）': 'vpc.backup2',
  ' VPC（备 2）': 'vpc.backup2',

  // 网络
  网络连接: 'network.connection',
  全局地址: 'network.globalAddress',

  // 云服务商
  '云服务商 A': 'cloud.vendorA',
  '云服务商 B': 'cloud.vendorB',

  // 架构层
  数据层: 'layer.data',
  连接层: 'layer.connection',
  应用层: 'layer.application',

  // 业务请求
  '业务读/写请求': 'request.readWrite',
  业务读请求: 'request.read',

  // 状态提示
  上海地域恢复正常: 'status.shanghaiRegionRecovered',
  上海地域出现故障: 'status.shanghaiRegionFailed',
  '云服务商 A 恢复正常': 'status.cloudVendorARecovered',
  '若用户点击【释放实例】，则该实例从画面消失': 'status.releaseInstanceHint',
  '停留2秒后上海地域恢复正常，变为页面3.3样式': 'status.autoRecoverHint',
  ' 出现故障': 'status.failed',
}

// 存储文本节点与其原始中文文案的对应关系
const nodeOriginalTextMap = new WeakMap<Text, string>()

// 创建所有语言版本的映射
function createAllTranslations(intl: ReturnType<typeof useIntl>) {
  const zhToKey: Record<string, string> = {}
  const keyToZh: Record<string, string> = {}
  const keyToTranslated: Record<string, string> = {}
  const translatedToKey: Record<string, string> = {}

  for (const [chineseText, key] of Object.entries(textToKeyMap)) {
    const translated = intl.formatMessage({ id: key })

    zhToKey[chineseText] = key
    keyToZh[key] = chineseText
    keyToTranslated[key] = translated
    translatedToKey[translated] = key
  }

  return { zhToKey, keyToZh, keyToTranslated, translatedToKey }
}

// 文本替换 Hook
export function useTextReplacer(
  containerRef: React.RefObject<HTMLElement | null>
) {
  const intl = useIntl()
  const observerRef = useRef<MutationObserver | null>(null)
  const lastLocaleRef = useRef<string>(intl.locale)
  const isInitializedRef = useRef(false)

  const replaceTexts = useCallback(() => {
    if (!containerRef.current) return

    const { zhToKey, keyToZh, keyToTranslated, translatedToKey } =
      createAllTranslations(intl)
    const isZhCN = intl.locale === 'zh-CN'

    // 获取所有文本节点
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    )

    const nodesToUpdate: { node: Text; newText: string }[] = []

    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      const currentText = node.textContent || ''

      if (!currentText.trim()) continue

      let newText = currentText
      let hasChange = false

      // 检查是否有保存的原始中文文案
      const savedOriginal = nodeOriginalTextMap.get(node)

      if (savedOriginal) {
        // 有保存的原始文案，根据当前语言决定显示什么
        const key = zhToKey[savedOriginal]
        if (key) {
          const targetText = isZhCN ? savedOriginal : keyToTranslated[key]
          if (currentText !== targetText) {
            newText = targetText
            hasChange = true
          }
        }
      } else {
        // 没有保存的原始文案，尝试识别当前文本
        // 先检查是否是中文
        for (const [chinese, key] of Object.entries(zhToKey)) {
          if (currentText.includes(chinese)) {
            // 保存原始中文
            nodeOriginalTextMap.set(node, chinese)
            if (!isZhCN) {
              const translated = keyToTranslated[key]
              if (translated && chinese !== translated) {
                newText = newText.replace(
                  new RegExp(escapeRegExp(chinese), 'g'),
                  translated
                )
                hasChange = true
              }
            }
          }
        }

        // 如果不是中文，检查是否是已翻译的英文
        if (!hasChange) {
          for (const [translated, key] of Object.entries(translatedToKey)) {
            if (
              currentText.includes(translated) &&
              translated !== keyToZh[key]
            ) {
              const chinese = keyToZh[key]
              // 保存原始中文（通过 key 反向查找）
              nodeOriginalTextMap.set(node, chinese)
              if (isZhCN) {
                newText = newText.replace(
                  new RegExp(escapeRegExp(translated), 'g'),
                  chinese
                )
                hasChange = true
              }
            }
          }
        }
      }

      if (hasChange && newText !== currentText) {
        nodesToUpdate.push({ node, newText })
      }
    }

    // 批量更新
    for (const { node, newText } of nodesToUpdate) {
      node.textContent = newText
    }

    // 替换完成后，标记为 ready
    if (containerRef.current) {
      containerRef.current.classList.remove('i18n-loading')
      containerRef.current.classList.add('i18n-ready')
      isInitializedRef.current = true
    }
  }, [containerRef, intl])

  // 监听语言变化时强制重新渲染
  useEffect(() => {
    if (lastLocaleRef.current !== intl.locale) {
      lastLocaleRef.current = intl.locale
      // 语言变化时，延迟执行替换以确保组件已更新
      requestAnimationFrame(() => {
        replaceTexts()
      })
    }
  }, [intl.locale, replaceTexts])

  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null
    let setupTimer: NodeJS.Timeout | null = null
    let currentContainer = containerRef.current

    const setupObserver = () => {
      if (!containerRef.current) return false

      // 清理旧的观察器
      if (observerRef.current) {
        observerRef.current.disconnect()
      }

      // 非中文模式下，先隐藏内容防止闪烁
      if (intl.locale !== 'zh-CN' && !isInitializedRef.current) {
        containerRef.current.classList.add('i18n-loading')
      }

      // 初始替换
      setupTimer = setTimeout(() => {
        replaceTexts()
      }, 10)

      // 监听 DOM 变化
      observerRef.current = new MutationObserver(() => {
        requestAnimationFrame(replaceTexts)
      })

      observerRef.current.observe(containerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      })

      currentContainer = containerRef.current
      return true
    }

    // 尝试立即设置
    if (!setupObserver()) {
      // 如果失败，定期检查直到成功
      checkInterval = setInterval(() => {
        if (setupObserver() && checkInterval) {
          clearInterval(checkInterval)
          checkInterval = null
        }
      }, 50)
    }

    // 定期检查 containerRef 是否变化
    const containerCheckInterval = setInterval(() => {
      if (containerRef.current && containerRef.current !== currentContainer) {
        console.log('Container changed, re-initializing observer')
        // 容器变化了，重新设置观察器
        isInitializedRef.current = false
        if (checkInterval) {
          clearInterval(checkInterval)
          checkInterval = null
        }
        setupObserver()
      }
    }, 100)

    return () => {
      if (checkInterval) clearInterval(checkInterval)
      if (setupTimer) clearTimeout(setupTimer)
      if (containerCheckInterval) clearInterval(containerCheckInterval)
      observerRef.current?.disconnect()
      isInitializedRef.current = false
    }
  }, [replaceTexts, intl.locale])
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 导出给外部使用
export function useTranslationMap() {
  const intl = useIntl()

  const translationMap: Record<string, string> = {}

  for (const [chineseText, key] of Object.entries(textToKeyMap)) {
    try {
      translationMap[chineseText] = intl.formatMessage({ id: key })
    } catch {
      translationMap[chineseText] = chineseText
    }
  }

  return translationMap
}

export const getChineseTexts = () => Object.keys(textToKeyMap)
