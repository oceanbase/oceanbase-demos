import { useState, useEffect, useRef } from "react";
import { FormattedMessage } from "react-intl";
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
                  <FormattedMessage id="tab.primaryBackup" />
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
                  <FormattedMessage id="tab.disasterRecovery" />
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

        /* ========== 英文版本样式优化 ========== */
        
        /* 英文版本适度缩小字体 - 让布局更舒适 */
        html[lang="en-US"] {
          --font-scale: 0.97;
        }

        /* 英文版本 SVG 内容区域的所有文本元素 */
        html[lang="en-US"] .en-scale-container * {
          font-size: calc(1em * var(--font-scale, 1)) !important;
        }

        /* 防止切换 tab 时闪烁 */
        .i18n-loading {
          opacity: 0;
        }
        .i18n-ready {
          opacity: 1;
          transition: opacity 0.15s ease-in;
        }

        /* ========== 修复英文版本布局问题 ========== */
        
        /* 修复提示框文本换行 - 允许文本自动换行，防止超出边界 */
        html[lang="en-US"] [data-name="alert"] {
          max-width: 230px !important;
          width: auto !important;
          white-space: normal !important;
          padding: 6px 8px !important;
          height: auto !important;
          min-height: 22px !important;
        }

        /* 提示框内的文本允许换行 */
        html[lang="en-US"] [data-name="alert"] p {
          white-space: normal !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          line-height: 18px !important;
        }

        /* 提示框内的 flex 容器也要允许换行 */
        html[lang="en-US"] [data-name="alert"] > div:last-child {
          white-space: normal !important;
        }

        html[lang="en-US"] [data-name="alert"] {
          margin-left: -40px !important;  // 向左移动 40px
        }

        /* 调整"释放实例"按钮位置 - 向左移动 20px */
        html[lang="en-US"] [data-button-id="region-failure-release-button"] {
          margin-left: -40px !important;
        }

        /* 调整杭州备份实例组位置 - 向左移动 20px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group"] {
          margin-left: -20px !important;
        }

        /* 调整上海备实例标签位置 - 向左移动 10px */
        html[lang="en-US"] [data-element-id="shanghai-backup-label"] {
          margin-left: -10px !important;
        }

        /* 调整"释放实例"按钮位置（恢复状态） - 向左移动 10px */
        html[lang="en-US"] [data-button-id="region-recovery-create-button"] {
          margin-left: -10px !important;
        }

        /* 调整上海主实例组位置 - 向左移动 20px */
        html[lang="en-US"] [data-element-id="shanghai-primary-group"] {
          margin-left: -20px !important;
        }

        /* 调整杭州备份实例组位置（state6）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-state6"] {
          margin-left: -20px !important;
        }

        /* 调整杭州备份实例组位置（switching）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-switching"] {
          margin-left: -20px !important;
        }

        /* 调整"释放实例"按钮位置（afterCreating状态）- 向左移动 20px */
        html[lang="en-US"] [data-button-id="vendor-state3-alt-button1"] {
          margin-left: -20px !important;
        }

        /* 调整上海主实例组位置（afterReleasing状态）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="shanghai-primary-group-after-releasing"] {
          margin-left: -20px !important;
        }

        /* 调整上海主实例组位置（afterCreating状态）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="shanghai-primary-group-after-creating"] {
          margin-left: -20px !important;
        }

        /* 调整杭州备份实例组位置（afterCreating状态）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-after-creating"] {
          margin-left: -20px !important;
        }

        /* 调整箭头位置以对齐杭州备份实例 - 向左移动 20px */
        html[lang="en-US"] [data-element-id="arrow-to-hangzhou-backup"] {
          margin-top: -70px !important;
        }

        /* 调整杭州备份实例组位置（afterReleasing状态）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-after-releasing"] {
          margin-left: -20px !important;
        }

        /* 调整上海备份实例组位置（recovered状态）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="shanghai-backup-group-recovered"] {
          margin-left: -20px !important;
        }

        /* 调整箭头位置以对齐上海主实例（afterCreating状态）- 向上移动 80px */
        html[lang="en-US"] [data-element-id="arrow-to-shanghai-primary"] {
          margin-top: -25px !important;
          margin-left: -2px !important;
        }

        /* 英文版本：调整云服务商 A 故障提示框位置 - 向右移动 30px */
        html[lang="en-US"] [data-element-id="cloud-vendor-a-failure-alert"] {
 
          margin-left: 45px !important;
          margin-top: -5px !important;
        }

        /* 英文版本：调整上海主实例组位置（vendor-state1）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="shanghai-primary-group-vendor-state1"] {
          margin-left: -15px !important;
        }

        /* 英文版本：调整云服务商 A 恢复正常提示框位置 - 向右移动 45px 向上移动 5px */
        html[lang="en-US"] [data-element-id="cloud-vendor-a-recovered-alert"] {
          margin-left: 45px !important;
          margin-top: -5px !important;
        }

        /* 英文版本：调整云服务商 A 恢复正常提示框位置（state6）- 向右移动 45px 向上移动 5px */
        html[lang="en-US"] [data-element-id="cloud-vendor-a-recovered-alert-state6"] {
          margin-left: 45px !important;
          margin-top: -5px !important;
        }

        /* 调整"创建跨云主备库"按钮位置（state6）- 向左移动 20px */
        html[lang="en-US"] [data-button-id="vendor-state6-button1"] {
          margin-left: -20px !important;
        }

        /* 英文版本：调整杭州备份实例组位置（state6-main）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-state6-main"] {
          margin-left: -15px !important;
        }

        /* 英文版本：调整云服务商 A 出现故障提示框位置（state2）- 向右移动 45px 向上移动 5px */
        html[lang="en-US"] [data-element-id="cloud-vendor-a-failure-alert-state2"] {
          margin-left: 45px !important;
          margin-top: -5px !important;
        }

        /* 英文版本：调整杭州备份实例组位置（state3）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-state3"] {
          margin-left: -15px !important;
        }

        /* 英文版本：调整"创建跨云主备库"按钮位置（state3）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="vendor-state3-create-button"] {
          margin-left: -20px !important;
        }

        /* 英文版本：调整"释放实例"按钮最大宽度（state4）- 230px */
        html[lang="en-US"] [data-button-id="vendor-state4-button1"],
        html[lang="en-US"] [data-button-id="vendor-state4-button2"] {
          max-width: 230px !important;
        }

        html[lang="zh-CN"] [data-button-id="vendor-state4-button1"],
        html[lang="zh-CN"] [data-button-id="vendor-state4-button2"] {
          max-width: 80px !important;
        }

        /* 英文版本：调整上海主实例组位置（state5）- 向左移动 20px */
        html[lang="en-US"] [data-element-id="shanghai-primary-group-state5"] {
          margin-left: -20px !important;
        }

        /* 英文版本：调整杭州备份实例组位置（state5）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-state5"] {
          margin-left: -15px !important;
        }

        /* 英文版本：调整杭州备份实例组位置（state2）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-state2"] {
          margin-left: -15px !important;
        }

        /* 英文版本：调整杭州备份实例组位置（state4）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-state4"] {
          margin-left: -15px !important;
        }

        /* 英文版本：调整"释放实例"按钮位置（state4）- 向左移动 15px */
        html[lang="en-US"] [data-button-id="vendor-state4-button1"] {
          margin-left: -15px !important;
        }

        /* 英文版本：调整杭州备份实例组（含按钮）位置（state4）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-with-button-state4"] {
          margin-top: 20px !important;
          margin-left: -25px !important;
        }

        /* 英文版本：调整上海主实例组（含按钮）位置（state4）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="shanghai-primary-with-button-state4"] {
          margin-top: 20px !important;
          margin-left: -10px !important;
        }

        /* 英文版本：调整杭州备份实例组位置（initial）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="hangzhou-backup-group-initial"] {
          
          margin-left: -15px !important;
        }

        /* 英文版本：调整上海备份实例组位置（state4）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="shanghai-backup-group-state4"] {
          margin-left: -10px !important;
        }

        /* 英文版本：调整上海主实例组位置（state4-main）- 向左移动 15px */
        html[lang="en-US"] [data-element-id="shanghai-primary-group-state4-main"] {
          margin-left: -20px !important;
        }
      `}</style>
      </div>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
