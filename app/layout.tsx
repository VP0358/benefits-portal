import type { Metadata } from "next";
import { Noto_Sans_JP, Cormorant_Garamond, Josefin_Sans } from "next/font/google";
import "./globals.css";

// 日本語：Noto Sans JP
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

// 英字セリフ体：Cormorant Garamond（超高級感・エレガント）
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

// 英字サンセリフ：Josefin Sans（モダン・細身・上品）
const josefin = Josefin_Sans({
  variable: "--font-josefin",
  subsets: ["latin"],
  weight: ["100", "300", "400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VIOLA Pure 福利厚生ポータル",
  description: "VIOLA Pure 会員向け福利厚生ポータルシステム",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* カラースキームをライトに統一 */}
        <meta name="color-scheme" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body
        className={`${notoSansJP.variable} ${cormorant.variable} ${josefin.variable} antialiased`}
        style={{
          fontFamily: "var(--font-noto), 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Meiryo', sans-serif",
          backgroundColor: "#f0ebe4",
          color: "#1a1410",
        }}
      >
        {children}
      </body>
    </html>
  );
}
