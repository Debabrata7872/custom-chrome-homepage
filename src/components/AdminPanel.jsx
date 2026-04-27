import React, { useState, useEffect } from 'react';
import { CloudSun, Image as ImageIcon, Plus, Trash2, X, ShieldCheck, Users, ArrowLeft, Edit2, Loader2, Activity, Clock, Ban, UserCheck, Search, MoreVertical, Star, Link as LinkIcon, CheckCircle2, CheckCircle, Sparkles, Quote } from 'lucide-react';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; 
import Swal from 'sweetalert2';
import { getTodayStr } from '../utils';

const MOTIVATIONAL_QUOTES = [
  "The only way to do great work is to love what you do.",
  "Make each day your masterpiece.",
  "Someday is not a day of the week.",
  "It’s not whether you get knocked down, it’s whether you get up.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Do what you can, with all you have, wherever you are.",
  "You are never too old to set another goal or to dream a new dream.",
  "Focus on being productive instead of busy.",
  "Small daily improvements over time lead to stunning results.",
  "Don't wait. The time will never be just right."
];

const DYNAMIC_BACKGROUNDS = {
  morning: ['https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2070&auto=format&fit=crop'],
  afternoon: ['https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop'],
  evening: ['https://images.unsplash.com/photo-1472141521881-95d0e87e2e39?q=80&w=2072&auto=format&fit=crop'],
  night: ['https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2013&auto=format&fit=crop']
};

