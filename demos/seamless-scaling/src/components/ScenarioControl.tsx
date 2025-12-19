import React from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import { Play, Pause, Activity, TrendingUp, Zap, TrendingDown, ArrowUpCircle, ArrowDownCircle, RefreshCw, Loader2, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Scenario, ScalingState, ScalingDirection } from '../App';

interface ScenarioControlProps {
  scenario: Scenario;
  isPaused: boolean;
  onTogglePause: () => void;
  theme: 'light' | 'dark';
  scalingState: ScalingState;
  scalingDirection: ScalingDirection;
  onReset: () => void;
}

export function ScenarioControl({
  scenario,
  isPaused,
  onTogglePause,
  theme,
  scalingState,
  scalingDirection,
  onReset,
}: ScenarioControlProps) {
  const intl = useIntl();
  
  const scenarioInfo = {
    normal: { 
      labelId: 'scenario.normal', 
      icon: Activity, 
      color: theme === 'dark' ? 'text-blue-400' : 'text-blue-600', 
      bg: theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50' 
    },
    'warming-up': { 
      labelId: 'scenario.warmingUp', 
      icon: TrendingUp, 
      color: theme === 'dark' ? 'text-amber-400' : 'text-amber-600', 
      bg: theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50' 
    },
    peak: { 
      labelId: 'scenario.peak', 
      icon: Zap, 
      color: theme === 'dark' ? 'text-red-400' : 'text-red-600', 
      bg: theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50' 
    },
    'cooling-down': { 
      labelId: 'scenario.coolingDown', 
      icon: TrendingDown, 
      color: theme === 'dark' ? 'text-green-400' : 'text-green-600', 
      bg: theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50' 
    },
  };

  const currentInfo = scenarioInfo[scenario];
  const Icon = currentInfo.icon;

  // 获取当前操作状态信息
  const getOperationInfo = () => {
    if (scalingState === 'idle') {
      return {
        labelId: 'operation.idle',
        icon: Activity,
        color: theme === 'dark' ? 'text-slate-400' : 'text-gray-500',
        bg: theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-100',
      };
    }

    // 扩容流程
    if (scalingDirection === 'scale-out') {
      if (scalingState === 'scaling-out') {
        return {
          labelId: 'operation.scaleOut.addZone',
          icon: ArrowUpCircle,
          color: theme === 'dark' ? 'text-blue-400' : 'text-blue-600',
          bg: theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-50',
          animated: true,
        };
      } else if (scalingState === 'switching-primary') {
        return {
          labelId: 'operation.scaleOut.switchPrimary',
          icon: RefreshCw,
          color: theme === 'dark' ? 'text-purple-400' : 'text-purple-600',
          bg: theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50',
          animated: true,
        };
      } else if (scalingState === 'scaling-out-migrating') {
        return {
          labelId: 'operation.scaleOut.deleteOld',
          icon: Loader2,
          color: theme === 'dark' ? 'text-green-400' : 'text-green-600',
          bg: theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50',
          animated: true,
        };
      }
    }

    // 缩容流程
    if (scalingDirection === 'scale-in') {
      if (scalingState === 'scaling-in') {
        return {
          labelId: 'operation.scaleIn.addZone',
          icon: ArrowDownCircle,
          color: theme === 'dark' ? 'text-amber-400' : 'text-amber-600',
          bg: theme === 'dark' ? 'bg-amber-500/10' : 'bg-amber-50',
          animated: true,
        };
      } else if (scalingState === 'switching-primary') {
        return {
          labelId: 'operation.scaleIn.switchPrimary',
          icon: RefreshCw,
          color: theme === 'dark' ? 'text-purple-400' : 'text-purple-600',
          bg: theme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-50',
          animated: true,
        };
      } else if (scalingState === 'scaling-in-migrating') {
        return {
          labelId: 'operation.scaleIn.deleteOld',
          icon: Loader2,
          color: theme === 'dark' ? 'text-green-400' : 'text-green-600',
          bg: theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50',
          animated: true,
        };
      }
    }

    // 默认空闲状态
    return {
      labelId: 'operation.idle',
      icon: Activity,
      color: theme === 'dark' ? 'text-slate-400' : 'text-gray-500',
      bg: theme === 'dark' ? 'bg-slate-800/50' : 'bg-gray-100',
    };
  };

  const operationInfo = getOperationInfo();
  const OperationIcon = operationInfo.icon;

  return (
    <div className={`rounded-lg p-3 border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-4">
        {/* 暂停/继续按钮 */}
        <Button
          onClick={onTogglePause}
          className={`h-9 px-4 ${
            theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4 mr-1.5" />
              <FormattedMessage id="control.continue" defaultMessage="继续演示" />
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 mr-1.5" />
              <FormattedMessage id="control.pause" defaultMessage="暂停演示" />
            </>
          )}
        </Button>

        {/* 重置按钮 */}
        <Button
          onClick={onReset}
          className={`h-9 px-4 ${
            theme === 'dark'
              ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900 border border-gray-300'
          }`}
        >
          <RotateCcw className="w-4 h-4 mr-1.5" />
          <FormattedMessage id="control.reset" defaultMessage="重置演示" />
        </Button>

        {/* 分隔线 */}
        <div className={`h-8 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'}`} />

        {/* 当前场景 */}
        <div className="flex items-center gap-3">
          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            <FormattedMessage id="scenario.current" defaultMessage="当前场景:" />
          </span>
          <div className={`${currentInfo.bg} border rounded px-3 py-1.5 flex items-center gap-2 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
            <Icon className={`w-4 h-4 ${currentInfo.color}`} />
            <span className={`${currentInfo.color} text-sm`}>
              <FormattedMessage id={currentInfo.labelId} />
            </span>
          </div>
        </div>

        {/* 当前操作 */}
        <div className="flex items-center gap-3">
          <span className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
            <FormattedMessage id="scenario.operation" defaultMessage="当前操作:" />
          </span>
          <div className={`${operationInfo.bg} border rounded px-3 py-1.5 flex items-center gap-2 ${theme === 'dark' ? 'border-slate-700' : 'border-gray-200'}`}>
            <OperationIcon className={`w-4 h-4 ${operationInfo.color} ${operationInfo.animated ? 'animate-spin' : ''}`} />
            <span className={`${operationInfo.color} text-sm`}>
              <FormattedMessage id={operationInfo.labelId} />
            </span>
          </div>
        </div>

        {/* 演示状态提示 */}
        {isPaused && (
          <>
            <div className={`h-8 w-px ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'}`} />
            <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
              <Pause className="w-4 h-4" />
              <span><FormattedMessage id="scenario.paused" defaultMessage="演示已暂停" /></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
