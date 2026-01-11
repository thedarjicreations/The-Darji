/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                darji: {
                    primary: '#0f172a',  // Slate 900 (Deep Navy/Black)
                    secondary: '#334155', // Slate 700
                    accent: '#4f46e5',   // Indigo 600 (Modern Primary)
                    dark: '#020617',     // Slate 950
                    light: '#f8fafc',    // Slate 50
                    muted: '#64748b',    // Slate 500
                    surface: '#ffffff',  // White
                    'surface-hover': '#f1f5f9', // Slate 100
                    'border': '#e2e8f0', // Slate 200
                },
            },
            fontFamily: {
                sans: ['Manrope', 'Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                'float': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'glow': '0 0 15px rgba(79, 70, 229, 0.15)', // Subtle Indigo glow
            },
            backgroundImage: {
                'gradient-primary': 'linear-gradient(to right, #0f172a, #1e293b)',
                'gradient-accent': 'linear-gradient(to right, #4f46e5, #4338ca)',
            }
        },
    },
    plugins: [],
}
