import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "neo-mint": "#A3D9A5",
        "neo-yellow": "#F7D65E",
        "neo-pink": "#EEA2E6",
        "neo-cream": "#EFE6DD",
      },
      boxShadow: {
        "neo": "4px 4px 0px 0px rgba(0,0,0,1)",
        "neo-hover": "2px 2px 0px 0px rgba(0,0,0,1)",
      },
      borderWidth: {
        "3": "3px",
      }
    },
  },
  plugins: [],
} satisfies Config;
