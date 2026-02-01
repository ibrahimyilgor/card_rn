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
	FlatList,
	Pressable,
	RefreshControl,
	TextInput,
	Keyboard,
	Share,
	Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";
import { decksAPI, flashcardsAPI } from "../services/api";
import {
	ThemedView,
	ThemedText,
	Button,
	Card,
	LoadingState,
	EmptyState,
	Modal,
	Input,
	ConfirmDialog,
} from "../components/ui";
import { spacing, borderRadius } from "../styles/theme";

const HomeScreen = ({ navigation, onLogout }) => {
	const { theme, shadows } = useTheme();
	const { t } = useI18n();

	const [decks, setDecks] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("newest");
	const [accountId, setAccountId] = useState(null);

	// Modal states
	const [deckModalVisible, setDeckModalVisible] = useState(false);
	const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
	const [selectedDeck, setSelectedDeck] = useState(null);
	const [deckTitle, setDeckTitle] = useState("");
	const [deckDescription, setDeckDescription] = useState("");
	const [deckMode, setDeckMode] = useState("standard");
	const [saving, setSaving] = useState(false);
	const [flashcardsModalVisible, setFlashcardsModalVisible] = useState(false);

	// Import modal states
	const [importModalVisible, setImportModalVisible] = useState(false);
	const [importTitle, setImportTitle] = useState("");
	const [importDescription, setImportDescription] = useState("");
	const [importFlashcards, setImportFlashcards] = useState([]);
	const [importFileName, setImportFileName] = useState("");
	const [importError, setImportError] = useState("");
	const [importLoading, setImportLoading] = useState(false);

	// Game mode options
	const MODE_OPTIONS = [
		{
			value: "standard",
			label: t("mode_standard") || "Standard Mode",
			color: "#3b82f6",
		},
		{
			value: "timed",
			label: t("mode_timed") || "Timed Mode",
			color: "#f59e0b",
		},
		{
			value: "survival",
			label: t("mode_survival") || "Survival Mode",
			color: "#ef4444",
		},
		{
			value: "write",
			label: t("mode_write") || "Write Mode",
			color: "#22c55e",
		},
		{
			value: "multiple_choice",
			label: t("mode_multiple_choice") || "Multiple Choice",
			color: "#8b5cf6",
		},
		{
			value: "match",
			label: t("mode_match") || "Match Mode",
			color: "#ec4899",
		},
	];

	useFocusEffect(
		useCallback(() => {
			loadAccountAndDecks();
		}, []),
	);

	const loadAccountAndDecks = async () => {
		try {
			const id = await AsyncStorage.getItem("accountId");
			setAccountId(id);
			if (id) {
				await fetchDecks(id);
			}
		} catch (error) {
			console.error("Error loading data:", error);
		}
	};

	const fetchDecks = async (id, silent = false) => {
		try {
			if (!silent) setLoading(true);
			const response = await decksAPI.getAll(id);
			// Ensure decks is always an array
			const decksData = Array.isArray(response.data)
				? response.data
				: response.data?.decks || [];
			setDecks(decksData);
		} catch (error) {
			console.error("Error fetching decks:", error);
			setDecks([]);
		} finally {
			if (!silent) setLoading(false);
			setRefreshing(false);
		}
	};

	const onRefresh = () => {
		setRefreshing(true);
		if (accountId) {
			fetchDecks(accountId);
		}
	};

	// Filter and sort decks
	const filteredDecks = decks
		.filter(
			(deck) =>
				deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(deck.description &&
					deck.description.toLowerCase().includes(searchQuery.toLowerCase())),
		)
		.sort((a, b) => {
			switch (sortBy) {
				case "oldest":
					return new Date(a.created_at) - new Date(b.created_at);
				case "name":
					return a.title.localeCompare(b.title);
				case "cards":
					return (b.flashcard_count || 0) - (a.flashcard_count || 0);
				default: // newest
					return new Date(b.created_at) - new Date(a.created_at);
			}
		});

	// Deck CRUD operations
	const handleCreateDeck = () => {
		setSelectedDeck(null);
		setDeckTitle("");
		setDeckDescription("");
		setDeckMode("standard");
		setDeckModalVisible(true);
	};

	const handleEditDeck = (deck) => {
		setSelectedDeck(deck);
		setDeckTitle(deck.title);
		setDeckDescription(deck.description || "");
		setDeckMode(deck.mode || "standard");
		setDeckModalVisible(true);
	};

	const handleSaveDeck = async () => {
		if (!deckTitle.trim()) return;

		setSaving(true);
		try {
			let deckId = selectedDeck?.id;
			if (selectedDeck) {
				await decksAPI.update(
					selectedDeck.id,
					deckTitle.trim(),
					deckDescription.trim(),
				);
			} else {
				const response = await decksAPI.create(
					accountId,
					deckTitle.trim(),
					deckDescription.trim(),
				);
				deckId = response.data?.deck?.id;
			}
			// Update deck settings (mode)
			if (deckId) {
				await decksAPI.updateSettings(deckId, { mode: deckMode });
			}
			setDeckModalVisible(false);
			fetchDecks(accountId);
		} catch (error) {
			console.error("Error saving deck:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteDeck = async () => {
		if (!selectedDeck) return;

		setSaving(true);
		try {
			await decksAPI.delete(selectedDeck.id);
			setDeleteDialogVisible(false);
			setSelectedDeck(null);
			fetchDecks(accountId);
		} catch (error) {
			console.error("Error deleting deck:", error);
		} finally {
			setSaving(false);
		}
	};

	const handlePlayDeck = (deck) => {
		navigation.navigate("Game", { deck });
	};

	const handleManageFlashcards = (deck) => {
		setSelectedDeck(deck);
		setFlashcardsModalVisible(true);
	};

	// Download deck as CSV
	const handleDownloadCSV = async (deck) => {
		try {
			const response = await flashcardsAPI.getByDeck(deck.id);
			const flashcards = response.data?.decks || response.data || [];

			if (!flashcards || flashcards.length === 0) {
				alert(t("no_flashcards") || "No flashcards to download");
				return;
			}

			// Create CSV content with BOM for Excel UTF-8 support
			const BOM = "\uFEFF";
			const frontHeader = (t("front") || "Front").toUpperCase();
			const backHeader = (t("back") || "Back").toUpperCase();
			const header = `${frontHeader},${backHeader}\n`;
			const rows = flashcards
				.map((card) => {
					const front = `"${(card.front_text || "").replace(/"/g, '""')}"`;
					const back = `"${(card.back_text || "").replace(/"/g, '""')}"`;
					return `${front},${back}`;
				})
				.join("\n");

			const csvContent = BOM + header + rows;

			// Create filename from deck title
			const safeTitle = deck.title.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "_");
			const fileName = `${safeTitle}.csv`;

			// Use cacheDirectory with file:// prefix
			const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

			// Write CSV file (using legacy API - still works)
			await FileSystem.writeAsStringAsync(fileUri, csvContent);

			// Share the file
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(fileUri, {
					mimeType: "text/csv",
					filename: fileName,
					UTI: "public.comma-separated-values-text",
				});
			} else {
				// Fallback to clipboard if sharing not available
				await Clipboard.setStringAsync(csvContent);
				alert(
					t("csv_copied") ||
						`CSV content for "${deck.title}" copied to clipboard!`,
				);
			}
		} catch (error) {
			console.error("Error downloading CSV:", error);
			alert(t("download_error") || "Error downloading file");
		}
	};

	// Parse CSV content
	const parseCSV = (content) => {
		const lines = content.split(/\r?\n/).filter((line) => line.trim());
		if (lines.length < 2) return [];

		const flashcards = [];
		for (let i = 1; i < lines.length; i++) {
			const line = lines[i];
			const matches = line.match(
				/("([^"]*(?:""[^"]*)*)"|[^,]*),("([^"]*(?:""[^"]*)*)"|[^,]*)/,
			);

			let front, back;
			if (matches) {
				front = (matches[2] || matches[1] || "").replace(/""/g, '"').trim();
				back = (matches[4] || matches[3] || "").replace(/""/g, '"').trim();
			} else {
				const parts = line.split(",");
				front = (parts[0] || "").trim();
				back = (parts[1] || "").trim();
			}

			if (front && back) {
				flashcards.push({ front, back });
			}
		}
		return flashcards;
	};

	// Parse JSON content
	const parseJSON = (content) => {
		try {
			const data = JSON.parse(content);
			if (Array.isArray(data)) {
				return data
					.map((item) => ({
						front:
							item.front || item.Front || item.FRONT || item.frontText || "",
						back: item.back || item.Back || item.BACK || item.backText || "",
					}))
					.filter((card) => card.front && card.back);
			}
			if (data.flashcards && Array.isArray(data.flashcards)) {
				return data.flashcards
					.map((item) => ({
						front:
							item.front || item.Front || item.FRONT || item.frontText || "",
						back: item.back || item.Back || item.BACK || item.backText || "",
					}))
					.filter((card) => card.front && card.back);
			}
			return [];
		} catch {
			return [];
		}
	};

	// Handle file pick for import
	const handlePickFile = async () => {
		try {
			const result = await DocumentPicker.getDocumentAsync({
				type: ["text/csv", "application/json", "text/plain"],
				copyToCacheDirectory: true,
			});

			if (result.canceled) return;

			const file = result.assets[0];
			const extension = file.name
				.toLowerCase()
				.substring(file.name.lastIndexOf("."));

			if (![".csv", ".json"].includes(extension)) {
				setImportError(
					t("invalid_file_format") ||
						"Invalid file format. Please use CSV or JSON.",
				);
				return;
			}

			setImportFileName(file.name);
			const defaultTitle = file.name.replace(/\.(csv|json)$/i, "");
			setImportTitle(defaultTitle);

			const content = await FileSystem.readAsStringAsync(file.uri);
			let parsed = [];

			if (extension === ".csv") {
				parsed = parseCSV(content);
			} else if (extension === ".json") {
				parsed = parseJSON(content);
			}

			if (parsed.length === 0) {
				setImportError(
					t("no_valid_cards") || "No valid flashcards found in file.",
				);
				setImportFlashcards([]);
			} else {
				setImportError("");
				setImportFlashcards(parsed);
			}
		} catch (error) {
			console.error("Error picking file:", error);
			setImportError(t("file_read_error") || "Error reading file.");
		}
	};

	// Handle import deck submit
	const handleImportDeck = async () => {
		if (!importTitle.trim() || importFlashcards.length === 0) return;

		setImportLoading(true);
		try {
			// Use import-deck endpoint (creates deck and cards in one call)
			await flashcardsAPI.importDeck(
				importTitle.trim(),
				importDescription.trim(),
				importFlashcards,
			);

			// Refresh decks
			await loadAccountAndDecks();

			// Close modal and reset
			setImportModalVisible(false);
			setImportTitle("");
			setImportDescription("");
			setImportFlashcards([]);
			setImportFileName("");
			setImportError("");
		} catch (error) {
			console.error("Error importing deck:", error);
			alert(t("import_error") || "Error importing deck");
		} finally {
			setImportLoading(false);
		}
	};

	// Open import modal
	const handleOpenImportModal = () => {
		setImportTitle("");
		setImportDescription("");
		setImportFlashcards([]);
		setImportFileName("");
		setImportError("");
		setImportModalVisible(true);
	};

	const renderDeckItem = ({ item }) => (
		<Card style={styles.deckCard}>
			<View style={styles.deckContent}>
				{/* Title and Play Button Row */}
				<View style={styles.deckTitleRow}>
					<View style={styles.deckInfo}>
						<ThemedText variant="h3" style={styles.deckTitle} numberOfLines={1}>
							{item.title}
						</ThemedText>
					</View>

					{/* Play Button - Top Right */}
					<Pressable
						onPress={() => handlePlayDeck(item)}
						style={[
							styles.playButton,
							{
								backgroundColor: "rgba(34, 197, 94, 0.15)",
							},
						]}
					>
						<Ionicons name="play" size={18} color="#22c55e" />
					</Pressable>
				</View>

				{/* Description */}
				<ThemedText
					color="secondary"
					style={styles.deckDescription}
					numberOfLines={1}
				>
					{item.description || t("no_description")}
				</ThemedText>

				{/* Card count and badges */}
				<View style={styles.deckMeta}>
					<View
						style={[
							styles.cardCountBadge,
							{
								backgroundColor: theme.primary.main + "20",
							},
						]}
					>
						<Ionicons
							name="layers-outline"
							size={14}
							color={theme.primary.main}
						/>
						<Text style={[styles.cardCountText, { color: theme.primary.main }]}>
							{item.flashcard_count || 0} {t("cards")}
						</Text>
					</View>

					{/* Hard Mode badge */}
					{item.difficulty_enabled && (
						<View
							style={[
								styles.modeBadge,
								{ backgroundColor: "rgba(249, 115, 22, 0.15)" },
							]}
						>
							<Ionicons name="flame" size={14} color="#f97316" />
						</View>
					)}

					{/* Reverse badge */}
					{item.card_direction === "reverse" && (
						<View
							style={[
								styles.modeBadge,
								{ backgroundColor: "rgba(6, 182, 212, 0.15)" },
							]}
						>
							<Ionicons name="swap-horizontal" size={14} color="#06b6d4" />
						</View>
					)}
				</View>

				{/* Action Buttons Row */}
				<View
					style={[styles.deckActions, { borderTopColor: theme.border.main }]}
				>
					{/* Edit Button */}
					<Pressable
						onPress={() => handleEditDeck(item)}
						style={[
							styles.actionIconButton,
							{ backgroundColor: "rgba(251, 191, 36, 0.1)" },
						]}
					>
						<Ionicons name="create-outline" size={18} color="#fbbf24" />
					</Pressable>

					{/* Flashcards Button */}
					<Pressable
						onPress={() => handleManageFlashcards(item)}
						style={[
							styles.actionIconButton,
							{ backgroundColor: theme.primary.main + "15" },
						]}
					>
						<Ionicons
							name="layers-outline"
							size={18}
							color={theme.primary.main}
						/>
					</Pressable>

					{/* Download Button */}
					<Pressable
						onPress={() => handleDownloadCSV(item)}
						style={[
							styles.actionIconButton,
							{ backgroundColor: "rgba(34, 197, 94, 0.1)" },
						]}
					>
						<Ionicons name="download-outline" size={18} color="#22c55e" />
					</Pressable>

					{/* Spacer */}
					<View style={{ flex: 1 }} />

					{/* Delete Button */}
					<Pressable
						onPress={() => {
							setSelectedDeck(item);
							setDeleteDialogVisible(true);
						}}
						style={[
							styles.actionIconButton,
							{ backgroundColor: "rgba(239, 68, 68, 0.1)" },
						]}
					>
						<Ionicons name="trash-outline" size={18} color="#ef4444" />
					</Pressable>
				</View>
			</View>
		</Card>
	);

	const searchInputRef = useRef(null);

	const handleSearchChange = useCallback((text) => {
		setSearchQuery(text);
	}, []);

	const handleClearSearch = useCallback(() => {
		setSearchQuery("");
		searchInputRef.current?.focus();
	}, []);

	// Search bar component - extracted to prevent FlatList re-render issues
	const SearchBar = (
		<View style={styles.searchRow}>
			<View
				style={[
					styles.searchContainer,
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
					style={styles.searchIcon}
				/>
				<TextInput
					ref={searchInputRef}
					style={[styles.searchInput, { color: theme.text.primary }]}
					placeholder={t("search_decks")}
					placeholderTextColor={theme.text.disabled}
					value={searchQuery}
					onChangeText={handleSearchChange}
					autoCorrect={false}
					autoCapitalize="none"
					returnKeyType="search"
				/>
				{searchQuery ? (
					<Pressable
						onPress={handleClearSearch}
						hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						style={styles.clearButton}
					>
						<Ionicons
							name="close-circle"
							size={18}
							color={theme.primary.main}
						/>
					</Pressable>
				) : null}
			</View>
		</View>
	);

	const renderHeader = () => (
		<View style={styles.header}>
			<View style={styles.titleRow}>
				<ThemedText variant="h2">{t("my_decks")}</ThemedText>
				<ThemedText color="secondary">
					{decks.length} {t("decks_total")}
				</ThemedText>
			</View>

			{/* Sort Options */}
			<View style={styles.sortRow}>
				{["newest", "oldest", "name", "cards"].map((option) => (
					<Pressable
						key={option}
						onPress={() => setSortBy(option)}
						style={[
							styles.sortButton,
							{
								backgroundColor:
									sortBy === option
										? theme.primary.main
										: theme.background.paper,
								borderColor: theme.border.main,
							},
						]}
					>
						<Text
							style={{
								color:
									sortBy === option
										? theme.primary.contrastText
										: theme.text.secondary,
								fontSize: 12,
								fontWeight: "600",
							}}
						>
							{t(`sort_${option}`)}
						</Text>
					</Pressable>
				))}
			</View>

			{/* Create and Import Buttons */}
			<View style={{ flexDirection: "row", gap: spacing.sm }}>
				<Pressable
					onPress={handleCreateDeck}
					style={[
						styles.createButton,
						{
							flex: 1,
							backgroundColor: theme.primary.main,
							borderRadius: borderRadius.lg,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							paddingVertical: spacing.md,
							gap: spacing.sm,
						},
					]}
				>
					<Ionicons name="add" size={22} color="#ffffff" />
					<Text
						style={{
							color: theme.primary.contrastText,
							fontWeight: "700",
							fontSize: 16,
						}}
					>
						{t("new_deck")}
					</Text>
				</Pressable>

				<Pressable
					onPress={handleOpenImportModal}
					style={[
						styles.createButton,
						{
							backgroundColor: theme.background.paper,
							borderRadius: borderRadius.lg,
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "center",
							paddingVertical: spacing.md,
							paddingHorizontal: spacing.lg,
							borderWidth: 1,
							borderColor: theme.border.main,
							gap: spacing.sm,
						},
					]}
				>
					<Ionicons
						name="cloud-upload-outline"
						size={22}
						color={theme.primary.main}
					/>
					<Text
						style={{
							color: theme.primary.main,
							fontWeight: "700",
							fontSize: 16,
						}}
					>
						{t("import") || "Import"}
					</Text>
				</Pressable>
			</View>
		</View>
	);

	if (loading && !refreshing) {
		return (
			<ThemedView variant="gradient" style={styles.container}>
				<LoadingState fullScreen message={t("loading")} />
			</ThemedView>
		);
	}

	return (
		<ThemedView variant="gradient" style={styles.container}>
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				{/* Search Bar - Outside FlatList to prevent keyboard dismiss */}
				<View style={styles.searchWrapper}>{SearchBar}</View>
				<FlatList
					data={filteredDecks}
					renderItem={renderDeckItem}
					keyExtractor={(item) => item.id.toString()}
					ListHeaderComponent={renderHeader}
					ListEmptyComponent={
						<EmptyState
							iconName="cards-outline"
							title={searchQuery ? t("no_results") : t("create_first_deck")}
							description={
								searchQuery ? t("no_results_desc") : t("create_first_deck_desc")
							}
							actionLabel={searchQuery ? t("clear_search") : t("create_deck")}
							onAction={
								searchQuery ? () => setSearchQuery("") : handleCreateDeck
							}
						/>
					}
					contentContainerStyle={styles.listContent}
					keyboardShouldPersistTaps="always"
					keyboardDismissMode="none"
					removeClippedSubviews={false}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							tintColor={theme.primary.main}
						/>
					}
				/>

				{/* Deck Modal */}
				<Modal
					visible={deckModalVisible}
					onClose={() => setDeckModalVisible(false)}
					title={selectedDeck ? t("edit_deck") : t("new_deck")}
					footer={
						<View style={styles.modalFooter}>
							<Button
								variant="ghost"
								onPress={() => setDeckModalVisible(false)}
							>
								{t("cancel")}
							</Button>
							<Button onPress={handleSaveDeck} loading={saving}>
								{t("save")}
							</Button>
						</View>
					}
				>
					<Input
						label={t("deck_title")}
						value={deckTitle}
						onChangeText={setDeckTitle}
						placeholder={t("deck_title_placeholder")}
					/>
					<Input
						label={t("deck_description")}
						value={deckDescription}
						onChangeText={setDeckDescription}
						placeholder={t("deck_description_placeholder")}
						multiline
						numberOfLines={3}
					/>

					{/* Game Options Section */}
					<View
						style={[
							styles.gameOptionsSection,
							{
								backgroundColor: theme.primary.main + "15",
								borderColor: theme.primary.main + "25",
							},
						]}
					>
						<View style={styles.gameOptionsHeader}>
							<Ionicons
								name="settings-outline"
								size={18}
								color={theme.primary.main}
							/>
							<Text
								style={[styles.gameOptionsTitle, { color: theme.text.primary }]}
							>
								{t("game_options") || "Game Options"}
							</Text>
						</View>

						<Text
							style={[styles.gameOptionLabel, { color: theme.text.secondary }]}
						>
							{t("game_mode") || "Game Mode"}
						</Text>
						<View style={styles.modeOptionsContainer}>
							{MODE_OPTIONS.map((option) => (
								<Pressable
									key={option.value}
									onPress={() => setDeckMode(option.value)}
									style={[
										styles.modeOption,
										{
											backgroundColor:
												deckMode === option.value
													? option.color + "20"
													: theme.background.paper,
											borderColor:
												deckMode === option.value
													? option.color
													: theme.border.main,
											borderWidth: deckMode === option.value ? 2 : 1,
										},
									]}
								>
									<Text
										style={[
											styles.modeOptionText,
											{
												color:
													deckMode === option.value
														? option.color
														: theme.text.secondary,
												fontWeight: deckMode === option.value ? "700" : "500",
											},
										]}
									>
										{option.label}
									</Text>
								</Pressable>
							))}
						</View>
					</View>
				</Modal>

				{/* Delete Confirmation */}
				<ConfirmDialog
					visible={deleteDialogVisible}
					onClose={() => setDeleteDialogVisible(false)}
					onConfirm={handleDeleteDeck}
					title={t("delete_deck")}
					message={t("delete_deck_warning")}
					confirmLabel={t("delete")}
					loading={saving}
				/>

				{/* Flashcards Modal */}
				<FlashcardsModal
					visible={flashcardsModalVisible}
					onClose={() => setFlashcardsModalVisible(false)}
					deck={selectedDeck}
					theme={theme}
					t={t}
					onUpdate={() => fetchDecks(accountId, true)}
				/>

				{/* Import Deck Modal */}
				<Modal
					visible={importModalVisible}
					onClose={() => setImportModalVisible(false)}
					title={t("import_deck") || "Import Deck"}
				>
					<View style={{ gap: spacing.md }}>
						{/* File Upload Area */}
						<Pressable
							onPress={handlePickFile}
							style={{
								borderWidth: 2,
								borderStyle: "dashed",
								borderColor:
									importFlashcards.length > 0
										? theme.success.main
										: theme.border.main,
								borderRadius: borderRadius.lg,
								padding: spacing.xl,
								alignItems: "center",
								backgroundColor:
									importFlashcards.length > 0
										? theme.success.main + "10"
										: theme.background.paper,
							}}
						>
							<Ionicons
								name={
									importFlashcards.length > 0
										? "checkmark-circle"
										: "cloud-upload-outline"
								}
								size={40}
								color={
									importFlashcards.length > 0
										? theme.success.main
										: theme.primary.main
								}
							/>
							<ThemedText
								style={{ marginTop: spacing.sm, textAlign: "center" }}
							>
								{importFileName
									? importFileName
									: t("tap_to_select_file") || "Tap to select a file"}
							</ThemedText>
							<ThemedText
								color="secondary"
								style={{ fontSize: 12, marginTop: spacing.xs }}
							>
								{t("supported_formats") || "Supports CSV and JSON"}
							</ThemedText>
						</Pressable>

						{/* Error Message */}
						{importError ? (
							<View
								style={{
									backgroundColor: theme.error.main + "20",
									padding: spacing.md,
									borderRadius: borderRadius.md,
								}}
							>
								<ThemedText style={{ color: theme.error.main }}>
									{importError}
								</ThemedText>
							</View>
						) : null}

						{/* Format Help - only show when no file selected */}
						{importFlashcards.length === 0 && (
							<View
								style={{
									backgroundColor: theme.background.paper,
									padding: spacing.md,
									borderRadius: borderRadius.md,
									borderWidth: 1,
									borderColor: theme.border.main,
								}}
							>
								<ThemedText
									variant="subtitle"
									style={{ marginBottom: spacing.xs }}
								>
									{t("file_format_help") || "File Format"}
								</ThemedText>
								<ThemedText color="secondary" style={{ fontSize: 12 }}>
									CSV:{" "}
									{t("csv_format_desc") ||
										"First row as header (FRONT, BACK), then data rows"}
								</ThemedText>
								<ThemedText
									color="secondary"
									style={{ fontSize: 12, marginTop: 4 }}
								>
									JSON:{" "}
									{t("json_format_desc") || '[{"front": "...", "back": "..."}]'}
								</ThemedText>
							</View>
						)}

						{/* Deck Title - only show after file selected */}
						{importFlashcards.length > 0 && (
							<Input
								label={t("deck_title") || "Deck Title"}
								value={importTitle}
								onChangeText={setImportTitle}
								placeholder={t("enter_deck_title") || "Enter deck title"}
							/>
						)}

						{/* Deck Description - only show after file selected */}
						{importFlashcards.length > 0 && (
							<Input
								label={t("deck_description") || "Deck Description"}
								value={importDescription}
								onChangeText={setImportDescription}
								placeholder={
									t("deck_description_placeholder") ||
									"Optional description for your deck..."
								}
								multiline
								numberOfLines={2}
							/>
						)}

						{/* Cards Preview Table - at the bottom after inputs */}
						{importFlashcards.length > 0 && (
							<View>
								<ThemedText
									color="secondary"
									style={{ marginBottom: spacing.xs, fontSize: 13 }}
								>
									{t("preview") || "Preview"} (
									{t("first_5_cards") || "first 5 cards"})
								</ThemedText>
								<View
									style={{
										backgroundColor: theme.background.paper,
										borderRadius: borderRadius.md,
										borderWidth: 1,
										borderColor: theme.border.main,
										overflow: "hidden",
									}}
								>
									{/* Table Header */}
									<View
										style={{
											flexDirection: "row",
											backgroundColor: theme.primary.main + "20",
											paddingVertical: spacing.sm,
											paddingHorizontal: spacing.md,
										}}
									>
										<ThemedText
											style={{ flex: 1, fontWeight: "600", fontSize: 13 }}
										>
											{t("front_side") || "Front"}
										</ThemedText>
										<ThemedText
											style={{ flex: 1, fontWeight: "600", fontSize: 13 }}
										>
											{t("back_side") || "Back"}
										</ThemedText>
									</View>
									{/* Table Rows */}
									{importFlashcards.slice(0, 5).map((card, index) => (
										<View
											key={index}
											style={{
												flexDirection: "row",
												paddingVertical: spacing.sm,
												paddingHorizontal: spacing.md,
												borderTopWidth: 1,
												borderTopColor: theme.border.main,
											}}
										>
											<ThemedText
												numberOfLines={1}
												style={{ flex: 1, fontSize: 12 }}
											>
												{card.front}
											</ThemedText>
											<ThemedText
												numberOfLines={1}
												style={{ flex: 1, fontSize: 12 }}
											>
												{card.back}
											</ThemedText>
										</View>
									))}
								</View>
								{importFlashcards.length > 5 && (
									<ThemedText
										color="secondary"
										style={{ marginTop: spacing.xs, fontSize: 12 }}
									>
										{t("and_more_cards")?.replace(
											"{{count}}",
											importFlashcards.length - 5,
										) || `...and ${importFlashcards.length - 5} more cards`}
									</ThemedText>
								)}
							</View>
						)}

						{/* Import Button */}
						<Button
							onPress={handleImportDeck}
							disabled={
								!importTitle.trim() ||
								importFlashcards.length === 0 ||
								importLoading
							}
							loading={importLoading}
							variant="success"
						>
							{importLoading
								? t("importing") || "Importing..."
								: importFlashcards.length > 0
									? `${t("import") || "Import"} (${importFlashcards.length} ${t("cards") || "cards"})`
									: t("import") || "Import"}
						</Button>
					</View>
				</Modal>
			</SafeAreaView>
		</ThemedView>
	);
};

// Flashcards Modal Component
const FlashcardsModal = ({ visible, onClose, deck, theme, t, onUpdate }) => {
	const [flashcards, setFlashcards] = useState([]);
	const [loading, setLoading] = useState(false);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const [editingCard, setEditingCard] = useState(null);
	const [frontText, setFrontText] = useState("");
	const [backText, setBackText] = useState("");
	const [saving, setSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	// Filter flashcards based on search query
	const filteredFlashcards = flashcards.filter((card) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			card.front_text.toLowerCase().includes(query) ||
			card.back_text.toLowerCase().includes(query)
		);
	});

	// Truncate text helper
	const truncateText = (text, maxLength = 40) => {
		if (!text) return "";
		return text.length > maxLength
			? text.substring(0, maxLength) + "..."
			: text;
	};

	// Truncate deck title
	const displayTitle = deck?.title
		? deck.title.length > 25
			? deck.title.substring(0, 25) + "..."
			: deck.title
		: t("flashcards");

	useEffect(() => {
		if (visible && deck) {
			fetchFlashcards();
			setSearchQuery(""); // Reset search when opening
		}
	}, [visible, deck]);

	const fetchFlashcards = async () => {
		if (!deck) return;
		setLoading(true);
		try {
			const response = await flashcardsAPI.getByDeck(deck.id);
			// Backend returns { decks: [...] } for flashcards (naming quirk)
			const flashcardsData = response.data?.decks || response.data || [];
			setFlashcards(Array.isArray(flashcardsData) ? flashcardsData : []);
		} catch (error) {
			console.error("Error fetching flashcards:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleAddCard = () => {
		setEditingCard(null);
		setFrontText("");
		setBackText("");
		setAddModalVisible(true);
	};

	const handleEditCard = (card) => {
		setEditingCard(card);
		setFrontText(card.front_text);
		setBackText(card.back_text);
		setAddModalVisible(true);
	};

	const handleSaveCard = async () => {
		if (!frontText.trim() || !backText.trim()) return;

		setSaving(true);
		try {
			if (editingCard) {
				await flashcardsAPI.update(
					editingCard.id,
					frontText.trim(),
					backText.trim(),
				);
			} else {
				await flashcardsAPI.create(deck.id, frontText.trim(), backText.trim());
			}
			setAddModalVisible(false);
			fetchFlashcards();
			if (onUpdate) onUpdate();
		} catch (error) {
			console.error("Error saving card:", error);
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteCard = async (cardId) => {
		try {
			await flashcardsAPI.delete(cardId);
			fetchFlashcards();
			if (onUpdate) onUpdate();
		} catch (error) {
			console.error("Error deleting card:", error);
		}
	};

	return (
		<Modal
			visible={visible}
			onClose={onClose}
			title={displayTitle}
			size="large"
		>
			{loading ? (
				<LoadingState message={t("loading_cards")} />
			) : (
				<View>
					{/* Add Button */}
					<Pressable
						onPress={handleAddCard}
						style={[
							styles.addFlashcardButton,
							{ backgroundColor: theme.success.main },
						]}
					>
						<Ionicons name="add" size={20} color="#ffffff" />
						<Text style={styles.addFlashcardButtonText}>
							{t("add_flashcard")}
						</Text>
					</Pressable>

					{/* Search Bar (only if flashcards exist) */}
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
								value={searchQuery}
								onChangeText={setSearchQuery}
								autoCorrect={false}
								autoCapitalize="none"
							/>
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

					{/* Card count badge */}
					{flashcards.length > 0 && (
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
								{searchQuery
									? `${filteredFlashcards.length} / ${flashcards.length}`
									: flashcards.length}{" "}
								{flashcards.length === 1
									? t("card") || "card"
									: t("cards") || "cards"}
							</Text>
						</View>
					)}

					{flashcards.length === 0 ? (
						<EmptyState
							icon={
								<Ionicons
									name="layers-outline"
									size={48}
									color={theme.primary.main}
								/>
							}
							title={t("no_flashcards")}
							description={t("no_flashcards_desc")}
						/>
					) : filteredFlashcards.length === 0 ? (
						<EmptyState
							icon={
								<Ionicons
									name="search-outline"
									size={48}
									color={theme.text.secondary}
								/>
							}
							title={t("no_results") || "No results found"}
							description={
								t("no_search_results_flashcards") ||
								"No flashcards match your search"
							}
							actionLabel={t("clear_search") || "Clear Search"}
							onAction={() => setSearchQuery("")}
						/>
					) : (
						filteredFlashcards.map((card) => (
							<View
								key={card.id}
								style={[
									styles.flashcardItem,
									{ borderColor: theme.border.main },
								]}
							>
								{/* Color indicator */}
								<View style={styles.flashcardColorIndicator} />
								<View style={styles.flashcardContent}>
									<ThemedText style={styles.flashcardFront} numberOfLines={1}>
										{truncateText(card.front_text, 35)}
									</ThemedText>
									<ThemedText
										color="secondary"
										style={styles.flashcardBack}
										numberOfLines={1}
									>
										{truncateText(card.back_text, 45)}
									</ThemedText>
								</View>
								<View style={styles.flashcardActions}>
									<Pressable
										onPress={() => handleEditCard(card)}
										style={[
											styles.flashcardActionBtn,
											{ backgroundColor: "rgba(251, 191, 36, 0.1)" },
										]}
									>
										<Ionicons name="create-outline" size={18} color="#fbbf24" />
									</Pressable>
									<Pressable
										onPress={() => handleDeleteCard(card.id)}
										style={[
											styles.flashcardActionBtn,
											{ backgroundColor: "rgba(239, 68, 68, 0.1)" },
										]}
									>
										<Ionicons name="trash-outline" size={18} color="#ef4444" />
									</Pressable>
								</View>
							</View>
						))
					)}
				</View>
			)}

			{/* Add/Edit Flashcard Modal */}
			<Modal
				visible={addModalVisible}
				onClose={() => setAddModalVisible(false)}
				title={editingCard ? t("update_flashcard") : t("add_flashcard")}
				footer={
					<View style={styles.modalFooter}>
						<Button variant="ghost" onPress={() => setAddModalVisible(false)}>
							{t("cancel")}
						</Button>
						<Button onPress={handleSaveCard} loading={saving}>
							{t("save")}
						</Button>
					</View>
				}
			>
				<Input
					label={t("front_side")}
					value={frontText}
					onChangeText={setFrontText}
					placeholder={t("enter_the_question_or_term")}
					multiline
					numberOfLines={3}
				/>
				<Input
					label={t("back_side")}
					value={backText}
					onChangeText={setBackText}
					placeholder={t("enter_the_answer_or_definition")}
					multiline
					numberOfLines={3}
				/>
			</Modal>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	safeArea: {
		flex: 1,
	},
	listContent: {
		padding: spacing.md,
		paddingBottom: spacing.xxl,
	},
	header: {
		marginBottom: spacing.md,
	},
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: spacing.md,
	},
	searchWrapper: {
		paddingHorizontal: spacing.md,
		paddingTop: spacing.sm,
	},
	searchRow: {
		marginBottom: spacing.xs,
	},
	searchContainer: {
		flexDirection: "row",
		alignItems: "center",
		borderRadius: borderRadius.md,
		borderWidth: 1,
		paddingHorizontal: spacing.md,
	},
	searchIcon: {
		marginRight: spacing.sm,
	},
	searchInput: {
		flex: 1,
		paddingVertical: spacing.sm,
		fontSize: 16,
	},
	clearButton: {
		padding: spacing.xs,
	},
	sortRow: {
		flexDirection: "row",
		gap: spacing.xs,
		marginBottom: spacing.md,
		flexWrap: "wrap",
	},
	sortButton: {
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.sm,
		borderWidth: 1,
	},
	createButton: {
		marginBottom: spacing.sm,
	},
	deckCard: {
		marginBottom: spacing.md,
	},
	deckHeader: {
		marginBottom: spacing.sm,
	},
	deckInfo: {
		flex: 1,
	},
	deckTitle: {
		marginBottom: spacing.xs,
	},
	deckDescription: {
		fontSize: 14,
		marginBottom: spacing.sm,
	},
	deckMeta: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.xs,
		marginBottom: spacing.sm,
		flexWrap: "wrap",
	},
	cardCount: {
		fontSize: 13,
		fontWeight: "600",
	},
	deckContent: {
		padding: spacing.md,
	},
	deckTitleRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		marginBottom: spacing.xs,
	},
	playButton: {
		width: 36,
		height: 36,
		borderRadius: borderRadius.md,
		alignItems: "center",
		justifyContent: "center",
	},
	cardCountBadge: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.md,
	},
	cardCountText: {
		fontSize: 12,
		fontWeight: "600",
	},
	modeBadge: {
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: borderRadius.md,
	},
	modeBadgeText: {
		fontSize: 11,
		fontWeight: "600",
	},
	actionIconButton: {
		width: 34,
		height: 34,
		borderRadius: borderRadius.sm,
		alignItems: "center",
		justifyContent: "center",
	},
	deckActions: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		borderTopWidth: 1,
		paddingTop: spacing.sm,
		marginTop: spacing.xs,
	},
	actionButton: {
		flex: 1,
	},
	iconButton: {
		padding: spacing.xs,
	},
	gameOptionsSection: {
		marginTop: spacing.md,
		padding: spacing.md,
		borderRadius: borderRadius.lg,
		borderWidth: 1,
	},
	gameOptionsHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	gameOptionsTitle: {
		fontSize: 15,
		fontWeight: "600",
	},
	gameOptionLabel: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: spacing.sm,
	},
	modeOptionsContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: spacing.xs,
	},
	modeOption: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.sm,
		borderRadius: borderRadius.md,
	},
	modeOptionText: {
		fontSize: 12,
	},
	modalFooter: {
		flexDirection: "row",
		justifyContent: "flex-end",
		gap: spacing.sm,
	},
	flashcardItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.sm,
		borderBottomWidth: 1,
		marginBottom: spacing.xs,
	},
	flashcardColorIndicator: {
		width: 4,
		height: "100%",
		minHeight: 40,
		borderRadius: 2,
		backgroundColor: "#3b82f6",
		marginRight: spacing.sm,
	},
	flashcardContent: {
		flex: 1,
	},
	flashcardFront: {
		fontWeight: "600",
		marginBottom: 4,
	},
	flashcardBack: {
		fontSize: 13,
	},
	flashcardActions: {
		flexDirection: "row",
		gap: spacing.sm,
	},
	flashcardActionBtn: {
		padding: spacing.xs,
		borderRadius: 8,
	},
	addFlashcardButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: spacing.sm,
		paddingHorizontal: spacing.md,
		borderRadius: 10,
		marginBottom: spacing.md,
		gap: spacing.xs,
	},
	addFlashcardButtonText: {
		color: "#ffffff",
		fontWeight: "600",
		fontSize: 15,
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
	cardCountBadgeModal: {
		alignSelf: "flex-start",
		paddingHorizontal: spacing.sm,
		paddingVertical: spacing.xs,
		borderRadius: 8,
		marginBottom: spacing.md,
	},
	cardCountTextModal: {
		fontSize: 12,
		fontWeight: "600",
	},
});

export default HomeScreen;
