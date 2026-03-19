import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NegotiationForge", description: "对抗式谈判模拟与决策推演引擎" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-forge-bg text-forge-text antialiased">{children}</body>
    </html>
  );
}
