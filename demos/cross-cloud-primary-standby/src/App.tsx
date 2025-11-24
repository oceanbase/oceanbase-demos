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
  const cardRef = useRef<HTMLDivElement>(null);
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

  // 动态计算并设置缩放比例
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.offsetWidth;
        const baseWidth = 940;

        // 如果容器宽度为0，延迟重试
        if (containerWidth === 0) {
          requestAnimationFrame(updateScale);
          return;
        }

        const scale =
          containerWidth >= baseWidth ? 1 : containerWidth / baseWidth;
        container.style.setProperty("--scale", scale.toString());
      }
    };

    // 使用 requestAnimationFrame 确保 DOM 已渲染
    requestAnimationFrame(() => {
      updateScale();
    });

    // 监听窗口大小变化
    window.addEventListener("resize", updateScale);

    // 使用 ResizeObserver 监听容器大小变化（更准确）
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateScale);
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", updateScale);
      resizeObserver.disconnect();
    };
  }, [activeTab]); // 当切换tab时重新计算

  // 整体缩放：当容器高度超过 110vh 时自动缩放
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const updateScale = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (cardRef.current) {
          // 临时移除 transform 来获取原始高度
          const currentTransform = cardRef.current.style.transform;
          cardRef.current.style.transform = "none";

          // 获取容器的原始高度（不受 transform 影响）
          const containerHeight = cardRef.current.scrollHeight;
          const maxHeight = window.innerHeight * 1.1; // 110vh

          // 恢复 transform
          cardRef.current.style.transform = currentTransform;

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

    // 初始计算，延迟执行确保 DOM 已渲染
    const initialTimeout = setTimeout(() => {
      updateScale();
    }, 300);

    // 监听窗口大小变化
    window.addEventListener("resize", updateScale);

    // 使用 MutationObserver 监听内容变化
    const mutationObserver = new MutationObserver(() => {
      setTimeout(() => {
        updateScale();
      }, 100);
    });

    if (cardRef.current) {
      mutationObserver.observe(cardRef.current, {
        childList: true,
        subtree: true,
        attributes: false,
        characterData: false,
      });
    }

    return () => {
      clearTimeout(initialTimeout);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", updateScale);
      mutationObserver.disconnect();
    };
  }, [activeTab]);

  return (
    <>
      <div className="min-h-screen bg-[#fafafa] flex items-start justify-center p-4 sm:p-6 overflow-hidden">
        <div
          ref={cardRef}
          className="w-full max-w-[940px] origin-top"
          style={{
            position: "relative",
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            maxHeight: "110vh",
          }}
        >
          <div
            ref={containerRef}
            className="w-full"
            style={{ position: "relative" }}
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
                  className={`pb-[12px] transition-all relative cursor-pointer ${
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
                  className={`pb-[12px] transition-all relative cursor-pointer ${
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
        </div>

        <style>{`
        /* 确保所有使用 scale-[var(--scale)] 的元素都能正确应用 */
        [class*="scale-\\[var\\(--scale\\)\\]"] {
          transform-origin: top left;
        }
        
        /* 默认缩放值为1，由JavaScript动态更新 */
        .w-full.max-w-\\[940px\\] {
          --scale: 1;
        }
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
