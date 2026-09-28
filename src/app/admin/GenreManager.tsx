"use client";

import { useState } from "react";
import { addGenre, swapGenreOrder, deleteGenreAction, updateGenreAction, reorderGenresAction } from "./actions";
import { ArrowUp, ArrowDown, Trash2, Edit2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GenreManager({ initialCategories, initialGenres }: { initialCategories: any[], initialGenres: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Active Category Tab
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    initialCategories.length > 0 ? initialCategories[0].id : ""
  );

  // Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState<{id: string, name: string} | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    order_index: 0
  });

  // Edit State
  const [editingGenreId, setEditingGenreId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Filter genres based on active category
  const activeGenres = initialGenres.filter(g => g.category_id === activeCategoryId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditStart = (id: string, currentName: string) => {
    setEditingGenreId(id);
    setEditingName(currentName);
  };

  const handleEditCancel = () => {
    setEditingGenreId(null);
    setEditingName("");
  };

  const handleEditSave = async (id: string) => {
    if (!editingName.trim()) return;
    setLoading(true);
    const result = await updateGenreAction(id, editingName.trim());
    if (result.success) {
      setEditingGenreId(null);
      setEditingName("");
      setMessage({ text: "Название жанра успешно обновлено.", type: "success" });
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ text: result.error || "Ошибка обновления", type: "error" });
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCategoryId) return;
    
    setLoading(true);
    setMessage(null);

    const result = await addGenre(formData.name, activeCategoryId, Number(formData.order_index));

    if (result.success) {
      setMessage({ text: "Успешно! Жанр добавлен.", type: "success" });
      setFormData({ name: "", order_index: Number(formData.order_index) + 1 });
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ text: result.error || "Ошибка добавления жанра", type: "error" });
    }
    
    setLoading(false);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === activeGenres.length - 1) return;

    setLoading(true);
    const newGenres = [...activeGenres];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap the elements in the array
    [newGenres[index], newGenres[swapIndex]] = [newGenres[swapIndex], newGenres[index]];
    
    const orderedIds = newGenres.map(g => g.id);
    const result = await reorderGenresAction(orderedIds);

    if (result.success) {
      router.refresh();
    } else {
      setMessage({ text: result.error || "Ошибка перемещения", type: "error" });
    }
    setLoading(false);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setGenreToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!genreToDelete) return;
    setLoading(true);
    
    const result = await deleteGenreAction(genreToDelete.id);
    
    if (result.success) {
      setDeleteModalOpen(false);
      setGenreToDelete(null);
      setMessage({ text: "Жанр успешно удален.", type: "success" });
      router.refresh();
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ text: result.error || "Ошибка удаления жанра", type: "error" });
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      
      {/* Category Tabs */}
      <div className="flex space-x-2 md:space-x-4 border-b border-zinc-800 pb-4 overflow-x-auto no-scrollbar">
        {initialCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
              activeCategoryId === cat.id 
                ? 'bg-white text-black' 
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {message && (
        <div className={`p-4 rounded-md flex items-center ${message.type === 'success' ? 'bg-green-600/10 text-green-500 border border-green-600/20' : 'bg-red-600/10 text-[#E50914] border border-[#E50914]/20'}`}>
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Add New Genre Form */}
      <form onSubmit={handleAdd} className="space-y-6 bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold mb-4 text-white">Создать жанр в выбранной категории</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Название жанра</label>
            <input 
              required
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-zinc-800 rounded-md px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#E50914] transition-all placeholder:text-zinc-500"
              placeholder="Например: Боевики, Комедии"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-400 mb-2">Индекс сортировки (Order)</label>
            <input 
              required
              type="number"
              name="order_index"
              value={formData.order_index}
              onChange={handleChange}
              className="w-full bg-zinc-800 rounded-md px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[#E50914] transition-all placeholder:text-zinc-500"
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={loading || !activeCategoryId}
          className="w-full md:w-auto px-8 bg-[#E50914] hover:bg-red-700 text-white font-bold rounded-md py-3 transition-colors duration-300 disabled:opacity-60"
        >
          {loading ? "Сохранение..." : "+ Добавить жанр"}
        </button>
      </form>

      {/* List Existing Genres for Active Tab */}
      <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-semibold mb-6 text-white">Управление жанрами</h2>
        {activeGenres.length === 0 ? (
          <p className="text-gray-500">В этой категории пока нет жанров.</p>
        ) : (
          <div className="space-y-3">
            {activeGenres.map((genre, index) => (
              <div key={genre.id} className="flex items-center justify-between bg-zinc-800/50 p-4 rounded-md border border-zinc-800 transition-all hover:bg-zinc-800">
                
                {editingGenreId === genre.id ? (
                  <div className="flex-1 flex items-center gap-4 mr-4">
                    <input 
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-white outline-none focus:border-[#E50914] transition-colors"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(genre.id);
                        if (e.key === 'Escape') handleEditCancel();
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <button 
                        disabled={loading}
                        onClick={() => handleEditSave(genre.id)}
                        className="p-2 text-green-500 hover:bg-zinc-700 rounded transition-colors"
                        title="Сохранить"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button 
                        disabled={loading}
                        onClick={handleEditCancel}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        title="Отмена"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-white font-medium text-lg">{genre.name}</span>
                      <span className="text-zinc-500 text-sm">Порядок (Order): {genre.order_index}</span>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                      <button 
                        disabled={loading}
                        onClick={() => handleEditStart(genre.id, genre.name)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                        title="Редактировать название"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      
                      <div className="w-px h-6 bg-zinc-700 hidden md:block mx-1"></div>

                      <div className="flex items-center gap-1">
                        <button 
                          disabled={loading || index === 0}
                          onClick={() => handleMove(index, 'up')}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded disabled:opacity-30 transition-colors"
                        >
                          <ArrowUp className="w-5 h-5" />
                        </button>
                        <button 
                          disabled={loading || index === activeGenres.length - 1}
                          onClick={() => handleMove(index, 'down')}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded disabled:opacity-30 transition-colors"
                        >
                          <ArrowDown className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="w-px h-6 bg-zinc-700 hidden md:block"></div>
                      <button 
                        disabled={loading}
                        onClick={() => handleDeleteClick(genre.id, genre.name)}
                        className="p-2 text-zinc-500 hover:text-[#E50914] transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-zinc-800 w-full max-w-md rounded-lg shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200 text-center">
            <Trash2 className="w-12 h-12 text-[#E50914] mx-auto mb-4 opacity-80" />
            <h2 className="text-2xl font-bold text-white mb-2">Удалить жанр?</h2>
            <p className="text-zinc-400 mb-8">
              Вы уверены, что хотите удалить <strong className="text-white">'{genreToDelete?.name}'</strong>?<br/>
              Это действие необратимо и скроет весь связанный с ним контент.
            </p>
            
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setDeleteModalOpen(false)}
                disabled={loading}
                className="flex-1 bg-transparent border border-zinc-700 text-white font-bold py-3 rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button 
                onClick={confirmDelete}
                disabled={loading}
                className="flex-1 bg-[#E50914] hover:bg-red-700 text-white font-bold py-3 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
