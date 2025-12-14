/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "terminal-green": "#0f0",
        "terminal-black": "#0c0c0c",
        "terminal-dim": "#003300",
      },
      fontFamily: {
        mono: ['"Courier New"', "Courier", "monospace"],
      },
    },
  },
  plugins: [],
};
