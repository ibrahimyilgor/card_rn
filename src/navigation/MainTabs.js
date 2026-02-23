import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import {
	getFocusedRouteNameFromRoute,
	StackActions,
} from "@react-navigation/native";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../context/I18nContext";

// Screens
import HomeScreen from "../screens/HomeScreen";
import StatsScreen from "../screens/StatsScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import GameScreen from "../screens/GameScreen";
import AccountScreen from "../screens/AccountScreen";
import PlansScreen from "../screens/PlansScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Icon component using Ionicons with subtle animation
const TabIcon = ({ name, focused, color }) => {
	const icons = {
		home: focused ? "home" : "home-outline",
		stats: focused ? "bar-chart" : "bar-chart-outline",
		achievements: focused ? "trophy" : "trophy-outline",
		settings: focused ? "settings" : "settings-outline",
	};

	const scaleRef = React.useRef(new Animated.Value(focused ? 1 : 0.95)).current;

	React.useEffect(() => {
		Animated.spring(scaleRef, {
			toValue: focused ? 1.15 : 1,
			useNativeDriver: true,
			speed: 20,
			bounciness: focused ? 12 : 4,
		}).start();
	}, [focused]);

	return (
		<Animated.View style={{ transform: [{ scale: scaleRef }] }}>
			<Ionicons name={icons[name]} size={focused ? 24 : 22} color={color} />
		</Animated.View>
	);
};

// Home Stack (includes Game screen)
const HomeStack = ({ onLogout }) => {
	const { theme } = useTheme();

	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				cardStyle: { backgroundColor: theme.background.default },
			}}
		>
			<Stack.Screen name="HomeMain">
				{(props) => <HomeScreen {...props} onLogout={onLogout} />}
			</Stack.Screen>
			<Stack.Screen name="Game" component={GameScreen} />
		</Stack.Navigator>
	);
};

// Settings Stack
const SettingsStack = ({ onLogout }) => {
	const { theme } = useTheme();

	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				cardStyle: { backgroundColor: theme.background.default },
			}}
		>
			<Stack.Screen name="SettingsMain">
				{(props) => <SettingsScreen {...props} onLogout={onLogout} />}
			</Stack.Screen>
			<Stack.Screen name="Account">
				{(props) => <AccountScreen {...props} onLogout={onLogout} />}
			</Stack.Screen>
			<Stack.Screen name="Plans" component={PlansScreen} />
		</Stack.Navigator>
	);
};

const MainTabs = ({ onLogout }) => {
	const { theme } = useTheme();
	const { t } = useI18n();

	return (
		<Tab.Navigator
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: theme.background.paper,
					borderTopColor: theme.border.main,
					borderTopWidth: 1,
					height: 65,
					paddingBottom: 10,
					paddingTop: 6,
				},
				tabBarActiveTintColor: theme.primary.main,
				tabBarInactiveTintColor: theme.text.secondary,
				tabBarLabelStyle: {
					fontSize: 11,
					fontWeight: "600",
					marginTop: -2,
				},
				tabBarIconStyle: {
					marginTop: 2,
				},
			}}
		>
			<Tab.Screen
				name="Home"
				options={({ route }) => {
					const routeName = getFocusedRouteNameFromRoute(route) ?? "HomeMain";
					return {
						tabBarLabel: t("home"),
						tabBarIcon: ({ focused, color }) => (
							<TabIcon name="home" focused={focused} color={color} />
						),
						tabBarStyle:
							routeName === "Game"
								? { display: "none" }
								: {
										backgroundColor: theme.background.paper,
										borderTopColor: theme.border.main,
										borderTopWidth: 1,
										height: 65,
										paddingBottom: 10,
										paddingTop: 6,
									},
					};
				}}
				listeners={({ navigation }) => ({
					tabPress: (e) => {
						if (navigation.isFocused()) {
							navigation.dispatch(StackActions.popToTop());
						}
					},
				})}
			>
				{(props) => <HomeStack {...props} onLogout={onLogout} />}
			</Tab.Screen>

			<Tab.Screen
				name="Stats"
				component={StatsScreen}
				options={{
					tabBarLabel: t("statistics"),
					tabBarIcon: ({ focused, color }) => (
						<TabIcon name="stats" focused={focused} color={color} />
					),
				}}
			/>

			<Tab.Screen
				name="Achievements"
				component={AchievementsScreen}
				options={{
					tabBarLabel: t("achievements"),
					tabBarIcon: ({ focused, color }) => (
						<TabIcon name="achievements" focused={focused} color={color} />
					),
				}}
			/>

			<Tab.Screen
				name="Settings"
				options={{
					tabBarLabel: t("settings"),
					tabBarIcon: ({ focused, color }) => (
						<TabIcon name="settings" focused={focused} color={color} />
					),
				}}
				listeners={({ navigation }) => ({
					tabPress: (e) => {
						if (navigation.isFocused()) {
							navigation.dispatch(StackActions.popToTop());
						}
					},
				})}
			>
				{(props) => <SettingsStack {...props} onLogout={onLogout} />}
			</Tab.Screen>
		</Tab.Navigator>
	);
};

export default MainTabs;
