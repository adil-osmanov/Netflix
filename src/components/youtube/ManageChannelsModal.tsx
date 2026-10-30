"use client";

import React, { useState } from "react";
import { X, Tv, Trash2, Plus, AlertCircle, Loader2 } from "lucide-react";
import { extractYouTubeChannelId } from "@/data/youtubeVideos";

export interface SubscribedChannel {
  id?: string; // UC...
  name?: string;
  channel_id?: string;
  channel_title?: string;
  channel_thumbnail?: string;
  language?: "DE" | "EN";
}

interface ManageChannelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: SubscribedChannel[];
  onAddChannel: (channel: SubscribedChannel) => void;
  onRemoveChannel: (channelId: string) => void;
  language?: "DE" | "EN";
}

export default function ManageChannelsModal({
  isOpen,
  onClose,
  channels,
  onAddChannel,
  onRemoveChannel,
  language = "DE",
}: ManageChannelsModalProps) {
  const [channelInput, setChannelInput] = useState<string>("");
  const [channelName, setChannelName] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedInput = channelInput.trim();
    if (!trimmedInput) {
      setError("Введите ссылку на канал (@handle), youtube.com/channel/UC... или ID канала.");
      return;
    }

    setIsAdding(true);
    try {
      let resolvedChannelId = extractYouTubeChannelId(trimmedInput);
      let resolvedTitle = "";

      if (!resolvedChannelId) {
        const res = await fetch("/api/youtube/resolve-channel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: trimmedInput }),
        });

        const data = await res.json();
        if (!res.ok || !data.channelId) {
          setError(
            data.error ||
              "Не удалось найти канал. Проверьте ссылку (@handle или youtube.com/channel/UC...)."
          );
          setIsAdding(false);
          return;
        }

        resolvedChannelId = data.channelId;
        resolvedTitle = data.channelTitle || "";
      }

      if (!resolvedChannelId) {
        setError("Не удалось определить ID канала.");
        setIsAdding(false);
        return;
      }

      if (channels.some((c) => (c.channel_id || c.id) === resolvedChannelId)) {
        setError("Этот канал уже добавлен в ваши подписки.");
        setIsAdding(false);
        return;
      }

      const handleFallback = trimmedInput.match(/@([\w.-]+)/)?.[1]
        ? `@${trimmedInput.match(/@([\w.-]+)/)?.[1]}`
        : `Канал (${resolvedChannelId.slice(0, 8)}...)`;

      const name =
        channelName.trim() || resolvedTitle || handleFallback;

      onAddChannel({
        id: resolvedChannelId,
        channel_id: resolvedChannelId,
        name,
        channel_title: name,
        language,
      });

      setChannelInput("");
      setChannelName("");
    } catch {
      setError("Ошибка сети при проверке канала. Попробуйте ещё раз.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#181818] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <Tv className="w-5 h-5 text-[#E50914]" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Управление подписками ({channels.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Add Channel Form */}
          <form onSubmit={handleAdd} className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800/80 flex flex-col gap-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Добавить {language === "EN" ? "английский" : "немецкий"} канал
            </span>

            <div>
              <input
                type="text"
                value={channelInput}
                disabled={isAdding}
                onChange={(e) => {
                  setChannelInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ссылка (@handle, youtube.com/@...) или ID (UC...)"
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#E50914] disabled:opacity-60"
              />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={channelName}
                disabled={isAdding}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Название канала (необязательно)"
                className="flex-1 bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#E50914] disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
              >
                {isAdding ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Поиск...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Добавить</span>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-red-400 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </form>

          {/* List of Subscribed Channels */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Ваши каналы
            </span>

            {channels.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">
                Список подписок пуст. Добавьте свои любимые {language === "EN" ? "английские" : "немецкие"} каналы выше.
              </p>
            ) : (
              channels.map((ch) => {
                const chId = ch.channel_id || ch.id || "";
                const chName = ch.channel_title || ch.name || "Канал";
                return (
                  <div
                    key={chId}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-red-500 flex-shrink-0">
                        {chName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white leading-none mb-1">
                          {chName}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {chId}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveChannel(chId)}
                      title="Удалить канал из подписок"
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
