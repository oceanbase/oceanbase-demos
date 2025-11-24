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
      <div
        className="absolute top-2 right-2 z-50 flex gap-2 items-center bg-white px-3 py-2 rounded-lg border border-[#e8e8e8]"
        style={{ paddingBlock: 4, paddingInline: 8 }}
      >
        <button
          onClick={() => setState("initial")}
          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
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

      <div onClick={handleStateChange}>
        {/* 响应式容器 */}
        <div
          className="relative w-full"
          style={{ paddingBottom: "92.55%" /* 870/940 比例 */ }}
        >
          <div className="absolute inset-0 origin-top-left">
            <div className="w-[940px] h-[870px] origin-top-left">
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
