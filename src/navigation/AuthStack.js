import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import { useTheme } from "../context/ThemeContext";

const Stack = createStackNavigator();

const AuthStack = ({ onLogin }) => {
	const { theme } = useTheme();

	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				cardStyle: { backgroundColor: theme.background.default },
			}}
		>
			<Stack.Screen name="Login">
				{(props) => <LoginScreen {...props} onLogin={onLogin} />}
			</Stack.Screen>
		</Stack.Navigator>
	);
};

export default AuthStack;
