"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronDown, PlayCircle, Clock, Plus, Check, UserPlus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

function DetailsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  const [details, setDetails] = useState<any>(null);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [episodesData, setEpisodesData] = useState<Record<number, any[]>>({});

  // Add Flow State
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [watchMode, setWatchMode] = useState<"solo" | "partner">("solo");
  const [progressMode, setProgressMode] = useState<"fresh" | "progress" | "completed" | null>(null);
  const [seasonInput, setSeasonInput] = useState<number | string>(1);
  const [episodeInput, setEpisodeInput] = useState<number | string>(1);

  // Multi-Partner Search State
  const [friendSearch, setFriendSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<any[]>([]);

  useEffect(() => {
    if (!id || !type) return;
    const fetchDetails = async () => {
      const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
      const data = await res.json();
      setDetails(data);
    };
    fetchDetails();
  }, [id, type]);

  // Debounced DB Search for Users
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (friendSearch.length < 2) {
        setUserResults([]);
        return;
      }
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(friendSearch)}`);
      const data = await res.json();
      setUserResults(data);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [friendSearch]);

  const fetchEpisodes = async (seasonNumber: number) => {
    if (episodesData[seasonNumber]) {
      setExpandedSeason(expandedSeason === seasonNumber ? null : seasonNumber);
      return;
    }
    const res = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${seasonNumber}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
    const data = await res.json();
    setEpisodesData(prev => ({ ...prev, [seasonNumber]: data.episodes }));
    setExpandedSeason(seasonNumber);
  };

  const handleStartAddFlow = () => {
    if (status === 'unauthenticated') {
      toast.error("Please log in to add shows to your dashboard!");
      router.push('/login');
      return;
    }
    setShowAddFlow(true);
  };

  const addPartner = (user: any) => {
    if (!selectedPartners.find(p => p.id === user.id)) {
      setSelectedPartners([...selectedPartners, user]);
    }
    setFriendSearch("");
    setUserResults([]);
  };

  const removePartner = (userId: string) => {
    setSelectedPartners(selectedPartners.filter(p => p.id !== userId));
  };

  const handleSaveToTracker = async () => {
    if (!details) return;
    let totalWatched = 0;
    
    // Accurate Episode Math
    if (type === 'movie' || progressMode === 'completed') {
      totalWatched = details.number_of_episodes || 1;
    } else if (progressMode === 'progress') {
      let pastEpisodes = 0;
      if (details.seasons) details.seasons.forEach((s: any) => {
        if (s.season_number > 0 && s.season_number < Number(seasonInput)) pastEpisodes += s.episode_count;
      });
      totalWatched = pastEpisodes + Number(episodeInput);
    }

    let determinedType = 'TV Series';
    if (type === 'movie') {
      determinedType = 'Movie';
    } else {
      const isAnime = details.original_language === 'ja' || details.languages?.includes('ja');
      const isCartoon = !isAnime && details.genres?.some((g: any) => g.id === 16);
      if (isAnime) determinedType = 'Anime';
      else if (isCartoon) determinedType = 'Cartoon';
    }

    // Prepare Database Payload
    const payload = {
      tmdbId: details.id,
      title: details.name || details.title,
      type: determinedType,
      poster: details.poster_path,
      episodesWatched: totalWatched,
      totalEpisodes: details.number_of_episodes || 1,
      currentSeason: progressMode === 'fresh' ? 1 : Number(seasonInput),
      currentEpisode: progressMode === 'fresh' ? 1 : Number(episodeInput), // Added
      status: progressMode === 'completed' ? 'Watched' : 'Watching',
      runtime: details.episode_run_time?.[0] || details.runtime || 45,
      invitedUserIds: selectedPartners.map(p => p.id)
    };

    const res = await fetch('/api/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      toast.success(selectedPartners.length > 0 ? "Invites sent & Show saved!" : "Saved to Dashboard!");
      setShowAddFlow(false);
      // Optional: Redirect back to dashboard after saving!
      router.push('/dashboard'); 
    } else {
      toast.error("Failed to add show to database");
    }
  };

  if (!details) return <div className="p-12 text-center animate-pulse">Loading TMDB Database...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-8 mb-12 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
        {details.poster_path && (
          <img src={`https://image.tmdb.org/t/p/w500${details.poster_path}`} alt="Poster" className="w-48 rounded-xl shadow-2xl shrink-0 object-cover" />
        )}
        <div className="w-full">
          <h1 className="text-4xl font-bold mb-2">{details.name || details.title}</h1>
          <p className="text-emerald-400 font-medium mb-4">{details.status} • {details.first_air_date?.split('-')[0] || details.release_date?.split('-')[0]}</p>
          <p className="text-neutral-300 leading-relaxed mb-6">{details.overview}</p>
          
          {!showAddFlow ? (
            <button onClick={handleStartAddFlow} className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2">
              <Plus size={18} /> Add to Dashboard
            </button>
          ) : (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 mt-4 flex flex-col gap-5 animate-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-emerald-400">Configure Tracking</h3>
                <button onClick={() => setShowAddFlow(false)} className="text-neutral-500 hover:text-neutral-300 text-sm font-medium">Cancel</button>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">1. Watch Partner(s)</label>
                <div className="flex gap-3 mb-3">
                  <button onClick={() => setWatchMode('solo')} className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors flex-1 ${watchMode === 'solo' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-neutral-900 border-neutral-700 text-neutral-400'}`}>Solo Watch</button>
                  <button onClick={() => setWatchMode('partner')} className={`px-4 py-2 rounded-lg border font-medium text-sm transition-colors flex-1 ${watchMode === 'partner' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-neutral-900 border-neutral-700 text-neutral-400'}`}>Invite Partner(s)</button>
                </div>

                {watchMode === 'partner' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <input type="text" value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)} placeholder="Search database for usernames..." className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-blue-500 transition-colors" />
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                      
                      {/* DB Search Results Dropdown */}
                      {userResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
                          {userResults.map(u => (
                            <div key={u.id} onClick={() => addPartner(u)} className="px-4 py-3 hover:bg-neutral-700 cursor-pointer text-white text-sm border-b border-neutral-700/50 last:border-0">
                              {u.username}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Selected Partners Pills */}
                    {selectedPartners.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedPartners.map(p => (
                          <span key={p.id} className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            {p.username}
                            <button onClick={() => removePartner(p.id)} className="hover:text-blue-200"><X size={14}/></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">2. Starting Point</label>
                <div className="flex gap-4">
                  <button onClick={() => { setProgressMode('fresh'); setSeasonInput(1); setEpisodeInput(1); }} className={`flex-1 py-2 px-3 rounded-lg border font-medium text-sm transition-all ${progressMode === 'fresh' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-neutral-900 border-neutral-700 text-neutral-400'}`}>Start Fresh</button>
                  <button onClick={() => setProgressMode('progress')} className={`flex-1 py-2 px-3 rounded-lg border font-medium text-sm transition-all ${progressMode === 'progress' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-neutral-900 border-neutral-700 text-neutral-400'}`}>We are at...</button>
                </div>
              </div>

              {progressMode === 'progress' && type === 'tv' && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Season</label>
                    <input type="number" min="1" value={seasonInput} onChange={(e) => setSeasonInput(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-neutral-500 mb-1">Episode</label>
                    <input type="number" min="1" value={episodeInput} onChange={(e) => setEpisodeInput(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
              )}

              {progressMode && (
                <button onClick={handleSaveToTracker} className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 rounded-xl transition-colors mt-2 flex justify-center items-center gap-2">
                  <Check size={18} /> Save Tracking Data
                </button>
              )}
            </div>
          )}

        </div>
      </div>

      {type === 'tv' && details.seasons && (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-white">Seasons & Episodes</h2>
          <div className="space-y-4">
            {details.seasons.filter((s: any) => s.season_number > 0).map((season: any) => (
              <div key={season.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <button onClick={() => fetchEpisodes(season.season_number)} className="w-full flex justify-between items-center p-6 hover:bg-neutral-800 transition-colors">
                  <div className="flex flex-col items-start">
                    {/* FIXED: Added text-white so season names like 'Season 1' are visible! */}
                    <span className="font-bold text-lg text-white">{season.name}</span>
                    <span className="text-sm text-neutral-400">{season.episode_count} Episodes</span>
                  </div>
                  <ChevronDown className={`transition-transform text-white ${expandedSeason === season.season_number ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedSeason === season.season_number && episodesData[season.season_number] && (
                  <div className="bg-neutral-950 p-4 space-y-2 border-t border-neutral-800">
                    {episodesData[season.season_number].map((ep: any) => (
                      <div key={ep.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-neutral-900 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <PlayCircle className="text-neutral-600 group-hover:text-emerald-400 transition-colors" size={24} />
                          <div><p className="font-medium text-neutral-200">{ep.episode_number}. {ep.name}</p></div>
                        </div>
                        <span className="text-sm text-neutral-500 flex items-center gap-1"><Clock size={14} /> {ep.runtime || '?'} min</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DetailsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-white">Loading TMDB Module...</div>}>
      <DetailsContent />
    </Suspense>
  );
}