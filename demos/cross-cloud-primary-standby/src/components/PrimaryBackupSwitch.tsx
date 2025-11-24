import { useState, useEffect } from "react";
import Group327 from "../imports/Group327";
import Group328 from "../imports/Group328";
import Group329 from "../imports/Group329";

type PrimaryBackupState = "initial" | "afterSwitch" | "final";

interface PrimaryBackupSwitchProps {
  resetTrigger?: number;
}

export default function PrimaryBackupSwitch({
  resetTrigger,
}: PrimaryBackupSwitchProps) {
  const [state, setState] = useState<PrimaryBackupState>("initial");

  // 当 resetTrigger 改变时，重置状态
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setState("initial");
    }
  }, [resetTrigger]);

  // 处理点击事件
  const handleStateChange = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const text = target.textContent || "";

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
        console.log("主备切换 - Clicked on disabled button, ignoring");
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

    if (!buttonId) {
      return;
    }

    console.log(
      "主备切换 - Clicked button:",
      buttonId,
      "Current state:",
      state,
      "Text:",
      text
    );

    // 根据当前状态和点击的按钮决定下一个状态
    // 状态1（initial）的2个按钮 → 跳转到状态2和状态3
    if (state === "initial") {
      if (buttonId === "state1-button1") {
        console.log("主备切换 - State1 Button1: initial → afterSwitch");
        setState("afterSwitch");
      } else if (buttonId === "state1-button2") {
        console.log("主备切换 - State1 Button2: initial → final");
        setState("final");
      }
      return;
    }

    // 状态2（afterSwitch）的2个按钮 → 跳转到状态1和状态3
    if (state === "afterSwitch") {
      if (buttonId === "state2-button1") {
        console.log("主备切换 - State2 Button1: afterSwitch → initial");
        setState("initial");
      } else if (buttonId === "state2-button2") {
        console.log("主备切换 - State2 Button2: afterSwitch → final");
        setState("final");
      }
      return;
    }

    // 状态3（final）的2个按钮 → 跳转到状态1和状态2
    if (state === "final") {
      if (buttonId === "state3-button1") {
        console.log("主备切换 - State3 Button1: final → initial");
        setState("initial");
      } else if (buttonId === "state3-button2") {
        console.log("主备切换 - State3 Button2: final → afterSwitch");
        setState("afterSwitch");
      }
      return;
    }
  };

  return (
    <div className="relative">
      {/* 刷新按钮 */}
      <div className="absolute top-2.5 right-2 z-50 flex gap-2 items-center">
        <button
          onClick={() => setState("initial")}
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
              id="mask0_reset_icon_primary"
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
            <g mask="url(#mask0_reset_icon_primary)"></g>
          </svg>
        </button>
      </div>

      <div onClick={handleStateChange}>
        {/* 响应式容器 */}
        <div
          className="relative w-full"
          style={{ paddingBottom: "92.55%" /* 870/940 比例 */ }}
        >
          <div className="absolute inset-0 origin-top-left">
            <div className="w-[940px] h-[870px] scale-[var(--scale)] origin-top-left">
              {state === "initial" && <Group327 />}
              {state === "afterSwitch" && <Group328 />}
              {state === "final" && <Group329 />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
