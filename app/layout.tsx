import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { AppSessionProvider } from "@/components/session-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta"
});

export const metadata: Metadata = {
  title: "The Digital Curator | AI Assistant",
  description: "Desktop-first AI chat workspace for writing, research, coding, and multimodal tasks."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${plusJakarta.variable} font-body antialiased`}>
        <AppSessionProvider>{children}</AppSessionProvider>
      </body>
    </html>
  );
}
