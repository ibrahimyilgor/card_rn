import React, { useState, useEffect, useCallback, useRef } from "react";
import {
	View,
	Text,
	StyleSheet,
	Pressable,
	ScrollView,
	TextInput,
	Dimensions,
	Switch,
	Animated,
	PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { useAchievement } from "../context/AchievementContext";
import { useAds } from "../context/AdContext";
import {
	gamesAPI,
	statsAPI,
	achievementsAPI,
	decksAPI,
} from "../services/api";
import {
	ThemedView,
	ThemedText,
	Button,
	Card,
	LoadingState,
	Modal,
} from "../components/ui";
import FlipCard from "../components/game/FlipCard";
import { useTimer, useLives } from "../hooks";
import sounds from "../utils/sounds";
import { spacing, borderRadius } from "../styles/theme";

// Mode colors matching web version
const MODE_COLORS = {
	standard: "#3b82f6",
	write: "#22c55e",
	multiple_choice: "#8b5cf6",
	match: "#ec4899",
};

const GAME_MODES = [
	{
		id: "standard",
		icon: "settings-outline",
		labelKey: "mode_standard",
		descKey: "mode_standard_desc",
	},
	{
		id: "write",
		icon: "create-outline",
		labelKey: "mode_write",
		descKey: "mode_write_desc",
	},
	{
		id: "multiple_choice",
		icon: "help-circle-outline",
		labelKey: "mode_multiple_choice",
		descKey: "mode_multiple_choice_desc",
	},
	{
		id: "match",
		icon: "grid-outline",
		labelKey: "mode_match",
		descKey: "mode_match_desc",
	},
];

// Challenge types (modifiers that can be applied to any game mode)
const CHALLENGE_TYPES = [
	{
		id: "none",
		icon: "infinite-outline",
		labelKey: "challenge_none",
		descKey: "challenge_none_desc",
		color: "#64748b",
	},
	{
		id: "timed",
		icon: "timer-outline",
		labelKey: "challenge_timed",
		descKey: "challenge_timed_desc",
		color: "#f59e0b",
	},
	{
		id: "survival",
		icon: "heart-outline",
		labelKey: "challenge_survival",
		descKey: "challenge_survival_desc",
		color: "#ef4444",
	},
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GameScreen = ({ route, navigation }) => {
	const { deck } = route.params;
	const { theme, shadows } = useTheme();
	const { t } = useI18n();
	const { showAchievements } = useAchievement();
	const { showInterstitial, showVideoAd } = useAds();

	// Game state
	const [gameState, setGameState] = useState("mode_select"); // 'mode_select' | 'playing' | 'summary'
	const [gameMode, setGameMode] = useState("standard");
	const [challengeType, setChallengeType] = useState("none"); // 'none' | 'timed' | 'survival'
	const [selectedMode, setSelectedMode] = useState("standard");
	const [selectedChallengeType, setSelectedChallengeType] = useState("none");
	const [cards, setCards] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isFlipped, setIsFlipped] = useState(false);
	const [correctCount, setCorrectCount] = useState(0);
	const [wrongCount, setWrongCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [accountId, setAccountId] = useState(null);

	// Settings state
	const [cardDirection, setCardDirection] = useState("normal"); // 'normal' | 'reverse'
	const [hardModeEnabled, setHardModeEnabled] = useState(false);
	const [settingsLoading, setSettingsLoading] = useState(true);
	const [timeLimit, setTimeLimit] = useState(60); // seconds for timed mode
	const [initialLives, setInitialLives] = useState(3); // lives for survival mode

	// Time options for timed mode (in seconds)
	const TIME_OPTIONS = [
		{ value: 60, label: "1 " + t("min") },
		{ value: 180, label: "3 " + t("min") },
		{ value: 300, label: "5 " + t("min") },
		{ value: 600, label: "10 " + t("min") },
	];

	// Lives options for survival mode
	const LIVES_OPTIONS = [1, 2, 3, 4, 5];

	// Mode-specific state
	const [userAnswer, setUserAnswer] = useState("");
	const [answerResult, setAnswerResult] = useState(null); // null | 'correct' | 'almost' | 'wrong'
	const [mcOptions, setMcOptions] = useState([]);
	const [selectedOption, setSelectedOption] = useState(null);
	const [showHint, setShowHint] = useState(false);

	// Match game state
	const [matchCards, setMatchCards] = useState([]);
	const [flippedIndices, setFlippedIndices] = useState([]);
	const [matchedPairs, setMatchedPairs] = useState([]);
	const [matchAttempts, setMatchAttempts] = useState(0);
	const [isCheckingMatch, setIsCheckingMatch] = useState(false);

	// Game start time for stats
	const gameStartTime = useRef(null);

	// Swipe animation for standard mode
	const swipeAnim = useRef(new Animated.ValueXY()).current;
	const swipeOpacity = useRef(new Animated.Value(1)).current;
	const handleAnswerRef = useRef(null);
	const advancingRef = useRef(false);
	const endedRef = useRef(false);
	const finishingRef = useRef(false);
	const sessionRecordedRef = useRef(false);
	const lastAnswerTimeRef = useRef(0);
	const [finishing, setFinishing] = useState(false);
	const lastAnswerRef = useRef(false);
	const [answering, setAnswering] = useState(false);

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, gestureState) => {
				// Only capture if horizontal movement is significant (swipe, not tap)
				return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 50;
			},
			onPanResponderMove: (_, gestureState) => {
				swipeAnim.setValue({ x: gestureState.dx, y: 0 });
			},
			onPanResponderRelease: (_, gestureState) => {
				const SWIPE_THRESHOLD = 100;
				if (gestureState.dx > SWIPE_THRESHOLD) {
					// Swiped right - correct
					Animated.parallel([
						Animated.timing(swipeAnim, {
							toValue: { x: SCREEN_WIDTH, y: 0 },
							duration: 200,
							useNativeDriver: true,
						}),
						Animated.timing(swipeOpacity, {
							toValue: 0,
							duration: 200,
							useNativeDriver: true,
						}),
					]).start(() => {
						// reset animated values first so the next card isn't rendered off-screen
						swipeAnim.setValue({ x: 0, y: 0 });
						swipeOpacity.setValue(1);
						// advance game after a tiny delay to ensure native driver has applied reset
						setTimeout(() => {
							if (handleAnswerRef.current) handleAnswerRef.current(true);
						}, 10);
					});
				} else if (gestureState.dx < -SWIPE_THRESHOLD) {
					// Swiped left - incorrect
					Animated.parallel([
						Animated.timing(swipeAnim, {
							toValue: { x: -SCREEN_WIDTH, y: 0 },
							duration: 200,
							useNativeDriver: true,
						}),
						Animated.timing(swipeOpacity, {
							toValue: 0,
							duration: 200,
							useNativeDriver: true,
						}),
					]).start(() => {
						// reset animated values first so the next card isn't rendered off-screen
						swipeAnim.setValue({ x: 0, y: 0 });
						swipeOpacity.setValue(1);
						// advance game after a tiny delay to ensure native driver has applied reset
						setTimeout(() => {
							if (handleAnswerRef.current) handleAnswerRef.current(false);
						}, 10);
					});
				} else {
					// Reset position
					Animated.spring(swipeAnim, {
						toValue: { x: 0, y: 0 },
						useNativeDriver: true,
					}).start();
				}
			},
		}),
	).current;

	const resetSwipeAnimation = () => {
		swipeAnim.setValue({ x: 0, y: 0 });
		swipeOpacity.setValue(1);
	};

	// Hooks
	const timer = useTimer(30, () => handleTimeUp());
	const lives = useLives(3, () => handleGameOver());

	// Load deck settings on mount
	useEffect(() => {
		const loadSettings = async () => {
			const id = await AsyncStorage.getItem("accountId");
			setAccountId(id);

			try {
				const res = await decksAPI.getSettings(deck.id);
				if (res.data && res.data.settings) {
					const settings = res.data.settings;
					setSelectedMode(settings.mode || "standard");
					setSelectedChallengeType(settings.challenge_type || "none");
					setCardDirection(settings.card_direction || "normal");
					setHardModeEnabled(settings.difficulty_enabled || false);
					setTimeLimit(settings.time_limit || 60);
					setInitialLives(settings.starting_lives || 3);
				}
			} catch (error) {
				console.error("Error loading deck settings:", error);
			} finally {
				setSettingsLoading(false);
			}
		};
		loadSettings();
	}, [deck.id]);

	// Reset challenge type to none if match mode is selected with survival
	useEffect(() => {
		if (selectedMode === "match" && selectedChallengeType === "survival") {
			setSelectedChallengeType("none");
		}
	}, [selectedMode]);

	const currentCard = cards[currentIndex];

	// Fetch cards based on mode and settings
	const fetchCards = async (mode, isHardMode) => {
		setLoading(true);
		try {
			let response;
			if (mode === "multiple_choice") {
				response = await gamesAPI.getMultipleChoice(deck.id);
				let flashcards = response.data?.flashcards || response.data || [];
				setCards(flashcards);
				if (flashcards.length > 0) {
					setMcOptions(flashcards[0].options || []);
				}
			} else {
				// Use hard cards if hard mode enabled
				response = isHardMode
					? await gamesAPI.getHardCards(deck.id)
					: await gamesAPI.getCards(deck.id);
				let flashcards = response.data?.flashcards || response.data || [];
				// Shuffle cards
				const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
				setCards(shuffled);

				// Setup match game
				if (mode === "match") {
					setupMatchGame(shuffled.slice(0, 6)); // Use 6 cards = 12 tiles
				}
			}
		} catch (error) {
			console.error("Error fetching cards:", error);
		} finally {
			setLoading(false);
		}
	};

	const setupMatchGame = (cardsToUse) => {
		const tiles = [];
		cardsToUse.forEach((card, idx) => {
			tiles.push({
				id: `front-${idx}`,
				cardId: card.id,
				text: card.front_text,
				type: "front",
				pairId: idx,
			});
			tiles.push({
				id: `back-${idx}`,
				cardId: card.id,
				text: card.back_text,
				type: "back",
				pairId: idx,
			});
		});
		// Shuffle tiles
		const shuffled = tiles.sort(() => Math.random() - 0.5);
		setMatchCards(shuffled);
	};

	// Save settings and start game
	const startGame = async () => {
		const mode = selectedMode;
		const challenge = selectedChallengeType;

		// Save settings to backend
		try {
			await decksAPI.updateSettings(deck.id, {
				mode: mode,
				challenge_type: challenge,
				card_direction: cardDirection,
				difficulty_enabled: hardModeEnabled,
				time_limit: timeLimit,
				starting_lives: initialLives,
			});
		} catch (error) {
			console.error("Error saving settings:", error);
		}

		setGameMode(mode);
		setChallengeType(challenge);
		setGameState("playing");
		setCurrentIndex(0);
		setCorrectCount(0);
		setWrongCount(0);
		setIsFlipped(false);
		setUserAnswer("");
		setAnswerResult(null);
		setSelectedOption(null);
		setShowHint(false);
		setMatchedPairs([]);
		setFlippedIndices([]);
		setMatchAttempts(0);
		setIsCheckingMatch(false);
		gameStartTime.current = Date.now();
		endedRef.current = false;
		lastAnswerRef.current = false;
		advancingRef.current = false;
		finishingRef.current = false;
		sessionRecordedRef.current = false;
		setAnswering(false);

		fetchCards(mode, hardModeEnabled);

		if (challenge === "timed") {
			timer.restart(timeLimit);
		}
		if (challenge === "survival") {
			lives.reset(initialLives);
		}
	};

	// Restart game without saving settings (for play again)
	const restartGame = () => {
		// Prevent restarting while endGame flow is still finishing
		if (finishingRef.current) return;
		const mode = gameMode;
		setGameState("playing");
		setCurrentIndex(0);
		setCorrectCount(0);
		setWrongCount(0);
		setIsFlipped(false);
		setUserAnswer("");
		setAnswerResult(null);
		setSelectedOption(null);
		setShowHint(false);
		setMatchedPairs([]);
		setFlippedIndices([]);
		setMatchAttempts(0);
		setIsCheckingMatch(false);
		gameStartTime.current = Date.now();
		endedRef.current = false;
		lastAnswerRef.current = false;
		advancingRef.current = false;
		finishingRef.current = false;
		sessionRecordedRef.current = false;
		setAnswering(false);

		fetchCards(mode, hardModeEnabled);

		if (challengeType === "timed") {
			timer.restart(timeLimit);
		}
		if (challengeType === "survival") {
			lives.reset(initialLives);
		}
	};

	const handleFlip = () => {
		setIsFlipped(!isFlipped);
		sounds.flip();
	};

	const handleAnswer = async (isCorrect) => {
		// Timestamp debounce: ignore taps within 400ms of the last accepted tap
		const now = Date.now();
		if (now - lastAnswerTimeRef.current < 400) return;
		lastAnswerTimeRef.current = now;

		// Prevent any answer processing if game already ended
		if (endedRef.current || finishingRef.current) return;

		// Prevent double-advancing (swipe + button, or double swipe)
		if (advancingRef.current) return;

		// If this is the final card, only allow one answer
		if (lastAnswerRef.current) return;
		if (cards && cards.length > 0 && currentIndex === cards.length - 1) {
			lastAnswerRef.current = true;
		}

		advancingRef.current = true;
		setAnswering(true);

		// Reset swipe animation for next card
		resetSwipeAnimation();

		// Calculate new counts immediately
		const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
		const newWrongCount = isCorrect ? wrongCount : wrongCount + 1;

		if (isCorrect) {
			setCorrectCount((prev) => prev + 1);
			sounds.correct();
		} else {
			setWrongCount((prev) => prev + 1);
			sounds.incorrect();
			if (challengeType === "survival") {
				lives.loseLife();
			}
		}

		// Update card stats
		try {
			await gamesAPI.updateCardStats(currentCard.id, isCorrect);
		} catch (error) {
			console.error("Error updating stats:", error);
		}

		// Next card or end (for timed/survival, reshuffle and continue)
		if (currentIndex + 1 >= cards.length) {
			if (challengeType === "timed" || challengeType === "survival") {
				// Reshuffle cards and continue
				const shuffled = [...cards].sort(() => Math.random() - 0.5);
				setCards(shuffled);
				setCurrentIndex(0);
				setIsFlipped(false);
				setUserAnswer("");
				setAnswerResult(null);
				setSelectedOption(null);
				if (gameMode === "multiple_choice" && shuffled[0]) {
					setMcOptions(shuffled[0].options || []);
				}
				// allow advancing again
				advancingRef.current = false;
			} else {
				// Pass the updated counts to endGame
				endGame(newCorrectCount, newWrongCount);
			}
		} else {
			nextCard();
		}
	};

	// Keep handleAnswerRef updated with the latest handleAnswer function
	useEffect(() => {
		handleAnswerRef.current = handleAnswer;
	});

	const nextCard = () => {
		// allow next advances
		advancingRef.current = false;
		setAnswering(false);
		setIsFlipped(false);
		setCurrentIndex((prev) => prev + 1);
		setUserAnswer("");
		setAnswerResult(null);
		setSelectedOption(null);
		setShowHint(false);

		if (gameMode === "multiple_choice" && cards[currentIndex + 1]) {
			setMcOptions(cards[currentIndex + 1].options || []);
		}
	};

	// Helper function to generate hint
	const getHint = () => {
		const correctAnswer = getBackText(currentCard);
		if (!correctAnswer) return "";
		const words = correctAnswer.split(" ");
		if (words.length > 1) {
			return words
				.map((word) => word.charAt(0) + "_".repeat(word.length - 1))
				.join(" ");
		}
		return (
			correctAnswer.charAt(0) +
			"_".repeat(Math.max(0, correctAnswer.length - 1))
		);
	};

	const handleTimeUp = () => {
		// In timed challenge, when total time is up, end the game
		if (challengeType === "timed") {
			endGame();
			return;
		}

		// For other modes with per-card timer (if any)
		setWrongCount((prev) => prev + 1);
		sounds.incorrect();

		if (currentIndex + 1 >= cards.length) {
			// Reshuffle cards and continue
			const shuffled = [...cards].sort(() => Math.random() - 0.5);
			setCards(shuffled);
			setCurrentIndex(0);
			setIsFlipped(false);
			setUserAnswer("");
			setAnswerResult(null);
		} else {
			nextCard();
		}
	};

	const handleGameOver = () => {
		endGame();
	};

	const handleWriteSubmit = async () => {
		if (!userAnswer.trim()) return;

		// Prevent double submission
		if (advancingRef.current || endedRef.current || finishingRef.current) return;
		advancingRef.current = true;

		try {
			const correctAnswer = getBackText(currentCard);
			const response = await gamesAPI.validateAnswer(
				currentCard.id,
				userAnswer.trim(),
				correctAnswer,
			);

			const { isCorrect, similarity } = response.data;

			if (isCorrect) {
				setAnswerResult("correct");
				sounds.correct();
				setCorrectCount((prev) => prev + 1);
			} else if (similarity >= 0.7) {
				setAnswerResult("almost");
				sounds.incorrect();
				setWrongCount((prev) => prev + 1);
			} else {
				setAnswerResult("wrong");
				sounds.incorrect();
				setWrongCount((prev) => prev + 1);
				if (challengeType === "survival") {
					lives.loseLife();
				}
			}

			await gamesAPI.updateCardStats(currentCard.id, isCorrect);

			// Auto advance after delay
			setTimeout(() => {
				if (currentIndex + 1 >= cards.length) {
					endGame();
				} else {
					nextCard();
				}
			}, 1500);
		} catch (error) {
			console.error("Error validating answer:", error);
		}
	};

	const handleMCSelect = async (optionIndex) => {
		// Prevent double selection
		if (advancingRef.current || endedRef.current || finishingRef.current) return;
		advancingRef.current = true;

		setSelectedOption(optionIndex);
		const option = mcOptions[optionIndex];
		// Options come as objects with {text, isCorrect} from backend
		const isCorrect = option?.isCorrect || false;

		if (isCorrect) {
			sounds.correct();
			setCorrectCount((prev) => prev + 1);
		} else {
			sounds.incorrect();
			setWrongCount((prev) => prev + 1);
			if (challengeType === "survival") {
				lives.loseLife();
			}
		}

		try {
			await gamesAPI.updateCardStats(currentCard.id, isCorrect);
		} catch (error) {
			console.error("Error updating stats:", error);
		}

		setTimeout(() => {
			if (currentIndex + 1 >= cards.length) {
				endGame();
			} else {
				nextCard();
			}
		}, 1000);
	};

	const handleMatchTilePress = (index) => {
		if (isCheckingMatch) return;
		if (
			flippedIndices.includes(index) ||
			matchedPairs.includes(matchCards[index].pairId)
		) {
			return;
		}

		const newFlipped = [...flippedIndices, index];
		setFlippedIndices(newFlipped);

		if (newFlipped.length === 2) {
			setIsCheckingMatch(true);
			setMatchAttempts((prev) => prev + 1);
			const [first, second] = newFlipped;
			const firstCard = matchCards[first];
			const secondCard = matchCards[second];

			if (
				firstCard.pairId === secondCard.pairId &&
				firstCard.type !== secondCard.type
			) {
				// Match!
				setTimeout(() => {
					sounds.correct();
					setMatchedPairs((prev) => [...prev, firstCard.pairId]);
					setFlippedIndices([]);
					setIsCheckingMatch(false);
					setCorrectCount((prev) => prev + 1);

					// Check if game complete
					if (matchedPairs.length + 1 === matchCards.length / 2) {
						setTimeout(() => endGame(), 500);
					}
				}, 500);
			} else {
				// No match
				setTimeout(() => {
					sounds.incorrect();
					setWrongCount((prev) => prev + 1);
					setFlippedIndices([]);
					setIsCheckingMatch(false);
				}, 1000);
			}
		}
	};

	const endGame = async (finalCorrect = null, finalWrong = null) => {
		// Prevent endGame from running twice per session
		if (endedRef.current || finishingRef.current) return;
		endedRef.current = true;
		finishingRef.current = true;
		setFinishing(true);

		timer.pause();
		sounds.complete();

		// Ads are handled by AdContext which checks the user's plan via PlanContext.
		// Free plan users see ads; premium and pro users skip ads entirely.
		try {
			if (showVideoAd) {
				await showVideoAd();
			} else {
				await showInterstitial();
			}
		} catch (e) {
			console.error("Ad display failed:", e);
		}

		setGameState("summary");

		// Use passed values or current state
		const correct = finalCorrect !== null ? finalCorrect : correctCount;
		const wrong = finalWrong !== null ? finalWrong : wrongCount;

		// Calculate duration
		const durationSeconds = Math.floor(
			(Date.now() - gameStartTime.current) / 1000,
		);

		// Match mode: track pairs matched, not correct/wrong (it's a memory game)
		const isMatchMode = gameMode === "match";
		const cardsStudied = isMatchMode ? matchedPairs.length : correct + wrong;

		// Calculate accuracy (not applicable for match mode)
		const total = correct + wrong;
		const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

		console.log("Game ended - Stats:", {
			correct,
			wrong,
			total,
			accuracy,
			isMatchMode,
		});

		// Record session (only once per game - sessionRecordedRef prevents duplicates)
		if (accountId && !sessionRecordedRef.current) {
			sessionRecordedRef.current = true;
			try {
				await statsAPI.recordSession({
					deckId: deck.id,
					gameMode: gameMode,
					challengeType: challengeType,
					cardsStudied: cardsStudied,
					// Match mode: don't track correct/wrong (memory game, not knowledge test)
					correctAnswers: isMatchMode ? 0 : correct,
					wrongAnswers: isMatchMode ? 0 : wrong,
					durationSeconds: durationSeconds,
				});

				// Check achievements (skip accuracy for match mode)
				console.log("Checking achievements with:", {
					accuracy: isMatchMode ? 0 : accuracy,
					cardsStudied,
				});
				const achievementResponse = await achievementsAPI.checkAndAward({
					accuracy: isMatchMode ? 0 : accuracy,
					cardsStudied: cardsStudied,
				});

				console.log("Achievement response:", achievementResponse.data);

				if (achievementResponse.data?.newlyEarned?.length > 0) {
					showAchievements(achievementResponse.data.newlyEarned);
				}
			} catch (error) {
				console.error("Error recording session:", error);
			}
		}

		// Allow restarting — clear advancing/finishing flags.
		// endedRef stays true to block any late callbacks; it resets in startGame/restartGame.
		advancingRef.current = false;
		finishingRef.current = false;
		setFinishing(false);
	};

	const getSuccessRate = () => {
		const total = correctCount + wrongCount;
		if (total === 0) return 0;
		return Math.round((correctCount / total) * 100);
	};

	const getResultMessage = () => {
		const rate = getSuccessRate();
		if (rate >= 95) return t("outstanding");
		if (rate >= 80) return t("excellent");
		if (rate >= 60) return t("good_job");
		if (rate >= 40) return t("keep_practicing");
		return t("need_more_practice");
	};

	// Get grade and color based on success rate
	const getGrade = () => {
		const percentage = getSuccessRate();

		// Survival challenge - game over
		if (challengeType === "survival" && lives.lives === 0) {
			return {
				grade: "💀",
				message: t("game_over") || "Game Over!",
				color: "#ef4444",
			};
		}

		if (percentage >= 90)
			return { grade: "A+", message: t("outstanding"), color: "#22c55e" };
		if (percentage >= 80)
			return { grade: "A", message: t("excellent"), color: "#22c55e" };
		if (percentage >= 70)
			return { grade: "B", message: t("good_job"), color: "#3b82f6" };
		if (percentage >= 60)
			return { grade: "C", message: t("keep_practicing"), color: "#f59e0b" };
		return { grade: "D", message: t("need_more_practice"), color: "#ef4444" };
	};

	// Render Mode Selection
	const renderModeSelect = () => {
		if (settingsLoading) {
			return <LoadingState fullScreen message={t("loading")} />;
		}

		const currentMode = GAME_MODES.find((m) => m.id === selectedMode);
		const modeColor = MODE_COLORS[selectedMode] || "#3b82f6";

		return (
			<ScrollView contentContainerStyle={styles.modeSelectContainer}>
				<ThemedText variant="h2" style={styles.modeTitle}>
					{t("select_game_mode")}
				</ThemedText>
				<ThemedText color="secondary" style={styles.deckName}>
					{deck.title}
				</ThemedText>

				{/* Game Modes Grid */}
				<View style={styles.modesGrid}>
					{GAME_MODES.map((mode) => {
						const color = MODE_COLORS[mode.id];
						const isSelected = selectedMode === mode.id;

						return (
							<Pressable
								key={mode.id}
								onPress={() => setSelectedMode(mode.id)}
								style={({ pressed }) => [
									styles.modeCard,
									{
										backgroundColor: isSelected
											? `${color}15`
											: theme.background.card,
										borderColor: isSelected ? color : theme.border.main,
										borderWidth: isSelected ? 2 : 1,
										opacity: pressed ? 0.8 : 1,
									},
								]}
							>
								<View
									style={[
										styles.modeIconContainer,
										{
											backgroundColor: isSelected ? color : `${color}20`,
											shadowColor: isSelected ? color : "transparent",
											shadowOffset: { width: 0, height: 4 },
											shadowOpacity: isSelected ? 0.4 : 0,
											shadowRadius: 8,
											elevation: isSelected ? 4 : 0,
										},
									]}
								>
									<Ionicons
										name={mode.icon}
										size={22}
										color={isSelected ? "#fff" : color}
									/>
								</View>
								<ThemedText
									style={[
										styles.modeLabel,
										{ color: isSelected ? color : theme.text.primary },
									]}
								>
									{t(mode.labelKey)}
								</ThemedText>
							</Pressable>
						);
					})}
				</View>

				{/* Mode Description */}
				<View
					style={[
						styles.modeDescription,
						{
							backgroundColor: `${modeColor}12`,
							borderColor: `${modeColor}30`,
						},
					]}
				>
					<ThemedText style={[styles.modeDescText, { color: modeColor }]}>
						{t(currentMode?.descKey || "mode_standard_desc")}
					</ThemedText>
				</View>

				{/* Challenge Type Selection */}
				<View style={styles.challengeSection}>
					<ThemedText variant="h3" style={styles.challengeTitle}>
						{t("challenge_type") || "Challenge Type"}
					</ThemedText>
					<View style={styles.challengeTypesRow}>
						{CHALLENGE_TYPES.map((challenge) => {
							const isSelected = selectedChallengeType === challenge.id;
							const isDisabled =
								selectedMode === "match" && challenge.id === "survival";

							return (
								<Pressable
									key={challenge.id}
									onPress={() =>
										!isDisabled && setSelectedChallengeType(challenge.id)
									}
									disabled={isDisabled}
									style={({ pressed }) => [
										styles.challengeCard,
										{
											backgroundColor: isSelected
												? `${challenge.color}15`
												: theme.background.card,
											borderColor: isSelected
												? challenge.color
												: theme.border.main,
											borderWidth: isSelected ? 2 : 1,
											opacity: isDisabled ? 0.4 : pressed ? 0.8 : 1,
										},
									]}
								>
									<View
										style={[
											styles.challengeIconContainer,
											{
												backgroundColor: isSelected
													? challenge.color
													: `${challenge.color}20`,
											},
										]}
									>
										<Ionicons
											name={challenge.icon}
											size={24}
											color={isSelected ? "#fff" : challenge.color}
										/>
									</View>
									<ThemedText
										style={[
											styles.challengeLabel,
											{
												color: isSelected
													? challenge.color
													: theme.text.primary,
											},
										]}
									>
										{t(challenge.labelKey) || challenge.id}
									</ThemedText>
								</Pressable>
							);
						})}
					</View>
					{selectedMode === "match" && (
						<ThemedText color="secondary" style={styles.challengeNote}>
							{t("match_no_survival") ||
								"Match mode doesn't support survival challenge"}
						</ThemedText>
					)}
				</View>

				{/* Timed Challenge - Time Selection */}
				{selectedChallengeType === "timed" && (
					<View
						style={[
							styles.modeSpecificCard,
							{
								backgroundColor: "#f59e0b08",
								borderColor: "#f59e0b30",
							},
						]}
					>
						<View style={styles.modeSpecificHeader}>
							<View
								style={[
									styles.modeSpecificIcon,
									{ backgroundColor: "#f59e0b20" },
								]}
							>
								<Ionicons name="timer-outline" size={18} color="#f59e0b" />
							</View>
							<ThemedText
								style={[styles.modeSpecificTitle, { color: "#f59e0b" }]}
							>
								{t("game_duration") || "Game Duration"}
							</ThemedText>
						</View>
						<View style={styles.segmentedControl}>
							{TIME_OPTIONS.map((option, index) => {
								const isSelected = timeLimit === option.value;
								const isFirst = index === 0;
								const isLast = index === TIME_OPTIONS.length - 1;
								return (
									<Pressable
										key={option.value}
										onPress={() => setTimeLimit(option.value)}
										style={[
											styles.segmentedButton,
											isFirst && styles.segmentedButtonFirst,
											isLast && styles.segmentedButtonLast,
											{
												backgroundColor: isSelected ? "#f59e0b" : "transparent",
												borderColor: "#f59e0b40",
											},
										]}
									>
										<Text
											style={[
												styles.segmentedButtonText,
												{ color: isSelected ? "#fff" : "#f59e0b" },
											]}
										>
											{option.label}
										</Text>
									</Pressable>
								);
							})}
						</View>
					</View>
				)}

				{/* Survival Challenge - Lives Selection */}
				{selectedChallengeType === "survival" && (
					<View
						style={[
							styles.modeSpecificCard,
							{
								backgroundColor: "#ef444408",
								borderColor: "#ef444430",
							},
						]}
					>
						<View style={styles.modeSpecificHeader}>
							<View
								style={[
									styles.modeSpecificIcon,
									{ backgroundColor: "#ef444420" },
								]}
							>
								<Ionicons name="heart" size={18} color="#ef4444" />
							</View>
							<ThemedText
								style={[styles.modeSpecificTitle, { color: "#ef4444" }]}
							>
								{t("starting_lives") || "Starting Lives"}
							</ThemedText>
						</View>
						<View style={styles.livesRow}>
							{LIVES_OPTIONS.map((num) => {
								const isSelected = initialLives === num;
								return (
									<Pressable
										key={num}
										onPress={() => setInitialLives(num)}
										style={[
											styles.heartButton,
											{
												backgroundColor: isSelected ? "#ef4444" : "#ef444415",
												transform: [{ scale: isSelected ? 1.1 : 1 }],
											},
										]}
									>
										<Ionicons
											name={isSelected ? "heart" : "heart-outline"}
											size={20}
											color={isSelected ? "#fff" : "#ef4444"}
										/>
										<Text
											style={[
												styles.heartButtonText,
												{ color: isSelected ? "#fff" : "#ef4444" },
											]}
										>
											{num}
										</Text>
									</Pressable>
								);
							})}
						</View>
					</View>
				)}

				{/* Settings Section */}
				<View style={styles.settingsSection}>
					{/* Card Direction */}
					<View
						style={[
							styles.settingCard,
							{
								backgroundColor: theme.background.card,
								borderColor: theme.border.main,
							},
						]}
					>
						<View style={styles.settingInfo}>
							<View
								style={[
									styles.settingIconContainer,
									{ backgroundColor: "#06b6d420" },
								]}
							>
								<Ionicons
									name="swap-horizontal-outline"
									size={20}
									color="#06b6d4"
								/>
							</View>
							<View style={styles.settingTextContainer}>
								<ThemedText style={styles.settingTitle}>
									{t("card_direction")}
								</ThemedText>
								<ThemedText color="secondary" style={styles.settingDesc}>
									{t("card_direction_desc")}
								</ThemedText>
							</View>
						</View>
						<View style={styles.toggleGroup}>
							<Pressable
								onPress={() => setCardDirection("normal")}
								style={[
									styles.toggleButton,
									styles.toggleButtonLeft,
									cardDirection === "normal" && styles.toggleButtonActive,
									{
										borderColor:
											cardDirection === "normal"
												? "#06b6d4"
												: theme.border.main,
										backgroundColor:
											cardDirection === "normal" ? "#06b6d420" : "transparent",
									},
								]}
							>
								<Text
									style={[
										styles.toggleText,
										{
											color:
												cardDirection === "normal"
													? "#06b6d4"
													: theme.text.secondary,
										},
									]}
								>
									{t("direction_normal")}
								</Text>
							</Pressable>
							<Pressable
								onPress={() => setCardDirection("reverse")}
								style={[
									styles.toggleButton,
									styles.toggleButtonRight,
									cardDirection === "reverse" && styles.toggleButtonActive,
									{
										borderColor:
											cardDirection === "reverse"
												? "#06b6d4"
												: theme.border.main,
										backgroundColor:
											cardDirection === "reverse" ? "#06b6d420" : "transparent",
									},
								]}
							>
								<Text
									style={[
										styles.toggleText,
										{
											color:
												cardDirection === "reverse"
													? "#06b6d4"
													: theme.text.secondary,
										},
									]}
								>
									{t("direction_reverse")}
								</Text>
							</Pressable>
						</View>
					</View>

					{/* Hard Mode */}
					<View
						style={[
							styles.settingCard,
							{
								backgroundColor: theme.background.card,
								borderColor: theme.border.main,
							},
						]}
					>
						<View style={styles.settingInfo}>
							<View
								style={[
									styles.settingIconContainer,
									{ backgroundColor: "#f9731620" },
								]}
							>
								<Ionicons name="flame-outline" size={20} color="#f97316" />
							</View>
							<View style={styles.settingTextContainer}>
								<ThemedText style={styles.settingTitle}>
									{t("hard_mode")}
								</ThemedText>
								<ThemedText color="secondary" style={styles.settingDesc}>
									{t("hard_mode_desc")}
								</ThemedText>
							</View>
						</View>
						<Switch
							value={hardModeEnabled}
							onValueChange={setHardModeEnabled}
							trackColor={{ false: theme.border.main, true: "#f9731680" }}
							thumbColor={hardModeEnabled ? "#f97316" : "#f4f3f4"}
						/>
					</View>
				</View>

				{/* Start Game Button */}
				<View style={styles.startButtonContainer}>
					<Pressable
						onPress={startGame}
						style={({ pressed }) => [
							styles.startButton,
							{
								backgroundColor: modeColor,
								opacity: pressed ? 0.9 : 1,
							},
						]}
					>
						<Ionicons name="play" size={20} color="#fff" />
						<Text style={styles.startButtonText}>{t("start_game")}</Text>
					</Pressable>
				</View>
			</ScrollView>
		);
	};

	// Render Playing State
	const renderPlaying = () => {
		if (loading) {
			return <LoadingState fullScreen message={t("loading_cards")} />;
		}

		if (cards.length === 0) {
			return (
				<View style={styles.emptyContainer}>
					<ThemedText>{t("no_flashcards")}</ThemedText>
					<Button
						onPress={() => navigation.goBack()}
						style={{ marginTop: spacing.lg }}
					>
						{t("back_to_decks")}
					</Button>
				</View>
			);
		}

		return (
			<View style={styles.gameContainer}>
				{/* Header */}
				<View style={styles.gameHeader}>
					<Pressable onPress={() => setGameState("mode_select")}>
						<Ionicons
							name="arrow-back"
							size={24}
							color={theme.text.secondary}
						/>
					</Pressable>

					<View style={styles.progressInfo}>
						{/* Show card counter for non-timed and non-survival challenges */}
						{challengeType !== "timed" && challengeType !== "survival" && (
							<ThemedText style={styles.progressText}>
								{currentIndex + 1} / {cards.length}
							</ThemedText>
						)}
						{challengeType === "timed" && (
							<Text
								style={[
									styles.timerText,
									{
										color:
											timer.timeLeft < 10
												? theme.error.main
												: theme.primary.main,
									},
								]}
							>
								{timer.formattedTime}
							</Text>
						)}
						{challengeType === "survival" && (
							<View style={styles.livesContainer}>
								{Array.from({ length: lives.lives }, (_, i) => (
									<Ionicons
										key={i}
										name="heart"
										size={22}
										color="#ef4444"
										style={{ marginHorizontal: 2 }}
									/>
								))}
								{Array.from(
									{ length: lives.maxLives - lives.lives },
									(_, i) => (
										<Ionicons
											key={`empty-${i}`}
											name="heart-outline"
											size={22}
											color="#ef4444"
											style={{ marginHorizontal: 2 }}
										/>
									),
								)}
							</View>
						)}
					</View>

					<Pressable onPress={restartGame} style={styles.restartButton}>
						<Ionicons name="refresh" size={22} color={theme.primary.main} />
					</Pressable>
				</View>

				{/* Progress Bar - Only for non-timed and non-survival challenges */}
				{challengeType !== "timed" && challengeType !== "survival" && (
					<View
						style={[styles.progressBar, { backgroundColor: theme.border.main }]}
					>
						<View
							style={[
								styles.progressFill,
								{
									backgroundColor: theme.primary.main,
									width: `${((currentIndex + 1) / cards.length) * 100}%`,
								},
							]}
						/>
					</View>
				)}

				{/* Score Info - Under Progress Bar */}
				<View style={styles.scoreInfoRow}>
					<View
						style={[
							styles.scoreBadge,
							{ backgroundColor: "rgba(34, 197, 94, 0.15)" },
						]}
					>
						<Ionicons name="checkmark-circle" size={16} color="#22c55e" />
						<Text style={[styles.scoreBadgeText, { color: "#22c55e" }]}>
							{correctCount}
						</Text>
					</View>
					<View
						style={[
							styles.scoreBadge,
							{ backgroundColor: "rgba(239, 68, 68, 0.15)" },
						]}
					>
						<Ionicons name="close-circle" size={16} color="#ef4444" />
						<Text style={[styles.scoreBadgeText, { color: "#ef4444" }]}>
							{wrongCount}
						</Text>
					</View>
				</View>

				{/* Game Content */}
				<View style={styles.gameContent}>
					{gameMode === "match"
						? renderMatchGame()
						: gameMode === "write"
							? renderWriteMode()
							: gameMode === "multiple_choice"
								? renderMultipleChoice()
								: renderStandardMode()}
				</View>
			</View>
		);
	};

	// Get card texts based on direction setting
	const getFrontText = (card) => {
		if (!card) return "";
		return cardDirection === "reverse" ? card.back_text : card.front_text;
	};

	const getBackText = (card) => {
		if (!card) return "";
		return cardDirection === "reverse" ? card.front_text : card.back_text;
	};

	// Render Standard Mode
	const renderStandardMode = () => {
		// Calculate swipe indicator colors based on swipe position
		const swipeIndicatorLeft = swipeAnim.x.interpolate({
			inputRange: [-SCREEN_WIDTH, 0],
			outputRange: [1, 0],
			extrapolate: "clamp",
		});
		const swipeIndicatorRight = swipeAnim.x.interpolate({
			inputRange: [0, SCREEN_WIDTH],
			outputRange: [0, 1],
			extrapolate: "clamp",
		});

		return (
			<View style={styles.standardMode}>
				{/* Swipe Indicators */}
				<View style={styles.swipeIndicators}>
					<Animated.View
						style={[styles.swipeIndicatorLeft, { opacity: swipeIndicatorLeft }]}
					>
						<Ionicons name="close-circle" size={32} color="#ef4444" />
					</Animated.View>
					<Animated.View
						style={[
							styles.swipeIndicatorRight,
							{ opacity: swipeIndicatorRight },
						]}
					>
						<Ionicons name="checkmark-circle" size={32} color="#22c55e" />
					</Animated.View>
				</View>

				{/* Swipeable Card */}
				<Animated.View
					{...panResponder.panHandlers}
					style={[
						styles.swipeableCard,
						{
							transform: [{ translateX: swipeAnim.x }],
							opacity: swipeOpacity,
						},
					]}
				>
					<FlipCard
						frontText={getFrontText(currentCard)}
						backText={getBackText(currentCard)}
						isFlipped={isFlipped}
						onFlip={handleFlip}
						cardKey={currentCard?.id || currentIndex}
					/>
				</Animated.View>

				{/* Answer Buttons - Always Visible */}
				<View style={styles.answerButtons}>
					<Button
						variant="danger"
						onPress={() => handleAnswer(false)}
						style={[styles.answerButton, answering && { opacity: 0.5 }]}
						size="large"
						disabled={answering}
					>
						<View style={styles.answerButtonContent}>
							<Ionicons name="close" size={20} color="#ffffff" />
							<Text style={styles.answerButtonText}>{t("incorrect")}</Text>
						</View>
					</Button>
					<Button
						variant="success"
						onPress={() => handleAnswer(true)}
						style={[styles.answerButton, answering && { opacity: 0.5 }]}
						size="large"
						disabled={answering}
					>
						<View style={styles.answerButtonContent}>
							<Ionicons name="checkmark" size={20} color="#ffffff" />
							<Text style={styles.answerButtonText}>{t("correct")}</Text>
						</View>
					</Button>
				</View>

				{/* Swipe Hint */}
				<View style={styles.swipeHintContainer}>
					<Ionicons
						name="swap-horizontal"
						size={16}
						color={theme.text.disabled}
					/>
					<Text style={[styles.swipeHintText, { color: theme.text.disabled }]}>
						{t("swipe_hint") || "Swipe left for incorrect, right for correct"}
					</Text>
				</View>
			</View>
		);
	};

	// Render Write Mode
	const renderWriteMode = () => (
		<View style={styles.writeMode}>
			<Card variant="elevated" style={styles.questionCard}>
				<ThemedText style={styles.questionText}>
					{getFrontText(currentCard)}
				</ThemedText>
			</Card>

			<TextInput
				style={[
					styles.writeInput,
					{
						backgroundColor: theme.background.paper,
						borderColor: answerResult
							? answerResult === "correct"
								? theme.success.main
								: theme.error.main
							: theme.border.main,
						color: theme.text.primary,
					},
				]}
				placeholder={t("type_your_answer")}
				placeholderTextColor={theme.text.disabled}
				value={userAnswer}
				onChangeText={setUserAnswer}
				editable={!answerResult}
				onSubmitEditing={handleWriteSubmit}
			/>

			{/* Hint Section */}
			{!answerResult && (
				<View style={styles.writeButtonRow}>
					<Pressable
						onPress={() => setShowHint(!showHint)}
						style={[styles.hintButton, { borderColor: theme.border.main }]}
					>
						<Ionicons name="bulb-outline" size={18} color="#f59e0b" />
						<Text
							style={[styles.hintButtonText, { color: theme.text.secondary }]}
						>
							{showHint ? t("hide_hint") : t("show_hint")}
						</Text>
					</Pressable>

					<Button
						onPress={handleWriteSubmit}
						size="large"
						disabled={!userAnswer.trim()}
					>
						{t("submit")}
					</Button>
				</View>
			)}

			{showHint && !answerResult && (
				<View
					style={[
						styles.hintBox,
						{ backgroundColor: "#f59e0b20", borderColor: "#f59e0b40" },
					]}
				>
					<Text style={styles.hintText}>{getHint()}</Text>
				</View>
			)}

			{answerResult && (
				<View
					style={[
						styles.answerFeedback,
						{
							backgroundColor:
								answerResult === "correct" ? "#22c55e20" : "#ef444420",
							borderColor:
								answerResult === "correct" ? "#22c55e40" : "#ef444440",
						},
					]}
				>
					<View style={styles.feedbackHeader}>
						<Ionicons
							name={
								answerResult === "correct" ? "checkmark-circle" : "close-circle"
							}
							size={24}
							color={answerResult === "correct" ? "#22c55e" : "#ef4444"}
						/>
						<Text
							style={{
								color: answerResult === "correct" ? "#22c55e" : "#ef4444",
								fontSize: 18,
								fontWeight: "600",
								marginLeft: spacing.sm,
							}}
						>
							{answerResult === "correct"
								? t("correct_answer")
								: answerResult === "almost"
									? t("almost_correct")
									: t("wrong_answer")}
						</Text>
					</View>
					{answerResult !== "correct" && (
						<ThemedText color="secondary" style={{ marginTop: spacing.sm }}>
							{t("correct_was")}{" "}
							<Text style={{ fontWeight: "600" }}>
								{getBackText(currentCard)}
							</Text>
						</ThemedText>
					)}
				</View>
			)}
		</View>
	);

	// Option labels for multiple choice
	const optionLabels = ["A", "B", "C", "D"];

	// Render Multiple Choice
	const renderMultipleChoice = () => {
		return (
			<View style={styles.mcMode}>
				<Card variant="elevated" style={styles.questionCard}>
					<ThemedText style={styles.questionText}>
						{getFrontText(currentCard)}
					</ThemedText>
				</Card>

				<View style={styles.mcOptions}>
					{mcOptions.map((option, index) => {
						const isSelected = selectedOption === index;
						// Options come as objects with {text, isCorrect} from backend
						const optionText =
							typeof option === "object" ? option.text : option;
						const isCorrect =
							typeof option === "object" ? option.isCorrect : false;
						const showResult = selectedOption !== null;

						// Determine background and border colors
						let bgColor = theme.background.paper;
						let borderColor = theme.border.main;
						let labelBgColor = theme.background.card;

						if (showResult) {
							if (isCorrect) {
								bgColor = "#22c55e20";
								borderColor = "#22c55e";
								labelBgColor = "#22c55e";
							} else if (isSelected && !isCorrect) {
								bgColor = "#ef444420";
								borderColor = "#ef4444";
								labelBgColor = "#ef4444";
							}
						} else if (isSelected) {
							bgColor = `${theme.primary.main}20`;
							borderColor = theme.primary.main;
							labelBgColor = theme.primary.main;
						}

						return (
							<Pressable
								key={index}
								onPress={() => selectedOption === null && handleMCSelect(index)}
								style={[
									styles.mcOption,
									{
										backgroundColor: bgColor,
										borderColor: borderColor,
									},
								]}
							>
								{/* Letter Label */}
								<View
									style={[
										styles.mcOptionLabel,
										{
											backgroundColor:
												(showResult && (isCorrect || isSelected)) || isSelected
													? labelBgColor
													: theme.background.card,
										},
									]}
								>
									<Text
										style={[
											styles.mcOptionLabelText,
											{
												color:
													(showResult && (isCorrect || isSelected)) ||
													isSelected
														? "#fff"
														: theme.text.primary,
											},
										]}
									>
										{optionLabels[index]}
									</Text>
								</View>

								{/* Option Text */}
								<Text
									style={[styles.mcOptionText, { color: theme.text.primary }]}
								>
									{optionText}
								</Text>

								{/* Result Icon */}
								{showResult && (isCorrect || (isSelected && !isCorrect)) && (
									<Ionicons
										name={isCorrect ? "checkmark-circle" : "close-circle"}
										size={22}
										color={isCorrect ? "#22c55e" : "#ef4444"}
										style={styles.mcResultIcon}
									/>
								)}
							</Pressable>
						);
					})}
				</View>
			</View>
		);
	};

	// Render Match Game
	const renderMatchGame = () => (
		<View style={styles.matchMode}>
			{/* Match Stats Header */}
			<View style={styles.matchStatsRow}>
				<View style={styles.matchStatItem}>
					<ThemedText color="secondary" style={styles.matchStatLabel}>
						{t("matches")}
					</ThemedText>
					<ThemedText style={styles.matchStatValue}>
						{matchedPairs.length} / {matchCards.length / 2}
					</ThemedText>
				</View>
				<View style={styles.matchStatItem}>
					<ThemedText color="secondary" style={styles.matchStatLabel}>
						{t("attempts")}
					</ThemedText>
					<ThemedText style={styles.matchStatValue}>{matchAttempts}</ThemedText>
				</View>
			</View>

			<View style={styles.matchGrid}>
				{matchCards.map((tile, index) => {
					const isFlipped =
						flippedIndices.includes(index) ||
						matchedPairs.includes(tile.pairId);
					const isMatched = matchedPairs.includes(tile.pairId);

					// Gradient colors for unflipped cards
					const gradientStart = "#3b82f6";
					const gradientEnd = "#8b5cf6";

					return (
						<Pressable
							key={tile.id}
							onPress={() => !isCheckingMatch && handleMatchTilePress(index)}
							disabled={isMatched || isCheckingMatch}
							style={({ pressed }) => [
								styles.matchTile,
								{
									opacity: isMatched ? 0.6 : pressed && !isFlipped ? 0.9 : 1,
									transform: [
										{ scale: pressed && !isFlipped && !isMatched ? 0.95 : 1 },
									],
								},
							]}
						>
							{/* Card Back (Question Mark) */}
							{!isFlipped && !isMatched && (
								<View style={[styles.matchTileInner, styles.matchTileBack]}>
									<Text style={styles.matchTileQuestion}>?</Text>
								</View>
							)}

							{/* Card Front (Content) */}
							{(isFlipped || isMatched) && (
								<View
									style={[
										styles.matchTileInner,
										styles.matchTileFront,
										{
											backgroundColor: isMatched
												? "#22c55e"
												: theme.background.elevated,
											borderColor: isMatched ? "#22c55e" : theme.border.main,
										},
									]}
								>
									{isMatched && (
										<Ionicons
											name="checkmark-circle"
											size={20}
											color="#fff"
											style={styles.matchTileIcon}
										/>
									)}
									<Text
										style={[
											styles.matchTileText,
											{ color: isMatched ? "#fff" : theme.text.primary },
										]}
										numberOfLines={3}
									>
										{tile.text}
									</Text>
									<Text
										style={[
											styles.matchTileType,
											{
												color: isMatched
													? "rgba(255,255,255,0.7)"
													: theme.text.disabled,
											},
										]}
									>
										{tile.type === "front" ? t("question") : t("answer")}
									</Text>
								</View>
							)}
						</Pressable>
					);
				})}
			</View>
		</View>
	);

	// Render Summary
	const renderSummary = () => {
		const { grade, message, color: gradeColor } = getGrade();
		const percentage = getSuccessRate();
		const totalCards = correctCount + wrongCount;

		// StatItem component
		const StatItem = ({ value, label, color, iconName }) => (
			<View
				style={[
					styles.statItem,
					{
						backgroundColor: `${color}15`,
						borderColor: `${color}30`,
					},
				]}
			>
				<View
					style={[styles.statIconContainer, { backgroundColor: `${color}25` }]}
				>
					<Ionicons name={iconName} size={18} color={color} />
				</View>
				<Text style={[styles.statItemValue, { color }]}>{value}</Text>
				<Text style={[styles.statItemLabel, { color: theme.text.secondary }]}>
					{label}
				</Text>
			</View>
		);

		return (
			<ScrollView
				style={styles.summaryScrollView}
				contentContainerStyle={styles.summaryContainer}
				showsVerticalScrollIndicator={false}
			>
				{/* Main Card */}
				<Card variant="elevated" style={styles.summaryCard}>
					{/* Title */}
					<ThemedText variant="h2" style={styles.summaryTitle}>
						{t("game_summary")}
					</ThemedText>
					<Text style={[styles.summaryMessage, { color: gradeColor }]}>
						{message}
					</Text>

					{/* Percentage Circle - Hide for match mode */}
					{gameMode !== "match" && (
						<View style={styles.percentageCircleContainer}>
							{/* Background Circle */}
							<View
								style={[
									styles.percentageCircleBg,
									{ borderColor: `${theme.text.secondary}20` },
								]}
							/>
							{/* Progress Arc - using multiple segments for visual effect */}
							<View style={styles.percentageCircleProgress}>
								{/* Simple filled arc approximation */}
								<View
									style={[
										styles.percentageArc,
										{
											borderColor: gradeColor,
											borderTopColor:
												percentage >= 25 ? gradeColor : "transparent",
											borderRightColor:
												percentage >= 50 ? gradeColor : "transparent",
											borderBottomColor:
												percentage >= 75 ? gradeColor : "transparent",
											borderLeftColor:
												percentage >= 100 ? gradeColor : "transparent",
											transform: [
												{ rotate: `${(percentage / 100) * 360 - 90}deg` },
											],
										},
									]}
								/>
							</View>
							{/* Inner content */}
							<View style={styles.percentageContent}>
								<Text style={[styles.percentageValue, { color: gradeColor }]}>
									{percentage}%
								</Text>
								<Text
									style={[
										styles.percentageLabel,
										{ color: theme.text.secondary },
									]}
								>
									{t("success_rate")}
								</Text>
							</View>
						</View>
					)}

					{/* Stats Row */}
					<View style={styles.statsRow}>
						{/* Match mode: show pairs and attempts only */}
						{gameMode === "match" ? (
							<>
								<StatItem
									value={matchedPairs.length}
									label={t("pairs") || "Pairs"}
									color={theme.primary.main}
									iconName="albums"
								/>
								<StatItem
									value={matchAttempts}
									label={t("attempts") || "Attempts"}
									color="#ec4899"
									iconName="grid"
								/>
							</>
						) : (
							<>
								<StatItem
									value={correctCount}
									label={t("correct")}
									color={theme.success.main}
									iconName="checkmark-circle"
								/>
								<StatItem
									value={wrongCount}
									label={t("incorrect")}
									color={theme.error.main}
									iconName="close-circle"
								/>
								<StatItem
									value={totalCards}
									label={t("total")}
									color={theme.primary.main}
									iconName="albums"
								/>
							</>
						)}
					</View>
				</Card>

				{/* Action Buttons */}
				<View style={styles.summaryActions}>
					<Pressable
						onPress={restartGame}
						disabled={finishing}
						style={({ pressed }) => [
							styles.summaryButton,
							styles.summaryButtonPrimary,
							{ backgroundColor: theme.primary.main },
							pressed && { opacity: 0.8 },
							finishing && { opacity: 0.6 },
						]}
					>
						<Ionicons name="refresh" size={20} color="#fff" />
						<Text style={styles.summaryButtonTextPrimary}>
							{t("play_again")}
						</Text>
					</Pressable>

					<View style={styles.summaryButtonRow}>
						<Pressable
							onPress={() => navigation.goBack()}
							style={({ pressed }) => [
								styles.summaryButton,
								styles.summaryButtonSecondary,
								{
									backgroundColor: theme.background.card,
									borderColor: theme.border.main,
									flex: 1,
								},
								pressed && { opacity: 0.8 },
							]}
						>
							<Ionicons name="home" size={18} color={theme.text.primary} />
							<Text
								style={[
									styles.summaryButtonTextSecondary,
									{ color: theme.text.primary },
								]}
							>
								{t("back_to_decks")}
							</Text>
						</Pressable>

						<Pressable
							onPress={() => setGameState("mode_select")}
							style={({ pressed }) => [
								styles.summaryButton,
								styles.summaryButtonSecondary,
								{
									backgroundColor: theme.background.card,
									borderColor: theme.border.main,
									flex: 1,
								},
								pressed && { opacity: 0.8 },
							]}
						>
							<Ionicons name="settings" size={18} color={theme.text.primary} />
							<Text
								style={[
									styles.summaryButtonTextSecondary,
									{ color: theme.text.primary },
								]}
							>
								{t("change_mode")}
							</Text>
						</Pressable>
					</View>
				</View>
			</ScrollView>
		);
	};

	return (
		<ThemedView variant="gradient" style={styles.container}>
			<SafeAreaView style={styles.safeArea}>
				{gameState === "mode_select" && renderModeSelect()}
				{gameState === "playing" && renderPlaying()}
				{gameState === "summary" && renderSummary()}
			</SafeAreaView>
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
	// Mode Select
	modeSelectContainer: {
		padding: spacing.lg,
	},
	modeTitle: {
		textAlign: "center",
		marginBottom: spacing.xs,
	},
	deckName: {
		textAlign: "center",
		marginBottom: spacing.xl,
	},
	modesGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.sm,
		justifyContent: "center",
	},
	modeCard: {
		width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.sm,
		borderRadius: borderRadius.lg,
		alignItems: "center",
	},
	modeIconContainer: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: spacing.sm,
	},
	modeLabel: {
		fontSize: 12,
		fontWeight: "600",
		textAlign: "center",
	},
	modeDescription: {
		marginTop: spacing.lg,
		padding: spacing.md,
		borderRadius: borderRadius.md,
		borderWidth: 1,
	},
	modeDescText: {
		fontSize: 14,
		fontWeight: "500",
		textAlign: "center",
	},
	// Challenge Type Section
	challengeSection: {
		marginTop: spacing.lg,
	},
	challengeTitle: {
		textAlign: "center",
		marginBottom: spacing.md,
		fontSize: 16,
	},
	challengeTypesRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: spacing.md,
		paddingHorizontal: spacing.sm,
	},
	challengeCard: {
		flex: 1,
		paddingVertical: spacing.lg,
		paddingHorizontal: spacing.md,
		borderRadius: borderRadius.lg,
		alignItems: "center",
		minHeight: 100,
		justifyContent: "center",
	},
	challengeIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: spacing.sm,
	},
	challengeLabel: {
		fontSize: 13,
		fontWeight: "700",
		textAlign: "center",
	},
	challengeNote: {
		textAlign: "center",
		fontSize: 12,
		marginTop: spacing.sm,
		fontStyle: "italic",
	},
	// Settings Section
	settingsSection: {
		marginTop: spacing.lg,
		gap: spacing.md,
	},
	settingCard: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		borderWidth: 1,
	},
	settingInfo: {
		flexDirection: "row",
		alignItems: "center",
		flex: 1,
		gap: spacing.md,
	},
	settingIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
	settingTextContainer: {
		flex: 1,
	},
	settingTitle: {
		fontSize: 14,
		fontWeight: "600",
	},
	settingDesc: {
		fontSize: 12,
		marginTop: 2,
	},
	toggleGroup: {
		flexDirection: "row",
	},
	toggleButton: {
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderWidth: 1,
	},
	toggleButtonLeft: {
		borderTopLeftRadius: borderRadius.md,
		borderBottomLeftRadius: borderRadius.md,
		borderRightWidth: 0,
	},
	toggleButtonRight: {
		borderTopRightRadius: borderRadius.md,
		borderBottomRightRadius: borderRadius.md,
	},
	toggleButtonActive: {},
	toggleText: {
		fontSize: 12,
		fontWeight: "500",
	},
	// Mode-specific settings (Timed/Survival)
	modeSpecificCard: {
		marginTop: spacing.md,
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		borderWidth: 1,
	},
	modeSpecificHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	modeSpecificIcon: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
	},
	modeSpecificTitle: {
		fontSize: 14,
		fontWeight: "600",
	},
	// Segmented control for time selection
	segmentedControl: {
		flexDirection: "row",
		borderRadius: borderRadius.md,
		overflow: "hidden",
	},
	segmentedButton: {
		flex: 1,
		paddingVertical: spacing.sm + 2,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderRightWidth: 0,
	},
	segmentedButtonFirst: {
		borderTopLeftRadius: borderRadius.md,
		borderBottomLeftRadius: borderRadius.md,
	},
	segmentedButtonLast: {
		borderTopRightRadius: borderRadius.md,
		borderBottomRightRadius: borderRadius.md,
		borderRightWidth: 1,
	},
	segmentedButtonText: {
		fontSize: 13,
		fontWeight: "600",
	},
	// Lives selection with hearts
	livesRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		gap: spacing.sm,
	},
	heartButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
		paddingVertical: spacing.sm + 2,
		borderRadius: borderRadius.md,
	},
	heartButtonText: {
		fontSize: 14,
		fontWeight: "700",
	},
	// Start Button
	startButtonContainer: {
		marginTop: spacing.xl,
		paddingBottom: spacing.lg,
	},
	startButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.sm,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.xl,
		borderRadius: borderRadius.lg,
	},
	startButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	// Game Container
	gameContainer: {
		flex: 1,
	},
	gameHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
	},
	backButton: {
		fontSize: 16,
		color: "#888",
	},
	progressInfo: {
		alignItems: "center",
	},
	progressText: {
		fontSize: 16,
		fontWeight: "600",
	},
	timer: {
		fontSize: 14,
		fontWeight: "600",
		marginTop: 2,
	},
	timerText: {
		fontSize: 24,
		fontWeight: "700",
	},
	lives: {
		fontSize: 16,
		marginTop: 2,
	},
	livesContainer: {
		flexDirection: "row",
		alignItems: "center",
	},
	scoreInfo: {
		flexDirection: "row",
		gap: spacing.sm,
	},
	score: {
		fontSize: 16,
		fontWeight: "600",
	},
	progressBar: {
		height: 4,
		marginHorizontal: spacing.md,
		borderRadius: 2,
	},
	progressFill: {
		height: "100%",
		borderRadius: 2,
	},
	gameContent: {
		flex: 1,
		padding: spacing.lg,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.lg,
	},
	// Standard Mode
	standardMode: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	swipeableCard: {
		width: "100%",
		alignItems: "center",
	},
	swipeIndicators: {
		position: "absolute",
		top: "40%",
		left: 0,
		right: 0,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: spacing.lg,
		zIndex: 10,
	},
	swipeIndicatorLeft: {
		padding: spacing.sm,
	},
	swipeIndicatorRight: {
		padding: spacing.sm,
	},
	answerButtons: {
		flexDirection: "row",
		gap: spacing.md,
		marginTop: spacing.xl,
		width: "100%",
	},
	answerButton: {
		flex: 1,
	},
	answerButtonContent: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.xs,
	},
	answerButtonText: {
		color: "#ffffff",
		fontWeight: "600",
		fontSize: 15,
	},
	swipeHintContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: spacing.xs,
		marginTop: spacing.lg,
		paddingVertical: spacing.sm,
	},
	swipeHintText: {
		fontSize: 12,
	},
	restartButton: {
		padding: spacing.xs,
	},
	scoreInfoRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: spacing.md,
		marginTop: spacing.sm,
		marginBottom: spacing.xs,
	},
	scoreBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.md,
	},
	scoreBadgeText: {
		fontSize: 14,
		fontWeight: "700",
	},
	// Write Mode
	writeMode: {
		flex: 1,
		paddingTop: spacing.lg,
	},
	questionCard: {
		padding: spacing.lg,
		marginBottom: spacing.lg,
		alignItems: "center",
	},
	questionText: {
		fontSize: 22,
		fontWeight: "600",
		textAlign: "center",
	},
	writeInput: {
		borderWidth: 2,
		borderRadius: borderRadius.md,
		padding: spacing.md,
		fontSize: 18,
		textAlign: "center",
	},
	writeButtonRow: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: spacing.md,
		marginTop: spacing.md,
	},
	hintButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderRadius: borderRadius.md,
		borderWidth: 1,
	},
	hintButtonText: {
		fontSize: 14,
		fontWeight: "500",
	},
	hintBox: {
		marginTop: spacing.md,
		padding: spacing.md,
		borderRadius: borderRadius.md,
		borderWidth: 1,
		alignItems: "center",
	},
	hintText: {
		fontSize: 18,
		fontFamily: "monospace",
		letterSpacing: 2,
		color: "#f59e0b",
	},
	answerFeedback: {
		marginTop: spacing.md,
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		borderWidth: 1,
	},
	feedbackHeader: {
		flexDirection: "row",
		alignItems: "center",
	},
	// Multiple Choice
	mcMode: {
		flex: 1,
	},
	mcOptions: {
		gap: spacing.sm,
	},
	mcOption: {
		flexDirection: "row",
		alignItems: "center",
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		borderWidth: 2,
		gap: spacing.md,
	},
	mcOptionLabel: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: "center",
		alignItems: "center",
	},
	mcOptionLabelText: {
		fontSize: 14,
		fontWeight: "700",
	},
	mcOptionText: {
		flex: 1,
		fontSize: 16,
		fontWeight: "500",
	},
	mcResultIcon: {
		marginLeft: "auto",
	},
	// Match Mode
	matchMode: {
		flex: 1,
		paddingTop: spacing.md,
	},
	matchStatsRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: spacing.xl * 2,
		marginBottom: spacing.lg,
	},
	matchStatItem: {
		alignItems: "center",
	},
	matchStatLabel: {
		fontSize: 12,
		marginBottom: 4,
	},
	matchStatValue: {
		fontSize: 20,
		fontWeight: "700",
	},
	matchGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		gap: spacing.sm,
	},
	matchTile: {
		width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 3) / 3,
		aspectRatio: 1,
	},
	matchTileInner: {
		width: "100%",
		height: "100%",
		borderRadius: borderRadius.lg,
		justifyContent: "center",
		alignItems: "center",
		padding: spacing.sm,
	},
	matchTileBack: {
		backgroundColor: "#3b82f6",
		shadowColor: "#3b82f6",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 4,
	},
	matchTileQuestion: {
		fontSize: 32,
		fontWeight: "700",
		color: "#fff",
	},
	matchTileFront: {
		borderWidth: 2,
	},
	matchTileIcon: {
		position: "absolute",
		top: 8,
		right: 8,
	},
	matchTileText: {
		fontSize: 12,
		textAlign: "center",
		fontWeight: "500",
	},
	matchTileType: {
		fontSize: 10,
		marginTop: 4,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	// Summary
	summaryScrollView: {
		flex: 1,
	},
	summaryContainer: {
		padding: spacing.lg,
		alignItems: "center",
		paddingBottom: spacing.xl * 2,
		flexGrow: 1,
		justifyContent: "center",
	},
	trophyContainer: {
		width: 80,
		height: 80,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		marginBottom: spacing.lg,
	},
	summaryCard: {
		width: "100%",
		padding: spacing.lg,
		alignItems: "center",
		marginBottom: spacing.lg,
	},
	summaryTitle: {
		marginBottom: spacing.xs,
		textAlign: "center",
	},
	summaryMessage: {
		fontSize: 14,
		fontWeight: "600",
		marginBottom: spacing.lg,
		textAlign: "center",
	},
	percentageCircleContainer: {
		width: 140,
		height: 140,
		position: "relative",
		marginBottom: spacing.xl,
		alignItems: "center",
		justifyContent: "center",
	},
	percentageCircleBg: {
		position: "absolute",
		width: "100%",
		height: "100%",
		borderRadius: 70,
		borderWidth: 8,
	},
	percentageCircleProgress: {
		position: "absolute",
		width: "100%",
		height: "100%",
	},
	percentageArc: {
		width: "100%",
		height: "100%",
		borderRadius: 70,
		borderWidth: 8,
	},
	percentageContent: {
		alignItems: "center",
		justifyContent: "center",
	},
	percentageValue: {
		fontSize: 36,
		fontWeight: "800",
		lineHeight: 40,
	},
	percentageLabel: {
		fontSize: 12,
		fontWeight: "500",
	},
	statsRow: {
		flexDirection: "row",
		justifyContent: "center",
		flexWrap: "wrap",
		gap: spacing.sm,
		width: "100%",
	},
	statItem: {
		alignItems: "center",
		padding: spacing.sm,
		borderRadius: borderRadius.md,
		borderWidth: 1,
		minWidth: 70,
		flex: 1,
	},
	statIconContainer: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: spacing.xs,
	},
	statItemValue: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 2,
	},
	statItemLabel: {
		fontSize: 10,
		fontWeight: "500",
		textTransform: "uppercase",
	},
	summaryActions: {
		width: "100%",
		gap: spacing.sm,
	},
	summaryButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.lg,
		borderRadius: borderRadius.lg,
		gap: spacing.sm,
	},
	summaryButtonPrimary: {
		// backgroundColor set dynamically
	},
	summaryButtonSecondary: {
		borderWidth: 1,
	},
	summaryButtonRow: {
		flexDirection: "row",
		gap: spacing.sm,
	},
	summaryButtonTextPrimary: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	summaryButtonTextSecondary: {
		fontSize: 14,
		fontWeight: "600",
	},
});

export default GameScreen;
