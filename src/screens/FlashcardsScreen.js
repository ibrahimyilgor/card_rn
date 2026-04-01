import React, {
	useEffect,
	useState,
	useCallback,
	useLayoutEffect,
} from "react";
import {
	ActivityIndicator,
	Animated,
	FlatList,
	LayoutAnimation,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	UIManager,
	View,
	SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { flashcardsAPI } from "../services/api";
import { borderRadius, spacing } from "../styles/theme";
import { Button, Input, LoadingState, ThemedText } from "../components/ui";
import SortBottomSheet from "../components/SortBottomSheet";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { usePlan } from "../context/PlanContext";

const MAX_TEXT_LENGTH = 512;
const FLASHCARD_SORT_STORAGE_KEY_PREFIX = "flashcardSortPreference";
const ALLOWED_FLASHCARD_SORTS = ["newest", "oldest", "name_asc", "name_desc"];

const InlineCardForm = ({
	editingCard,
	onSubmit,
	onCancel,
	saving,
	t,
	theme,
}) => {
	const [frontText, setFrontText] = useState(
		editingCard ? editingCard.front_text : "",
	);
	const [backText, setBackText] = useState(
		editingCard ? editingCard.back_text : "",
	);

	const isEditing = !!editingCard;
	const hasChanges = isEditing
		? frontText.trim() !== editingCard.front_text ||
			backText.trim() !== editingCard.back_text
		: true;
	const frontTooLong = frontText.length > MAX_TEXT_LENGTH;
	const backTooLong = backText.length > MAX_TEXT_LENGTH;
	const canSubmit =
		frontText.trim() &&
		backText.trim() &&
		!saving &&
		hasChanges &&
		!frontTooLong &&
		!backTooLong;
	const accentColor = isEditing ? "#f59e0b" : "#22c55e";

	return (
		<View
			style={{
				backgroundColor: theme.background.paper,
				borderRadius: borderRadius.lg,
				borderWidth: 1,
				borderColor: isEditing
					? "rgba(245, 158, 11, 0.4)"
					: "rgba(34, 197, 94, 0.4)",
				overflow: "hidden",
				marginBottom: spacing.sm,
			}}
		>
			<View style={{ flexDirection: "row" }}>
				<View style={{ width: 4, backgroundColor: accentColor }} />
				<View style={{ flex: 1, padding: spacing.sm, gap: spacing.xs }}>
					<Input
						value={frontText}
						onChangeText={setFrontText}
						placeholder={t("enter_the_question_or_term") || "Question / Front"}
						multiline
						numberOfLines={2}
						maxLength={MAX_TEXT_LENGTH + 1}
						error={
							frontTooLong
								? t("max_characters_error", { max: MAX_TEXT_LENGTH })
								: ""
						}
						helperText={
							frontTooLong
								? undefined
								: `${frontText.length}/${MAX_TEXT_LENGTH}`
						}
					/>
					<Input
						value={backText}
						onChangeText={setBackText}
						placeholder={t("enter_the_answer_or_definition") || "Answer / Back"}
						multiline
						numberOfLines={2}
						maxLength={MAX_TEXT_LENGTH + 1}
						error={
							backTooLong
								? t("max_characters_error", { max: MAX_TEXT_LENGTH })
								: ""
						}
						helperText={
							backTooLong ? undefined : `${backText.length}/${MAX_TEXT_LENGTH}`
						}
					/>
					<View
						style={{
							flexDirection: "row",
							justifyContent: "flex-end",
							gap: spacing.sm,
						}}
					>
						<Pressable
							onPress={onCancel}
							style={{
								width: 36,
								height: 36,
								borderRadius: borderRadius.md,
								backgroundColor: "rgba(239, 68, 68, 0.12)",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Ionicons name="close" size={18} color="#ef4444" />
						</Pressable>
						<Pressable
							onPress={() =>
								canSubmit && onSubmit(frontText.trim(), backText.trim())
							}
							style={{
								width: 36,
								height: 36,
								borderRadius: borderRadius.md,
								backgroundColor: canSubmit
									? accentColor + "22"
									: "rgba(150,150,150,0.1)",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{saving ? (
								<ActivityIndicator size="small" color={accentColor} />
							) : (
								<Ionicons
									name="checkmark"
									size={18}
									color={canSubmit ? accentColor : theme.text.disabled}
								/>
							)}
						</Pressable>
					</View>
				</View>
			</View>
		</View>
	);
};

const SkeletonFlashcard = ({ theme }) => {
	const shimmerAnim = new Animated.Value(0);

	useEffect(() => {
		Animated.loop(
			Animated.sequence([
				Animated.timing(shimmerAnim, {
					toValue: 1,
					duration: 1000,
					useNativeDriver: true,
				}),
				Animated.timing(shimmerAnim, {
					toValue: 0,
					duration: 1000,
					useNativeDriver: true,
				}),
			]),
		).start();
	}, [shimmerAnim]);

	const opacity = shimmerAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.3, 0.7],
	});

	return (
		<Animated.View
			style={{
				backgroundColor: theme.background.paper,
				borderRadius: borderRadius.lg,
				borderWidth: 1,
				borderColor: theme.border.main,
				overflow: "hidden",
				marginBottom: spacing.sm,
				opacity: opacity,
			}}
		>
			<View style={{ flexDirection: "row" }}>
				<View
					style={{
						width: 4,
						backgroundColor: theme.mode === "dark" ? "#4a4a4a" : "#d0d0d0",
					}}
				/>
				<View
					style={{
						flex: 1,
						padding: spacing.sm,
						flexDirection: "row",
						alignItems: "center",
						gap: spacing.sm,
					}}
				>
					<View style={{ flex: 1, gap: spacing.xs }}>
						<View
							style={{
								height: 20,
								backgroundColor:
									theme.mode === "dark" ? "#505050" : "#d9d9d9",
								borderRadius: 4,
							}}
						/>
						<View
							style={{
								height: 16,
								backgroundColor:
									theme.mode === "dark" ? "#454545" : "#cfcfcf",
								borderRadius: 4,
								width: "80%",
							}}
						/>
					</View>
					<View style={styles.cardActionsContainer}>
						{[0, 1, 2].map((idx) => (
							<View
								key={`skeleton-action-${idx}`}
								style={[
									styles.flashcardActionBtn,
									{
										backgroundColor:
											theme.mode === "dark" ? "#424242" : "#d6d6d6",
									},
								]}
							/>
						))}
					</View>
				</View>
			</View>
		</Animated.View>
	);
};

const normalizeEnabledValue = (value) =>
	value === true || value === "true" || value === "t" || value === 1;

const FlashcardsScreen = ({ route, navigation }) => {
	const { deck } = route.params || {};
	const { theme } = useTheme();
	const { t } = useI18n();
	const { canCreateFlashcard } = usePlan();

	const [flashcards, setFlashcards] = useState([]);
	const [loading, setLoading] = useState(false);
	const [isInlineAdding, setIsInlineAdding] = useState(false);
	const [editingCardId, setEditingCardId] = useState(null);
	const [addSaving, setAddSaving] = useState(false);
	const [editSaving, setEditSaving] = useState(false);
	const [bulkSaving, setBulkSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("newest");
	const [sortModalVisible, setSortModalVisible] = useState(false);
	const [expandedCardIds, setExpandedCardIds] = useState(new Set());
	const [formResetKey, setFormResetKey] = useState(0);

	const filteredFlashcards = flashcards.filter((card) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			card.front_text.toLowerCase().includes(query) ||
			card.back_text.toLowerCase().includes(query)
		);
	});

	const sortedFlashcards = [...filteredFlashcards].sort((a, b) => {
		switch (sortBy) {
			case "oldest":
				return new Date(a.created_at) - new Date(b.created_at);
			case "name_asc":
				return (a.front_text || "").localeCompare(b.front_text || "");
			case "name_desc":
				return (b.front_text || "").localeCompare(a.front_text || "");
			case "newest":
			default:
				return new Date(b.created_at) - new Date(a.created_at);
		}
	});

	const enabledCount = flashcards.filter((card) =>
		normalizeEnabledValue(card.enabled),
	).length;
	const disabledCount = flashcards.length - enabledCount;
	const filteredEnabledCount = filteredFlashcards.filter((card) =>
		normalizeEnabledValue(card.enabled),
	).length;
	const filteredDisabledCount =
		filteredFlashcards.length - filteredEnabledCount;
	const isSearching = Boolean(searchQuery.trim());

	// Prepare FlatList data - form first if adding, then cards
	const flatListData = [];
	if (isInlineAdding) {
		flatListData.push({ __isForm: true, __id: "add-form" });
	}
	flatListData.push(...sortedFlashcards);

	useEffect(() => {
		if (
			Platform.OS === "android" &&
			UIManager.setLayoutAnimationEnabledExperimental
		) {
			UIManager.setLayoutAnimationEnabledExperimental(true);
		}
	}, []);

	useLayoutEffect(() => {
		navigation.setOptions({
			title: deck?.title || t("flashcards") || "Flashcards",
			headerBackTitle: "",
		});
	}, [navigation, deck?.title, t]);

	const animateFlashcardLayout = (duration = 200) => {
		LayoutAnimation.configureNext({
			duration,
			create: {
				type: LayoutAnimation.Types.easeInEaseOut,
				property: LayoutAnimation.Properties.opacity,
			},
			update: {
				type: LayoutAnimation.Types.easeInEaseOut,
			},
			delete: {
				type: LayoutAnimation.Types.easeInEaseOut,
				property: LayoutAnimation.Properties.opacity,
			},
		});
	};

	useEffect(() => {
		if (deck) {
			fetchFlashcards();
			setSearchQuery("");
			setIsInlineAdding(false);
			setEditingCardId(null);
			setSortModalVisible(false);
			setExpandedCardIds(new Set());
		}
	}, [deck?.id]);

	useEffect(() => {
		const loadSortPreference = async () => {
			if (!deck?.id) return;
			try {
				const key = `${FLASHCARD_SORT_STORAGE_KEY_PREFIX}_${deck.id}`;
				const savedSort = await AsyncStorage.getItem(key);
				if (savedSort && ALLOWED_FLASHCARD_SORTS.includes(savedSort)) {
					setSortBy(savedSort);
				} else {
					setSortBy("newest");
				}
			} catch {
				setSortBy("newest");
			}
		};

		loadSortPreference();
	}, [deck?.id]);

	useEffect(() => {
		const saveSortPreference = async () => {
			if (!deck?.id || !ALLOWED_FLASHCARD_SORTS.includes(sortBy)) return;
			try {
				const key = `${FLASHCARD_SORT_STORAGE_KEY_PREFIX}_${deck.id}`;
				await AsyncStorage.setItem(key, sortBy);
			} catch {
				// ignore storage errors
			}
		};

		saveSortPreference();
	}, [deck?.id, sortBy]);

	const fetchFlashcards = async (silent = false) => {
		if (!deck) return;
		if (!silent) setLoading(true);
		try {
			const response = await flashcardsAPI.getByDeck(deck.id);
			const flashcardsData = response.data?.decks || response.data || [];
			const nextFlashcards = Array.isArray(flashcardsData)
				? flashcardsData.map((card) => ({
						...card,
						enabled: normalizeEnabledValue(card.enabled),
					}))
				: [];
			if (silent) {
				animateFlashcardLayout(220);
			}
			setFlashcards(nextFlashcards);
		} catch (error) {
			console.error("Error fetching flashcards:", error);
		} finally {
			if (!silent) setLoading(false);
		}
	};

	const handleAddCard = () => {
		if (canCreateFlashcard === false) {
			return;
		}
		animateFlashcardLayout(180);
		setEditingCardId(null);
		setIsInlineAdding(true);
	};

	const handleEditCard = (card) => {
		animateFlashcardLayout(180);
		setIsInlineAdding(false);
		setEditingCardId(card.id);
	};

	const handleSubmitAdd = async (front, back) => {
		if (front.length > MAX_TEXT_LENGTH || back.length > MAX_TEXT_LENGTH) {
			return;
		}
		setAddSaving(true);
		try {
			await flashcardsAPI.create(deck.id, front, back);
			animateFlashcardLayout(220);
			await fetchFlashcards(true);
			setFormResetKey((prev) => prev + 1);
		} catch (error) {
			console.error("Error adding card:", error);
		} finally {
			setAddSaving(false);
		}
	};

	const handleSubmitEdit = async (front, back) => {
		if (!editingCardId) return;
		if (front.length > MAX_TEXT_LENGTH || back.length > MAX_TEXT_LENGTH) {
			return;
		}
		setEditSaving(true);
		try {
			await flashcardsAPI.update(editingCardId, front, back);
			animateFlashcardLayout(180);
			setEditingCardId(null);
			await fetchFlashcards(true);
		} catch (error) {
			console.error("Error updating card:", error);
		} finally {
			setEditSaving(false);
		}
	};

	const handleDeleteCard = async (cardId) => {
		try {
			await flashcardsAPI.delete(cardId);
			animateFlashcardLayout(220);
			await fetchFlashcards(true);
		} catch (error) {
			console.error("Error deleting card:", error);
		}
	};

	const handleToggleEnabled = async (card) => {
		const previousEnabled = normalizeEnabledValue(card.enabled);
		const nextEnabled = !previousEnabled;
		setFlashcards((prev) =>
			prev.map((item) =>
				item.id === card.id ? { ...item, enabled: nextEnabled } : item,
			),
		);
		try {
			const response = await flashcardsAPI.update(card.id, {
				frontText: card.front_text,
				backText: card.back_text,
				enabled: nextEnabled,
			});
			const responseEnabled = response?.data?.flashcard?.enabled;
			if (responseEnabled !== undefined && responseEnabled !== null) {
				const persistedEnabled = normalizeEnabledValue(responseEnabled);
				if (persistedEnabled !== nextEnabled) {
					throw new Error("TOGGLE_NOT_PERSISTED");
				}
			}
		} catch (error) {
			setFlashcards((prev) =>
				prev.map((item) =>
					item.id === card.id ? { ...item, enabled: previousEnabled } : item,
				),
			);
			console.error("Error toggling card enabled state:", error);
		}
	};

	const handleToggleExpandedCard = (cardId) => {
		animateFlashcardLayout(180);
		setExpandedCardIds((prev) => {
			const next = new Set(prev);
			if (next.has(cardId)) {
				next.delete(cardId);
			} else {
				next.add(cardId);
			}
			return next;
		});
	};

	const handleBulkSetEnabled = async (nextEnabled) => {
		const targetFlashcards = filteredFlashcards.filter(
			(card) => normalizeEnabledValue(card.enabled) !== nextEnabled,
		);
		if (targetFlashcards.length === 0) {
			return;
		}
		setBulkSaving(true);
		try {
			const targetIdsArray = targetFlashcards.map((card) => card.id);
			const targetIds = new Set(targetIdsArray);
			setFlashcards((prev) =>
				prev.map((card) =>
					targetIds.has(card.id) ? { ...card, enabled: nextEnabled } : card,
				),
			);
			const results = await Promise.allSettled(
				targetFlashcards.map((card) =>
					flashcardsAPI.update(card.id, {
						frontText: card.front_text,
						backText: card.back_text,
						enabled: nextEnabled,
					}),
				),
			);
			const failedIds = targetFlashcards
				.filter((_, index) => {
					const result = results[index];
					if (result?.status === "rejected") return true;
					const responseEnabled = result?.value?.data?.flashcard?.enabled;
					if (responseEnabled === undefined || responseEnabled === null)
						return false;
					const persistedEnabled = normalizeEnabledValue(responseEnabled);
					return persistedEnabled !== nextEnabled;
				})
				.map((card) => card.id);
			if (failedIds.length > 0) {
				const failedIdSet = new Set(failedIds);
				setFlashcards((prev) =>
					prev.map((card) =>
						failedIdSet.has(card.id)
							? {
									...card,
									enabled:
										normalizeEnabledValue(card.enabled) !== nextEnabled
											? !nextEnabled
											: card.enabled,
								}
							: card,
					),
				);
			}
		} catch (error) {
			console.error("Error bulk updating flashcards:", error);
			setFlashcards((prev) =>
				prev.map((card) =>
					targetFlashcards.find((targetCard) => targetCard.id === card.id)
						? { ...card, enabled: !nextEnabled }
						: card,
				),
			);
		} finally {
			setBulkSaving(false);
		}
	};

	// Render individual flashcard
	const renderFlashcardItem = (item) => {
		const card = item;
		if (editingCardId === card.id) {
			return (
				<InlineCardForm
					editingCard={card}
					onSubmit={handleSubmitEdit}
					onCancel={() => setEditingCardId(null)}
					saving={editSaving}
					t={t}
					theme={theme}
				/>
			);
		}

		return (
			<View
				style={{
					backgroundColor: theme.background.paper,
					borderRadius: borderRadius.lg,
					borderWidth: 1,
					borderColor: theme.border.main,
					overflow: "hidden",
					marginBottom: spacing.sm,
					opacity: normalizeEnabledValue(card.enabled) ? 1 : 0.6,
				}}
			>
				<View style={{ flexDirection: "row" }}>
					<View
						style={{
							width: 4,
							backgroundColor: "#3b82f6",
						}}
					/>
					<View
						style={{
							flex: 1,
							padding: spacing.sm,
							gap: spacing.xs,
						}}
					>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
								gap: spacing.sm,
							}}
						>
							<Pressable
								onPress={() => handleToggleExpandedCard(card.id)}
								style={{ flex: 1 }}
							>
								<ThemedText
									style={styles.flashcardFront}
									numberOfLines={expandedCardIds.has(card.id) ? undefined : 1}
								>
									{card.front_text}
								</ThemedText>
								<ThemedText
									color="secondary"
									style={styles.flashcardBack}
									numberOfLines={expandedCardIds.has(card.id) ? undefined : 1}
								>
									{card.back_text}
								</ThemedText>
							</Pressable>
							<View
								style={[styles.cardActionsContainer, { alignItems: "center" }]}
							>
								<Pressable
									onPress={() => handleToggleEnabled(card)}
									hitSlop={8}
									style={[
										styles.flashcardActionBtn,
										{
											backgroundColor: normalizeEnabledValue(card.enabled)
												? "rgba(59, 130, 246, 0.12)"
												: "rgba(107, 114, 128, 0.12)",
											opacity: bulkSaving ? 0.6 : 1,
										},
									]}
								>
									<Ionicons
										name={
											normalizeEnabledValue(card.enabled) ? "eye" : "eye-off"
										}
										size={16}
										color={
											normalizeEnabledValue(card.enabled)
												? "#3b82f6"
												: theme.text.disabled
										}
									/>
								</Pressable>
								<Pressable
									onPress={() => handleEditCard(card)}
									style={[
										styles.flashcardActionBtn,
										{ backgroundColor: "rgba(251, 191, 36, 0.1)" },
									]}
								>
									<MaterialCommunityIcons
										name="pencil"
										size={16}
										color="#fbbf24"
									/>
								</Pressable>
								<Pressable
									onPress={() => handleDeleteCard(card.id)}
									style={[
										styles.flashcardActionBtn,
										{ backgroundColor: "rgba(239, 68, 68, 0.1)" },
									]}
								>
									<Ionicons name="trash" size={16} color="#ef4444" />
								</Pressable>
							</View>
						</View>
					</View>
				</View>
			</View>
		);
	};

	// Render FlatList item - form or card
	const handleRenderItem = ({ item }) => {
		if (item.__isForm) {
			return (
				<View style={{ marginBottom: spacing.sm }}>
					<InlineCardForm
						editingCard={null}
						onSubmit={handleSubmitAdd}
						onCancel={() => setIsInlineAdding(false)}
						saving={addSaving}
						t={t}
						theme={theme}
					/>
				</View>
			);
		}
		return renderFlashcardItem(item);
	};

	// Render loading skeletons
	const renderLoadingSkeletons = () => (
		<View style={styles.listContent}>
			{[...Array(6)].map((_, i) => (
				<SkeletonFlashcard key={`skeleton-${i}`} theme={theme} />
			))}
		</View>
	);

	// Render header with search + stats
	const renderHeader = () => (
		<View style={styles.headerContainer}>
			{/* Search Row with + Button */}
			<View style={styles.searchRow}>
				<View
					style={[
						styles.searchContainer,
						{
							flex: 1,
							backgroundColor: theme.background.paper,
							borderColor: theme.border.main,
						},
					]}
				>
					<Ionicons
						name="search-outline"
						size={18}
						color={theme.text.disabled}
						style={{ marginRight: spacing.sm }}
					/>
					<TextInput
						style={[styles.searchInput, { color: theme.text.primary, flex: 1 }]}
						placeholder={t("search_flashcards") || "Search flashcards..."}
						placeholderTextColor={theme.text.disabled}
						cursorColor={theme.primary.main}
						selectionColor={theme.primary.main}
						value={searchQuery}
						onChangeText={setSearchQuery}
						autoCorrect={false}
						autoCapitalize="none"
					/>
					<Pressable
						onPress={() => setSortModalVisible(true)}
						style={styles.filterButton}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					>
						<Ionicons
							name="filter-outline"
							size={18}
							color={theme.text.secondary}
						/>
					</Pressable>
					{searchQuery ? (
						<Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
							<Ionicons name="close-circle" size={18} color="#3b82f6" />
						</Pressable>
					) : null}
				</View>

				{/* Add Card Button */}
				<Pressable
					onPress={handleAddCard}
					disabled={isInlineAdding}
					style={[
						styles.addButton,
						{
							backgroundColor: theme.primary.main,
							opacity: isInlineAdding ? 0.6 : 1,
						},
					]}
					hitSlop={8}
				>
					<MaterialCommunityIcons name="plus" size={20} color="#fff" />
				</Pressable>
			</View>

			{/* Stats Row */}
			<View style={styles.statsRow}>
				<View style={styles.badges}>
					<View
						style={[
							styles.badge,
							{ backgroundColor: theme.primary.main + "15" },
						]}
					>
						<Text style={[styles.badgeText, { color: theme.primary.main }]}>
							{isSearching
								? `${filteredFlashcards.length}/${flashcards.length}`
								: flashcards.length}{" "}
							{(flashcards.length > 0 && t("cards")) || "cards"}
						</Text>
					</View>

					<View
						style={[
							styles.badge,
							{
								backgroundColor: "rgba(34, 197, 94, 0.15)",
								borderColor: "rgba(34, 197, 94, 0.4)",
							},
						]}
					>
						<Text style={[styles.badgeText, { color: "#22c55e" }]}>
							{isSearching
								? `${filteredEnabledCount}/${filteredFlashcards.length}`
								: enabledCount}{" "}
							{t("enabled") || "enabled"}
						</Text>
					</View>

					<View
						style={[
							styles.badge,
							{
								backgroundColor: "rgba(239, 68, 68, 0.15)",
								borderColor: "rgba(239, 68, 68, 0.4)",
							},
						]}
					>
						<Text style={[styles.badgeText, { color: "#ef4444" }]}>
							{isSearching
								? `${filteredDisabledCount}/${filteredFlashcards.length}`
								: disabledCount}{" "}
							{t("disabled") || "disabled"}
						</Text>
					</View>
				</View>

				<View style={styles.actionButtons}>
					<Pressable
						onPress={() => handleBulkSetEnabled(true)}
						hitSlop={8}
						disabled={bulkSaving || filteredFlashcards.length === 0}
						style={[
							styles.bulkButton,
							{ backgroundColor: "rgba(34, 197, 94, 0.65)" },
							bulkSaving ? { opacity: 0.6 } : null,
						]}
					>
						<Text style={[styles.bulkButtonText, { color: "#ffffff" }]}>
							{t("enable_all") || "Enable all"}
						</Text>
					</Pressable>
					<Pressable
						onPress={() => handleBulkSetEnabled(false)}
						hitSlop={8}
						disabled={bulkSaving || filteredFlashcards.length === 0}
						style={[
							styles.bulkButton,
							{ backgroundColor: "rgba(239, 68, 68, 0.65)" },
							bulkSaving ? { opacity: 0.6 } : null,
						]}
					>
						<Text style={[styles.bulkButtonText, { color: "#ffffff" }]}>
							{t("disable_all") || "Disable all"}
						</Text>
					</Pressable>
				</View>
			</View>
		</View>
	);

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: theme.background.default }]}
		>
			{loading ? (
				<>
					{renderHeader()}
					{renderLoadingSkeletons()}
				</>
			) : (
				<>
					{renderHeader()}
					<FlatList
						data={flatListData}
						renderItem={handleRenderItem}
						keyExtractor={(item) =>
							item.__isForm ? `add-form-${formResetKey}` : item.id.toString()
						}
						contentContainerStyle={styles.listContent}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={
							!isInlineAdding && flashcards.length === 0 ? (
								<View
									style={{
										flex: 1,
										alignItems: "center",
										justifyContent: "center",
										paddingVertical: spacing.xxl,
									}}
								>
									<MaterialCommunityIcons
										name="cards"
										size={48}
										color={theme.primary.main}
									/>
									<ThemedText
										variant="h3"
										style={{ marginTop: spacing.md, textAlign: "center" }}
									>
										{t("no_flashcards")}
									</ThemedText>
									<ThemedText
										color="secondary"
										style={{
											marginTop: spacing.sm,
											textAlign: "center",
											fontSize: 14,
											marginBottom: spacing.lg,
										}}
									>
										{t("no_flashcards_desc")}
									</ThemedText>
								</View>
							) : filteredFlashcards.length === 0 && flashcards.length > 0 ? (
								<View
									style={{
										alignItems: "center",
										justifyContent: "center",
										paddingVertical: spacing.xl,
										marginTop: spacing.lg,
									}}
								>
									<Ionicons name="magnify" size={36} color="#3b82f6" />
									<ThemedText
										color="secondary"
										style={{ marginTop: spacing.sm, textAlign: "center" }}
									>
										{t("no_results") || "No results found"}
									</ThemedText>
								</View>
							) : null
						}
						scrollEventThrottle={16}
					/>
				</>
			)}

			{/* Sort Modal */}
			<SortBottomSheet
				visible={sortModalVisible}
				title={t("sort_options") || "Sort"}
				options={[
					{
						value: "newest",
						label: t("sort_newest") || "Newest",
						icon: "clock-outline",
					},
					{
						value: "oldest",
						label: t("sort_oldest") || "Oldest",
						icon: "history",
					},
					{
						value: "name_asc",
						label: t("sort_name_asc") || "Name (A-Z)",
						icon: "sort-alphabetical-ascending",
					},
					{
						value: "name_desc",
						label: t("sort_name_desc") || "Name (Z-A)",
						icon: "sort-alphabetical-descending",
					},
				]}
				selectedValue={sortBy}
				onSelect={async (value) => {
					setSortBy(value);
					try {
						const key = `${FLASHCARD_SORT_STORAGE_KEY_PREFIX}_${deck.id}`;
						await AsyncStorage.setItem(key, value);
					} catch {
						// Keep in-memory sort as fallback
					}
					setSortModalVisible(false);
				}}
				onClose={() => setSortModalVisible(false)}
			/>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	listContent: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.lg,
	},
	headerContainer: {
		paddingHorizontal: spacing.lg,
		paddingBottom: spacing.md,
		paddingTop: spacing.md,
	},
	searchRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.md,
		borderWidth: 1,
	},
	searchInput: {
		fontSize: 14,
		paddingVertical: spacing.xs,
	},
	filterButton: {
		padding: spacing.xs,
	},
	addButton: {
		width: 44,
		height: 44,
		borderRadius: borderRadius.md,
		alignItems: "center",
		justifyContent: "center",
	},
	statsRow: {
		gap: spacing.md,
	},
	badges: {
		flexDirection: "row",
		gap: spacing.sm,
		flexWrap: "wrap",
	},
	badge: {
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "transparent",
	},
	badgeText: {
		fontSize: 12,
		fontWeight: "600",
	},
	actionButtons: {
		flexDirection: "row",
		gap: spacing.sm,
		flexWrap: "wrap",
	},
	bulkButton: {
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: 8,
	},
	bulkButtonText: {
		fontSize: 12,
		fontWeight: "600",
	},
	flashcardFront: {
		fontSize: 15,
		fontWeight: "600",
		marginBottom: spacing.xs,
	},
	flashcardBack: {
		fontSize: 13,
	},
	flashcardActionBtn: {
		width: 32,
		height: 32,
		borderRadius: borderRadius.md,
		alignItems: "center",
		justifyContent: "center",
	},
	cardActionsContainer: {
		flexDirection: "row",
		gap: spacing.xs,
	},
	emptyButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		borderRadius: borderRadius.lg,
	},
	emptyButtonText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 14,
	},
});

export default FlashcardsScreen;
