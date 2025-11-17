import React, { useState, useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { ClusterTopology } from "./components/ClusterTopology";
import { MetricsPanel } from "./components/MetricsPanel";
import { ScenarioControl } from "./components/ScenarioControl";
import { Database, Sun, Moon } from "lucide-react";
import { Button } from "./components/ui/button";

export type ClusterConfig = { zones: number; serversPerZone: number };
export type ScalingState =
  | "idle"
  | "scaling-out"
  | "scaling-out-migrating"
  | "scaling-in"
  | "scaling-in-migrating"
  | "switching-primary";
export type Scenario = "normal" | "warming-up" | "peak" | "cooling-down";
export type ScalingDirection = "scale-out" | "scale-in" | null;

export interface ZoneInfo {
  id: number;
  name: string;
  isPrimary: boolean;
  observerCount: number; // 该 Zone 的 OBServer 数量
  isOld?: boolean; // 标记是否为旧的zone，等待移除
  isNew?: boolean; // 标记是否为新增的zone
  isDeleting?: boolean; // 标记是否正在删除中
  showWarning?: boolean; // 标记是否显示警告（没有主可用区标记）
  warningMessage?: string; // 警告信息内容
}

export interface MetricsData {
  qps: number;
  tps: number;
  latency: number;
  timestamp: number;
  scalingPhase?: "normal" | "scaling" | "completed";
  scenario?: Scenario;
  config?: ClusterConfig; // 添加配置信息
  scalingState?: ScalingState; // 添加详细的扩缩容状态
}

export interface LogEvent {
  id: number;
  timestamp: number;
  type: "info" | "success" | "warning" | "error";
  message: string;
  isPrimarySwitchEvent?: boolean; // 标记是否为主可用区切换事件
}

export default function App() {
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [config, setConfig] = useState<ClusterConfig>({
    zones: 2,
    serversPerZone: 2,
  });
  const [scalingState, setScalingState] = useState<ScalingState>("idle");
  const [scalingDirection, setScalingDirection] =
    useState<ScalingDirection>(null);
  const [metrics, setMetrics] = useState<MetricsData[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [zones, setZones] = useState<ZoneInfo[]>([
    { id: 1, name: "Zone-1", isPrimary: true, observerCount: 2 },
    { id: 2, name: "Zone-2", isPrimary: true, observerCount: 2 },
  ]);
  const [isPaused, setIsPaused] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isScaledOut, setIsScaledOut] = useState(false);
  const [primarySwitched, setPrimarySwitched] = useState(false);
  const [justCompletedScaleOut, setJustCompletedScaleOut] = useState(false);
  const autoMode = true; // 自动演示模式始终开启
  const logIdRef = useRef(0);

  // 用于平滑过渡的当前值和目标值
  const currentValuesRef = useRef({ qps: 5000, tps: 4000 });
  const targetValuesRef = useRef({ qps: 5000, tps: 4000 });

  // 跟踪指标是否已到达目标并稳定
  const [metricsStableTime, setMetricsStableTime] = useState(0);
  const isStableRef = useRef(false);
  const promotionStableStartRef = useRef<number | null>(null); // 记录大促满负载稳定的开始时间
  const postPromotionStableStartRef = useRef<number | null>(null); // 记录大促结束冗余稳定的开始时间

  // 追踪切主时刻，用于实现切主时指标短暂下降
  const switchingStartTimeRef = useRef<number | null>(null);
  const preSwitchValuesRef = useRef({ qps: 5000, tps: 4000 }); // 切主前的指标值

  // 记录场景开始时间，用于基于时间的平滑过渡
  const scenarioStartTimeRef = useRef<number>(Date.now());

  // 记录上一个场景，用于判断场景切换
  const previousScenarioRef = useRef<Scenario>("normal");

  // 记录循环次数，用于区分第一轮和后续循环
  const cycleCountRef = useRef(0);

  // 记录最近几秒的指标，用于判断流量是否平稳
  const recentMetricsRef = useRef<number[]>([]);
  const [isMetricsStable, setIsMetricsStable] = useState(false);

  // 添加空格键控制暂停/继续
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 监听空格键
      if (e.code === "Space" || e.key === " ") {
        // 阻止空格键的默认行为（页面滚动）
        e.preventDefault();
        // 切换暂停状态
        setIsPaused((prev) => !prev);
      }
    };

    // 添加事件监听器
    window.addEventListener("keydown", handleKeyPress);

    // 清理事件监听器
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, []); // 空依赖数组，只在组件挂载时添加一次

  // Add log entry
  const addLog = (
    message: string,
    type: LogEvent["type"] = "info",
    isPrimarySwitchEvent = false
  ) => {
    setLogs((prev) =>
      [
        {
          id: logIdRef.current++,
          timestamp: Date.now(),
          type,
          message,
          isPrimarySwitchEvent,
        },
        ...prev,
      ].slice(0, 50)
    ); // Keep last 50 logs
  };

  // Handle scaling out: 2F1A (2台/zone) -> 4F1A -> 切换主可用区 -> 2F1A (4台/zone)
  const handleScaleOut = async () => {
    if (scalingState !== "idle" || config === "4F1A" || isScaledOut) return;

    setScalingDirection("scale-out"); // 设置扩容方向

    const currentZones = zones.map((z) => z.name).join(", ");
    addLog("🚀 开始扩容操作：平滑替换 Zone", "info");
    addLog(`📝 当前 Zone: ${currentZones} (各2台 OBServer)`, "info");

    // Get next zone IDs
    const maxId = zones.length > 0 ? Math.max(...zones.map((z) => z.id)) : 0;
    const newId1 = maxId + 1;
    const newId2 = maxId + 2;

    // Step 1: 添加新的大规模 Zone
    await new Promise((resolve) => setTimeout(resolve, 1500));
    addLog(
      `➕ 添加新的 Zone-${newId1} 和 Zone-${newId2} (各4台 OBServer)`,
      "info"
    );
    setScalingState("scaling-out");
    setZones((prev) => [
      ...prev,
      {
        id: newId1,
        name: `Zone-${newId1}`,
        isPrimary: false,
        observerCount: 4,
        isNew: true,
      },
      {
        id: newId2,
        name: `Zone-${newId2}`,
        isPrimary: false,
        observerCount: 4,
        isNew: true,
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    addLog(`🔄 副本同步中...`, "info");

    await new Promise((resolve) => setTimeout(resolve, 3000));
    addLog(`📊 副本同步完成，准备切换主可用区`, "info");

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setConfig("4F1A");
    const oldZoneNames = zones.map((z) => `${z.name}[2台]`).join(", ");
    addLog(
      `✅ 临时扩展至 4F1A (${oldZoneNames}, Zone-${newId1}[4台], Zone-${newId2}[4台])`,
      "success"
    );

    // 此时 4 个 Zone 同时存在，但还未切主：旧 Zone 为主可用区（Leader+Follower），新 Zone 为备区（Follower）
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const oldZoneIds = zones.map((z) => z.id);
    addLog(`📊 当前状态：4个 Zone 共存（切主前）`, "info");
    addLog(
      `   - 旧 Zone (${zones
        .filter((z) => oldZoneIds.includes(z.id))
        .map((z) => z.name)
        .join(", ")}): 主可用区，各2台 OBServer，Leader + Follower`,
      "info"
    );
    addLog(
      `   - 新 Zone (Zone-${newId1}, Zone-${newId2}): 备区，各4台 OBServer，Follower`,
      "info"
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
    addLog(`📊 数据同步完成，准备切换主可用区`, "info");

    // Step 2: 切换主可用区（瞬时操作）
    await new Promise((resolve) => setTimeout(resolve, 2000));
    addLog(
      `🔀 切换主可用区：旧 Zone (${zones
        .filter((z) => !z.isNew)
        .map((z) => z.name)
        .join(", ")}) → 新 Zone (Zone-${newId1}, Zone-${newId2})`,
      "info",
      true
    );
    setScalingState("switching-primary");
    switchingStartTimeRef.current = Date.now(); // 记录切主开始时间
    preSwitchValuesRef.current = {
      qps: currentValuesRef.current.qps,
      tps: currentValuesRef.current.tps,
    }; // 记录切主前的指标值

    await new Promise((resolve) => setTimeout(resolve, 3000));
    const oldZoneIdsToRemove = zones
      .filter((z) => z.id !== newId1 && z.id !== newId2)
      .map((z) => z.id);
    setZones((prev) =>
      prev.map((z) => {
        // 新增的 Zone 都成为主可用区
        if (z.id === newId1 || z.id === newId2) {
          return { ...z, isPrimary: true, isNew: false };
        }
        // 旧 Zone 不再是主可用区，并立即标记为 isOld
        if (oldZoneIdsToRemove.includes(z.id)) {
          return { ...z, isPrimary: false, isNew: false, isOld: true };
        }
        return { ...z, isPrimary: false, isNew: false };
      })
    );
    addLog(
      `✅ 主可用区切换完成：Zone-${newId1}, Zone-${newId2} 现为主可用区`,
      "success"
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setScalingState("scaling-out-migrating"); // 切换完成后，进入扩容迁移阶段
    setPrimarySwitched(true);

    // 此时 4 个 Zone 同时存在：新 Zone 为主可用区（Leader+Follower），旧 Zone 为备区（Follower）
    await new Promise((resolve) => setTimeout(resolve, 2000));
    addLog(`📊 当前状态：4个 Zone 共存（切主后）`, "info");
    addLog(
      `   - 新 Zone (Zone-${newId1}, Zone-${newId2}): 主可用区，各4台 OBServer，Leader + Follower`,
      "info"
    );
    addLog(
      `   - 旧 Zone (${zones
        .filter((z) => oldZoneIdsToRemove.includes(z.id))
        .map((z) => z.name)
        .join(", ")}): 备区，各2台 OBServer，Follower`,
      "info"
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
    addLog(`📊 新主可用区运行稳定，准备移除旧 Zone`, "info");

    // Step 3: 标记旧 Zone 为删除中，并结束 scaling 状态
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const oldZoneNamesToDelete = zones
      .filter((z) => oldZoneIdsToRemove.includes(z.id))
      .map((z) => z.name)
      .join(", ");
    addLog(`🗑️ 删除原 Zone (${oldZoneNamesToDelete}) 中...`, "warning");
    setScalingState("scaling-out-migrating"); // 进入删除阶段
    setZones((prev) =>
      prev.map((z) =>
        oldZoneIdsToRemove.includes(z.id)
          ? { ...z, isDeleting: true, isOld: false }
          : z
      )
    );

    // Step 4: 真正删除旧 Zone
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setZones([
      { id: newId1, name: `Zone-${newId1}`, isPrimary: true, observerCount: 4 },
      { id: newId2, name: `Zone-${newId2}`, isPrimary: true, observerCount: 4 },
    ]);
    setConfig("2F1A");
    setIsScaledOut(true);
    setScalingState("idle"); // 恢复空闲状态
    setScalingDirection(null); // 重置扩缩容方向

    await new Promise((resolve) => setTimeout(resolve, 1000));
    addLog(`✅ 扩容流程完成！性能提升，承载更多流量`, "success");
    addLog(
      `📌 新配置：2F1A (Zone-${newId1}[4台主可用区], Zone-${newId2}[4台])`,
      "success"
    );

    // 扩容完成后，重置 previousScenarioRef，避免影响下一轮循环
    previousScenarioRef.current = "normal";
    setJustCompletedScaleOut(true); // 标记扩容刚完成
  };

  // Handle scaling in: 2F1A (4台/zone) -> 切换主区 -> 4F1A -> 2F1A (2台/zone)
  const handleScaleIn = async () => {
    if (scalingState !== "idle" || config === "4F1A" || !isScaledOut) return;

    setScalingDirection("scale-in"); // 设置缩容方向

    const currentZones = zones.map((z) => z.name).join(", ");
    addLog("🔽 开始缩容操作：平滑替换 Zone", "info");
    addLog(`📝 当前 Zone: ${currentZones} (各4台 OBServer)`, "info");

    // Get next zone IDs
    const maxId = zones.length > 0 ? Math.max(...zones.map((z) => z.id)) : 0;
    const newId1 = maxId + 1;
    const newId2 = maxId + 2;

    // Step 1: 添加新的小规模 Zone
    await new Promise((resolve) => setTimeout(resolve, 1500));
    addLog(
      `➕ 添加新的 Zone-${newId1} 和 Zone-${newId2} (各2台 OBServer)`,
      "info"
    );
    setScalingState("scaling-in");
    setZones((prev) => [
      ...prev,
      {
        id: newId1,
        name: `Zone-${newId1}`,
        isPrimary: false,
        observerCount: 2,
        isNew: true,
      },
      {
        id: newId2,
        name: `Zone-${newId2}`,
        isPrimary: false,
        observerCount: 2,
        isNew: true,
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 1500));
    addLog(`🔄 副本同步中...`, "info");

    await new Promise((resolve) => setTimeout(resolve, 3000));
    addLog(`✅ 副本同步完成`, "success");

    await new Promise((resolve) => setTimeout(resolve, 1500));
    setConfig("4F1A");
    const oldZoneNames = zones.map((z) => `${z.name}[4台]`).join(", ");
    addLog(
      `✅ 临时扩展至 4F1A (${oldZoneNames}, Zone-${newId1}[2台], Zone-${newId2}[2台])`,
      "success"
    );

    // 此时 4 个 Zone 同时存在，但还未切主：旧 Zone 为主区（Leader+Follower），新 Zone 为备区（Follower）
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const oldZoneIds = zones.map((z) => z.id);
    addLog(`📊 当前状态：4个 Zone 共存（切主前）`, "info");
    addLog(
      `   - 旧 Zone (${zones
        .filter((z) => oldZoneIds.includes(z.id))
        .map((z) => z.name)
        .join(", ")}): 主区，各4台 OBServer，Leader + Follower`,
      "info"
    );
    addLog(
      `   - 新 Zone (Zone-${newId1}, Zone-${newId2}): 备区，各2台 OBServer，Follower`,
      "info"
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
    addLog(`📊 数据同步完成，准备切换主可用区`, "info");

    // Step 2: 切换主可用区（瞬时操作）
    await new Promise((resolve) => setTimeout(resolve, 2000));
    addLog(
      `🔀 切换主可用区：旧 Zone (${zones
        .filter((z) => !z.isNew)
        .map((z) => z.name)
        .join(", ")}) → 新 Zone (Zone-${newId1}, Zone-${newId2})`,
      "info",
      true
    );
    setScalingState("switching-primary");
    switchingStartTimeRef.current = Date.now(); // 记录切主开始时间
    preSwitchValuesRef.current = {
      qps: currentValuesRef.current.qps,
      tps: currentValuesRef.current.tps,
    }; // 记录切主前的指标值

    await new Promise((resolve) => setTimeout(resolve, 3000));
    const oldZoneIdsToRemove = zones
      .filter((z) => z.id !== newId1 && z.id !== newId2)
      .map((z) => z.id);
    setZones((prev) =>
      prev.map((z) => {
        // 新增的 Zone 都成为主可用区
        if (z.id === newId1 || z.id === newId2) {
          return { ...z, isPrimary: true, isNew: false };
        }
        // 旧 Zone 不再是主可用区，并立即标记为 isOld
        if (oldZoneIdsToRemove.includes(z.id)) {
          return { ...z, isPrimary: false, isNew: false, isOld: true };
        }
        return { ...z, isPrimary: false, isNew: false };
      })
    );
    addLog(
      `✅ 主可用区切换完成：Zone-${newId1}, Zone-${newId2} 现为主可用区`,
      "success"
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    setScalingState("scaling-in-migrating"); // 切换完成后，进入缩容迁移阶段

    // 此时 4 个 Zone 同时存在：新 Zone 为主可用区（Leader+Follower），旧 Zone 为备区（Follower）
    await new Promise((resolve) => setTimeout(resolve, 2000));
    addLog(`📊 当前状态：4个 Zone 共存（切主后）`, "info");
    addLog(
      `   - 新 Zone (Zone-${newId1}, Zone-${newId2}): 主可用区，各2台 OBServer，Leader + Follower`,
      "info"
    );
    addLog(
      `   - 旧 Zone (${zones
        .filter((z) => oldZoneIdsToRemove.includes(z.id))
        .map((z) => z.name)
        .join(", ")}): 备区，各4台 OBServer，Follower`,
      "info"
    );

    await new Promise((resolve) => setTimeout(resolve, 3000));
    addLog(`📊 新主可用区运行稳定，准备移除旧 Zone`, "info");

    // Step 3: 标记旧 Zone 为删除中，并结束 scaling 状态
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const oldZoneNamesToDelete = zones
      .filter((z) => oldZoneIdsToRemove.includes(z.id))
      .map((z) => z.name)
      .join(", ");
    addLog(`🗑️ 删除原 Zone (${oldZoneNamesToDelete}) 中...`, "warning");
    setScalingState("scaling-in-migrating"); // 进入删除阶段
    setZones((prev) =>
      prev.map((z) =>
        oldZoneIdsToRemove.includes(z.id)
          ? { ...z, isDeleting: true, isOld: false }
          : z
      )
    );

    // Step 4: 真正删除旧 Zone
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setZones([
      { id: newId1, name: `Zone-${newId1}`, isPrimary: true, observerCount: 2 },
      { id: newId2, name: `Zone-${newId2}`, isPrimary: true, observerCount: 2 },
    ]);
    setConfig("2F1A");
    setIsScaledOut(false);
    setScalingState("idle"); // 恢复空闲状态
    setScalingDirection(null); // 重置扩缩容方向

    await new Promise((resolve) => setTimeout(resolve, 1000));
    addLog(`✅ 缩容流程完成！性能下降，配正常流量`, "success");
    addLog(
      `📌 新配置：2F1A (Zone-${newId1}[2台主可用区], Zone-${newId2}[2台])`,
      "success"
    );
  };

  // Initialize
  useEffect(() => {
    addLog("🎯 OceanBase 电商大促扩缩容演示系统已启动", "success");
    addLog("📌 当前配置：2F1A (2个全功能副本 + 1个仲裁副本)", "info");
  }, []);

  // 自动场景切换
  useEffect(() => {
    if (!autoMode || isPaused) return;

    // 记录场景开始时间
    scenarioStartTimeRef.current = Date.now();

    // 定义每个阶段的持续时间（秒）
    // 缩容后的 normal 阶段不自动切换，只有扩容完成后才切换到 warming-up
    const scenarioDurations = {
      normal: 999999, // Normal 阶段不自动切换，由扩容完成后手动触发 warming-up
      "warming-up": 10, // 预热段 10 秒
      peak: 45, // 大促持续 45 秒
      "cooling-down": 45, // 大促结束持续 45 秒
    };

    const timer = setTimeout(() => {
      // 只在空闲状态下切换场景，避免在扩缩容过程中切换
      if (scalingState === "idle") {
        // 在切换场景之前，先更新 previousScenarioRef
        previousScenarioRef.current = scenario;

        if (scenario === "normal") {
          // Normal 阶段不自动切换（由扩容完成后手动触发）
          // 这行不会执行，因为 normal 的 duration 是 999999
          addLog("🤖 [自动模式] 切换到预热阶段", "info");
          setScenario("warming-up");
          cycleCountRef.current++; // 每次从 normal 切换到 warming-up 时，循环次数加1
        } else if (scenario === "warming-up") {
          addLog("🤖 [自动模式] 切换到大促高峰场景", "info");
          setScenario("peak");
        } else if (scenario === "peak") {
          addLog("🤖 [自动模式] 大促结束，流量开始下降", "info");
          setScenario("cooling-down");
        } else if (scenario === "cooling-down") {
          addLog("🤖 [自动模式] 恢复到正常流量", "info");
          setScenario("normal");
        }
      }
    }, scenarioDurations[scenario] * 1000);

    return () => clearTimeout(timer);
  }, [autoMode, scenario, scalingState, isPaused]);

  // 首次开启自动模式时，如果是正常流量阶段立即进入预热
  useEffect(() => {
    if (autoMode && scenario === "normal" && scalingState === "idle") {
      // 延迟一下让用户看到模式切换
      const timer = setTimeout(() => {
        addLog("🤖 [自动模式] 立即开始大促演示", "info");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoMode]); // 只在 autoMode 变化时触发

  // 扩容完成后立即切换到 warming-up 阶段（不等待 normal 阶段结束）
  useEffect(() => {
    if (
      autoMode &&
      justCompletedScaleOut &&
      scenario === "normal" &&
      scalingState === "idle"
    ) {
      const timer = setTimeout(() => {
        addLog("🤖 [自动模式] 扩容完成，立即切换到预热阶段", "info");
        previousScenarioRef.current = scenario;
        setScenario("warming-up");
        setJustCompletedScaleOut(false); // 重置标记
        cycleCountRef.current++; // 增加循环计数，确保下一轮等待 60 秒
      }, 2000); // 2秒后切换，给用户看到扩容完成的日志

      return () => clearTimeout(timer);
    }
  }, [autoMode, justCompletedScaleOut, scenario, scalingState]);

  // 自动扩缩容逻辑 - 基于场景时间触发，而非基于指标阈值
  useEffect(() => {
    if (!autoMode || isPaused) return;

    // normal 阶段：区分是从 cooling-down 切换过来（需要缩容）还是初始状态（需要扩容）
    if (scenario === "normal" && scalingState === "idle") {
      // 如果上一个场景是 cooling-down，说明是大促结束后的正常流量，需要等待流量平稳后缩容
      if (previousScenarioRef.current === "cooling-down" && isScaledOut) {
        // 先等待一段时间让流量完全稳定，再检查是否开始缩容
        const waitTimer = setTimeout(() => {
          addLog("🤖 [自动模式] 进入正常流量阶段，等待流量完全稳定...", "info");

          // 等待10秒后，再检查流量是否平稳
          const checkStable = setInterval(() => {
            if (isMetricsStable) {
              clearInterval(checkStable);
              addLog("🤖 [自动模式] 流量已平稳，开始缩容", "info");
              handleScaleIn();
            }
          }, 1000); // 每秒检查一次
        }, 10000); // 进入 normal 阶段后等待 10 秒

        return () => clearTimeout(waitTimer);
      }
      // 否则，如果还未扩容，说明是初始正常流量或缩容后的正常流量，需要提前扩容为下一轮大促做准备
      else if (!isScaledOut) {
        // 区分首次开启自动模式和缩容后的下一轮扩容
        // 首次开启时 cycleCountRef.current === 0，立即开始扩容
        // 缩容后的下一轮，等待 60 秒展示稳定状态
        const delay = cycleCountRef.current === 0 ? 2000 : 60000;

        // 如果不是首轮，在扩容前 10 秒添加提示
        if (cycleCountRef.current > 0) {
          const notifyTimer = setTimeout(() => {
            addLog("🔔 [自动模式] 下一轮循环即将开始（10秒后）...", "warning");
          }, 50000); // 50 秒后提示（扩容前 10 秒）

          // 清理定时器
          setTimeout(() => clearTimeout(notifyTimer), delay);
        }

        const timer = setTimeout(() => {
          if (cycleCountRef.current === 0) {
            addLog("🤖 [自动模式] 立即开始扩容，准备大促演示", "info");
          } else {
            addLog(
              `🔄 [自动模式] 第 ${
                cycleCountRef.current + 1
              } 轮大促演示开始，正常流量阶段，提前扩容为大促做准备`,
              "info"
            );
          }
          handleScaleOut();
        }, delay);

        return () => clearTimeout(timer);
      }
    }
  }, [
    autoMode,
    scenario,
    isScaledOut,
    scalingState,
    isMetricsStable,
    isPaused,
  ]);

  // Generate metrics periodically with smooth transitions
  useEffect(() => {
    // 如果暂停，则完全停止生成指标
    if (isPaused) {
      return;
    }

    const interval = setInterval(() => {
      // 计算目标值
      let targetQPS = 5000;
      let targetTPS = 4000;

      switch (scenario) {
        case "normal":
          // 正常流量
          targetQPS = 5000;
          targetTPS = 4000;
          break;
        case "warming-up":
          // 预热阶段：指标持续上升到28k（扩容期间也继续上升）
          if (scalingState === "idle" && !isScaledOut) {
            // 扩容前：上升到 15k
            targetQPS = 15000;
            targetTPS = 12000;
          } else if (
            scalingState === "scaling-out" ||
            scalingState === "scaling-out-migrating"
          ) {
            // 扩容中：继续上升到 22k
            targetQPS = 22000;
            targetTPS = 17500;
          } else if (scalingState === "switching-primary") {
            // 切换主区中：继续上升到 26k
            targetQPS = 26000;
            targetTPS = 20500;
          } else if (isScaledOut && scalingState === "idle") {
            // 扩容完成后：继续上升到 28k
            targetQPS = 28000;
            targetTPS = 22000;
          } else {
            targetQPS = 15000;
            targetTPS = 12000;
          }
          break;
        case "peak":
          // 大促高峰：保持在28k
          targetQPS = 28000;
          targetTPS = 22000;
          break;
        case "cooling-down":
          // 降温阶段：基于时间的平滑下降（28k → 5k），不受扩缩容状态影响
          const coolingDuration = 35000; // 35 秒总时间
          const elapsedTime = Date.now() - scenarioStartTimeRef.current;
          const progress = Math.min(elapsedTime / coolingDuration, 1); // 0 到 1

          // 线性下降：从 28k 降到 5k
          targetQPS = 28000 - (28000 - 5000) * progress;
          targetTPS = 22000 - (22000 - 4000) * progress;
          break;
      }

      // 更新目标值
      targetValuesRef.current = { qps: targetQPS, tps: targetTPS };

      // 使用平滑过渡：每次向目标值靠近一定比例
      let smoothFactor = 0.15;

      const currentQPS = currentValuesRef.current.qps;
      const currentTPS = currentValuesRef.current.tps;

      // 计算新的当前值（向目标值靠近）
      let newQPS = currentQPS + (targetQPS - currentQPS) * smoothFactor;
      let newTPS = currentTPS + (targetTPS - currentTPS) * smoothFactor;

      // 切主时的特殊处理：模拟切主对指标的短暂影响
      // 扩容和缩容的切主都需要显示短暂下降（表示切主对业务有轻微影响）
      if (
        scalingState === "switching-primary" &&
        switchingStartTimeRef.current !== null
      ) {
        const timeSinceSwitchStart = Date.now() - switchingStartTimeRef.current;

        // 切主影响持续约 2 秒，下降幅度约 8-10%，让变化更明显
        if (timeSinceSwitchStart < 2000) {
          // 在切主的前 0.8 秒，指标下降到 90%
          if (timeSinceSwitchStart < 800) {
            // 逐渐下降到 90%
            const dropProgress = timeSinceSwitchStart / 800; // 0 到 1
            const dropRatio = 1.0 - dropProgress * 0.1; // 从 100% 降到 90%
            newQPS = preSwitchValuesRef.current.qps * dropRatio;
            newTPS = preSwitchValuesRef.current.tps * dropRatio;
          }
          // 0.8-2 秒：快速恢复到正常水平
          else {
            const recoveryProgress = (timeSinceSwitchStart - 800) / 1200; // 0 到 1
            const recoveredRatio = 0.9 + recoveryProgress * 0.1; // 从 90% 恢复到 100%
            const currentTarget =
              currentQPS + (targetQPS - currentQPS) * smoothFactor;
            newQPS =
              preSwitchValuesRef.current.qps * recoveredRatio +
              (currentTarget - preSwitchValuesRef.current.qps) *
                recoveryProgress;
            newTPS =
              preSwitchValuesRef.current.tps * recoveredRatio +
              (currentTPS +
                (targetTPS - currentTPS) * smoothFactor -
                preSwitchValuesRef.current.tps) *
                recoveryProgress;
          }
        } else {
          // 切主完成，清除切主开始时间
          switchingStartTimeRef.current = null;
        }
      }

      // 添加小幅随机波动（正常流量波动较小，让切主影响更突出）
      const variation = 0.01; // 从 0.015 减小到 0.01，让正常波动更小
      const qps = newQPS * (1 + (Math.random() - 0.5) * variation);
      const tps = newTPS * (1 + (Math.random() - 0.5) * variation);

      // 更新当前值
      currentValuesRef.current = { qps: newQPS, tps: newTPS };

      // 确定扩缩容阶段
      let scalingPhase: "normal" | "scaling" | "completed" = "normal";
      if (
        scalingState === "scaling-out" ||
        scalingState === "scaling-in" ||
        scalingState === "scaling-out-migrating" ||
        scalingState === "scaling-in-migrating"
      ) {
        scalingPhase = "scaling";
      }

      const newMetric: MetricsData = {
        qps,
        tps,
        latency: 0,
        timestamp: Date.now(),
        scalingPhase,
        scenario,
        config,
        scalingState,
      };

      setMetrics((prev) => [...prev, newMetric].slice(-100));

      // 记录最近几秒的指标，用于判断流量是否平稳
      recentMetricsRef.current.push(qps);
      if (recentMetricsRef.current.length > 5) {
        recentMetricsRef.current.shift();
      }

      // 判断流量是否平稳
      if (recentMetricsRef.current.length === 5) {
        const maxQPS = Math.max(...recentMetricsRef.current);
        const minQPS = Math.min(...recentMetricsRef.current);
        const range = maxQPS - minQPS;
        if (range < 500) {
          // 如果波动范围小于 500 QPS，则认为流量平稳
          setIsMetricsStable(true);
        } else {
          setIsMetricsStable(false);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [scenario, config, scalingState, isScaledOut, primarySwitched, isPaused]);

  return (
    <>
      <div
        className={`min-h-screen p-4 ${
          theme === "dark"
            ? "bg-slate-950 text-slate-100"
            : "bg-gray-50 text-gray-900"
        }`}
      >
        {/* Header */}
        <header
          className={`mb-4 border-b pb-3 ${
            theme === "dark" ? "border-slate-800" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database
                className={`w-7 h-7 ${
                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                }`}
              />
              <div>
                <h1
                  className={
                    theme === "dark" ? "text-slate-100" : "text-gray-900"
                  }
                >
                  OceanBase 平滑扩缩容演示
                </h1>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-500" : "text-gray-500"
                  }`}
                >
                  电商大促场景 - 基于异构 Zone 的平滑扩缩容: 2F1A (2 台
                  OBServer) ⇄ 4F1A ⇄ 2F1A (4 台 OBServer)
                </p>
              </div>
            </div>

            {/* 主题切换按钮 - 右上角 */}
            <Button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`h-9 px-3 ${
                theme === "dark"
                  ? "bg-slate-800 hover:bg-slate-700 border border-slate-700"
                  : "bg-white hover:bg-gray-100 border border-gray-300 text-gray-900"
              }`}
              title={theme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </header>

        {/* 场景控制 - 单独一行，简化版 */}
        <div className="mb-3">
          <ScenarioControl
            scenario={scenario}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            theme={theme}
            scalingState={scalingState}
            scalingDirection={scalingDirection}
          />
        </div>

        {/* Main Content - 两列紧凑布局 */}
        <div
          className="grid grid-cols-2 gap-4"
          style={{ height: "calc(100vh - 200px)" }}
        >
          {/* 左侧：性能监控 */}
          <div className="h-full">
            <MetricsPanel metrics={metrics} logs={logs} theme={theme} />
          </div>

          {/* 右侧：集群拓扑 */}
          <div className="h-full">
            <ClusterTopology
              config={config}
              scalingState={scalingState}
              scalingDirection={scalingDirection}
              zones={zones}
              currentQPS={
                metrics.length > 0 ? metrics[metrics.length - 1].qps : 0
              }
              theme={theme}
            />
          </div>
        </div>
      </div>
      <Analytics />
    </>
  );
}
