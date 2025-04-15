
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				// Islamic theme colors
				islamic: {
					green: {
						DEFAULT: '#0A5F38',
						light: '#2E8B57',
						dark: '#1D4D4F',
					},
					gold: {
						DEFAULT: '#D4AF37',
						light: '#F4C430',
						dark: '#996515',
					},
					black: {
						DEFAULT: '#000000',
						light: '#333333',
					},
					cream: '#F5F5DC',
					pattern: '#F8F4E3',
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				'pulse-subtle': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.8' },
				},
				'soft-glow': {
					'0%, 100%': { 
						filter: 'drop-shadow(0 0 5px rgba(212, 175, 55, 0.3))'
					},
					'50%': { 
						filter: 'drop-shadow(0 0 15px rgba(212, 175, 55, 0.6))'
					}
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-5px)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.5s ease-in-out',
				'pulse-subtle': 'pulse-subtle 3s infinite',
				'soft-glow': 'soft-glow 3s infinite ease-in-out',
				'float': 'float 3s infinite ease-in-out'
			},
			fontFamily: {
				arabic: ['Amiri', 'serif'],
				lateef: ['Lateef', 'serif'],
				cairo: ['Cairo', 'sans-serif'],
				playfair: ['Playfair Display', 'serif']
			},
			backgroundImage: {
				'islamic-pattern': "url('/islamic-pattern.svg')",
				'islamic-gradient': 'linear-gradient(to right, #0A5F38, #1D4D4F)',
				'dawn-gradient': 'linear-gradient(to right, #1D4D4F, #F5F5DC)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
