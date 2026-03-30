import React, { useState, useEffect } from 'react';
import { CloudSun, Image as ImageIcon, Plus, Trash2, X, ShieldCheck, Users, ArrowLeft, Edit2, Loader2, Upload, Activity, Clock } from 'lucide-react';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase'; 
import Swal from 'sweetalert2';

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

const AdminPanel = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [globalQuotes, setGlobalQuotes] = useState([]);
  const [newQuote, setNewQuote] = useState('');

  const [activeGallery, setActiveGallery] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);

  const [globalBackgrounds, setGlobalBackgrounds] = useState({ morning: [], afternoon: [], evening: [], night: '' });
  const [newBgUrl, setNewBgUrl] = useState({ morning: '', afternoon: '', evening: '', night: '' });

  // --- ANALYTICS STATE ---
  const getTodayStr = () => new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const formatMinutes = (mins) => {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

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
          morning: data.morningImages || DYNAMIC_BACKGROUNDS.morning,
          afternoon: data.afternoonImages || DYNAMIC_BACKGROUNDS.afternoon,
          evening: data.eveningImages || DYNAMIC_BACKGROUNDS.evening,
          night: data.nightImages || DYNAMIC_BACKGROUNDS.night,
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
    const updatedBackgrounds = { ...globalBackgrounds, [timeOfDay]: updatedArray };
    await setDoc(doc(db, "globalConfig", "settings"), { [`${timeOfDay}Images`]: updatedArray }, { merge: true });
    setGlobalBackgrounds(updatedBackgrounds);
    setNewBgUrl({ ...newBgUrl, [timeOfDay]: '' }); 
  };

  const handleFileUploadToCloud = async (timeOfDay, event) => {
    const file = event.target.files[0];
    if (!file) return;

    Swal.fire({
      title: 'Uploading...',
      text: 'Pushing image to the cloud.',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); },
      background: '#1a1a1a', color: '#ffffff'
    });

    try {
      const storagePath = `backgrounds/${timeOfDay}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, storagePath);
      await uploadBytes(fileRef, file);
      const downloadUrl = await getDownloadURL(fileRef);

      const updatedArray = [...globalBackgrounds[timeOfDay], downloadUrl];
      const updatedBackgrounds = { ...globalBackgrounds, [timeOfDay]: updatedArray };
      await setDoc(doc(db, "globalConfig", "settings"), { [`${timeOfDay}Images`]: updatedArray }, { merge: true });
      setGlobalBackgrounds(updatedBackgrounds);

      Swal.fire({
        title: 'Success!', text: 'Image added to collection.', icon: 'success',
        timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#ffffff',
        customClass: { popup: 'border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl' }
      });
    } catch (error) {
      console.error("Upload error:", error);
      Swal.fire({
        title: 'Error', text: 'Failed to upload image.', icon: 'error',
        background: '#1a1a1a', color: '#ffffff', confirmButtonColor: '#3b82f6',
        customClass: { popup: 'border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl' }
      });
    }
    event.target.value = '';
  };

  const handleDeleteBackground = async (timeOfDay, index) => {
    const result = await Swal.fire({
      title: 'Delete this background?',
      text: "It will be removed for all users instantly.",
      icon: 'warning',
      showCancelButton: true,
      background: '#1a1a1a', 
      color: '#ffffff',
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#3b82f6', 
      confirmButtonText: 'Yes, delete it!',
      customClass: { popup: 'border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl' }
    });

    if (result.isConfirmed) {
      const updatedArray = globalBackgrounds[timeOfDay].filter((_, i) => i !== index);
      const updatedBackgrounds = { ...globalBackgrounds, [timeOfDay]: updatedArray };
      await setDoc(doc(db, "globalConfig", "settings"), { [`${timeOfDay}Images`]: updatedArray }, { merge: true });
      setGlobalBackgrounds(updatedBackgrounds);

      Swal.fire({
        title: 'Deleted!', text: 'The image has been removed.', icon: 'success',
        background: '#1a1a1a', color: '#ffffff', confirmButtonColor: '#3b82f6',
        timer: 1500, showConfirmButton: false, customClass: { popup: 'border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl' }
      });
    }
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
        <header className="p-5 sm:p-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-light">{activeTab === 'users' && "Users Control"}{activeTab === 'images' && "Atmosphere Settings"}{activeTab === 'quotes' && "Wisdom Management"}{activeTab === 'analytics' && "Traffic & Analytics"}</h2>
            <p className="text-white/40 text-xs sm:text-sm mt-1">Manage your dashboard's global configuration and user data.</p>
          </div>
        </header>

        <div className="px-4 sm:px-8 pb-10">
          {activeTab === 'users' && (
            <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="overflow-x-auto admin-scrollbar">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead><tr className="border-b border-white/10 text-white/30 text-xs uppercase tracking-widest"><th className="p-4 sm:p-5 font-semibold">User Identity</th><th className="p-4 sm:p-5 font-semibold">Email</th><th className="p-4 sm:p-5 font-semibold">Location</th><th className="p-4 sm:p-5 font-semibold text-center">Engagement</th></tr></thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr> : usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4"><div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shrink-0">{u.userName?.charAt(0).toUpperCase() || '?'}</div><span className="font-medium text-white/90 group-hover:text-white truncate">{u.userName || 'Anonymous'}</span></td>
                        <td className="p-4 sm:p-5 text-white/50 text-xs sm:text-sm font-mono truncate max-w-[150px]">{u.email}</td>
                        <td className="p-4 sm:p-5 text-white/50 text-xs sm:text-sm">{u.currentLocation?.city || 'N/A'}</td>
                        <td className="p-4 sm:p-5 text-center"><div className="flex justify-center gap-2"><span className="bg-blue-500/10 text-blue-400 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap">{u.links?.length || 0} Links</span><span className="bg-purple-500/10 text-purple-400 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap">{u.tasks?.length || 0} Tasks</span></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Controls & Summary */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl sm:rounded-3xl">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600/20 p-2.5 rounded-xl border border-blue-500/30 text-blue-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider">Active Users</h3>
                    <p className="text-2xl font-light text-white">{usersList.filter(u => u.loginDates?.includes(selectedDate)).length}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-4 py-2 w-full sm:w-auto">
                  <span className="text-sm text-white/50 font-medium">Date:</span>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={getTodayStr()}
                    className="bg-transparent text-white outline-none cursor-pointer text-sm font-mono [&::-webkit-calendar-picker-indicator]:filter-[invert(1)]"
                  />
                </div>
              </div>

              {/* Filtered Data Table */}
              <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden">
                <div className="overflow-x-auto admin-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/10 text-white/30 text-xs uppercase tracking-widest">
                        <th className="p-4 sm:p-5 font-semibold">User Identity</th>
                        <th className="p-4 sm:p-5 font-semibold">Email</th>
                        <th className="p-4 sm:p-5 font-semibold text-center">Time Spent (All Time)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {loading ? (
                        <tr><td colSpan="3" className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto opacity-20" /></td></tr>
                      ) : (
                        usersList.filter(u => u.loginDates?.includes(selectedDate)).length === 0 ? (
                          <tr><td colSpan="3" className="p-16 text-center text-white/40 italic">No users logged in on this date.</td></tr>
                        ) : (
                          usersList.filter(u => u.loginDates?.includes(selectedDate)).map((u) => (
                            <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                              <td className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center font-bold text-white shadow-lg shrink-0">
                                  {u.userName?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <span className="font-medium text-white/90 group-hover:text-white truncate">{u.userName || 'Anonymous'}</span>
                              </td>
                              <td className="p-4 sm:p-5 text-white/50 text-xs sm:text-sm font-mono truncate max-w-[150px]">{u.email}</td>
                              <td className="p-4 sm:p-5 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatMinutes(u.totalTimeSpent)}
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {['morning', 'afternoon', 'evening', 'night'].map((time) => (
                <div key={time} className="bg-[#1a1a1a]/80 border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col gap-4">
                  <div className="flex justify-between items-center mb-1 sm:mb-2">
                    <h3 className="text-base sm:text-lg font-medium capitalize flex items-center gap-2">
                      {time === 'morning' && <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />}
                      {time === 'afternoon' && <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />}
                      {time === 'evening' && <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />}
                      {time === 'night' && <CloudSun className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />}
                      {time} Collection
                    </h3>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" value={newBgUrl[time] || ''} onChange={(e) => setNewBgUrl({...newBgUrl, [time]: e.target.value})} placeholder="Paste image URL here..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 outline-none focus:border-blue-500 transition text-sm text-white" />
                    
                    <button onClick={() => handleAddBackground(time)} className="bg-blue-600 hover:bg-blue-500 py-2.5 sm:py-0 px-4 rounded-xl font-medium transition cursor-pointer flex items-center justify-center"><Plus className="w-5 h-5" /></button>
                    
                    <input type="file" id={`upload-${time}`} className="hidden" accept="image/*" onChange={(e) => handleFileUploadToCloud(time, e)} />
                    <label htmlFor={`upload-${time}`} className="bg-white/10 hover:bg-white/20 py-2.5 sm:py-0 px-4 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 border border-white/10" title="Upload Image File">
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-2">
                    {globalBackgrounds[time]?.slice(0, 3).map((imgUrl, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video border border-white/10 bg-black/50 cursor-pointer shadow-md" onMouseEnter={() => setPreviewImg(imgUrl)} onMouseLeave={() => setPreviewImg(null)}>
                        <img src={imgUrl} alt={`${time} bg`} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition duration-500" />
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteBackground(time, idx); }} className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500/90 hover:bg-red-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"><Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" /></button>
                      </div>
                    ))}
                    
                    {globalBackgrounds[time]?.length > 3 && (
                      <button onClick={() => openGallery(time)} className="relative group rounded-xl overflow-hidden aspect-video border border-white/10 bg-white/5 hover:bg-white/10 transition flex items-center justify-center flex-col gap-1 sm:gap-2 cursor-pointer">
                        <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs sm:text-sm font-medium text-white/80">View All ({globalBackgrounds[time].length})</span>
                      </button>
                    )}

                    {(!globalBackgrounds[time] || globalBackgrounds[time].length === 0) && (
                      <div className="col-span-2 text-center text-white/30 text-xs sm:text-sm py-4 border border-dashed border-white/10 rounded-xl">No images added yet.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="bg-[#1a1a1a]/80 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                <input type="text" value={newQuote} onChange={(e) => setNewQuote(e.target.value)} placeholder="Type a new motivational quote..." className="flex-1 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 outline-none focus:border-blue-500 transition text-sm sm:text-base text-white" />
                <button onClick={handleAddQuote} className="bg-blue-600 hover:bg-blue-500 py-3 sm:py-0 px-6 sm:px-8 rounded-xl sm:rounded-2xl font-medium transition cursor-pointer text-white text-sm sm:text-base">Add Quote</button>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {globalQuotes.map((q, idx) => (
                  <div key={idx} className="flex items-center justify-center p-3 sm:p-4 bg-white/5 rounded-xl sm:rounded-2xl group hover:bg-white/10 transition">
                    <span className="text-white/70 text-xs sm:text-sm italic flex-1 pr-2">"{q}"</span>
                    <button onClick={() => handleDeleteQuote(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 sm:p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition cursor-pointer shrink-0"><Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>
                  </div>
                ))}
              </div>
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
            </div>

            {/* Inputs inside the full gallery view! */}
            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
              <input type="text" value={newBgUrl[activeGallery] || ''} onChange={(e) => setNewBgUrl({...newBgUrl, [activeGallery]: e.target.value})} placeholder={`Paste new URL for ${activeGallery}...`} className="flex-1 xl:w-80 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition text-sm text-white" />
              <div className="flex gap-2">
                <button onClick={() => handleAddBackground(activeGallery)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl font-medium transition cursor-pointer flex items-center justify-center flex-1 sm:flex-none text-white gap-2 text-sm shadow-lg">
                  <Plus className="w-4 h-4" /> Add URL
                </button>
                <input type="file" id={`upload-modal-${activeGallery}`} className="hidden" accept="image/*" onChange={(e) => handleFileUploadToCloud(activeGallery, e)} />
                <label htmlFor={`upload-modal-${activeGallery}`} className="bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 border border-white/10 text-white gap-2 text-sm" title="Upload Image File">
                  <Upload className="w-4 h-4" /> Upload
                </label>
              </div>
            </div>

          </header>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 admin-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 max-w-screen-2xl mx-auto">
              {globalBackgrounds[activeGallery]?.map((imgUrl, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video border border-white/10 bg-black/50 cursor-pointer shadow-lg" onMouseEnter={() => setPreviewImg(imgUrl)} onMouseLeave={() => setPreviewImg(null)}>
                  <img src={imgUrl} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition duration-500" />
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteBackground(activeGallery, idx); }} className="absolute top-2 right-2 bg-red-500/90 hover:bg-red-500 p-1.5 sm:p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10 cursor-pointer"><Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" /></button>
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