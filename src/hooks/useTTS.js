import { useState, useCallback, useEffect, useRef } from "react";

let Speech = null;
try {
	const mod = require("expo-speech");
	Speech = mod?.default ?? mod;
	if (typeof Speech?.speak !== "function") Speech = null;
} catch (_) {}

const useTTS = () => {
	const [isSpeaking, setIsSpeaking] = useState(false);
	const activeRef = useRef(false);

	useEffect(() => {
		return () => {
			activeRef.current = false;
			try { Speech?.stop(); } catch (_) {}
		};
	}, []);

	const speak = useCallback((text) => {
		if (!text) return;
		if (!Speech) {
			console.warn("TTS: run `expo run:android` or `expo run:ios` to enable.");
			return;
		}
		try { Speech.stop(); } catch (_) {}
		activeRef.current = true;
		setIsSpeaking(true);
		try {
			Speech.speak(text, {
				language: "en-US",
				pitch: 0.7,  // lower = deeper male voice
				rate: 0.9,
				onDone: () => { if (activeRef.current) setIsSpeaking(false); },
				onStopped: () => { if (activeRef.current) setIsSpeaking(false); },
				onError: () => { if (activeRef.current) setIsSpeaking(false); },
			});
		} catch (e) {
			console.warn("TTS error:", e?.message ?? e);
			setIsSpeaking(false);
		}
	}, []);

	const stop = useCallback(() => {
		try { Speech?.stop(); } catch (_) {}
		setIsSpeaking(false);
	}, []);

	return { isSpeaking, speak, stop };
};

export default useTTS;
