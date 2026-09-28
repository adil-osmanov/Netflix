"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { saveContentAction, getGenreById } from "@/app/admin/add-content/actions";
import { uploadPosterAction } from "@/app/actions";
import { Plus, Trash2, X, UploadCloud, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Movie } from "./MovieCard";

interface AddContentModalProps {
  genreId: string;
  isOpen: boolean;
  onClose: () => void;
  movieToEdit?: Movie;
  episodesToEdit?: any[];
}

export default function AddContentModal({ genreId, isOpen, onClose, movieToEdit, episodesToEdit }: AddContentModalProps) {
  const router = useRouter();
  const [genre, setGenre] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    release_year: "",
    is_collection: false,
    telegram_link: "",
    has_subtitles: false,
    seasons: [
      { seasonNumber: 1, episodes: [{ title: "", telegram_link: "" }] }
    ]
  });

  const [collectionType, setCollectionType] = useState<"series" | "franchise">("series");

  // Determine category from URL
  const [categoryType, setCategoryType] = useState<"movies" | "series" | "cartoons">("movies");
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('series')) setCategoryType('series');
      else if (search.includes('cartoons')) setCategoryType('cartoons');
      else setCategoryType('movies');
    }
  }, []);

  const isMovies = categoryType === "movies";
  const isSeries = categoryType === "series";
  const isCartoons = categoryType === "cartoons";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (genreId) {
        getGenreById(genreId).then(res => {
          if (res.success) setGenre(res.data);
        });
      }
      
      if (movieToEdit) {
        setFormData({
          title: movieToEdit.title,
          release_year: movieToEdit.release_year || "",
          is_collection: !!movieToEdit.is_collection,
          telegram_link: movieToEdit.telegram_url || "",
          has_subtitles: !!movieToEdit.has_subtitles,
          seasons: [{ seasonNumber: 1, episodes: [{ title: "", telegram_link: "" }] }]
        });
        setPreviewUrl(movieToEdit.cover_url);
        
        if (movieToEdit.collection_type) {
          setCollectionType(movieToEdit.collection_type as "series" | "franchise");
        }

        if (movieToEdit.is_collection && episodesToEdit && episodesToEdit.length > 0) {
          const seasonsMap = new Map<number, any[]>();
          episodesToEdit.forEach(ep => {
            try {
              const parsed = JSON.parse(ep.title);
              const season = parsed.season || 1;
              if (!seasonsMap.has(season)) seasonsMap.set(season, []);
              seasonsMap.get(season)?.push({ title: parsed.title, telegram_link: ep.telegram_link });
            } catch (e) {
              if (!seasonsMap.has(1)) seasonsMap.set(1, []);
              seasonsMap.get(1)?.push({ title: ep.title, telegram_link: ep.telegram_link });
            }
          });

          const rebuiltSeasons = Array.from(seasonsMap.entries()).map(([seasonNumber, episodes]) => ({
            seasonNumber,
            episodes
          })).sort((a, b) => a.seasonNumber - b.seasonNumber);

          setFormData(prev => ({ ...prev, seasons: rebuiltSeasons.length > 0 ? rebuiltSeasons : prev.seasons }));
        }
      } else {
        setFormData({ title: "", release_year: "", is_collection: false, has_subtitles: false, telegram_link: "", seasons: [{ seasonNumber: 1, episodes: [{ title: "", telegram_link: "" }] }] });
        setPreviewUrl(null);
        setMessage(null);
      }
      
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, genreId, movieToEdit, episodesToEdit]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      const localPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(localPreviewUrl);

      setUploading(true);
      
      const uploadFormData = new FormData();
      uploadFormData.append("poster", file);
      
      const result = await uploadPosterAction(uploadFormData);
      
      if (result.success && result.url) {
        setPreviewUrl(result.url);
      } else {
        alert("Ошибка загрузки изображения: " + result.error);
        setPreviewUrl(null);
      }
      
      setUploading(false);
    }
  };

  const addSeason = () => {
    setFormData({
      ...formData,
      seasons: [
        ...formData.seasons, 
        { seasonNumber: formData.seasons.length + 1, episodes: [{ title: "", telegram_link: "" }] }
      ]
    });
  };

  const addEpisode = (seasonIndex: number) => {
    const newSeasons = [...formData.seasons];
    newSeasons[seasonIndex].episodes.push({ title: "", telegram_link: "" });
    setFormData({ ...formData, seasons: newSeasons });
  };

  const updateEpisode = (seasonIndex: number, episodeIndex: number, field: string, value: string) => {
    const newSeasons = [...formData.seasons];
    (newSeasons[seasonIndex].episodes[episodeIndex] as any)[field] = value;
    setFormData({ ...formData, seasons: newSeasons });
  };

  const removeEpisode = (seasonIndex: number, episodeIndex: number) => {
    const newSeasons = [...formData.seasons];
    newSeasons[seasonIndex].episodes = newSeasons[seasonIndex].episodes.filter((_, i) => i !== episodeIndex);
    setFormData({ ...formData, seasons: newSeasons });
  };

  const removeSeason = (seasonIndex: number) => {
    const newSeasons = formData.seasons.filter((_, i) => i !== seasonIndex);
    setFormData({ ...formData, seasons: newSeasons });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!previewUrl) {
      setMessage({ text: "Пожалуйста, загрузите постер", type: "error" });
      setLoading(false);
      return;
    }

    const submission = new FormData();
    submission.append('genre_id', movieToEdit?.genre_id || genreId);
    submission.append('title', formData.title);
    submission.append('is_collection', String(formData.is_collection));
    if (formData.release_year) submission.append('release_year', formData.release_year);
    submission.append('poster_url', previewUrl);
    submission.append('has_subtitles', String(formData.has_subtitles));
    
    let finalCollectionType = null;
    if (formData.is_collection) {
      if (isMovies) finalCollectionType = 'franchise';
      else if (isSeries) finalCollectionType = 'series';
      else if (isCartoons) finalCollectionType = collectionType;
      
      if (finalCollectionType) {
        submission.append('collection_type', finalCollectionType);
      }
    }

    if (formData.is_collection) {
      const flatEpisodes: any[] = [];
      formData.seasons.forEach((season) => {
        season.episodes.forEach((ep, eIdx) => {
          if (ep.telegram_link) {
            const isActuallyFranchise = finalCollectionType === 'franchise';
            const defaultTitle = isActuallyFranchise ? `Часть ${eIdx + 1}` : `Серия ${eIdx + 1}`;
            flatEpisodes.push({
              title: JSON.stringify({ season: season.seasonNumber, title: ep.title || defaultTitle }),
              telegram_link: ep.telegram_link
            });
          }
        });
      });
      submission.append('episodes', JSON.stringify(flatEpisodes));
    } else {
      submission.append('telegram_link', formData.telegram_link);
    }

    const result = await saveContentAction(submission, movieToEdit?.id);

    if (result.success) {
      setMessage({ text: movieToEdit ? "Успешно! Контент обновлен." : "Успешно! Контент добавлен.", type: "success" });
      setTimeout(() => {
        onClose();
        setFormData({ title: "", release_year: "", is_collection: false, has_subtitles: false, telegram_link: "", seasons: [{ seasonNumber: 1, episodes: [] }] });
        setPreviewUrl(null);
        window.location.reload();
      }, 500);
    } else {
      setMessage({ text: result.error || "Ошибка сохранения", type: "error" });
    }
    setLoading(false);
  };

  const isActuallyFranchise = isMovies || (isCartoons && collectionType === 'franchise');

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-[#141414] rounded-xl shadow-2xl relative p-4 md:p-8 max-h-[90vh] md:max-h-[85vh] overflow-y-auto no-scrollbar border border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors bg-zinc-900 rounded-full p-2 hover:bg-zinc-800"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-3xl font-bold text-white mb-2">
          {movieToEdit ? 'Редактировать контент' : 'Добавить контент'}
        </h2>
        {genre && !movieToEdit && <p className="text-zinc-400 mb-8">В жанр: <strong className="text-white">{genre.name}</strong></p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Название контента</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E50914] transition-all"
              placeholder="Например: Начало"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Год выпуска (необязательно)</label>
            <input 
              type="text" 
              value={formData.release_year}
              onChange={(e) => setFormData({...formData, release_year: e.target.value})}
              className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E50914] transition-all"
              placeholder="Например: 2010 или 2010 - 2013"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Постер</label>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`w-32 h-20 rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative
                ${previewUrl ? 'border-transparent' : 'border-zinc-700 hover:border-[#E50914] hover:bg-zinc-900/50'}`}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-white font-medium bg-black/50 px-2 py-1 text-sm rounded-md">Изменить фото</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-zinc-500 p-1 text-center">
                  <UploadCloud className="w-6 h-6 mb-1" />
                  <span className="font-medium text-[10px]">Загрузить</span>
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[#E50914] animate-spin mb-1" />
                  <span className="text-xs text-white font-medium">Загрузка...</span>
                </div>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden" 
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-md">
            <input 
              type="checkbox" 
              id="is_collection"
              checked={formData.is_collection}
              onChange={(e) => setFormData({...formData, is_collection: e.target.checked})}
              className="w-5 h-5 accent-[#E50914] rounded bg-zinc-800 border-zinc-700"
            />
            <label htmlFor="is_collection" className="text-white font-medium cursor-pointer select-none flex-1">
              {isSeries ? "Это сериал (несколько сезонов/серий)" : "Это коллекция (несколько частей франшизы)"}
            </label>
          </div>
          <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-md">
            <input 
              type="checkbox" 
              id="has_subtitles"
              checked={formData.has_subtitles}
              onChange={(e) => setFormData({...formData, has_subtitles: e.target.checked})}
              className="w-5 h-5 accent-[#E50914] rounded bg-zinc-800 border-zinc-700"
            />
            <label htmlFor="has_subtitles" className="text-white font-medium cursor-pointer select-none flex-1">
              Есть субтитры [CC]
            </label>
          </div>

          {formData.is_collection && isCartoons && (
            <div className="flex gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-md">
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input 
                  type="radio" 
                  name="collection_type" 
                  value="franchise" 
                  checked={collectionType === 'franchise'} 
                  onChange={() => setCollectionType('franchise')} 
                  className="accent-[#E50914] w-4 h-4"
                />
                Франшиза (Части)
              </label>
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input 
                  type="radio" 
                  name="collection_type" 
                  value="series" 
                  checked={collectionType === 'series'} 
                  onChange={() => setCollectionType('series')}
                  className="accent-[#E50914] w-4 h-4"
                />
                Сериал (Сезоны)
              </label>
            </div>
          )}

          {!formData.is_collection ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Ссылка или ID поста Telegram (Video)</label>
              <input 
                type="text" 
                required
                value={formData.telegram_link}
                onChange={(e) => setFormData({...formData, telegram_link: e.target.value})}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#E50914] transition-all"
                placeholder="Пример: https://t.me/c/12345/678 или просто 678"
              />
            </div>
          ) : (
            <div className="space-y-6 border-t border-zinc-800 pt-6">
              
              {formData.seasons.map((season, sIdx) => (
                <div key={sIdx} className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-5 relative">
                  
                  {isActuallyFranchise ? (
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Части коллекции</h3>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Сезон {season.seasonNumber}</h3>
                      {formData.seasons.length > 1 && (
                        <button type="button" onClick={() => removeSeason(sIdx)} className="text-red-500 hover:text-red-400 text-sm font-medium flex items-center gap-1">
                          <Trash2 className="w-4 h-4" /> Удалить сезон
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    {season.episodes.map((ep, eIdx) => (
                      <div key={eIdx} className="flex flex-col sm:flex-row gap-3">
                        <input 
                          type="text" 
                          
                          placeholder={isActuallyFranchise ? `Часть ${eIdx + 1}` : `Серия ${eIdx + 1}`}
                          value={ep.title}
                          onChange={(e) => updateEpisode(sIdx, eIdx, 'title', e.target.value)}
                          className="w-full sm:w-1/4 lg:w-1/5 bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#E50914]"
                        />
                        <input 
                          type="text" 
                          required
                          placeholder="Ссылка или ID (Telegram)"
                          value={ep.telegram_link}
                          onChange={(e) => updateEpisode(sIdx, eIdx, 'telegram_link', e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#E50914]"
                        />
                        {season.episodes.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeEpisode(sIdx, eIdx)}
                            className="p-2 text-zinc-500 hover:text-red-500 bg-zinc-900 border border-zinc-700 rounded-md transition-colors shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button" 
                    onClick={() => addEpisode(sIdx)}
                    className="mt-4 text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded flex items-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Добавить {isActuallyFranchise ? 'часть' : 'серию'}
                  </button>
                </div>
              ))}

              {!isActuallyFranchise && (
                <button 
                  type="button" 
                  onClick={addSeason}
                  className="w-full py-3 border-2 border-dashed border-zinc-700 text-zinc-400 rounded-lg hover:text-white hover:border-[#E50914] transition-all font-bold flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Добавить сезон
                </button>
              )}
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-md font-medium text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {message.text}
            </div>
          )}

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-transparent border border-zinc-700 text-white font-bold py-3 rounded-md hover:bg-zinc-800 transition-colors"
            >
              Отмена
            </button>
            <button 
              type="submit" 
              disabled={loading || uploading}
              className="flex-1 bg-[#E50914] text-white font-bold py-3 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Сохранение...' : (movieToEdit ? 'Сохранить изменения' : 'Добавить в базу')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
