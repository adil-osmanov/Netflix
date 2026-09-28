"use client";

import { useState, useEffect } from "react";

export default function AdminControls() {
  const [hideAddButtons, setHideAddButtons] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('netflix_hide_add_buttons');
    if (saved === 'true') setHideAddButtons(true);
  }, []);

  const toggleHide = () => {
    const newValue = !hideAddButtons;
    setHideAddButtons(newValue);
    if (newValue) {
      localStorage.setItem('netflix_hide_add_buttons', 'true');
    } else {
      localStorage.removeItem('netflix_hide_add_buttons');
    }
    // Dispatch a custom event to notify other components instantly
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="bg-zinc-900/50 p-6 rounded-lg border border-zinc-800 mb-8 flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold text-white">Минимализм на сайте</h2>
        <p className="text-zinc-400 text-sm mt-1">
          Скрыть кнопки "Добавить", "Редактировать" и "Удалить" на всем сайте, чтобы интерфейс выглядел чисто.
        </p>
      </div>
      
      <button 
        onClick={toggleHide}
        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${hideAddButtons ? 'bg-green-500' : 'bg-zinc-600'}`}
      >
        <span 
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${hideAddButtons ? 'translate-x-8' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}
