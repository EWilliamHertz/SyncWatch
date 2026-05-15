"use client";

import { useState } from 'react';
import { Search, Database, Share2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 font-sans flex flex-col items-center">
      <section className="w-full max-w-4xl px-6 py-24 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Find a series. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Track it together.
          </span>
        </h1>
        
        <form onSubmit={handleSearch} className="w-full max-w-2xl relative mb-16">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search TMDB for movies, anime, or TV series..." 
            className="w-full bg-neutral-900 border-2 border-neutral-800 rounded-full px-6 py-4 pl-14 text-lg text-white focus:outline-none focus:border-emerald-500 transition-colors shadow-2xl"
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-500" size={24} />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-6 py-2 rounded-full font-bold transition-colors">
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left w-full mt-8 border-t border-neutral-800 pt-16">
          <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
            <Database className="text-emerald-400 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Powered by TMDB</h3>
            <p className="text-neutral-400">Access millions of titles, complete with exact season and episode breakdowns for accurate tracking.</p>
          </div>
          <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
            <Share2 className="text-cyan-400 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Co-Watching Groups</h3>
            <p className="text-neutral-400">Select exactly who you are watching with. When one person ticks off an episode, everyone's list updates.</p>
          </div>
          <div className="bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800">
            <CheckCircle className="text-blue-400 mb-4" size={32} />
            <h3 className="text-xl font-bold mb-2">Detailed Logging</h3>
            <p className="text-neutral-400">Move away from physical post-it notes. Keep a permanent, synchronized history of your shared journeys.</p>
          </div>
        </div>
      </section>
    </main>
  );
}