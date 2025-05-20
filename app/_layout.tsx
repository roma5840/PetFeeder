// v13.1:
// added login persistence
import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { auth } from "./firebaseConfig";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { getDatabase, ref, get } from "firebase/database";
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_SESSION_KEY = 'petfeederUserSession';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [initialUser, setInitialUser] = useState<User | null | undefined>(undefined);
  const isNavigationReady = useRef(false);
  const [authProcessComplete, setAuthProcessComplete] = useState(false);

  const authFlowRoutes = ["login", "register", "resetpassword", "verify-totp"];
  const setupRoutes = ["petname", "confirm"];

  useEffect(() => {
    // console.log("_layout: Mounting. Setting up onAuthStateChanged listener (for persistent session).");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // console.log(`_layout: onAuthStateChanged triggered. Firebase User: ${user ? user.uid : "null"}`);

      if (user) {
        setInitialUser(user);
        try {
          await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify({ uid: user.uid, email: user.email }));
          console.log(`_layout: User ${user.uid} session active. Stored basic info in AsyncStorage.`);
        } catch (error) {
          // console.error("_layout: Error saving user session info to AsyncStorage", error);
        }
      } else {
        setInitialUser(null);
        try {
          await AsyncStorage.removeItem(USER_SESSION_KEY);
          console.log("_layout: User logged out or no active session. Cleared basic info from AsyncStorage.");
        } catch (error) {
          // console.error("_layout: Error clearing user session info from AsyncStorage", error);
        }
      }

      if (!authProcessComplete) {
        // console.log("_layout: Initial auth processing (via onAuthStateChanged) complete. Setting authProcessComplete=true.");
        setAuthProcessComplete(true);
      }
    });

    return () => {
      // console.log("_layout: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authProcessComplete || !isNavigationReady.current || initialUser === undefined) {
      // console.log(`_layout (Navigation): Deferred. authComplete=${authProcessComplete}, navReady=${isNavigationReady.current}, initialUser=${initialUser === undefined ? "undefined" : (initialUser?.uid || "null")}`);
      return;
    }

    // console.log(`_layout (Navigation): Evaluating. User: ${initialUser?.uid}, EmailVerified: ${initialUser?.emailVerified}, Segments: ${segments.join('/')}`);

    const user = initialUser;
    const currentTopLevelSegment = segments[0] ?? '';
    const isCurrentlyOnAuthFlowRoute = authFlowRoutes.includes(currentTopLevelSegment);

    const navigateUser = async (currentUser: User) => {
      try {
        console.log(`_layout (navigateUser): For user ${currentUser.uid}. Current segment: ${currentTopLevelSegment}`);
        const db = getDatabase();
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();

        const isTotpEnabledAndSetup = userData?.totp?.enabled === true && userData?.totp?.setupComplete === true;
        const hasPetData = userData?.petName;
        const isCurrentlyOnSetupRoute = setupRoutes.includes(currentTopLevelSegment);

        console.log(`_layout (navigateUser): UserData: TOTP=${isTotpEnabledAndSetup}, PetData=${!!hasPetData}`);

        if (isTotpEnabledAndSetup) {
          if (currentTopLevelSegment !== 'verify-totp' && currentTopLevelSegment !== 'petfeeder') {
            console.log(`_layout (navigateUser): User ${currentUser.uid} has TOTP. Redirecting to /verify-totp from ${currentTopLevelSegment}.`);
            router.replace({
              pathname: '/verify-totp',
              params: { userId: currentUser.uid, userEmail: currentUser.email ?? "" },
            });
            return;
          }
        }

        if (hasPetData) {
          if (currentTopLevelSegment !== 'petfeeder' &&
              !isCurrentlyOnSetupRoute &&
              !(isTotpEnabledAndSetup && currentTopLevelSegment === 'verify-totp')) {
            console.log(`_layout (navigateUser): User ${currentUser.uid} has pet data. Redirecting to /petfeeder from ${currentTopLevelSegment}.`);
            router.replace('/petfeeder');
            return;
          }
        } else { // No pet data
          if (currentTopLevelSegment !== '' && currentTopLevelSegment !== 'index' &&
              !isCurrentlyOnSetupRoute &&
              !(isTotpEnabledAndSetup && currentTopLevelSegment === 'verify-totp')) {
            console.log(`_layout (navigateUser): User ${currentUser.uid} has NO pet data. Redirecting to / (index) from ${currentTopLevelSegment}.`);
            router.replace('/');
            return;
          }
        }
        // console.log(`_layout (navigateUser): No specific redirect needed for user ${currentUser.uid} from ${currentTopLevelSegment}.`);

      } catch (error) {
        // console.error("_layout (navigateUser): Error fetching user data for navigation:", error);
        if (!isCurrentlyOnAuthFlowRoute) {
          router.replace('/login');
        }
      }
    };

    if (user) {
      if (user.emailVerified) {
        // console.log(`_layout (Navigation): User ${user.uid} email is verified. Proceeding to data checks for navigation.`);
        navigateUser(user);
      } else {
        console.log(`_layout (Navigation): User ${user.uid} email NOT verified.`);
        if (!isCurrentlyOnAuthFlowRoute) {
          console.log("_layout (Navigation): Email not verified. Redirecting to /login.");
          router.replace('/login');
        }
      }
    } else { // No user
      console.log("_layout (Navigation): No user logged in.");
      if (!isCurrentlyOnAuthFlowRoute) {
        console.log("_layout (Navigation): No user. Redirecting to /login.");
        router.replace('/login');
      }
    }
  }, [authProcessComplete, initialUser, segments, router, isNavigationReady.current]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isNavigationReady.current) {
        // console.log("_layout: Marking Navigation Ready via setTimeout.");
        isNavigationReady.current = true;
        if (authProcessComplete) {
          // console.log("_layout: Navigation ready, auth was complete. Forcing navigation check by re-setting initialUser.");
          setInitialUser(currentUser => currentUser);
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [authProcessComplete]);

  if (initialUser === undefined || !authProcessComplete) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A06CD5" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#A06CD5" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerShown: false,
      }}
    >
      <Stack.Screen name="login/index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="register/index" />
      <Stack.Screen name="resetpassword/index" />
      <Stack.Screen name="verify-totp/index" options={{ gestureEnabled: false }} />

      <Stack.Screen name="index" />
      <Stack.Screen name="petname/index" />
      <Stack.Screen name="confirm/index" />

      <Stack.Screen name="petfeeder/index" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
    fontSize: 16,
  }
});