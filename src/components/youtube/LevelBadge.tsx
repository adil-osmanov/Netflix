export function getLevelBadgeStyle(lvl: string) {
  switch (lvl.toUpperCase()) {
    case 'A1':
      return 'bg-amber-600 text-white'; // Теплый янтарный для старта
    case 'A2':
      return 'bg-blue-600 text-white';  // Классический синий
    case 'B1':
      return 'bg-cyan-600 text-white';  // Бирюзовый
    case 'B2':
      return 'bg-emerald-600 text-white'; // Изумрудный
    case 'C1':
      return 'bg-red-600 text-white';   // Красный экспертный
    default:
      return 'bg-zinc-800 text-zinc-200';
  }
}

export function LevelBadge({ level }: { level: string }) {
  return (
    <div className="absolute top-2.5 left-2.5 z-10 select-none pointer-events-none">
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase shadow-md ${getLevelBadgeStyle(
          level
        )}`}
      >
        {level}
      </span>
    </div>
  );
}
