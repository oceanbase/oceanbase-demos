import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { MetricsData, LogEvent, ScalingState } from '../App';

interface MetricsPanelProps {
  metrics: MetricsData[];
  logs?: LogEvent[];
  theme: 'light' | 'dark';
}

interface PhaseArea {
  start: number;
  end: number;
  phase: string;
  color: string;
  scalingState?: ScalingState;
  isCurrentPhase?: boolean; // 标记是否是当前正在进行的阶段
}

interface PrimarySwitchMarker {
  time: number;
  label: string;
}

interface ScalingEventMarker {
  time: number;
  label: string;
  type: 'scale-out' | 'scale-in' | 'switch-primary';
  color: string;
}

export function MetricsPanel({ metrics, logs = [], theme }: MetricsPanelProps) {
  if (metrics.length === 0) {
    return (
      <div className={`rounded-lg p-6 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
        <h2 className={`mb-6 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
          <TrendingUp className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
          实时性能监控
        </h2>
        <div className={`text-center py-12 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>等待数据...</div>
      </div>
    );
  }

  // 固定显示60个数据点，始终使用最后60个
  const FIXED_CHART_POINTS = 60;
  const displayMetrics = metrics.slice(-FIXED_CHART_POINTS);
  
  // 先生成图表数据，确定显示的时间窗口
  const chartData = displayMetrics.map((m) => ({
    time: m.timestamp,
    QPS: Math.round(m.qps),
    TPS: Math.round(m.tps),
    scalingPhase: m.scalingPhase,
    scenario: m.scenario,
    scalingState: m.scalingState,
  }));
  
  console.log('Chart Data Points:', chartData.length, '(固定显示60个点)');

  // 获取图表显示的时间窗口
  const chartStartTime = chartData[0]?.time || 0;
  const chartEndTime = chartData[chartData.length - 1]?.time || 0;
  
  // 获取当前最新的场景（从最后一个数据点）
  const currentScenario = chartData[chartData.length - 1]?.scenario || 'normal';

  console.log('MetricsPanel Debug:', {
    dataPoints: chartData.length,
    currentScenario,
    lastDataPoint: chartData[chartData.length - 1],
    scenarioAreasCount: 0, // 将在后面计算
  });

  // 找到主可用区切换事件的时间戳
  const primarySwitchMarkers: PrimarySwitchMarker[] = logs
    .filter(log => log.isPrimarySwitchEvent)
    .map(log => ({
      time: log.timestamp,
      label: '主可用区切换',
    }));

  // 找到扩缩容阶段的区域（使用全部数据，基于详细的 scalingState）
  const phaseAreas: PhaseArea[] = [];
  let currentState: ScalingState | undefined = chartData[0]?.scalingState || 'idle';
  let stateStart = chartData[0]?.time || 0;

  chartData.forEach((point, idx) => {
    // 检测状态变化或到达最后一个点
    if (point.scalingState !== currentState || idx === chartData.length - 1) {
      // 计算结束时间
      const endTime = idx === chartData.length - 1 && point.scalingState === currentState 
        ? point.time 
        : point.time;
      
      // 根据详细的 scalingState 生成阶段标记
      if (currentState && currentState !== 'idle') {
        let label = '';
        let color = '';
        
        switch (currentState) {
          case 'scaling-out':
            label = '扩容：添加新Zone+同步';
            color = '#eab308'; // 黄色
            break;
          case 'switching-primary':
            label = '切换主可用区';
            color = '#a855f7'; // 紫色
            break;
          case 'scaling-out-migrating':
            label = '扩容：删除旧Zone';
            color = '#f97316'; // 橙色
            break;
          case 'scaling-in':
            label = '缩容：添加新Zone+同步';
            color = '#eab308'; // 黄色
            break;
          case 'scaling-in-migrating':
            label = '缩容：删除旧Zone';
            color = '#f97316'; // 橙色
            break;
        }
        
        if (label && endTime >= stateStart) {
          phaseAreas.push({
            start: stateStart,
            end: endTime,
            phase: label,
            color,
            scalingState: currentState,
          });
        }
      }

      currentState = point.scalingState;
      stateStart = point.time;
    }
  });

  // 找到场景阶段的区域（使用全部数据）
  const scenarioAreas: PhaseArea[] = [];
  
  if (chartData.length > 0) {
    let currentScen = chartData[0]?.scenario || 'normal';
    let scenStart = chartData[0]?.time || 0;

    chartData.forEach((point, idx) => {
      const isLastPoint = idx === chartData.length - 1;
      const scenarioChanged = point.scenario !== currentScen;
      
      if (scenarioChanged || isLastPoint) {
        // 确定结束时间
        // 场景变化时：旧场景结束于前一个数据点
        // 最后一个点且未变化：用当前点时间
        const endTime = scenarioChanged && idx > 0
          ? chartData[idx - 1].time  // 场景变化时，旧场景结束于前一个点
          : point.time;  // 最后一个点或第一个点，用当前点时间
        
        // 记录当前阶段（只有在有效范围内才记录）
        if (endTime >= scenStart) {
          let label = '';
          let color = '';
          switch (currentScen) {
            case 'normal':
              label = '正常流量';
              color = '#64748b';
              break;
            case 'warming-up':
              label = '大促预热';
              color = '#f59e0b';
              break;
            case 'peak':
              label = '大促高峰';
              color = '#ef4444';
              break;
            case 'cooling-down':
              label = '大促降温';
              color = '#10b981';
              break;
          }
          
          if (label) {
            scenarioAreas.push({
              start: scenStart,
              end: endTime,
              phase: label,
              color,
              isCurrentPhase: isLastPoint && !scenarioChanged, // 只有最后一个点且场景未变化才标记为当前阶段
            });
          }
        }

        // 开始新的阶段（如果场景变化了）
        if (scenarioChanged) {
          currentScen = point.scenario || 'normal';
          scenStart = point.time;  // 新阶段从当前点开始
          
          // 如果这是最后一个点，还需要记录这个新阶段（单点阶段）
          if (isLastPoint) {
            let label = '';
            let color = '';
            switch (currentScen) {
              case 'normal':
                label = '正常流量';
                color = '#64748b';
                break;
              case 'warming-up':
                label = '大促预热';
                color = '#f59e0b';
                break;
              case 'peak':
                label = '大促高峰';
                color = '#ef4444';
                break;
              case 'cooling-down':
                label = '大促降温';
                color = '#10b981';
                break;
            }
            
            if (label) {
              scenarioAreas.push({
                start: scenStart,
                end: point.time,
                phase: label,
                color,
                isCurrentPhase: true,
              });
            }
          }
        }
      }
    });
  }

  console.log('Scenario Areas:', scenarioAreas);
  console.log('Current Scenario from last data:', currentScenario);

  // 格式化时间显示
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };
  
  // 过滤并裁剪阶段区域，使其只显示在当前时间窗口内的部分
  const visiblePhaseAreas = phaseAreas
    .filter(area => area.end >= chartStartTime && area.start <= chartEndTime)
    .map(area => ({
      ...area,
      start: Math.max(area.start, chartStartTime),
      end: Math.min(area.end, chartEndTime),
    }));

  const visibleScenarioAreas = scenarioAreas
    .filter(area => area.end >= chartStartTime && area.start <= chartEndTime)
    .map(area => ({
      ...area,
      start: Math.max(area.start, chartStartTime),
      // 如果是当前阶段，延伸到最后
      end: area.isCurrentPhase ? Math.max(area.end, chartEndTime) : Math.min(area.end, chartEndTime),
    }));

  // 将场景区域转换为基于数据点索引的位置，确保与图表完美对齐
  const scenarioAreasWithPosition = visibleScenarioAreas.map(area => {
    // 找到最接近起始时间的数据点索引
    let startIdx = 0;
    let endIdx = chartData.length - 1;
    
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i].time >= area.start) {
        startIdx = i;
        break;
      }
    }
    
    // 找到最接近结束时间的数据点索引
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].time <= area.end) {
        endIdx = i;
        break;
      }
    }
    
    // 如果是当前阶段，延伸到最后
    if (area.isCurrentPhase) {
      endIdx = chartData.length - 1;
    }
    
    // 计算基于数据点索引的百分比位置
    const totalPoints = chartData.length - 1;
    const startPercent = totalPoints > 0 ? (startIdx / totalPoints) * 100 : 0;
    const endPercent = totalPoints > 0 ? (endIdx / totalPoints) * 100 : 100;
    const widthPercent = endPercent - startPercent;
    
    return {
      ...area,
      startPercent,
      widthPercent,
      startIdx,
      endIdx,
    };
  });

  // 过滤在当前图表时间窗口内的主区切换标记
  const visiblePrimarySwitchMarkers = primarySwitchMarkers.filter(
    marker => marker.time >= chartStartTime && marker.time <= chartEndTime
  );

  // 检测扩缩容关键件：开始扩容、扩容后切主、开始缩容、缩容后切主
  const scalingEventMarkers: ScalingEventMarker[] = [];
  let prevState: ScalingState | undefined = undefined;
  let lastScalingType: 'scale-out' | 'scale-in' | null = null; // 记录最近的扩缩容类型
  
  // 使用Set来记录已经添加过的事件，避免重复
  const addedEvents = new Set<string>();
  
  chartData.forEach((point, idx) => {
    const currentState = point.scalingState;
    
    // 避免初始状态为 undefined
    if (idx === 0) {
      prevState = currentState;
      return;
    }
    
    // 检测从 idle 到 scaling-out（开始扩容）
    if (prevState === 'idle' && currentState === 'scaling-out') {
      const eventKey = `scale-out-${point.time}`;
      if (!addedEvents.has(eventKey)) {
        scalingEventMarkers.push({
          time: point.time,
          label: '开始扩容',
          type: 'scale-out',
          color: '#22c55e', // 绿色
        });
        lastScalingType = 'scale-out'; // 记录为扩容
        addedEvents.add(eventKey);
      }
    }
    // 检测扩容后的切主（从 scaling-out 到 switching-primary）
    else if (prevState === 'scaling-out' && currentState === 'switching-primary') {
      // 根据最近的扩缩容类型判断：如果最近是扩容，则这是扩容后切主
      if (lastScalingType === 'scale-out') {
        const eventKey = `switch-primary-scale-out-${point.time}`;
        if (!addedEvents.has(eventKey)) {
          scalingEventMarkers.push({
            time: point.time,
            label: '扩容后切主',
            type: 'switch-primary',
            color: '#a855f7', // 紫色
          });
          addedEvents.add(eventKey);
        }
      }
    }
    // 检测从 idle 到 scaling-in（开始缩容）
    else if (prevState === 'idle' && currentState === 'scaling-in') {
      const eventKey = `scale-in-${point.time}`;
      if (!addedEvents.has(eventKey)) {
        scalingEventMarkers.push({
          time: point.time,
          label: '开始缩容',
          type: 'scale-in',
          color: '#f59e0b', // 橙色
        });
        lastScalingType = 'scale-in'; // 记录为缩容
        addedEvents.add(eventKey);
      }
    }
    // 检测缩容后的切主（从 scaling-in 到 switching-primary）
    else if (prevState === 'scaling-in' && currentState === 'switching-primary') {
      // 根据最近的扩缩容类型判断：如果最近是缩容，则这是缩容后切主
      if (lastScalingType === 'scale-in') {
        const eventKey = `switch-primary-scale-in-${point.time}`;
        if (!addedEvents.has(eventKey)) {
          scalingEventMarkers.push({
            time: point.time,
            label: '缩容后切主',
            type: 'switch-primary',
            color: '#a855f7', // 紫色
          });
          addedEvents.add(eventKey);
        }
      }
    }
    
    prevState = currentState;
  });

  console.log('扩缩容事件标记:', scalingEventMarkers);

  // 过滤在当前图表时间窗口内的扩缩容事件标记
  const visibleScalingEventMarkers = scalingEventMarkers.filter(
    marker => marker.time >= chartStartTime && marker.time <= chartEndTime
  );

  return (
    <div className={`rounded-lg p-4 h-full flex flex-col border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <h2 className={`mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
        <TrendingUp className={`w-5 h-5 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
        实时性能监控
      </h2>

      {/* QPS & TPS Chart */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-500" />
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>QPS (查询/秒)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-purple-500" />
              <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-gray-700'}`}>TPS (事务/秒)</span>
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-2 flex-1 ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-gray-100'}`}>
          {/* Chart with exact width control */}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{ top: 25, right: 30, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                tick={{ fontSize: 11 }}
                tickFormatter={formatTime}
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                labelStyle={{
                  color: theme === 'dark' ? '#cbd5e1' : '#e2e8f0'
                }}
                labelFormatter={formatTime}
              />

              {/* 主可用区切换的垂直线标记 */}
              {visiblePrimarySwitchMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={`switch-${idx}`}
                  x={marker.time}
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={({viewBox}) => {
                    const x = viewBox?.x || 0;
                    const y = viewBox?.y || 0;
                    const labelWidth = 110; // 增加度以适应中文
                    return (
                      <g>
                        <rect
                          x={x - labelWidth / 2}
                          y={y - 8}
                          width={labelWidth}
                          height={16}
                          fill="#1e293b"
                          stroke="#a855f7"
                          strokeWidth={1}
                          rx={3}
                        />
                        <text
                          x={x}
                          y={y + 4}
                          fill="#a855f7"
                          fontSize={11}
                          textAnchor="middle"
                        >
                          切换主可用区
                        </text>
                      </g>
                    );
                  }}
                />
              ))}

              {/* 扩缩容关键事件的垂直线记 */}
              {visibleScalingEventMarkers.map((marker, idx) => (
                <ReferenceLine
                  key={`scale-${idx}`}
                  x={marker.time}
                  stroke={marker.color}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={({viewBox}) => {
                    const x = viewBox?.x || 0;
                    const y = viewBox?.y || 0;
                    // 根据中文字符计算宽度，中文大约10px一个字符
                    const labelWidth = marker.label.length * 10 + 16;
                    return (
                      <g>
                        <rect
                          x={x - labelWidth / 2}
                          y={y - 8}
                          width={labelWidth}
                          height={16}
                          fill="#1e293b"
                          stroke={marker.color}
                          strokeWidth={1}
                          rx={3}
                        />
                        <text
                          x={x}
                          y={y + 4}
                          fill={marker.color}
                          fontSize={11}
                          textAnchor="middle"
                        >
                          {marker.label}
                        </text>
                      </g>
                    );
                  }}
                />
              ))}

              <Line 
                type="monotone" 
                dataKey="QPS" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                dot={false}
                name="QPS"
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="TPS" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={false}
                name="TPS"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Phase indicators - 确保和图表时间轴对齐 */}
        <div className={`rounded-lg p-2 mt-2 ${theme === 'dark' ? 'bg-slate-800/30' : 'bg-gray-100'}`}>
          {/* Scenario phases */}
          <div className="mb-2">
            <div className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>业务阶段</div>
            {/* 精确匹配图表的绘图区域：使用与图表完全相同的margin */}
            <div className="relative h-5 rounded overflow-hidden">
              {/* 添加左右边距容器，确保与图表绘图区域完全对齐 */}
              <div className="absolute inset-0" style={{ marginLeft: '35px', marginRight: '30px' }}>
                {scenarioAreasWithPosition.length > 0 ? (
                  scenarioAreasWithPosition.map((area, idx) => {
                    // 使用基于数据点索引计算的位置
                    let finalStartPercent = area.startPercent;
                    let finalWidthPercent = area.widthPercent;
                    
                    // 填补缺口：如果这不是第一个区域，并且与前一个区域之间有缺口
                    if (idx > 0) {
                      const prevArea = scenarioAreasWithPosition[idx - 1];
                      const prevEndPercent = prevArea.startPercent + prevArea.widthPercent;
                      const gap = finalStartPercent - prevEndPercent;
                      
                      // 如果有明显缺口，从前一个区域结束位置开始
                      if (gap > 0.5) {
                        const originalEndPercent = finalStartPercent + finalWidthPercent;
                        finalStartPercent = prevEndPercent;
                        finalWidthPercent = originalEndPercent - finalStartPercent;
                      }
                    }
                    
                    // 边界检查
                    finalStartPercent = Math.max(0, Math.min(100, finalStartPercent));
                    finalWidthPercent = Math.max(0, Math.min(100 - finalStartPercent, finalWidthPercent));
                    
                    // 如果宽度太小，不显示
                    if (finalWidthPercent < 0.1 || finalStartPercent >= 100) {
                      return null;
                    }
                    
                    // 计算实际像素宽度（用于判断是否显示文字）
                    const containerWidth = 800;
                    const actualWidth = (finalWidthPercent / 100) * containerWidth;
                    const showText = actualWidth >= 50;
                    
                    console.log(`场景 ${area.phase}:`, {
                      startIdx: area.startIdx,
                      endIdx: area.endIdx,
                      startPercent: finalStartPercent.toFixed(2),
                      widthPercent: finalWidthPercent.toFixed(2),
                      startTime: formatTime(area.start),
                      endTime: formatTime(area.end),
                    });
                    
                    return (
                      <div
                        key={`${area.phase}-${area.startIdx}-${idx}`}
                        className="absolute flex items-center justify-center text-white text-xs h-full"
                        style={{
                          left: `${finalStartPercent}%`,
                          width: `${finalWidthPercent}%`,
                          backgroundColor: area.color,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                        }}
                      >
                        {showText && <span className="px-2">{area.phase}</span>}
                      </div>
                    );
                  })
                ) : null}
              </div>
            </div>
          </div>

          {/* Scaling phases - 暂时注释掉 */}
          {/* 
          <div>
            <div className="text-xs text-slate-400 mb-1">扩缩容阶段</div>
            {/* 使用相同的 margin 确保和图表对齐 * /}
            <div className="relative h-5" style={{ marginLeft: '41px', marginRight: '36px' }}>
              {visiblePhaseAreas.length > 0 ? (
                visiblePhaseAreas.map((area, idx) => {
                  const totalDuration = chartData[chartData.length - 1]?.time - chartData[0]?.time || 1;
                  const areaDuration = area.end - area.start;
                  const startPercent = ((area.start - chartData[0]?.time) / totalDuration) * 100;
                  const widthPercent = (areaDuration / totalDuration) * 100;
                  
                  // 计算实际像素宽度
                  const containerWidth = 800;
                  const actualWidth = (widthPercent / 100) * containerWidth;
                  const showText = actualWidth >= 80;
                  
                  return (
                    <div
                      key={idx}
                      className="absolute flex items-center justify-center text-white text-xs rounded"
                      style={{
                        left: `${startPercent}%`,
                        width: `${widthPercent}%`,
                        backgroundColor: area.color,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                      }}
                    >
                      {showText && <span className="px-2">{area.phase}</span>}
                    </div>
                  );
                })
              ) : (
                <div className="h-full bg-slate-700/30 rounded" />
              )}
            </div>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}