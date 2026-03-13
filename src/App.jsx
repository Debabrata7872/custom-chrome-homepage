import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, CloudSun, MapPin, Image as ImageIcon, X, Loader2, CheckCircle, LogOut, Mail, Edit2, ShieldCheck } from 'lucide-react';

// --- Firebase Imports ---
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// --- Drag and Drop ---
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

// --- Custom Components ---
import AdminPanel from './components/AdminPanel';
import SortableLink from './components/SortableLink';

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

const DEFAULT_LINKS = [
  { id: '1', name: 'YouTube', url: 'https://youtube.com', icon: 'youtube' },
  { id: '2', name: 'GitHub', url: 'https://github.com', icon: 'github' },
  { id: '3', name: 'Gmail', url: 'https://mail.google.com', icon: 'gmail' },
  { id: '4', name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'chatgpt' },
  { id: '5', name: 'Gemini', url: 'https://gemini.google.com', icon: 'gemini' },
  { id: '6', name: 'LinkedIn', url: 'https://linkedin.com', icon: 'linkedin' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);  
  const [tempName, setTempName] = useState('');               
  const [currentLocation, setCurrentLocation] = useState({
    city: "Barrackpore",
    timezone: "Asia/Kolkata",
    temp: "28°C",
    desc: "Partly Cloudy",
    icon: null
  });
  const [tasks, setTasks] = useState([]);
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [customBg, setCustomBg] = useState(null);

  // --- Anti-Inspect Security Shield ---
  // useEffect(() => {
  //   // 1. Disable Right-Click
  //   const handleContextMenu = (e) => e.preventDefault();
    
  //   // 2. Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  //   const handleKeyDown = (e) => {
  //     if (
  //       e.key === 'F12' || 
  //       (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) || 
  //       (e.ctrlKey && e.key === 'U')
  //     ) {
  //       e.preventDefault();
  //     }
  //   };

  //   document.addEventListener('contextmenu', handleContextMenu);
  //   document.addEventListener('keydown', handleKeyDown);

  //   return () => {
  //     document.removeEventListener('contextmenu', handleContextMenu);
  //     document.removeEventListener('keydown', handleKeyDown);
  //   };
  // }, []);

  // --- NEW: Global Hash Router Logic ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [showTasksSidebar, setShowTasksSidebar] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#admin')) {
        setCurrentView('admin');
        setShowTasksSidebar(false);
      } else if (hash === '#tasks') {
        setCurrentView('dashboard');
        setShowTasksSidebar(true);
      } else {
        setCurrentView('dashboard');
        setShowTasksSidebar(false);
      }
    };

    handleHashChange(); // Run once on load
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  // ------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLinks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex); 
      });
    }
  };

  const ADMIN_EMAIL = "debabratasahoo499905@gmail.com"; 
  const isAdmin = user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [greeting, setGreeting] = useState('Good Day');
  const [quoteOfTheDay, setQuoteOfTheDay] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLinkData, setNewLinkData] = useState({ name: '', url: '' });
  const [editingLink, setEditingLink] = useState(null); 

  const handleEditLinkSubmit = (e) => {
    e.preventDefault();
    if (!editingLink.name || !editingLink.url) return;
    let finalUrl = editingLink.url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = 'https://' + finalUrl;
    
    setLinks(links.map(l => l.id === editingLink.id ? { ...l, name: editingLink.name, url: finalUrl } : l));
    setEditingLink(null); 
  };

  // Fetch live weather for the user's saved city on load
  useEffect(() => {
    const fetchInitialWeather = async () => {
      try {
        const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (!OPENWEATHER_API_KEY) return;

        // Fetch using the city name saved in state/Firebase
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${currentLocation.city}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const res = await fetch(url);
        
        if (res.ok) {
          const data = await res.json();
          setCurrentLocation(prev => ({
            ...prev,
            timezoneOffset: data.timezone,
            temp: `${Math.round(data.main.temp)}°C`,
            desc: data.weather[0].main,
            icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`
          }));
        }
      } catch (error) {
        console.error("Failed to fetch initial weather:", error);
      }
    };

    // Only run this after Firebase has loaded your saved profile
    if (isDataLoaded) {
      fetchInitialWeather();
    }
  }, [isDataLoaded]);

  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.links) setLinks(data.links);
            if (data.tasks) setTasks(data.tasks);
            if (data.currentLocation) setCurrentLocation(data.currentLocation);
            if (data.customBg) setCustomBg(data.customBg);
            if (data.userName) setUserName(data.userName);
          } else {
            const defaultTasks = [
              { id: 1, text: 'Review project proposals', completed: false },
              { id: 2, text: 'Reply to emails', completed: true },
            ];
            const defaultName = currentUser.displayName || email.split('@')[0] || 'Friend';
            
            await setDoc(docRef, {
              links: DEFAULT_LINKS,
              tasks: defaultTasks,
              currentLocation: { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' },
              customBg: null,
              userName: defaultName,
              email: currentUser.email
            });
            
            setTasks(defaultTasks);
            setUserName(defaultName);
          }
          setIsDataLoaded(true);
        } catch (error) {
          console.error("Error loading cloud data:", error);
        }
      } else {
        setIsDataLoaded(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [email]);

  useEffect(() => {
    if (user && isDataLoaded) {
      setDoc(doc(db, 'users', user.uid), {
        links,
        tasks,
        currentLocation,
        customBg,
        userName,
        email: user.email
      }, { merge: true });
    }
  }, [links, tasks, currentLocation, customBg, userName, user, isDataLoaded]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAndSetBackground = async () => {
      let hour;
      
      try {
        // 1. Clean Time Math (Exactly the same as your working clock!)
        if (currentLocation.timezoneOffset !== undefined) {
          const currentTimestamp = Date.now(); // Inherently UTC
          const cityTime = new Date(currentTimestamp + (currentLocation.timezoneOffset * 1000));
          hour = cityTime.getUTCHours(); // Extract the exact target city hour
        } else {
          hour = new Date().getHours();
        }
      } catch (e) {
        hour = new Date().getHours();
      }

      // 2. Determine the time of day
      let currentPeriod = 'night';
      if (hour >= 5 && hour < 12) { setGreeting('Good Morning'); currentPeriod = 'morning'; }
      else if (hour >= 12 && hour < 17) { setGreeting('Good Afternoon'); currentPeriod = 'afternoon'; }
      else if (hour >= 17 && hour < 21) { setGreeting('Good Evening'); currentPeriod = 'evening'; }
      else { setGreeting('Good Night'); currentPeriod = 'night'; }

      // 3. Fetch image safely
      if (!customBg) {
        let activeArray = DYNAMIC_BACKGROUNDS[currentPeriod]; 
        
        try {
          const docRef = doc(db, "globalConfig", "settings");
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data()[`${currentPeriod}Images`]) {
            const cloudArray = docSnap.data()[`${currentPeriod}Images`];
            if (cloudArray.length > 0) activeArray = cloudArray;
          }
        } catch (err) {
          console.warn("Could not fetch cloud images, using defaults.");
        }

        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        setBgImage(activeArray[dayOfYear % activeArray.length]);
      }
    };
    
    fetchAndSetBackground();
    
    // ⚠️ CRITICAL FIX: Removed `currentTime` from this array so it doesn't spam Firebase!
  }, [currentLocation.timezoneOffset, customBg]);

  useEffect(() => {
    const getCloudQuote = async () => {
      const docRef = doc(db, "globalConfig", "settings");
      const docSnap = await getDoc(docRef);
      const dayOfYear = Math.floor((currentTime - new Date(currentTime.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      
      if (docSnap.exists() && docSnap.data().quotes && docSnap.data().quotes.length > 0) {
        const cloudQuotes = docSnap.data().quotes;
        setQuoteOfTheDay(cloudQuotes[dayOfYear % cloudQuotes.length]);
      } else {
        setQuoteOfTheDay(MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]);
      }
    };
    getCloudQuote();
  }, [currentTime]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowLocationMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- UPGRADED: OpenWeather Search Suggestions ---
  useEffect(() => {
    if (searchQuery.length < 2) {
      searchResults.length && setSearchResults([]);
      return;
    }
    const fetchCities = async () => {
      setIsSearching(true);
      try {
        const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
        if (!OPENWEATHER_API_KEY) return;

        // Fetching directly from OpenWeather's search database
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchQuery}&limit=5&appid=${OPENWEATHER_API_KEY}`);
        const data = await res.json();
        
        // We format OpenWeather's data to match your existing dropdown UI
        const formattedResults = data.map((city, index) => ({
          id: `${city.lat}-${city.lon}-${index}`,
          name: city.name,
          latitude: city.lat,
          longitude: city.lon,
          admin1: city.state,
          country: city.country
        }));

        setSearchResults(formattedResults || []);
      } catch (err) {
        console.error("Failed to fetch cities", err);
      } finally {
        setIsSearching(false);
      }
    };
    
    const timeoutId = setTimeout(fetchCities, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setAuthError("Could not sign in with Google.");
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message.replace("Firebase: ", ""));
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleSelectCity = async (city) => {
    console.log("Selected city:", city);
    const timezone = city.timezone || "UTC";

    try {
      const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

      // 1. Check if Vite is actually seeing your key
      if (!OPENWEATHER_API_KEY) {
        console.error("❌ OpenWeather Error: API Key is missing! Check your .env file.");
        return;
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.latitude}&lon=${city.longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const weatherRes = await fetch(url);
      const weatherData = await weatherRes.json();

      // 2. Safely catch OpenWeather API errors (like 401 Unauthorized)
      if (!weatherRes.ok) {
        console.error(`❌ OpenWeather API Failed (${weatherData.cod}):`, weatherData.message);
        return;
      }

      // 3. If successful, set the data
      const temp = Math.round(weatherData.main.temp);
      const desc = weatherData.weather[0].main;
      const icon = weatherData.weather[0].icon;
      const iconUrl = `https://openweathermap.org/img/wn/${icon}@4x.png`;

      setCurrentLocation({
        city: city.name,
        timezoneOffset: weatherData.timezone,
        temp: `${temp}°C`,
        desc,
        icon: iconUrl
      });

    } catch (error) {
      console.error("❌ Weather catch block error:", error);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomBg(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetBackground = () => {
    setCustomBg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleTask = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id) => setTasks(tasks.filter(t => t.id !== id));
  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTaskText, completed: false }]);
    setNewTaskText('');
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newLinkData.name || !newLinkData.url) return;
    if (links.length >= 8) return; 
    let finalUrl = newLinkData.url;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = 'https://' + finalUrl;
    setLinks([...links, { id: Date.now().toString(), name: newLinkData.name, url: finalUrl, icon: 'default' }]);
    setNewLinkData({ name: '', url: '' });
    setShowAddLinkModal(false);
  };

  if (authLoading) {
    return <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md text-center z-10 mx-4">
          <h2 className="text-3xl font-light text-white mb-2 tracking-wide">
            {isLoginMode ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-white/50 mb-8 text-sm">Your personal dashboard, anywhere.</p>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
              required
            />
            {authError && <p className="text-red-400 text-xs text-left px-1">{authError}</p>}
            
            <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-medium tracking-wide transition-colors shadow-lg text-white flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              {isLoginMode ? 'Sign In with Email' : 'Sign Up'}
            </button>
          </form>

          <div className="relative flex items-center py-4 mb-2">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-white/40 text-xs">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button onClick={handleGoogleLogin} className="w-full py-3.5 bg-white text-black hover:bg-gray-100 rounded-2xl text-sm font-semibold tracking-wide transition-colors shadow-lg flex items-center justify-center gap-2 mb-6">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <p className="text-white/50 text-xs">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => setIsLoginMode(!isLoginMode)} className="text-blue-400 hover:text-blue-300 font-medium underline">
              {isLoginMode ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  if (currentView === 'admin') {
    return <AdminPanel onBack={() => window.location.hash = ''} />;
  }

  let formattedTime = '';
  let formattedDate = '';

  try {
    if (currentLocation.timezoneOffset !== undefined) {
      // 1. Get exact current time timestamp (this is inherently UTC)
      const currentTimestamp = currentTime.getTime();
      
      // 2. Add the OpenWeather offset to get the exact time in the searched city
      const cityTime = new Date(currentTimestamp + (currentLocation.timezoneOffset * 1000));
      
      // 3. Format it as UTC so your browser doesn't try to "fix" it back to local time
      formattedTime = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'UTC'
      }).format(cityTime);
      
      formattedDate = new Intl.DateTimeFormat('en-US', { 
        weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' 
      }).format(cityTime);
    } else {
      // Fallback if data hasn't loaded yet
      formattedTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(currentTime);
      formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentTime);
    }
  } catch (e) {
    // Ultimate fallback just in case
    formattedTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(currentTime);
    formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentTime);
  }

  return (
    <div className="h-screen w-screen relative font-sans overflow-hidden text-white flex flex-col">
      <div className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out" style={{ backgroundImage: `url(${customBg || bgImage})` }} />
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <header className="relative z-50 w-full p-3 sm:p-4 md:p-6 flex flex-wrap justify-between items-start gap-2 shrink-0">
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowLocationMenu(!showLocationMenu)} className="flex items-center gap-2 sm:gap-3 bg-black/20 hover:bg-black/40 transition-colors backdrop-blur-md border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg text-left">
            <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-300" />
            <div className="flex flex-col pr-1 sm:pr-2">
              <span className="text-xs sm:text-sm font-medium leading-tight truncate max-w-[100px] sm:max-w-none">{currentLocation.city}</span>
              <span className="text-[10px] sm:text-xs text-white/70">{currentLocation.temp}<span className="hidden sm:inline">, {currentLocation.desc}</span></span>
            </div>
            {currentLocation.icon ? (
              <img
                src={currentLocation.icon}
                alt="weather"
                className="w-5 h-5 sm:w-6 sm:h-6 ml-1 sm:ml-2 hidden sm:block"
              />
            ) : (
              <CloudSun className="w-5 h-5 sm:w-6 sm:h-6 ml-1 sm:ml-2 text-yellow-300 hidden sm:block" />
            )}
          </button>
          {showLocationMenu && (
            <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 border-b border-white/10 bg-black/20"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" /><input type="text" placeholder="Search any city..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors" autoFocus /></div></div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {isSearching ? <div className="flex items-center justify-center p-6 text-white/50 gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching...</span></div> 
                : searchResults.length > 0 ? searchResults.map(city => <button key={city.id} onClick={() => handleSelectCity(city)} className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex flex-col group"><span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">{city.name}</span><span className="text-xs text-white/50">{city.admin1 ? `${city.admin1}, ` : ''}{city.country}</span></button>)
                : searchQuery.length > 1 ? <div className="p-6 text-center text-sm text-white/50">No cities found</div> : <div className="p-6 text-center text-xs text-white/40">Type 2+ characters to search</div>}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-1.5 sm:p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 rounded-full transition shadow-lg group relative" title="Upload Custom Background"><ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white/80 group-hover:text-white" /></button>
          {customBg && <button onClick={resetBackground} className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium bg-red-500/80 hover:bg-red-600 border border-red-400/50 rounded-full backdrop-blur-md transition shadow-lg">Reset BG</button>}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-start sm:justify-center p-2 sm:p-6 w-full overflow-hidden pt-6 sm:pt-0">
        <div className="text-center mb-4 sm:mb-8 drop-shadow-xl animate-in fade-in zoom-in duration-700 w-full px-2 mt-auto">
          <div className="flex items-center justify-center gap-2 mb-1 sm:mb-2 min-h-[36px] sm:min-h-[48px]">
            {isEditingName ? (
              <form onSubmit={(e) => { e.preventDefault(); setUserName(tempName); setIsEditingName(false); }} className="flex items-center gap-2">
                <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="bg-white/10 border border-white/30 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-white text-base sm:text-xl md:text-2xl font-light outline-none focus:border-blue-400 text-center backdrop-blur-md w-32 sm:w-48 md:w-64" autoFocus placeholder="Name..." />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 sm:px-3 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-medium transition cursor-pointer">Save</button>
              </form>
            ) : (
              <h2 className="text-lg sm:text-2xl md:text-3xl font-light text-white/90 tracking-wide group flex items-center gap-1.5 sm:gap-3 cursor-pointer px-2 sm:px-4 py-1 sm:py-1.5 hover:bg-white/10 rounded-2xl transition text-center" onClick={() => { setTempName(userName || ''); setIsEditingName(true); }} title="Click to edit name">
                {greeting}{userName ? `, ${userName}` : ''}
                <div className="p-1 sm:p-1.5 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-all"><Edit2 className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-white/80" /></div>
              </h2>
            )}
          </div>
          
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter mb-1 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight">
            {formattedTime}
          </h1>
          
          <div className="flex items-center justify-center gap-4 text-xs sm:text-base md:text-lg font-medium text-white/80">
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <div className="w-full max-w-[280px] sm:max-w-xl md:max-w-2xl mb-6 md:mb-10 px-2 sm:px-6">
          <form action="https://www.google.com/search" method="GET" className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-white/60 group-hover:text-white/90 transition" />
            </div>
            <input type="text" name="q" placeholder="Search..." className="w-full pl-9 sm:pl-12 pr-4 py-2.5 sm:py-4 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 text-white rounded-full outline-none backdrop-blur-md shadow-lg transition-all text-xs sm:text-base md:text-lg placeholder:text-white/50 focus:ring-2 focus:ring-white/30" autoComplete="off" />
          </form>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-16 py-2 max-w-[280px] sm:max-w-3xl md:max-w-4xl mx-auto w-full px-1 sm:px-4 mb-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={links.map(link => link.id)} strategy={rectSortingStrategy}>
              {links.map((link) => (
                <SortableLink 
                  key={link.id} 
                  link={link} 
                  onEdit={(l) => setEditingLink(l)} 
                  onDelete={(id) => setLinks(links.filter(l => l.id !== id))} 
                />
              ))}
            </SortableContext>
          </DndContext>

          {links.length < 8 && (
            <button onClick={() => setShowAddLinkModal(true)} className="group flex flex-col items-center gap-1.5 md:gap-2 hover:-translate-y-1 transition-transform duration-200 cursor-pointer w-14 sm:w-16 md:w-20">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-black/20 hover:bg-black/40 border border-white/20 border-dashed rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg transition-colors shrink-0">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white/70 group-hover:text-white" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-white/80 group-hover:text-white tracking-wide shadow-black drop-shadow-md w-full text-center truncate px-0.5">
                Add Link
              </span>
            </button>
          )}
        </div>
      </main>

      <footer className="relative z-20 w-full p-3 sm:p-4 md:p-6 flex flex-col justify-end shrink-0">
        <div className="flex items-end justify-between w-full mb-2">
          <div className="max-w-2xl hidden md:block"><p className="text-sm font-medium text-white/70 italic drop-shadow-md border-l-2 border-white/30 pl-3">"{quoteOfTheDay}"</p></div>
          
          <div className="flex gap-1.5 sm:gap-3 ml-auto">
            {/* UPDATED: Navigates to hash instead of state change */}
            {isAdmin && (
              <button onClick={() => window.location.hash = 'admin'} className="flex items-center justify-center bg-blue-600/30 hover:bg-blue-600/80 backdrop-blur-xl border border-blue-400/30 w-8 h-8 sm:w-10 sm:h-10 rounded-full transition shadow-lg cursor-pointer text-blue-300 hover:text-white group" title="Admin Panel">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              </button>
            )}
            <button onClick={handleSignOut} className="flex items-center justify-center bg-black/30 hover:bg-red-500/80 backdrop-blur-xl border border-white/10 w-8 h-8 sm:w-10 sm:h-10 rounded-full transition shadow-lg cursor-pointer text-white/70 hover:text-white group" title="Sign Out">
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            {/* UPDATED: Navigates to #tasks hash */}
            <button onClick={() => window.location.hash = 'tasks'} className="flex items-center gap-1.5 sm:gap-2 bg-black/30 hover:bg-black/50 backdrop-blur-xl border border-white/10 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full transition shadow-lg cursor-pointer">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/80" />
              <span className="text-xs sm:text-sm font-medium text-white/90">Tasks</span>
              <span className="text-[10px] sm:text-xs bg-white/20 px-1.5 sm:px-2 py-0.5 rounded-full text-white/90 ml-0.5 sm:ml-1">
                {tasks.filter(t => !t.completed).length}
              </span>
            </button>
          </div>
        </div>

        <div className="w-full text-center mt-1 sm:mt-2">
          <p className="text-[8px] sm:text-[10px] md:text-xs text-white/40 font-light tracking-wider drop-shadow-md">
            Developed with ❤️ by Debabrata &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 md:w-[400px] bg-black/60 sm:bg-black/40 backdrop-blur-3xl border-l border-white/10 z-[100] transform transition-transform duration-500 shadow-2xl flex flex-col ${showTasksSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
        <header className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0 pt-8 sm:pt-6">
          <h2 className="text-lg sm:text-xl font-light flex items-center gap-3 text-white">
            <CheckCircle className="w-5 h-5 text-blue-400" /> Daily Tasks
          </h2>
          {/* UPDATED: Closes hash */}
          <button onClick={() => window.location.hash = ''} className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer">
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 admin-scrollbar space-y-3 sm:space-y-4">
          <form onSubmit={addTask} className="flex gap-2 mb-4 sm:mb-6">
            <input type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="Add a new task..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base text-white outline-none focus:border-blue-400 transition" />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 sm:px-4 rounded-xl transition flex items-center justify-center cursor-pointer shadow-lg"><Plus className="w-4 h-4 sm:w-5 sm:h-5" /></button>
          </form>

          {tasks.map((task) => (
            <div key={task.id} className="group flex items-center justify-between p-3 sm:p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <button onClick={() => toggleTask(task.id)} className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${task.completed ? 'bg-blue-500 border-blue-500' : 'border-white/40 hover:border-white'}`}>
                  {task.completed && <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />}
                </button>
                <span className={`text-sm sm:text-base truncate ${task.completed ? 'text-white/40 line-through' : 'text-white/90'}`}>{task.text}</span>
              </div>
              <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1.5 sm:p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-all cursor-pointer shrink-0"><Trash2 className="w-3 h-3 sm:w-4 sm:h-4" /></button>
            </div>
          ))}
          {tasks.length === 0 && <div className="text-center text-white/40 mt-8 sm:mt-10 text-sm sm:text-base italic">No tasks yet. Enjoy your day!</div>}
        </div>
      </div>

      {/* UPDATED: Overlay also clears hash */}
      {showTasksSidebar && <div onClick={() => window.location.hash = ''} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] transition-opacity duration-300" />}

      {showAddLinkModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddLinkModal(false)}></div>
          <div className="bg-[#121212]/90 sm:bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 w-[95%] max-w-sm sm:max-w-none sm:w-[400px] md:w-[440px] shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl sm:text-2xl font-light mb-4 sm:mb-6 text-white flex items-center gap-2">Add Shortcut</h2>
            <form onSubmit={handleAddLink} className="space-y-4 text-sm sm:text-base">
              <div>
                <label className="block text-white/60 text-xs sm:text-sm mb-1 sm:mb-2 ml-1">Name</label>
                <input type="text" value={newLinkData.name} onChange={(e) => setNewLinkData({ ...newLinkData, name: e.target.value })} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-white outline-none focus:border-blue-400 transition" placeholder="e.g. Netflix" />
              </div>
              <div>
                <label className="block text-white/60 text-xs sm:text-sm mb-1 sm:mb-2 ml-1">URL</label>
                <input type="url" value={newLinkData.url} onChange={(e) => setNewLinkData({ ...newLinkData, url: e.target.value })} required className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-white outline-none focus:border-blue-400 transition" placeholder="https://..." />
              </div>
              <div className="flex gap-2 sm:gap-3 mt-6 sm:mt-8">
                <button type="button" onClick={() => setShowAddLinkModal(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 sm:py-3 rounded-xl transition cursor-pointer font-medium">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 sm:py-3 rounded-xl transition cursor-pointer font-medium shadow-lg shadow-blue-500/20">Add Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingLink && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1a1a1a] border border-white/10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-white/10">
              <h3 className="font-medium text-white">Edit Shortcut</h3>
              <button onClick={() => setEditingLink(null)} className="text-white/50 hover:text-white transition p-1 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditLinkSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-white/60 mb-1 ml-1">Name</label>
                <input type="text" value={editingLink.name} onChange={e => setEditingLink({...editingLink, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500/50 transition text-sm text-white" autoFocus />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1 ml-1">URL</label>
                <input type="text" value={editingLink.url} onChange={e => setEditingLink({...editingLink, url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500/50 transition text-sm text-white" />
              </div>
              <button type="submit" disabled={!editingLink.name || !editingLink.url} className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/40 rounded-xl text-sm font-medium transition cursor-pointer text-white">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

        .admin-scrollbar::-webkit-scrollbar { 
          width: 12px; 
          height: 12px;
        }
        .admin-scrollbar::-webkit-scrollbar-track { 
          background: transparent; 
        }
        .admin-scrollbar::-webkit-scrollbar-thumb { 
          background-color: rgba(255, 255, 255, 0.15); 
          border-radius: 20px; 
          border: 4px solid rgba(0, 0, 0, 0); 
          background-clip: padding-box;
        }
        .admin-scrollbar::-webkit-scrollbar-thumb:hover { 
          background-color: rgba(255, 255, 255, 0.3); 
          border: 3px solid rgba(0, 0, 0, 0); 
        }
        .admin-scrollbar {
          scroll-behavior: smooth;
        }
      `}} />
    </div>
  );
}