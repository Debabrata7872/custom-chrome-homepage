/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',    // Extra small devices
        '3xl': '1920px',  // Extra large desktops
        '4xl': '2560px',  // 4K displays
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      fontSize: {
        'xxs': '0.625rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
    },
    screens: {
      'sm': '640px',   // Tablets/Large Mobile
      'md': '768px',   // Large Tablets
      'lg': '1024px',  // Desktops/Laptops
      'xl': '1280px',  // Large Desktops
      '2xl': '1536px', // Extra Large Desktops
    }
  },
  plugins: [],
}