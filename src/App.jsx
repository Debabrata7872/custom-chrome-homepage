import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Trash2, CloudSun, MapPin, Image as ImageIcon, X, Loader2, CheckCircle, LogOut, ShieldCheck, Settings, RefreshCw, GripVertical, Pencil, Check, Calendar } from 'lucide-react';

// --- Firebase Imports ---
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

// --- Drag and Drop ---
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Custom Components ---
import AdminPanel from './components/AdminPanel';
import SortableLink from './components/SortableLink';

// --- Constants & Utils ---
import { ADMIN_EMAIL, MAX_LINKS } from './constants';
import { getTodayStr } from './utils';

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

// ── Sortable Task Item ──────────────────────────────────────────────────────
function SortableTaskItem({ task, editingTaskId, editingTaskText, setEditingTaskText, startEditTask, saveEditTask, toggleTask, deleteTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingTaskId === task.id) inputRef.current?.focus();
  }, [editingTaskId, task.id]);

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
        isDragging ? 'bg-white/15 border-white/30 shadow-2xl' : 'bg-white/5 hover:bg-white/10 border-white/8 hover:border-white/18'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 p-0.5 text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing transition-colors touch-none"
        tabIndex={-1}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Checkbox */}
      <button
        onClick={() => toggleTask(task.id)}
        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
          task.completed ? 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/40' : 'border-white/25 hover:border-blue-400/60'
        }`}
      >
        {task.completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </button>

      {/* Text / Edit input */}
      <div className="flex-1 min-w-0">
        {editingTaskId === task.id ? (
          <input
            ref={inputRef}
            value={editingTaskText}
            onChange={(e) => setEditingTaskText(e.target.value)}
            onBlur={() => saveEditTask(task.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEditTask(task.id);
              if (e.key === 'Escape') { setEditingTaskText(''); /* reset */ }
            }}
            className="w-full bg-white/10 border border-blue-400/50 rounded-lg px-2 py-0.5 text-sm text-white outline-none"
          />
        ) : (
          <span
            title={task.text}
            onDoubleClick={() => !task.completed && startEditTask(task)}
            className={`block text-sm truncate select-none transition-colors ${
              task.completed ? 'text-white/30 line-through' : 'text-white/85 cursor-text'
            }`}
          >
            {task.text}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!task.completed && editingTaskId !== task.id && (
          <button
            onClick={() => startEditTask(task)}
            className="p-1.5 bg-white/8 hover:bg-blue-500/30 text-white/40 hover:text-blue-300 rounded-lg transition-all cursor-pointer"
            title="Edit task"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={() => deleteTask(task.id)}
          className="p-1.5 bg-white/8 hover:bg-red-500/30 text-white/40 hover:text-red-300 rounded-lg transition-all cursor-pointer"
          title="Delete task"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  // --- NEW AUTH STATES ---
  const [authStep, setAuthStep] = useState('email'); // 'email', 'login', 'signup'
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [signupName, setSignupName] = useState('');

  const [currentTime, setCurrentTime] = useState(new Date());  
  const [userName, setUserName] = useState('');
  const [greeting, setGreeting] = useState('Good Day');          
  const [currentLocation, setCurrentLocation] = useState({
    city: "Barrackpore",
    timezone: "Asia/Kolkata",
    temp: "28°C",
    desc: "Partly Cloudy",
    icon: null
  });
  const [tasksByDate, setTasksByDate] = useState({});
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [customBg, setCustomBg] = useState(null);
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState(false);

  // --- ANALYTICS: Time Spent Tracker ---
  // --- ANALYTICS: Time Spent Tracker ---
  useEffect(() => {
    if (!user || !isDataLoaded) return;

    const heartbeat = setInterval(async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const todayStr = getTodayStr();
        
        await updateDoc(userRef, {
          totalTimeSpent: increment(1),
          [`timeSpentByDate.${todayStr}`]: increment(1), 
          loginDates: arrayUnion(todayStr), 
          lastActive: new Date().toISOString()
        });
        
      } catch (err) {
        console.error("❌ Analytics ping failed:", err);
      }
    }, 60000); 

    return () => clearInterval(heartbeat);
  }, [user, isDataLoaded]);

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

  const isAdmin = user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [bgImage, setBgImage] = useState('');
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

  // --- MAGIC LINK CATCHER ---
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let savedEmail = window.localStorage.getItem('emailForSignIn');
      if (!savedEmail) {
        // If they clicked the link on a different device/browser
        savedEmail = window.prompt('Please verify your email address to complete sign-in:');
      }
      if (savedEmail) {
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            window.history.replaceState(null, '', window.location.pathname); // Cleans up the ugly URL
          })
          .catch((err) => setAuthError(err.message.replace("Firebase: ", "")));
      }
    }
  }, []);

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
            if (data.tasksByDate) {
              setTasksByDate(data.tasksByDate);
            } else if (data.tasks) {
              // Migration: Move old flat tasks into today's date!
              setTasksByDate({ [getTodayStr()]: data.tasks });
            }
            if (data.currentLocation) setCurrentLocation(data.currentLocation);
            if (data.customBg) setCustomBg(data.customBg);
            if (data.userName) setUserName(data.userName);
          } else {
            const defaultTasks = [
              { id: 1, text: 'Review project proposals', completed: false },
              { id: 2, text: 'Reply to emails', completed: true },
            ];
            const defaultName = currentUser.displayName || email.split('@')[0] || 'Friend';
            
            // --- Create Brand New User Profile ---
          const todayStr = getTodayStr();
          await setDoc(docRef, {
            links: DEFAULT_LINKS,
            tasksByDate: { [todayStr]: defaultTasks }, 
            currentLocation: { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' },
            customBg: null,
            userName: currentUser.displayName || 'Anonymous', // Grabs the custom name they typed!
            email: currentUser.email,
            totalTimeSpent: 0,
            timeSpentByDate: { [todayStr]: 0 }, // Starts today's piggy bank at 0
            loginDates: [todayStr], // Instantly logs today
            lastActive: new Date().toISOString(),
            [`firstLogin_${todayStr}`]: new Date().toISOString() // <-- THE MISSING START TIME!
          });
            
            setTasksByDate({ [getTodayStr()]: defaultTasks });
            setUserName(defaultName);
          }

          // --- ANALYTICS: Instant Login Record ---
          // Records immediately so we don't miss users who leave before 60 seconds
          try {
            await updateDoc(docRef, {
              loginDates: arrayUnion(getTodayStr()),
              lastActive: new Date().toISOString()
            });
          } catch (e) {
            console.error("Failed to record instant login", e);
          }
          // ---------------------------------------

          // --- ANALYTICS: Record FIRST login of the day ---
          const todayStr = getTodayStr();
          try {
            // First, let's guarantee we are looking at the absolute latest database info
            const freshSnap = await getDoc(docRef); 
            const freshData = freshSnap.data();

            const updates = { 
              loginDates: arrayUnion(todayStr),
              lastActive: new Date().toISOString()
            };
            
            // If the field doesn't exist in the fresh data, stamp it!
            if (!freshData[`firstLogin_${todayStr}`]) {
              updates[`firstLogin_${todayStr}`] = new Date().toISOString();
            }
            await updateDoc(docRef, updates);
          } catch (e) {
            console.error("Failed to record login data", e);
          }
          // ------------------------------------------------
          
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced Firestore sync — waits 1.5s after last change before writing
  useEffect(() => {
    if (!user || !isDataLoaded) return;
    const timer = setTimeout(() => {
      setDoc(doc(db, 'users', user.uid), {
        links,
        tasksByDate,
        currentLocation,
        customBg,
        userName,
        email: user.email,
        is24Hour,
        showSeconds
      }, { merge: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [links, tasksByDate, currentLocation, customBg, userName, user, isDataLoaded, is24Hour, showSeconds]);

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

      // 3. Fetch image safely with fallback logic
      if (!customBg) {
        let activeArray = DYNAMIC_BACKGROUNDS[currentPeriod]; 
        let defaultImage = '';
        
        try {
          const docRef = doc(db, "globalConfig", "settings");
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data[`${currentPeriod}Images`]) {
              const cloudArray = data[`${currentPeriod}Images`];
              if (cloudArray.length > 0) activeArray = cloudArray;
            }
            // Get the default image for this time period
            const defaultKey = `default${currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)}`;
            defaultImage = data[defaultKey] || '';
          }
        } catch (err) {
          console.warn("Could not fetch cloud images, using defaults.");
        }

        const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const selectedImage = activeArray[dayOfYear % activeArray.length];
        
        // Test if the selected image loads
        const testImage = (url) => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
          });
        };

        // Try selected image first
        const selectedWorks = await testImage(selectedImage);
        if (selectedWorks) {
          setBgImage(selectedImage);
          return;
        }

        // If selected image fails, try default image
        if (defaultImage) {
          const defaultWorks = await testImage(defaultImage);
          if (defaultWorks) {
            setBgImage(defaultImage);
            return;
          }
        }

        // If both fail, find any working image from the array
        for (const url of activeArray) {
          if (url === selectedImage) continue; // Already tested
          const works = await testImage(url);
          if (works) {
            setBgImage(url);
            return;
          }
        }

        // Last resort: use the selected image anyway (browser will handle the error)
        setBgImage(selectedImage);
      }
    };
    
    fetchAndSetBackground();
    
    // ⚠️ CRITICAL FIX: Removed `currentTime` from this array so it doesn't spam Firebase!
  }, [currentLocation.timezoneOffset, customBg]);

  // Runs once on mount — quote only needs to be fetched once per session
  useEffect(() => {
    const getCloudQuote = async () => {
      const now = new Date();
      const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      try {
        const docRef = doc(db, "globalConfig", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().quotes && docSnap.data().quotes.length > 0) {
          const cloudQuotes = docSnap.data().quotes;
          setQuoteOfTheDay(cloudQuotes[dayOfYear % cloudQuotes.length]);
        } else {
          setQuoteOfTheDay(MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]);
        }
      } catch {
        setQuoteOfTheDay(MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]);
      }
    };
    getCloudQuote();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setShowLocationMenu(false);
      // Added this line to close settings when clicking away!
      if (settingsRef.current && !settingsRef.current.contains(event.target)) setShowSettings(false);
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

  // 1. Step One: Check if email exists
  const handleEmailNext = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        setAuthStep('login'); // User exists, ask for password
      } else {
        setAuthStep('signup'); // New user, create password
      }
    } catch (err) {
      setAuthError("Please enter a valid email address.");
    }
  };

  // 2. Generate a highly secure password
  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let newPass = "";
    for(let i = 0; i < 16; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure it has at least one special character to pass validation
    newPass += "!"; 
    setPassword(newPass);
    setConfirmPassword(newPass);
    setPasswordError('');
  };

  // 3. Handle actual Login or Signup
  const handleFinalAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setPasswordError('');

    if (authStep === 'signup') {
      if (!signupName.trim()) return setAuthError("Please tell us what to call you.");
      if (password !== confirmPassword) return setPasswordError("Passwords do not match.");
      // Strict boundaries: 6 chars, 1 uppercase, 1 special char
      const strongRegex = new RegExp("^(?=.*[A-Z])(?=.*[!@#$&*]).{6,}$");
      if (!strongRegex.test(password)) {
        return setPasswordError("Password must be 6+ chars, include 1 uppercase & 1 special character (!@#$&*).");
      }
    }

    try {
      if (authStep === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save their chosen name to their Firebase profile instantly!
        await updateProfile(userCredential.user, { displayName: signupName.trim() });
        // Also ensure it syncs to their database document
        await updateDoc(doc(db, 'users', userCredential.user.uid), { 
          userName: signupName.trim() 
        });
      }
    } catch (err) {
      setAuthError(err.message.replace("Firebase: ", ""));
    }
  };

  const handleMagicLink = async () => {
    setAuthError('');
    setAuthSuccess('');
    
    const actionCodeSettings = {
      url: window.location.origin, // Automatically uses localhost OR Vercel
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setAuthSuccess('✨ Magic link sent! Check your email inbox.');
    } catch (err) {
      setAuthError(err.message.replace("Firebase: ", ""));
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleSelectCity = async (city) => {
    // Close the dropdown and clear search immediately
    setShowLocationMenu(false);
    setSearchQuery('');
    setSearchResults([]);

    try {
      const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;

      if (!OPENWEATHER_API_KEY) {
        console.error("❌ OpenWeather Error: API Key is missing! Check your .env file.");
        return;
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${city.latitude}&lon=${city.longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const weatherRes = await fetch(url);
      const weatherData = await weatherRes.json();

      if (!weatherRes.ok) {
        console.error(`❌ OpenWeather API Failed (${weatherData.cod}):`, weatherData.message);
        return;
      }

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

  // Refresh weather for the currently selected city
  const refreshWeather = useCallback(async () => {
    if (isWeatherRefreshing) return;
    setIsWeatherRefreshing(true);
    try {
      const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!OPENWEATHER_API_KEY) return;
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
    } catch (err) {
      console.error("Weather refresh failed:", err);
    } finally {
      setIsWeatherRefreshing(false);
    }
  }, [currentLocation.city, isWeatherRefreshing]);

  // Auto-refresh weather every 10 minutes
  useEffect(() => {
    if (!isDataLoaded) return;
    const interval = setInterval(refreshWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isDataLoaded, refreshWeather]);

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

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskText, setEditingTaskText] = useState('');

  const startEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const saveEditTask = (id) => {
    if (!editingTaskText.trim()) return;
    setTasksByDate(prev => {
      const dayTasks = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: dayTasks.map(t => t.id === id ? { ...t, text: editingTaskText.trim() } : t) };
    });
    setEditingTaskId(null);
    setEditingTaskText('');
  };

  const handleTaskDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTasksByDate(prev => {
        const dayTasks = prev[selectedDate] || [];
        const oldIndex = dayTasks.findIndex(t => t.id === active.id);
        const newIndex = dayTasks.findIndex(t => t.id === over.id);
        return { ...prev, [selectedDate]: arrayMove(dayTasks, oldIndex, newIndex) };
      });
    }
  };

  const toggleTask = (id) => {
    setTasksByDate(prev => {
      const dayTasks = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: dayTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) };
    });
  };

  const deleteTask = (id) => {
    setTasksByDate(prev => {
      const dayTasks = prev[selectedDate] || [];
      const updatedTasks = dayTasks.filter(t => t.id !== id);
      
      const newState = { ...prev };
      if (updatedTasks.length === 0) {
        delete newState[selectedDate]; // The magic cleanup! Deletes the day if empty.
      } else {
        newState[selectedDate] = updatedTasks;
      }
      return newState;
    });
  };

  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask = { id: Date.now(), text: newTaskText, completed: false };
    
    setTasksByDate(prev => {
      const dayTasks = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: [...dayTasks, newTask] };
    });
    setNewTaskText('');
  };

  // Helper variables for the UI
  const currentTasks = tasksByDate[selectedDate] || [];
  const availableDates = Object.keys(tasksByDate);
  const todayStr = getTodayStr();

  // 1. Always keep "Today" in the dropdown so you can always jump back
  if (!availableDates.includes(todayStr)) {
    availableDates.push(todayStr);
  }
  // 2. Always keep the currently viewed date in the dropdown
  if (!availableDates.includes(selectedDate)) {
    availableDates.push(selectedDate);
  }
  
  // Sort them newest to oldest
  availableDates.sort((a,b) => b.localeCompare(a));

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newLinkData.name || !newLinkData.url) return;
    if (links.length >= MAX_LINKS) return;
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
      <div className="min-h-screen w-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-auto font-sans py-6 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md text-center z-10">
          <h2 className="text-2xl sm:text-3xl font-light text-white mb-1.5 sm:mb-2 tracking-wide">
            {authStep === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-white/50 mb-6 sm:mb-8 text-xs sm:text-sm">Your personal dashboard, anywhere.</p>

          {/* STEP 1: Email Only */}
          {authStep === 'email' && (
            <form onSubmit={handleEmailNext} className="space-y-4 mb-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors text-sm" required />
              {authError && <p className="text-red-400 text-xs text-left px-1">{authError}</p>}
              <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-medium tracking-wide transition-colors shadow-lg text-white">Continue with Email</button>
            </form>
          )}

          {/* STEP 2: Sign In OR Sign Up */}
          {authStep !== 'email' && (
            <form onSubmit={handleFinalAuth} className="space-y-4 mb-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between px-1">
                <span className="text-white/50 text-xs truncate max-w-[200px]">{email}</span>
                <button type="button" onClick={() => { setAuthStep('email'); setPassword(''); setConfirmPassword(''); }} className="text-blue-400 text-xs hover:underline">Change</button>
              </div>

              {authStep === 'signup' && (
                <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl mb-4 text-left">
                  <p className="text-blue-300 text-xs font-medium mb-1">Looks like you are new here!</p>
                  <p className="text-white/50 text-[10px]">Create a password to secure your account.</p>
                </div>
              )}

              {authStep === 'signup' && (
                <input type="text" value={signupName} onChange={(e) => setSignupName(e.target.value)} placeholder="What should we call you?" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors text-sm mb-4" />
              )}

              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors text-sm" />
              
              {authStep === 'signup' && (
                <>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors text-sm" />
                  <button type="button" onClick={generateStrongPassword} className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-medium tracking-wide transition-colors text-white flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> Generate Secure Password
                  </button>
                </>
              )}

              {passwordError && <p className="text-red-400 text-xs text-left px-1">{passwordError}</p>}
              {authError && <p className="text-red-400 text-xs text-left px-1">{authError}</p>}
              {authSuccess && <p className="text-green-400 text-xs text-left px-1 font-medium">{authSuccess}</p>}
              
              <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-medium tracking-wide transition-colors shadow-lg text-white flex items-center justify-center gap-2 mt-2">
                {authStep === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="flex items-center justify-between mt-4 mb-2">
                <div className="relative flex-grow border-t border-white/10"></div>
                <span className="mx-4 text-white/40 text-[10px] uppercase tracking-widest">or</span>
                <div className="relative flex-grow border-t border-white/10"></div>
              </div>

              <button type="button" onClick={handleMagicLink} className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-medium tracking-wide transition-colors text-white flex items-center justify-center gap-2">
                ✨ Sign in with Magic Link instead
              </button>
            </form>
          )}

          {/* GOOGLE AUTH REMAINS THE SAME */}
          {authStep === 'email' && (
            <>
              <div className="relative flex items-center py-4 mb-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-white/40 text-xs">OR</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button onClick={handleGoogleLogin} className="w-full py-3.5 bg-white text-black hover:bg-gray-100 rounded-2xl text-sm font-semibold tracking-wide transition-colors shadow-lg flex items-center justify-center gap-2 mb-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'admin') {
    return <AdminPanel onBack={() => window.location.hash = ''} />;
  }

  let formattedTime = '';
  let formattedDate = '';

  let timeOptions = { hour: 'numeric', minute: '2-digit', hour12: !is24Hour };
  if (showSeconds) timeOptions.second = '2-digit'; // Dynamically adds seconds if enabled

  try {
    if (currentLocation.timezoneOffset !== undefined) {
      const currentTimestamp = currentTime.getTime();
      const cityTime = new Date(currentTimestamp + (currentLocation.timezoneOffset * 1000));
      
      formattedTime = new Intl.DateTimeFormat('en-US', { ...timeOptions, timeZone: 'UTC' }).format(cityTime);
      formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(cityTime);
    } else {
      formattedTime = new Intl.DateTimeFormat('en-US', timeOptions).format(currentTime);
      formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentTime);
    }
  } catch (e) {
    formattedTime = new Intl.DateTimeFormat('en-US', timeOptions).format(currentTime);
    formattedDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(currentTime);
  }

  return (
    <div className="h-screen w-screen relative font-sans overflow-hidden text-white flex flex-col">
      {/* Background image with blur effect to hide watermarks */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out" 
        style={{ 
          backgroundImage: `url(${customBg || bgImage})`,
          filter: 'blur(3px)',
          transform: 'scale(1.05)' // Slightly scale to hide blur edges
        }} 
      />
      {/* Rich layered overlay: dark vignette + subtle gradient tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/20 via-transparent to-purple-950/20" />

      <header className="relative z-50 w-full px-4 py-3 sm:px-5 sm:py-3 md:px-8 md:py-4 flex justify-between items-center gap-2 shrink-0">
        <div className="relative" ref={menuRef}>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLocationMenu(!showLocationMenu)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-all backdrop-blur-xl border border-white/15 px-3 py-2 rounded-2xl shadow-lg text-left group">
              <MapPin className="w-3.5 h-3.5 text-blue-300 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold leading-tight truncate max-w-[90px] sm:max-w-[130px] text-white">{currentLocation.city}</span>
                <span className="text-[10px] text-white/60 leading-tight">{currentLocation.temp}<span className="hidden sm:inline">, {currentLocation.desc}</span></span>
              </div>
              {currentLocation.icon
                ? <img src={currentLocation.icon} alt="weather" className="w-6 h-6 ml-0.5 hidden sm:block object-contain drop-shadow-md" />
                : <CloudSun className="w-5 h-5 ml-0.5 text-yellow-300 hidden sm:block" />
              }
            </button>
            <button onClick={refreshWeather} disabled={isWeatherRefreshing} title="Refresh weather" className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/15 rounded-xl transition shadow-lg text-white/60 hover:text-white disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${isWeatherRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {showLocationMenu && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 border-b border-white/10 bg-black/20">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search any city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {isSearching
                  ? <div className="flex items-center justify-center p-6 text-white/50 gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Searching...</span></div>
                  : searchResults.length > 0
                    ? searchResults.map(city => (
                        <button key={city.id} onClick={() => handleSelectCity(city)} className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors flex flex-col group">
                          <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">{city.name}</span>
                          <span className="text-xs text-white/50">{city.admin1 ? `${city.admin1}, ` : ''}{city.country}</span>
                        </button>
                      ))
                    : searchQuery.length > 1
                      ? <div className="p-6 text-center text-sm text-white/50">No cities found</div>
                      : <div className="p-6 text-center text-xs text-white/40">Type 2+ characters to search</div>
                }
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/15 rounded-xl transition shadow-lg group" title="Upload Custom Background">
            <ImageIcon className="w-4 h-4 text-white/70 group-hover:text-white" />
          </button>
          {customBg && (
            <button onClick={resetBackground} className="px-3 py-1.5 text-[10px] font-semibold bg-red-500/70 hover:bg-red-500 border border-red-400/40 rounded-xl backdrop-blur-xl transition shadow-lg tracking-wide">
              Reset BG
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full overflow-hidden px-4 sm:px-8">

        {/* CLOCK + DATE */}
        <div className="text-center animate-in fade-in zoom-in duration-700 w-full shrink-0 mb-10 sm:mb-12">
          {/* Greeting */}
          <p className="text-xs sm:text-sm font-medium tracking-[0.3em] uppercase text-white/50 mb-3"
            style={{ textShadow: '0 1px 10px rgba(0,0,0,0.8)' }}>
            {greeting}, {userName || 'there'}
          </p>
          {/* Time */}
          <h1
            className="font-bold leading-none tracking-[-0.02em] text-[clamp(3.8rem,13vw,8.5rem)] sm:text-[clamp(4.5rem,15vh,9.5rem)]"
            style={{ textShadow: '0 4px 32px rgba(0,0,0,0.6), 0 1px 6px rgba(0,0,0,0.9)' }}
          >
            {formattedTime}
          </h1>
          {/* Date — pill style */}
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-lg">
            <span className="text-xs sm:text-sm font-medium tracking-wide text-white/90">{formattedDate}</span>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="w-full max-w-[260px] sm:max-w-sm md:max-w-md lg:max-w-lg shrink-0 mb-10 sm:mb-12">
          <form action="https://www.google.com/search" method="GET" className="relative flex items-center group">
            <div className="absolute left-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-white/40 group-focus-within:text-white/70 transition" />
            </div>
            <input
              type="text"
              name="q"
              placeholder="Search the web..."
              className="w-full pl-11 pr-[5rem] sm:pr-24 py-3 sm:py-3.5 bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/15 hover:border-white/25 focus:border-white/35 text-white rounded-2xl outline-none backdrop-blur-xl shadow-xl transition-all text-sm placeholder:text-white/35 focus:ring-1 focus:ring-white/20"
              autoComplete="off"
            />
            <button type="submit" className="absolute right-1.5 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 border border-white/20 text-white rounded-xl px-3 py-2 text-xs font-semibold transition-all backdrop-blur-sm shadow tracking-wide">
              <Search className="w-3 h-3" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        </div>

        {/* APP LINKS */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-5 md:gap-6 max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-full shrink-0">
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

          {links.length < MAX_LINKS && (
            <button onClick={() => setShowAddLinkModal(true)} className="group flex flex-col items-center gap-2 hover:-translate-y-1.5 transition-all duration-200 cursor-pointer w-14 sm:w-16 md:w-20">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/8 hover:bg-white/15 border border-dashed border-white/25 hover:border-white/40 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-lg transition-all shrink-0 group-hover:shadow-white/10 group-hover:shadow-xl">
                <Plus className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-white/50 group-hover:text-white/90 drop-shadow-md w-full text-center truncate px-0.5 transition-colors">Add</span>
            </button>
          )}
        </div>

      </main>

      <footer className="relative z-20 w-full px-4 py-3 sm:px-5 sm:py-3 md:px-8 md:py-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between w-full">
          {/* Quote */}
          <div className="hidden sm:block max-w-[40vw] md:max-w-xs lg:max-w-sm">
            <p className="text-[10px] sm:text-xs text-white/50 italic line-clamp-2 leading-relaxed"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              "{quoteOfTheDay}"
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 ml-auto items-center">
            {isAdmin && (
              <button onClick={() => window.location.hash = 'admin'} className="flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/50 backdrop-blur-xl border border-blue-400/25 hover:border-blue-400/50 w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all shadow-lg cursor-pointer text-blue-300 hover:text-white group" title="Admin Panel">
                <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            )}

            <div className="relative" ref={settingsRef}>
              <button onClick={() => setShowSettings(!showSettings)} className="flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/15 w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all shadow-lg cursor-pointer text-white/60 hover:text-white group" title="Settings">
                <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#111]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 py-1.5">
                  <button onClick={() => setIs24Hour(!is24Hour)} className="w-full text-left px-4 py-2.5 hover:bg-white/8 transition-colors flex items-center justify-between text-xs text-white/80 cursor-pointer">
                    <span>24-Hour Time</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors ${is24Hour ? 'bg-blue-500 text-white' : 'bg-white/15 text-white/40'}`}>{is24Hour ? 'ON' : 'OFF'}</span>
                  </button>
                  <button onClick={() => setShowSeconds(!showSeconds)} className="w-full text-left px-4 py-2.5 hover:bg-white/8 transition-colors flex items-center justify-between text-xs text-white/80 cursor-pointer">
                    <span>Show Seconds</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors ${showSeconds ? 'bg-blue-500 text-white' : 'bg-white/15 text-white/40'}`}>{showSeconds ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              )}
            </div>

            <button onClick={handleSignOut} className="flex items-center justify-center bg-white/10 hover:bg-red-500/60 backdrop-blur-xl border border-white/15 hover:border-red-400/40 w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all shadow-lg cursor-pointer text-white/60 hover:text-white group" title="Sign Out">
              <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <button onClick={() => window.location.hash = 'tasks'} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/15 hover:border-white/25 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shadow-lg cursor-pointer group">
              <CheckCircle className="w-3.5 h-3.5 text-blue-300 group-hover:text-blue-200" />
              <span className="text-xs font-semibold text-white/80 group-hover:text-white">Tasks</span>
              <span className="text-[10px] font-bold bg-blue-500/40 group-hover:bg-blue-500/60 px-1.5 py-0.5 rounded-lg text-blue-200 transition-colors">
                {currentTasks.filter(t => !t.completed).length}
              </span>
            </button>
          </div>
        </div>

        <p className="text-[9px] text-white/25 font-light tracking-widest text-center mt-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          Developed with ❤️ by Debabrata &copy; {new Date().getFullYear()}
        </p>
      </footer>

      <div className={`fixed top-0 right-0 h-full w-full sm:w-96 md:w-[420px] bg-black/50 backdrop-blur-3xl border-l border-white/8 z-[100] transform transition-transform duration-500 shadow-2xl flex flex-col ${showTasksSidebar ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* ── Sidebar Header ── */}
        <header className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-500/20 border border-blue-400/30 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">My Tasks</h2>
                <p className="text-[10px] text-white/40 leading-tight">
                  {currentTasks.filter(t => !t.completed).length} remaining · {currentTasks.filter(t => t.completed).length} done
                </p>
              </div>
            </div>
            <button onClick={() => window.location.hash = ''} className="p-2 bg-white/8 hover:bg-white/15 rounded-xl transition cursor-pointer">
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* ── Date Pills ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 admin-scrollbar">
            {availableDates.map(date => {
              const isToday = date === getTodayStr();
              const isSelected = date === selectedDate;
              const d = new Date(date + 'T00:00:00');
              const dayName = isToday ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' });
              const dayNum = d.getDate();
              const monthName = d.toLocaleDateString(undefined, { month: 'short' });
              const taskCount = (tasksByDate[date] || []).length;
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center shrink-0 px-3 py-2 rounded-2xl border transition-all duration-200 min-w-[56px] ${
                    isSelected
                      ? 'bg-blue-500/30 border-blue-400/50 shadow-lg shadow-blue-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className={`text-[10px] font-semibold uppercase tracking-wider leading-tight ${isSelected ? 'text-blue-300' : 'text-white/50'}`}>{dayName}</span>
                  <span className={`text-lg font-bold leading-tight ${isSelected ? 'text-white' : 'text-white/70'}`}>{dayNum}</span>
                  <span className={`text-[9px] leading-tight ${isSelected ? 'text-blue-300/80' : 'text-white/30'}`}>{monthName}</span>
                  {taskCount > 0 && (
                    <span className={`mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${isSelected ? 'bg-blue-400/40 text-blue-200' : 'bg-white/10 text-white/40'}`}>
                      {taskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* ── Task List ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 admin-scrollbar space-y-2">
          {/* Add task input */}
          <form onSubmit={addTask} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 bg-white/8 hover:bg-white/12 focus:bg-white/15 border border-white/10 focus:border-blue-400/40 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25"
            />
            <button type="submit" className="bg-blue-500/80 hover:bg-blue-500 active:scale-95 text-white px-4 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-blue-500/20">
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Pending tasks with drag-to-reorder */}
          {currentTasks.filter(t => !t.completed).length > 0 && (
            <div className="mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-1 mb-2">Pending</p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTaskDragEnd}
              >
                <SortableContext
                  items={currentTasks.filter(t => !t.completed).map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {currentTasks.filter(t => !t.completed).map(task => (
                      <SortableTaskItem
                        key={task.id}
                        task={task}
                        editingTaskId={editingTaskId}
                        editingTaskText={editingTaskText}
                        setEditingTaskText={setEditingTaskText}
                        startEditTask={startEditTask}
                        saveEditTask={saveEditTask}
                        toggleTask={toggleTask}
                        deleteTask={deleteTask}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Completed tasks */}
          {currentTasks.filter(t => t.completed).length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-1 mb-2">Completed</p>
              <div className="space-y-2">
                {currentTasks.filter(t => t.completed).map(task => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    editingTaskId={editingTaskId}
                    editingTaskText={editingTaskText}
                    setEditingTaskText={setEditingTaskText}
                    startEditTask={startEditTask}
                    saveEditTask={saveEditTask}
                    toggleTask={toggleTask}
                    deleteTask={deleteTask}
                  />
                ))}
              </div>
            </div>
          )}

          {currentTasks.length === 0 && (
            <div className="text-center text-white/25 mt-16 space-y-3">
              <Calendar className="w-10 h-10 mx-auto opacity-20" />
              <p className="text-sm">No tasks for this day.</p>
              <p className="text-xs text-white/15">Add one above to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* UPDATED: Overlay also clears hash */}
      {showTasksSidebar && <div onClick={() => window.location.hash = ''} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] transition-opacity duration-300" />}

      {/* ── Add Shortcut Modal ── */}
      {showAddLinkModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => { setShowAddLinkModal(false); setNewLinkData({ name: '', url: '' }); }} />

          {/* Sheet on mobile, centered card on sm+ */}
          <div className="relative z-10 w-full sm:w-[420px] animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            {/* Drag handle (mobile only) */}
            <div className="flex justify-center mb-2 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="bg-[#0f0f0f] sm:bg-[#111]/95 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl">

              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                {/* Glow accent */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white leading-none">Add Shortcut</h2>
                      <p className="text-[11px] text-white/35 mt-0.5">Quick access to your favourite sites</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowAddLinkModal(false); setNewLinkData({ name: '', url: '' }); }}
                    className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleAddLink} className="px-6 pb-6 space-y-3">

                {/* Name field */}
                <div className="group">
                  <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 ml-1">Site Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newLinkData.name}
                      onChange={(e) => setNewLinkData({ ...newLinkData, name: e.target.value })}
                      required
                      autoFocus
                      placeholder="e.g. Netflix, Notion, Figma…"
                      className="w-full bg-white/5 border border-white/8 hover:border-white/15 focus:border-blue-500/70 focus:bg-blue-500/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200"
                    />
                    {newLinkData.name && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-blue-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* URL field */}
                <div className="group">
                  <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 ml-1">Website URL</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs font-mono select-none pointer-events-none">
                      🔗
                    </div>
                    <input
                      type="url"
                      value={newLinkData.url}
                      onChange={(e) => setNewLinkData({ ...newLinkData, url: e.target.value })}
                      required
                      placeholder="https://example.com"
                      className="w-full bg-white/5 border border-white/8 hover:border-white/15 focus:border-blue-500/70 focus:bg-blue-500/5 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200"
                    />
                    {newLinkData.url && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Check className="w-3 h-3 text-blue-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview pill */}
                {newLinkData.name && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/4 border border-white/8 rounded-xl">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 shrink-0">
                      {newLinkData.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs text-white/50 truncate">{newLinkData.name}</span>
                    {newLinkData.url && <span className="text-[10px] text-white/25 truncate ml-auto">{newLinkData.url.replace(/^https?:\/\//, '').split('/')[0]}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowAddLinkModal(false); setNewLinkData({ name: '', url: '' }); }}
                    className="flex-1 bg-white/6 hover:bg-white/10 text-white/60 hover:text-white py-3 rounded-xl text-sm font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newLinkData.name || !newLinkData.url}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-white/8 disabled:to-white/8 disabled:text-white/25 text-white py-3 rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-blue-500/20 disabled:shadow-none"
                  >
                    Add Shortcut
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Shortcut Modal ── */}
      {editingLink && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setEditingLink(null)} />

          <div className="relative z-10 w-full sm:w-[420px] animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            <div className="flex justify-center mb-2 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="bg-[#0f0f0f] sm:bg-[#111]/95 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl">

              {/* Header */}
              <div className="relative px-6 pt-6 pb-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                      <Pencil className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white leading-none">Edit Shortcut</h2>
                      <p className="text-[11px] text-white/35 mt-0.5">Update name or URL</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingLink(null)}
                    className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleEditLinkSubmit} className="px-6 pb-6 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 ml-1">Site Name</label>
                  <input
                    type="text"
                    value={editingLink.name}
                    onChange={e => setEditingLink({ ...editingLink, name: e.target.value })}
                    autoFocus
                    className="w-full bg-white/5 border border-white/8 hover:border-white/15 focus:border-violet-500/70 focus:bg-violet-500/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 ml-1">Website URL</label>
                  <input
                    type="text"
                    value={editingLink.url}
                    onChange={e => setEditingLink({ ...editingLink, url: e.target.value })}
                    className="w-full bg-white/5 border border-white/8 hover:border-white/15 focus:border-violet-500/70 focus:bg-violet-500/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingLink(null)}
                    className="flex-1 bg-white/6 hover:bg-white/10 text-white/60 hover:text-white py-3 rounded-xl text-sm font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editingLink.name || !editingLink.url}
                    className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-white/8 disabled:to-white/8 disabled:text-white/25 text-white py-3 rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-violet-500/20 disabled:shadow-none"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
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
      {/* Vercel wake up ping */}
    </div>
  );
}