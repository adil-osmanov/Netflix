import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
};

import { SearchProvider } from "@/components/SearchContext";
import { WatchedProvider } from "@/context/WatchedContext";

export const metadata: Metadata = {
  title: "Netflix",
  description: "Watch TV Shows Online, Watch Movies Online",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <WatchedProvider>
          <SearchProvider>{children}</SearchProvider>
        </WatchedProvider>
      </body>
    </html>
  );
}
