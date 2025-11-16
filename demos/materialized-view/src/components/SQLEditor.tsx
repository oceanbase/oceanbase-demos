"use client";

import { Card, Button, Radio, Tooltip, App } from "antd";
import {
  PlayCircleOutlined,
  CopyOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { useState, useEffect } from "react";
import copy from "copy-to-clipboard";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./SQLEditor.module.css";

interface QueryType {
  key: string;
  label: string;
  description?: string;
}

interface SQLEditorProps {
  onExecute: () => void;
  loading?: boolean;
  sql?: string;
  activeQueryType?: string;
  onQueryTypeChange?: (type: string) => void;
  queryTypes?: readonly QueryType[];
}

export default function SQLEditor({
  onExecute,
  loading,
  sql = "",
  activeQueryType,
  onQueryTypeChange,
  queryTypes = [],
}: SQLEditorProps) {
  const { message: messageApi } = App.useApp();
  const [sqlValue, setSqlValue] = useState(sql);
  const [expanded, setExpanded] = useState(false);

  // 当外部传入的sql改变时，更新编辑器内容
  useEffect(() => {
    setSqlValue(sql);
  }, [sql]);

  const handleCopy = () => {
    const success = copy(sqlValue, {
      debug: false,
      message: "按 #{key} 复制",
    });

    if (success) {
      messageApi.success("复制成功");
    } else {
      messageApi.error("复制失败");
    }
  };

  return (
    <Card
      className={styles.card}
      bordered={false}
      headStyle={{ borderBottom: "none", padding: 0 }}
      bodyStyle={{ padding: 0 }}
      title={
        queryTypes.length > 0 && activeQueryType && onQueryTypeChange ? (
          <div className={styles.queryTypeSelector}>
            <Radio.Group
              value={activeQueryType}
              onChange={(e) => onQueryTypeChange(e.target.value)}
              className={styles.radioGroup}
              optionType="button"
            >
              {queryTypes.map((queryType) => (
                <Radio.Button
                  key={queryType.key}
                  value={queryType.key}
                  className={styles.radioButton}
                >
                  {queryType.description ? (
                    <Tooltip title={queryType.description} placement="top">
                      {queryType.label}
                    </Tooltip>
                  ) : (
                    queryType.label
                  )}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
        ) : null
      }
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
        <div
          className={`${styles.sqlDisplay} ${expanded ? styles.expanded : ""}`}
        >
          <SyntaxHighlighter
            language="sql"
            style={prism}
            customStyle={{
              margin: 0,
              padding: 0,
              background: "transparent",
              fontSize: "14px",
              lineHeight: "1.6",
              fontFamily:
                '"Monaco", "Menlo", "Ubuntu Mono", "Consolas", "source-code-pro", monospace',
            }}
            codeTagProps={{
              style: {
                fontFamily: "inherit",
                fontSize: "inherit",
              },
            }}
            PreTag="div"
          >
            {sqlValue || "SQL 查询语句"}
          </SyntaxHighlighter>
        </div>
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          className={styles.copyButton}
          style={{ position: "absolute", top: 8, right: 8 }}
          title="复制"
        />
        <div
          className={styles.actions}
          style={{
            background: "linear-gradient(180deg, #ffffff00 0%, #ffffff 100%)",
          }}
        >
          <Button
            type="link"
            size="small"
            iconPosition="end"
            icon={
              <DownOutlined
                className={styles.expandIcon}
                style={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            }
            onClick={() => setExpanded(!expanded)}
            className={styles.expandButton}
          >
            {expanded ? "收起" : "展开"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
