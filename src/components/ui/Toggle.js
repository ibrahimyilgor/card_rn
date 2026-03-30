import React, { useEffect, useRef } from "react";
import { Pressable, Animated } from "react-native";

const TRACK_W = 42;
const TRACK_H = 26;
const THUMB_SIZE = 22;
const THUMB_PADDING = 2;
const TRAVEL = TRACK_W - THUMB_SIZE - THUMB_PADDING * 2;

const Toggle = ({ value, onValueChange, activeColor = "#3b82f6", inactiveColor = "#3a3a3c" }) => {
	const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

	useEffect(() => {
		Animated.timing(anim, {
			toValue: value ? 1 : 0,
			duration: 220,
			useNativeDriver: false,
		}).start();
	}, [value]);

	const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [THUMB_PADDING, THUMB_PADDING + TRAVEL] });
	const trackColor = anim.interpolate({ inputRange: [0, 1], outputRange: [inactiveColor, activeColor] });

	return (
		<Pressable
			onPress={() => onValueChange?.(!value)}
			style={{ width: TRACK_W, height: TRACK_H, justifyContent: "center" }}
			hitSlop={8}
		>
			<Animated.View style={{
				width: TRACK_W,
				height: TRACK_H,
				borderRadius: TRACK_H / 2,
				backgroundColor: trackColor,
				justifyContent: "center",
			}}>
				<Animated.View style={{
					width: THUMB_SIZE,
					height: THUMB_SIZE,
					borderRadius: THUMB_SIZE / 2,
					backgroundColor: "#fff",
					transform: [{ translateX }],
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 1 },
					shadowOpacity: 0.15,
					shadowRadius: 2,
					elevation: 2,
				}} />
			</Animated.View>
		</Pressable>
	);
};

export default Toggle;
