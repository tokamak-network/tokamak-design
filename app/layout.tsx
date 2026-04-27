import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { getModelName } from "@/lib/llm";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tokamak Design — DESIGN.md from any site",
  description: `Extract a DESIGN.md from any website using Tokamak AI and ${getModelName()}. Forked from Hyperbrowser.`,
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
