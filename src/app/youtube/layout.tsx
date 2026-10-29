import React from "react";
import YouTubeHeader from "@/components/youtube/YouTubeHeader";
import { YouTubeProvider } from "@/context/YouTubeContext";

export default function YouTubeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <YouTubeProvider>
      <div className="min-h-screen bg-black text-white flex flex-col">
        <YouTubeHeader />
        <main className="flex-1 pt-14">{children}</main>
      </div>
    </YouTubeProvider>
  );
}
