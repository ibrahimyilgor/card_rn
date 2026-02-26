import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Sound files mapping
const SOUND_FILES = {
	correct: require("../../assets/sounds/correct.mp3"),
	incorrect: require("../../assets/sounds/wrong.mp3"),
	wrong: require("../../assets/sounds/wrong.mp3"),
	complete: require("../../assets/sounds/success.mp3"),
	success: require("../../assets/sounds/success.mp3"),
	flip: require("../../assets/sounds/flip.mp3"), // Using correct sound for flip
	achievement: require("../../assets/sounds/success.mp3"),
};

// Sound cache
const soundCache = {};

// Sound enabled state
let soundEnabledCache = true;

// Check if sound is enabled
const isSoundEnabled = async () => {
	try {
		const enabled = await AsyncStorage.getItem("soundEffects");
		soundEnabledCache = enabled !== "false";
		return soundEnabledCache;
	} catch {
		return true;
	}
};

// Initialize audio settings
export const initAudio = async () => {
	try {
		await Audio.setAudioModeAsync({
			playsInSilentModeIOS: true,
			staysActiveInBackground: false,
			shouldDuckAndroid: true,
		});
		await isSoundEnabled();
	} catch (error) {
		console.log("Audio init error:", error);
	}
};

// Play a sound
export const playSound = async (soundName) => {
	try {
		// Check if sound is enabled
		if (!soundEnabledCache) {
			const enabled = await isSoundEnabled();
			if (!enabled) return;
		}

		const soundFile = SOUND_FILES[soundName];
		if (!soundFile) {
			console.log(`Sound not found: ${soundName}`);
			return;
		}

		// Create and play sound
		const { sound } = await Audio.Sound.createAsync(soundFile);

		// Play the sound
		await sound.playAsync();

		// Unload after playing
		sound.setOnPlaybackStatusUpdate((status) => {
			if (status.didJustFinish) {
				sound.unloadAsync();
			}
		});
	} catch (error) {
		console.log(`Error playing sound ${soundName}:`, error);
	}
};

// Preload all sounds
export const preloadSounds = async () => {
	await initAudio();

	// Preload sounds into cache
	for (const [name, file] of Object.entries(SOUND_FILES)) {
		try {
			const { sound } = await Audio.Sound.createAsync(file);
			soundCache[name] = sound;
		} catch (error) {
			console.log(`Error preloading ${name}:`, error);
		}
	}
};

// Unload all sounds
export const unloadSounds = async () => {
	for (const key in soundCache) {
		try {
			await soundCache[key].unloadAsync();
		} catch (error) {
			// Ignore
		}
	}
};

// Set sound enabled/disabled
export const setSoundEnabled = async (enabled) => {
	try {
		await AsyncStorage.setItem("soundEffects", enabled.toString());
		soundEnabledCache = enabled;
	} catch (error) {
		console.error("Error saving sound preference:", error);
	}
};

// Sound helper object
const sounds = {
	correct: () => playSound("correct"),
	incorrect: () => playSound("incorrect"),
	wrong: () => playSound("wrong"),
	flip: () => playSound("flip"),
	complete: () => playSound("complete"),
	success: () => playSound("success"),
	achievement: () => playSound("achievement"),
};

export default sounds;
