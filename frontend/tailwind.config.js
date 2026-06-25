/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            board: '#e6b85c', 
            boardLine: '#4a3b22', 
            primary: '#2c3e50', 
            bottomBar: '#f0f0f0',
            blueBtn: '#3b82f6',
            redBtn: '#ef4444'
        }
    },
  },
  plugins: [],
}
