import React, { useRef, useEffect, useMemo, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	Animated,
	ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useI18n } from "../../context/I18nContext";
import { borderRadius, spacing } from "../../styles/theme";

const FRONT_ACCENT = "#8b5cf6"; // purple
const BACK_ACCENT = "#22c55e"; // green

const FlipCard = ({
	frontText,
	backText,
	isFlipped,
	onFlip,
	disabled = false,
	style,
	cardKey,
}) => {
	const { theme, shadows } = useTheme();
	const { t } = useI18n();
	const flipAnim = useRef(new Animated.Value(0)).current;

	// Refs for auto-scrolling long content
	const frontScrollRef = useRef(null);
	const backScrollRef = useRef(null);
	const frontAutoScrollTimer = useRef(null);
	const backAutoScrollTimer = useRef(null);
	const frontResetTimeout = useRef(null);
	const backResetTimeout = useRef(null);

	const [frontViewportH, setFrontViewportH] = useState(0);
	const [frontContentH, setFrontContentH] = useState(0);
	const [backViewportH, setBackViewportH] = useState(0);
	const [backContentH, setBackContentH] = useState(0);

	const autoScrollEnabledFront = useMemo(
		() => frontViewportH > 0 && frontContentH > frontViewportH + 8,
		[frontViewportH, frontContentH],
	);
	const autoScrollEnabledBack = useMemo(
		() => backViewportH > 0 && backContentH > backViewportH + 8,
		[backViewportH, backContentH],
	);

	const isFrontVeryLong = (frontText || "").trim().length > 100;
	const isBackVeryLong = (backText || "").trim().length > 100;

	// Reset animation immediately when card changes (cardKey changes)
	useEffect(() => {
		flipAnim.setValue(0);
		// Reset scroll positions when card changes
		frontScrollRef.current?.scrollTo?.({ y: 0, animated: false });
		backScrollRef.current?.scrollTo?.({ y: 0, animated: false });
	}, [cardKey]);

	useEffect(() => {
		Animated.timing(flipAnim, {
			toValue: isFlipped ? 1 : 0,
			duration: 400,
			useNativeDriver: true,
		}).start();
	}, [isFlipped]);

	// Stop any running auto-scroll timers
	const stopAutoScroll = () => {
		if (frontAutoScrollTimer.current) {
			clearInterval(frontAutoScrollTimer.current);
			frontAutoScrollTimer.current = null;
		}
		if (backAutoScrollTimer.current) {
			clearInterval(backAutoScrollTimer.current);
			backAutoScrollTimer.current = null;
		}
		if (frontResetTimeout.current) {
			clearTimeout(frontResetTimeout.current);
			frontResetTimeout.current = null;
		}
		if (backResetTimeout.current) {
			clearTimeout(backResetTimeout.current);
			backResetTimeout.current = null;
		}
	};

	// Auto-scroll the visible side if content is long.
	// Behavior: slowly scroll down; when reaching bottom, reset to top and repeat.
	useEffect(() => {
		stopAutoScroll();

		const safeScrollTo = (ref, y) => {
			// Ref can become null during unmount / flip transitions; guard to avoid crashes.
			const node = ref.current;
			if (!node || typeof node.scrollTo !== "function") return false;
			node.scrollTo({ y, animated: false });
			return true;
		};

		const start = ({ ref, viewportH, contentH, timerRef, resetTimeoutRef }) => {
			if (!(viewportH > 0 && contentH > viewportH + 8)) return;

			let y = 0;
			const maxY = Math.max(0, contentH - viewportH);
			const step = 1.2; // px per tick
			const tickMs = 16; // ~60fps
			const pauseAtEndsMs = 600;
			let pausedUntil = 0;

			timerRef.current = setInterval(() => {
				const now = Date.now();
				if (now < pausedUntil) return;

				y += step;
				if (y >= maxY) {
					y = maxY;
					if (!safeScrollTo(ref, y)) return;
					pausedUntil = now + pauseAtEndsMs;
					// Reset back to top after a short pause at bottom
					resetTimeoutRef.current = setTimeout(() => {
						safeScrollTo(ref, 0);
					}, pauseAtEndsMs);
					y = 0;
					pausedUntil = now + pauseAtEndsMs * 2;
					return;
				}

				safeScrollTo(ref, y);
			}, tickMs);
		};

		if (!disabled) {
			if (!isFlipped) {
				start({
					ref: frontScrollRef,
					viewportH: frontViewportH,
					contentH: frontContentH,
					timerRef: frontAutoScrollTimer,
					resetTimeoutRef: frontResetTimeout,
				});
			} else {
				start({
					ref: backScrollRef,
					viewportH: backViewportH,
					contentH: backContentH,
					timerRef: backAutoScrollTimer,
					resetTimeoutRef: backResetTimeout,
				});
			}
		}

		return () => stopAutoScroll();
	}, [
		isFlipped,
		disabled,
		frontViewportH,
		frontContentH,
		backViewportH,
		backContentH,
		cardKey,
	]);

	const frontRotate = flipAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "180deg"],
	});

	const backRotate = flipAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ["180deg", "360deg"],
	});

	const frontOpacity = flipAnim.interpolate({
		inputRange: [0, 0.49, 0.5, 1],
		outputRange: [1, 1, 0, 0],
	});

	const backOpacity = flipAnim.interpolate({
		inputRange: [0, 0.49, 0.5, 1],
		outputRange: [0, 0, 1, 1],
	});

	return (
		<Pressable
			onPress={disabled ? undefined : onFlip}
			style={[styles.container, shadows.large, style]}
		>
			{/* Front Side */}
			<Animated.View
				style={[
					styles.card,
					{
						backgroundColor: theme.background.elevated,
						borderColor: theme.border.main,
					},
					{
						transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
						opacity: frontOpacity,
						backfaceVisibility: "hidden",
					},
				]}
			>
				{/* Purple accent bar */}
				<View style={[styles.accentBar, { backgroundColor: FRONT_ACCENT }]} />
				{/* Content */}
				<ScrollView
					ref={frontScrollRef}
					style={[styles.contentScroll]}
					contentContainerStyle={styles.contentScrollContent}
					showsVerticalScrollIndicator={false}
					scrollEnabled={autoScrollEnabledFront}
					onLayout={(e) => setFrontViewportH(e.nativeEvent.layout.height)}
					onContentSizeChange={(_w, h) => setFrontContentH(h)}
				>
					<Text
						style={[
							styles.text,
							styles.textBreathingRoom,
							isFrontVeryLong && styles.textSmall,
							{ color: theme.text.primary },
						]}
					>
						{frontText}
					</Text>
				</ScrollView>
				{/* Tap hint */}
				<View style={styles.hintRow}>
					<MaterialCommunityIcons
						name="gesture-tap"
						size={15}
						color={theme.text.disabled}
						style={styles.hintIcon}
					/>
					<Text style={[styles.hint, { color: theme.text.disabled }]}>
						{t("tap_to_flip")}
					</Text>
				</View>
			</Animated.View>

			{/* Back Side */}
			<Animated.View
				style={[
					styles.card,
					{
						backgroundColor: theme.background.elevated,
						borderColor: theme.border.main,
					},
					{
						transform: [{ perspective: 1000 }, { rotateY: backRotate }],
						opacity: backOpacity,
						backfaceVisibility: "hidden",
					},
				]}
			>
				{/* Green accent bar */}
				<View style={[styles.accentBar, { backgroundColor: BACK_ACCENT }]} />
				{/* BACK label (kept at top, never overlaps content) */}
				<Text style={styles.backLabel}>{t("flip_back_label")}</Text>
				{/* Content */}
				<ScrollView
					ref={backScrollRef}
					style={styles.contentScroll}
					contentContainerStyle={styles.contentScrollContent}
					showsVerticalScrollIndicator={false}
					scrollEnabled={autoScrollEnabledBack}
					onLayout={(e) => setBackViewportH(e.nativeEvent.layout.height)}
					onContentSizeChange={(_w, h) => setBackContentH(h)}
				>
					<Text
						style={[
							styles.text,
							styles.textBreathingRoom,
							isBackVeryLong && styles.textSmall,
							{ color: theme.text.primary },
						]}
					>
						{backText}
					</Text>
				</ScrollView>
				{/* Tap hint */}
				<View style={styles.hintRow}>
					<MaterialCommunityIcons
						name="gesture-tap"
						size={15}
						color={theme.text.disabled}
						style={styles.hintIcon}
					/>
					<Text style={[styles.hint, { color: theme.text.disabled }]}>
						{t("tap_to_flip_back")}
					</Text>
				</View>
			</Animated.View>
		</Pressable>
	);
};

