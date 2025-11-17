import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App } from "antd";
import IframeCommunicator from "@/components/IframeCommunicator";
import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Materialized View Demo",
  description: "OceanBase Materialized View Demo",
  icons: {
    icon: "/image/oceanbase.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <App>{children}</App>
        </AntdRegistry>
        <IframeCommunicator />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
