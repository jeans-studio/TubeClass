import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteDescription =
  "AI 개발과 AI 활용을 위한 YouTube 강의를 주제, 난이도, 재생목록 흐름으로 정리하는 학습 플랫폼";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TubeClass",
    template: "%s | TubeClass",
  },
  description: siteDescription,
  applicationName: "TubeClass",
  keywords: [
    "TubeClass",
    "AI 학습",
    "YouTube 강의",
    "영상 큐레이션",
    "AI 개발",
    "AI 활용",
    "재생목록 학습",
  ],
  authors: [{ name: "TubeClass" }],
  creator: "TubeClass",
  publisher: "TubeClass",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "256x256" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/favicon.png", type: "image/png", sizes: "256x256" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "TubeClass",
    title: "TubeClass",
    description: siteDescription,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TubeClass",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TubeClass",
    description: siteDescription,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full dark" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