const styles = StyleSheet.create({
	container: {
		width: "100%",
		aspectRatio: 1.5,
		alignItems: "center",
		justifyContent: "center",
	},
	card: {
		position: "absolute",
		width: "100%",
		height: "100%",
		borderRadius: borderRadius.xl,
		borderWidth: 2,
		overflow: "hidden",
		justifyContent: "center",
		alignItems: "center",
	},
	accentBar: {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		height: 4,
		borderTopLeftRadius: borderRadius.xl,
		borderTopRightRadius: borderRadius.xl,
	},
	backLabel: {
		position: "absolute",
		top: spacing.lg,
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 2,
		color: BACK_ACCENT,
		textTransform: "uppercase",
	},
	contentScroll: {
		width: "100%",
		alignSelf: "stretch",
		marginVertical: 45,
		// Horizontal padding so text never hugs edges
		paddingHorizontal: spacing.lg,
	},
	contentScrollContent: {
		// Fill available height so short text can be centered, but still keep
		// guaranteed top/bottom breathing room via padding.
		flexGrow: 1,
		justifyContent: "center",
		alignItems: "center",
		paddingTop: spacing.xl,
		paddingBottom: spacing.xl,
	},
	text: {
		fontSize: 24,
		fontWeight: "600",
		textAlign: "center",
		lineHeight: 32,
	},
	textSmall: {
		fontSize: 20,
		lineHeight: 28,
	},
	textBreathingRoom: {
		// A bit of space so centered text doesn't feel cramped when wrapping
		paddingVertical: spacing.sm,
	},
	hintRow: {
		position: "absolute",
		bottom: spacing.md,
		flexDirection: "row",
		alignItems: "center",
	},
	hintIcon: {
		marginRight: 4,
	},
	hint: {
		fontSize: 12,
	},
});

export default FlipCard;
