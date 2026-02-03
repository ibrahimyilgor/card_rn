import React from "react";
import GoogleLoginScreen from "../screens/GoogleLoginScreen";

const AuthStack = ({ onLogin }) => {
	return <GoogleLoginScreen onLogin={onLogin} />;
};

export default AuthStack;
