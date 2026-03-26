import { useRef, useEffect, useMemo, useState } from "react";
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
import useTTS from "../../hooks/useTTS";

const FRONT_ACCENT = "#8b5cf6";
const BACK_ACCENT = "#22c55e";

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
	const { isSpeaking, speak, stop } = useTTS();
	const { isSpeaking: isSpeakingBack, speak: speakBack, stop: stopBack } = useTTS();
	const flipAnim = useRef(new Animated.Value(0)).current;

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

	useEffect(() => {
		// Stop speech when card changes
		stop();
		stopBack();
		flipAnim.setValue(0);
		frontScrollRef.current?.scrollTo?.({ y: 0, animated: false });
		backScrollRef.current?.scrollTo?.({ y: 0, animated: false });
	}, [cardKey]);

	useEffect(() => {
		// Stop any ongoing speech when card flips
		stop();
		stopBack();
		Animated.timing(flipAnim, {
			toValue: isFlipped ? 1 : 0,
			duration: 400,
			useNativeDriver: true,
		}).start();
	}, [isFlipped]);

	const stopAutoScroll = () => {
		if (frontAutoScrollTimer.current) { clearInterval(frontAutoScrollTimer.current); frontAutoScrollTimer.current = null; }
		if (backAutoScrollTimer.current) { clearInterval(backAutoScrollTimer.current); backAutoScrollTimer.current = null; }
		if (frontResetTimeout.current) { clearTimeout(frontResetTimeout.current); frontResetTimeout.current = null; }
		if (backResetTimeout.current) { clearTimeout(backResetTimeout.current); backResetTimeout.current = null; }
	};

	useEffect(() => {
		stopAutoScroll();
		const safeScrollTo = (ref, y) => {
			const node = ref.current;
			if (!node || typeof node.scrollTo !== "function") return false;
			node.scrollTo({ y, animated: false });
			return true;
		};
		const start = ({ ref, viewportH, contentH, timerRef, resetTimeoutRef }) => {
			if (!(viewportH > 0 && contentH > viewportH + 8)) return;
			let y = 0;
			const maxY = Math.max(0, contentH - viewportH);
			const step = 1.2;
			const tickMs = 16;
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
					resetTimeoutRef.current = setTimeout(() => { safeScrollTo(ref, 0); }, pauseAtEndsMs);
					y = 0;
					pausedUntil = now + pauseAtEndsMs * 2;
					return;
				}
				safeScrollTo(ref, y);
			}, tickMs);
		};
		if (!disabled) {
			if (!isFlipped) {
				start({ ref: frontScrollRef, viewportH: frontViewportH, contentH: frontContentH, timerRef: frontAutoScrollTimer, resetTimeoutRef: frontResetTimeout });
			} else {
				start({ ref: backScrollRef, viewportH: backViewportH, contentH: backContentH, timerRef: backAutoScrollTimer, resetTimeoutRef: backResetTimeout });
			}
		}
		return () => stopAutoScroll();
	}, [isFlipped, disabled, frontViewportH, frontContentH, backViewportH, backContentH, cardKey]);

	const frontRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
	const backRotate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
	const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [1, 1, 0, 0] });
	const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.49, 0.5, 1], outputRange: [0, 0, 1, 1] });

	return (
		<Pressable
			onPress={disabled ? undefined : onFlip}
			style={[styles.container, shadows.large, style]}
		>
			{/* Front Side */}
				<Animated.View
					pointerEvents={isFlipped ? "none" : "auto"}
					style={[
					styles.card,
					{ backgroundColor: theme.background.elevated, borderColor: theme.border.main },
					{ transform: [{ perspective: 1000 }, { rotateY: frontRotate }], opacity: frontOpacity, backfaceVisibility: "hidden" },
				]}
			>
				<View style={[styles.accentBar, { backgroundColor: FRONT_ACCENT }]} />
				{/* TTS button inside front face — flips with card */}
				<Pressable
					onPress={(e) => { e.stopPropagation?.(); if (isFlipped) return; isSpeaking ? stop() : speak(frontText); }}
					hitSlop={8}
					style={styles.ttsButton}
				>
					<MaterialCommunityIcons name={isSpeaking ? "stop" : "volume-high"} size={24} color="#3b82f6" />
				</Pressable>
				<ScrollView
					ref={frontScrollRef}
					style={styles.contentScroll}
					contentContainerStyle={styles.contentScrollContent}
					showsVerticalScrollIndicator={false}
					scrollEnabled={autoScrollEnabledFront}
					onLayout={(e) => setFrontViewportH(e.nativeEvent.layout.height)}
					onContentSizeChange={(_w, h) => setFrontContentH(h)}
				>
					<Text style={[styles.text, styles.textBreathingRoom, isFrontVeryLong && styles.textSmall, { color: theme.text.primary }]}>
						{frontText}
					</Text>
				</ScrollView>
				<View style={styles.hintRow}>
					<MaterialCommunityIcons name="gesture-tap" size={15} color={theme.text.disabled} style={styles.hintIcon} />
					<Text style={[styles.hint, { color: theme.text.disabled }]}>{t("tap_to_flip")}</Text>
				</View>
			</Animated.View>

			{/* Back Side */}
			<Animated.View
				pointerEvents={isFlipped ? "auto" : "none"}
				style={[
					styles.card,
					{ backgroundColor: theme.background.elevated, borderColor: theme.border.main },
					{ transform: [{ perspective: 1000 }, { rotateY: backRotate }], opacity: backOpacity, backfaceVisibility: "hidden" },
				]}
			>
				<View style={[styles.accentBar, { backgroundColor: BACK_ACCENT }]} />
				<Text style={styles.backLabel}>{t("flip_back_label")}</Text>
				{/* TTS button inside back face — mirrored so it appears top-right when flipped */}
				<Pressable
					onPress={(e) => { e.stopPropagation?.(); if (!isFlipped) return; isSpeakingBack ? stopBack() : speakBack(backText); }}
					hitSlop={8}
					style={styles.ttsButtonMirrored}
				>
					<MaterialCommunityIcons name={isSpeakingBack ? "stop" : "volume-high"} size={24} color="#3b82f6" />
				</Pressable>
				<ScrollView
					ref={backScrollRef}
					style={styles.contentScroll}
					contentContainerStyle={styles.contentScrollContent}
					showsVerticalScrollIndicator={false}
					scrollEnabled={autoScrollEnabledBack}
					onLayout={(e) => setBackViewportH(e.nativeEvent.layout.height)}
					onContentSizeChange={(_w, h) => setBackContentH(h)}
				>
					<Text style={[styles.text, styles.textBreathingRoom, isBackVeryLong && styles.textSmall, { color: theme.text.primary }]}>
						{backText}
					</Text>
				</ScrollView>
				<View style={styles.hintRow}>
					<MaterialCommunityIcons name="gesture-tap" size={15} color={theme.text.disabled} style={styles.hintIcon} />
					<Text style={[styles.hint, { color: theme.text.disabled }]}>{t("tap_to_flip_back")}</Text>
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
	// Front face: top-right
	ttsButton: {
		position: "absolute",
		top: spacing.md + 4,
		right: spacing.md,
		zIndex: 10,
		padding: 4,
	},
	// Back face: top-left so it appears top-right after 180° mirror
	ttsButtonMirrored: {
		position: "absolute",
		top: spacing.md + 4,
		left: spacing.md,
		zIndex: 10,
		padding: 4,
	},
	contentScroll: {
		width: "100%",
		alignSelf: "stretch",
		marginVertical: 45,
		paddingHorizontal: spacing.lg,
	},
	contentScrollContent: {
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
