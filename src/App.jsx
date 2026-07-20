import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Trash2, CloudSun, MapPin, Image as ImageIcon, X, Loader2, CheckCircle, LogOut, ShieldCheck, Settings, RefreshCw, GripVertical, Pencil, Check, Calendar } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// --- Firebase Imports ---
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, updateProfile, signInAnonymously, linkWithCredential, EmailAuthProvider, sendEmailVerification, signInWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, increment, arrayUnion, onSnapshot } from 'firebase/firestore';

// --- Drag and Drop ---
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Custom Components ---
import AdminPanel from './components/AdminPanel';
import SortableLink from './components/SortableLink';

// --- Constants & Utils ---
import { ADMIN_EMAIL, MAX_LINKS } from './constants';
import { getTodayStr, compressImage } from './utils';

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
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    try {
      return !localStorage.getItem('cached_user');
    } catch {
      return true;
    }
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  // --- NEW AUTH STATES ---
  const [authStep, setAuthStep] = useState('onboarding'); // 'onboarding', 'email', 'login', 'signup'
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [signupName, setSignupName] = useState('');
  const [typedName, setTypedName] = useState('');
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());  
  const [userName, setUserName] = useState(() => {
    try {
      const cached = localStorage.getItem('userName');
      return cached ? JSON.parse(cached) : '';
    } catch {
      return '';
    }
  });
  const [greeting, setGreeting] = useState('Good Day');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');          
  const [currentLocation, setCurrentLocation] = useState(() => {
    try {
      const cached = localStorage.getItem('currentLocation');
      return cached ? JSON.parse(cached) : {
        city: "Barrackpore",
        timezone: "Asia/Kolkata",
        temp: "28°C",
        desc: "Partly Cloudy",
        icon: null
      };
    } catch {
      return {
        city: "Barrackpore",
        timezone: "Asia/Kolkata",
        temp: "28°C",
        desc: "Partly Cloudy",
        icon: null
      };
    }
  });
  const [tasksByDate, setTasksByDate] = useState(() => {
    try {
      const cached = localStorage.getItem('tasksByDate');
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [selectedMonth, setSelectedMonth] = useState(() => getTodayStr().substring(0, 7)); // Default: current month "YYYY-MM"
  const [selectedYear, setSelectedYear] = useState(() => getTodayStr().substring(0, 4)); // Default: current year "YYYY"
  const [links, setLinks] = useState(() => {
    try {
      const cached = localStorage.getItem('links');
      return cached ? JSON.parse(cached) : DEFAULT_LINKS;
    } catch {
      return DEFAULT_LINKS;
    }
  });
  const [customBg, setCustomBg] = useState(() => {
    try {
      const cached = localStorage.getItem('customBg');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [customBgBlur, setCustomBgBlur] = useState(() => {
    try {
      const cached = localStorage.getItem('customBgBlur');
      return cached ? JSON.parse(cached) : true;
    } catch {
      return true;
    }
  });
  const [is24Hour, setIs24Hour] = useState(() => {
    try {
      const cached = localStorage.getItem('is24Hour');
      return cached ? JSON.parse(cached) : false;
    } catch {
      return false;
    }
  });
  const [showSeconds, setShowSeconds] = useState(() => {
    try {
      const cached = localStorage.getItem('showSeconds');
      return cached ? JSON.parse(cached) : true;
    } catch {
      return true;
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);
  const lastDbData = useRef(null);
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState(false);

  const isStateEqual = (dbData) => {
    if (!dbData) return false;
    if (dbData.userName !== userName) return false;
    if (dbData.customBg !== customBg) return false;
    if (dbData.customBgBlur !== customBgBlur) return false;
    if (dbData.is24Hour !== is24Hour) return false;
    if (dbData.showSeconds !== showSeconds) return false;
    
    if (dbData.currentLocation?.city !== currentLocation?.city ||
        dbData.currentLocation?.timezone !== currentLocation?.timezone ||
        dbData.currentLocation?.temp !== currentLocation?.temp ||
        dbData.currentLocation?.desc !== currentLocation?.desc ||
        dbData.currentLocation?.icon !== currentLocation?.icon ||
        dbData.currentLocation?.timezoneOffset !== currentLocation?.timezoneOffset) {
      return false;
    }
    
    const dbLinks = dbData.links || [];
    if (dbLinks.length !== links.length) return false;
    for (let i = 0; i < links.length; i++) {
      if (dbLinks[i].id !== links[i].id ||
          dbLinks[i].name !== links[i].name ||
          dbLinks[i].url !== links[i].url ||
          dbLinks[i].icon !== links[i].icon) {
        return false;
      }
    }
    
    const dbTasksJson = JSON.stringify(dbData.tasksByDate || {});
    const localTasksJson = JSON.stringify(tasksByDate);
    if (dbTasksJson !== localTasksJson) return false;
    
    return true;
  };

  // --- SERVICE WORKER UPDATE STATES ---
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error: ', error);
    },
  });

  const [showTestPrompt, setShowTestPrompt] = useState(() => {
    try {
      const isDev = import.meta.env.DEV;
      const isTestQuery = new URLSearchParams(window.location.search).get('test-update') === 'true';
      return isDev && isTestQuery;
    } catch {
      return false;
    }
  });

  const [dismissedAt, setDismissedAt] = useState(() => {
    try {
      const val = localStorage.getItem('sw_update_dismissed_at');
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  });

  const isToasterSnoozed = (() => {
    if (!dismissedAt) return false;
    const limitMs = 24 * 60 * 60 * 1000; // Snooze for 24 Hours (1 Day)
    return Date.now() - dismissedAt < limitMs;
  })();

  const isGuest = !!(user && user.isAnonymous && userName.toLowerCase() === 'guest');
  const isEmailVerified = !!(user && user.emailVerified);

  // --- ANALYTICS: Time Spent Tracker ---
  // --- ANALYTICS: Time Spent Tracker ---
  useEffect(() => {
    if (!user || !isDataLoaded) return;

    const heartbeat = setInterval(async () => {
      // Only track time if the tab is active/visible to the user
      if (document.visibilityState !== 'visible') return;

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
        
        // Reset to current month when closing tasks
        const currentYearMonth = getTodayStr().substring(0, 7);
        const currentYear = getTodayStr().substring(0, 4);
        setSelectedYear(currentYear);
        setSelectedMonth(currentYearMonth);
        setSelectedDate(getTodayStr());
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

  // --- RESTORE SETTINGS FROM CHROME STORAGE ON MOUNT ---
  useEffect(() => {
    const restoreFromChrome = async () => {
      const hasChromeStorage = typeof window !== 'undefined' && 
        window.location.protocol === 'chrome-extension:' && 
        window.chrome && 
        chrome.storage && 
        chrome.storage.local;

      if (hasChromeStorage) {
        try {
          const keys = [
            'links',
            'tasksByDate',
            'currentLocation',
            'customBg',
            'customBgBlur',
            'userName',
            'is24Hour',
            'showSeconds',
            'cached_user',
            'login_method'
          ];
          
          chrome.storage.local.get(keys, (res) => {
            if (res.userName) {
              // Restore to localStorage so sync initialized values are populated
              if (res.links) localStorage.setItem('links', JSON.stringify(res.links));
              if (res.tasksByDate) localStorage.setItem('tasksByDate', JSON.stringify(res.tasksByDate));
              if (res.currentLocation) localStorage.setItem('currentLocation', JSON.stringify(res.currentLocation));
              if (res.customBg) localStorage.setItem('customBg', JSON.stringify(res.customBg));
              else localStorage.removeItem('customBg');
              if (res.customBgBlur !== undefined) localStorage.setItem('customBgBlur', JSON.stringify(res.customBgBlur));
              if (res.userName) localStorage.setItem('userName', JSON.stringify(res.userName));
              if (res.is24Hour !== undefined) localStorage.setItem('is24Hour', JSON.stringify(res.is24Hour));
              if (res.showSeconds !== undefined) localStorage.setItem('showSeconds', JSON.stringify(res.showSeconds));
              if (res.cached_user) localStorage.setItem('cached_user', JSON.stringify(res.cached_user));
              if (res.login_method) localStorage.setItem('login_method', res.login_method);

              // Update React state
              setLinks(res.links || DEFAULT_LINKS);
              setTasksByDate(res.tasksByDate || {});
              setCurrentLocation(res.currentLocation || { city: "Barrackpore", timezone: "Asia/Kolkata", temp: "28°C", desc: "Partly Cloudy", icon: null });
              setCustomBg(res.customBg || null);
              setCustomBgBlur(res.customBgBlur !== undefined ? res.customBgBlur : true);
              setUserName(res.userName);
              setIs24Hour(res.is24Hour !== undefined ? res.is24Hour : false);
              setShowSeconds(res.showSeconds !== undefined ? res.showSeconds : true);
              
              if (res.cached_user) {
                setUser(res.cached_user);
                setAuthLoading(false);
              }
            }
            setIsRestored(true);
          });
        } catch (err) {
          console.error("Failed to restore from chrome.storage.local:", err);
          setIsRestored(true);
        }
      } else {
        setIsRestored(true);
      }
    };
    restoreFromChrome();
  }, []);

  useEffect(() => {
    if (!isRestored) return;

    let unsubscribeSnapshot = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (currentUser) {
        // Set login method in storage based on user type
        let method = 'guest';
        if (currentUser.email) {
          const isGoogle = currentUser.providerData.some(p => p.providerId === 'google.com');
          method = isGoogle ? 'google' : 'email';
        } else {
          const cachedMethod = localStorage.getItem('login_method');
          if (cachedMethod === 'named_guest' || cachedMethod === 'guest') {
            method = cachedMethod;
          } else {
            method = (currentUser.displayName && currentUser.displayName !== 'Guest') ? 'named_guest' : 'guest';
          }
        }
        localStorage.setItem('login_method', method);
        if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ login_method: method });
        }

        try {
          const docRef = doc(db, 'users', currentUser.uid);
          
          unsubscribeSnapshot = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              
              if (data.disabled) {
                setIsBanned(true);
                setIsDataLoaded(true);
                setAuthLoading(false);
                return;
              } else {
                setIsBanned(false);
              }

              if (data.deleted) {
                setIsDeleted(true);
                setIsDataLoaded(true);
                setAuthLoading(false);
                return;
              } else {
                setIsDeleted(false);
              }

              if (data.links) {
                setLinks(data.links);
                localStorage.setItem('links', JSON.stringify(data.links));
              }
              if (data.tasksByDate) {
                setTasksByDate(data.tasksByDate);
                localStorage.setItem('tasksByDate', JSON.stringify(data.tasksByDate));
              } else if (data.tasks) {
                const migratedTasks = { [getTodayStr()]: data.tasks };
                setTasksByDate(migratedTasks);
                localStorage.setItem('tasksByDate', JSON.stringify(migratedTasks));
              }
              if (data.currentLocation) {
                setCurrentLocation(data.currentLocation);
                localStorage.setItem('currentLocation', JSON.stringify(data.currentLocation));
              }
              if (data.customBg) {
                setCustomBg(data.customBg);
                localStorage.setItem('customBg', JSON.stringify(data.customBg));
              } else {
                setCustomBg(null);
                localStorage.removeItem('customBg');
              }
              if (data.customBgBlur !== undefined) {
                setCustomBgBlur(data.customBgBlur);
                localStorage.setItem('customBgBlur', JSON.stringify(data.customBgBlur));
              }
              if (data.userName) {
                setUserName(data.userName);
                localStorage.setItem('userName', JSON.stringify(data.userName));
              }
              if (data.is24Hour !== undefined) {
                setIs24Hour(data.is24Hour);
                localStorage.setItem('is24Hour', JSON.stringify(data.is24Hour));
              }
              if (data.showSeconds !== undefined) {
                setShowSeconds(data.showSeconds);
                localStorage.setItem('showSeconds', JSON.stringify(data.showSeconds));
              }
              // Set the ref to store this snapshot data immediately
              lastDbData.current = data;
              const cachedUserInfo = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName
              };
              localStorage.setItem('cached_user', JSON.stringify(cachedUserInfo));
              if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ cached_user: cachedUserInfo });
              }
              setIsDataLoaded(true);
            } else {
              const defaultTasks = [
                { id: 1, text: 'Review project proposals', completed: false },
                { id: 2, text: 'Reply to emails', completed: true },
              ];
              const defaultName = currentUser.displayName || email.split('@')[0] || 'Friend';
              const todayStr = getTodayStr();
              
              const defaultData = {
                links: DEFAULT_LINKS,
                tasksByDate: { [todayStr]: defaultTasks }, 
                currentLocation: { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' },
                customBg: null,
                userName: currentUser.displayName || 'Anonymous',
                email: currentUser.email,
                totalTimeSpent: 0,
                timeSpentByDate: { [todayStr]: 0 },
                loginDates: [todayStr],
                lastActive: new Date().toISOString(),
                [`firstLogin_${todayStr}`]: new Date().toISOString()
              };

              lastDbData.current = defaultData;
              await setDoc(docRef, defaultData);
              
              setTasksByDate({ [todayStr]: defaultTasks });
              setUserName(defaultName);

              localStorage.setItem('links', JSON.stringify(DEFAULT_LINKS));
              localStorage.setItem('tasksByDate', JSON.stringify({ [todayStr]: defaultTasks }));
              localStorage.setItem('currentLocation', JSON.stringify({ city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' }));
              localStorage.removeItem('customBg');
              localStorage.setItem('userName', JSON.stringify(defaultName));
              localStorage.setItem('is24Hour', JSON.stringify(false));
              localStorage.setItem('showSeconds', JSON.stringify(true));
              
              const cachedUserInfo = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName
              };
              localStorage.setItem('cached_user', JSON.stringify(cachedUserInfo));
              if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ cached_user: cachedUserInfo });
              }
              setIsDataLoaded(true);
            }
            setAuthLoading(false);
          }, (err) => {
            console.error("Real-time listener failed:", err);
          });

          // --- ANALYTICS: Instant Login Record ---
          try {
            await updateDoc(docRef, {
              loginDates: arrayUnion(getTodayStr()),
              lastActive: new Date().toISOString()
            });
          } catch (e) {
            console.error("Failed to record instant login", e);
          }

          // --- ANALYTICS: Record FIRST login of the day ---
          const todayStr = getTodayStr();
          try {
            const freshSnap = await getDoc(docRef); 
            if (freshSnap.exists()) {
              const freshData = freshSnap.data();
              const updates = { 
                loginDates: arrayUnion(todayStr),
                lastActive: new Date().toISOString()
              };
              if (!freshData[`firstLogin_${todayStr}`]) {
                updates[`firstLogin_${todayStr}`] = new Date().toISOString();
              }
              await updateDoc(docRef, updates);
            }
          } catch (e) {
            console.error("Failed to record login data", e);
          }
        } catch (error) {
          console.error("Error loading cloud data:", error);
        }
      } else {
        setIsBanned(false);
        setIsDeleted(false);
        setIsDataLoaded(false);
        
        // Check if they were a guest user
        const cachedUser = (() => {
          try {
            const cached = localStorage.getItem('cached_user');
            return cached ? JSON.parse(cached) : null;
          } catch {
            return null;
          }
        })();
        
        const cachedMethod = localStorage.getItem('login_method');
        const cachedName = (() => {
          try {
            const cached = localStorage.getItem('userName');
            return cached ? JSON.parse(cached) : '';
          } catch {
            return '';
          }
        })();

        if ((cachedMethod === 'guest' || cachedMethod === 'named_guest' || (cachedUser && !cachedUser.email)) && cachedName) {
          // Auto-sign in anonymously as guest to restore the session!
          setAuthLoading(true);
          signInAnonymously(auth).then(async (userCredential) => {
            const docRef = doc(db, 'users', userCredential.user.uid);
            
            // Read local settings
            const localLinks = (() => {
              try {
                const cached = localStorage.getItem('links');
                return cached ? JSON.parse(cached) : DEFAULT_LINKS;
              } catch {
                return DEFAULT_LINKS;
              }
            })();
            const localTasks = (() => {
              try {
                const cached = localStorage.getItem('tasksByDate');
                return cached ? JSON.parse(cached) : {};
              } catch {
                return {};
              }
            })();
            const localLoc = (() => {
              try {
                const cached = localStorage.getItem('currentLocation');
                return cached ? JSON.parse(cached) : { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' };
              } catch {
                return { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' };
              }
            })();
            const localBg = (() => {
              try {
                const cached = localStorage.getItem('customBg');
                return cached ? JSON.parse(cached) : null;
              } catch {
                return null;
              }
            })();
            const localBgBlur = (() => {
              try {
                const cached = localStorage.getItem('customBgBlur');
                return cached ? JSON.parse(cached) : true;
              } catch {
                return true;
              }
            })();
            const local24 = (() => {
              try {
                const cached = localStorage.getItem('is24Hour');
                return cached ? JSON.parse(cached) : false;
              } catch {
                return false;
              }
            })();
            const localSec = (() => {
              try {
                const cached = localStorage.getItem('showSeconds');
                return cached ? JSON.parse(cached) : true;
              } catch {
                return true;
              }
            })();

            const todayStr = getTodayStr();
            const payload = {
              links: localLinks,
              tasksByDate: localTasks,
              currentLocation: localLoc,
              customBg: localBg,
              customBgBlur: localBgBlur,
              userName: cachedName,
              email: null,
              is24Hour: local24,
              showSeconds: localSec,
              lastActive: new Date().toISOString(),
              [`firstLogin_${todayStr}`]: new Date().toISOString()
            };

            lastDbData.current = payload;
            await setDoc(docRef, payload);

            const cachedUserInfo = {
              uid: userCredential.user.uid,
              email: null,
              displayName: cachedName
            };

            localStorage.setItem('cached_user', JSON.stringify(cachedUserInfo));
            localStorage.setItem('login_method', cachedMethod || (cachedName === 'Guest' ? 'guest' : 'named_guest'));
            
            if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({
                cached_user: cachedUserInfo,
                login_method: cachedMethod || (cachedName === 'Guest' ? 'guest' : 'named_guest')
              });
            }

            setUser(userCredential.user);
            setIsDataLoaded(true);
            setAuthLoading(false);
          }).catch((err) => {
            console.error("Auto guest login failed:", err);
            localStorage.clear();
            if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
              chrome.storage.local.clear();
            }
            setUser(null);
            setAuthLoading(false);
          });
        } else {
          setUser(null);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [isRestored]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Sync local state changes to localStorage and chrome.storage.local ---
  useEffect(() => {
    if (!user || !isDataLoaded) return;
    try {
      localStorage.setItem('links', JSON.stringify(links));
      localStorage.setItem('tasksByDate', JSON.stringify(tasksByDate));
      localStorage.setItem('currentLocation', JSON.stringify(currentLocation));
      localStorage.setItem('customBg', JSON.stringify(customBg));
      localStorage.setItem('customBgBlur', JSON.stringify(customBgBlur));
      localStorage.setItem('userName', JSON.stringify(userName));
      localStorage.setItem('is24Hour', JSON.stringify(is24Hour));
      localStorage.setItem('showSeconds', JSON.stringify(showSeconds));

      if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          links,
          tasksByDate,
          currentLocation,
          customBg,
          customBgBlur,
          userName,
          is24Hour,
          showSeconds
        });
      }
    } catch (e) {
      console.error("Failed to sync state to storage:", e);
    }
  }, [links, tasksByDate, currentLocation, customBg, customBgBlur, userName, user, isDataLoaded, is24Hour, showSeconds]);

  // Debounced Firestore sync — waits 1.5s after last change before writing
  useEffect(() => {
    if (!user || !isDataLoaded) return;
    
    // Do not sync if current state is equal to what is already on Firestore
    if (lastDbData.current && isStateEqual(lastDbData.current)) {
      return;
    }

    const timer = setTimeout(() => {
      const payload = {
        links,
        tasksByDate,
        currentLocation,
        customBg,
        customBgBlur,
        userName,
        email: user.email,
        is24Hour,
        showSeconds
      };
      
      // Update our ref immediately to prevent redundant loops
      lastDbData.current = payload;

      setDoc(doc(db, 'users', user.uid), payload, { merge: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [links, tasksByDate, currentLocation, customBg, customBgBlur, userName, user, isDataLoaded, is24Hour, showSeconds]);

  // --- Fetch client IP once and log to Firestore ---
  useEffect(() => {
    if (!user || !isDataLoaded) return;
    const storedIp = localStorage.getItem('user_ip_stored');
    if (!storedIp) {
      const fetchIp = async () => {
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          if (res.ok) {
            const data = await res.json();
            if (data && data.ip) {
              const docRef = doc(db, 'users', user.uid);
              await updateDoc(docRef, { ipAddress: data.ip });
              localStorage.setItem('user_ip_stored', data.ip);
              console.log("Logged user IP:", data.ip);
            }
          }
        } catch (e) {
          console.error("Failed to log IP address:", e);
        }
      };
      fetchIp();
    }
  }, [user, isDataLoaded]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Auto-update greeting based on current hour
      const hour = now.getHours();
      if (hour >= 5 && hour < 12) setGreeting('Good Morning');
      else if (hour >= 12 && hour < 17) setGreeting('Good Afternoon');
      else if (hour >= 17 && hour < 21) setGreeting('Good Evening');
      else setGreeting('Good Night');
    }, 1000);
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

        const dayIndex = Math.floor(Date.now() / 86400000);
        const selectedImage = activeArray[dayIndex % activeArray.length];
        
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
      const dayIndex = Math.floor(Date.now() / 86400000);
      try {
        const docRef = doc(db, "globalConfig", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().quotes && docSnap.data().quotes.length > 0) {
          const cloudQuotes = docSnap.data().quotes;
          setQuoteOfTheDay(cloudQuotes[dayIndex % cloudQuotes.length]);
        } else {
          setQuoteOfTheDay(MOTIVATIONAL_QUOTES[dayIndex % MOTIVATIONAL_QUOTES.length]);
        }
      } catch {
        setQuoteOfTheDay(MOTIVATIONAL_QUOTES[dayIndex % MOTIVATIONAL_QUOTES.length]);
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

  const handleGuestLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const docRef = doc(db, 'users', userCredential.user.uid);
      const defaultTasks = [
        { id: 1, text: 'Review project proposals', completed: false },
        { id: 2, text: 'Reply to emails', completed: true },
      ];
      
      const todayStr = getTodayStr();
      await setDoc(docRef, {
        links: DEFAULT_LINKS,
        tasksByDate: { [todayStr]: defaultTasks }, 
        currentLocation: { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' },
        customBg: null,
        userName: 'Guest',
        email: null,
        totalTimeSpent: 0,
        timeSpentByDate: { [todayStr]: 0 },
        loginDates: [todayStr],
        lastActive: new Date().toISOString(),
        [`firstLogin_${todayStr}`]: new Date().toISOString()
      });

      setUserName('Guest');
      setTasksByDate({ [todayStr]: defaultTasks });
      setLinks(DEFAULT_LINKS);
      setCustomBg(null);
      
      localStorage.setItem('links', JSON.stringify(DEFAULT_LINKS));
      localStorage.setItem('tasksByDate', JSON.stringify({ [todayStr]: defaultTasks }));
      localStorage.setItem('currentLocation', JSON.stringify({ city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' }));
      localStorage.removeItem('customBg');
      localStorage.setItem('userName', JSON.stringify('Guest'));
      localStorage.setItem('is24Hour', JSON.stringify(false));
      localStorage.setItem('showSeconds', JSON.stringify(true));
      localStorage.setItem('cached_user', JSON.stringify({
        uid: userCredential.user.uid,
        email: null,
        displayName: 'Guest'
      }));
      localStorage.setItem('login_method', 'guest');
      if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          links: DEFAULT_LINKS,
          tasksByDate: { [todayStr]: defaultTasks },
          currentLocation: { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' },
          customBg: null,
          userName: 'Guest',
          is24Hour: false,
          showSeconds: true,
          cached_user: {
            uid: userCredential.user.uid,
            email: null,
            displayName: 'Guest'
          },
          login_method: 'guest'
        });
      }
      setIsDataLoaded(true);
    } catch (err) {
      console.error(err);
      setAuthError("Failed to continue as guest: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleNamedLogin = async (e) => {
    e.preventDefault();
    if (!typedName.trim()) {
      setAuthError("Please enter your name.");
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const name = typedName.trim();
      const userCredential = await signInAnonymously(auth);
      const docRef = doc(db, 'users', userCredential.user.uid);
      const defaultTasks = [
        { id: 1, text: 'Review project proposals', completed: false },
        { id: 2, text: 'Reply to emails', completed: true },
      ];
      
      const todayStr = getTodayStr();
      await setDoc(docRef, {
        links: DEFAULT_LINKS,
        tasksByDate: { [todayStr]: defaultTasks }, 
        currentLocation: { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' },
        customBg: null,
        userName: name,
        email: null,
        totalTimeSpent: 0,
        timeSpentByDate: { [todayStr]: 0 },
        loginDates: [todayStr],
        lastActive: new Date().toISOString(),
        [`firstLogin_${todayStr}`]: new Date().toISOString()
      });

      setUserName(name);
      setTasksByDate({ [todayStr]: defaultTasks });
      setLinks(DEFAULT_LINKS);
      setCustomBg(null);

      localStorage.setItem('links', JSON.stringify(DEFAULT_LINKS));
      localStorage.setItem('tasksByDate', JSON.stringify({ [todayStr]: defaultTasks }));
      localStorage.setItem('currentLocation', JSON.stringify({ city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' }));
      localStorage.removeItem('customBg');
      localStorage.setItem('userName', JSON.stringify(name));
      localStorage.setItem('is24Hour', JSON.stringify(false));
      localStorage.setItem('showSeconds', JSON.stringify(true));
      localStorage.setItem('cached_user', JSON.stringify({
        uid: userCredential.user.uid,
        email: null,
        displayName: name
      }));
      localStorage.setItem('login_method', 'named_guest');
      if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          links: DEFAULT_LINKS,
          tasksByDate: { [todayStr]: defaultTasks },
          currentLocation: { city: 'Barrackpore', timezone: 'Asia/Kolkata', temp: '28°C', desc: 'Partly Cloudy' },
          customBg: null,
          userName: name,
          is24Hour: false,
          showSeconds: true,
          cached_user: {
            uid: userCredential.user.uid,
            email: null,
            displayName: name
          },
          login_method: 'named_guest'
        });
      }
      setIsDataLoaded(true);
    } catch (err) {
      console.error(err);
      setAuthError("Failed to get started: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLinkEmail = async (e) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');
    setIsLinking(true);
    try {
      const credential = EmailAuthProvider.credential(linkEmail.trim(), linkPassword);
      // Link the current anonymous user account with the email/password credential
      const userCredential = await linkWithCredential(auth.currentUser, credential);
      
      // Update display name in Firebase profile and Firestore doc
      await updateProfile(userCredential.user, { displayName: userName });
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        email: linkEmail.trim()
      });

      // Send verification email
      await sendEmailVerification(userCredential.user);
      
      setLinkSuccess("Account registered! Check your inbox for verification email.");
      setLinkEmail('');
      setLinkPassword('');
    } catch (err) {
      console.error("Linking failed:", err);
      if (err.code === 'auth/credential-already-in-use') {
        setLinkError("This email is already registered. Would you like to sign in to your existing account instead?");
      } else {
        setLinkError(err.message.replace("Firebase: ", ""));
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkGoogle = async () => {
    setLinkError('');
    setLinkSuccess('');
    setIsLinking(true);
    try {
      const provider = new GoogleAuthProvider();

      // Check if running in a Chrome Extension environment
      if (window.location.protocol === 'chrome-extension:' && window.chrome && chrome.identity) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
          throw new Error("VITE_GOOGLE_CLIENT_ID is not configured in your .env file. Please add it to link Google account.");
        }

        const extensionId = window.location.host;
        const redirectUri = `https://${extensionId}.chromiumapp.org/`;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId)}&` +
          `response_type=token&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent("openid email profile")}`;

        chrome.identity.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          async (redirectUrl) => {
            if (chrome.runtime.lastError || !redirectUrl) {
              const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : "User cancelled or redirect failed.";
              console.error("Chrome launchWebAuthFlow failed:", err);
              setLinkError(`Linking Google failed: ${err}`);
              setIsLinking(false);
              return;
            }

            try {
              const url = new URL(redirectUrl);
              const params = new URLSearchParams(url.hash.substring(1));
              const accessToken = params.get('access_token');
              if (!accessToken) {
                throw new Error("No access token found in redirect URL.");
              }

              const credential = GoogleAuthProvider.credential(null, accessToken);
              const userCredential = await linkWithCredential(auth.currentUser, credential);

              // Update Firestore user document
              await updateDoc(doc(db, 'users', userCredential.user.uid), {
                email: userCredential.user.email
              });

              setLinkSuccess("Account successfully linked with Google!");
              setTimeout(() => setShowRegisterModal(false), 1500);
            } catch (err) {
              console.error("Linking Google failed:", err);
              if (err.code === 'auth/credential-already-in-use') {
                setLinkError("This Google account is already registered. Would you like to sign in to your existing account instead?");
              } else {
                setLinkError(`Linking Google failed: ${err.message || err}`);
              }
            } finally {
              setIsLinking(false);
            }
          }
        );
      } else {
        // Fallback to standard web popup sign-in
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const userCredential = await linkWithCredential(auth.currentUser, credential);

        // Update Firestore user document
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email
        });

        setLinkSuccess("Account successfully linked with Google!");
        setTimeout(() => setShowRegisterModal(false), 1500);
        setIsLinking(false);
      }
    } catch (err) {
      console.error("Linking Google failed:", err);
      if (err.code === 'auth/credential-already-in-use') {
        setLinkError("This Google account is already registered. Would you like to sign in to your existing account instead?");
      } else {
        let errorMsg = err.message ? err.message.replace("Firebase: ", "") : "Linking Google failed.";
        setLinkError(errorMsg);
      }
      setIsLinking(false);
    }
  };


  const handleResendVerification = async () => {
    setLinkError('');
    setLinkSuccess('');
    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      setLinkSuccess("Verification email sent! Check your inbox.");
    } catch (err) {
      console.error(err);
      setLinkError(err.message.replace("Firebase: ", ""));
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();

      // Check if running in a Chrome Extension environment
      if (window.location.protocol === 'chrome-extension:' && window.chrome && chrome.identity) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
          throw new Error("VITE_GOOGLE_CLIENT_ID is not configured in your .env file. Please add it to enable Google Sign-In in the Chrome Extension.");
        }

        const extensionId = window.location.host;
        const redirectUri = `https://${extensionId}.chromiumapp.org/`;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId)}&` +
          `response_type=token&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `scope=${encodeURIComponent("openid email profile")}`;

        chrome.identity.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          async (redirectUrl) => {
            if (chrome.runtime.lastError || !redirectUrl) {
              const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : "User cancelled or redirect failed.";
              console.error("Chrome launchWebAuthFlow failed:", err);
              setAuthError(`Google sign in failed: ${err}`);
              return;
            }

            try {
              const url = new URL(redirectUrl);
              const params = new URLSearchParams(url.hash.substring(1));
              const accessToken = params.get('access_token');
              if (!accessToken) {
                throw new Error("No access token found in redirect URL.");
              }

              const credential = GoogleAuthProvider.credential(null, accessToken);
              await signInWithCredential(auth, credential);
            } catch (err) {
              console.error("Google sign in failed:", err);
              setAuthError(`Google sign in failed: ${err.message || err}`);
            }
          }
        );
      } else {
        // Fallback to standard web popup sign-in
        await signInWithPopup(auth, provider);
      }
    } catch (err) {
      console.error("Google sign in failed:", err);
      let errorMsg = "Could not sign in with Google";
      if (err && err.code) {
        errorMsg += ` (${err.code})`;
      }
      if (err && err.message) {
        errorMsg += `: ${err.message}`;
      } else {
        errorMsg += ".";
      }
      setAuthError(errorMsg);
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
    localStorage.clear();
    if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:' && window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.clear();
    }
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
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        setCustomBg(compressed);
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
    if (isGuest) return;
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
    if (isGuest) return;
    setTasksByDate(prev => {
      const dayTasks = prev[selectedDate] || [];
      return { ...prev, [selectedDate]: dayTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) };
    });
  };

  const deleteTask = (id) => {
    if (isGuest) return;
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
    if (isGuest) return;
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

  // Group dates by year and month
  const groupedDates = availableDates.reduce((acc, date) => {
    const [year, month] = date.split('-');
    const yearMonth = `${year}-${month}`;
    
    if (!acc[year]) acc[year] = {};
    if (!acc[year][yearMonth]) acc[year][yearMonth] = [];
    acc[year][yearMonth].push(date);
    
    return acc;
  }, {});

  // Get years sorted descending
  const years = Object.keys(groupedDates).sort((a, b) => b.localeCompare(a));
  
  // Get months for selected year
  const monthsInYear = selectedYear ? Object.keys(groupedDates[selectedYear] || {}).sort((a, b) => b.localeCompare(a)) : [];
  
  // Get dates to display
  // Default: show only current month's dates
  const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"
  const datesToDisplay = selectedMonth 
    ? (groupedDates[selectedYear]?.[selectedMonth] || [])
    : selectedYear
    ? Object.values(groupedDates[selectedYear] || {}).flat()
    : (groupedDates[currentYearMonth.split('-')[0]]?.[currentYearMonth] || []);

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

  if (isBanned) {
    return (
      <div className="min-h-screen w-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-auto font-sans py-6 px-4">
        <div className="absolute inset-0 bg-red-950/20" />
        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-red-500/20 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md text-center z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-wide">
            Account Banned
          </h2>
          <p className="text-white/60 mb-6 text-sm leading-relaxed">
            Your account has been disabled/banned by the administrator. If you believe this is a mistake, please contact support.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-2xl text-sm font-semibold tracking-wide transition shadow-lg text-white cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (isDeleted) {
    return (
      <div className="min-h-screen w-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-auto font-sans py-6 px-4">
        <div className="absolute inset-0 bg-zinc-950/20" />
        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md text-center z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-wide">
            Account Deleted
          </h2>
          <p className="text-white/60 mb-6 text-sm leading-relaxed">
            This account has been deleted by the administrator.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-white/10 hover:bg-white/15 rounded-2xl text-sm font-semibold tracking-wide transition border border-white/10 text-white cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-auto font-sans py-6 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md text-center z-10">
          
          {/* STEP 0: Onboarding simplified Name / Guest */}
          {authStep === 'onboarding' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <h2 className="text-2xl sm:text-3xl font-light text-white mb-1.5 sm:mb-2 tracking-wide">
                Welcome
              </h2>
              <p className="text-white/50 mb-6 sm:mb-8 text-xs sm:text-sm">Your personal dashboard, anywhere.</p>

              <form onSubmit={handleNamedLogin} className="space-y-4">
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={25}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
                />
                
                {authError && <p className="text-red-400 text-xs text-left px-1">{authError}</p>}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-medium tracking-wide transition-colors shadow-lg text-white"
                >
                  Get Started
                </button>
              </form>

              <div className="flex items-center justify-between mt-6 mb-4">
                <div className="relative flex-grow border-t border-white/10"></div>
                <span className="mx-4 text-white/30 text-[10px] uppercase tracking-widest">or</span>
                <div className="relative flex-grow border-t border-white/10"></div>
              </div>


              <button
                type="button"
                onClick={handleGuestLogin}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-medium tracking-wide transition-colors text-white mb-6"
              >
                Continue as Guest
              </button>

              <button
                type="button"
                onClick={() => { setAuthStep('email'); setAuthError(''); }}
                className="text-blue-400 hover:text-blue-300 text-xs transition-colors"
              >
                Already have an account? Sign In
              </button>
            </div>
          )}

          {/* STEP 1: Email Only */}
          {authStep === 'email' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl sm:text-3xl font-light text-white mb-1.5 sm:mb-2 tracking-wide">
                Welcome Back
              </h2>
              <p className="text-white/50 mb-6 sm:mb-8 text-xs sm:text-sm">Log in to sync your cloud profile.</p>

              <form onSubmit={handleEmailNext} className="space-y-4 mb-4">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors text-sm" required />
                {authError && <p className="text-red-400 text-xs text-left px-1">{authError}</p>}
                <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-sm font-medium tracking-wide transition-colors shadow-lg text-white">Continue with Email</button>
              </form>

              <button onClick={handleGoogleLogin} className="w-full py-3.5 bg-white text-black hover:bg-gray-100 rounded-2xl text-sm font-semibold tracking-wide transition-colors shadow-lg flex items-center justify-center gap-2 mb-6">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => { setAuthStep('onboarding'); setAuthError(''); }}
                className="text-white/40 hover:text-white/60 text-xs transition-colors"
              >
                ← Back to start
              </button>
            </div>
          )}

          {/* STEP 2: Sign In OR Sign Up */}
          {authStep !== 'email' && authStep !== 'onboarding' && (
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

              <button
                type="button"
                onClick={() => { setAuthStep('onboarding'); setAuthError(''); }}
                className="text-white/40 hover:text-white/60 text-xs transition-colors block mx-auto mt-4"
              >
                ← Back to start
              </button>
            </form>
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
          filter: customBg ? (customBgBlur ? 'blur(3px)' : 'none') : 'blur(3px)',
          transform: customBg && !customBgBlur ? 'scale(1)' : 'scale(1.05)'
        }} 
      />
      {/* Rich layered overlay: dark vignette + subtle gradient tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-950/20 via-transparent to-purple-950/20" />

      <header className="relative z-50 w-full px-4 py-3 sm:px-5 sm:py-3 md:px-8 md:py-4 flex justify-between items-center gap-2 shrink-0">
        <div className="relative" ref={menuRef}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (isGuest) return;
                setShowLocationMenu(!showLocationMenu);
              }}
              className={`flex items-center gap-2 bg-white/10 ${isGuest ? 'opacity-75 cursor-not-allowed' : 'hover:bg-white/20 cursor-pointer'} transition-all backdrop-blur-xl border border-white/15 px-3 py-2 rounded-2xl shadow-lg text-left group`}
              title={isGuest ? "Location change disabled in Guest Mode" : "Change city"}
            >
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
            {!isGuest && (
              <button onClick={refreshWeather} disabled={isWeatherRefreshing} title="Refresh weather" className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/15 rounded-xl transition shadow-lg text-white/60 hover:text-white disabled:opacity-40">
                <RefreshCw className={`w-3.5 h-3.5 ${isWeatherRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
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
          <button
            onClick={() => {
              if (!isEmailVerified) {
                alert("Please verify/register your email in Settings to upload custom backgrounds!");
                return;
              }
              fileInputRef.current?.click();
            }}
            className={`p-2 bg-white/10 border border-white/15 rounded-xl transition shadow-lg group ${!isEmailVerified ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20 cursor-pointer'}`}
            title={!isEmailVerified ? "Custom Background (Requires Email Verification)" : "Upload Custom Background"}
          >
            {!isEmailVerified ? (
              <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            ) : (
              <ImageIcon className="w-4 h-4 text-white/70 group-hover:text-white" />
            )}
          </button>
          {customBg && isEmailVerified && (
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
                  isLocked={!isEmailVerified}
                />
              ))}
            </SortableContext>
          </DndContext>

          {links.length < MAX_LINKS && (
            <button
              onClick={() => {
                if (!isEmailVerified) {
                  alert("Please verify/register your email in Settings to customize shortcut links!");
                  return;
                }
                setShowAddLinkModal(true);
              }}
              className={`group flex flex-col items-center gap-2 transition-all duration-200 w-14 sm:w-16 md:w-20 ${!isEmailVerified ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-1.5 cursor-pointer'}`}
            >
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/8 hover:bg-white/15 border border-dashed border-white/25 hover:border-white/40 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-lg transition-all shrink-0">
                {!isEmailVerified ? (
                  <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <Plus className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                )}
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

            {isGuest ? (
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 border border-blue-500/25 px-4 py-2 sm:py-2.5 rounded-xl transition-all shadow-lg cursor-pointer text-xs font-semibold text-white group animate-in zoom-in-95 duration-200"
                title="Sign In / Register"
              >
                <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                Sign In
              </button>
            ) : (
              <div className="relative" ref={settingsRef}>
                <button onClick={() => setShowSettings(!showSettings)} className="relative flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/15 w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all shadow-lg cursor-pointer text-white/60 hover:text-white group" title="Settings">
                  <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
                  {(needRefresh || showTestPrompt) && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  )}
                </button>
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-[#0f0f0f]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/8 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-blue-400" />
                        <h3 className="text-sm font-semibold text-white">Settings</h3>
                      </div>
                    </div>

                    {/* App Update Section */}
                    {(needRefresh || showTestPrompt) && (
                      <div className="px-4 py-3 border-b border-white/8 bg-blue-500/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                            </span>
                            New Update Available
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            try {
                              localStorage.removeItem('sw_update_dismissed_at');
                            } catch (e) {
                              console.error(e);
                            }
                            updateServiceWorker(true);
                          }}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-medium text-xs py-2 rounded-xl transition duration-200 shadow-md shadow-blue-500/10 active:scale-95 cursor-pointer border-none text-center"
                        >
                          Update & Restart
                        </button>
                      </div>
                    )}

                    {/* Account Linking / Verification Banner */}
                    {user && user.isAnonymous ? (
                      <div className="px-4 py-3 border-b border-white/8 space-y-2 bg-violet-500/5">
                        <label className="block text-[9px] font-semibold text-violet-400 uppercase tracking-wider flex items-center gap-1">
                          🔒 Lock Customizations
                        </label>
                        <p className="text-[9px] text-white/50 leading-tight">
                          Register your email to enable custom background, shortcuts, and clock settings.
                        </p>
                        <button
                          onClick={() => {
                            setShowRegisterModal(true);
                            setShowSettings(false);
                            setLinkError('');
                            setLinkSuccess('');
                          }}
                          className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer border-none"
                        >
                          Register & Verify
                        </button>
                      </div>
                    ) : user && !user.emailVerified ? (
                      <div className="px-4 py-3 border-b border-white/8 space-y-2 bg-yellow-500/5">
                        <label className="block text-[9px] font-semibold text-yellow-400 uppercase tracking-wider">
                          ⚠️ Email Unverified
                        </label>
                        <p className="text-[9px] text-white/50 leading-tight">
                          Verify your email address ({user.email}) to unlock all customizations.
                        </p>
                        <button
                          onClick={() => {
                            setShowRegisterModal(true);
                            setShowSettings(false);
                            setLinkError('');
                            setLinkSuccess('');
                          }}
                          className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer border-none"
                        >
                          Verify Account
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-1.5 border-b border-white/8 bg-green-500/5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        <span className="text-[9px] text-green-300 font-medium truncate">Premium Unlocked ({user?.email})</span>
                      </div>
                    )}

                    {/* Name Section */}
                    <div className="px-4 py-3 border-b border-white/8">
                      <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">Display Name</label>
                      {editingName ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setUserName(tempName.trim() || userName);
                                setEditingName(false);
                              } else if (e.key === 'Escape') {
                                setEditingName(false);
                                setTempName(userName);
                              }
                            }}
                            autoFocus
                            placeholder="Your name"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-blue-500/50 transition"
                          />
                          <button
                            onClick={() => {
                              setUserName(tempName.trim() || userName);
                              setEditingName(false);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium text-white transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setTempName(userName);
                            setEditingName(true);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/8 border border-white/8 rounded-lg transition cursor-pointer group"
                        >
                          <span className="text-sm text-white/80 truncate">{userName || 'Set your name'}</span>
                          <Pencil className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition shrink-0" />
                        </button>
                      )}
                    </div>

                    {/* Custom Background Settings */}
                    {customBg && (
                      <div className="px-4 py-3 space-y-2 border-b border-white/8">
                        <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">Custom Background</label>
                        
                        <button
                          onClick={() => {
                            setCustomBgBlur(!customBgBlur);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between text-xs text-white/80 hover:bg-white/5 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                            Blur Background
                          </span>
                          <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${customBgBlur ? 'bg-pink-500 text-white' : 'bg-white/10 text-white/40'}`}>
                            {customBgBlur ? 'ON' : 'OFF'}
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Clock Settings */}
                    <div className="px-4 py-3 space-y-2">
                      <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2">Clock Display</label>
                      
                      <button
                        onClick={() => {
                          if (!isEmailVerified) {
                            alert("Please verify/register your email in Settings to customize clock format!");
                            return;
                          }
                          setIs24Hour(!is24Hour);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between text-xs text-white/80 group ${!isEmailVerified ? 'opacity-40 cursor-not-allowed bg-transparent' : 'hover:bg-white/5 cursor-pointer'}`}
                      >
                        <span className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          24-Hour Format {!isEmailVerified && '🔒'}
                        </span>
                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${is24Hour && isEmailVerified ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/40'}`}>
                          {is24Hour && isEmailVerified ? 'ON' : 'OFF'}
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          if (!isEmailVerified) {
                            alert("Please verify/register your email in Settings to customize clock format!");
                            return;
                          }
                          setShowSeconds(!showSeconds);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between text-xs text-white/80 group ${!isEmailVerified ? 'opacity-40 cursor-not-allowed bg-transparent' : 'hover:bg-white/5 cursor-pointer'}`}
                      >
                        <span className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          Show Seconds {!isEmailVerified && '🔒'}
                        </span>
                        <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${showSeconds && isEmailVerified ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/40'}`}>
                          {showSeconds && isEmailVerified ? 'ON' : 'OFF'}
                        </div>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            )}

            {!isGuest && (
              <button onClick={handleSignOut} className="flex items-center justify-center bg-white/10 hover:bg-red-500/60 backdrop-blur-xl border border-white/15 hover:border-red-400/40 w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all shadow-lg cursor-pointer text-white/60 hover:text-white group" title="Sign Out">
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

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

          {/* ── Year/Month/Date Navigation ── */}
          {/* ── Year/Month/Date Navigation ── */}
          <div className="space-y-2">
            {/* Current view indicator with navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!selectedMonth ? (
                  // Showing all years
                  <>
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">Select Year</span>
                  </>
                ) : selectedYear && selectedMonth === getTodayStr().substring(0, 7) ? (
                  // Default view - current month
                  <>
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">
                      {new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                  </>
                ) : selectedYear && !monthsInYear.includes(selectedMonth) ? (
                  // Showing months of selected year
                  <>
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">{selectedYear}</span>
                  </>
                ) : (
                  // Showing specific month
                  <>
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">
                      {new Date(selectedMonth + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                  </>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                {selectedMonth && selectedYear ? (
                  // In month view - show "Other Months" button
                  <button
                    onClick={() => {
                      setSelectedMonth(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg"
                  >
                    <Calendar className="w-3 h-3" />
                    Other Months
                  </button>
                ) : null}

                {selectedYear && !selectedMonth ? (
                  // In months view - show "Other Years" button
                  <button
                    onClick={() => {
                      setSelectedYear(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1 px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg"
                  >
                    <Calendar className="w-3 h-3" />
                    Other Years
                  </button>
                ) : null}

                {(!selectedYear || !selectedMonth) && (
                  // Show "Back to Current" when not in current month
                  <button
                    onClick={() => {
                      const currentYearMonth = getTodayStr().substring(0, 7);
                      const currentYear = getTodayStr().substring(0, 4);
                      setSelectedYear(currentYear);
                      setSelectedMonth(currentYearMonth);
                    }}
                    className="text-xs text-white/40 hover:text-white transition flex items-center gap-1"
                  >
                    ← Current
                  </button>
                )}
              </div>
            </div>

            {/* Year selector (when no year selected) */}
            {!selectedYear && (
              <div className="flex gap-2 overflow-x-auto pb-1 admin-scrollbar">
                {years.map(year => {
                  const yearTaskCount = Object.values(groupedDates[year] || {}).flat().reduce((sum, date) => sum + (tasksByDate[date] || []).length, 0);
                  return (
                    <button
                      key={year}
                      onClick={() => {
                        setSelectedYear(year);
                        setSelectedMonth(null);
                      }}
                      className="flex flex-col items-center shrink-0 px-4 py-2.5 rounded-2xl border bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all min-w-[80px]"
                    >
                      <Calendar className="w-4 h-4 text-white/40 mb-1" />
                      <span className="text-base font-bold text-white/80">{year}</span>
                      <span className="text-[9px] text-white/30 mt-0.5">{yearTaskCount} tasks</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Month selector (when year selected but no specific month) */}
            {selectedYear && !selectedMonth && (
              <div className="flex gap-2 overflow-x-auto pb-1 admin-scrollbar">
                {monthsInYear.map(yearMonth => {
                  const monthName = new Date(yearMonth + '-01').toLocaleDateString(undefined, { month: 'long' });
                  const monthTaskCount = (groupedDates[selectedYear]?.[yearMonth] || []).reduce((sum, date) => sum + (tasksByDate[date] || []).length, 0);
                  const isCurrentMonth = yearMonth === getTodayStr().substring(0, 7);
                  return (
                    <button
                      key={yearMonth}
                      onClick={() => setSelectedMonth(yearMonth)}
                      className={`flex flex-col items-center shrink-0 px-4 py-2.5 rounded-2xl border transition-all min-w-[90px] ${
                        isCurrentMonth
                          ? 'bg-blue-500/20 border-blue-400/40'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className={`text-sm font-bold ${isCurrentMonth ? 'text-blue-300' : 'text-white/80'}`}>{monthName}</span>
                      <span className="text-[9px] text-white/30 mt-0.5">{monthTaskCount} tasks</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Date pills (always shown) */}
            <div className="flex gap-2 overflow-x-auto pb-1 admin-scrollbar">
              {datesToDisplay.map(date => {
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
          </div>
        </header>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* ── Task List ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 admin-scrollbar space-y-2">
          {/* Add task input */}
          <form onSubmit={addTask} className="flex gap-2 mb-4">
            <input
              type="text"
              value={isGuest ? '' : newTaskText}
              disabled={isGuest}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder={isGuest ? "🔒 Tasks locked in Guest Mode" : "Add a new task..."}
              className={`flex-1 bg-white/8 focus:bg-white/15 border border-white/10 focus:border-blue-400/40 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 ${isGuest ? 'cursor-not-allowed opacity-50 bg-white/5' : 'hover:bg-white/12'}`}
            />
            <button
              type="submit"
              disabled={isGuest}
              className={`px-4 rounded-xl transition-all flex items-center justify-center ${isGuest ? 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed' : 'bg-blue-500/80 hover:bg-blue-500 active:scale-95 text-white cursor-pointer shadow-lg shadow-blue-500/20'}`}
            >
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
      {/* ── Email Verification / Linking Modal ── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowRegisterModal(false)} />

          {/* Modal Container */}
          <div className="relative z-10 w-full sm:w-[420px] animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">
            {/* Mobile handle indicator */}
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
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white leading-none">
                        {user && user.isAnonymous ? 'Link Account' : 'Verify Email'}
                      </h2>
                      <p className="text-[11px] text-white/35 mt-0.5">Secure your profile & unlock premium options</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRegisterModal(false)}
                    className="w-8 h-8 rounded-xl bg-white/6 hover:bg-white/12 flex items-center justify-center text-white/40 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Form/Content */}
              <div className="px-6 pb-6">
                {user && user.isAnonymous ? (
                  <form onSubmit={handleLinkEmail} className="space-y-4">
                    <p className="text-xs text-white/60 leading-relaxed">
                      Register your email address to save your customized settings, tasks, and shortcut links permanently.
                    </p>

                    <div>
                      <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                      <input
                        type="email"
                        value={linkEmail}
                        onChange={(e) => setLinkEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        className="w-full bg-white/5 border border-white/8 hover:border-white/15 focus:border-violet-500/70 focus:bg-violet-500/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-white/40 uppercase tracking-wider mb-1.5 ml-1">Choose Password</label>
                      <input
                        type="password"
                        value={linkPassword}
                        onChange={(e) => setLinkPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/8 hover:border-white/15 focus:border-violet-500/70 focus:bg-violet-500/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200"
                      />
                    </div>

                    {linkError && (
                      <div className="text-red-400 text-xs text-left px-1 leading-tight animate-in fade-in duration-200">
                        <p>⚠️ {linkError}</p>
                        {linkError.includes("already registered") && (
                          <button
                            type="button"
                            onClick={async () => {
                              setShowRegisterModal(false);
                              await signOut(auth);
                              setAuthStep('email');
                            }}
                            className="text-blue-400 hover:underline block text-[11px] font-semibold mt-2.5 bg-transparent border-none p-0 cursor-pointer text-left"
                          >
                            Click here to Sign In to your existing account →
                          </button>
                        )}
                      </div>
                    )}

                    {linkSuccess && (
                      <p className="text-green-400 text-xs text-left px-1 font-medium leading-tight animate-in fade-in duration-200">
                        ✨ {linkSuccess}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRegisterModal(false)}
                        className="flex-1 bg-white/6 hover:bg-white/10 text-white/60 hover:text-white py-3 rounded-xl text-sm font-medium transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLinking}
                        className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-white/8 disabled:to-white/8 disabled:text-white/25 text-white py-3 rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-violet-500/20 disabled:shadow-none"
                      >
                        {isLinking ? 'Linking...' : 'Register & Verify'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 mb-3">
                      <div className="relative flex-grow border-t border-white/10"></div>
                      <span className="mx-4 text-white/30 text-[9px] uppercase tracking-widest">or</span>
                      <div className="relative flex-grow border-t border-white/10"></div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLinkGoogle}
                      disabled={isLinking}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold tracking-wide transition-colors text-white flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                      </svg>
                      Link with Google
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-white/60 leading-relaxed">
                      We sent a verification link to <strong className="text-white/80">{user?.email}</strong>. 
                      Please check your inbox (and spam folder) and verify your account to unlock premium options.
                    </p>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl text-left">
                      <p className="text-yellow-300 text-xs font-semibold mb-1">Email Verification Required</p>
                      <p className="text-white/50 text-[10px]">
                        Custom backgrounds, add link shortcuts, clock display formats, and show seconds remain locked until verified.
                      </p>
                    </div>

                    {linkError && (
                      <p className="text-red-400 text-xs text-left px-1 leading-tight animate-in fade-in duration-200">
                        ⚠️ {linkError}
                      </p>
                    )}

                    {linkSuccess && (
                      <p className="text-green-400 text-xs text-left px-1 font-medium leading-tight animate-in fade-in duration-200">
                        ✨ {linkSuccess}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRegisterModal(false)}
                        className="flex-1 bg-white/6 hover:bg-white/10 text-white/60 hover:text-white py-3 rounded-xl text-sm font-medium transition cursor-pointer"
                      >
                        Close
                      </button>
                      <button
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="flex-1 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 disabled:from-white/8 disabled:to-white/8 disabled:text-white/25 text-white py-3 rounded-xl text-sm font-semibold transition cursor-pointer shadow-lg shadow-yellow-500/20 disabled:shadow-none"
                      >
                        {isResending ? 'Sending...' : 'Resend Email'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

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
      <UpdatePrompt
        needRefresh={needRefresh}
        updateServiceWorker={updateServiceWorker}
        showTestPrompt={showTestPrompt}
        setShowTestPrompt={setShowTestPrompt}
        isToasterSnoozed={isToasterSnoozed}
        setDismissedAt={setDismissedAt}
      />
      {/* Vercel wake up ping */}
    </div>
  );
}

function UpdatePrompt({
  needRefresh,
  updateServiceWorker,
  showTestPrompt,
  setShowTestPrompt,
  isToasterSnoozed,
  setDismissedAt
}) {
  const active = (needRefresh || showTestPrompt) && !isToasterSnoozed;

  if (!active) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-full border border-white/10 bg-[#161616]/95 backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4">
      {/* Pulse Dot */}
      <div className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
      </div>
      
      {/* Label */}
      <span className="text-[11px] font-semibold text-white tracking-wide whitespace-nowrap">
        Update available
      </span>

      {/* Divider */}
      <div className="h-4 w-px bg-white/10" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            try {
              localStorage.removeItem('sw_update_dismissed_at');
            } catch (e) {
              console.error(e);
            }
            updateServiceWorker(true);
          }}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold text-[10px] px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 cursor-pointer border-none shadow-md shadow-blue-500/10 whitespace-nowrap"
        >
          Update
        </button>
        <button
          onClick={() => {
            const now = Date.now();
            try {
              localStorage.setItem('sw_update_dismissed_at', now.toString());
            } catch (e) {
              console.error(e);
            }
            setDismissedAt(now);
          }}
          className="bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-medium text-[10px] px-2.5 py-1.5 rounded-full transition-all duration-200 active:scale-95 cursor-pointer border-none"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}