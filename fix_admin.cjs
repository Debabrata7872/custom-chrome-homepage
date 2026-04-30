const fs = require('fs');

let c = fs.readFileSync('src/components/AdminPanel.jsx', 'utf8');
c = c.replace(/\r\n/g, '\n');

// Fix 1: Replace imports + remove duplicate constants
c = c.replace(
`import React, { useState, useEffect } from 'react';
import { CloudSun, Image as ImageIcon, Plus, Trash2, X, ShieldCheck, Users, ArrowLeft, Edit2, Loader2, Upload, Activity, Clock } from 'lucide-react';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase'; 
import Swal from 'sweetalert2';

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
};`,
`import React, { useState, useEffect } from 'react';
import { CloudSun, Image as ImageIcon, Plus, Trash2, X, ShieldCheck, Users, ArrowLeft, Edit2, Loader2, Upload, Activity, Clock } from 'lucide-react';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import Swal from 'sweetalert2';

// --- Shared Constants & Utils ---
import { MOTIVATIONAL_QUOTES, DYNAMIC_BACKGROUNDS } from '../constants';
import { getTodayStr } from '../utils';`
);

// Fix 2: Remove inline getTodayStr
c = c.replace(
`  // --- ANALYTICS STATE & MATH ---
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return \`\${year}-\${month}-\${day}\`; // Always guarantees pure YYYY-MM-DD local time
  };
  const [selectedDate, setSelectedDate] = useState(getTodayStr());`,
`  // --- ANALYTICS STATE & MATH ---
  const [selectedDate, setSelectedDate] = useState(getTodayStr());`
);

fs.writeFileSync('src/components/AdminPanel.jsx', c, 'utf8');
console.log('All fixes applied to AdminPanel.jsx');
