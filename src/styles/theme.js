// Theme color palette for MemoDeck React Native App
// Based on the web version's MUI theme

export const darkTheme = {
	mode: "dark",

	primary: {
		main: "#3b82f6",
		light: "#60a5fa",
		dark: "#1e40af",
		contrastText: "#ffffff",
	},

	secondary: {
		main: "#8b5cf6",
		light: "#a78bfa",
		dark: "#6d28d9",
		contrastText: "#ffffff",
	},

	success: {
		main: "#22c55e",
		light: "#4ade80",
		dark: "#16a34a",
		contrastText: "#ffffff",
	},

	warning: {
		main: "#f59e0b",
		light: "#fbbf24",
		dark: "#d97706",
		contrastText: "#000000",
	},

	error: {
		main: "#ef4444",
		light: "#f87171",
		dark: "#dc2626",
		contrastText: "#ffffff",
	},

	background: {
		default: "#0a0e14",
		paper: "#111827",
		elevated: "#1a1f2e",
		card: "#151b28",
		gradient: ["#0a0e14", "#1a1f2e"],
	},

	text: {
		primary: "#f1f5f9",
		secondary: "#94a3b8",
		cardTitle: "#f1f5f9",
		cardSubtitle: "#94a3b8",
		disabled: "#475569",
	},

	border: {
		main: "rgba(255, 255, 255, 0.08)",
		subtle: "rgba(255, 255, 255, 0.04)",
		focus: "rgba(59, 130, 246, 0.5)",
	},

	divider: "rgba(255, 255, 255, 0.08)",

	action: {
		active: "#60a5fa",
		hover: "rgba(59, 130, 246, 0.08)",
		selected: "rgba(59, 130, 246, 0.16)",
		icon: "#94a3b8",
		edit: "#60a5fa",
		delete: "#ef4444",
	},
};

export const lightTheme = {
	mode: "light",

	primary: {
		main: "#2563eb",
		light: "#3b82f6",
		dark: "#1e40af",
		contrastText: "#ffffff",
	},

	secondary: {
		main: "#7c3aed",
		light: "#8b5cf6",
		dark: "#6d28d9",
		contrastText: "#ffffff",
	},

	success: {
		main: "#16a34a",
		light: "#22c55e",
		dark: "#15803d",
		contrastText: "#ffffff",
	},

	warning: {
		main: "#d97706",
		light: "#f59e0b",
		dark: "#b45309",
		contrastText: "#000000",
	},

	error: {
		main: "#dc2626",
		light: "#ef4444",
		dark: "#b91c1c",
		contrastText: "#ffffff",
	},

	background: {
		default: "#f8fafc",
		paper: "#ffffff",
		elevated: "#ffffff",
		card: "#ffffff",
		gradient: ["#f8fafc", "#e2e8f0"],
	},

	text: {
		primary: "#0f172a",
		secondary: "#64748b",
		cardTitle: "#1e293b",
		cardSubtitle: "#64748b",
		disabled: "#94a3b8",
	},

	border: {
		main: "rgba(0, 0, 0, 0.08)",
		subtle: "rgba(0, 0, 0, 0.04)",
		focus: "rgba(37, 99, 235, 0.5)",
	},

	divider: "rgba(0, 0, 0, 0.08)",

	action: {
		active: "#2563eb",
		hover: "rgba(37, 99, 235, 0.08)",
		selected: "rgba(37, 99, 235, 0.16)",
		icon: "#64748b",
		edit: "#2563eb",
		delete: "#dc2626",
	},
};

// Chart colors for statistics
export const chartColors = {
	dark: {
		primary: "#3b82f6",
		secondary: "#8b5cf6",
		success: "#22c55e",
		warning: "#f59e0b",
		error: "#ef4444",
		grid: "rgba(255, 255, 255, 0.1)",
		label: "#94a3b8",
	},
	light: {
		primary: "#2563eb",
		secondary: "#7c3aed",
		success: "#16a34a",
		warning: "#d97706",
		error: "#dc2626",
		grid: "rgba(0, 0, 0, 0.1)",
		label: "#64748b",
	},
};

// Animation durations (in ms for React Native)
export const animations = {
	duration: {
		instant: 100,
		fast: 200,
		normal: 300,
		slow: 500,
		slower: 800,
	},
	easing: {
		easeOut: "ease-out",
		easeIn: "ease-in",
		easeInOut: "ease-in-out",
	},
};

// Common spacing values
export const spacing = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48,
};

// Border radius values
export const borderRadius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	full: 9999,
};

// Shadow styles
export const shadows = {
	dark: {
		small: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.3,
			shadowRadius: 4,
			elevation: 3,
		},
		medium: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.35,
			shadowRadius: 8,
			elevation: 6,
		},
		large: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.4,
			shadowRadius: 16,
			elevation: 12,
		},
	},
	light: {
		small: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.05,
			shadowRadius: 4,
			elevation: 2,
		},
		medium: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.08,
			shadowRadius: 8,
			elevation: 4,
		},
		large: {
			shadowColor: "#000",
			shadowOffset: { width: 0, height: 8 },
			shadowOpacity: 0.12,
			shadowRadius: 16,
			elevation: 8,
		},
	},
};

// Typography
export const typography = {
	fontFamily: {
		regular: "System",
		medium: "System",
		bold: "System",
	},
	fontSize: {
		xs: 12,
		sm: 14,
		md: 16,
		lg: 18,
		xl: 20,
		xxl: 24,
		xxxl: 32,
	},
	fontWeight: {
		regular: "400",
		medium: "500",
		semibold: "600",
		bold: "700",
	},
};
