import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	LayoutAnimation,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	UIManager,
	View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { flashcardsAPI } from "../services/api";
import { borderRadius, spacing } from "../styles/theme";
import { Button, Input, LoadingState, Modal, ThemedText } from "./ui";

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
				<View style={{ flex: 1, padding: spacing.md, gap: spacing.sm }}>
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
								borderRadius: 18,
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
								borderRadius: 18,
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

const normalizeEnabledValue = (value) =>
	value === true || value === "true" || value === "t" || value === 1;

const FlashcardsModal = ({
	visible,
	onClose,
	deck,
	theme,
	t,
	showAlert,
	onUpdate,
	canCreateFlashcard,
	onLimitReached,
}) => {
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
	const [expandedCardId, setExpandedCardId] = useState(null);

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

	const displayTitle = deck?.title
		? deck.title.length > 25
			? deck.title.substring(0, 25) + "..."
			: deck.title
		: t("flashcards");

	useEffect(() => {
		if (
			Platform.OS === "android" &&
			UIManager.setLayoutAnimationEnabledExperimental
		) {
			UIManager.setLayoutAnimationEnabledExperimental(true);
		}
	}, []);

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
		if (visible && deck) {
			fetchFlashcards();
			setSearchQuery("");
			setIsInlineAdding(false);
			setEditingCardId(null);
			setSortModalVisible(false);
			setExpandedCardId(null);
		}
	}, [visible, deck]);

	useEffect(() => {
		const loadSortPreference = async () => {
			if (!visible || !deck?.id) return;
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
	}, [visible, deck?.id]);

	useEffect(() => {
		const saveSortPreference = async () => {
			if (!deck?.id || !ALLOWED_FLASHCARD_SORTS.includes(sortBy)) return;
			try {
				const key = `${FLASHCARD_SORT_STORAGE_KEY_PREFIX}_${deck.id}`;
				await AsyncStorage.setItem(key, sortBy);
			} catch {
				// ignore storage errors and keep in-memory selection
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
			if (onUpdate) onUpdate(deck.id, nextFlashcards.length);
		} catch (error) {
			console.error("Error fetching flashcards:", error);
		} finally {
			if (!silent) setLoading(false);
		}
	};

	const handleAddCard = () => {
		if (canCreateFlashcard === false) {
			if (onLimitReached) onLimitReached();
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
			showAlert?.(t("max_characters_error", { max: MAX_TEXT_LENGTH }));
			return;
		}
		setAddSaving(true);
		try {
			await flashcardsAPI.create(deck.id, front, back);
			animateFlashcardLayout(220);
			await fetchFlashcards(true);
		} catch (error) {
			console.error("Error adding card:", error);
			showAlert?.(
				error?.response?.data?.message ||
					error?.response?.data?.error ||
					t("error") ||
					"Error",
			);
		} finally {
			setAddSaving(false);
		}
	};

	const handleSubmitEdit = async (front, back) => {
		if (!editingCardId) return;
		if (front.length > MAX_TEXT_LENGTH || back.length > MAX_TEXT_LENGTH) {
			showAlert?.(t("max_characters_error", { max: MAX_TEXT_LENGTH }));
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
			showAlert?.(
				error?.response?.data?.message ||
					error?.response?.data?.error ||
					t("error") ||
					"Error",
			);
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
		console.log("Toggling enabled for card:", card.enabled);
		const previousEnabled = normalizeEnabledValue(card.enabled);
		const nextEnabled = !previousEnabled;
		setFlashcards((prev) =>
			prev.map((item) =>
				item.id === card.id ? { ...item, enabled: nextEnabled } : item,
			),
		);
		try {
			console.log("ibrahim0", {
				frontText: card.front_text,
				backText: card.back_text,
				enabled: nextEnabled,
			});
			const response = await flashcardsAPI.update(card.id, {
				frontText: card.front_text,
				backText: card.back_text,
				enabled: nextEnabled,
			});
			const responseEnabled = response?.data?.flashcard?.enabled;
			console.log("ibrahim", responseEnabled, nextEnabled);
			if (responseEnabled !== undefined && responseEnabled !== null) {
				const persistedEnabled = normalizeEnabledValue(responseEnabled);
				console.log("ibrahim2", persistedEnabled, nextEnabled);

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
			console.error(
				"Error toggling card enabled state:",
				error?.response?.data || error,
			);
			showAlert?.(
				error?.response?.data?.message ||
					error?.response?.data?.error ||
					t("error") ||
					"Error",
			);
		}
	};

	const handleToggleExpandedCard = (cardId) => {
		animateFlashcardLayout(180);
		setExpandedCardId((prev) => (prev === cardId ? null : cardId));
	};

	const handleBulkSetEnabled = async (nextEnabled) => {
		console.log("ibrahim bulk");

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
				if (failedIds.length === targetFlashcards.length) {
					showAlert?.(t("error") || "Error");
				}
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
			showAlert?.(
				error?.response?.data?.message ||
					error?.response?.data?.error ||
					t("error") ||
					"Error",
			);
		} finally {
			setBulkSaving(false);
		}
	};

	return (
		<>
			<Modal
				visible={visible}
				onClose={onClose}
				title={displayTitle}
				size="large"
				verticalAlign="center"
				avoidKeyboard={false}
				propagateSwipe={true}
				footer={
					<View style={styles.modalFooter}>
						<Button
							variant="ghost"
							onPress={onClose}
							textStyle={{ color: theme.text.secondary }}
						>
							{t("close") || "Close"}
						</Button>
						<Button
							variant="success"
							onPress={handleAddCard}
							disabled={isInlineAdding}
						>
							{t("add_flashcard") || "Add Flashcard"}
						</Button>
					</View>
				}
			>
				{loading ? (
					<LoadingState message={t("loading_cards")} />
				) : (
					<View>
						{flashcards.length > 0 && (
							<View
								style={[
									styles.flashcardSearchContainer,
									{
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
									style={[
										styles.flashcardSearchInput,
										{ color: theme.text.primary },
									]}
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
									style={styles.flashcardSortIconButton}
									hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
								>
									<Ionicons
										name="filter-outline"
										size={18}
										color={theme.text.secondary}
									/>
								</Pressable>
								{searchQuery ? (
									<Pressable onPress={() => setSearchQuery("")}>
										<Ionicons
											name="close-circle"
											size={18}
											color={theme.primary.main}
										/>
									</Pressable>
								) : null}
							</View>
						)}

						{flashcards.length > 0 && (
							<View style={styles.flashcardStatsAndActionsRow}>
								<View style={styles.flashcardStatsBadgesRow}>
									<View
										style={[
											styles.cardCountBadgeModal,
											{ backgroundColor: theme.primary.main + "15" },
										]}
									>
										<Text
											style={[
												styles.cardCountTextModal,
												{ color: theme.primary.main },
											]}
										>
											{isSearching
												? `${filteredFlashcards.length}/${flashcards.length}`
												: flashcards.length}{" "}
											{(flashcards.length > 0 && t("cards")) || "cards"}
										</Text>
									</View>

									<View
										style={[
											styles.cardCountBadgeModal,
											{
												backgroundColor: "rgba(34, 197, 94, 0.15)",
												borderColor: "rgba(34, 197, 94, 0.4)",
											},
										]}
									>
										<Text
											style={[styles.cardCountTextModal, { color: "#22c55e" }]}
										>
											{isSearching
												? `${filteredEnabledCount}/${filteredFlashcards.length}`
												: enabledCount}{" "}
											{t("enabled") || "enabled"}
										</Text>
									</View>

									<View
										style={[
											styles.cardCountBadgeModal,
											{
												backgroundColor: "rgba(239, 68, 68, 0.15)",
												borderColor: "rgba(239, 68, 68, 0.4)",
											},
										]}
									>
										<Text
											style={[styles.cardCountTextModal, { color: "#ef4444" }]}
										>
											{isSearching
												? `${filteredDisabledCount}/${filteredFlashcards.length}`
												: disabledCount}{" "}
											{t("disabled") || "disabled"}
										</Text>
									</View>
								</View>

								<View style={styles.flashcardBulkActionRow}>
									<Pressable
										onPress={() => handleBulkSetEnabled(true)}
										hitSlop={8}
										disabled={bulkSaving || filteredFlashcards.length === 0}
										style={[
											styles.flashcardBulkButton,
											{ backgroundColor: "rgba(34, 197, 94, 0.18)" },
											bulkSaving ? { opacity: 0.6 } : null,
										]}
									>
										<Text
											style={[
												styles.flashcardBulkButtonText,
												{ color: "#22c55e" },
											]}
										>
											{t("enable_all") || "Enable all"}
										</Text>
									</Pressable>
									<Pressable
										onPress={() => handleBulkSetEnabled(false)}
										hitSlop={8}
										disabled={bulkSaving || filteredFlashcards.length === 0}
										style={[
											styles.flashcardBulkButton,
											{ backgroundColor: "rgba(239, 68, 68, 0.18)" },
											bulkSaving ? { opacity: 0.6 } : null,
										]}
									>
										<Text
											style={[
												styles.flashcardBulkButtonText,
												{ color: "#ef4444" },
											]}
										>
											{t("disable_all") || "Disable all"}
										</Text>
									</Pressable>
								</View>
							</View>
						)}

						{isInlineAdding && (
							<InlineCardForm
								key={`add-form-${flashcards.length}`}
								editingCard={null}
								onSubmit={handleSubmitAdd}
								onCancel={() => setIsInlineAdding(false)}
								saving={addSaving}
								t={t}
								theme={theme}
							/>
						)}

						{flashcards.length === 0 && !isInlineAdding ? (
							<View
								style={{
									alignItems: "center",
									paddingVertical: spacing.xxl,
								}}
							>
								<MaterialCommunityIcons
									name="cards-outline"
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
									}}
								>
									{t("no_flashcards_desc")}
								</ThemedText>
							</View>
						) : filteredFlashcards.length === 0 && flashcards.length > 0 ? (
							<View
								style={{
									alignItems: "center",
									paddingVertical: spacing.xl,
								}}
							>
								<Ionicons
									name="search-outline"
									size={36}
									color={theme.text.secondary}
								/>
								<ThemedText
									color="secondary"
									style={{ marginTop: spacing.sm, textAlign: "center" }}
								>
									{t("no_results") || "No results found"}
								</ThemedText>
							</View>
						) : (
							sortedFlashcards.map((card) =>
								editingCardId === card.id ? (
									<InlineCardForm
										key={`edit-${card.id}`}
										editingCard={card}
										onSubmit={handleSubmitEdit}
										onCancel={() => setEditingCardId(null)}
										saving={editSaving}
										t={t}
										theme={theme}
									/>
								) : (
									<View
										key={card.id}
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
													padding: spacing.md,
													flexDirection: "row",
													alignItems:
														expandedCardId === card.id
															? "flex-start"
															: "center",
													gap: spacing.sm,
												}}
											>
												<Pressable
													onPress={() => handleToggleExpandedCard(card.id)}
													style={{ flex: 1 }}
												>
													<ThemedText
														style={styles.flashcardFront}
														numberOfLines={
															expandedCardId === card.id ? undefined : 1
														}
													>
														{card.front_text}
													</ThemedText>
													<ThemedText
														color="secondary"
														style={styles.flashcardBack}
														numberOfLines={
															expandedCardId === card.id ? undefined : 1
														}
													>
														{card.back_text}
													</ThemedText>
												</Pressable>
												<View style={{ flexDirection: "row", gap: spacing.xs }}>
													<Pressable
														onPress={() => handleToggleEnabled(card)}
														hitSlop={8}
														style={[
															styles.flashcardActionBtn,
															{
																backgroundColor: normalizeEnabledValue(
																	card.enabled,
																)
																	? "rgba(59, 130, 246, 0.12)"
																	: "rgba(107, 114, 128, 0.12)",
																opacity: bulkSaving ? 0.6 : 1,
															},
														]}
													>
														<Ionicons
															name={
																normalizeEnabledValue(card.enabled)
																	? "eye"
																	: "eye-off"
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
								),
							)
						)}
					</View>
				)}
			</Modal>

			<Modal
				visible={sortModalVisible}
				onClose={() => setSortModalVisible(false)}
				title={t("sort_options") || "Sort"}
			>
				<View style={styles.sortModalBody}>
					{[
						{
							value: "newest",
							label: t("sort_newest") || "Newest",
							icon: "time-outline",
						},
						{
							value: "oldest",
							label: t("sort_oldest") || "Oldest",
							icon: "hourglass-outline",
						},
						{
							value: "name_asc",
							label: t("sort_name_asc") || "Name (A-Z)",
							icon: "text-outline",
						},
						{
							value: "name_desc",
							label: t("sort_name_desc") || "Name (Z-A)",
							icon: "text",
						},
					].map((option) => {
						const isSelected = sortBy === option.value;
						return (
							<Pressable
								key={option.value}
								onPress={() => {
									setSortBy(option.value);
									setSortModalVisible(false);
								}}
								style={[
									styles.sortOptionRow,
									{
										backgroundColor: isSelected
											? theme.primary.main + "12"
											: theme.background.paper,
										borderColor: isSelected
											? theme.primary.main
											: theme.border.main,
									},
								]}
							>
								<View
									style={[
										styles.sortOptionIconWrap,
										{
											backgroundColor: isSelected
												? theme.primary.main + "20"
												: "transparent",
										},
									]}
								>
									<Ionicons
										name={option.icon}
										size={16}
										color={
											isSelected ? theme.primary.main : theme.text.secondary
										}
									/>
								</View>
								<ThemedText style={styles.sortOptionText}>
									{option.label}
								</ThemedText>
								{isSelected ? (
									<View
										style={[
											styles.sortSelectedBadge,
											{ backgroundColor: theme.success.main + "20" },
										]}
									>
										<Ionicons
											name="checkmark"
											size={14}
											color={theme.success.main}
										/>
									</View>
								) : null}
							</Pressable>
						);
					})}
				</View>
			</Modal>
		</>
	);
};

const styles = StyleSheet.create({
	modalFooter: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: spacing.sm,
	},
	flashcardFront: {
		fontWeight: "600",
		marginBottom: 4,
	},
	flashcardBack: {
		fontSize: 13,
	},
	flashcardActionBtn: {
		padding: spacing.xs,
		borderRadius: 8,
	},
	flashcardSearchContainer: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.sm,
		borderRadius: 10,
		borderWidth: 1,
		marginBottom: spacing.md,
	},
	flashcardSearchInput: {
		flex: 1,
		fontSize: 15,
		paddingVertical: 0,
	},
	flashcardSortIconButton: {
		marginRight: spacing.xs,
		padding: 2,
	},
	flashcardStatsAndActionsRow: {
		flexDirection: "column",
		alignItems: "flex-start",
		gap: spacing.sm,
		flexWrap: "wrap",
		marginBottom: spacing.md,
	},
	flashcardStatsBadgesRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
		flexWrap: "wrap",
		flexShrink: 1,
	},
	flashcardBulkActionRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
		flexWrap: "wrap",
	},
	flashcardBulkButton: {
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: 8,
	},
	flashcardBulkButtonText: {
		fontSize: 12,
		fontWeight: "600",
	},
	cardCountBadgeModal: {
		alignSelf: "flex-start",
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "transparent",
	},
	cardCountTextModal: {
		fontSize: 12,
		fontWeight: "600",
	},
	sortModalBody: {
		gap: spacing.sm,
	},
	sortOptionRow: {
		flexDirection: "row",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: borderRadius.md,
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		gap: spacing.sm,
	},
	sortOptionIconWrap: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	sortOptionText: {
		flex: 1,
		fontWeight: "500",
	},
	sortSelectedBadge: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
	},
});

export default FlashcardsModal;
