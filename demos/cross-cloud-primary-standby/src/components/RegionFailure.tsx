import { useState, useEffect } from "react";
import Group335 from "../imports/Group335";
import Group336 from "../imports/Group336";
import Group337 from "../imports/Group337";
import Group338 from "../imports/Group338";
import Group339 from "../imports/Group339";
import Group34025 from "../imports/Group340-25-1290";

type RegionFailureState = "initial" | "switching" | "recovered" | "afterCreating" | "afterReleasing" | "state6";

interface RegionFailureProps {
  resetTrigger?: number;
}

export default function RegionFailure({ resetTrigger }: RegionFailureProps) {
  const [state, setState] = useState<RegionFailureState>("initial");

  // 当 resetTrigger 改变时，重置状态
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setState("initial");
    }
  }, [resetTrigger]);

  // 当进入switching状态时，2秒后自动切换到recovered状态
  useEffect(() => {
    if (state === "switching") {
      const timer = setTimeout(() => {
        setState("recovered");
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [state]);

  // 处理点击事件
  const handleStateChange = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const text = target.textContent || "";
    
    // 检查是否点击了置灰按钮（不可点击按钮）
    let element: HTMLElement | null = target;
    while (element) {
      const classList = element.className || "";
      // 如果找到置灰按钮的特征类名，直接返回，不执行任何操作
      if (typeof classList === 'string' && (classList.includes("bg-[#f3f6fc]") || classList.includes("cursor-not-allowed"))) {
        console.log("地域故障 - Clicked on disabled button, ignoring");
        return;
      }
      element = element.parentElement;
    }
    
    console.log("地域故障 - Clicked:", text, "Current state:", state);
    
    // 状态1: 点击"切换为主实例" → 状态2
    if (state === "initial" && text.includes("切换为主实例")) {
      console.log("地域故障 - Transitioning to switching state");
      setState("switching");
      return;
    }
    
    // 状态3: 点击"创建跨云主备库" → 状态4
    if (state === "recovered" && text.includes("创建跨云主备库")) {
      console.log("地域故障 - Transitioning to afterCreating state");
      setState("afterCreating");
      return;
    }
    
    // 状态3: 点击"释放实例" → 状态6（新增）
    if (state === "recovered" && text.includes("释放实例")) {
      console.log("地域故障 - Transitioning from recovered to state6");
      setState("state6");
      return;
    }
    
    // 状态4: 点击"释放实例" → 状态5
    if (state === "afterCreating" && text.includes("释放实例")) {
      console.log("地域故障 - Transitioning to afterReleasing state");
      setState("afterReleasing");
      return;
    }
    
    // 状态6: 点击"创建跨云主备库" → 状态5（新增）
    if (state === "state6" && text.includes("创建跨云主备库")) {
      console.log("地域故障 - Transitioning from state6 to afterReleasing state");
      setState("afterReleasing");
      return;
    }
  };

  return (
    <div onClick={handleStateChange}>
      {/* 响应式容器 */}
      <div className="relative w-full" style={{ paddingBottom: "92.55%" /* 870/940 比例 */ }}>
        <div className="absolute inset-0 origin-top-left">
          <div className="w-[940px] h-[870px] scale-[var(--scale)] origin-top-left">
            {state === "initial" && <Group335 />}
            {state === "switching" && <Group336 />}
            {state === "recovered" && <Group337 />}
            {state === "afterCreating" && <Group338 />}
            {state === "afterReleasing" && <Group339 />}
            {state === "state6" && <Group34025 />}
          </div>
        </div>
      </div>
    </div>
  );
}