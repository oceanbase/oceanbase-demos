"use client";

import { Card, Button } from "antd";
import { PlayCircleOutlined, CopyOutlined, DownOutlined } from "@ant-design/icons";
import { useState } from "react";
import { Input } from "antd";
import styles from "./SQLEditor.module.css";

const { TextArea } = Input;

const defaultSQL = `SELECT (
COUNT(CASE WHEN event_type = 'purchase' THEN 1 ELSE NULL END) /
COUNT(CASE WHEN event_type = 'view' THEN 1 ELSE NULL END)
) AS bought_rate
FROM events
WHERE event_time >= '2019-11-23 23:59:59'
AND event_time <= '2019-11-30 23:59:59'`;

interface SQLEditorProps {
  onExecute: () => void;
  loading?: boolean;
}

export default function SQLEditor({ onExecute, loading }: SQLEditorProps) {
  const [sql, setSql] = useState(defaultSQL);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
  };

  return (
    <Card
      className={styles.card}
      bodyStyle={{ padding: 16 }}
      extra={
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onExecute}
          loading={loading}
          className={styles.executeButton}
        >
          执行 SQL
        </Button>
      }
    >
      <div className={styles.editorWrapper}>
        <TextArea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={expanded ? 10 : 6}
          className={styles.textarea}
        />
        <div className={styles.actions}>
          <Button
            type="link"
            size="small"
            icon={
              <DownOutlined 
                className={styles.expandIcon}
                style={{ 
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }} 
              />
            }
            onClick={() => setExpanded(!expanded)}
            className={styles.actionButton}
          >
            {expanded ? "收起" : "展开"}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopy}
            className={styles.actionButton}
          >
            复制
          </Button>
        </div>
      </div>
    </Card>
  );
}

