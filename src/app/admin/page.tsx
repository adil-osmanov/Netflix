import Navbar from "@/components/Navbar";
import { getCategories, getGenres } from "./actions";
import GenreManager from "./GenreManager";
import AdminControls from "./AdminControls";

export const revalidate = 0;

export default async function AdminPage() {
  const categories = await getCategories();
  const genres = await getGenres();

  return (
    <main className="min-h-screen bg-black pt-32 pb-12 text-white font-sans w-full flex flex-col items-center">
      <Navbar />
      
      <div className="w-full max-w-4xl px-6 md:px-0 mt-8">
        <div className="bg-[#141414] p-8 md:p-12 rounded-lg shadow-2xl border border-zinc-800/50">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-white tracking-wide">Панель управления</h1>
          <AdminControls />
          <GenreManager initialCategories={categories} initialGenres={genres} />
        </div>
      </div>
    </main>
  );
}
