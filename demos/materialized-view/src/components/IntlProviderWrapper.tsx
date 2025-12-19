"use client";

import { ReactNode, useMemo, useEffect } from "react";
import { IntlProvider } from "react-intl";
import { useSearchParams } from "next/navigation";
import zhCN from "@/locales/zh-CN.json";
import enUS from "@/locales/en-US.json";

interface IntlProviderWrapperProps {
  children: ReactNode;
}

// 将嵌套的消息对象扁平化为 react-intl 需要的格式
// 例如: { sql: { execute: "执行" } } => { "sql.execute": "执行" }
function flattenMessages(
  nestedMessages: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  return Object.keys(nestedMessages).reduce(
    (messages: Record<string, string>, key) => {
      const value = nestedMessages[key];
      const prefixedKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        messages[prefixedKey] = value;
      } else if (typeof value === "object" && value !== null) {
        Object.assign(
          messages,
          flattenMessages(value as Record<string, unknown>, prefixedKey)
        );
      }

      return messages;
    },
    {}
  );
}

const messages: Record<string, Record<string, string>> = {
  "zh-CN": flattenMessages(zhCN),
  "en-US": flattenMessages(enUS),
};

export default function IntlProviderWrapper({
  children,
}: IntlProviderWrapperProps) {
  const searchParams = useSearchParams();

  // 从 URL searchParams 中获取 language 参数，默认为 zh-CN
  const locale = useMemo(() => {
    const lang = searchParams.get("language");
    return lang === "en-US" || lang === "zh-CN" ? lang : "zh-CN";
  }, [searchParams]);

  useEffect(() => {
    // 根据语言设置 html lang 属性，用于 CSS :lang() 选择器
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const currentMessages = messages[locale];

  return (
    <IntlProvider locale={locale} messages={currentMessages}>
      {children}
    </IntlProvider>
  );
}
