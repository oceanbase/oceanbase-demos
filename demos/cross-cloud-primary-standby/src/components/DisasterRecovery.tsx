import { useState, useEffect } from "react";
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
    <div className="relative">
      {/* 场景切换单选按钮 */}
      <div className="absolute top-2.5 right-2 z-50 flex gap-2 items-center">
        <div className="flex items-center">
          {/* 左侧按钮 - 云服务商故障 */}
          <button
            onClick={() => {
              setScenario("cloud-failure");
              setState("state1");
            }}
            className={`relative bg-white box-border content-stretch flex gap-[10px] h-[32px] items-center px-[12px] py-[5px] rounded-bl-[8px] rounded-tl-[8px] transition-colors cursor-pointer group ${
              scenario === "cloud-failure" ? "" : "hover:bg-[#f5f7fa]"
            }`}
          >
            <div
              aria-hidden="true"
              className={`absolute border border-solid inset-0 pointer-events-none rounded-bl-[8px] rounded-tl-[8px] transition-colors ${
                scenario === "cloud-failure"
                  ? "border-[#006aff]"
                  : "border-[#cdd5e4] group-hover:border-[#a0aec0]"
              }`}
            />
            <p
              className={`font-['PingFang_SC',sans-serif] leading-[22px] not-italic relative shrink-0 text-[14px] text-nowrap whitespace-pre ${
                scenario === "cloud-failure"
                  ? "text-[#006aff] font-medium"
                  : "text-[#132039] font-normal"
              }`}
            >
              云服务商故障
            </p>
          </button>
          {/* 右侧按钮 - 地域故障 */}
          <button
            onClick={() => {
              setScenario("region-failure");
              setState("state1");
            }}
            className={`relative bg-white box-border content-stretch flex gap-[10px] h-[32px] items-center px-[12px] py-[5px] rounded-br-[8px] rounded-tr-[8px] transition-colors cursor-pointer group ${
              scenario === "region-failure" ? "" : "hover:bg-[#f5f7fa]"
            }`}
          >
            <div
              aria-hidden="true"
              className={`absolute border border-solid inset-0 pointer-events-none rounded-br-[8px] rounded-tr-[8px] transition-colors ${
                scenario === "region-failure"
                  ? "border-[#006aff]"
                  : "border-[#cdd5e4] group-hover:border-[#a0aec0]"
              }`}
            />
            <p
              className={`font-['PingFang_SC',sans-serif] leading-[22px] not-italic relative shrink-0 text-[14px] text-nowrap whitespace-pre ${
                scenario === "region-failure"
                  ? "text-[#006aff] font-medium"
                  : "text-[#132039] font-normal"
              }`}
            >
              地域故障
            </p>
          </button>
        </div>
        {/* 刷新按钮 */}
        <button
          onClick={() => {
            setState("state1");
            setResetTrigger((prev) => prev + 1);
          }}
          className="bg-white box-border content-stretch flex gap-[8px] items-center justify-center p-[6px] rounded-[6px] size-[32px] border-[#cdd5e4] border border-solid hover:bg-[#f5f7fa] hover:border-[#a0aec0] transition-all overflow-hidden cursor-pointer group"
          title="重置"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M14.2047 3.27031L13.3234 3.95937C12.1219 2.42344 10.2531 1.4375 8.15469 1.4375C4.53126 1.4375 1.59844 4.36719 1.59376 7.99219C1.58907 11.6203 4.52813 14.5625 8.15469 14.5625C10.9875 14.5625 13.4016 12.7656 14.3203 10.2484C14.3438 10.1828 14.3094 10.1094 14.2438 10.0875L13.3578 9.78281C13.2938 9.76094 13.2234 9.79375 13.2 9.85781C13.1719 9.93594 13.1406 10.0141 13.1078 10.0906C12.8375 10.7312 12.45 11.3063 11.9563 11.8C11.4625 12.2937 10.8875 12.6812 10.2484 12.9531C9.58751 13.2328 8.88282 13.375 8.15782 13.375C7.43126 13.375 6.72813 13.2328 6.06719 12.9531C5.42813 12.6828 4.85313 12.2953 4.35938 11.8C3.86563 11.3063 3.47813 10.7312 3.20782 10.0906C2.92813 9.42812 2.78594 8.725 2.78594 7.99844C2.78594 7.27187 2.92813 6.56875 3.20782 5.90625C3.47813 5.26562 3.86563 4.69063 4.35938 4.19688C4.85313 3.70312 5.42813 3.31563 6.06719 3.04375C6.72813 2.76406 7.43282 2.62188 8.15782 2.62188C8.88438 2.62188 9.58751 2.76406 10.2484 3.04375C10.8875 3.31406 11.4625 3.70156 11.9563 4.19688C12.1109 4.35156 12.2563 4.51562 12.3906 4.6875L11.45 5.42188C11.3672 5.48594 11.3953 5.61719 11.4969 5.64219L14.2406 6.31406C14.3188 6.33281 14.3953 6.27344 14.3953 6.19375L14.4078 3.36719C14.4063 3.26406 14.2859 3.20625 14.2047 3.27031Z"
              fill="#5C6B8A"
              className="transition-colors group-hover:fill-[#4a5568]"
            />
            <mask
              id="mask0_reset_icon"
              style={{ maskType: "luminance" }}
              maskUnits="userSpaceOnUse"
              x="1"
              y="1"
              width="14"
              height="14"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M14.2047 3.27031L13.3234 3.95937C12.1219 2.42344 10.2531 1.4375 8.15469 1.4375C4.53126 1.4375 1.59844 4.36719 1.59376 7.99219C1.58907 11.6203 4.52813 14.5625 8.15469 14.5625C10.9875 14.5625 13.4016 12.7656 14.3203 10.2484C14.3438 10.1828 14.3094 10.1094 14.2438 10.0875L13.3578 9.78281C13.2938 9.76094 13.2234 9.79375 13.2 9.85781C13.1719 9.93594 13.1406 10.0141 13.1078 10.0906C12.8375 10.7312 12.45 11.3063 11.9563 11.8C11.4625 12.2937 10.8875 12.6812 10.2484 12.9531C9.58751 13.2328 8.88282 13.375 8.15782 13.375C7.43126 13.375 6.72813 13.2328 6.06719 12.9531C5.42813 12.6828 4.85313 12.2953 4.35938 11.8C3.86563 11.3063 3.47813 10.7312 3.20782 10.0906C2.92813 9.42812 2.78594 8.725 2.78594 7.99844C2.78594 7.27187 2.92813 6.56875 3.20782 5.90625C3.47813 5.26562 3.86563 4.69063 4.35938 4.19688C4.85313 3.70312 5.42813 3.31563 6.06719 3.04375C6.72813 2.76406 7.43282 2.62188 8.15782 2.62188C8.88438 2.62188 9.58751 2.76406 10.2484 3.04375C10.8875 3.31406 11.4625 3.70156 11.9563 4.19688C12.1109 4.35156 12.2563 4.51562 12.3906 4.6875L11.45 5.42188C11.3672 5.48594 11.3953 5.61719 11.4969 5.64219L14.2406 6.31406C14.3188 6.33281 14.3953 6.27344 14.3953 6.19375L14.4078 3.36719C14.4063 3.26406 14.2859 3.20625 14.2047 3.27031Z"
                fill="white"
              />
            </mask>
            <g mask="url(#mask0_reset_icon)"></g>
          </svg>
        </button>
      </div>

      {/* 根据场景显示不同的内容 */}
      {scenario === "cloud-failure" ? (
        <div onClick={handleStateChange}>
          {/* 响应式容器 */}
          <div
            className="relative w-full"
            style={{ paddingBottom: "92.55%" /* 870/940 比例 */ }}
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
