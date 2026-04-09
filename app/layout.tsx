import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
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
        <meta name="color-scheme" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className={`${notoSansJP.variable} antialiased`} style={{ fontFamily: "var(--font-noto), 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
