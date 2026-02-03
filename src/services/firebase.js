import auth from "@react-native-firebase/auth";
import {
	GoogleSignin,
	statusCodes,
} from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEB_CLIENT_ID } from "@env";

// Configure Google Sign-In
GoogleSignin.configure({
	webClientId: WEB_CLIENT_ID, // From Firebase Console
});

/**
 * Firebase Authentication Service for React Native
 */

// Sign up with email and password
export const signUp = async (email, password) => {
	const userCredential = await auth().createUserWithEmailAndPassword(
		email,
		password,
	);
	// Send email verification
	await userCredential.user.sendEmailVerification();
	return userCredential.user;
};

// Sign in with email and password
export const signIn = async (email, password) => {
	const userCredential = await auth().signInWithEmailAndPassword(
		email,
		password,
	);
	return userCredential.user;
};

// Sign in with Google
export const signInWithGoogle = async () => {
	// Check if device supports Google Play Services
	await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

	// Get the user's ID token
	const signInResult = await GoogleSignin.signIn();

	// Create a Google credential with the token
	const googleCredential = auth.GoogleAuthProvider.credential(
		signInResult.data?.idToken,
	);

	// Sign in with the credential
	const userCredential = await auth().signInWithCredential(googleCredential);
	return userCredential.user;
};

// Sign out
export const signOut = async () => {
	// Sign out from Firebase
	await auth().signOut();

	// Sign out from Google if signed in
	try {
		const isSignedIn = await GoogleSignin.isSignedIn();
		if (isSignedIn) {
			await GoogleSignin.signOut();
		}
	} catch (error) {
		// Ignore Google sign out errors
		console.log("Google sign out error:", error);
	}

	// Clear local storage
	await AsyncStorage.multiRemove(["accountId"]);
};

// Send email verification
export const sendVerificationEmail = async () => {
	const user = auth().currentUser;
	if (user && !user.emailVerified) {
		await user.sendEmailVerification();
	}
};

// Reload user to check verification status
export const reloadUser = async () => {
	const user = auth().currentUser;
	if (user) {
		await user.reload();
		return auth().currentUser;
	}
	return null;
};

// Check if email is verified
export const isEmailVerified = () => {
	const user = auth().currentUser;
	return user?.emailVerified ?? false;
};

// Get current user
export const getCurrentUser = () => {
	return auth().currentUser;
};

// Get ID token for API calls
export const getIdToken = async () => {
	const user = auth().currentUser;
	if (!user) return null;
	return user.getIdToken();
};

// Listen to auth state changes
export const onAuthStateChanged = (callback) => {
	return auth().onAuthStateChanged(callback);
};

// Error code to user-friendly message
export const getErrorMessage = (error) => {
	switch (error.code) {
		case "auth/email-already-in-use":
			return "email_already_in_use";
		case "auth/invalid-email":
			return "invalid_email";
		case "auth/operation-not-allowed":
			return "operation_not_allowed";
		case "auth/weak-password":
			return "weak_password";
		case "auth/user-disabled":
			return "user_disabled";
		case "auth/user-not-found":
			return "invalid_credentials";
		case "auth/wrong-password":
			return "invalid_credentials";
		case "auth/invalid-credential":
			return "invalid_credentials";
		case "auth/too-many-requests":
			return "too_many_requests";
		case statusCodes.SIGN_IN_CANCELLED:
			return "sign_in_cancelled";
		case statusCodes.IN_PROGRESS:
			return "sign_in_in_progress";
		case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
			return "play_services_not_available";
		default:
			return "network_error";
	}
};
