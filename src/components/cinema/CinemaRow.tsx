'use client';

import React, { useRef } from 'react';
import { CinemaLandscapeCard } from './CinemaLandscapeCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CinemaRowProps {
  title: string;
  items: any[];
  onSelectItem: (item: any) => void;
}

export function CinemaRow({ title, items, onSelectItem }: CinemaRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="space-y-2 py-2 group/row relative">
      <h2 className="text-sm sm:text-base font-bold text-white tracking-wide px-1">
        {title}
      </h2>

      <div className="relative">
        {/* Стрелка влево */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-0 bottom-0 z-20 w-9 bg-black/60 hover:bg-black/85 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-r-md backdrop-blur-sm cursor-pointer"
          title="Назад"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Дорожка карусели */}
        <div
          ref={rowRef}
          className="flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1"
        >
          {items.map((item) => (
            <CinemaLandscapeCard
              key={`${item.media_type || 'm'}-${item.id}`}
              item={item}
              onSelect={() => onSelectItem(item)}
            />
          ))}
        </div>

        {/* Стрелка вправо */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-0 bottom-0 z-20 w-9 bg-black/60 hover:bg-black/85 text-white opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-l-md backdrop-blur-sm cursor-pointer"
          title="Вперёд"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default CinemaRow;
