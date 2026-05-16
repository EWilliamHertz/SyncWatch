"use client";

import { useState, useEffect } from 'react';
import { Users, User, Search, X, PlayCircle, Plus, Bell, BarChart2, UserPlus, Edit2, Check, XCircle, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUser = session?.user?.name || "Guest";

  // --- DATABASE STATE ---
  const [shows, setShows] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Database Data
  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setShows(data.activeShows);
        setPendingInvites(data.pendingInvites);
        
        // Alert the user if they have invites waiting!
        if (data.pendingInvites.length > 0) {
          toast(`You have ${data.pendingInvites.length} pending invite(s)! Click the Bell icon to accept.`, { 
            icon: '🔔', 
            duration: 5000 
          });
        }
      }
    } catch (e) {
      toast.error("Failed to sync with database");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) fetchDashboardData();
  }, [session]);

  // --- UI STATE ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState<any>(null);
  
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [activePartnerFilters, setActivePartnerFilters] = useState<string[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [editingShow, setEditingShow] = useState<any>(null);
  
  // TMDB & Add Flow
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [modalCategory, setModalCategory] = useState("All");
  const [selectedShow, setSelectedShow] = useState<any>(null);
  
  const [watchMode, setWatchMode] = useState<"solo" | "partner">("solo");
  const [friendSearch, setFriendSearch] = useState("");
  const [userResults, setUserResults] = useState<any[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<any[]>([]);
  const [progressMode, setProgressMode] = useState<"fresh" | "progress" | "completed" | null>(null);
  const [seasonInput, setSeasonInput] = useState<number | string>(1);
  const [episodeInput, setEpisodeInput] = useState<number | string>(1);

  // --- DATABASE ACTIONS ---
  const handleSaveToTracker = async () => {
    if (!selectedShow?.fullDetails) return;
    const details = selectedShow.fullDetails;
    let totalWatched = 0;
    
    if (selectedShow.media_type === 'movie' || progressMode === 'completed') {
      totalWatched = details.number_of_episodes || 1;
    } else if (progressMode === 'progress') {
      let pastEpisodes = 0;
      if (details.seasons) details.seasons.forEach((s: any) => {
        if (s.season_number > 0 && s.season_number < Number(seasonInput)) pastEpisodes += s.episode_count;
      });
      totalWatched = pastEpisodes + Number(episodeInput);
    }

    // Calculate the formatted Year String
    let displayYear = "";
    if (selectedShow.media_type === 'movie') {
      displayYear = details.release_date ? details.release_date.split('-')[0] : "";
    } else {
      const startYear = details.first_air_date ? details.first_air_date.split('-')[0] : "";
      const endYear = (details.status === "Ended" || details.status === "Canceled") 
        ? (details.last_air_date ? details.last_air_date.split('-')[0] : "") 
        : "Present";
      displayYear = startYear ? `${startYear} - ${endYear}` : "";
    }

    // Accurately determine the exact media type
    let determinedType = 'TV Series';
    if (selectedShow.media_type === 'movie') {
      determinedType = 'Movie';
    } else {
      const isAnime = selectedShow.original_language === 'ja';
      const isCartoon = !isAnime && (selectedShow.genre_ids?.includes(16) || details.genres?.some((g: any) => g.id === 16));
      if (isAnime) determinedType = 'Anime';
      else if (isCartoon) determinedType = 'Cartoon';
    }

   const payload = {
      tmdbId: selectedShow.id,
      title: selectedShow.name || selectedShow.title,
      type: determinedType,
      poster: selectedShow.poster_path,
      year: displayYear, 
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
      fetchDashboardData();
    } else {
      toast.error("Failed to add show");
    }
    
    setSelectedShow(null); setProgressMode(null); setSelectedPartners([]); setWatchMode('solo'); setIsModalOpen(false); setSearchQuery("");
  };

  const executeAction = async (showId: string, action: string, extraData: any = {}) => {
    await fetch('/api/dashboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showId, action, ...extraData })
    });
    fetchDashboardData();
  };

  const incrementEpisode = async (id: string) => {
    setShows(shows.map(s => s.id === id ? { ...s, episodesWatched: s.episodesWatched + 1, currentEpisode: s.currentEpisode + 1 } : s));
    toast.success("Progress saved & synced!");
    await executeAction(id, 'increment');
  };

  const saveEdits = async () => {
    toast.success("Updating database...");
    await executeAction(editingShow.id, 'edit', { 
      status: editingShow.status, 
      episodesWatched: editingShow.episodesWatched,
      currentSeason: editingShow.currentSeason,
      currentEpisode: editingShow.currentEpisode
    });
    setEditingShow(null);
  };

  const removeShow = async (id: string) => {
    toast.success("Deleting show...");
    await executeAction(id, 'delete');
    setEditingShow(null);
  };

  // --- API SEARCH SIMULATIONS ---
  useEffect(() => {
    const delay = setTimeout(async () => {
      if (!searchQuery.trim()) { setSearchResults([]); return; }
      setIsSearching(true);
      const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (friendSearch.length < 2) { setUserResults([]); return; }
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(friendSearch)}`);
      const data = await res.json();
      setUserResults(data.filter((u: any) => u.username !== currentUser && !selectedPartners.find(p => p.id === u.id)));
    }, 300);
    return () => clearTimeout(delay);
  }, [friendSearch]);

  const fetchFullDetails = async (item: any) => {
    const type = item.media_type === 'movie' ? 'movie' : 'tv';
    const res = await fetch(`https://api.themoviedb.org/3/${type}/${item.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
    const data = await res.json();
    setSelectedShow({ ...item, fullDetails: data });
  };
  // NEW: Quick Add Function for Previous Partners
  const handleQuickAdd = async (username: string) => {
    if (selectedPartners.find(p => p.username === username)) return;
    
    const toastId = toast.loading(`Adding ${username}...`);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(username)}`);
      const data = await res.json();
      const userObj = data.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
      
      if (userObj) {
        setSelectedPartners(prev => [...prev, userObj]);
        toast.success(`${username} added!`, { id: toastId });
      } else {
        toast.error("User not found", { id: toastId });
      }
    } catch (e) {
      toast.error("Error adding user", { id: toastId });
    }
  };
// --- STATS MODAL LOGIC ---
  const [statsTypeFilters, setStatsTypeFilters] = useState<string[]>([]);
  const [statsStatusFilters, setStatsStatusFilters] = useState<string[]>([]);
  
  const toggleStatsType = (t: string) => setStatsTypeFilters(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const toggleStatsStatus = (s: string) => setStatsStatusFilters(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const statsFilteredShows = shows.filter(show => {
    if (statsStatusFilters.length > 0 && !statsStatusFilters.includes(show.status)) return false;
    if (statsTypeFilters.length > 0 && !statsTypeFilters.includes(show.type)) return false;
    return true;
  });

  const statsWatchedMinutes = statsFilteredShows.reduce((acc, show) => acc + (show.episodesWatched * (show.runtime || 45)), 0);
  const statsLeftMinutes = statsFilteredShows.reduce((acc, show) => acc + (Math.max(0, show.totalEpisodes - show.episodesWatched) * (show.runtime || 45)), 0);
  
 // --- DERIVED RENDER DATA ---
  const allKnownPartners = Array.from(new Set(shows.flatMap(s => s.coWatchers.filter((w: string) => w !== currentUser))));
  
  const filteredShows = shows.filter(show => {
    if (statusFilter !== "All" && show.status !== statusFilter) return false;
    
    // Exact match filtering
    if (typeFilter !== "All") {
      if (typeFilter === "Movies" && show.type !== "Movie") return false;
      if (typeFilter === "TV Series" && show.type !== "TV Series") return false;
      if (typeFilter === "Anime" && show.type !== "Anime") return false;
      if (typeFilter === "Cartoons" && show.type !== "Cartoon") return false;
    }

    if (activePartnerFilters.length > 0) {
      const hasAllSelected = activePartnerFilters.every(f => show.coWatchers.includes(f));
      if (!hasAllSelected) return false;
    }
    return true;
  });

  const filteredResults = searchResults.filter(item => {
    if (item.media_type !== 'movie' && item.media_type !== 'tv') return false;
    if (modalCategory === "All") return true;
    if (modalCategory === "Movies") return item.media_type === "movie";
    if (modalCategory === "Series") return item.media_type === "tv";
    if (modalCategory === "Anime") return item.media_type === "tv" && item.original_language === "ja";
    if (modalCategory === "Cartoons") return item.media_type === "tv" && item.genre_ids?.includes(16) && item.original_language !== "ja";
    return true;
  });

  const totalMinutes = shows.reduce((acc, show) => acc + (show.episodesWatched * show.runtime), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalDays = (totalMinutes / 1440).toFixed(1);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-emerald-400 font-bold animate-pulse">Syncing Database...</div>;
  return (
    <main className="min-h-screen p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl relative">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-neutral-800 pb-8 relative">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-white">My Journey Dashboard</h1>
            <p className="text-neutral-400">Welcome, {currentUser}. Track your shared watching history.</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            
            <button onClick={fetchDashboardData} className="p-3 bg-neutral-900 border border-neutral-700 hover:border-emerald-500 rounded-full text-neutral-400 transition-colors"><RefreshCcw size={20} /></button>

            {/* NOTIFICATION BELL */}
            <div className="relative">
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-neutral-900 border border-neutral-700 hover:border-emerald-500 rounded-full text-neutral-400 transition-colors relative">
                <Bell size={20} />
                {pendingInvites.length > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-neutral-950 animate-pulse"></span>}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl z-40 p-4">
                  <h3 className="font-bold text-lg mb-3 text-white">Pending Invites</h3>
                  {pendingInvites.length === 0 ? <p className="text-neutral-500 text-sm">No new notifications.</p> : (
                    <div className="flex flex-col gap-3">
                      {pendingInvites.map(n => (
                        <div key={n.id} onClick={() => { setInviteModalOpen(n); setShowNotifications(false); }} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 cursor-pointer hover:border-emerald-500 transition-colors group">
                          <p className="text-sm text-neutral-300 mb-1"><strong>{n.sender}</strong> invited you to co-watch</p>
                          <p className="text-emerald-400 font-bold group-hover:underline">{n.showTitle}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => setShowStats(true)} className="p-3 bg-neutral-900 border border-neutral-700 hover:border-cyan-500 rounded-full text-neutral-400 transition-colors"><BarChart2 size={20} /></button>
            <button onClick={() => setIsModalOpen(true)} className="flex-1 md:flex-none bg-neutral-900 border border-neutral-700 hover:border-emerald-500 rounded-full px-5 py-3 text-left text-neutral-400 focus:outline-none transition-colors shadow-lg flex items-center gap-3">
              <Search size={20} /> <span className="hidden sm:inline">Add something new...</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-5 mb-10 bg-neutral-900/30 p-6 rounded-2xl border border-neutral-800">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider w-24">Status</span>
            <div className="flex flex-wrap gap-2">
              {['All', 'Watching', 'Watched', 'Plan to Watch', 'Dropped'].map(status => (
                <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === status ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>{status}</button>
              ))}
            </div>
          </div>
          <div className="h-px bg-neutral-800/50 w-full"></div>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider w-24">Category</span>
            <div className="flex flex-wrap gap-2">
              {['All', 'Anime', 'TV Series', 'Cartoons', 'Movies'].map(type => (
                <button key={type} onClick={() => setTypeFilter(type)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === type ? 'bg-cyan-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>{type}</button>
              ))}
            </div>
          </div>
          <div className="h-px bg-neutral-800/50 w-full"></div>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <span className="text-sm font-bold text-neutral-500 uppercase tracking-wider w-24">Partners</span>
            <div className="flex flex-wrap gap-2">
              {allKnownPartners.length === 0 && <span className="text-neutral-600 text-sm italic py-1.5">No partners added yet</span>}
              {allKnownPartners.map(partner => (
                <button key={partner} onClick={() => {
                  if (activePartnerFilters.includes(partner)) setActivePartnerFilters(activePartnerFilters.filter(p => p !== partner));
                  else setActivePartnerFilters([...activePartnerFilters, partner]);
                }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${activePartnerFilters.includes(partner) ? 'bg-blue-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>
                  <Users size={14} /> {partner}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Display Shows Grid */}
        {filteredShows.length === 0 ? (
          <div className="text-center py-24 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-inner">
            <div className="text-neutral-600 mb-6 flex justify-center"><Search size={56} /></div>
            <h3 className="text-2xl font-bold mb-3 text-neutral-200">No titles found</h3>
            <p className="text-neutral-400 max-w-md mx-auto text-lg">Use the search bar above to find new series or movies.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShows.map(show => {
              const showPartners = show.coWatchers.filter((w: string) => w !== currentUser);
              return (
                <div key={show.id} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-600 rounded-xl p-4 shadow-lg flex gap-4 relative group">
                  {show.poster ? <img src={`https://image.tmdb.org/t/p/w200${show.poster}`} className="w-24 h-36 object-cover rounded-md shadow-md" /> : <div className="w-24 h-36 bg-neutral-800 rounded-md"></div>}
                  <div className="flex flex-col justify-between flex-1 py-1">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          {show.type} {show.year && <span className="text-neutral-600 font-bold px-1">• {show.year}</span>}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          {showPartners.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-blue-900/50 bg-blue-500/10 text-blue-400">{showPartners.join(', ')}</span>}
                          {show.pendingWatchers?.length > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-900/50 bg-yellow-500/10 text-yellow-500">Waiting on: {show.pendingWatchers.join(', ')}</span>}
                        </div>
                      </div>
                      <h2 className="text-lg font-bold leading-tight line-clamp-2 text-white">{show.title}</h2>
                      <div className="mt-1">
                        <p className={`text-xs font-medium ${
                          show.status === 'Plan to Watch' ? 'text-emerald-400' :
                          show.status === 'Watched' ? 'text-yellow-400' :
                          show.status === 'Watching' ? 'text-blue-400' :
                          show.status === 'Dropped' ? 'text-red-400' : 'text-neutral-300'
                        }`}>
                          {show.status}
                        </p>
{show.type !== 'Movie' && <p className="text-xs text-neutral-500 font-bold tracking-wider mt-0.5">Season {show.currentSeason} • Episode {show.currentEpisode}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-medium text-emerald-400 flex items-center gap-1 cursor-pointer" onClick={() => setEditingShow(show)}>
                        <Edit2 size={14} className="text-neutral-500 hover:text-white" /> 
                        {show.type === 'Movie' 
                          ? `${Math.floor((show.runtime || 0) / 60)}h ${(show.runtime || 0) % 60}m` 
                          : `S${show.currentSeason} E${show.currentEpisode}`}
                      </span>
                      {/* Only show the plus button if it's NOT a movie AND we haven't finished all episodes! */}
                      {show.type !== 'Movie' && show.episodesWatched < show.totalEpisodes && (
                        <button onClick={() => incrementEpisode(show.id)} className="bg-neutral-800 hover:bg-emerald-500 hover:text-neutral-950 text-neutral-300 p-2 rounded-lg transition-colors shadow-lg">
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INVITE ACCEPT/REJECT MODAL */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 text-white flex flex-col">
            <div className="p-6 border-b border-neutral-800 bg-neutral-950 flex justify-between items-center">
              <h2 className="text-2xl font-bold flex items-center gap-2"><Bell className="text-emerald-400" /> Co-Watch Invitation</h2>
            </div>
            <div className="p-8 flex flex-col md:flex-row gap-8 items-start">
              {inviteModalOpen.showPoster && <img src={`https://image.tmdb.org/t/p/w300${inviteModalOpen.showPoster}`} className="w-48 rounded-xl shadow-2xl shrink-0" />}
              <div className="flex flex-col flex-1">
                <span className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2">From {inviteModalOpen.sender}</span>
                <h3 className="text-3xl font-extrabold mb-3">{inviteModalOpen.showTitle}</h3>
                
                {/* NEW: Media Details Row */}
                <div className="flex flex-wrap items-center gap-3 mb-8 text-sm font-medium">
                  <span className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-full text-emerald-400 uppercase tracking-wider text-[10px]">
                    {inviteModalOpen.type}
                  </span>
                  <span className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded-full text-neutral-300 text-xs">
                    {inviteModalOpen.type === 'Movie' 
                      ? `${Math.floor((inviteModalOpen.runtime || 0) / 60)}h ${(inviteModalOpen.runtime || 0) % 60}m` 
                      : `${inviteModalOpen.totalEpisodes} Episodes`}
                  </span>
                </div>
                
                <div className="mt-auto flex gap-4 w-full">
                  <button onClick={() => { executeAction(inviteModalOpen.id, 'reject'); setInviteModalOpen(null); toast.error("Declined."); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-neutral-800 hover:bg-red-500 hover:text-white transition-colors">
                    <XCircle size={18} /> Decline
                  </button>
                  <button onClick={() => { executeAction(inviteModalOpen.id, 'accept'); setInviteModalOpen(null); toast.success("Joined Show!"); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors">
                    <Check size={18} /> Accept & Sync
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingShow && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 relative text-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Edit Watch Data</h2>
              <button onClick={() => setEditingShow(null)} className="text-neutral-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-1">Status</label>
                <select value={editingShow.status} onChange={(e) => setEditingShow({...editingShow, status: e.target.value})} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-lg px-4 py-2 focus:border-cyan-500">
                  {['Watching', 'Watched', 'Plan to Watch', 'Dropped'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {editingShow.type !== 'Movie' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-neutral-400 mb-1">Season</label>
                    <input type="number" min="1" value={editingShow.currentSeason} onChange={(e) => setEditingShow({...editingShow, currentSeason: parseInt(e.target.value) || 1})} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-lg px-4 py-2 focus:border-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-400 mb-1">Current Episode</label>
                    <input type="number" min="0" value={editingShow.currentEpisode} onChange={(e) => setEditingShow({...editingShow, currentEpisode: parseInt(e.target.value) || 0})} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-lg px-4 py-2 focus:border-cyan-500" />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-1">Total Episodes Watched (For Stats)</label>
                <input type="number" min="0" value={editingShow.episodesWatched} onChange={(e) => setEditingShow({...editingShow, episodesWatched: parseInt(e.target.value) || 0})} className="w-full bg-neutral-950 border border-neutral-700 text-white rounded-lg px-4 py-2 focus:border-cyan-500" />
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={() => removeShow(editingShow.id)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-colors">Delete</button>
                <button onClick={saveEdits} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 rounded-xl transition-colors">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white">
            <div className="p-6 border-b border-neutral-800 bg-neutral-950 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-emerald-400">Add to Tracker</h2>
                <button onClick={() => { setIsModalOpen(false); setSelectedShow(null); setProgressMode(null); }} className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-400"><X size={20} /></button>
              </div>

              {!selectedShow ? (
                <>
                  <form onSubmit={(e) => e.preventDefault()} className="relative w-full">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search TMDB..." className="w-full bg-neutral-900 border-2 border-neutral-700 hover:border-emerald-500 rounded-xl px-5 py-4 pl-12 text-white focus:outline-none transition-colors" />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={24} />
                  </form>
                  <div className="flex gap-2 overflow-x-auto mt-2">
                    {['All', 'Movies', 'Series', 'Anime', 'Cartoons'].map(cat => <button key={cat} onClick={() => setModalCategory(cat)} className={`px-4 py-1.5 rounded-full text-sm font-medium ${modalCategory === cat ? 'bg-cyan-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'}`}>{cat}</button>)}
                  </div>
                </>
              ) : <button onClick={() => { setSelectedShow(null); setProgressMode(null); }} className="text-emerald-400 font-medium hover:underline text-sm w-fit">← Back</button>}
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-neutral-900">
              {!selectedShow ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isSearching ? <div className="col-span-full text-center py-12">Searching...</div> : null}
                  {!isSearching && filteredResults.map((item) => (
                    <div key={item.id} onClick={() => fetchFullDetails(item)} className="bg-neutral-950 border border-neutral-800 hover:border-emerald-500 rounded-xl p-4 cursor-pointer flex gap-4 items-center">
                      {item.poster_path ? <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} className="w-16 h-24 object-cover rounded-md" /> : <div className="w-16 h-24 bg-neutral-800 rounded-md"></div>}
                      <div><span className="text-xs font-bold text-emerald-500 uppercase">{item.media_type}</span><h4 className="font-semibold text-neutral-200">{item.name || item.title}</h4></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-w-2xl mx-auto flex flex-col gap-8">
                  <div className="flex gap-6 items-center">
                    {selectedShow.poster_path && <img src={`https://image.tmdb.org/t/p/w200${selectedShow.poster_path}`} className="w-32 rounded-lg" />}
                    <div><h2 className="text-3xl font-bold mb-2">{selectedShow.name || selectedShow.title}</h2><p className="text-neutral-400 line-clamp-3">{selectedShow.overview}</p></div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 flex flex-col gap-6">
                    <div>
                      <label className="block font-bold text-neutral-300 mb-2">1. Watch Partner(s)?</label>
                      <div className="flex gap-3 mb-3">
                        <button onClick={() => setWatchMode('solo')} className={`px-4 py-2 rounded-lg border flex-1 ${watchMode === 'solo' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'border-neutral-700 text-neutral-400'}`}>Solo Watch</button>
                        <button onClick={() => setWatchMode('partner')} className={`px-4 py-2 rounded-lg border flex-1 ${watchMode === 'partner' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'border-neutral-700 text-neutral-400'}`}>Invite Partner(s)</button>
                      </div>
                      
                      {watchMode === 'partner' && (
                        <div className="space-y-3">
                          <div className="relative">
                            <input type="text" value={friendSearch} onChange={(e) => setFriendSearch(e.target.value)} placeholder="Search database for usernames..." className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-3 pl-10 focus:outline-none focus:border-blue-500 transition-colors" />
                            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
                            {userResults.length > 0 && (
                              <div className="absolute top-full left-0 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
                                {userResults.map(u => (
                                  <div key={u.id} onClick={() => {
                                    if (!selectedPartners.find(p => p.id === u.id)) setSelectedPartners([...selectedPartners, u]);
                                    setFriendSearch(""); setUserResults([]);
                                  }} className="px-4 py-3 hover:bg-neutral-700 cursor-pointer text-white text-sm border-b border-neutral-700/50">{u.username}</div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* QUICK SELECT PREVIOUS PARTNERS */}
                          {allKnownPartners.filter(p => !selectedPartners.find(sp => sp.username === p)).length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 bg-neutral-950/50 p-2 rounded-lg border border-neutral-800/50">
                              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider ml-1">Quick Add:</span>
                              {allKnownPartners.filter(p => !selectedPartners.find(sp => sp.username === p)).map(partner => (
                                <button 
                                  key={partner} 
                                  onClick={() => handleQuickAdd(partner)} 
                                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                  <Plus size={12} /> {partner}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* SELECTED PARTNERS PILLS */}
                          {selectedPartners.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-800/50">
                              {selectedPartners.map(p => (
                                <span key={p.id} className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-sm flex items-center gap-2 animate-in fade-in zoom-in-95">
                                  {p.username} 
                                  <button onClick={() => setSelectedPartners(selectedPartners.filter(x => x.id !== p.id))} className="hover:text-blue-200 transition-colors">
                                    <X size={14}/>
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-300 mb-2">2. Progress</label>
                      <div className="flex gap-2">
                        <button onClick={() => { setProgressMode('fresh'); setSeasonInput(1); setEpisodeInput(1); }} className={`flex-1 py-2 rounded-lg border text-sm ${progressMode === 'fresh' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'border-neutral-700 text-neutral-400'}`}>Start Fresh</button>
                        <button onClick={() => setProgressMode('progress')} className={`flex-1 py-2 rounded-lg border text-sm ${progressMode === 'progress' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-neutral-700 text-neutral-400'}`}>We are at...</button>
                        <button onClick={() => setProgressMode('completed')} className={`flex-1 py-2 rounded-lg border text-sm ${progressMode === 'completed' ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'border-neutral-700 text-neutral-400'}`}>Completed</button>
                      </div>
                    </div>

                    {progressMode === 'progress' && selectedShow.media_type === 'tv' && (
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-sm text-neutral-500 mb-1">Season</label>
                          <input type="number" min="1" value={seasonInput} onChange={(e) => setSeasonInput(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-2" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm text-neutral-500 mb-1">Episode</label>
                          <input type="number" min="1" value={episodeInput} onChange={(e) => setEpisodeInput(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 text-white rounded-lg px-4 py-2" />
                        </div>
                      </div>
                    )}

                    {progressMode && (
                      <button onClick={handleSaveToTracker} className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-4 rounded-xl mt-4">Save to Tracker</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATISTICS MODAL */}
      {showStats && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-6 md:p-8 relative animate-in zoom-in-95 text-white max-h-[90vh] overflow-y-auto shadow-2xl border-t border-t-neutral-700">
            <button onClick={() => setShowStats(false)} className="absolute top-4 right-4 text-neutral-500 hover:text-white bg-neutral-800 p-2 rounded-full"><X size={20} /></button>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><BarChart2 className="text-cyan-400" /> Watch Statistics</h2>
            
            {/* Multi-select Filters */}
            <div className="mb-6 space-y-4 bg-neutral-950 p-5 rounded-xl border border-neutral-800">
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Category Filter</p>
                <div className="flex flex-wrap gap-2">
                  {['Anime', 'TV Series', 'Cartoons', 'Movies'].map(type => (
                    <button key={type} onClick={() => toggleStatsType(type)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statsTypeFilters.includes(type) ? 'bg-cyan-500 text-neutral-950 shadow-lg shadow-cyan-500/20' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>{type}</button>
                  ))}
                </div>
              </div>
              <div className="w-full h-px bg-neutral-800/50"></div>
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase mb-2">Status Filter</p>
                <div className="flex flex-wrap gap-2">
                  {['Watching', 'Watched', 'Plan to Watch', 'Dropped'].map(status => (
                    <button key={status} onClick={() => toggleStatsStatus(status)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statsStatusFilters.includes(status) ? 'bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}>{status}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-neutral-500 text-sm font-bold uppercase mb-1">Titles matching filters</p>
                <p className="text-3xl font-bold text-white">{statsFilteredShows.length}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Watched Stats */}
                <div className="bg-neutral-950 p-5 rounded-xl border border-emerald-500/30 relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <p className="text-emerald-500 text-sm font-bold uppercase mb-4">Time Watched</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-neutral-400 text-sm font-medium">Hours</span><span className="font-bold text-lg text-white">{(statsWatchedMinutes / 60).toFixed(1)}h</span></div>
                    <div className="flex justify-between items-center"><span className="text-neutral-400 text-sm font-medium">Days of Life</span><span className="font-bold text-emerald-400 text-lg">{(statsWatchedMinutes / 1440).toFixed(1)} Days</span></div>
                  </div>
                </div>

                {/* Left to Watch Stats */}
                <div className="bg-neutral-950 p-5 rounded-xl border border-blue-500/30 relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <p className="text-blue-500 text-sm font-bold uppercase mb-4">Left to Watch</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-neutral-400 text-sm font-medium">Hours</span><span className="font-bold text-lg text-white">{(statsLeftMinutes / 60).toFixed(1)}h</span></div>
                    <div className="flex justify-between items-center"><span className="text-neutral-400 text-sm font-medium">Days Required</span><span className="font-bold text-blue-400 text-lg">{(statsLeftMinutes / 1440).toFixed(1)} Days</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}