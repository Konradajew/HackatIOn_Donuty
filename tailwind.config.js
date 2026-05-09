/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "neon-bg": "#13121c",
        "neon-surface": "#1f1f28",
        "neon-surface-high": "#292933",
        "neon-pink": "#FF1F8F",
        "neon-pink-dim": "#ffb0c9",
        "neon-cyan": "#19F0DC",
        "neon-lime": "#C8FF1A",
        "neon-gold": "#FFD700",
        "neon-text": "#e4e1ee",
        "neon-outline": "#aa8891",
        "neon-outline-dim": "#5b3f47",
        "neon-error": "#ff4444",
      },
      fontFamily: {
        space: ["SpaceGrotesk_700Bold"],
        "space-md": ["SpaceGrotesk_600SemiBold"],
        "space-reg": ["SpaceGrotesk_400Regular"],
        mono: ["JetBrainsMono_500Medium"],
        "mono-reg": ["JetBrainsMono_400Regular"],
      },
    },
  },
  plugins: [],
};
