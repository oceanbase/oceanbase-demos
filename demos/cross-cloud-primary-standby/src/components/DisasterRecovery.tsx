import { useState, useEffect, useRef } from "react";
import Group330 from "../imports/Group330";
import Group331 from "../imports/Group331";
import Group332 from "../imports/Group332";
import Group333 from "../imports/Group333";
import Group334 from "../imports/Group334";
import Group338 from "../imports/Group338";
import Group340 from "../imports/Group340";
import RegionFailure from "./RegionFailure";

type VendorFailureState =
  | "state1"
  | "state2"
  | "state3"
  | "state3-alt"
  | "state4"
  | "state5"
  | "state6";
type DisasterScenario = "cloud-failure" | "region-failure";

export default function DisasterRecovery() {
  const [scenario, setScenario] = useState<DisasterScenario>("cloud-failure");
  const [state, setState] = useState<VendorFailureState>("state1");
  const [resetTrigger, setResetTrigger] = useState(0);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 当进入state2时，2秒后自动切换到state3
  useEffect(() => {
    if (state === "state2") {
      const timer = setTimeout(() => {
        console.log(
          "容灾切换 - 云服务商 - Auto transitioning from state2 to state3 after 2 seconds"
        );
        setState("state3");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [state]);

  // 计算并应用自动缩放
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const updateScale = () => {
      // 清除之前的请求
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      // 使用防抖延迟计算
      timeoutId = setTimeout(() => {
        if (containerRef.current && contentRef.current) {
          // 基于容器宽度和比例计算原始内容高度
          // paddingBottom: 92.55% 意味着高度 = 宽度 * 0.9255
          const containerWidth = containerRef.current.clientWidth;
          const originalHeight = containerWidth * 0.9255;
          const maxHeight = window.innerHeight;

          // 计算新的缩放比例
          let newScale = 1;
          if (originalHeight > maxHeight) {
            newScale = maxHeight / originalHeight;
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

    // 防抖处理 resize 事件
    const handleResize = () => {
      updateScale();
    };

    // 初始计算
    updateScale();

    window.addEventListener("resize", handleResize);

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
    };
  }, [state, scenario]);

  // 处理点击事件（仅用于云服务商故障场景）
  const handleStateChange = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // 检查是否点击了置灰按钮（不可点击按钮）
    let element: HTMLElement | null = target;
    while (element) {
      const classList = element.className || "";
      // 如果找到置灰按钮的特征类名，直接返回，不执行任何操作
      if (
        typeof classList === "string" &&
        (classList.includes("bg-[#f3f6fc]") ||
          classList.includes("cursor-not-allowed"))
      ) {
        console.log(
          "容灾切换 - 云服务商 - Clicked on disabled button, ignoring"
        );
        return;
      }
      element = element.parentElement;
    }

    // 检查是否点击了可操作按钮
    let checkElement: HTMLElement | null = target;
    let buttonId: string | null = null;
    while (checkElement) {
      const dataButtonId = checkElement.getAttribute?.("data-button-id");
      if (dataButtonId) {
        buttonId = dataButtonId;
        break;
      }
      checkElement = checkElement.parentElement;
    }

    const text = target.textContent || "";
    console.log(
      "容灾切换 - 云服务商 - Clicked:",
      text,
      "Button ID:",
      buttonId,
      "Current state:",
      state
    );

    // 状态1: 点击"切换为主实例"按钮 → 状态2
    if (state === "state1" && buttonId === "vendor-state1-button1") {
      console.log("容灾切换 - 云服务商 - State1 → State2");
      setState("state2");
      return;
    }

    // 状态2: 不再自动切换，需要手动操作才能进入状态3
    // 这里可以根据需要添加从状态2到状态3的手动触发逻辑

    // 状态3: 点击"创建跨云主备库"按钮 → 状态4
    if (state === "state3" && buttonId === "vendor-state3-button1") {
      console.log("容灾切换 - 云服务商 - State3 → State4");
      setState("state4");
      return;
    }

    // 状态3: 点击"释放实例"按钮（杭州或上海） → 状态6（Group340）
    if (
      state === "state3" &&
      (buttonId === "vendor-state3-button2" ||
        buttonId === "vendor-state3-button3")
    ) {
      console.log("容灾切换 - 云服务商 - State3 → State6 (释放实例)");
      setState("state6");
      return;
    }

    // 状态3-alt: 点击"释放实例"按钮 → 状态6（Group340）
    if (
      state === "state3-alt" &&
      (buttonId === "vendor-state3-alt-button1" ||
        buttonId === "vendor-state3-alt-button2")
    ) {
      console.log("容灾切换 - 云服务商 - State3-alt → State6 (释放实例)");
      setState("state6");
      return;
    }

    // 状态6: 点击"创建跨云主备库"按钮 → 状态5（Group329）
    if (state === "state6" && buttonId === "vendor-state6-button1") {
      console.log("容灾切换 - 云服务商 - State6 → State5 (创建跨云主备库)");
      setState("state5");
      return;
    }

    // 状态4: 点击"释放实例"按钮 → 状态5
    if (
      state === "state4" &&
      (buttonId === "vendor-state4-button1" ||
        buttonId === "vendor-state4-button2")
    ) {
      console.log("容灾切换 - 云服务商 - State4 → State5 (释放实例)");
      setState("state5");
      return;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ maxHeight: "100vh", overflow: "hidden" }}
    >
      {/* 场景切换单选按钮 */}
      <div
        className="absolute top-2 right-2 z-50 flex gap-2 items-center bg-white px-3 py-2 rounded-lg border border-[#e8e8e8]"
        style={{ paddingBlock: 4 }}
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="disaster-scenario"
            value="cloud-failure"
            checked={scenario === "cloud-failure"}
            onChange={() => {
              setScenario("cloud-failure");
              setState("state1");
            }}
            className="w-4 h-4 text-[#0958D9] focus:ring-[#0958D9]"
          />
          <span className="text-sm text-[#262626]">云服务商故障</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="disaster-scenario"
            value="region-failure"
            checked={scenario === "region-failure"}
            onChange={() => {
              setScenario("region-failure");
              setState("state1");
            }}
            className="w-4 h-4 text-[#0958D9] focus:ring-[#0958D9]"
          />
          <span className="text-sm text-[#262626]">地域故障</span>
        </label>
        <button
          onClick={() => {
            setState("state1");
            setResetTrigger((prev) => prev + 1);
          }}
          className="ml-2 p-1.5 hover:bg-gray-100 rounded transition-colors"
          title="重置"
        >
          <svg
            className="w-4 h-4 text-[#595959]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      {/* 根据场景显示不同的内容 */}
      {scenario === "cloud-failure" ? (
        <div onClick={handleStateChange}>
          {/* 响应式容器 */}
          <div
            ref={contentRef}
            className="relative w-full origin-top-left"
            style={{
              paddingBottom: "92.55%" /* 870/940 比例 */,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div
              className="absolute inset-0 origin-top-left"
              style={state === "state1" ? { top: -30 } : {}}
            >
              <div className="w-[940px] h-[870px] scale-[var(--scale)] origin-top-left">
                {state === "state1" && <Group330 />}
                {state === "state2" && <Group331 />}
                {state === "state3" && <Group332 />}
                {state === "state3-alt" && <Group338 />}
                {state === "state4" && <Group333 />}
                {state === "state5" && <Group334 />}
                {state === "state6" && <Group340 />}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <RegionFailure resetTrigger={resetTrigger} />
      )}
    </div>
  );
}
