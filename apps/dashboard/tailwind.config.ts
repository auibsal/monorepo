import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        zinc: {
          950: '#09090b',
          900: '#18181b',
        },
        amber: {
          500: '#f59e0b',
        }
      }
    },
  },
  plugins: [],
};
export default config;
