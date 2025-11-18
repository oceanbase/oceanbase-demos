import React, { useState, useEffect, useRef } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import IframeCommunicator from "./components/IframeCommunicator";
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
  | "switching-primary"
  | "completed";
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
  const [metrics, setMetrics] = useState<MetricsData[]>(() => {
    // 初始化时就创建60个数据点
    const initialMetrics: MetricsData[] = [];
    const now = Date.now();
    const initialQPS = 5000;
    const initialTPS = 4000;

    for (let i = 59; i >= 0; i--) {
      initialMetrics.push({
        qps: initialQPS * (1 + (Math.random() - 0.5) * 0.01), // 添加小幅波动
        tps: initialTPS * (1 + (Math.random() - 0.5) * 0.01),
        latency: 0,
        timestamp: now - i * 1000, // 每秒一个点
        scalingPhase: "normal",
        scenario: "normal",
        config: { zones: 2, serversPerZone: 2 },
        scalingState: "idle",
      });
    }

    return initialMetrics;
  });
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

  // 重置函数 - 恢复到初始状态
  const handleReset = () => {
    // 重置所有状态
    setScenario("normal");
    setConfig({ zones: 2, serversPerZone: 2 });
    setScalingState("idle");
    setScalingDirection(null);
    setMetrics(() => {
      // 初始化时就创建60个数据点
      const initialMetrics: MetricsData[] = [];
      const now = Date.now();
      const initialQPS = 5000;
      const initialTPS = 4000;

      for (let i = 59; i >= 0; i--) {
        initialMetrics.push({
          qps: initialQPS * (1 + (Math.random() - 0.5) * 0.01), // 添加小幅波动
          tps: initialTPS * (1 + (Math.random() - 0.5) * 0.01),
          latency: 0,
          timestamp: now - i * 1000, // 每秒一个点
          scalingPhase: "normal",
          scenario: "normal",
          config: { zones: 2, serversPerZone: 2 },
          scalingState: "idle",
        });
      }

      return initialMetrics;
    });
    setLogs([]);
    setZones([
      { id: 1, name: "Zone-1", isPrimary: true, observerCount: 2 },
      { id: 2, name: "Zone-2", isPrimary: true, observerCount: 2 },
    ]);
    setIsPaused(false);
    setIsScaledOut(false);
    setPrimarySwitched(false);
    setJustCompletedScaleOut(false);

    // 重置 refs
    currentValuesRef.current = { qps: 5000, tps: 4000 };
    targetValuesRef.current = { qps: 5000, tps: 4000 };
    logIdRef.current = 0;
    isStableRef.current = false;
    promotionStableStartRef.current = null;
    postPromotionStableStartRef.current = null;
    switchingStartTimeRef.current = null;
    preSwitchValuesRef.current = { qps: 5000, tps: 4000 };
    scenarioStartTimeRef.current = Date.now();
    previousScenarioRef.current = "normal";
    cycleCountRef.current = 0;
    recentMetricsRef.current = [];

    setMetricsStableTime(0);
    setIsMetricsStable(false);

    // 添加重置日志
    addLog("系统已重置到初始状态", "info");
  };

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

    // 重置所有相关的ref和状态，确保每轮都是干净的状态
    switchingStartTimeRef.current = null;
    promotionStableStartRef.current = null;
    postPromotionStableStartRef.current = null;
    isStableRef.current = false;
    recentMetricsRef.current = [];
    setIsMetricsStable(false);
    setPrimarySwitched(false);
    setJustCompletedScaleOut(false);

    setScalingDirection("scale-out"); // 设置扩容方向

    const currentZones = zones.map((z) => z.name).join(", ");
    addLog("🚀 开始扩容操作：平滑替换 Zone", "info");
    addLog(`📝 当前 Zone: ${currentZones} (各2台 OBServer)`, "info");

    // 使用循环的Zone ID：当前是 1,2 -> 新的是 3,4；当前是 3,4 -> 新的是 1,2
    const currentIds = zones.map((z) => z.id).sort();
    let newId1, newId2;
    if (currentIds[0] === 1 && currentIds[1] === 2) {
      newId1 = 3;
      newId2 = 4;
    } else {
      newId1 = 1;
      newId2 = 2;
    }

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
    // 不要设置为 scaling-out-migrating，保持在 switching-primary 状态，这样流程面板会继续显示
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
    // 保持在 switching-primary 状态，不要切换到 scaling-out-migrating
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
    setScalingState("completed"); // 设置为完成状态，保持流程面板显示

    await new Promise((resolve) => setTimeout(resolve, 500));
    addLog(`✅ 扩容流程完成！性能提升，承载更多流量`, "success");
    addLog(
      `📌 新配置：2F1A (Zone-${newId1}[4台主可用区], Zone-${newId2}[4台])`,
      "success"
    );

    // 等待3秒后再隐藏流程面板 - 确保用户能看到所有步骤完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 同时重置状态和方向，避免流程面板提前消失
    setScalingState("idle");
    setScalingDirection(null);

    // 扩容完成后，重置 previousScenarioRef，避免影响下一轮循环
    previousScenarioRef.current = "normal";
    setJustCompletedScaleOut(true); // 标记扩容刚完成
  };

  // Handle scaling in: 2F1A (4台/zone) -> 切换主区 -> 4F1A -> 2F1A (2台/zone)
  const handleScaleIn = async () => {
    if (scalingState !== "idle" || config === "4F1A" || !isScaledOut) return;

    // 重置所有相关的ref和状态，确保每轮都是干净的状态
    switchingStartTimeRef.current = null;
    promotionStableStartRef.current = null;
    postPromotionStableStartRef.current = null;
    isStableRef.current = false;
    recentMetricsRef.current = [];
    setIsMetricsStable(false);
    setPrimarySwitched(false);

    setScalingDirection("scale-in"); // 设置缩容方向

    const currentZones = zones.map((z) => z.name).join(", ");
    addLog("🔽 开始缩容操作：平滑替换 Zone", "info");
    addLog(`📝 当前 Zone: ${currentZones} (各4台 OBServer)`, "info");

    // 使用循环的Zone ID：当前是 3,4 -> 新的是 1,2；当前是 1,2 -> 新的是 3,4
    const currentIds = zones.map((z) => z.id).sort();
    let newId1, newId2;
    if (currentIds[0] === 3 && currentIds[1] === 4) {
      newId1 = 1;
      newId2 = 2;
    } else {
      newId1 = 3;
      newId2 = 4;
    }

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
    // 不要设置为 scaling-in-migrating，保持在 switching-primary 状态，这样流程面板会继续显示
    setPrimarySwitched(true);

    // 此时 4 个 Zone 同时存在：新 Zone 为主可用区（Leader+Follower），旧 Zone 备区（Follower）
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
    setScalingState("completed"); // 设置为完成状态，保持流程面板显示

    await new Promise((resolve) => setTimeout(resolve, 500));
    addLog(`✅ 缩容流程完成！性能下降，配正常流量`, "success");
    addLog(
      `📌 新配置：2F1A (Zone-${newId1}[2台主可用区], Zone-${newId2}[2台])`,
      "success"
    );

    // 等待3秒后再隐藏流程面板 - 确保用户能看到所有步骤完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 同时重置状态和方向，避免流程面板提前消失
    setScalingState("idle");
    setScalingDirection(null);
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
      "warming-up": 10, // 预热阶段 10 秒
      peak: 15, // 大促持续 15 秒
      "cooling-down": 10, // 大促降温 10 秒
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
      // 立即切换，不需要延迟
      addLog("🤖 [自动模式] 扩容完成，立即切换到预热阶段", "info");
      previousScenarioRef.current = scenario;
      setScenario("warming-up");
      setJustCompletedScaleOut(false); // 重置标记
      cycleCountRef.current++; // 增加循环计数，确保下一轮等待 20 秒
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

          // 等待3秒后，再检查流量是否平稳
          const checkStable = setInterval(() => {
            if (isMetricsStable) {
              clearInterval(checkStable);
              addLog("🤖 [自动模式] 流量已平稳，开始缩容", "info");
              handleScaleIn();
            }
          }, 1000); // 每秒检查一次
        }, 3000); // 进入 normal 阶段后等待 3 秒（从10秒缩短到3秒）

        return () => clearTimeout(waitTimer);
      }
      // 否则，如果还未扩容，说明是初始正常流量或容后的正常流量，需要提前扩容为下一轮大促做准备
      else if (!isScaledOut) {
        // 区分首次开启自动模式和缩容后的下一轮扩容
        // 首次开启时 cycleCountRef.current === 0，立即开始扩容
        // 缩容后的下一轮，等待 20 秒展示稳定状态
        const delay = cycleCountRef.current === 0 ? 2000 : 20000;

        // 如果不是首轮，在扩容前 5 秒添加提示
        if (cycleCountRef.current > 0) {
          const notifyTimer = setTimeout(() => {
            addLog("🔔 [自动模式] 下一轮循环即将开始（5秒后）...", "warning");
          }, 15000); // 15 秒后提示（扩容前 5 秒）

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
          // 预热阶段：基于时间的平滑上升（5k → 28k），10秒内完成
          const warmingDuration = 10000; // 10 秒总时间
          const warmingElapsed = Date.now() - scenarioStartTimeRef.current;
          const warmingProgress = Math.min(warmingElapsed / warmingDuration, 1); // 0 到 1

          // 使用缓动函数（ease-in-out）使过渡更平滑
          // y = 3x^2 - 2x^3 (Smoothstep function)
          const smoothProgress =
            warmingProgress * warmingProgress * (3 - 2 * warmingProgress);

          // 平滑上升：从 5k 上升到 28k
          targetQPS = 5000 + (28000 - 5000) * smoothProgress;
          targetTPS = 4000 + (22000 - 4000) * smoothProgress;
          break;
        case "peak":
          // 大促高峰：保持在28k
          targetQPS = 28000;
          targetTPS = 22000;
          break;
        case "cooling-down":
          // 降温阶段：基于时间的平滑下降（28k → 5k），不受扩缩容状态影响
          const coolingDuration = 10000; // 10 秒总时间
          const elapsedTime = Date.now() - scenarioStartTimeRef.current;
          const progress = Math.min(elapsedTime / coolingDuration, 1); // 0 到 1

          // 使用缓动函数（ease-in-out）使过渡更平滑
          const smoothCoolingProgress =
            progress * progress * (3 - 2 * progress);

          // 平滑下降：从 28k 降到 5k
          targetQPS = 28000 - (28000 - 5000) * smoothCoolingProgress;
          targetTPS = 22000 - (22000 - 4000) * smoothCoolingProgress;
          break;
      }

      // 更新目标值
      targetValuesRef.current = { qps: targetQPS, tps: targetTPS };

      // 根据场景使用不同的过渡策略
      let newQPS: number;
      let newTPS: number;

      const currentQPS = currentValuesRef.current.qps;
      const currentTPS = currentValuesRef.current.tps;

      // warming-up 和 cooling-down 阶段：混合策略，前1秒使用平滑过渡，之后直接使用目标值
      // normal 和 peak 阶段：使用平滑过渡
      if (scenario === "warming-up" || scenario === "cooling-down") {
        const elapsed = Date.now() - scenarioStartTimeRef.current;

        if (elapsed < 1000) {
          // 前1秒使用平滑过渡，避免突然的跳跃
          const blendFactor = elapsed / 1000; // 0 到 1
          const smoothFactor = 0.3;
          const smoothValue =
            currentQPS + (targetQPS - currentQPS) * smoothFactor;
          // 从平滑值逐渐过渡到目标值
          newQPS = smoothValue + (targetQPS - smoothValue) * blendFactor;
          newTPS =
            currentTPS +
            (targetTPS - currentTPS) * smoothFactor +
            (targetTPS -
              (currentTPS + (targetTPS - currentTPS) * smoothFactor)) *
              blendFactor;
        } else {
          // 1秒后直接使用目标值
          newQPS = targetQPS;
          newTPS = targetTPS;
        }
      } else {
        // 正常和高峰阶段使用平滑过渡
        const smoothFactor = 0.3; // 提高平滑因子，让变化更快
        newQPS = currentQPS + (targetQPS - currentQPS) * smoothFactor;
        newTPS = currentTPS + (targetTPS - currentTPS) * smoothFactor;
      }

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
            // 不使用 smoothFactor，直接恢复到目标值
            newQPS =
              preSwitchValuesRef.current.qps * recoveredRatio +
              (targetQPS - preSwitchValuesRef.current.qps) * recoveryProgress;
            newTPS =
              preSwitchValuesRef.current.tps * recoveredRatio +
              (targetTPS - preSwitchValuesRef.current.tps) * recoveryProgress;
          }
        } else {
          // 切主完成，清除切��开始时间
          switchingStartTimeRef.current = null;
        }
      }

      // 加小幅随机波动（正常流量波动较小，让切主影响更突出）
      const variation = 0.01; // 从 0.015 减小到 0.01，让正常波动更
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
          // 如果波动范围小于 500 QPS，则认流量平稳
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
                  OceanBase 平滑扩缩容 - 电商大促场景
                </h1>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-slate-500" : "text-gray-500"
                  }`}
                >
                  基于异构 Zone 的平滑扩缩容: 2F1A (2 台 OBServer) ⇄ 4F1A ⇄ 2F1A
                  (4 台 OBServer)
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
            onReset={handleReset}
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
      <IframeCommunicator />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
