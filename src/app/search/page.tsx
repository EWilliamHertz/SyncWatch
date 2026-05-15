"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Users, Plus } from 'lucide-react';
import Link from 'next/link';

// Mock friends list until Prisma is fully hooked up
const availableFriends = [
  { id: 'u1', name: 'Mark' },
  { id: 'u2', name: 'Hugo' }
];

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q');
  
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoWatcher, setSelectedCoWatcher] = useState("");

  useEffect(() => {
    const fetchTMDB = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        // Filter out people, keep movies/tv
        setResults(data.results?.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv') || []);
      } catch (error) {
        console.error("TMDB Fetch Error:", error);
      }
      setLoading(false);
    };

    fetchTMDB();
  }, [query]);

  const handleAdd = (item: any) => {
    if (!selectedCoWatcher) {
      alert("Please select who you are watching this with first!");
      return;
    }
    alert(`Added ${item.name || item.title} to NeonDB! Inviting ${availableFriends.find(f => f.id === selectedCoWatcher)?.name} to co-watch.`);
    router.push('/dashboard'); // We will redirect them to their dashboard after adding
  };

  return (
    <div className="w-full max-w-5xl px-6 py-12">
      <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-emerald-400 transition-colors mb-8 w-fit">
        <ChevronLeft size={20} /> Back to Search
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Results for "{query}"</h1>
        
        <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 p-2 rounded-lg">
          <Users className="text-cyan-400 ml-2" size={20} />
          <select 
            value={selectedCoWatcher} 
            onChange={(e) => setSelectedCoWatcher(e.target.value)}
            className="bg-transparent text-white border-none focus:ring-0 text-sm py-1 pr-8 cursor-pointer"
          >
            <option value="" disabled className="bg-neutral-900">Select watching partner...</option>
            {availableFriends.map(friend => (
              <option key={friend.id} value={friend.id} className="bg-neutral-900">With {friend.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-neutral-500 py-12 animate-pulse">Fetching from TMDB...</div>
      ) : results.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">No results found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((item) => (
            <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden flex flex-col justify-between shadow-lg">
              {item.poster_path ? (
                <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={item.name || item.title} className="w-full h-64 object-cover" />
              ) : (
                <div className="w-full h-64 bg-neutral-800 flex items-center justify-center text-neutral-600">No Image</div>
              )}
              <div className="p-4 flex flex-col flex-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 mb-1">
                  {item.media_type === 'tv' ? 'TV Series' : 'Movie'}
                </span>
                <h3 className="font-semibold text-lg mb-4">{item.name || item.title}</h3>
                <button 
                  onClick={() => router.push(`/details?id=${item.id}&type=${item.media_type}`)}
                  className="mt-auto w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-emerald-500 hover:text-neutral-950 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 font-sans flex flex-col items-center">
      <Suspense fallback={<div className="p-12">Loading...</div>}>
        <SearchResultsContent />
      </Suspense>
    </main>
  );
}