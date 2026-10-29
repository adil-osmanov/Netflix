import React from "react";
import { YouTubeProvider } from "@/context/YouTubeContext";

export default function YouTubeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <YouTubeProvider>
      <div className="min-h-screen bg-black text-white flex flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </YouTubeProvider>
  );
}
