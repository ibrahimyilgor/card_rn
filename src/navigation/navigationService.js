import { createNavigationContainerRef } from "@react-navigation/native";

export const navigationRef = createNavigationContainerRef();

export const navigateToPlans = () => {
	if (!navigationRef.isReady()) return;
	navigationRef.navigate("Settings", { screen: "Plans" });
};
