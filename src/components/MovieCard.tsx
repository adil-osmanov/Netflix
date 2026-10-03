"use client";

import { Play, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useWatched } from "@/context/WatchedContext";
import { getTelegramDeepLink } from "@/utils/telegram";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import CollectionViewerModal from "./CollectionViewerModal";
import AddContentModal from "./AddContentModal";
import { deleteContentAction, getEpisodesAction, setLastWatchedAction } from "@/app/actions";
import { useRouter } from "next/navigation";

export interface Movie {
  id: string;
  title: string;
  release_year?: string;
  description?: string;
  category: string;
  cover_url: string;
  telegram_url?: string;
  is_collection?: boolean;
  genre_id?: string;
  collection_type?: string;
  has_subtitles?: boolean;
  collectionCount?: number;
  totalEpisodesCount?: number;
}

interface MovieCardProps {
  movie: Movie;
}

export default function MovieCard({ movie }: MovieCardProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [episodesToEdit, setEpisodesToEdit] = useState<any[]>([]);
  
  // Hover & Z-index state to prevent abrupt clipping when scaling down
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsHovered(true);
    setIsAnimatingOut(false);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsAnimatingOut(true);
    timeoutRef.current = setTimeout(() => {
      setIsAnimatingOut(false);
    }, 300); // match the duration-300 of the scale transition
  };

  // Calculate collection length
  const [collectionCount, setCollectionCount] = useState<number>(movie.collectionCount || 0);
  const [totalEpisodesCount, setTotalEpisodesCount] = useState(movie.totalEpisodesCount || 0);
  const { isWatched, toggleWatched, getCollectionProgress } = useWatched();
  const [mounted, setMounted] = useState(false);
  const [hideAdmin, setHideAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkSettings = () => setHideAdmin(localStorage.getItem('netflix_hide_add_buttons') === 'true');
    checkSettings();
    window.addEventListener('storage', checkSettings);
    return () => window.removeEventListener('storage', checkSettings);
  }, []);

  useEffect(() => {
    if (editOpen && movie.is_collection) {
      getEpisodesAction(movie.id).then((result) => {
        if (result.success && result.data) {
          setEpisodesToEdit(result.data);
        }
      });
    }
  }, [editOpen, movie.id, movie.is_collection]);



  const progress = movie.is_collection ? getCollectionProgress(movie.id, totalEpisodesCount) : (isWatched(movie.id, null) ? 100 : 0);
  const getPlayLink = () => {
    if (movie.is_collection) return undefined;
    const link = getTelegramDeepLink(movie.telegram_url);
    return link === '#' ? undefined : link;
  };
  const handlePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    const urlParams = new URLSearchParams(window.location.search);
    const categoryType = urlParams.get('category') || 'all';
    
    setLastWatchedAction(categoryType, movie);

    if (movie.is_collection) {
      setModalOpen(true);
    } else if (movie.telegram_url) {
      let url = movie.telegram_url;
      if (url && !url.includes('http')) {
        const channelId = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_ID?.replace("-100", "") || "3905550666";
        url = `https://t.me/c/${channelId}/${url}`;
      }
      window.open(url, '_blank');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteContentAction(movie.id);
    if (result.success) {
      setDeleteOpen(false);
      window.location.reload();
    }
    setIsDeleting(false);
  };

  // Determine Collection Text
  let dynamicText = "";
  if (movie.is_collection && collectionCount > 0) {
    // Detect if it's explicitly a series via DB fields or URL state
    const isSeriesItem = movie.collection_type === 'series' || 
                         movie.category?.toLowerCase().includes('сериал') || 
                         movie.category?.toLowerCase().includes('series') ||
                         (typeof window !== 'undefined' && window.location.search.includes('series'));
                         
    if (isSeriesItem) {
      dynamicText = `${collectionCount} сезон${collectionCount % 10 === 1 && collectionCount % 100 !== 11 ? '' : (collectionCount % 10 >= 2 && collectionCount % 10 <= 4 && (collectionCount % 100 < 10 || collectionCount % 100 >= 20)) ? 'а' : 'ов'}`;
    } else {
      dynamicText = `${collectionCount} част${collectionCount % 10 === 1 && collectionCount % 100 !== 11 ? 'ь' : (collectionCount % 10 >= 2 && collectionCount % 10 <= 4 && (collectionCount % 100 < 10 || collectionCount % 100 >= 20)) ? 'и' : 'ей'}`;
    }
  }

  const deleteModalContent = deleteOpen && mounted ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteOpen(false)}>
      <div className="bg-[#141414] border border-zinc-800 w-full max-w-md rounded-lg shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200 text-center" onClick={(e) => e.stopPropagation()}>
        <Trash2 className="w-12 h-12 text-[#E50914] mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-white mb-2">Удалить контент?</h2>
        <p className="text-zinc-400 mb-8">
          Вы уверены, что хотите удалить <strong className="text-white">'{movie.title}'</strong>?<br/>
          Это действие необратимо.
        </p>
        
        <div className="flex gap-4 w-full">
          <button 
            onClick={(e) => { e.stopPropagation(); setDeleteOpen(false); }}
            disabled={isDeleting}
            className="flex-1 bg-transparent border border-zinc-700 text-white font-bold py-3 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            disabled={isDeleting}
            className="flex-1 bg-[#E50914] hover:bg-red-700 text-white font-bold py-3 rounded-md transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Удаление..." : "Удалить"}
          </button>

          {progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 md:h-1.5 bg-zinc-800/80 z-40 overflow-hidden">
              <div className="h-full bg-[#E50914] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;




  return (
    <>
      <div 
        draggable={!hideAdmin}
        onDragStart={(e) => {
          e.dataTransfer.setData('movieId', movie.id);
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group relative w-full aspect-video flex-shrink-0 transition-z duration-0 bg-[#141414] rounded-md ${isHovered ? 'z-[70]' : isAnimatingOut ? 'z-[60]' : 'z-10'}`}
      >
        <div className={`absolute inset-0 transition-all duration-300 ease-out origin-center rounded-md overflow-hidden bg-[#141414] ${isHovered ? 'md:scale-[1.25] md:shadow-[0_0_30px_rgba(0,0,0,0.9)]' : 'scale-100'}`} style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}>
          
          {/* Background and Clickable Area */}
          {movie.is_collection ? (
            <div onClick={handlePlay} className="absolute inset-0 z-0 cursor-pointer">
              <Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="block object-cover transition-transform duration-300" />
              <div className={`absolute -inset-[1px] transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-10% via-[#141414]/80 via-50% to-transparent ${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}`} />
            </div>
          ) : (
            <a 
              href={getPlayLink()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                const urlParams = new URLSearchParams(window.location.search);
                const categoryType = urlParams.get('category') || 'all';
                setLastWatchedAction(categoryType, movie);
              }}
              className="absolute inset-0 z-0 cursor-pointer block"
            >
              <Image src={movie.cover_url} alt={movie.title} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="block object-cover transition-transform duration-300" />
              <div className={`absolute -inset-[1px] transition-opacity duration-300 bg-gradient-to-t from-[#141414] from-10% via-[#141414]/80 via-50% to-transparent ${isHovered ? 'opacity-100' : 'opacity-100 md:opacity-0'}`} />
            </a>
          )}

          {/* Top Right: Edit & Delete (z-20) */}
          {!hideAdmin && (
            <div className={`absolute top-2 right-2 md:top-3 md:right-3 hidden md:flex gap-2 transition-all duration-300 z-20 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-100 md:opacity-0 md:-translate-y-2'}`}>
              <button 
                onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
                className="w-8 h-8 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all cursor-pointer relative z-30"
                title="Редактировать"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                className="w-8 h-8 bg-black/60 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-[#E50914] hover:border-[#E50914] transition-all cursor-pointer relative z-30"
                title="Удалить"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Bottom Left: Text (z-10, pointer-events-none) */}
          <div className={`absolute bottom-2 md:bottom-3 left-2 right-2 md:left-4 md:right-4 flex flex-col justify-end transition-all duration-300 z-10 pointer-events-none ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-100 md:opacity-0 md:translate-y-2'}`}>
            <div className="flex items-center gap-3 mb-1">
              {!movie.is_collection && (
                <div className="w-6 h-6 md:w-8 md:h-8 bg-white rounded-full flex items-center justify-center transition-colors shadow-lg shadow-black/50 flex-shrink-0">
                  <Play className="w-3 h-3 md:w-4 md:h-4 text-black ml-0.5" fill="currentColor" />
                </div>
              )}
              <h3 className={`text-white font-bold text-xs md:text-base leading-tight drop-shadow-md truncate ${movie.is_collection ? 'text-sm md:text-lg' : ''}`}>
                {movie.title}
              </h3>
            </div>
            
            {(movie.release_year || (movie.is_collection && collectionCount > 0) || movie.has_subtitles) && (
              <div className="flex items-center gap-2 mt-1 drop-shadow-md">
                {movie.release_year && <span className="text-zinc-300 text-[10px] md:text-xs font-semibold border border-zinc-500 px-1 rounded-sm leading-none py-0.5">{movie.release_year}</span>}
                {movie.is_collection && collectionCount > 0 && (
                  <span className="text-[#46d369] text-[10px] md:text-xs font-bold">
                    {dynamicText}
                  </span>
                )}
                {movie.has_subtitles && (
                  <span className="px-1 py-0.5 border border-zinc-400 text-zinc-300 text-[9px] md:text-[10px] rounded-[3px] font-bold tracking-wider leading-none shadow-sm flex items-center justify-center">
                    CC
                  </span>
                )}
                {!movie.is_collection && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWatched(movie.id, null); }}
                    className="ml-auto w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full transition-colors z-30 relative"
                    title={isWatched(movie.id, null) ? "Отметить как непросмотренное" : "Отметить как просмотренное"}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${isWatched(movie.id, null) ? 'text-green-500' : 'text-zinc-600'}`} />
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      <CollectionViewerModal 
        movie={movie} 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />

      {editOpen && (
        <AddContentModal 
          genreId={movie.genre_id || ""}
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          movieToEdit={movie}
          episodesToEdit={episodesToEdit}
        />
      )}

      {deleteModalContent}
    </>
  );
}
