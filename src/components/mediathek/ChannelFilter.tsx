"use client";

import React from "react";

export interface ChannelFilterProps {
  selectedChannel: string;
  onSelectChannel: (channelId: string) => void;
}

// Порядок отображения в ленте фильтра
export const FILTER_CHANNELS = [
  { id: "all", label: "Все каналы" },
  { id: "ARD", label: "ARD" },
  { id: "ZDF", label: "ZDF" },
  { id: "ARTE", label: "ARTE" },
  { id: "3SAT", label: "3Sat" },
  { id: "ZDF_NEO", label: "ZDFneo" },
  { id: "BR", label: "BR" },
  { id: "SWR", label: "SWR" },
  { id: "WDR", label: "WDR" },
  { id: "NDR", label: "NDR" },
  { id: "MDR", label: "MDR" },
  { id: "HR", label: "HR" },
  { id: "RBB", label: "RBB" },
  { id: "SR", label: "SR" },
  { id: "PHOENIX", label: "Phoenix" },
  { id: "ONE", label: "ONE" },
  { id: "DW", label: "DW" },
  { id: "ORF", label: "ORF" },
  { id: "SRF", label: "SRF" },
];

export function ChannelFilter({ selectedChannel, onSelectChannel }: ChannelFilterProps) {
  return (
    <div className="w-full overflow-hidden my-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar scroll-smooth py-1 px-1">
        {FILTER_CHANNELS.map((ch) => {
          const isActive = selectedChannel.toUpperCase() === ch.id.toUpperCase();
          return (
            <button
              key={ch.id}
              onClick={() => onSelectChannel(ch.id)}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold tracking-wide transition-all duration-200 select-none whitespace-nowrap cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none active:outline-none ring-0 border-none [-webkit-tap-highlight-color:transparent] ${
                isActive
                  ? "bg-white text-black shadow-lg shadow-white/10 scale-105"
                  : "bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/60"
              }`}
            >
              {ch.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ChannelFilter;
