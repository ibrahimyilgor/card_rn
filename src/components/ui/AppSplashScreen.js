import React, { useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Animated, Easing } from "react-native";

const AppSplashScreen = ({ opacity }) => {
	const pulseAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const pulseLoop = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.06,
					duration: 800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true,
				}),
			]),
		);

		pulseLoop.start();
		return () => pulseLoop.stop();
	}, [pulseAnim]);

	return (
		<Animated.View style={[styles.container, { opacity }]}>
			<Animated.View
				style={[styles.logoWrap, { transform: [{ scale: pulseAnim }] }]}
			>
				<Image
					source={require("../../../assets/memodeck.png")}
					style={styles.logo}
					resizeMode="contain"
				/>
			</Animated.View>
			<Text style={styles.title}>MemoDeck</Text>
			{/* <Text style={styles.subtitle}>Learn smarter, every day</Text> */}
		</Animated.View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0a0e14",
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 24,
	},
	logoWrap: {
		width: 132,
		height: 132,
		borderRadius: 66,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(245, 244, 245)",
		borderWidth: 1,
		borderColor: "rgba(59, 130, 246, 0.35)",
		marginBottom: 20,
	},
	logo: {
		width: 86,
		height: 86,
	},
	title: {
		fontSize: 28,
		fontWeight: "800",
		color: "#E6EEF8",
		letterSpacing: 0.3,
	},
	subtitle: {
		marginTop: 8,
		fontSize: 14,
		fontWeight: "500",
		color: "#9FB0C8",
		letterSpacing: 0.2,
	},
});

export default AppSplashScreen;
