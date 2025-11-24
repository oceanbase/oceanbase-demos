import { useState, useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import PrimaryBackupSwitch from "./components/PrimaryBackupSwitch";
import DisasterRecovery from "./components/DisasterRecovery";

type TabType = "primary-backup" | "disaster";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("primary-backup");
  const [primaryBackupResetTrigger] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // embedded iframe 和 parent window 之间的通信
  // parent window: https://www.oceanbase.com/demo/xxx
  useEffect(() => {
    window.parent.postMessage("iframe-response", "*");
    // 监听跨域请求的返回
    window.addEventListener(
      "message",
      (event) => {
        console.log(event, event.data);
      },
      false
    );
    return () => {
      window.removeEventListener(
        "message",
        (event) => {
          console.log(event, event.data);
        },
        false
      );
    };
  }, []);

  // 整体缩放：计算并应用整个卡片容器的缩放
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const updateScale = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (containerRef.current) {
          const container = containerRef.current;
          // 获取容器的实际高度（包括所有内容）
          const containerHeight = container.scrollHeight;
          const maxHeight = window.innerHeight;

          // 计算缩放比例
          let newScale = 1;
          if (containerHeight > maxHeight) {
            newScale = maxHeight / containerHeight;
          }

          // 只在缩放比例变化超过阈值时才更新，避免抖动
          setScale((prevScale) => {
            const diff = Math.abs(prevScale - newScale);
            if (diff > 0.001) {
              return newScale;
            }
            return prevScale;
          });
        }
      }, 50);
    };

    // 使用 requestAnimationFrame 确保 DOM 已渲染
    requestAnimationFrame(() => {
      updateScale();
    });

    // 监听窗口大小变化
    window.addEventListener("resize", updateScale);

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateScale);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", updateScale);
      resizeObserver.disconnect();
    };
  }, [activeTab]); // 当切换tab时重新计算

  return (
    <>
      <div className="min-h-screen bg-[#fafafa] flex items-start justify-center p-4 sm:p-6 overflow-hidden">
        <div
          ref={containerRef}
          className="w-full max-w-[940px] origin-top"
          style={{
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {/* Tab 切换区域 */}
          <div
            className="mb-6"
            style={{ position: "absolute", width: "100%", zIndex: 10 }}
          >
            <div
              className="flex gap-[32px] border-b border-[#e8e8e8]"
              style={{ paddingTop: 16, paddingLeft: 24 }}
            >
              <button
                onClick={() => setActiveTab("primary-backup")}
                className={`pb-[12px] transition-all relative ${
                  activeTab === "primary-backup"
                    ? "text-[#0958D9]"
                    : "text-[#8C8C8C] hover:text-[#595959]"
                }`}
              >
                主备切换
                {activeTab === "primary-backup" && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#0958D9]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab("disaster")}
                className={`pb-[12px] transition-all relative ${
                  activeTab === "disaster"
                    ? "text-[#0958D9]"
                    : "text-[#8C8C8C] hover:text-[#595959]"
                }`}
              >
                容灾切换
                {activeTab === "disaster" && (
                  <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#0958D9]" />
                )}
              </button>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="relative bg-white rounded-lg shadow-sm overflow-hidden">
            {activeTab === "primary-backup" && (
              <PrimaryBackupSwitch resetTrigger={primaryBackupResetTrigger} />
            )}
            {activeTab === "disaster" && <DisasterRecovery />}
          </div>
        </div>

        <style>{`
        [data-name="Group"] {
          margin-top: -8px;
          margin-bottom: 8px;
        }
        .cloud-failure-state1 [data-name="Group"] {
          margin-top: -2px;
          margin-bottom: 2px;
        }
      `}</style>
      </div>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
