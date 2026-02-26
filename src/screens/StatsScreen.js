import React, {
	useState,
	useEffect,
	useCallback,
	useMemo,
	useRef,
} from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	Dimensions,
	TouchableOpacity,
	Modal,
	FlatList,
	Platform,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
// DateTimePicker removed (custom date selector disabled)
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { usePlan } from "../context/PlanContext";
import { statsAPI, accountAPI } from "../services/api";
import {
	ThemedView,
	ThemedText,
	Card,
	LoadingState,
	Button,
	AlertDialog,
	LoadingOverlay,
} from "../components/ui";
import { useNavigation } from "@react-navigation/native";
import { spacing, borderRadius } from "../styles/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - spacing.lg * 2;

// Load logo as base64 for PDF
const getLogoBase64 = async () => {
	try {
		const asset = Asset.fromModule(require("../../assets/memodeck.png"));
		await asset.downloadAsync();
		const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
			encoding: "base64",
		});
		return `data:image/png;base64,${base64}`;
	} catch (error) {
		console.error("Error loading logo:", error);
		return null;
	}
};

// ---------------------------------------------------------------------------
// Mock data shown to free-plan users so they can preview the stats page
// ---------------------------------------------------------------------------
const _mockCounts = [
	8, 15, 0, 22, 18, 30, 12, 25, 0, 20, 35, 10, 28, 15, 22, 8, 18, 32, 14, 25, 0,
	20, 28, 16, 22, 10, 30, 18, 25, 14,
];
const MOCK_FILTERED_STATS = {
	cardsStudied: 247,
	correct: 189,
	incorrect: 58,
	studyTimeSeconds: 7320,
	sessions: 18,
};
const MOCK_CHART_DATA = {
	grouping: "daily",
	data: _mockCounts.map((n, i) => {
		const d = new Date(2026, 0, 20 + i);
		const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
		return {
			date,
			cardsStudied: n,
			correct: Math.floor(n * 0.8),
			incorrect: Math.ceil(n * 0.2),
			studyTimeSeconds: n * 40,
		};
	}),
};
const MOCK_CARDS_TABLE = [
	{
		id: 1,
		front: "apple",
		back: "elma",
		deck_title: "English",
		times_played: 28,
		correct: 24,
		wrong: 4,
		accuracy: 86,
	},
	{
		id: 2,
		front: "book",
		back: "kitap",
		deck_title: "English",
		times_played: 22,
		correct: 18,
		wrong: 4,
		accuracy: 82,
	},
	{
		id: 3,
		front: "water",
		back: "su",
		deck_title: "English",
		times_played: 19,
		correct: 14,
		wrong: 5,
		accuracy: 74,
	},
	{
		id: 4,
		front: "house",
		back: "ev",
		deck_title: "English",
		times_played: 17,
		correct: 10,
		wrong: 7,
		accuracy: 59,
	},
	{
		id: 5,
		front: "cat",
		back: "kedi",
		deck_title: "English",
		times_played: 15,
		correct: 8,
		wrong: 7,
		accuracy: 53,
	},
	{
		id: 6,
		front: "dog",
		back: "köpek",
		deck_title: "English",
		times_played: 12,
		correct: 5,
		wrong: 7,
		accuracy: 42,
	},
];
// ---------------------------------------------------------------------------

