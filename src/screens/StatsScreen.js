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
	Alert,
	Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BarChart, LineChart } from "react-native-chart-kit";
// DateTimePicker removed (custom date selector disabled)
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { statsAPI, accountAPI } from "../services/api";
import {
	ThemedView,
	ThemedText,
	Card,
	LoadingState,
	Button,
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

	return (
		<View
			style={[styles.cardRow, { borderBottomColor: theme.border.main + "30" }]}
		>
			<View style={styles.cardRowLeft}>
				<ThemedText numberOfLines={1} style={styles.cardFront}>
					{card.front?.substring(0, 30)}
					{card.front?.length > 30 ? "..." : ""}
				</ThemedText>
				{card.deck_title && (
					<ThemedText
						color="secondary"
						style={styles.cardDeck}
						numberOfLines={1}
					>
						{card.deck_title}
					</ThemedText>
				)}
			</View>
			<View style={styles.cardRowRight}>
				<View style={styles.cardStat}>
					<ThemedText color="secondary" style={styles.cardStatLabel}>
						{t("times_played") || "Played"}
					</ThemedText>
					<ThemedText style={styles.cardStatValue}>
						{card.times_played || 0}
					</ThemedText>
				</View>
				<View style={styles.cardStat}>
					<ThemedText color="secondary" style={styles.cardStatLabel}>
						{t("correct") || "Correct"}
					</ThemedText>
					<Text style={[styles.cardStatValue, { color: "#22c55e" }]}>
						{card.correct || 0}
					</Text>
				</View>
				<View style={styles.cardStat}>
					<ThemedText color="secondary" style={styles.cardStatLabel}>
						{t("wrong") || "Wrong"}
					</ThemedText>
					<Text style={[styles.cardStatValue, { color: "#ef4444" }]}>
						{card.wrong || 0}
					</Text>
				</View>
				<View style={styles.cardStatAccuracy}>
					<View
						style={[
							styles.accuracyBar,
							{ backgroundColor: theme.border.main + "30" },
						]}
					>
						<View
							style={[
								styles.accuracyFill,
								{
									width: `${accuracy}%`,
									backgroundColor:
										accuracy >= 70
											? "#22c55e"
											: accuracy >= 40
												? "#f59e0b"
												: "#ef4444",
								},
							]}
						/>
					</View>
					<ThemedText style={styles.accuracyText}>{accuracy}%</ThemedText>
				</View>
			</View>
		</View>
	);
};

