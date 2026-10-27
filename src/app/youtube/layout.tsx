import React from "react";
import YouTubeHeader from "@/components/youtube/YouTubeHeader";
import YouTubeDictionaryModal from "@/components/youtube/YouTubeDictionaryModal";
import { YouTubeProvider } from "@/context/YouTubeContext";

export default function YouTubeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <YouTubeProvider>
      <div className="min-h-screen bg-[#141414] text-white flex flex-col">
        <YouTubeHeader />
        <main className="flex-1 pt-14">{children}</main>
        <YouTubeDictionaryModal />
      </div>
    </YouTubeProvider>
  );
}
