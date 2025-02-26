import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EUR Statement Calculator",
  description: "Calculate PLN profits from EUR interest statements using NBP exchange rates",
  keywords: ["EUR", "PLN", "exchange rate", "NBP", "interest calculator", "profit calculator"],
  authors: [{ name: "alimek" }],
  applicationName: "EUR Statement Calculator",
  generator: "Next.js",
  creator: "alimek",
  publisher: "alimek",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.ico",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
  },
  themeColor: "#3b82f6", // blue-500 to match the UI
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