const StatsScreen = () => {
	const { theme, chartColors } = useTheme();
	const { t } = useI18n();
	const navigation = useNavigation();

	// Plan state
	const [plan, setPlan] = useState(null);

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
		return date.toISOString().split("T")[0];
	};

	// Format date for display
	const formatDateLabel = (dateStr, grouping) => {
		if (!dateStr) return "-";
		const date = new Date(dateStr);
		if (grouping === "monthly") {
			return date.toLocaleDateString("en", { month: "short" });
		}
		return date.toLocaleDateString("en", { month: "short", day: "numeric" });
	};

	// Format duration
	const formatDuration = (seconds) => {
		if (!seconds) return "0m";
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	};

	// Fetch decks on mount
	useEffect(() => {
		const fetchDecks = async () => {
			try {
				const res = await statsAPI.getAllDecks();
				setDecksData(res.data?.decks || []);
			} catch (error) {
				console.error("Error fetching decks:", error);
			}
		};
		fetchDecks();
	}, []);

	// Fetch current plan
	useEffect(() => {
		let mounted = true;
		const fetchPlan = async () => {
			try {
				const res = await accountAPI.getCurrentPlan();
				const userPlan = res.data?.plan;
				if (mounted) setPlan(userPlan?.code || "free");
			} catch (error) {
				console.error("Error fetching plan:", error);
				if (mounted) setPlan("free");
			}
		};
		fetchPlan();
		return () => (mounted = false);
	}, []);

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

	const fetchData = async () => {
		setLoading(true);
		try {
			const startStr = formatDateForAPI(dateRange.start);
			const endStr = formatDateForAPI(dateRange.end);

			const [statsRes, chartRes, cardsRes] = await Promise.all([
				statsAPI.getFilteredStats(selectedDeck, startStr, endStr),
				statsAPI.getChartData(selectedDeck, startStr, endStr),
				statsAPI.getCardsTable(selectedDeck, sortBy, sortOrder),
			]);

			setFilteredStats(statsRes.data);
			setChartData(chartRes.data || { data: [], grouping: "daily" });
			setCardsTable(cardsRes.data?.cards || []);
		} catch (error) {
			console.error("Error fetching stats:", error);
		} finally {
			setLoading(false);

			// Trigger entrance animations
			Animated.timing(headerAnim, {
				toValue: 1,
				duration: 350,
				useNativeDriver: true,
			}).start();

			Animated.spring(filtersAnim, {
				toValue: 1,
				delay: 100,
				useNativeDriver: true,
				speed: 14,
				bounciness: 3,
			}).start();

			Animated.spring(contentAnim, {
				toValue: 1,
				delay: 200,
				useNativeDriver: true,
				speed: 12,
				bounciness: 4,
			}).start();
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

	// Generate and share PDF report
	const handleDownloadPDF = async () => {
		if (!filteredStats) return;

		// Load logo
		const logoBase64 = await getLogoBase64();

		const total = (filteredStats.correct || 0) + (filteredStats.incorrect || 0);
		const accuracyPercent =
			total > 0 ? Math.round((filteredStats.correct / total) * 100) : 0;
		const hours = Math.floor((filteredStats.studyTimeSeconds || 0) / 3600);
		const minutes = Math.floor(
			((filteredStats.studyTimeSeconds || 0) % 3600) / 60,
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

		// Generate chart data for PDF
		const chartDataForPDF = chartData.data || [];
		const displayChartData =
			chartDataForPDF.length > 10
				? chartDataForPDF.slice(-10)
				: chartDataForPDF;

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
        <div class="chart-container">
          <div class="chart-title">${title}</div>
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
        </div>
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
        <div class="chart-container">
          <div class="chart-title">${title}</div>
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
        </div>
      `;
		};

		// Prepare chart data
		const activityData = displayChartData.map((d) => ({
			label: formatDateLabel(d.date, chartData.grouping),
			value: parseInt(d.cardsStudied) || 0,
		}));

		const accuracyData = displayChartData.map((d) => ({
			label: formatDateLabel(d.date, chartData.grouping),
			correct: parseInt(d.correct) || 0,
			incorrect: parseInt(d.incorrect) || 0,
		}));

		const studyTimeData = displayChartData.map((d) => ({
			label: formatDateLabel(d.date, chartData.grouping),
			value: Math.round((parseInt(d.studyTimeSeconds) || 0) / 60),
		}));

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
        <div class="chart-container">
          <div class="chart-title">${title}</div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background: #22c55e;"></span>${t("correct") || "Correct"}</span>
            <span class="legend-item"><span class="legend-dot" style="background: #ef4444;"></span>${t("incorrect") || "Incorrect"}</span>
          </div>
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
        </div>
      `;
		};

		const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 0; background: #1a1a2e; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      background: #1a1a2e !important;
      color: #e2e8f0;
      font-family: 'Helvetica', 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    body {
      padding: 15px;
      min-height: 100vh;
    }
    .container { max-width: 100%; background: #1a1a2e; }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      color: #667eea;
      margin-bottom: 5px;
    }
    .header .subtitle { 
      color: #94a3b8; 
      font-size: 10px; 
      margin-bottom: 8px;
    }
    .header .meta {
      color: #94a3b8;
      font-size: 9px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 5px;
      margin-bottom: 15px;
    }
    .stat-card {
      background: #1e293b;
      border-radius: 6px;
      padding: 12px 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .stat-label {
      color: #94a3b8;
      font-size: 7px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card.primary .stat-value { color: #3b82f6; }
    .stat-card.success .stat-value { color: #22c55e; }
    .stat-card.error .stat-value { color: #ef4444; }
    .stat-card.purple .stat-value { color: #8b5cf6; }
    .stat-card.info .stat-value { color: #06b6d4; }
    .stat-card.warning .stat-value { color: #f59e0b; }
    .section-title {
      color: #667eea;
      font-size: 10px;
      margin-bottom: 5px;
      font-weight: 600;
    }
    .cards-section {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      margin-top: 15px;
    }
    .cards-section h3 {
      margin-bottom: 10px;
      color: #e2e8f0;
      font-size: 11px;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 6px 4px;
      text-align: left;
      border-bottom: 1px solid #334155;
      font-size: 8px;
    }
    th { 
      background: #4f46e5;
      color: white; 
      font-weight: 600; 
      text-transform: capitalize; 
      font-size: 7px;
      padding: 8px 6px;
    }
    th:first-child { border-radius: 4px 0 0 0; }
    th:last-child { border-radius: 0 4px 0 0; }
    tr:nth-child(even) { background: #16213e; }
    tr:nth-child(odd) { background: #1e293b; }
    .text-success { color: #4ade80; }
    .text-error { color: #f87171; }
    .text-warning { color: #fbbf24; }
    .accuracy-cell {
      font-weight: 600;
    }
    .row-indicator {
      width: 3px;
      height: 12px;
      border-radius: 2px;
      display: inline-block;
      margin-right: 6px;
      vertical-align: middle;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #334155;
      color: #64748b;
      font-size: 8px;
    }
    .charts-section {
      margin: 15px 0;
    }
    .chart-container {
      background: #1e293b;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
    }
    .chart-title {
      color: #e2e8f0;
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .chart-legend {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 8px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #94a3b8;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .logo {
      width: 48px;
      height: 48px;
      margin: 0 auto 10px auto;
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="MemoDeck Logo" />` : ""}
      <h1>${t("statistics_report") || "Statistics Report"}</h1>
      <p class="subtitle">${t("stats_subtitle") || "Track your learning progress"}</p>
      <p class="meta">${dateRangeText}  •  ${selectedDeckNamePDF}  •  ${reportDate}</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-value">${filteredStats.cardsStudied || 0}</div>
        <div class="stat-label">${t("cards_studied") || "Cards Studied"}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">${filteredStats.correct || 0}</div>
        <div class="stat-label">${t("correct_answers") || "Correct"}</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value">${filteredStats.incorrect || 0}</div>
        <div class="stat-label">${t("wrong_answers") || "Incorrect"}</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-value">${accuracyPercent}%</div>
        <div class="stat-label">${t("accuracy") || "Accuracy"}</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">${studyTimeFormatted}</div>
        <div class="stat-label">${t("study_time") || "Study Time"}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${filteredStats.sessions || 0}</div>
        <div class="stat-label">${t("sessions") || "Sessions"}</div>
      </div>
    </div>

    ${
			displayChartData.length > 0
				? `
    <div class="charts-section">
      ${generateLineChart(activityData, "#3b82f6", t("study_activity") || "Study Activity", t("cards_studied") || "Cards")}
      ${generateAccuracyChart(accuracyData, t("accuracy_trend") || "Accuracy Trend")}
      ${generateBarChart(studyTimeData, "#8b5cf6", t("study_time") || "Study Time")}
    </div>
    `
				: ""
		}

    ${
			cardsTable.length > 0
				? `
    <div class="cards-section">
      <h3>${t("card_performance") || "Card Performance"}</h3>
      <table>
        <thead>
          <tr>
            <th style="text-align: left;">${t("flashcards") || "Flashcards"}</th>
            <th style="text-align: center;">${t("times_played") || "Played"}</th>
            <th style="text-align: center;">${t("correct") || "Correct"}</th>
            <th style="text-align: center;">${t("incorrect") || "Wrong"}</th>
            <th style="text-align: center;">${t("accuracy") || "Accuracy"}</th>
          </tr>
        </thead>
        <tbody>
          ${cardsTable
						.map((card) => {
							const acc = card.accuracy || 0;
							const indicatorColor =
								acc >= 80 ? "#4ade80" : acc >= 50 ? "#fbbf24" : "#f87171";
							const accClass =
								acc >= 80
									? "text-success"
									: acc >= 50
										? "text-warning"
										: "text-error";
							return `
          <tr>
            <td><span class="row-indicator" style="background: ${indicatorColor};"></span>${(card.front || "").substring(0, 35)}${card.front?.length > 35 ? "..." : ""}</td>
            <td style="text-align: center;">${card.times_played || 0}</td>
            <td style="text-align: center;" class="text-success">${card.correct || 0}</td>
            <td style="text-align: center;" class="text-error">${card.wrong || 0}</td>
            <td style="text-align: center;" class="accuracy-cell ${accClass}">${acc}%</td>
          </tr>
          `;
						})
						.join("")}
        </tbody>
      </table>
    </div>
    `
				: ""
		}

    <div class="footer">
      <p>Generated by MemoDeck App • ${reportDate}</p>
    </div>
  </div>
</body>
</html>
    `;

		try {
			const { uri } = await Print.printToFileAsync({ html: htmlContent });

			// Copy to app document directory with requested filename
			const dest = FileSystem.documentDirectory + `${fileName}.pdf`;
			let shareUri = uri;
			try {
				await FileSystem.copyAsync({ from: uri, to: dest });
				// Check if copy succeeded by trying to stat the file
				await FileSystem.statAsync(dest);
				shareUri = dest;
			} catch (copyErr) {
				// fallback: if copy fails, continue with original uri
				console.warn(
					"Failed to copy PDF to documentDirectory, using original uri",
					copyErr,
				);
			}

			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(shareUri, {
					mimeType: "application/pdf",
					filename: `${fileName}.pdf`,
					UTI: "com.adobe.pdf",
				});
			} else {
				Alert.alert(
					t("success") || "Success",
					t("pdf_saved") || "PDF has been saved",
				);
			}
		} catch (error) {
			console.error("Error generating PDF:", error);
			Alert.alert(
				t("error") || "Error",
				t("pdf_error") || "Failed to generate PDF",
			);
		}
	};

	// Calculate accuracy
	const accuracy = useMemo(() => {
		if (!filteredStats) return 0;
		const total = (filteredStats.correct || 0) + (filteredStats.incorrect || 0);
		if (total === 0) return 0;
		return Math.round((filteredStats.correct / total) * 100);
	}, [filteredStats]);

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
		const data = chartData.data || [];
		if (data.length === 0) return null;

		// Use all data points, limit to last 7 for display
		const displayData = data.length > 7 ? data.slice(-7) : data;
		const labels = displayData.map((d) =>
			formatDateLabel(d.date, chartData.grouping),
		);
		const values = displayData.map((d) => parseInt(d.cardsStudied) || 0);

		return {
			labels,
			datasets: [{ data: values.length > 0 ? values : [0] }],
		};
	}, [chartData]);

	// Prepare accuracy trend chart data
	const accuracyChartData = useMemo(() => {
		const data = chartData.data || [];
		if (data.length === 0) return null;

		// Use all data points, limit to last 7 for display
		const displayData = data.length > 7 ? data.slice(-7) : data;
		const labels = displayData.map((d) =>
			formatDateLabel(d.date, chartData.grouping),
		);
		const correctValues = displayData.map((d) => parseInt(d.correct) || 0);
		const incorrectValues = displayData.map((d) => parseInt(d.incorrect) || 0);

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
	}, [chartData, t]);

	// Prepare study time chart data
	const studyTimeChartData = useMemo(() => {
		const data = chartData.data || [];
		if (data.length === 0) return null;

		// Use all data points, limit to last 7 for display
		const displayData = data.length > 7 ? data.slice(-7) : data;
		const labels = displayData.map((d) =>
			formatDateLabel(d.date, chartData.grouping),
		);
		const values = displayData.map((d) =>
			Math.round((parseInt(d.studyTimeSeconds) || 0) / 60),
		);

		return {
			labels,
			datasets: [{ data: values.length > 0 ? values : [0] }],
		};
	}, [chartData]);

	// Get selected deck name
	const selectedDeckName = useMemo(() => {
		if (selectedDeck === "all") return t("all_decks") || "All Decks";
		return decksData.find((d) => d.id === selectedDeck)?.title || selectedDeck;
	}, [selectedDeck, decksData, t]);

	if (loading && !filteredStats) {
		return (
			<ThemedView variant="gradient" style={styles.container}>
				<LoadingState fullScreen message={t("loading")} />
			</ThemedView>
		);
	}

	// If plan fetched and user is on free plan, show locked screen
	if (plan === "free") {
		return (
			<ThemedView variant="gradient" style={styles.container}>
				<SafeAreaView style={styles.safeArea} edges={["top"]}>
					<View style={styles.lockContainer}>
						<MaterialCommunityIcons
							name="lock-outline"
							size={60}
							color={theme.text.primary}
						/>
						<ThemedText variant="h2" style={{ marginTop: spacing.md }}>
							{t("unlock_advanced_stats_title") ||
								"Upgrade your plan to unlock advanced statistics"}
						</ThemedText>
						<ThemedText
							color="secondary"
							style={{ textAlign: "center", marginTop: spacing.sm }}
						>
							{t("unlock_advanced_stats_message") ||
								"Get deeper insights into your learning patterns with our premium statistics features."}
						</ThemedText>
						<View
							style={{
								flexDirection: "row",
								gap: spacing.sm,
								marginTop: spacing.md,
							}}
						>
							<Button
								onPress={() =>
									navigation.navigate("Settings", { screen: "Plans" })
								}
							>
								{t("upgrade") || "Upgrade"}
							</Button>
							<Button
								variant="ghost"
								onPress={() => navigation.navigate("Home")}
							>
								{t("go_home") || "Go Home"}
							</Button>
						</View>
					</View>
				</SafeAreaView>
			</ThemedView>
		);
	}

	return (
		<ThemedView variant="gradient" style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Header */}
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
								{/* Refresh button removed */}
								<TouchableOpacity
									style={[
										styles.downloadButton,
										{ backgroundColor: theme.primary.secondary },
									]}
									onPress={handleDownloadPDF}
								>
									<MaterialCommunityIcons
										name="download"
										size={20}
										color="#fff"
									/>
								</TouchableOpacity>
							</View>
						</View>
						<ThemedText color="secondary">{t("stats_subtitle")}</ThemedText>
					</Animated.View>

					{/* Filters Section */}
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
							value={filteredStats?.cardsStudied || 0}
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
							value={filteredStats?.correct || 0}
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
							value={filteredStats?.incorrect || 0}
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
							value={formatDuration(filteredStats?.studyTimeSeconds || 0)}
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
							value={filteredStats?.sessions || 0}
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
								withLegend={false}
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

					{/* Study Time Chart */}
					{studyTimeChartData && (
						<Card style={styles.chartCard}>
							<SectionHeader
								icon="clock-outline"
								title={t("study_time_chart") || "Study Time"}
								theme={theme}
							/>
							<BarChart
								data={studyTimeChartData}
								width={CHART_WIDTH}
								height={200}
								chartConfig={{
									...chartConfig,
									color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
									fillShadowGradient: "#8b5cf6",
									fillShadowGradientOpacity: 1,
									barPercentage: 0.7,
								}}
								style={styles.chart}
								showValuesOnTopOfBars
								fromZero
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
						{cardsTable.length > 0 ? (
							<View style={styles.cardsList}>
								{cardsTable.map((card, index) => (
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
							renderItem={({ item }) => (
								<TouchableOpacity
									style={[
										styles.modalItem,
										{ borderBottomColor: theme.border.main + "30" },
										selectedDeck === item.id && {
											backgroundColor: theme.primary.main + "20",
										},
									]}
									onPress={() => {
										setSelectedDeck(item.id);
										setShowDeckModal(false);
									}}
								>
									<ThemedText>{item.title}</ThemedText>
									{selectedDeck === item.id && (
										<MaterialCommunityIcons
											name="check"
											size={20}
											color={theme.primary.main}
										/>
									)}
								</TouchableOpacity>
							)}
						/>
					</View>
				</TouchableOpacity>
			</Modal>
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
	},
	cardRow: {
		paddingVertical: spacing.sm,
		borderBottomWidth: 1,
	},
	cardRowLeft: {
		marginBottom: spacing.xs,
	},
	cardFront: {
		fontSize: 14,
		fontWeight: "500",
	},
	cardDeck: {
		fontSize: 11,
		marginTop: 2,
	},
	cardRowRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.md,
	},
	cardStat: {
		alignItems: "center",
	},
	cardStatLabel: {
		fontSize: 9,
		marginBottom: 2,
	},
	cardStatValue: {
		fontSize: 14,
		fontWeight: "600",
	},
	cardStatAccuracy: {
		flex: 1,
		alignItems: "flex-end",
	},
	accuracyBar: {
		width: 60,
		height: 6,
		borderRadius: 3,
		overflow: "hidden",
		marginBottom: 2,
	},
	accuracyFill: {
		height: "100%",
		borderRadius: 3,
	},
	accuracyText: {
		fontSize: 11,
		fontWeight: "600",
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
	lockContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: spacing.lg,
	},
});

export default StatsScreen;
