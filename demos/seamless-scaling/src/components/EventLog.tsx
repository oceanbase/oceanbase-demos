import React from "react";
import { FormattedMessage } from "react-intl";
import {
  Terminal,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { LogEvent } from "../App";
import { useLocale } from "../IntlProvider";

interface EventLogProps {
  logs: LogEvent[];
}

export function EventLog({ logs }: EventLogProps) {
  const { timeLocale } = useLocale();

  const getIcon = (type: LogEvent["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  };

  const getColor = (type: LogEvent["type"]) => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "warning":
        return "text-amber-400";
      case "error":
        return "text-red-400";
      default:
        return "text-blue-400";
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(timeLocale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-full flex flex-col">
      <h2 className="text-slate-200 mb-3 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-green-400" />
        <FormattedMessage id="eventLog.title" defaultMessage="事件日志" />
      </h2>

      <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-sm overflow-hidden">
        <ScrollArea className="h-full">
          {logs.length === 0 ? (
            <div className="text-slate-600 text-center py-8">
              <FormattedMessage
                id="eventLog.waiting"
                defaultMessage="等待事件..."
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-slate-600 text-xs shrink-0 mt-0.5">
                    {formatTime(log.timestamp)}
                  </span>
                  <div className="shrink-0 mt-0.5">{getIcon(log.type)}</div>
                  <span
                    className={`${getColor(log.type)} flex-1 leading-relaxed`}
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Log Stats */}
      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800">
        <div className="text-center">
          <div className="text-slate-500 text-xs">
            <FormattedMessage id="eventLog.stats.total" defaultMessage="总计" />
          </div>
          <div className="text-slate-300 text-sm">{logs.length}</div>
        </div>
        <div className="text-center">
          <div className="text-blue-400 text-xs">
            <FormattedMessage id="eventLog.stats.info" defaultMessage="信息" />
          </div>
          <div className="text-blue-400 text-sm">
            {logs.filter((l) => l.type === "info").length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-green-400 text-xs">
            <FormattedMessage
              id="eventLog.stats.success"
              defaultMessage="成功"
            />
          </div>
          <div className="text-green-400 text-sm">
            {logs.filter((l) => l.type === "success").length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-amber-400 text-xs">
            <FormattedMessage
              id="eventLog.stats.warning"
              defaultMessage="警告"
            />
          </div>
          <div className="text-amber-400 text-sm">
            {logs.filter((l) => l.type === "warning").length}
          </div>
        </div>
      </div>
    </div>
  );
}
