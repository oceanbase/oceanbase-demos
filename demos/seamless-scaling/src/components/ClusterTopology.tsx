import { motion, AnimatePresence } from 'motion/react';
import { Server, Database, Shield, Layers, Crown, HardDrive, Activity, AlertCircle, ArrowDown } from 'lucide-react';
import { ClusterConfig, ScalingState, ScalingDirection, ZoneInfo } from '../App';

interface ClusterTopologyProps {
  config: ClusterConfig;
  scalingState: ScalingState;
  scalingDirection: ScalingDirection;
  zones: ZoneInfo[];
  currentQPS?: number;
  theme: 'light' | 'dark';
}

export function ClusterTopology({ config, scalingState, scalingDirection, zones, currentQPS = 0, theme }: ClusterTopologyProps) {
  const getZoneStyle = (zone: ZoneInfo) => {
    if (zone.isDeleting) {
      return {
        bg: 'bg-gradient-to-br from-red-600/80 to-red-700/80',
        border: 'border-red-500 border-dashed',
        shadow: 'shadow-red-500/30',
        icon: 'text-red-100',
        text: 'text-red-100',
        subtext: 'text-red-200',
        badge: 'bg-red-500',
        badgeText: '删除中',
      };
    }
    if (zone.isOld) {
      return {
        bg: 'bg-gradient-to-br from-red-600/80 to-red-700/80',
        border: 'border-red-500',
        shadow: 'shadow-red-500/30',
        icon: 'text-red-100',
        text: 'text-red-100',
        subtext: 'text-red-200',
        badge: 'bg-red-500',
        badgeText: '删除中',
      };
    }
    if (zone.isNew) {
      return {
        bg: 'bg-gradient-to-br from-green-600 to-green-700',
        border: 'border-green-500',
        shadow: 'shadow-green-500/30',
        icon: 'text-white',
        text: 'text-white',
        subtext: 'text-green-200',
        badge: 'bg-green-500',
        badgeText: '新增',
      };
    }
    return {
      bg: 'bg-gradient-to-br from-blue-600 to-blue-700',
      border: 'border-blue-500',
      shadow: 'shadow-blue-500/20',
      icon: 'text-white',
      text: 'text-white',
      subtext: 'text-blue-200',
      badge: null,
      badgeText: null,
    };
  };

  const isScaling = scalingState !== 'idle';
  const isMigrating = scalingState === 'scaling-out-migrating' || scalingState === 'scaling-in-migrating';
  const isSwitchingPrimary = scalingState === 'switching-primary';
  const hasOldZones = zones.some(z => z.isOld || z.isDeleting); // 检查是否有旧Zone或正在删除的Zone（表示已切主）
  const showSyncLabel = isScaling && !isMigrating && !hasOldZones; // 切主后不再显示标签
  
  const primaryZone = zones.find(z => z.isPrimary);
  const oldPrimaryZone = zones.find(z => z.isOld && !z.isPrimary);
  
  const totalObservers = zones.reduce((sum, zone) => sum + zone.observerCount, 0);

  return (
    <div className={`rounded-lg p-3 h-full flex flex-col border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className={`flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-gray-900'}`}>
          <Database className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
          OceanBase 集群拓扑
        </h2>
      </div>
      
      <div className="flex-1 overflow-visible" style={{ minHeight: 0 }}>
        <div className="space-y-3">
          {/* Database Cluster Level */}
          <div className={`rounded-lg border ${theme === 'dark' ? 'border-slate-700' : 'border-gray-300'}`} style={{ padding: '12px 12px 12px 12px' }}>
            {/* Zones Grid - 使用水平滚动，不换行 */}
            <div className="overflow-x-auto mb-3 overflow-y-visible" style={{ maxWidth: '100%', marginTop: '-4px', paddingTop: '8px', paddingBottom: '4px', paddingRight: '8px', paddingLeft: '4px' }}>
              <div className="flex gap-2.5 flex-nowrap" style={{ minWidth: 'max-content' }}>
                <AnimatePresence mode="popLayout">
                  {zones.map((zone) => {
                    const style = getZoneStyle(zone);
                    const showLeader = zone.isPrimary;

                    return (
                      <motion.div
                        key={zone.id}
                        layout
                        initial={{ scale: 0, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0, y: 20 }}
                        transition={{ 
                          layout: { duration: 0.3 },
                          opacity: { duration: 0.3 },
                          scale: { duration: 0.3 }
                        }}
                        className="relative"
                        style={{ minWidth: '180px', maxWidth: '220px', overflow: 'visible' }}
                      >
                        {/* Badge for new/old zones - 移到最外层，确保不被遮挡 */}
                        {style.badge && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`absolute px-2 py-0.5 ${style.badge} text-white text-xs rounded-full shadow-lg`}
                            style={{ top: '-6px', left: '-6px', zIndex: 20 }}
                          >
                            {style.badgeText}
                          </motion.div>
                        )}

                        {/* Zone Container */}
                        <div className={`border-2 rounded-lg p-3 ${
                          zone.showWarning
                            ? 'bg-slate-800/50 border-red-500 shadow-lg shadow-red-500/30'
                            : zone.isPrimary 
                              ? theme === 'dark'
                                ? 'bg-slate-800/70 border-amber-500 shadow-lg shadow-amber-500/30'
                                : 'bg-amber-50 border-amber-400 shadow-lg shadow-amber-400/20'
                              : theme === 'dark'
                                ? 'bg-slate-800/50 border-slate-700'
                                : 'bg-gray-100 border-gray-300'
                        }`}>
                          {/* Zone Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1">
                              <div className={`text-sm ${
                                zone.isPrimary 
                                  ? theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                                  : theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                              }`}>
                                {zone.name}
                              </div>
                              {zone.isPrimary && (
                                <Crown className={`w-4 h-4 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />
                              )}
                            </div>
                            {zone.isPrimary && (
                              <div className={`text-xs px-2 py-0.5 rounded ${
                                theme === 'dark' 
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-amber-200 text-amber-700'
                              }`}>
                                主可用区
                              </div>
                            )}
                          </div>

                          {/* OBServer Nodes */}
                          <div className="space-y-2">
                            {Array.from({ length: zone.observerCount }).map((_, idx) => {
                              // 判断显示 Leader 还是 Follower
                              let replicaLabel = '';
                              if (zone.isPrimary) {
                                // 主可用区，有 Leader + Follower
                                replicaLabel = 'Leader + Follower';
                              } else {
                                // 可用区，只有 Follower
                                replicaLabel = 'Follower';
                              }

                              return (
                                <motion.div
                                  key={`${zone.id}-observer-${idx}`}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className={`${style.bg} ${style.border} border-2 shadow-lg ${style.shadow} rounded-lg p-2 relative transition-all`}
                                >
                                  <div className="flex items-center gap-2">
                                    <HardDrive className={`w-4 h-4 ${style.icon}`} />
                                    <div className="flex-1">
                                      <div className={`text-xs ${style.text}`}>OBServer-{idx + 1}</div>
                                      <div className={`text-xs ${style.subtext}`}>
                                        {replicaLabel}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Status Indicator */}
                                  <div className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-slate-800 ${
                                    zone.isNew ? 'bg-amber-500 animate-pulse' :
                                    zone.isOld ? 'bg-red-500' :
                                    (showLeader && idx === 0) ? 'bg-green-500 animate-pulse' :
                                    'bg-green-500'
                                  }`} />
                                </motion.div>
                              );
                            })}
                          </div>

                          {/* Observer count badge */}
                          <div className="mt-2 text-center">
                            <span className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                              {zone.observerCount} 台 OBServer
                            </span>
                          </div>

                          {/* Warning message */}
                          {zone.showWarning && zone.warningMessage && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2 text-center"
                            >
                              <span className="text-xs text-red-400">
                                {zone.warningMessage}
                              </span>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Arbitration Service - 弱化显示 */}
            <div className="border-t border-slate-700/50 pt-3 mt-2">
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-purple-600/20 border border-purple-500/30 rounded px-3 py-1.5 flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-400/70" />
                  <div className="text-purple-400/70 text-xs">仲裁服务 (1A)</div>
                  <div className="w-1.5 h-1.5 bg-green-500/70 rounded-full" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Status Flow - 只在非migrating状态显示 */}
          {isScaling && !isMigrating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
            >
              <div className="text-blue-400 text-xs mb-2">
                {scalingDirection === 'scale-out' ? '扩容流程' : '缩容流程'}
              </div>
              <div className="space-y-2 text-xs text-slate-300">
                {scalingDirection === 'scale-out' && (
                  <>
                    {scalingState === 'scaling-out' && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                          <span>步骤1：添加新 Zone 后，开始同步副本</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-2 h-2 bg-slate-600 rounded-full" />
                          <span>步骤2：副本同步完成，切换主可用区</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-2 h-2 bg-slate-600 rounded-full" />
                          <span>步骤3：删除旧 Zone，完成每个 Zone 的 OBServer 数从 2 -&gt; 4 的扩容</span>
                        </div>
                      </>
                    )}
                    {scalingState === 'switching-primary' && !hasOldZones && (
                      <>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤1：添加新 Zone 后，开始同步副本 ✓</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                          <span>步骤2：副本同步完成，切换主可用区</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-2 h-2 bg-slate-600 rounded-full" />
                          <span>步骤3：删除旧 Zone，完成每个 Zone 的 OBServer 数从 2 -&gt; 4 的扩容</span>
                        </div>
                      </>
                    )}
                    {scalingState === 'switching-primary' && hasOldZones && (
                      <>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤1：添加新 Zone 后，开始同步副本 ✓</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤2：副本同步完成，切换主可用区 ✓</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                          <span>步骤3：删除旧 Zone，完成每个 Zone 的 OBServer 数从 2 -&gt; 4 的扩容</span>
                        </div>
                      </>
                    )}
                    {scalingState === 'completed' && (
                      <>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤1：添加新 Zone 后，开始同步副本 ✓</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤2：副本同步完成，切换主可用区 ✓</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤3：删除旧 Zone，完成每个 Zone 的 OBServer 数从 2 -&gt; 4 的扩容 ✓</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                {scalingDirection === 'scale-in' && (
                  <>
                    {scalingState === 'scaling-in' && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                          <span>步骤1：添加新 Zone 后，开始同步副本</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-2 h-2 bg-slate-600 rounded-full" />
                          <span>步骤2：副本同步完成，切换主可用区</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-2 h-2 bg-slate-600 rounded-full" />
                          <span>步骤3：删除旧 Zone，完成每个 Zone 的 OBServer 数从 4 -&gt; 2 的缩容</span>
                        </div>
                      </>
                    )}
                    {scalingState === 'switching-primary' && !hasOldZones && (
                      <>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤1：添加新 Zone 后，开始同步副本 ✓</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                          <span>步骤2：副本同步完成，切换主可用区</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <div className="w-2 h-2 bg-slate-600 rounded-full" />
                          <span>步骤3：删除旧 Zone，完成每个 Zone 的 OBServer 数从 4 -&gt; 2 的缩容</span>
                        </div>
                      </>
                    )}
                    {scalingState === 'switching-primary' && hasOldZones && (
                      <>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤1：添加新 Zone 后，开始同步副本 ✓</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤2：副本同步完成，切换主可用区 ✓</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                          <span>步骤3：删除旧 Zone，完成每个 Zone 的 OBServer 数从 4 -&gt; 2 的缩容</span>
                        </div>
                      </>
                    )}
                    {scalingState === 'completed' && (
                      <>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤1：添加新 Zone 后，开始同步副本 ✓</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤2：副本同步完成，切换主可用区 ✓</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span>步骤3：删除旧 Zone，完成每个 Zone 的 OBServer 数从 4 -&gt; 2 的缩容 ✓</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}