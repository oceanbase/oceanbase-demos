"use client";

import { useEffect } from "react";

export default function IframeCommunicator() {
  useEffect(() => {
    // embedded iframe 和 parent window 之间的通信
    // parent window: https://www.oceanbase.com/demo/xxx
    window.parent.postMessage("iframe-response", "*");

    // 监听跨域请求的返回
    const handleMessage = (event: MessageEvent) => {
      console.log(event, event.data);
    };

    window.addEventListener("message", handleMessage, false);

    return () => {
      window.removeEventListener("message", handleMessage, false);
    };
  }, []);

  return null;
}
