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

const usersFields: FieldInfo[] = [
  {
    field: "user_id",
    type: "varchar(64)",
    nullable: "NOT NULL",
    key: "PRI",
    comment: "用户ID",
  },
  {
    field: "user_name",
    type: "varchar(200)",
    nullable: "NULL",
    key: "",
    comment: "用户名称",
  },
  {
    field: "user_level",
    type: "varchar(32)",
    nullable: "NULL",
    key: "",
    comment: "用户等级：NORMAL, VIP, SVIP",
  },
  {
    field: "region_id",
    type: "varchar(32)",
    nullable: "NULL",
    key: "",
    comment: "地区ID",
  },
];

const mvFields: FieldInfo[] = [
  {
    field: "sale_date",
    type: "date",
    nullable: "NOT NULL",
    key: "",
    comment: "订单日期",
  },
  {
    field: "sale_month",
    type: "varchar(7)",
    nullable: "NULL",
    key: "",
    comment: "订单月份（预计算）",
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
    field: "user_level",
    type: "varchar(32)",
    nullable: "NULL",
    key: "",
    comment: "用户等级",
  },
  {
    field: "order_count",
    type: "bigint",
    nullable: "NULL",
    key: "",
    comment: "订单数量（预聚合）",
  },
  {
    field: "user_count",
    type: "bigint",
    nullable: "NULL",
    key: "",
    comment: "用户数量（预聚合）",
  },
  {
    field: "item_count",
    type: "bigint",
    nullable: "NULL",
    key: "",
    comment: "商品数量（预聚合）",
  },
  {
    field: "total_quantity",
    type: "decimal",
    nullable: "NULL",
    key: "",
    comment: "总数量（预聚合）",
  },
  {
    field: "total_sales",
    type: "decimal",
    nullable: "NULL",
    key: "",
    comment: "总销售额（预聚合）",
  },
  {
    field: "avg_item_amount",
    type: "decimal",
    nullable: "NULL",
    key: "",
    comment: "平均商品金额（预聚合）",
  },
  {
    field: "avg_order_amount",
    type: "decimal",
    nullable: "NULL",
    key: "",
    comment: "平均订单金额（预聚合）",
  },
  {
    field: "min_order_amount",
    type: "decimal",
    nullable: "NULL",
    key: "",
    comment: "最小订单金额（预聚合）",
  },
  {
    field: "max_order_amount",
    type: "decimal",
    nullable: "NULL",
    key: "",
    comment: "最大订单金额（预聚合）",
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
    {
      key: "users",
      label: "users（用户表）",
      children: (
        <Table
          columns={columns}
          dataSource={usersFields}
          rowKey="field"
          pagination={false}
          size="small"
        />
      ),
    },
    {
      key: "mv",
      label: "sales_summary_mv_agg1（聚合物化视图）",
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