// ── Analytics Tab — own component so hooks are always called at top level ──
const AnalyticsTab = ({ usersList, loading, formatMinutes, analyticsUsers, viewMode, setViewMode, selectedDate, setSelectedDate }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // Build chart data based on view mode
  const chartData = viewMode === 'daily' 
    ? (() => {
        // For daily view: show hourly breakdown of selected date
        const hours = Array.from({ length: 24 }, (_, i) => i);
        return hours.map(hour => {
          // Count all users who were active on this date and during this hour
          const usersActiveAtHour = analyticsUsers.filter(u => {
            // Check if user was active on the selected date
            if (!u.loginDates?.includes(selectedDate)) return false;
            
            const startTime = u[`firstLogin_${selectedDate}`];
            if (!startTime) {
              // If no start time recorded, assume they were active throughout the day
              // This ensures all active users show up in the chart
              return true;
            }
            
            const startHour = new Date(startTime).getHours();
            const timeSpent = u.timeSpentByDate?.[selectedDate] || 0;
            const endHour = startHour + Math.ceil(timeSpent / 60);
            return hour >= startHour && hour < endHour;
          });
          
          return {
            date: `${hour}:00`,
            label: hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour-12}pm`,
            activeUsers: usersActiveAtHour.length,
            totalMins: usersActiveAtHour.reduce((sum, u) => sum + (u.timeSpentByDate?.[selectedDate] || 0), 0),
          };
        });
      })()
    : (() => {
        // For lifetime view: show last 14 days
        const last14 = Array.from({ length: 14 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (13 - i));
          return d.toISOString().slice(0, 10);
        });
        
        return last14.map(date => ({
          date,
          label: new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          activeUsers: usersList.filter(u => u.loginDates?.includes(date)).length,
          totalMins: usersList.reduce((sum, u) => sum + (u.timeSpentByDate?.[date] || 0), 0),
        }));
      })();

  const maxUsers = Math.max(...chartData.map(d => d.activeUsers), 1);
  const maxMins  = Math.max(...chartData.map(d => d.totalMins), 1);

  const W = 600, H = 160, PAD = { l: 8, r: 8, t: 12, b: 0 };

  const pts = (arr, max) => arr.map((v, i) => {
    const x = PAD.l + (i / (arr.length - 1)) * (W - PAD.l - PAD.r);
    const y = PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
    return [x, y];
  });

  const smoothPath = (points) => {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    return d;
  };

  const areaPath = (points) => {
    const line = smoothPath(points);
    if (!line) return '';
    const last = points[points.length - 1];
    const first = points[0];
    return `${line} L ${last[0]} ${H} L ${first[0]} ${H} Z`;
  };

  const userPts = pts(chartData.map(d => d.activeUsers), maxUsers);
  const minsPts = pts(chartData.map(d => d.totalMins), maxMins);
  const hovered = hoveredIdx !== null ? chartData[hoveredIdx] : null;

  const rankColors = ['from-yellow-400 to-orange-500', 'from-slate-300 to-slate-400', 'from-amber-600 to-amber-700'];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: 'Total Users',  value: usersList.length,  sub: 'registered',   color: '#6366f1', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
          { label: 'Active Today', value: usersList.filter(u => u.loginDates?.includes(getTodayStr())).length, sub: 'online today', color: '#22c55e', bg: 'bg-green-500/10', border: 'border-green-500/20' },
          { label: 'Total Time',   value: formatMinutes(usersList.reduce((s, u) => s + (u.totalTimeSpent || 0), 0)), sub: 'all users', color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          {
            label: viewMode === 'daily' ? 'Active on Date' : 'Avg. Session',
            value: viewMode === 'daily'
              ? analyticsUsers.length
              : (usersList.length ? formatMinutes(Math.round(usersList.reduce((s, u) => s + (u.totalTimeSpent || 0), 0) / usersList.length)) : '0m'),
            sub: viewMode === 'daily' ? selectedDate : 'per user',
            color: '#ec4899', bg: 'bg-pink-500/10', border: 'border-pink-500/20'
          },
        ].map(({ label, value, sub, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl sm:rounded-2xl p-3 sm:p-4`}>
            <p className="text-xl sm:text-2xl font-bold text-white leading-none">{value}</p>
            <p className="text-[10px] sm:text-xs font-semibold mt-1" style={{ color }}>{label}</p>
            <p className="text-[9px] sm:text-[10px] text-white/30 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Activity Overview</h3>
          <p className="text-xs text-white/30 mt-0.5">
            {viewMode === 'daily' ? `Hourly breakdown for ${selectedDate}` : 'Last 14 days trend'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
            <button onClick={() => setViewMode('daily')}    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-all ${viewMode === 'daily'    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-white/40 hover:text-white'}`}>Daily</button>
            <button onClick={() => setViewMode('lifetime')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold transition-all ${viewMode === 'lifetime' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-white/40 hover:text-white'}`}>Lifetime</button>
          </div>
          {viewMode === 'daily' && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
              <span className="text-xs text-white/40 whitespace-nowrap">Date:</span>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={getTodayStr()} className="bg-transparent text-white text-xs outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:invert flex-1" />
            </div>
          )}
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-3 sm:p-5 overflow-hidden">
        <div className="flex items-center gap-3 sm:gap-5 mb-4 flex-wrap">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-400 shadow-lg shadow-indigo-400/50" /><span className="text-xs text-white/60">Active Users</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" /><span className="text-xs text-white/60">Time Spent</span></div>
        </div>
        
        {/* Hover info - always visible on mobile when data exists */}
        {hovered && (
          <div className="mb-3 text-xs text-white/70 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            <span className="font-semibold text-white">{hovered.label}</span>
            <span className="mx-2 text-white/20">·</span>
            <span className="text-indigo-300">{hovered.activeUsers} users</span>
            <span className="mx-2 text-white/20">·</span>
            <span className="text-emerald-300">{formatMinutes(hovered.totalMins)}</span>
          </div>
        )}

        <div className="relative w-full" style={{ paddingBottom: '30%' }}>
          <svg
            viewBox={`0 0 ${W} ${H + 30}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#818cf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="gradMins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#34d399" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {[0.25, 0.5, 0.75, 1].map(f => (
              <line key={f} x1={PAD.l} x2={W - PAD.r}
                y1={PAD.t + (1 - f) * (H - PAD.t)} y2={PAD.t + (1 - f) * (H - PAD.t)}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            ))}

            <path d={areaPath(minsPts)} fill="url(#gradMins)" />
            <path d={areaPath(userPts)} fill="url(#gradUsers)" />
            <path d={smoothPath(minsPts)} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
            <path d={smoothPath(userPts)} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />

            {chartData.map((d, i) => (
              <g key={i}>
                <rect
                  x={userPts[i][0] - (W / chartData.length) / 2}
                  y={0}
                  width={W / chartData.length}
                  height={H + 30}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(i)}
                />
                {hoveredIdx === i && (
                  <line x1={userPts[i][0]} x2={userPts[i][0]} y1={PAD.t} y2={H}
                    stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
                )}
                <circle cx={userPts[i][0]} cy={userPts[i][1]} r={hoveredIdx === i ? 5 : 3} fill="#818cf8" stroke="#0f0f0f" strokeWidth="1.5" filter="url(#glow)" />
                <circle cx={minsPts[i][0]} cy={minsPts[i][1]} r={hoveredIdx === i ? 5 : 3} fill="#34d399" stroke="#0f0f0f" strokeWidth="1.5" filter="url(#glow)" />
                <text x={userPts[i][0]} y={H + 20} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)" fontFamily="monospace">
                  {viewMode === 'daily' 
                    ? (i % 3 === 0 ? d.label : '') 
                    : (i % 2 === 0 ? d.label : '')
                  }
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* ── Leaderboard table ── */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/8 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">
            {viewMode === 'daily' ? `Active on ${selectedDate}` : 'All-time leaderboard'}
          </h4>
          <span className="text-xs text-white/30">{analyticsUsers.length} users</span>
        </div>
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
          ) : analyticsUsers.length === 0 ? (
            <div className="py-12 text-center text-white/30 text-sm">No activity to display.</div>
          ) : analyticsUsers.map((u, index) => {
            const time = viewMode === 'lifetime' ? (u.totalTimeSpent || 0) : (u.timeSpentByDate?.[selectedDate] || 0);
            const maxTime = viewMode === 'lifetime'
              ? Math.max(...analyticsUsers.map(x => x.totalTimeSpent || 0), 1)
              : Math.max(...analyticsUsers.map(x => x.timeSpentByDate?.[selectedDate] || 0), 1);
            const pct = Math.round((time / maxTime) * 100);
            const startedAt = u[`firstLogin_${selectedDate}`] || null;

            return (
              <div key={u.id} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-3.5 hover:bg-white/4 transition-colors">
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${index < 3 ? `bg-gradient-to-br ${rankColors[index]}` : 'bg-white/8 text-white/40'}`}>
                  {index + 1}
                </div>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {u.userName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-white/90 truncate">{u.userName || 'Anonymous'}</p>
                  <p className="text-[9px] sm:text-[10px] text-white/30 font-mono truncate">{u.email}</p>
                </div>
                {viewMode === 'daily' && (
                  <div className="text-center shrink-0 hidden sm:block">
                    <p className="text-xs font-mono text-white/60">
                      {startedAt ? new Date(startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}
                    </p>
                    <p className="text-[9px] text-white/25">started</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-20 sm:w-28 md:w-36">
                  <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: index === 0 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#6366f1,#22d3ee)' }} />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-bold tabular-nums ${index === 0 ? 'text-amber-400' : 'text-indigo-300'}`}>
                    {formatMinutes(time)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

const AdminPanel = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [globalQuotes, setGlobalQuotes] = useState([]);
  const [newQuote, setNewQuote] = useState('');

  const [activeGallery, setActiveGallery] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);

  const [globalBackgrounds, setGlobalBackgrounds] = useState({ morning: [], afternoon: [], evening: [], night: [] });
  const [newBgUrl, setNewBgUrl] = useState({ morning: '', afternoon: '', evening: '', night: '' });
  const [defaultImages, setDefaultImages] = useState({ morning: '', afternoon: '', evening: '', night: '' });

  // --- ANALYTICS STATE & MATH ---
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'lifetime'
  const [userSearch, setUserSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  const formatMinutes = (mins) => {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatTimeStarted = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // 1. Filter users based on view mode
  // 2. Sort them from Highest Time to Lowest Time!
  const analyticsUsers = usersList
    .filter(u => viewMode === 'lifetime' || u.loginDates?.includes(selectedDate))
    .sort((a, b) => {
      const timeA = viewMode === 'lifetime' ? (a.totalTimeSpent || 0) : (a.timeSpentByDate?.[selectedDate] || 0);
      const timeB = viewMode === 'lifetime' ? (b.totalTimeSpent || 0) : (b.timeSpentByDate?.[selectedDate] || 0);
      return timeB - timeA; // Highest at the top
    });

  // --- NEW: Global Hash Router Logic for Gallery ---
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#admin-gallery-')) {
        const time = hash.replace('#admin-gallery-', '');
        setActiveGallery(time);
      } else {
        setActiveGallery(null);
      }
    };
    
    handleHashChange(); // Run once on load
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const openGallery = (time) => {
    window.location.hash = `admin-gallery-${time}`;
  };

  const closeGallery = () => {
    window.location.hash = 'admin';
  };
  // -----------------------------------------------

  // Close action menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData = [];
        querySnapshot.forEach((doc) => { usersData.push({ id: doc.id, ...doc.data() }); });
        setUsersList(usersData);
      } catch (error) { console.error("Error fetching users:", error); } finally { setLoading(false); }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchGlobalData = async () => {
      const docRef = doc(db, "globalConfig", "settings");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalQuotes(data.quotes || MOTIVATIONAL_QUOTES);
        setGlobalBackgrounds({
          morning:   data.morningImages   || DYNAMIC_BACKGROUNDS.morning,
          afternoon: data.afternoonImages || DYNAMIC_BACKGROUNDS.afternoon,
          evening:   data.eveningImages   || DYNAMIC_BACKGROUNDS.evening,
          night:     data.nightImages     || DYNAMIC_BACKGROUNDS.night,
        });
        setDefaultImages({
          morning:   data.defaultMorning   || '',
          afternoon: data.defaultAfternoon || '',
          evening:   data.defaultEvening   || '',
          night:     data.defaultNight     || '',
        });
      } else {
        setGlobalQuotes(MOTIVATIONAL_QUOTES);
        setGlobalBackgrounds(DYNAMIC_BACKGROUNDS);
      }
    };
    fetchGlobalData();
  }, []);

  const handleAddQuote = async () => {
    if (!newQuote.trim()) return;
    const updatedQuotes = [...globalQuotes, newQuote.trim()];
    await setDoc(doc(db, "globalConfig", "settings"), { quotes: updatedQuotes }, { merge: true });
    setGlobalQuotes(updatedQuotes);
    setNewQuote('');
  };

  const handleDeleteQuote = async (index) => {
    const updatedQuotes = globalQuotes.filter((_, i) => i !== index);
    await setDoc(doc(db, "globalConfig", "settings"), { quotes: updatedQuotes }, { merge: true });
    setGlobalQuotes(updatedQuotes);
  };

  const handleAddBackground = async (timeOfDay) => {
    const urlToAdd = newBgUrl[timeOfDay]?.trim();
    if (!urlToAdd) return;
    const updatedArray = [...globalBackgrounds[timeOfDay], urlToAdd];
    await setDoc(doc(db, "globalConfig", "settings"), { [`${timeOfDay}Images`]: updatedArray }, { merge: true });
    setGlobalBackgrounds(prev => ({ ...prev, [timeOfDay]: updatedArray }));
    setNewBgUrl(prev => ({ ...prev, [timeOfDay]: '' }));
  };

  const handleSetDefault = async (timeOfDay, url) => {
    const key = `default${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)}`;
    await setDoc(doc(db, "globalConfig", "settings"), { [key]: url }, { merge: true });
    setDefaultImages(prev => ({ ...prev, [timeOfDay]: url }));
  };

  const handleDeleteBackground = async (timeOfDay, index) => {
    const result = await Swal.fire({
      title: 'Delete this image?',
      text: "It will be removed for all users instantly.",
      icon: 'warning',
      showCancelButton: true,
      background: '#0f0f0f',
      color: '#ffffff',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Yes, delete it!',
      customClass: { popup: 'border border-white/10 rounded-2xl' }
    });

    if (result.isConfirmed) {
      const removedUrl = globalBackgrounds[timeOfDay][index];
      const updatedArray = globalBackgrounds[timeOfDay].filter((_, i) => i !== index);
      await setDoc(doc(db, "globalConfig", "settings"), { [`${timeOfDay}Images`]: updatedArray }, { merge: true });
      setGlobalBackgrounds(prev => ({ ...prev, [timeOfDay]: updatedArray }));
      // Clear default if the deleted image was the default
      if (defaultImages[timeOfDay] === removedUrl) {
        await handleSetDefault(timeOfDay, '');
      }
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const result = await Swal.fire({
      title: `Delete ${userName || 'this user'}?`,
      text: 'All their data will be permanently removed.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#3b82f6',
      confirmButtonText: 'Yes, delete',
      background: '#0f0f0f',
      color: '#ffffff',
      customClass: { popup: 'border border-white/10 rounded-2xl' }
    });
    if (result.isConfirmed) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setUsersList(prev => prev.filter(u => u.id !== userId));
        Swal.fire({ title: 'Deleted!', icon: 'success', timer: 1500, showConfirmButton: false, background: '#0f0f0f', color: '#fff', customClass: { popup: 'border border-white/10 rounded-2xl' } });
      } catch (e) {
        Swal.fire({ title: 'Error', text: 'Could not delete user.', icon: 'error', background: '#0f0f0f', color: '#fff', customClass: { popup: 'border border-white/10 rounded-2xl' } });
      }
    }
    setOpenMenuId(null);
  };

  const handleToggleDisable = async (userId, currentlyDisabled, userName) => {
    const action = currentlyDisabled ? 'enable' : 'disable';
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${userName || 'this user'}?`,
      text: currentlyDisabled ? 'They will regain access to the dashboard.' : 'They will be locked out of the dashboard.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: currentlyDisabled ? '#22c55e' : '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action}`,
      background: '#0f0f0f',
      color: '#ffffff',
      customClass: { popup: 'border border-white/10 rounded-2xl' }
    });
    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, 'users', userId), { disabled: !currentlyDisabled });
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, disabled: !currentlyDisabled } : u));
      } catch (e) {
        Swal.fire({ title: 'Error', text: 'Could not update user.', icon: 'error', background: '#0f0f0f', color: '#fff', customClass: { popup: 'border border-white/10 rounded-2xl' } });
      }
    }
    setOpenMenuId(null);
  };

  const SidebarItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`flex-shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all ${activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
      <Icon className="w-4 h-4 md:w-5 md:h-5" />
      <span className="font-medium text-xs md:text-sm whitespace-nowrap">{label}</span>
    </button>
  );

  return (
    <div className="h-screen w-screen bg-[#0a0a0a] text-white overflow-hidden flex flex-col md:flex-row font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-purple-900/10" />
      
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/40 backdrop-blur-xl z-20 flex flex-col p-4 md:p-6 shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-3 mb-4 md:mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-white" /></div>
            <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
          </div>
          <button onClick={onBack} className="md:hidden flex items-center gap-2 px-3 py-1.5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"><ArrowLeft className="w-4 h-4" /><span className="text-xs font-medium">Dash</span></button>
        </div>
        <nav className="flex md:flex-col gap-2 overflow-x-auto admin-scrollbar pb-2 md:pb-0">
          <SidebarItem id="users" icon={Users} label="Users" />
          <SidebarItem id="analytics" icon={Activity} label="Analytics" />
          <SidebarItem id="images" icon={ImageIcon} label="Backgrounds" />
          <SidebarItem id="quotes" icon={Edit2} label="Quotes" />
        </nav>
        <button onClick={onBack} className="hidden md:flex mt-auto items-center gap-3 px-4 py-3 text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"><ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium">Back to Dash</span></button>
      </aside>

      <main className="flex-1 relative z-10 overflow-y-auto admin-scrollbar flex flex-col">
        <header className="p-4 sm:p-5 md:p-8 flex items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-light">
                {activeTab === 'users' && "Users"}
                {activeTab === 'images' && "Backgrounds"}
                {activeTab === 'quotes' && "Quotes"}
                {activeTab === 'analytics' && "Analytics"}
              </h2>
              {activeTab === 'users' && !loading && (
                <span className="text-xs sm:text-sm font-bold bg-blue-500/20 text-blue-300 px-2 sm:px-3 py-1 rounded-full border border-blue-500/30">
                  {usersList.length}
                </span>
              )}
            </div>
            <p className="text-white/40 text-[10px] sm:text-xs md:text-sm mt-1">
              {activeTab === 'users' && "Manage user accounts and permissions"}
              {activeTab === 'images' && "Configure background images"}
              {activeTab === 'quotes' && "Manage motivational quotes"}
              {activeTab === 'analytics' && "View usage statistics"}
            </p>
          </div>
        </header>

        <div className="px-4 sm:px-5 md:px-8 pb-6 sm:pb-10">
          {activeTab === 'users' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Users', value: usersList.length, color: 'blue', icon: Users },
                  { label: 'Active Today', value: usersList.filter(u => u.loginDates?.includes(getTodayStr())).length, color: 'green', icon: Activity },
                  { label: 'Disabled', value: usersList.filter(u => u.disabled).length, color: 'amber', icon: Ban },
                  { label: 'Avg. Links', value: usersList.length ? Math.round(usersList.reduce((s, u) => s + (u.links?.length || 0), 0) / usersList.length) : 0, color: 'purple', icon: ShieldCheck },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className={`bg-${color}-500/8 border border-${color}-500/20 rounded-2xl p-4 flex items-center gap-3`}>
                    <div className={`w-9 h-9 rounded-xl bg-${color}-500/15 flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 text-${color}-400`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white leading-none">{value}</p>
                      <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search + header */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white">All Users</h3>
                  <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                    {usersList.length}
                  </span>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/25 transition"
                  />
                </div>
              </div>

              {/* User cards */}
              {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {usersList
                    .filter(u =>
                      !userSearch ||
                      u.userName?.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email?.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map((u) => {
                      const lifetimeMins = u.totalTimeSpent || 0;
                      const lifetimeFormatted = lifetimeMins >= 60
                        ? `${Math.floor(lifetimeMins / 60)}h ${lifetimeMins % 60}m`
                        : `${lifetimeMins}m`;
                      const isDisabled = u.disabled || false;
                      const avatarColors = [
                        'from-blue-500 to-indigo-600',
                        'from-violet-500 to-purple-600',
                        'from-emerald-500 to-teal-600',
                        'from-rose-500 to-pink-600',
                        'from-amber-500 to-orange-600',
                      ];
                      const colorIdx = (u.userName?.charCodeAt(0) || 0) % avatarColors.length;

                      return (
                        <div
                          key={u.id}
                          className={`relative group bg-white/4 hover:bg-white/7 border rounded-2xl p-4 transition-all duration-200 ${isDisabled ? 'border-amber-500/20 opacity-60' : 'border-white/8 hover:border-white/15'}`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center font-bold text-white text-base shadow-lg shrink-0`}>
                              {u.userName?.charAt(0).toUpperCase() || '?'}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white text-sm truncate">{u.userName || 'Anonymous'}</span>
                                {isDisabled && (
                                  <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md border border-amber-500/30 uppercase tracking-wide">Disabled</span>
                                )}
                              </div>
                              <p className="text-[11px] text-white/40 font-mono truncate mt-0.5">{u.email}</p>
                              <p className="text-[11px] text-white/30 mt-0.5">{u.currentLocation?.city || 'Unknown location'}</p>
                            </div>

                            {/* Action menu */}
                            <div className="relative shrink-0">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white/40 hover:text-white transition-all cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              {openMenuId === u.id && (
                                <div className="absolute right-0 top-8 w-44 bg-[#111]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                  <button
                                    onClick={() => handleToggleDisable(u.id, isDisabled, u.userName)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-white/8 transition-colors cursor-pointer text-left"
                                  >
                                    {isDisabled
                                      ? <><UserCheck className="w-3.5 h-3.5 text-green-400" /><span className="text-green-300">Enable User</span></>
                                      : <><Ban className="w-3.5 h-3.5 text-amber-400" /><span className="text-amber-300">Disable User</span></>
                                    }
                                  </button>
                                  <div className="h-px bg-white/8 mx-2" />
                                  <button
                                    onClick={() => handleDeleteUser(u.id, u.userName)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-red-300">Delete User</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="flex items-center gap-1 text-[10px] font-semibold bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/15">
                              <span>{u.links?.length || 0}</span><span className="text-blue-400/60">links</span>
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold bg-purple-500/10 text-purple-400 px-2 py-1 rounded-lg border border-purple-500/15">
                              <span>{Object.values(u.tasksByDate || {}).flat().length}</span><span className="text-purple-400/60">tasks</span>
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/15">
                              <Clock className="w-3 h-3" />
                              <span>{lifetimeFormatted}</span><span className="text-emerald-400/60">lifetime</span>
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-semibold bg-white/5 text-white/40 px-2 py-1 rounded-lg border border-white/8">
                              <span>{u.loginDates?.length || 0}</span><span>days active</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              usersList={usersList}
              loading={loading}
              formatMinutes={formatMinutes}
              analyticsUsers={analyticsUsers}
              viewMode={viewMode}
              setViewMode={setViewMode}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
          )}

          {activeTab === 'images' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {['morning', 'afternoon', 'evening', 'night'].map((time) => (
                <div key={time} className="bg-gradient-to-br from-[#1a1a1a]/90 to-[#0f0f0f]/90 border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col gap-4 shadow-xl hover:border-white/20 transition-all">
                  <div className="flex justify-between items-center mb-1 sm:mb-2">
                    <h3 className="text-base sm:text-lg font-semibold capitalize flex items-center gap-2">
                      {time === 'morning' && <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />}
                      {time === 'afternoon' && <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />}
                      {time === 'evening' && <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />}
                      {time === 'night' && <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />}
                      {time} Collection
                    </h3>
                    <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                      {globalBackgrounds[time]?.length || 0} images
                    </span>
                  </div>
                  
                  {/* Add Image URL Input */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      value={newBgUrl[time] || ''} 
                      onChange={(e) => setNewBgUrl({...newBgUrl, [time]: e.target.value})} 
                      placeholder="Paste image URL here..." 
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition text-sm text-white placeholder:text-white/30" 
                    />
                    <button 
                      onClick={() => handleAddBackground(time)} 
                      className="bg-blue-600 hover:bg-blue-500 py-2.5 sm:py-0 px-4 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Add</span>
                    </button>
                  </div>

                  {/* Default Image Selection */}
                  {globalBackgrounds[time]?.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-white/60 flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-yellow-400" />
                          Default Fallback Image
                        </label>
                        {defaultImages[time] && (
                          <button
                            onClick={() => handleSetDefault(time, '')}
                            className="text-xs text-red-400 hover:text-red-300 transition"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <select
                        value={defaultImages[time] || ''}
                        onChange={(e) => handleSetDefault(time, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition cursor-pointer"
                      >
                        <option value="" className="bg-[#1a1a1a] text-white/60">No default selected</option>
                        {globalBackgrounds[time].map((url, idx) => (
                          <option key={idx} value={url} className="bg-[#1a1a1a] text-white">
                            Image {idx + 1} {url.length > 40 ? `(${url.substring(0, 40)}...)` : `(${url})`}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-white/30 mt-1.5 leading-relaxed">
                        This image will show if the randomly selected image fails to load
                      </p>
                    </div>
                  )}

                  {/* Image Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2">
                    {globalBackgrounds[time]?.slice(0, 3).map((imgUrl, idx) => (
                      <div 
                        key={idx} 
                        className="relative group rounded-xl overflow-hidden aspect-video border border-white/10 bg-black/50 cursor-pointer shadow-md hover:shadow-xl transition-all" 
                        onMouseEnter={() => setPreviewImg(imgUrl)} 
                        onMouseLeave={() => setPreviewImg(null)}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`${time} bg ${idx + 1}`} 
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition duration-500" 
                        />
                        {defaultImages[time] === imgUrl && (
                          <div className="absolute top-1.5 left-1.5 bg-yellow-500/90 backdrop-blur-sm px-2 py-0.5 rounded-md flex items-center gap-1 shadow-lg">
                            <Star className="w-3 h-3 text-white fill-white" />
                            <span className="text-[10px] font-bold text-white">DEFAULT</span>
                          </div>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteBackground(time, idx); }} 
                          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500/90 hover:bg-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                    
                    {globalBackgrounds[time]?.length > 3 && (
                      <button 
                        onClick={() => openGallery(time)} 
                        className="relative group rounded-xl overflow-hidden aspect-video border border-white/10 bg-gradient-to-br from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 transition flex items-center justify-center flex-col gap-1 sm:gap-2 cursor-pointer shadow-md hover:shadow-xl"
                      >
                        <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs sm:text-sm font-medium text-white/80">View All ({globalBackgrounds[time].length})</span>
                      </button>
                    )}

                    {(!globalBackgrounds[time] || globalBackgrounds[time].length === 0) && (
                      <div className="col-span-2 text-center text-white/30 text-xs sm:text-sm py-6 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-white/20" />
                        No images added yet
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Stats Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white leading-none">{globalQuotes.length}</p>
                    <p className="text-[10px] sm:text-xs text-purple-300 mt-1">Total Quotes</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Quote className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white leading-none">{globalQuotes.length > 0 ? Math.round(globalQuotes.reduce((sum, q) => sum + q.length, 0) / globalQuotes.length) : 0}</p>
                    <p className="text-[10px] sm:text-xs text-blue-300 mt-1">Avg. Length</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Edit2 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white leading-none">{globalQuotes.length > 0 ? globalQuotes[Math.floor(Date.now() / 86400000) % globalQuotes.length].split(' ').length : 0}</p>
                    <p className="text-[10px] sm:text-xs text-amber-300 mt-1">Today's Words</p>
                  </div>
                </div>
              </div>

              {/* Add Quote Card */}
              <div className="bg-gradient-to-br from-[#1a1a1a]/90 to-[#0f0f0f]/90 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-white">Add New Quote</h3>
                    <p className="text-[10px] sm:text-xs text-white/40">Inspire your users</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <Quote className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/20" />
                    <input 
                      type="text" 
                      value={newQuote} 
                      onChange={(e) => setNewQuote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddQuote()}
                      placeholder="Type a motivational quote..." 
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition text-xs sm:text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                  <button 
                    onClick={handleAddQuote}
                    disabled={!newQuote.trim()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed py-3 sm:py-4 px-6 sm:px-8 rounded-xl font-semibold transition cursor-pointer text-white text-xs sm:text-sm shadow-lg hover:shadow-purple-500/20 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Quote
                  </button>
                </div>
                
                <div className="mt-2 sm:mt-3 flex items-center gap-2 text-[10px] sm:text-xs text-white/30">
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Press Enter to quickly add</span>
                </div>
              </div>

              {/* Quotes List Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h3 className="text-base sm:text-lg font-semibold text-white">All Quotes</h3>
                  <span className="text-[10px] sm:text-xs font-bold bg-purple-500/20 text-purple-300 px-2 sm:px-3 py-1 rounded-full border border-purple-500/30">
                    {globalQuotes.length}
                  </span>
                </div>
                {globalQuotes.length > 0 && (
                  <div className="text-[10px] sm:text-xs text-white/40">
                    Daily rotation • {globalQuotes.length} days
                  </div>
                )}
              </div>

              {/* Quotes Grid */}
              {globalQuotes.length === 0 ? (
                <div className="bg-gradient-to-br from-white/5 to-white/10 border border-dashed border-white/20 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Quote className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
                  </div>
                  <h4 className="text-base sm:text-lg font-semibold text-white mb-2">No quotes yet</h4>
                  <p className="text-xs sm:text-sm text-white/40 max-w-md mx-auto">
                    Start adding inspirational quotes to motivate your users.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {globalQuotes.map((q, idx) => {
                    const isToday = idx === (Math.floor(Date.now() / 86400000) % globalQuotes.length);
                    const wordCount = q.split(' ').length;
                    const charCount = q.length;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`group relative bg-gradient-to-br from-[#1a1a1a]/90 to-[#0f0f0f]/90 border rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:border-white/20 transition-all duration-300 hover:shadow-xl ${
                          isToday ? 'border-purple-500/50 shadow-lg shadow-purple-500/10' : 'border-white/10'
                        }`}
                      >
                        {/* Today Badge */}
                        {isToday && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            TODAY
                          </div>
                        )}
                        
                        {/* Quote Number */}
                        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <span className="text-[10px] sm:text-xs font-bold text-white/40">#{idx + 1}</span>
                        </div>
                        
                        {/* Quote Icon */}
                        <div className="flex justify-center mb-2 sm:mb-3 mt-6 sm:mt-8">
                          <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400/30" />
                        </div>
                        
                        {/* Quote Text */}
                        <p className="text-white/80 text-xs sm:text-sm leading-relaxed text-center italic mb-3 sm:mb-4 px-2 min-h-[50px] sm:min-h-[60px] flex items-center justify-center">
                          "{q}"
                        </p>
                        
                        {/* Quote Stats */}
                        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2 sm:mb-3 text-[9px] sm:text-[10px] text-white/30">
                          <span>{wordCount} words</span>
                          <span>•</span>
                          <span>{charCount} chars</span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(q);
                            }}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] sm:text-xs py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5"
                            title="Copy to clipboard"
                          >
                            <Edit2 className="w-3 h-3" />
                            Copy
                          </button>
                          <button 
                            onClick={() => handleDeleteQuote(idx)} 
                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[10px] sm:text-xs py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Helper Text */}
              {globalQuotes.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-blue-300 mb-1">How it works</h4>
                    <p className="text-xs text-blue-200/60 leading-relaxed">
                      Quotes rotate daily based on the day of the year. Today's quote is highlighted with a purple badge. 
                      Users see a different quote each day, creating a {globalQuotes.length}-day cycle.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- Upgraded View All Gallery Modal --- */}
      {activeGallery && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <header className="p-4 sm:p-6 border-b border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-black/40 shrink-0 shadow-lg">
            
            <div className="flex items-center gap-3 sm:gap-4">
              <button onClick={closeGallery} className="p-2 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer flex items-center gap-2 text-white">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:block text-sm font-medium">Back</span>
              </button>
              <h2 className="text-lg sm:text-2xl font-light capitalize flex items-center gap-2 sm:gap-3 text-white">
                <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />{activeGallery} Collection
              </h2>
              <span className="text-sm text-white/40 bg-white/5 px-3 py-1 rounded-lg">
                {globalBackgrounds[activeGallery]?.length || 0} images
              </span>
            </div>

            {/* Add URL Input */}
            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
              <input 
                type="text" 
                value={newBgUrl[activeGallery] || ''} 
                onChange={(e) => setNewBgUrl({...newBgUrl, [activeGallery]: e.target.value})} 
                placeholder={`Paste new URL for ${activeGallery}...`} 
                className="flex-1 xl:w-80 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition text-sm text-white placeholder:text-white/30" 
              />
              <button 
                onClick={() => handleAddBackground(activeGallery)} 
                className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center flex-1 sm:flex-none text-white gap-2 text-sm shadow-lg hover:shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> Add URL
              </button>
            </div>

          </header>

          {/* Default Image Selection in Gallery */}
          {globalBackgrounds[activeGallery]?.length > 0 && (
            <div className="bg-white/5 border-b border-white/10 p-4 sm:p-6">
              <div className="max-w-screen-2xl mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    Default Fallback Image
                  </label>
                  {defaultImages[activeGallery] && (
                    <button
                      onClick={() => handleSetDefault(activeGallery, '')}
                      className="text-xs text-red-400 hover:text-red-300 transition px-3 py-1 bg-red-500/10 rounded-lg"
                    >
                      Clear Default
                    </button>
                  )}
                </div>
                <select
                  value={defaultImages[activeGallery] || ''}
                  onChange={(e) => handleSetDefault(activeGallery, e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 transition cursor-pointer"
                >
                  <option value="" className="bg-[#1a1a1a] text-white/60">No default selected</option>
                  {globalBackgrounds[activeGallery].map((url, idx) => (
                    <option key={idx} value={url} className="bg-[#1a1a1a] text-white">
                      Image {idx + 1} {url.length > 50 ? `(${url.substring(0, 50)}...)` : `(${url})`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">
                  This image will be displayed if the randomly selected image fails to load
                </p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 admin-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 max-w-screen-2xl mx-auto">
              {globalBackgrounds[activeGallery]?.map((imgUrl, idx) => (
                <div 
                  key={idx} 
                  className="relative group rounded-xl overflow-hidden aspect-video border border-white/10 bg-black/50 cursor-pointer shadow-lg hover:shadow-2xl transition-all" 
                  onMouseEnter={() => setPreviewImg(imgUrl)} 
                  onMouseLeave={() => setPreviewImg(null)}
                >
                  <img 
                    src={imgUrl} 
                    alt={`${activeGallery} ${idx + 1}`}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition duration-500" 
                  />
                  {defaultImages[activeGallery] === imgUrl && (
                    <div className="absolute top-2 left-2 bg-yellow-500/90 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-lg">
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                      <span className="text-xs font-bold text-white">DEFAULT</span>
                    </div>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteBackground(activeGallery, idx); }} 
                    className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 p-1.5 sm:p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </button>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                    <p className="text-[10px] text-white/80 truncate">Image {idx + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hidden high-res preview popup */}
      {previewImg && (
        <div className="hidden lg:block fixed bottom-8 right-8 z-[200] w-96 aspect-video rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/20 overflow-hidden pointer-events-none animate-in fade-in slide-in-from-bottom-8 duration-300">
          <img src={previewImg} className="w-full h-full object-cover" />
          <div className="absolute bottom-2 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] text-white/80 uppercase tracking-widest font-bold">Preview</div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;