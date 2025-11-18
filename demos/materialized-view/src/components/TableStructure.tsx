"use client";

import { Modal, Table, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";

interface FieldInfo {
  field: string;
  type: string;
  nullable: string;
  key: string;
  comment: string;
}

interface TableStructureProps {
  open: boolean;
  onClose: () => void;
}

const ordersFields: FieldInfo[] = [
  {
    field: "order_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "PRI",
    comment: "订单ID",
  },
  {
    field: "user_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "",
    comment: "用户ID",
  },
  {
    field: "order_date",
    type: "date",
    nullable: "NOT NULL",
    key: "PRI",
    comment: "订单日期",
  },
  {
    field: "order_time",
    type: "datetime",
    nullable: "NOT NULL",
    key: "",
    comment: "订单时间",
  },
  {
    field: "region_id",
    type: "varchar(32)",
    nullable: "NULL",
    key: "",
    comment: "地区ID",
  },
  {
    field: "region_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "地区名称",
  },
  {
    field: "order_amount",
    type: "decimal(18,2)",
    nullable: "NOT NULL",
    key: "",
    comment: "订单金额",
  },
  {
    field: "order_status",
    type: "varchar(32)",
    nullable: "NOT NULL",
    key: "",
    comment: "订单状态",
  },
];

const orderItemsFields: FieldInfo[] = [
  {
    field: "order_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "PRI",
    comment: "订单ID",
  },
  {
    field: "item_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "PRI",
    comment: "商品ID",
  },
  {
    field: "product_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "",
    comment: "商品SKU ID",
  },
  {
    field: "quantity",
    type: "int(11)",
    nullable: "NOT NULL",
    key: "",
    comment: "购买数量",
  },
  {
    field: "price",
    type: "decimal(18,2)",
    nullable: "NOT NULL",
    key: "",
    comment: "单价",
  },
  {
    field: "amount",
    type: "decimal(18,2)",
    nullable: "NOT NULL",
    key: "",
    comment: "金额",
  },
];

const productsFields: FieldInfo[] = [
  {
    field: "product_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "PRI",
    comment: "商品SKU ID",
  },
  {
    field: "item_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "",
    comment: "商品ID",
  },
  {
    field: "product_name",
    type: "varchar(500)",
    nullable: "NULL",
    key: "",
    comment: "商品名称",
  },
  {
    field: "brand_id",
    type: "varchar(64)",
    nullable: "NULL",
    key: "",
    comment: "品牌ID",
  },
  {
    field: "brand_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "品牌名称",
  },
  {
    field: "category_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "",
    comment: "类目ID",
  },
  {
    field: "category_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "类目名称",
  },
  {
    field: "category_level1_id",
    type: "varchar(64)",
    nullable: "NULL",
    key: "",
    comment: "一级类目ID",
  },
  {
    field: "category_level1_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "一级类目名称",
  },
  {
    field: "category_level2_id",
    type: "varchar(64)",
    nullable: "NULL",
    key: "",
    comment: "二级类目ID",
  },
  {
    field: "category_level2_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "二级类目名称",
  },
];

const mvFields: FieldInfo[] = [
  // 维度字段（GROUP BY）
  {
    field: "sale_date",
    type: "date",
    nullable: "NOT NULL",
    key: "",
    comment: "订单日期（维度字段）",
  },
  {
    field: "sale_month",
    type: "varchar(7)",
    nullable: "NULL",
    key: "",
    comment: "订单月份，格式：YYYY-MM（维度字段，预计算）",
  },
  {
    field: "category_level1_id",
    type: "varchar(64)",
    nullable: "NULL",
    key: "",
    comment: "一级类目ID（维度字段）",
  },
  {
    field: "category_level1_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "一级类目名称（维度字段）",
  },
  {
    field: "category_level2_id",
    type: "varchar(64)",
    nullable: "NULL",
    key: "",
    comment: "二级类目ID（维度字段）",
  },
  {
    field: "category_level2_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "二级类目名称（维度字段）",
  },
  {
    field: "brand_id",
    type: "varchar(64)",
    nullable: "NULL",
    key: "",
    comment: "品牌ID（维度字段）",
  },
  {
    field: "brand_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "品牌名称（维度字段）",
  },
  {
    field: "region_id",
    type: "varchar(32)",
    nullable: "NULL",
    key: "",
    comment: "地区ID（维度字段）",
  },
  {
    field: "region_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "地区名称（维度字段）",
  },
  // 聚合指标字段（预计算）
  {
    field: "order_count_raw",
    type: "bigint",
    nullable: "NULL",
    key: "",
    comment: "订单数量（COUNT(o.order_id)，预聚合）",
  },
  {
    field: "user_count_raw",
    type: "bigint",
    nullable: "NULL",
    key: "",
    comment: "用户数量（COUNT(o.user_id)，预聚合）",
  },
  {
    field: "item_count_raw",
    type: "bigint",
    nullable: "NULL",
    key: "",
    comment: "商品数量（COUNT(oi.item_id)，预聚合）",
  },
  {
    field: "total_quantity",
    type: "decimal(18,2)",
    nullable: "NULL",
    key: "",
    comment: "总数量（SUM(oi.quantity)，预聚合）",
  },
  {
    field: "total_sales",
    type: "decimal(18,2)",
    nullable: "NULL",
    key: "",
    comment: "总销售额（SUM(oi.amount)，预聚合）",
  },
  {
    field: "amount_count",
    type: "bigint",
    nullable: "NULL",
    key: "",
    comment: "金额计数（COUNT(oi.amount)，用于计算 AVG）",
  },
  {
    field: "amount_sum",
    type: "decimal(18,2)",
    nullable: "NULL",
    key: "",
    comment: "金额总和（SUM(oi.amount)，用于计算 AVG）",
  },
  {
    field: "order_amount_count",
    type: "bigint",
    nullable: "NULL",
    key: "",
    comment: "订单金额计数（COUNT(o.order_amount)，用于计算 AVG）",
  },
  {
    field: "order_amount_sum",
    type: "decimal(18,2)",
    nullable: "NULL",
    key: "",
    comment: "订单金额总和（SUM(o.order_amount)，用于计算 AVG）",
  },
  {
    field: "min_order_amount",
    type: "decimal(18,2)",
    nullable: "NULL",
    key: "",
    comment: "最小订单金额（MIN(o.order_amount)，预聚合）",
  },
  {
    field: "max_order_amount",
    type: "decimal(18,2)",
    nullable: "NULL",
    key: "",
    comment: "最大订单金额（MAX(o.order_amount)，预聚合）",
  },
];

const columns: ColumnsType<FieldInfo> = [
  {
    title: "字段名",
    dataIndex: "field",
    key: "field",
    render: (text: string) => <code style={{ color: "#057cf2" }}>{text}</code>,
  },
  {
    title: "说明",
    dataIndex: "comment",
    key: "comment",
  },
  {
    title: "类型",
    dataIndex: "type",
    key: "type",
  },
  {
    title: "可空",
    dataIndex: "nullable",
    key: "nullable",
  },
  {
    title: "键",
    dataIndex: "key",
    key: "key",
    render: (text: string) =>
      text ? <span style={{ color: "#52c41a" }}>{text}</span> : "-",
  },
];

export default function TableStructure({ open, onClose }: TableStructureProps) {
  const tabItems = [
    {
      key: "orders",
      label: "orders（订单表）",
      children: (
        <Table
          columns={columns}
          dataSource={ordersFields}
          rowKey="field"
          pagination={false}
          size="small"
        />
      ),
    },
    {
      key: "order_items",
      label: "order_items（订单明细表）",
      children: (
        <Table
          columns={columns}
          dataSource={orderItemsFields}
          rowKey="field"
          pagination={false}
          size="small"
        />
      ),
    },
    {
      key: "products",
      label: "products（商品表）",
      children: (
        <Table
          columns={columns}
          dataSource={productsFields}
          rowKey="field"
          pagination={false}
          size="small"
        />
      ),
    },
    // {
    //   key: "users",
    //   label: "users（用户表）",
    //   children: (
    //     <Table
    //       columns={columns}
    //       dataSource={usersFields}
    //       rowKey="field"
    //       pagination={false}
    //       size="small"
    //     />
    //   ),
    // },
    {
      key: "mv",
      label: "sales_summary_mv（聚合物化视图）",
      children: (
        <Table
          columns={columns}
          dataSource={mvFields}
          rowKey="field"
          pagination={false}
          size="small"
        />
      ),
    },
  ];

  return (
    <Modal
      title="表结构和物化视图结构"
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      styles={{
        body: { maxHeight: "70vh", overflowY: "auto" },
      }}
    >
      <Tabs items={tabItems} defaultActiveKey="orders" />
    </Modal>
  );
}
