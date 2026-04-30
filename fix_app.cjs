const fs = require('fs');

let c = fs.readFileSync('src/App.jsx', 'utf8');
// Normalize to LF for easier processing
c = c.replace(/\r\n/g, '\n');

// Fix 1: Replace imports block + remove duplicate constants
c = c.replace(
`import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, CloudSun, MapPin, Image as ImageIcon, X, Loader2, CheckCircle, LogOut, Mail, Edit2, ShieldCheck, Settings } from 'lucide-react';

// --- Firebase Imports ---
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

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
  "It's not whether you get knocked down, it's whether you get up.",
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
];`,
`import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, CloudSun, MapPin, Image as ImageIcon, X, Loader2, CheckCircle, LogOut, Edit2, ShieldCheck, Settings } from 'lucide-react';

// --- Firebase Imports ---
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

// --- Drag and Drop ---
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

// --- Custom Components ---
import AdminPanel from './components/AdminPanel';
import SortableLink from './components/SortableLink';

// --- Shared Constants & Utils ---
import { MOTIVATIONAL_QUOTES, DYNAMIC_BACKGROUNDS, DEFAULT_LINKS, MAX_LINKS, ADMIN_EMAIL } from './constants';
import { getTodayStr } from './utils';`
);

// Fix 2: Remove dead isLoginMode state
c = c.replace(
`  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');`,
`  const [email, setEmail] = useState('');`
);

// Fix 3: Remove inline getTodayStr
c = c.replace(
`  // Helper to get local date string as YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return \`\${year}-\${month}-\${day}\`; // Always guarantees pure YYYY-MM-DD local time
  };
  
  const [tasksByDate, setTasksByDate] = useState({});`,
`  const [tasksByDate, setTasksByDate] = useState({});`
);

// Fix 4: Remove hardcoded ADMIN_EMAIL
c = c.replace(
`  const ADMIN_EMAIL = "debabratasahoo499905@gmail.com"; 
  const isAdmin = user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();`,
`  const isAdmin = user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();`
);

// Fix 5: Remove anti-inspect commented block
c = c.replace(
`  // --- Anti-Inspect Security Shield ---
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

  // --- ANALYTICS: Time Spent Tracker ---`,
`  // --- ANALYTICS: Time Spent Tracker ---`
);

// Fix 6: Fix onAuthStateChanged dependency array
c = c.replace(
`    return () => unsubscribe();
  }, [email]);`,
`    return () => unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps`
);

// Fix 7: Debounce Firestore sync
c = c.replace(
`  useEffect(() => {
    if (user && isDataLoaded) {
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
    }
  }, [links, tasksByDate, currentLocation, customBg, userName, user, isDataLoaded, is24Hour, showSeconds]);`,
`  // Debounced Firestore sync — waits 1.5s after last change before writing
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
  }, [links, tasksByDate, currentLocation, customBg, userName, user, isDataLoaded, is24Hour, showSeconds]);`
);

// Fix 8: Fix quote effect - run once on mount
c = c.replace(
`  useEffect(() => {
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
  }, [currentTime]);`,
`  // Runs once on mount — quote only needs to be fetched once per session
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps`
);

// Fix 9: Remove duplicate passwordError render
c = c.replace(
`              {passwordError && <p className="text-red-400 text-xs text-left px-1">{passwordError}</p>}
              {passwordError && <p className="text-red-400 text-xs text-left px-1">{passwordError}</p>}`,
`              {passwordError && <p className="text-red-400 text-xs text-left px-1">{passwordError}</p>}`
);

// Fix 10: Replace hardcoded 8 with MAX_LINKS in handleAddLink
c = c.replace(
`    if (links.length >= 8) return; `,
`    if (links.length >= MAX_LINKS) return;`
);

// Fix 11: Replace hardcoded 8 in + button condition
c = c.replace(
`            {links.length < 8 && (`,
`            {links.length < MAX_LINKS && (`
);

// Fix 12: Remove debug console.log in handleSelectCity
c = c.replace(
`    console.log("Selected city:", city);
    const timezone = city.timezone || "UTC";`,
`    const timezone = city.timezone || "UTC";`
);

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('All fixes applied to App.jsx');
