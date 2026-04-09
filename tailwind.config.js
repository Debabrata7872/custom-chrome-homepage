/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
    screens: {
      'sm': '600px',   // Tablets/Large Mobile and up
      'md': '768px',   // Large Tablets/Small Laptops and up
      'lg': '992px',   // Desktops/Laptops and up
      'xl': '1200px',  // Large Desktop/4K and up
    }
  },
  plugins: [],
}