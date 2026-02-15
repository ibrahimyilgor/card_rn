import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { Video, Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { spacing, borderRadius } from "../../styles/theme";

// Statically required video assets so bundler includes them
const DEFAULT_ADS = [
	require("../../../assets/videos/ads/apple.mp4"),
	require("../../../assets/videos/ads/thy.mp4"),
];

const VideoAdModal = ({ visible, source, onClose }) => {
	const { theme } = useTheme();
	const videoRef = useRef(null);

	const [blockedMs, setBlockedMs] = useState(10000); // minimum block period (ms)
	const [positionMs, setPositionMs] = useState(0);
	const [durationMs, setDurationMs] = useState(null);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (!visible) return;

		// Prepare audio mode to allow playback (iOS silent mode)
		(async () => {
			try {
				const audioMode = {
					allowsRecordingIOS: false,
					staysActiveInBackground: false,
					playsInSilentModeIOS: true,
					shouldDuckAndroid: true,
				};

				// Add interruption mode keys only if the constants exist on the Audio object
				if (typeof Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX !== "undefined") {
					audioMode.interruptionModeIOS =
						Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX;
				} else if (
					typeof Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS !== "undefined"
				) {
					audioMode.interruptionModeIOS =
						Audio.INTERRUPTION_MODE_IOS_DUCK_OTHERS;
				}

				if (typeof Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX !== "undefined") {
					audioMode.interruptionModeAndroid =
						Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
				} else if (
					typeof Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS !== "undefined"
				) {
					audioMode.interruptionModeAndroid =
						Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS;
				}

				await Audio.setAudioModeAsync(audioMode);
			} catch (e) {
				console.warn("[VideoAdModal] Audio.setAudioModeAsync failed", e);
			}

			// Reset playback-related state to ensure a fresh start every time the modal opens
			setInitialized(false);
			setPositionMs(0);
			setDurationMs(null);
			// Always enforce a 10s mandatory watch on open
			setBlockedMs(10000);

			// Ensure playback starts from 0 and begins playing immediately
			try {
				if (videoRef.current) {
					if (videoRef.current.setPositionAsync) {
						await videoRef.current.setPositionAsync(0);
					}
					if (videoRef.current.playAsync) {
						await videoRef.current.playAsync();
					} else if (videoRef.current.replayAsync) {
						await videoRef.current.replayAsync();
					}
				}
			} catch (e) {
				// ignore playback start errors
			}
		})();
	}, [visible]);

	const handleStatusUpdate = (status) => {
		if (!status) return;
		// update debug/logging optionally
		if (status.isLoaded) {
			setInitialized(true);
			setPositionMs(status.positionMillis || 0);
			if (status.durationMillis) {
				setDurationMs(status.durationMillis);
				// Do NOT lower the blocked period here. We want the timer to always
				// start at 10s when the ad opens, even for shorter videos.
			}

			if (status.didJustFinish) {
				onClose && onClose();
			}
		}
	};

	const remainingMs = Math.max(0, blockedMs - positionMs);
	const remainingSec = Math.ceil(remainingMs / 1000);
	const closeAllowed = remainingMs <= 0;

	const videoSource =
		source || DEFAULT_ADS[Math.floor(Math.random() * DEFAULT_ADS.length)];

	return (
		<Modal visible={visible} animationType="fade" transparent>
			<View style={[styles.overlay, { backgroundColor: "#000" }]}>
				<View style={styles.container}>
					<View style={styles.videoWrapper}>
						<Video
							ref={videoRef}
							source={videoSource}
							style={styles.video}
							useNativeControls={false}
							resizeMode="contain"
							onPlaybackStatusUpdate={handleStatusUpdate}
							shouldPlay
							isLooping={false}
							volume={1.0}
							isMuted={false}
						/>
					</View>

					<View style={styles.topRight} pointerEvents="box-none">
						{initialized && remainingMs > 0 && (
							<View style={styles.countdownBox}>
								<Text style={styles.countdownText}>{remainingSec}s</Text>
							</View>
						)}
						{initialized && closeAllowed && (
							<TouchableOpacity
								onPress={() => onClose && onClose()}
								style={styles.closeButton}
							>
								<Ionicons name="close-circle" size={34} color="#fff" />
							</TouchableOpacity>
						)}
					</View>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	container: {
		width: "100%",
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	videoWrapper: {
		width: "100%",
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	video: {
		width: "90%",
		aspectRatio: 16 / 9,
		maxHeight: "80%",
		backgroundColor: "#000",
		borderRadius: borderRadius.lg,
	},
	topRight: {
		position: "absolute",
		top: spacing.md,
		right: spacing.md,
		flexDirection: "row",
		alignItems: "center",
	},
	countdownBox: {
		backgroundColor: "rgba(0,0,0,0.6)",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 6,
		marginRight: 8,
	},
	countdownText: {
		color: "#fff",
		fontWeight: "700",
	},
	closeButton: {},
});

export default VideoAdModal;
