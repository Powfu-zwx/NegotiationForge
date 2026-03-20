import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "NegotiationForge",
  description: "Open-source adversarial negotiation simulator and decision rehearsal engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-forge-bg font-sans text-forge-text antialiased">
        {children}
      </body>
    </html>
  );
}