// Stat Card Component with entrance animation
const StatCard = ({ icon, iconColor, title, value, theme, delay = 0 }) => {
	const scaleAnim = useRef(new Animated.Value(0.8)).current;
	const opacityAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.spring(scaleAnim, {
				toValue: 1,
				delay,
				useNativeDriver: true,
				speed: 14,
				bounciness: 4,
			}),
			Animated.timing(opacityAnim, {
				toValue: 1,
				duration: 300,
				delay,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	return (
		<Animated.View
			style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}
		>
			<Card style={styles.statCard}>
				<View
					style={[
						styles.statIconContainer,
						{ backgroundColor: iconColor + "20" },
					]}
				>
					{icon}
				</View>
				<View style={styles.statContent}>
					<ThemedText
						color="secondary"
						style={styles.statTitle}
						numberOfLines={1}
					>
						{title}
					</ThemedText>
					<ThemedText variant="h3" style={styles.statValue} numberOfLines={1}>
						{value}
					</ThemedText>
				</View>
			</Card>
		</Animated.View>
	);
};

// Section Header Component
const SectionHeader = ({ icon, title, theme }) => (
	<View style={styles.sectionHeader}>
		<MaterialCommunityIcons name={icon} size={22} color={theme.primary.main} />
		<ThemedText variant="h3" style={styles.sectionTitle}>
			{title}
		</ThemedText>
	</View>
);

// Card Performance Row Component
const CardPerformanceRow = ({ card, theme, t }) => {
	const accuracy = card.accuracy || 0;
	const indicatorColor =
		accuracy >= 70 ? "#22c55e" : accuracy >= 40 ? "#f59e0b" : "#ef4444";

	return (
		<View
			style={[
				styles.cardRow,
				{ backgroundColor: theme.background.elevated || theme.background.card },
			]}
		>
			{/* Left accent bar */}
			<View
				style={[styles.cardRowAccent, { backgroundColor: indicatorColor }]}
			/>

			<View style={styles.cardRowBody}>
				{/* Top: front text + deck */}
				<View style={styles.cardRowTop}>
					<View style={styles.cardTextBlock}>
						<ThemedText numberOfLines={1} style={styles.cardFront}>
							{card.front?.substring(0, 35)}
							{card.front?.length > 35 ? "…" : ""}
						</ThemedText>
						{!!card.back && (
							<ThemedText
								color="secondary"
								numberOfLines={1}
								style={styles.cardBack}
							>
								{card.back?.substring(0, 40)}
								{card.back?.length > 40 ? "…" : ""}
							</ThemedText>
						)}
					</View>
					{card.deck_title && (
					<View
							style={[
								styles.deckBadge,
								{ backgroundColor: theme.primary.main + "20" },
							]}
						>
							<ThemedText
								style={[styles.deckBadgeText, { color: theme.primary.main }]}
								numberOfLines={1}
							>
								{card.deck_title}
							</ThemedText>
						</View>
					)}
				</View>

				{/* Middle: stats chips row */}
				<View style={styles.cardStatsRow}>
					{/* Played */}
					<View
						style={[
							styles.statChip,
							styles.statChipColored,
							{ backgroundColor: "#3b82f622" },
						]}
					>
						<ThemedText style={[styles.statChipLabel, { color: "#3b82f6" }]}>
							{t("times_played") || "Played"}
						</ThemedText>
						<Text style={[styles.statChipValue, { color: "#3b82f6" }]}>
							{card.times_played || 0}
						</Text>
					</View>

					{/* Correct */}
					<View
						style={[
							styles.statChip,
							styles.statChipColored,
							{ backgroundColor: "#22c55e22" },
						]}
					>
						<ThemedText style={[styles.statChipLabel, { color: "#22c55e" }]}>
							✓
						</ThemedText>
						<Text style={[styles.statChipValue, { color: "#22c55e" }]}>
							{card.correct || 0}
						</Text>
					</View>

					{/* Wrong */}
					<View
						style={[
							styles.statChip,
							styles.statChipColored,
							{ backgroundColor: "#ef444422" },
						]}
					>
						<ThemedText style={[styles.statChipLabel, { color: "#ef4444" }]}>
							✗
						</ThemedText>
						<Text style={[styles.statChipValue, { color: "#ef4444" }]}>
							{card.wrong || 0}
						</Text>
					</View>

					{/* Accuracy % */}
					<Text style={[styles.accuracyBadge, { color: indicatorColor }]}>
						{accuracy}%
					</Text>
				</View>

				{/* Bottom: accuracy progress bar */}
				<View
					style={[
						styles.progressTrack,
						{ backgroundColor: theme.border.main + "30" },
					]}
				>
					<View
						style={[
							styles.progressFill,
							{
								width: `${accuracy}%`,
								backgroundColor: indicatorColor,
							},
						]}
					/>
				</View>
			</View>
		</View>
	);
};

// Thin x-axis labels so they don't overlap on narrow screens
const thinLabels = (labels) => {
	const len = labels.length;
	if (len <= 7) return labels;
	const step = Math.ceil(len / 6); // show ~6 evenly-spaced labels
	return labels.map((l, i) => (i % step === 0 || i === len - 1 ? l : ""));
};

const StatsScreen = () => {
	const { theme, chartColors, isDark } = useTheme();
	const { t, language } = useI18n();
	const navigation = useNavigation();

	// Tooltip state for charts
	const [tooltip, setTooltip] = useState(null);

	// Alert modal state (replaces system Alert.alert)
	const [alertModal, setAlertModal] = useState({
		visible: false,
		title: "",
		message: "",
		variant: "primary",
	});
	const showAlert = (title, message, variant = "primary") =>
		setAlertModal({ visible: true, title, message, variant });

	// Plan context for access control
	const { advancedStats, isLoading: planLoading } = usePlan();

	// Whether user has no advanced stats access
	const isLocked = !planLoading && !advancedStats;

	// Loading states
	const [loading, setLoading] = useState(true);

	// Entrance animations
	const headerAnim = useRef(new Animated.Value(0)).current;
	const filtersAnim = useRef(new Animated.Value(0)).current;
	const contentAnim = useRef(new Animated.Value(0)).current;

	// Filter states
	const [selectedDeck, setSelectedDeck] = useState("all");
	const [dateRange, setDateRange] = useState({ start: null, end: null });
	const [activePreset, setActivePreset] = useState("30d");
	const [showDeckModal, setShowDeckModal] = useState(false);
	// custom date pickers removed

	// Data states
	const [decksData, setDecksData] = useState([]);
	const [filteredStats, setFilteredStats] = useState(null);
	const [chartData, setChartData] = useState({ data: [], grouping: "daily" });
	const [cardsTable, setCardsTable] = useState([]);
	const [sortBy, setSortBy] = useState("times_played");
	const [sortOrder, setSortOrder] = useState("desc");

	// Date presets (added 1y, removed custom selector)
	const presets = [
		// { key: "today", label: t("today") || "Today", days: 0 },
		{ key: "7d", label: t("7_days") || "7D", days: 7 },
		{ key: "30d", label: t("30_days") || "30D", days: 30 },
		{ key: "90d", label: t("90_days") || "90D", days: 90 },
		{ key: "180d", label: t("180_days") || "180D", days: 180 },
		{ key: "1y", label: t("1_year") || "1Y", days: 365 },
	];

	// Calculate date range from preset
	const getDateRangeFromPreset = useCallback(
		(preset) => {
			const today = new Date();
			today.setHours(23, 59, 59, 999);

			if (preset === "all") {
				// 'all' preset removed from UI; keep backward compatibility
				return { start: null, end: null };
			}

			const presetConfig = presets.find((p) => p.key === preset);
			if (!presetConfig || presetConfig.days === -1) return dateRange;

			if (presetConfig.days === 0) {
				const startOfDay = new Date();
				startOfDay.setHours(0, 0, 0, 0);
				return { start: startOfDay, end: today };
			}

			const startDate = new Date();
			startDate.setDate(startDate.getDate() - presetConfig.days);
			startDate.setHours(0, 0, 0, 0);
			return { start: startDate, end: today };
		},
		[dateRange],
	);

	// Handle preset click
	const handlePresetClick = useCallback(
		(preset) => {
			setActivePreset(preset);
			const range = getDateRangeFromPreset(preset);
			setDateRange(range);
		},
		[getDateRangeFromPreset],
	);

	// Format date for API
	const formatDateForAPI = (date) => {
		if (!date) return null;
		// toISOString() returns UTC – use local components to avoid off-by-one day
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, "0");
		const d = String(date.getDate()).padStart(2, "0");
		return `${y}-${m}-${d}`;
	};

	// Format date for display (locale-aware)
	const locale = language === "tr" ? "tr-TR" : "en-US";

	// Helper: convert an ISO UTC timestamp/string to a Date at local midnight
	const convertUTCStringToLocalMidnight = (dateInput) => {
		if (!dateInput && dateInput !== 0) return null;
		if (typeof dateInput === "number") return new Date(dateInput);
		// Plain YYYY-MM-DD -> treat as local midnight
		if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
			return new Date(dateInput + "T00:00:00");
		}
		// For ISO strings (with time or Z), parse and take the UTC Y/M/D, then create local midnight
		const parsed = new Date(dateInput);
		if (isNaN(parsed.getTime())) return null;
		return new Date(
			parsed.getUTCFullYear(),
			parsed.getUTCMonth(),
			parsed.getUTCDate(),
		);
	};

	// Use a memoized formatter similar to the web app's dayjs-based logic.
	const formatDateLabel = useCallback(
		(dateStr, grouping) => {
			if (!dateStr) return "-";

			// Monthly keys sometimes come as "YYYY-MM" or full ISO — normalize
			if (grouping === "monthly") {
				const monthKey = /^\d{4}-\d{2}$/.test(dateStr)
					? dateStr + "-01"
					: dateStr;
				if (/T|Z/.test(monthKey)) {
					const d = convertUTCStringToLocalMidnight(monthKey);
					return d
						? d.toLocaleDateString(locale, { month: "short", year: "numeric" })
						: "-";
				}
				// Plain YYYY-MM-01 treat as local
				const d = new Date(monthKey + "T00:00:00");
				return d.toLocaleDateString(locale, {
					month: "short",
					year: "numeric",
				});
			}

			// If caller passed a numeric timestamp (ms), treat it as local-midnight ms
			if (typeof dateStr === "number") {
				const d = new Date(dateStr);
				return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
			}

			// Plain YYYY-MM-DD: parse as local; ISO timestamp: convert UTC→local-midnight
			if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
				const d = new Date(dateStr + "T00:00:00");
				return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
			}
			// Full ISO timestamp (with T/Z)
			const d = convertUTCStringToLocalMidnight(dateStr);
			return d
				? d.toLocaleDateString(locale, { month: "short", day: "numeric" })
				: "-";
		},
		[language],
	);

	// Format full date for tooltip display
	const formatFullDate = useCallback(
		(dateStr) => {
			if (!dateStr && dateStr !== 0) return "";
			let d;
			if (typeof dateStr === "number") {
				d = new Date(dateStr);
			} else if (/T|Z/.test(dateStr)) {
				d = convertUTCStringToLocalMidnight(dateStr);
			} else {
				d = new Date(dateStr + "T00:00:00");
			}
			if (!d) return "";
			return d.toLocaleDateString(locale, {
				day: "numeric",
				month: "long",
				year: "numeric",
			});
		},
		[language],
	);

	// Format duration
	const formatDuration = (seconds) => {
		if (!seconds) return "0m";
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	};

	// Fetch decks on focus (reflects adds/removes/renames from other screens)
	useFocusEffect(
		useCallback(() => {
			if (isLocked) return;
			const fetchDecks = async () => {
				try {
					const res = await statsAPI.getAllDecks();
					setDecksData(res.data?.decks || []);
				} catch (error) {
					console.error("Error fetching decks:", error);
				}
			};
			fetchDecks();
		}, [isLocked]),
	);

	// Initialize with 30d preset
	useEffect(() => {
		handlePresetClick("30d");
	}, []);

	// Fetch filtered data on focus
	useFocusEffect(
		useCallback(() => {
			fetchData();
		}, []),
	);

	// Refetch when filters change
	useEffect(() => {
		fetchData();
	}, [selectedDeck, dateRange, sortBy, sortOrder]);

	const animationsTriggered = useRef(false);

	const triggerEntranceAnimations = () => {
		// Guard: only run once per screen mount to avoid re-animating on refetch
		if (animationsTriggered.current) return;
		animationsTriggered.current = true;

		Animated.timing(headerAnim, {
			toValue: 1,
			duration: 350,
			useNativeDriver: true,
		}).start();

		Animated.spring(filtersAnim, {
			toValue: 1,
			delay: 80,
			useNativeDriver: true,
			speed: 16,
			bounciness: 3,
		}).start();

		Animated.spring(contentAnim, {
			toValue: 1,
			delay: 140,
			useNativeDriver: true,
			speed: 14,
			bounciness: 4,
		}).start();
	};

	// Trigger layout animations immediately on mount so stat cards are visible
	// before the first network response arrives.
	useEffect(() => {
		triggerEntranceAnimations();
	}, []);

	const fetchData = async () => {
		if (isLocked) {
			setLoading(false);
			triggerEntranceAnimations();
			return; // skip backend calls for free users
		}

		const startStr = formatDateForAPI(dateRange.start);
		const endStr = formatDateForAPI(dateRange.end);

		setLoading(true);
		try {
			// ── Priority fetch: stat numbers (fast) ────────────────────────────
			// Fetch filtered stats first so StatCard values populate immediately.
			const statsRes = await statsAPI.getFilteredStats(
				selectedDeck,
				startStr,
				endStr,
			);
			setFilteredStats(statsRes.data);
			// Hide spinner as soon as the numbers are ready — chart/table will
			// fill in progressively in the background.
			setLoading(false);
			triggerEntranceAnimations();

			// ── Secondary fetch: chart + cards table (heavier) ─────────────────
			const [chartRes, cardsRes] = await Promise.all([
				statsAPI.getChartData(selectedDeck, startStr, endStr),
				statsAPI.getCardsTable(selectedDeck, sortBy, sortOrder),
			]);
			setChartData(chartRes.data || { data: [], grouping: "daily" });
			setCardsTable(cardsRes.data?.cards || []);
		} catch (error) {
			console.error("Error fetching stats:", error);
			setLoading(false);
		}
	};

	// Pull-to-refresh removed — use filters or download instead

	// Handle sort change
	const handleSort = (column) => {
		if (sortBy === column) {
			setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(column);
			setSortOrder("desc");
		}
	};

	// Generate and save PDF report to device
	const handleDownloadPDF = async () => {
		if (!effectiveStats) return;

		// Load logo
		const logoBase64 = await getLogoBase64();

		const total =
			(effectiveStats.correct || 0) + (effectiveStats.incorrect || 0);
		const accuracyPercent =
			total > 0 ? Math.round((effectiveStats.correct / total) * 100) : 0;
		const hours = Math.floor((effectiveStats.studyTimeSeconds || 0) / 3600);
		const minutes = Math.floor(
			((effectiveStats.studyTimeSeconds || 0) % 3600) / 60,
		);
		const studyTimeFormatted =
			hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

		const formatDate = (date) => {
			if (!date) return "";
			const d = new Date(date);
			return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
		};

		const formatDateForFilename = (date) => {
			const d = new Date(date);
			return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
		};

		const dateRangeText =
			dateRange.start && dateRange.end
				? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
				: t("all_time") || "All Time";

		const selectedDeckNamePDF =
			selectedDeck === "all"
				? t("all_decks") || "All Decks"
				: decksData.find((d) => d.id === selectedDeck)?.title || selectedDeck;

		const reportDate = formatDate(new Date());
		const fileName = `stats-report-${formatDateForFilename(new Date())}`;

		// Generate chart data for PDF (use filled data for contiguous x-axis)
		const chartDataForPDF = filledChartData.data || [];
		const displayChartData = chartDataForPDF;

		// Thin x-axis labels (same logic as app's thinLabels helper)
		const thinPdfLabels = (data) => {
			const len = data.length;
			if (len <= 7) return data;
			const step = Math.ceil(len / 6);
			return data.map((d, i) => ({
				...d,
				label: i % step === 0 || i === len - 1 ? d.label : "",
			}));
		};

		// Generate SVG chart
		const generateLineChart = (data, color, title, yLabel) => {
			if (!data || data.length === 0) return "";

			const width = 560;
			const height = 120;
			const padding = { top: 25, right: 15, bottom: 30, left: 35 };
			const chartWidth = width - padding.left - padding.right;
			const chartHeight = height - padding.top - padding.bottom;

			const maxVal = Math.max(...data.map((d) => d.value), 1);
			const points = data
				.map((d, i) => {
					const x =
						padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
					const y =
						padding.top + chartHeight - (d.value / maxVal) * chartHeight;
					return `${x},${y}`;
				})
				.join(" ");

			const areaPoints = `${padding.left},${padding.top + chartHeight} ${points} ${padding.left + chartWidth},${padding.top + chartHeight}`;

			return `
          <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="grad-${color.replace("#", "")}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:${color};stop-opacity:0.05" />
              </linearGradient>
            </defs>
            <!-- Grid lines -->
            ${[0, 0.25, 0.5, 0.75, 1]
							.map(
								(p) => `
              <line x1="${padding.left}" y1="${padding.top + chartHeight * (1 - p)}" x2="${width - padding.right}" y2="${padding.top + chartHeight * (1 - p)}" stroke="#334155" stroke-width="0.5" />
              <text x="${padding.left - 5}" y="${padding.top + chartHeight * (1 - p) + 3}" fill="#64748b" font-size="7" text-anchor="end">${Math.round(maxVal * p)}</text>
            `,
							)
							.join("")}
            <!-- Area fill -->
            <polygon points="${areaPoints}" fill="url(#grad-${color.replace("#", "")})" />
            <!-- Line -->
            <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Points -->
            ${data
							.map((d, i) => {
								const x =
									padding.left +
									(i / Math.max(data.length - 1, 1)) * chartWidth;
								const y =
									padding.top + chartHeight - (d.value / maxVal) * chartHeight;
								return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" />`;
							})
							.join("")}
            <!-- X-axis labels -->
            ${data
							.map((d, i) => {
								const x =
									padding.left +
									(i / Math.max(data.length - 1, 1)) * chartWidth;
								return `<text x="${x}" y="${height - 5}" fill="#64748b" font-size="6" text-anchor="middle">${d.label}</text>`;
							})
							.join("")}
          </svg>
      `;
		};

		const generateBarChart = (data, color, title) => {
			if (!data || data.length === 0) return "";

			const width = 560;
			const height = 120;
			const padding = { top: 25, right: 15, bottom: 30, left: 35 };
			const chartWidth = width - padding.left - padding.right;
			const chartHeight = height - padding.top - padding.bottom;

			const maxVal = Math.max(...data.map((d) => d.value), 1);
			const barWidth = (chartWidth / data.length) * 0.7;
			const gap = (chartWidth / data.length) * 0.3;

			return `
          <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
            <!-- Grid lines -->
            ${[0, 0.25, 0.5, 0.75, 1]
							.map(
								(p) => `
              <line x1="${padding.left}" y1="${padding.top + chartHeight * (1 - p)}" x2="${width - padding.right}" y2="${padding.top + chartHeight * (1 - p)}" stroke="#334155" stroke-width="0.5" />
              <text x="${padding.left - 5}" y="${padding.top + chartHeight * (1 - p) + 3}" fill="#64748b" font-size="7" text-anchor="end">${Math.round(maxVal * p)}m</text>
            `,
							)
							.join("")}
            <!-- Bars -->
            ${data
							.map((d, i) => {
								const x =
									padding.left + i * (chartWidth / data.length) + gap / 2;
								const barHeight = (d.value / maxVal) * chartHeight;
								const y = padding.top + chartHeight - barHeight;
								return `
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4" />
                <text x="${x + barWidth / 2}" y="${height - 5}" fill="#64748b" font-size="6" text-anchor="middle">${d.label}</text>
              `;
							})
							.join("")}
          </svg>
      `;
		};

		// Prepare chart data (apply same thinLabels logic as the app)
		const activityData = thinPdfLabels(
			displayChartData.map((d) => ({
				label: formatDateLabel(d.date, filledChartData.grouping),
				value: parseInt(d.cardsStudied) || 0,
			})),
		);

		const accuracyData = thinPdfLabels(
			displayChartData.map((d) => ({
				label: formatDateLabel(d.date, filledChartData.grouping),
				correct: parseInt(d.correct) || 0,
				incorrect: parseInt(d.incorrect) || 0,
			})),
		);

		const studyTimeData = thinPdfLabels(
			displayChartData.map((d) => ({
				label: formatDateLabel(d.date, filledChartData.grouping),
				value: Math.round((parseInt(d.studyTimeSeconds) || 0) / 60),
			})),
		);

		// Generate accuracy trend with two lines
		const generateAccuracyChart = (data, title) => {
			if (!data || data.length === 0) return "";

			const width = 560;
			const height = 120;
			const padding = { top: 25, right: 15, bottom: 30, left: 35 };
			const chartWidth = width - padding.left - padding.right;
			const chartHeight = height - padding.top - padding.bottom;

			const maxVal = Math.max(
				...data.map((d) => Math.max(d.correct, d.incorrect)),
				1,
			);

			const correctPoints = data
				.map((d, i) => {
					const x =
						padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
					const y =
						padding.top + chartHeight - (d.correct / maxVal) * chartHeight;
					return `${x},${y}`;
				})
				.join(" ");

			const incorrectPoints = data
				.map((d, i) => {
					const x =
						padding.left + (i / Math.max(data.length - 1, 1)) * chartWidth;
					const y =
						padding.top + chartHeight - (d.incorrect / maxVal) * chartHeight;
					return `${x},${y}`;
				})
				.join(" ");

			return `
          <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
            <!-- Grid lines -->
            ${[0, 0.25, 0.5, 0.75, 1]
							.map(
								(p) => `
              <line x1="${padding.left}" y1="${padding.top + chartHeight * (1 - p)}" x2="${width - padding.right}" y2="${padding.top + chartHeight * (1 - p)}" stroke="#334155" stroke-width="0.5" />
              <text x="${padding.left - 5}" y="${padding.top + chartHeight * (1 - p) + 3}" fill="#64748b" font-size="7" text-anchor="end">${Math.round(maxVal * p)}</text>
            `,
							)
							.join("")}
            <!-- Correct line -->
            <polyline points="${correctPoints}" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Incorrect line -->
            <polyline points="${incorrectPoints}" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Points -->
            ${data
							.map((d, i) => {
								const x =
									padding.left +
									(i / Math.max(data.length - 1, 1)) * chartWidth;
								const yC =
									padding.top +
									chartHeight -
									(d.correct / maxVal) * chartHeight;
								const yI =
									padding.top +
									chartHeight -
									(d.incorrect / maxVal) * chartHeight;
								return `
                <circle cx="${x}" cy="${yC}" r="3" fill="#22c55e" />
                <circle cx="${x}" cy="${yI}" r="3" fill="#ef4444" />
              `;
							})
							.join("")}
            <!-- X-axis labels -->
            ${data
							.map((d, i) => {
								const x =
									padding.left +
									(i / Math.max(data.length - 1, 1)) * chartWidth;
								return `<text x="${x}" y="${height - 5}" fill="#64748b" font-size="6" text-anchor="middle">${d.label}</text>`;
							})
							.join("")}
          </svg>
      `;
		};

		const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 0; background: #0f172a; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: #0f172a !important;
      color: #e2e8f0;
      font-family: 'Helvetica', 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      width: 100%;
    }
    body { padding: 18px; }
    .container { max-width: 100%; }

    /* ── Header ── */
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { font-size: 20px; color: #818cf8; margin-bottom: 4px; font-weight: 700; }
    .header .subtitle { color: #94a3b8; font-size: 9px; margin-bottom: 6px; }
    .header .meta { color: #64748b; font-size: 8px; }
    .logo { width: 44px; height: 44px; margin: 0 auto 8px auto; display: block; }

    /* ── Stats grid ── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 14px;
    }
    .stat-card {
      background: #1e293b;
      border-radius: 10px;
      padding: 10px 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stat-icon {
      width: 32px; height: 32px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      font-size: 15px;
    }
    .stat-text { flex: 1; }
    .stat-value { font-size: 16px; font-weight: 700; line-height: 1.1; }
    .stat-label { color: #94a3b8; font-size: 7px; text-transform: uppercase; letter-spacing: 0.4px; margin-top: 2px; }
    .c-blue   { color: #3b82f6; } .bg-blue   { background: rgba(59,130,246,.15); }
    .c-green  { color: #22c55e; } .bg-green  { background: rgba(34,197,94,.15); }
    .c-red    { color: #ef4444; } .bg-red    { background: rgba(239,68,68,.15); }
    .c-purple { color: #8b5cf6; } .bg-purple { background: rgba(139,92,246,.15); }
    .c-cyan   { color: #06b6d4; } .bg-cyan   { background: rgba(6,182,212,.15); }
    .c-amber  { color: #f59e0b; } .bg-amber  { background: rgba(245,158,11,.15); }

    /* ── Section header ── */
    .section-header {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 10px;
    }
    .section-icon {
      width: 6px; height: 20px;
      border-radius: 3px;
    }
    .section-title { font-size: 12px; font-weight: 700; color: #e2e8f0; }

    /* ── Chart containers ── */
    .charts-section { margin: 0 0 14px 0; }
    .chart-card {
      background: #1e293b;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .chart-legend {
      display: flex; gap: 14px;
      margin-bottom: 8px;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; color: #94a3b8; font-size: 8px; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

    /* ── Card performance rows ── */
    .cards-section {
      background: #1e293b;
      border-radius: 10px;
      padding: 12px;
      margin-top: 14px;
    }
    .cards-list { display: flex; flex-direction: column; gap: 7px; margin-top: 8px; }
    .card-row {
      display: flex;
      border-radius: 8px;
      overflow: hidden;
      background: #0f172a;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-accent { width: 4px; flex-shrink: 0; }
    .card-body { flex: 1; padding: 8px 10px; display: flex; flex-direction: column; gap: 5px; }
    .card-top { display: flex; align-items: center; gap: 6px; }
    .card-front { font-size: 11px; font-weight: 600; color: #e2e8f0; }
    .card-back  { font-size: 9px; color: #94a3b8; margin-top: 1px; }
    .card-text-block { flex: 1; display: flex; flex-direction: column; }
    .deck-badge {
      padding: 1px 7px;
      border-radius: 20px;
      font-size: 8px;
      font-weight: 600;
      background: rgba(99,102,241,.2);
      color: #818cf8;
      white-space: nowrap;
    }
    .stats-chips { display: flex; align-items: center; gap: 5px; }
    .chip {
      display: flex; flex-direction: column; align-items: center;
      padding: 3px 7px;
      border-radius: 6px;
      background: rgba(255,255,255,.05);
    }
    .chip-row { flex-direction: row; gap: 3px; align-items: center; }
    .chip-label { font-size: 7px; color: #94a3b8; margin-bottom: 1px; }
    .chip-value { font-size: 11px; font-weight: 700; color: #e2e8f0; }
    .chip-green { background: rgba(34,197,94,.13); }
    .chip-red   { background: rgba(239,68,68,.13); }
    .chip-blue  { background: rgba(59,130,246,.13); }
    .accuracy-pct { margin-left: auto; font-size: 12px; font-weight: 700; }
    .progress-track {
      height: 5px; border-radius: 3px;
      background: rgba(255,255,255,.08);
      overflow: hidden;
    }
    .progress-fill { height: 100%; border-radius: 3px; }

    /* ── Footer ── */
    .footer {
      text-align: center;
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #1e293b;
      color: #475569;
      font-size: 8px;
    }
  </style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="MemoDeck" />` : ""}
      <h1>${t("statistics_report") || "Statistics Report"}</h1>
      <p class="subtitle">${t("stats_subtitle") || "Track your learning progress"}</p>
      <p class="meta">${dateRangeText} &nbsp;•&nbsp; ${selectedDeckNamePDF} &nbsp;•&nbsp; ${reportDate}</p>
    </div>

    <!-- Stats grid (3 columns) -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon bg-blue"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="#3b82f6" d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 16l-5 2.73L7 16v-3.73L12 15l5-2.73V16z"/></svg></div>
        <div class="stat-text">
          <div class="stat-value c-blue">${effectiveStats.cardsStudied || 0}</div>
          <div class="stat-label">${t("cards_studied") || "Cards Studied"}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-green"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="#22c55e" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>
        <div class="stat-text">
          <div class="stat-value c-green">${effectiveStats.correct || 0}</div>
          <div class="stat-label">${t("correct_answers") || "Correct"}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-red"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="#ef4444" d="M11 15h2v2h-2zm0-8h2v6h-2zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg></div>
        <div class="stat-text">
          <div class="stat-value c-red">${effectiveStats.incorrect || 0}</div>
          <div class="stat-label">${t("wrong_answers") || "Incorrect"}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-purple"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="#8b5cf6" d="M18 2h-2V1h-2v1H10V1H8v1H6C4.9 2 4 2.9 4 4v2c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V16h-2c-1.1 0-2 .9-2 2v1h8v-1c0-1.1-.9-2-2-2h-2v-2.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 10.63 21 8.55 21 6V4c0-1.1-.9-2-2-2zM6 6V4h2v3.87C6.84 7.47 6 6.79 6 6zm13 0c0 .79-.84 1.47-2 1.87V4h2v2z"/></svg></div>
        <div class="stat-text">
          <div class="stat-value c-purple">${accuracyPercent}%</div>
          <div class="stat-label">${t("accuracy") || "Accuracy"}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-cyan"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="#06b6d4" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg></div>
        <div class="stat-text">
          <div class="stat-value c-cyan">${studyTimeFormatted}</div>
          <div class="stat-label">${t("study_time") || "Study Time"}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon bg-amber"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="#f59e0b" d="M19 3h-1V1h-2v2H8V1H6v2H5C3.89 3 3 3.9 3 5v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg></div>
        <div class="stat-text">
          <div class="stat-value c-amber">${effectiveStats.sessions || 0}</div>
          <div class="stat-label">${t("sessions") || "Sessions"}</div>
        </div>
      </div>
    </div>

    <!-- Charts -->
    ${
			displayChartData.length > 0
				? `
    <div class="charts-section">
      <div class="chart-card">
        <div class="section-header">
          <div class="section-icon" style="background:#3b82f6;"></div>
          <span class="section-title">${t("study_activity") || "Study Activity"}</span>
        </div>
        ${generateLineChart(activityData, "#3b82f6", "", t("cards_studied") || "Cards")}
      </div>
      <div class="chart-card">
        <div class="section-header">
          <div class="section-icon" style="background:#22c55e;"></div>
          <span class="section-title">${t("accuracy_trend") || "Accuracy Trend"}</span>
        </div>
        <div class="chart-legend">
          <div class="legend-item"><span class="legend-dot" style="background:#22c55e;"></span>${t("correct") || "Correct"}</div>
          <div class="legend-item"><span class="legend-dot" style="background:#ef4444;"></span>${t("incorrect") || "Incorrect"}</div>
        </div>
        ${generateAccuracyChart(accuracyData, "")}
      </div>
      <div class="chart-card">
        <div class="section-header">
          <div class="section-icon" style="background:#8b5cf6;"></div>
          <span class="section-title">${t("study_time_chart") || "Study Time"} (${t("minutes_short") || "min"})</span>
        </div>
        ${generateLineChart(studyTimeData, "#8b5cf6", "", t("minutes_short") || "min")}
      </div>
    </div>
    `
				: ""
		}

    <!-- Card Performance -->
    ${
			effectiveCardsTable.length > 0
				? `
    <div class="cards-section">
      <div class="section-header">
        <div class="section-icon" style="background:#818cf8;"></div>
        <span class="section-title">${t("card_performance") || "Card Performance"}</span>
      </div>
      <div class="cards-list">
        ${effectiveCardsTable
					.map((card) => {
						const acc = card.accuracy || 0;
						const accentColor =
							acc >= 70 ? "#22c55e" : acc >= 40 ? "#f59e0b" : "#ef4444";
						const frontText =
							(card.front || "").substring(0, 40) +
							(card.front?.length > 40 ? "…" : "");
						return `
        <div class="card-row">
          <div class="card-accent" style="background:${accentColor};"></div>
          <div class="card-body">
            <div class="card-top">
              <div class="card-text-block">
                <span class="card-front">${frontText}</span>
                ${card.back ? `<span class="card-back">${(card.back || "").substring(0, 45)}${(card.back?.length || 0) > 45 ? "…" : ""}</span>` : ""}
              </div>
              ${card.deck_title ? `<span class="deck-badge">${card.deck_title}</span>` : ""}
            </div>
            <div class="stats-chips">
              <div class="chip chip-blue chip-row">
                <span style="color:#3b82f6;font-size:9px;font-weight:600;">${t("times_played") || "Played"}</span>
                <span class="chip-value" style="color:#3b82f6;">${card.times_played || 0}</span>
              </div>
              <div class="chip chip-green chip-row">
                <span style="color:#22c55e;font-size:10px;font-weight:700;">✓</span>
                <span class="chip-value" style="color:#22c55e;">${card.correct || 0}</span>
              </div>
              <div class="chip chip-red chip-row">
                <span style="color:#ef4444;font-size:10px;font-weight:700;">✗</span>
                <span class="chip-value" style="color:#ef4444;">${card.wrong || 0}</span>
              </div>
              <span class="accuracy-pct" style="color:${accentColor};">${acc}%</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width:${acc}%;background:${accentColor};"></div>
            </div>
          </div>
        </div>
        `;
					})
					.join("")}
      </div>
    </div>
    `
				: ""
		}

    <div class="footer">
      <p>Generated by MemoDeck App &nbsp;•&nbsp; ${reportDate}</p>
    </div>
  </div>
