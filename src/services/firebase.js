import auth from "@react-native-firebase/auth";
import {
	GoogleSignin,
	statusCodes,
} from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WEB_CLIENT_ID } from "@env";

// Try to read web client id from local google-services.json as a fallback
let resolvedWebClientId = WEB_CLIENT_ID;
if (!resolvedWebClientId) {
	try {
		// require JSON at build time
		// eslint-disable-next-line global-require, import/no-dynamic-require
		const gs = require("../../google-services.json");
		const client = (gs?.client || []).find((c) => {
			return (c.oauth_client || []).some((oc) => oc.client_type === 3);
		});
		if (client) {
			const webClient = (client.oauth_client || []).find(
				(oc) => oc.client_type === 3,
			);
			if (webClient?.client_id) {
				resolvedWebClientId = webClient.client_id;
			}
		}
	} catch (err) {
		// ignore - file may not exist in some environments
		console.warn(
			"Could not read google-services.json to auto-detect web client id:",
			err?.message || err,
		);
	}
}

// Configure Google Sign-In
GoogleSignin.configure({
	webClientId: resolvedWebClientId, // From Firebase Console (OAuth client ID for Web)
	offlineAccess: true, // request serverAuthCode for refresh tokens
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

	// Get the user's ID token (idToken returned by GoogleSignin.signIn)
	const signInResult = await GoogleSignin.signIn();
	console.debug("Google signIn result:", signInResult);

	// Some environments return tokens via getTokens(); try both
	let idToken = signInResult?.idToken || signInResult?.data?.idToken || null;
	if (!idToken) {
		try {
			const tokens = await GoogleSignin.getTokens();
			console.debug("Google tokens:", tokens);
			idToken = tokens.idToken || idToken;
		} catch (err) {
			console.warn("GoogleSignin.getTokens() failed:", err?.message || err);
		}
	}

	if (!idToken) throw new Error("No idToken returned from Google Sign-In");

	// Create a Google credential with the token
	const googleCredential = auth.GoogleAuthProvider.credential(idToken);

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
