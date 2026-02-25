import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-plus-jakarta-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gray: {
          50:  "hsl(var(--gray-50))",
          100: "hsl(var(--gray-100))",
          200: "hsl(var(--gray-200))",
          400: "hsl(var(--gray-400))",
          600: "hsl(var(--gray-600))",
          800: "hsl(var(--gray-800))",
          900: "hsl(var(--gray-900))",
        },
        blue: {
          50:  "hsl(var(--blue-50))",
          100: "hsl(var(--blue-100))",
          300: "hsl(var(--blue-300))",
          500: "hsl(var(--blue-500))",
          700: "hsl(var(--blue-700))",
          900: "hsl(var(--blue-900))",
        },
      },
      borderRadius: {
        sm: "calc(var(--radius) - 4px)",
        md: "var(--radius)",
        lg: "calc(var(--radius) + 4px)",
        button: "var(--button-radius)",
      },
      fontSize: {
        sm:    ["var(--font-size-sm)",   { lineHeight: "var(--leading-normal)" }],
        base:  ["var(--font-size-base)", { lineHeight: "var(--leading-normal)" }],
        lg:    ["var(--font-size-lg)",   { lineHeight: "var(--leading-normal)" }],
        "2xl": ["var(--font-size-2xl)",  { lineHeight: "var(--leading-tight)" }],
        "4xl": ["var(--font-size-4xl)",  { lineHeight: "var(--leading-tight)" }],
      },
      fontWeight: {
        normal:   "var(--font-weight-normal)",
        medium:   "var(--font-weight-medium)",
        semibold: "var(--font-weight-semibold)",
        bold:     "var(--font-weight-bold)",
        extrabold: "var(--font-weight-extrabold)",
      },
      lineHeight: {
        tight:   "var(--leading-tight)",
        normal:  "var(--leading-normal)",
        relaxed: "var(--leading-relaxed)",
      },
      letterSpacing: {
        tight:  "var(--tracking-tight)",
        normal: "var(--tracking-normal)",
        wide:   "var(--tracking-wide)",
      },
      spacing: {
        2:  "var(--space-2)",
        4:  "var(--space-4)",
        8:  "var(--space-8)",
        16: "var(--space-16)",
      },
      height: {
        button: "var(--button-height)",
      },
      padding: {
        button: "var(--button-padding)",
      },
      animation: {
        'scan-line': 'scan-line 2s linear infinite',
        'scale-in': 'scale-in 0.3s ease-out',
        'matching-pulse': 'matching-pulse 2s ease-in-out infinite',
        'match-celebrate': 'match-celebrate 0.4s ease-out',
        'slide-up-fade': 'slide-up-fade 0.4s ease-out',
        'slide-up-fade-slow': 'slide-up-fade 0.7s ease-out',
        'breathing': 'breathing 2s ease-in-out infinite',
      },
      keyframes: {
        'scan-line': {
          '0%': { top: '0%' },
          '100%': { top: '100%' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'matching-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'match-celebrate': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up-fade': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'breathing': {
          '0%, 100%': { boxShadow: '0 0 0 0 hsl(var(--primary) / 0.4)' },
          '50%': { boxShadow: '0 0 0 8px hsl(var(--primary) / 0)' },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
