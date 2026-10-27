import React from "react";
import Link from "next/link";
import InteractivePlayer from "@/components/youtube/InteractivePlayer";
import { RECOMMENDED_YOUTUBE_VIDEOS } from "@/data/youtubeVideos";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function YouTubeVideoPage({ params }: PageProps) {
  const { id } = await params;

  const videoMeta = RECOMMENDED_YOUTUBE_VIDEOS.find((v) => v.id === id);

  return (
    <div className="min-h-screen bg-[#141414] text-white pt-6 pb-16">
      <div className="max-w-6xl mx-auto px-4 md:px-6 mb-2">
        <Link
          href="/youtube"
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-sm transition-colors py-2"
        >
          <span>← Назад к каталогу немецких видео</span>
        </Link>
      </div>

      <InteractivePlayer
        videoId={id}
        videoTitle={videoMeta?.title || "Немецкое видео с субтитрами"}
        channelTitle={videoMeta?.channel || "YouTube"}
      />
    </div>
  );
}
