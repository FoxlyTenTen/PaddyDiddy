/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        padi: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        leaf: {
          400: "#a3e635",
          500: "#84cc16",
          600: "#65a30d",
        },
        status: {
          healthy: "#10b981",
          moderate: "#f59e0b",
          attention: "#f43f5e",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
        lift: "0 2px 4px rgba(15,23,42,0.04), 0 14px 32px -16px rgba(15,23,42,0.14)",
      },
      backgroundImage: {
        "field-gradient":
          "radial-gradient(1200px 400px at 10% -10%, rgba(132,204,22,0.12), transparent 60%), radial-gradient(900px 400px at 110% 0%, rgba(22,163,74,0.10), transparent 55%)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
