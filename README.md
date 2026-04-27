# 🚀 Modern Dashboard

A beautiful, fully responsive dashboard with dynamic backgrounds, task management, and real-time weather. Perfect for your browser's new tab page.

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/react-18.3.1-61dafb.svg)
![Firebase](https://img.shields.io/badge/firebase-10.x-orange.svg)

## ✨ Features

- 🎨 **Dynamic Backgrounds** - Time-based backgrounds with smart fallback system
- 📱 **Fully Responsive** - Works perfectly on all devices (320px to 4K)
- 🛡️ **Admin Panel** - Manage users, backgrounds, and quotes
- ⏰ **Real-time Clock** - With timezone support
- 🌤️ **Live Weather** - Powered by OpenWeather API
- 📝 **Task Management** - Daily tasks with drag-and-drop
- 💬 **Daily Quotes** - Motivational quotes that rotate daily
- 🔗 **Quick Links** - Customizable link grid with brand icons
- 🎯 **Analytics** - Track user activity and engagement

## 🖼️ Screenshots

### Dashboard
Beautiful, clean interface with dynamic backgrounds and real-time information.

### Admin Panel
Powerful admin tools for managing content and users.

## 🚀 Quick Start

### Prerequisites

- Node.js 16 or higher
- Firebase account
- OpenWeather API key (optional)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd custom-chrome-homepage-new
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**

Create `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_OPENWEATHER_API_KEY=your_openweather_key
```

4. **Set admin email**

Edit `src/constants.js`:
```javascript
export const ADMIN_EMAIL = "your-email@example.com";
```

5. **Run development server**
```bash
npm run dev
```

6. **Build for production**
```bash
npm run build
```

## 📱 Responsive Design

Fully optimized for all devices:

| Device | Width | Layout |
|--------|-------|--------|
| 📱 Mobile | 320-639px | Single column, touch-optimized |
| 📱 Tablet | 640-1023px | 2-3 columns, balanced |
| 💻 Desktop | 1024-1535px | 3-5 columns, full features |
| 🖥️ Large | 1536px+ | 4-6 columns, maximum spacing |
| 🖥️ 4K | 2560px+ | 6-8 columns, optimal layout |

## 🎨 Key Features

### Dynamic Backgrounds
- Time-based backgrounds (morning, afternoon, evening, night)
- Smart fallback system for broken images
- Default image selection per time period
- Subtle blur effect to hide watermarks

### Admin Panel
- **Users**: View, manage, and analyze user activity
- **Analytics**: 14-day charts, leaderboards, time tracking
- **Backgrounds**: Manage image collections with fallback system
- **Quotes**: Add, edit, and organize daily quotes

### Task Management
- Daily task organization
- Drag-and-drop reordering
- Mark complete/incomplete
- Date-based views

### Weather Integration
- Real-time weather data
- City search functionality
- Temperature and conditions
- Weather icons

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore)
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Alerts**: SweetAlert2
- **Build Tool**: Vite

## 📚 Documentation

For detailed documentation, see [DOCUMENTATION.md](./DOCUMENTATION.md)

Topics covered:
- Complete feature guide
- Admin panel usage
- Responsive design details
- Customization options
- Troubleshooting
- Best practices

## 🎯 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS 14+, Android 10+)

## 🔒 Security

- Firebase Authentication
- Firestore security rules
- Environment variables for sensitive data
- Admin-only access control
- HTTPS only

## ⚡ Performance

- Load time: < 3s
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- GPU-accelerated animations

## ♿ Accessibility

- WCAG 2.1 Level AA compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode
- Reduced motion support
- Focus indicators

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Unsplash](https://unsplash.com) - Beautiful free images
- [OpenWeather](https://openweathermap.org) - Weather API
- [Lucide](https://lucide.dev) - Beautiful icons
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ using React and Firebase**

⭐ Star this repo if you find it helpful!
