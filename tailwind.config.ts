/* Tailwind config for the frontend react app. This is where the app theme should be defined: https://v2.tailwindcss.com/docs/configuration. */
import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import typographyPlugin from '@tailwindcss/typography'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter var', 'SF Pro Display', 'system-ui', 'sans-serif'],
        // Identidade Clínica Soul: serifada elegante de alto contraste para
        // títulos/marca, ecoando o wordmark "SOUL" do logo.
        display: ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Sobrescreve as escalas verdes/teal do template pela paleta Soul
        // (dourado → bronze → cobre → marrom). Qualquer uso remanescente de
        // emerald/teal/lime nas telas vira cor de marca automaticamente.
        // VERDE CLÍNICO REAL (biomarcadores "normal", adesão) usa a escala
        // `green-` padrão do Tailwind, que NÃO é sobrescrita aqui.
        emerald: {
          50: '#FBF3E4',
          100: '#F3E3C3',
          200: '#E8D3A8',
          300: '#DFC28A',
          400: '#D2AF6E',
          500: '#C9A05C',
          600: '#B98A44',
          700: '#9E7238',
          800: '#7C5830',
          900: '#5A3E2E',
          950: '#2E2015',
        },
        teal: {
          50: '#FBF0EA',
          100: '#F4E0D4',
          200: '#EAC9B8',
          300: '#DFAE97',
          400: '#CD8E6C',
          500: '#B06A52',
          600: '#A05A43',
          700: '#8A4B36',
          800: '#6B4A38',
          900: '#4A3226',
          950: '#2A1B12',
        },
        lime: {
          50: '#FCF6E8',
          100: '#F5E8C8',
          200: '#EBD9A5',
          300: '#E2CB87',
          400: '#D9BC68',
          500: '#D0AD4E',
          600: '#B9953C',
          700: '#9A7A30',
          800: '#775D26',
          900: '#55411C',
          950: '#2B210E',
        },
        // Paleta Clínica Soul (derivada do logo): dourados, marrons e cobre.
        // Usar em toques discretos; semanticas de saude (verde/vermelho) ficam intactas.
        soul: {
          gold: {
            light: '#E8D3A8',
            DEFAULT: '#C9A05C',
            deep: '#B98A44',
          },
          brown: {
            light: '#6B4A38',
            DEFAULT: '#5A3E2E',
            deep: '#4A3226',
          },
          copper: {
            light: '#C98A73',
            DEFAULT: '#B06A52',
          },
          cream: '#FAF4EA',
          sand: '#F3E9D9',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        elevation: '0 4px 20px rgba(0, 0, 0, 0.05)',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.42, 0, 0.58, 1)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config