</body>
</html>
    `;

		try {
			const { uri } = await Print.printToFileAsync({ html: htmlContent });
			const pdfFileName = `${fileName}.pdf`;

			if (Platform.OS === "android") {
				// Android: save directly to user-chosen directory (Downloads)
				const { StorageAccessFramework } = FileSystem;
				const permissions =
					await StorageAccessFramework.requestDirectoryPermissionsAsync();

				if (permissions.granted) {
					const base64 = await FileSystem.readAsStringAsync(uri, {
						encoding: FileSystem.EncodingType.Base64,
					});
					const newUri = await StorageAccessFramework.createFileAsync(
						permissions.directoryUri,
						pdfFileName,
						"application/pdf",
					);
					await FileSystem.writeAsStringAsync(newUri, base64, {
						encoding: FileSystem.EncodingType.Base64,
					});
					showAlert(
						t("success") || "Success",
						(t("pdf_downloaded") || "PDF downloaded as") + ` ${pdfFileName}`,
						"success",
					);
				}
				// User cancelled directory picker → do nothing
			} else {
				// iOS: copy with correct filename then share (standard iOS save flow)
				const dest = FileSystem.documentDirectory + pdfFileName;
				try {
					await FileSystem.copyAsync({ from: uri, to: dest });
				} catch (_) {
					// fallback to original uri
				}
				const shareUri = (await FileSystem.getInfoAsync(dest)).exists
					? dest
					: uri;

				if (await Sharing.isAvailableAsync()) {
					await Sharing.shareAsync(shareUri, {
						mimeType: "application/pdf",
						filename: pdfFileName,
						UTI: "com.adobe.pdf",
					});
				} else {
					showAlert(
						t("success") || "Success",
						(t("pdf_downloaded") || "PDF downloaded as") + ` ${pdfFileName}`,
						"success",
					);
				}
			}
		} catch (error) {
			console.error("Error generating PDF:", error);
			showAlert(
				t("error") || "Error",
				t("pdf_error") || "Failed to generate PDF",
				"danger",
			);
		}
	};

	// Use mock data for locked users so they can preview what they'd get
	const effectiveStats = isLocked ? MOCK_FILTERED_STATS : filteredStats;
	const effectiveChartData = isLocked ? MOCK_CHART_DATA : chartData;
	const effectiveCardsTable = isLocked ? MOCK_CARDS_TABLE : cardsTable;

	// ---------------------------------------------------------------------------
	// Fill ALL dates in the selected range so x-axis has no gaps (matches web)
	// ---------------------------------------------------------------------------
	const filledChartData = useMemo(() => {
		// Mock data is already a contiguous series; use as-is
		if (isLocked) return effectiveChartData;

		const rawData = effectiveChartData.data || [];
		if (!dateRange.start || !dateRange.end || rawData.length === 0) {
			return {
				data: rawData,
				grouping: effectiveChartData.grouping || "daily",
			};
		}

		const start = new Date(dateRange.start);
		const end = new Date(dateRange.end);
		start.setHours(0, 0, 0, 0);
		end.setHours(0, 0, 0, 0);

		const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
		const isDaily = diffDays <= 31;

		// Helpers that normalize any incoming date string/timestamp to a local-midnight
		// timestamp (ms since epoch). Using numeric timestamps avoids JS parsing
		// inconsistencies across engines and guarantees labels reflect local day.
		const localMidnightMs = (input) => {
			if (!input) return null;
			let d;
			if (typeof input === "number") {
				d = new Date(input);
			} else if (/T|Z/.test(String(input))) {
				// ISO timestamp with timezone — parse then use local date parts
				d = new Date(String(input));
			} else if (/^\d{4}-\d{2}-\d{2}$/.test(String(input))) {
				// Plain YYYY-MM-DD — treat as local date
				const parts = String(input).split("-");
				d = new Date(
					parseInt(parts[0], 10),
					parseInt(parts[1], 10) - 1,
					parseInt(parts[2], 10),
				);
			} else {
				// Fallback
				d = new Date(String(input));
			}
			// Return the ms for local midnight of that date
			return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		};

		const toMonthKey = (d) => {
			const dt = new Date(d);
			const y = dt.getFullYear();
			const m = String(dt.getMonth() + 1).padStart(2, "0");
			return `${y}-${m}`;
		};

		const emptyEntry = (date) => ({
			date,
			cardsStudied: 0,
			correct: 0,
			incorrect: 0,
			studyTimeSeconds: 0,
		});

		if (isDaily) {
			const dataMap = new Map();
			rawData.forEach((d) => {
				const keyMs = d.date ? localMidnightMs(d.date) : undefined;
				const key = keyMs != null ? String(keyMs) : undefined;
				if (dataMap.has(key)) {
					const ex = dataMap.get(key);
					dataMap.set(key, {
						date: keyMs,
						cardsStudied:
							(parseInt(ex.cardsStudied) || 0) +
							(parseInt(d.cardsStudied) || 0),
						correct: (parseInt(ex.correct) || 0) + (parseInt(d.correct) || 0),
						incorrect:
							(parseInt(ex.incorrect) || 0) + (parseInt(d.incorrect) || 0),
						studyTimeSeconds:
							(parseInt(ex.studyTimeSeconds) || 0) +
							(parseInt(d.studyTimeSeconds) || 0),
					});
				} else {
					dataMap.set(key, { ...d, date: keyMs });
				}
			});

			const filled = [];
			const current = new Date(start);
			while (current <= end) {
				const ms = new Date(
					current.getFullYear(),
					current.getMonth(),
					current.getDate(),
				).getTime();
				const entry = dataMap.get(String(ms)) || emptyEntry(ms);
				filled.push(entry);
				current.setDate(current.getDate() + 1);
			}
			return { data: filled, grouping: "daily" };
		}

		// Monthly grouping (>31 days)
		const dataMap = new Map();
		rawData.forEach((d) => {
			const monthKey = d.date ? toMonthKey(d.date) : undefined;
			if (dataMap.has(monthKey)) {
				const ex = dataMap.get(monthKey);
				dataMap.set(monthKey, {
					date: monthKey + "-01",
					cardsStudied:
						(parseInt(ex.cardsStudied) || 0) + (parseInt(d.cardsStudied) || 0),
					correct: (parseInt(ex.correct) || 0) + (parseInt(d.correct) || 0),
					incorrect:
						(parseInt(ex.incorrect) || 0) + (parseInt(d.incorrect) || 0),
					studyTimeSeconds:
						(parseInt(ex.studyTimeSeconds) || 0) +
						(parseInt(d.studyTimeSeconds) || 0),
				});
			} else {
				dataMap.set(monthKey, { ...d, date: monthKey + "-01" });
			}
		});

		const filled = [];
		const current = new Date(start.getFullYear(), start.getMonth(), 1);
		const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
		while (current <= endMonth) {
			const mk = toMonthKey(current);
			filled.push(
				dataMap.get(mk) ||
					emptyEntry(
						`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`,
					),
			);
			current.setMonth(current.getMonth() + 1);
		}
		return { data: filled, grouping: "monthly" };
	}, [effectiveChartData, dateRange, isLocked]);

	// Calculate accuracy
	const accuracy = useMemo(() => {
		if (!effectiveStats) return 0;
		const total =
			(effectiveStats.correct || 0) + (effectiveStats.incorrect || 0);
		if (total === 0) return 0;
		return Math.round((effectiveStats.correct / total) * 100);
	}, [effectiveStats]);

	// Chart config
	const chartConfig = {
		backgroundColor: "transparent",
		backgroundGradientFrom: theme.background.card,
		backgroundGradientTo: theme.background.card,
		decimalCount: 0,
		color: (opacity = 1) => chartColors?.primary || theme.primary.main,
		labelColor: (opacity = 1) => theme.text.secondary,
		style: { borderRadius: borderRadius.md },
		propsForDots: {
			r: "4",
			strokeWidth: "2",
			stroke: chartColors?.primary || theme.primary.main,
		},
		propsForBackgroundLines: {
			strokeDasharray: "",
			stroke: theme.border.main + "40",
		},
		paddingRight: 35,
	};

	// Prepare activity chart data
	const activityChartData = useMemo(() => {
		const data = filledChartData.data || [];
		if (data.length === 0) return null;

		const allLabels = data.map((d) =>
			formatDateLabel(d.date, filledChartData.grouping),
		);
		const labels = thinLabels(allLabels);
		const values = data.map((d) => parseInt(d.cardsStudied) || 0);

		return {
			labels,
			datasets: [{ data: values.length > 0 ? values : [0] }],
		};
	}, [filledChartData]);

	// Prepare accuracy trend chart data
	const accuracyChartData = useMemo(() => {
		const data = filledChartData.data || [];
		if (data.length === 0) return null;

		const allLabels = data.map((d) =>
			formatDateLabel(d.date, filledChartData.grouping),
		);
		const labels = thinLabels(allLabels);
		const correctValues = data.map((d) => parseInt(d.correct) || 0);
		const incorrectValues = data.map((d) => parseInt(d.incorrect) || 0);

		return {
			labels,
			datasets: [
				{
					data: correctValues.length > 0 ? correctValues : [0],
					color: () => "#22c55e",
				},
				{
					data: incorrectValues.length > 0 ? incorrectValues : [0],
					color: () => "#ef4444",
				},
			],
			legend: [t("correct") || "Correct", t("incorrect") || "Incorrect"],
		};
	}, [filledChartData, t]);

	// Prepare study time chart data
	const studyTimeChartData = useMemo(() => {
		const data = filledChartData.data || [];
		if (data.length === 0) return null;

		const allLabels = data.map((d) =>
			formatDateLabel(d.date, filledChartData.grouping),
		);
		const labels = thinLabels(allLabels);
		const values = data.map((d) =>
			Math.round((parseInt(d.studyTimeSeconds) || 0) / 60),
		);

		return {
			labels,
			datasets: [
				{
					data: values.length > 0 ? values : [0],
					color: () => "#8b5cf6",
					strokeWidth: 2,
				},
			],
		};
	}, [filledChartData]);

	// Get selected deck name
	const selectedDeckName = useMemo(() => {
		if (selectedDeck === "all") return t("all_decks") || "All Decks";
		return decksData.find((d) => d.id === selectedDeck)?.title || selectedDeck;
	}, [selectedDeck, decksData, t]);

	return (
		<ThemedView variant="gradient" style={styles.container}>
			{/* Overlay shown while refreshing/filtering (not on first load) */}
			<LoadingOverlay
				visible={loading && !!filteredStats}
				message={t("loading") || "Loading..."}
			/>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Header — always visible */}
					<Animated.View
						style={[
							styles.header,
							{
								opacity: headerAnim,
								transform: [
									{
										translateY: headerAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [-15, 0],
										}),
									},
								],
							},
						]}
					>
						<View style={styles.headerRow}>
							<View style={styles.headerTitle}>
								<MaterialCommunityIcons
									name="chart-line"
									size={28}
									color={theme.primary.main}
								/>
								<ThemedText variant="h2">{t("statistics")}</ThemedText>
							</View>
							<View style={styles.headerButtons}>
								{/* Download button — inverted color based on theme, disabled when locked */}
								<TouchableOpacity
									style={[styles.downloadButton, isLocked && { opacity: 0.4 }]}
									onPress={isLocked ? undefined : handleDownloadPDF}
									disabled={isLocked}
								>
									<MaterialCommunityIcons
										name="download"
										size={20}
										color={theme.primary.main}
									/>
								</TouchableOpacity>
							</View>
						</View>
						<ThemedText color="secondary">{t("stats_subtitle")}</ThemedText>
					</Animated.View>

					{/* Locked banner */}
					{isLocked && (
						<View style={styles.lockedBanner}>
							<View style={styles.lockedBannerContent}>
								<MaterialCommunityIcons
									name="lock"
									size={22}
									color="#f59e0b"
									style={{ marginTop: 2 }}
								/>
								<View style={{ flex: 1 }}>
									<ThemedText style={styles.lockedBannerTitle}>
										{t("stats_locked_title") || "Statistics Locked"}
									</ThemedText>
									<ThemedText
										color="secondary"
										style={styles.lockedBannerDescription}
									>
										{t("stats_preview_description") ||
											"This is a preview with sample data. Upgrade your plan to see your real statistics."}
									</ThemedText>
								</View>
							</View>
							<TouchableOpacity
								style={styles.lockedBannerButton}
								onPress={() =>
									navigation.navigate("Settings", { screen: "Plans" })
								}
							>
								<MaterialCommunityIcons
									name="arrow-up-bold"
									size={16}
									color="#fff"
								/>
								<Text style={styles.lockedBannerButtonText}>
									{t("upgrade_plan") || "Upgrade Plan"}
								</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* Content wrapper — blurred overlay for locked users */}
					<View style={{ position: "relative" }}>
						{isLocked && (
							<View pointerEvents="none" style={styles.blurOverlay} />
						)}
						<Animated.View
							style={{
								opacity: filtersAnim,
								transform: [
									{
										translateY: filtersAnim.interpolate({
											inputRange: [0, 1],
											outputRange: [15, 0],
										}),
									},
								],
							}}
						>
							<Card style={styles.filtersCard}>
								{/* Deck Filter */}
								<TouchableOpacity
									style={[
										styles.deckSelector,
										{ borderColor: theme.border.main },
									]}
									onPress={() => setShowDeckModal(true)}
								>
									<MaterialCommunityIcons
										name="cards"
										size={20}
										color={theme.primary.main}
									/>
									<ThemedText style={styles.deckSelectorText} numberOfLines={1}>
										{selectedDeckName}
									</ThemedText>
									<MaterialCommunityIcons
										name="chevron-down"
										size={20}
										color={theme.text.secondary}
									/>
								</TouchableOpacity>

								{/* Date Presets */}
								<View style={styles.presetsContainer}>
									{presets.map((p) => (
										<TouchableOpacity
											key={p.key}
											style={[
												styles.presetButton,
												{
													backgroundColor:
														activePreset === p.key
															? theme.primary.main
															: theme.background.elevated,
													borderColor:
														activePreset === p.key
															? theme.primary.main
															: theme.border.main,
												},
											]}
											onPress={() => handlePresetClick(p.key)}
										>
											<Text
												style={[
													styles.presetText,
													{
														color:
															activePreset === p.key
																? "#fff"
																: theme.text.secondary,
													},
												]}
											>
												{p.label}
											</Text>
										</TouchableOpacity>
									))}
								</View>

								{/* Custom date selector removed */}
							</Card>
						</Animated.View>

						{/* Stats Grid */}
						<Animated.View
							style={[
								styles.statsGrid,
								{
									opacity: contentAnim,
									transform: [
										{
											translateY: contentAnim.interpolate({
												inputRange: [0, 1],
												outputRange: [20, 0],
											}),
										},
									],
								},
							]}
						>
							<StatCard
								icon={
									<MaterialCommunityIcons
										name="school"
										size={24}
										color="#3b82f6"
									/>
								}
								iconColor="#3b82f6"
								title={t("cards_studied") || "Cards Studied"}
								value={effectiveStats?.cardsStudied || 0}
								theme={theme}
							/>
							<StatCard
								icon={
									<MaterialCommunityIcons
										name="check-circle"
										size={24}
										color="#22c55e"
									/>
								}
								iconColor="#22c55e"
								title={t("correct_answers") || "Correct"}
								value={effectiveStats?.correct || 0}
								theme={theme}
							/>
							<StatCard
								icon={
									<MaterialCommunityIcons
										name="alert-circle-outline"
										size={24}
										color="#ef4444"
									/>
								}
								iconColor="#ef4444"
								title={t("wrong_answers") || "Incorrect"}
								value={effectiveStats?.incorrect || 0}
								theme={theme}
							/>
							<StatCard
								icon={
									<MaterialCommunityIcons
										name="trophy"
										size={24}
										color="#8b5cf6"
									/>
								}
								iconColor="#8b5cf6"
								title={t("accuracy") || "Accuracy"}
								value={`${accuracy}%`}
								theme={theme}
							/>
							<StatCard
								icon={
									<MaterialCommunityIcons
										name="clock-outline"
										size={24}
										color="#06b6d4"
									/>
								}
								iconColor="#06b6d4"
								title={t("study_time") || "Study Time"}
								value={formatDuration(effectiveStats?.studyTimeSeconds || 0)}
								theme={theme}
							/>
							<StatCard
								icon={
									<MaterialCommunityIcons
										name="calendar"
										size={24}
										color="#f59e0b"
									/>
								}
								iconColor="#f59e0b"
								title={t("sessions") || "Sessions"}
								value={effectiveStats?.sessions || 0}
								theme={theme}
							/>
						</Animated.View>

						{/* Charts Section */}
						{/* Study Activity Chart */}
						{activityChartData && (
							<Card style={styles.chartCard}>
								<SectionHeader
									icon="chart-line"
									title={t("study_activity") || "Study Activity"}
									theme={theme}
								/>
								<LineChart
									data={activityChartData}
									width={CHART_WIDTH}
									height={200}
									chartConfig={chartConfig}
									bezier
									style={styles.chart}
									formatYLabel={(y) => `${Math.round(Number(y) || 0)}`}
									onDataPointClick={({ index, value, x, y }) => {
										const d = (filledChartData.data || [])[index];
										setTooltip({
											x,
											y,
											label: d ? formatFullDate(d.date) : "",
											value: `${value} ${t("cards") || "Cards"}`,
											chart: "activity",
										});
									}}
									decorator={() =>
										tooltip?.chart === "activity" ? (
											<View
												style={[
													styles.tooltipContainer,
													{ left: tooltip.x - 60, top: tooltip.y - 55 },
												]}
											>
												<Text style={styles.tooltipDate}>{tooltip.label}</Text>
												<Text style={styles.tooltipValue}>{tooltip.value}</Text>
											</View>
										) : null
									}
								/>
							</Card>
						)}

						{/* Accuracy Trend Chart */}
						{accuracyChartData && (
							<Card style={styles.chartCard}>
								<SectionHeader
									icon="target"
									title={t("accuracy_trend") || "Accuracy Trend"}
									theme={theme}
								/>
								<LineChart
									data={accuracyChartData}
									width={CHART_WIDTH}
									height={200}
									chartConfig={{
										...chartConfig,
										color: () => "#22c55e",
									}}
									bezier
									style={styles.chart}
									formatYLabel={(y) => `${Math.round(Number(y) || 0)}`}
									withLegend={false}
									onDataPointClick={({ index, x, y }) => {
										const d = (filledChartData.data || [])[index];
										const correctVal = parseInt(d?.correct) || 0;
										const incorrectVal = parseInt(d?.incorrect) || 0;
										setTooltip({
											x,
											y,
											label: d ? formatFullDate(d.date) : "",
											value: `✓ ${correctVal}  ✗ ${incorrectVal}`,
											chart: "accuracy",
										});
									}}
									decorator={() =>
										tooltip?.chart === "accuracy" ? (
											<View
												style={[
													styles.tooltipContainer,
													{ left: tooltip.x - 60, top: tooltip.y - 55 },
												]}
											>
												<Text style={styles.tooltipDate}>{tooltip.label}</Text>
												<Text style={styles.tooltipValue}>{tooltip.value}</Text>
											</View>
										) : null
									}
								/>
								<View style={styles.legendContainer}>
									<View style={styles.legendItem}>
										<View
											style={[styles.legendDot, { backgroundColor: "#22c55e" }]}
										/>
										<ThemedText color="secondary" style={styles.legendText}>
											{t("correct") || "Correct"}
										</ThemedText>
									</View>
									<View style={styles.legendItem}>
										<View
											style={[styles.legendDot, { backgroundColor: "#ef4444" }]}
										/>
										<ThemedText color="secondary" style={styles.legendText}>
											{t("incorrect") || "Incorrect"}
										</ThemedText>
									</View>
								</View>
							</Card>
						)}

						{/* Study Time Chart — area fill line chart */}
						{studyTimeChartData && (
							<Card style={styles.chartCard}>
								<SectionHeader
									icon="clock-outline"
									title={`${t("study_time_chart") || "Study Time"} (${t("minutes_short") || "min"})`}
									theme={theme}
								/>
								<LineChart
									data={studyTimeChartData}
									width={CHART_WIDTH}
									height={200}
									chartConfig={{
										...chartConfig,
										color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
										propsForDots: {
											r: "4",
											strokeWidth: "2",
											stroke: "#8b5cf6",
										},
									}}
									bezier
									style={styles.chart}
									fromZero
									withDots={true}
									onDataPointClick={({ index, value, x, y }) => {
										const d = (filledChartData.data || [])[index];
										setTooltip({
											x,
											y,
											label: d ? formatFullDate(d.date) : "",
											value: `${value} ${t("minutes_short") || "min"}`,
											chart: "studytime",
										});
									}}
									decorator={() =>
										tooltip?.chart === "studytime" ? (
											<View
												style={[
													styles.tooltipContainer,
													{ left: tooltip.x - 60, top: tooltip.y - 55 },
												]}
											>
												<Text style={styles.tooltipDate}>{tooltip.label}</Text>
												<Text style={styles.tooltipValue}>{tooltip.value}</Text>
											</View>
										) : null
									}
								/>
							</Card>
						)}

						{/* Card Performance Table */}
						<Card style={styles.tableCard}>
							<SectionHeader
								icon="cards"
								title={t("card_performance") || "Card Performance"}
								theme={theme}
							/>

							{/* Sort Buttons */}
							<View style={styles.sortContainer}>
								{[
									{ key: "times_played", label: t("times_played") || "Played" },
									{ key: "correct", label: t("correct") || "Correct" },
									{ key: "wrong", label: t("wrong") || "Wrong" },
									{ key: "accuracy", label: t("accuracy") || "Accuracy" },
								].map((col) => (
									<TouchableOpacity
										key={col.key}
										style={[
											styles.sortButton,
											{
												backgroundColor:
													sortBy === col.key
														? theme.primary.main + "20"
														: "transparent",
												borderColor:
													sortBy === col.key
														? theme.primary.main
														: theme.border.main,
											},
										]}
										onPress={() => handleSort(col.key)}
									>
										<Text
											style={[
												styles.sortButtonText,
												{
													color:
														sortBy === col.key
															? theme.primary.main
															: theme.text.secondary,
												},
											]}
										>
											{col.label}
										</Text>
										{sortBy === col.key && (
											<MaterialCommunityIcons
												name={sortOrder === "desc" ? "arrow-down" : "arrow-up"}
												size={14}
												color={theme.primary.main}
											/>
										)}
									</TouchableOpacity>
								))}
							</View>

							{/* Cards List */}
							{effectiveCardsTable.length > 0 ? (
								<View style={styles.cardsList}>
									{effectiveCardsTable.map((card, index) => (
										<CardPerformanceRow
											key={card.id || index}
											card={card}
											theme={theme}
											t={t}
										/>
									))}
								</View>
							) : (
								<View style={styles.emptyCards}>
									<MaterialCommunityIcons
										name="cards-outline"
										size={48}
										color={theme.text.secondary}
									/>
									<ThemedText color="secondary" style={styles.emptyText}>
										{t("no_card_stats") || "No card statistics yet"}
									</ThemedText>
								</View>
							)}
						</Card>

						{/* Close blur wrapper */}
					</View>

					{/* Bottom spacing */}
					<View style={{ height: spacing.xl }} />
				</ScrollView>
			</SafeAreaView>

			{/* Deck Selection Modal */}
			<Modal
				visible={showDeckModal}
				transparent
				animationType="slide"
				onRequestClose={() => setShowDeckModal(false)}
			>
				<TouchableOpacity
					style={styles.modalOverlay}
					activeOpacity={1}
					onPress={() => setShowDeckModal(false)}
				>
					<View
						style={[
							styles.modalContent,
							{ backgroundColor: theme.background.card },
						]}
					>
						<View style={styles.modalHeader}>
							<ThemedText variant="h3">
								{t("select_deck") || "Select Deck"}
							</ThemedText>
							<TouchableOpacity onPress={() => setShowDeckModal(false)}>
								<MaterialCommunityIcons
									name="close"
									size={24}
									color={theme.text.primary}
								/>
							</TouchableOpacity>
						</View>
						<FlatList
							data={[
								{ id: "all", title: t("all_decks") || "All Decks" },
								...decksData,
							]}
							keyExtractor={(item) => item.id?.toString()}
							renderItem={({ item }) => {
								const isSelected = selectedDeck === item.id;
								return (
									<TouchableOpacity
										style={[
											styles.modalItem,
											{ borderBottomColor: theme.border.main + "30" },
											isSelected && {
												backgroundColor: theme.primary.main + "14",
											},
										]}
										onPress={() => {
											setSelectedDeck(item.id);
											setShowDeckModal(false);
										}}
										activeOpacity={0.8}
									>
										<View style={styles.deckRow}>
											<View
												style={[
													styles.deckIconContainer,
													{ backgroundColor: theme.primary.main + "20" },
												]}
											>
												<MaterialCommunityIcons
													name="cards"
													size={20}
													color={theme.primary.main}
												/>
											</View>
											<View style={styles.deckMeta}>
												<ThemedText numberOfLines={1} style={styles.deckTitle}>
													{item.title}
												</ThemedText>
												{item.card_count >= 0 && (
													<ThemedText
														color="secondary"
														style={styles.deckSubtitle}
													>
														{(item.card_count ||
															item.cards_count ||
															item.count) +
															" " +
															(t("cards") || "Cards")}
													</ThemedText>
												)}
											</View>
											<View style={styles.deckCheckWrap}>
												{isSelected ? (
													<View
														style={[
															styles.checkCircle,
															{ backgroundColor: theme.primary.main },
														]}
													>
														<MaterialCommunityIcons
															name="check"
															size={16}
															color="#fff"
														/>
													</View>
												) : (
													<View style={styles.uncheckedCircle} />
												)}
											</View>
										</View>
									</TouchableOpacity>
								);
							}}
						/>
					</View>
				</TouchableOpacity>
			</Modal>

			{/* PDF result alert */}
			<AlertDialog
				visible={alertModal.visible}
				onClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
				title={alertModal.title}
				message={alertModal.message}
				variant={alertModal.variant}
				buttonLabel={t("ok")}
			/>
		</ThemedView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	safeArea: {
		flex: 1,
	},
	scrollContent: {
		padding: spacing.lg,
	},
	header: {
		marginBottom: spacing.lg,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing.xs,
	},
	headerTitle: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	headerButtons: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
	},
	headerButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	downloadButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	filtersCard: {
		padding: spacing.md,
		marginBottom: spacing.lg,
	},
	deckSelector: {
		flexDirection: "row",
		alignItems: "center",
		padding: spacing.sm,
		borderWidth: 1,
		borderRadius: borderRadius.md,
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	deckSelectorText: {
		flex: 1,
		fontSize: 14,
	},
	presetsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.xs,
	},
	presetButton: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.full,
		borderWidth: 1,
	},
	presetText: {
		fontSize: 12,
		fontWeight: "600",
	},
	customDateDisplay: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		marginTop: spacing.md,
	},
	dateButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderWidth: 1,
		borderRadius: borderRadius.md,
	},
	dateButtonText: {
		fontSize: 12,
	},
	statsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
		marginBottom: spacing.lg,
	},
	statCard: {
		width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm) / 2 - 1,
		flexDirection: "row",
		alignItems: "center",
		padding: spacing.md,
		gap: spacing.sm,
	},
	statIconContainer: {
		width: 40,
		height: 40,
		borderRadius: borderRadius.md,
		alignItems: "center",
		justifyContent: "center",
	},
	statContent: {
		flex: 1,
	},
	statTitle: {
		fontSize: 11,
		marginBottom: 2,
	},
	statValue: {
		fontSize: 18,
		fontWeight: "700",
	},
	chartCard: {
		padding: spacing.md,
		marginBottom: spacing.md,
	},
	sectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	sectionTitle: {
		fontSize: 16,
	},
	chart: {
		borderRadius: borderRadius.md,
		marginLeft: -spacing.md,
	},
	legendContainer: {
		flexDirection: "row",
		justifyContent: "center",
		gap: spacing.lg,
		marginTop: spacing.sm,
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
	},
	legendDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	legendText: {
		fontSize: 12,
	},
	tableCard: {
		padding: spacing.md,
		marginBottom: spacing.md,
	},
	sortContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.xs,
		marginBottom: spacing.md,
	},
	sortButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderWidth: 1,
		borderRadius: borderRadius.md,
	},
	sortButtonText: {
		fontSize: 11,
		fontWeight: "500",
	},
	cardsList: {
		marginTop: spacing.sm,
		gap: spacing.sm,
	},
	cardRow: {
		flexDirection: "row",
		borderRadius: borderRadius.md,
		overflow: "hidden",
	},
	cardRowAccent: {
		width: 4,
		flexShrink: 0,
	},
	cardRowBody: {
		flex: 1,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		gap: 6,
	},
	cardRowTop: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
		flexWrap: "wrap",
	},
	cardFront: {
		fontSize: 14,
		fontWeight: "600",
	},
	cardBack: {
		fontSize: 11,
		marginTop: 1,
	},
	cardTextBlock: {
		flex: 1,
		flexDirection: "column",
	},
	deckBadge: {
		paddingHorizontal: 7,
		paddingVertical: 2,
		borderRadius: 20,
	},
	deckBadgeText: {
		fontSize: 10,
		fontWeight: "600",
	},
	cardStatsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
	},
	statChip: {
		alignItems: "center",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	statChipColored: {
		flexDirection: "row",
		gap: 3,
	},
	statChipLabel: {
		fontSize: 9,
		marginBottom: 1,
	},
	statChipValue: {
		fontSize: 13,
		fontWeight: "700",
	},
	accuracyBadge: {
		marginLeft: "auto",
		fontSize: 13,
		fontWeight: "700",
	},
	progressTrack: {
		height: 5,
		borderRadius: 3,
		overflow: "hidden",
	},
	progressFill: {
		height: "100%",
		borderRadius: 3,
	},
	emptyCards: {
		alignItems: "center",
		padding: spacing.xl,
	},
	emptyText: {
		marginTop: spacing.sm,
		textAlign: "center",
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	modalContent: {
		maxHeight: "60%",
		borderTopLeftRadius: borderRadius.xl,
		borderTopRightRadius: borderRadius.xl,
		paddingBottom: spacing.xl,
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: "rgba(255,255,255,0.1)",
	},
	modalItem: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: spacing.md,
		paddingHorizontal: spacing.lg,
		borderBottomWidth: 1,
	},
	deckRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
		flex: 1,
	},
	deckIconContainer: {
		width: 44,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	deckMeta: {
		flex: 1,
		justifyContent: "center",
	},
	deckTitle: {
		fontSize: 14,
		fontWeight: "700",
	},
	deckSubtitle: {
		fontSize: 12,
		marginTop: 2,
	},
	deckCheckWrap: {
		width: 40,
		alignItems: "flex-end",
		justifyContent: "center",
		flexShrink: 0,
	},
	checkCircle: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.12,
		shadowRadius: 8,
		elevation: 6,
	},
	uncheckedCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
		backgroundColor: "transparent",
	},
	lockContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.lg,
	},
	lockedBanner: {
		flexDirection: "column",
		alignSelf: "stretch",
		padding: spacing.md,
		marginBottom: spacing.lg,
		borderRadius: borderRadius.md,
		backgroundColor: "rgba(245,158,11,0.1)",
		borderWidth: 1,
		borderColor: "#f59e0b",
	},
	lockedBannerContent: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: spacing.sm,
		marginBottom: spacing.sm,
	},
	lockedBannerTitle: {
		fontWeight: "700",
		color: "#f59e0b",
		fontSize: 14,
		marginBottom: 2,
	},
	lockedBannerDescription: {
		fontSize: 12,
		lineHeight: 17,
	},
	lockedBannerButton: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-end",
		gap: spacing.xs,
		backgroundColor: "#f59e0b",
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs + 2,
		borderRadius: borderRadius.md,
	},
	lockedBannerButtonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 13,
	},
	blurOverlay: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "rgba(15,23,42,0.45)",
		borderRadius: borderRadius.md,
		zIndex: 10,
	},
	tooltipContainer: {
		position: "absolute",
		backgroundColor: "rgba(15, 23, 42, 0.9)",
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		width: 120,
		alignItems: "center",
		zIndex: 100,
	},
	tooltipDate: {
		color: "#94a3b8",
		fontSize: 10,
		marginBottom: 2,
	},
	tooltipValue: {
		color: "#ffffff",
		fontSize: 13,
		fontWeight: "700",
	},
});

export default StatsScreen;
