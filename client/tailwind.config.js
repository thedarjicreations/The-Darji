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
                    primary: '#2C3E50',
                    secondary: '#E74C3C',
                    accent: '#3498DB',
                    dark: '#1A252F',
                    light: '#ECF0F1'
                }
            }
        },
    },
    plugins: [],
}
