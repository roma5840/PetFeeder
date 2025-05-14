// v12:
// added TOTP 2FA

import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { auth } from "./firebaseConfig";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { getDatabase, ref, get } from "firebase/database";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [initialUser, setInitialUser] = useState<User | null>(null);
  const isNavigationReady = useRef(false);

  const authFlowRoutes = ["login", "register", "resetpassword", "verify-totp"];
  const setupRoutes = ["petname", "confirm"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setInitialUser(user);
      if (!isAuthReady) {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !isNavigationReady.current) {
      // console.log(`_layout: Navigation deferred: isAuthReady=${isAuthReady}, isNavigationReady=${isNavigationReady.current}`);
      return;
    }

    const user = initialUser;
    const currentTopLevelSegment = segments[0] ?? '';
    const isCurrentlyOnAuthFlowRoute = authFlowRoutes.includes(currentTopLevelSegment);
    const isCurrentlyOnSetupRoute = setupRoutes.includes(currentTopLevelSegment);

    // console.log(`_layout: User: ${user?.uid}, EmailVerified: ${user?.emailVerified}, CurrentSegment: ${currentTopLevelSegment}`);

    const navigateUser = async (currentUser: User) => {
      try {
        const db = getDatabase();
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        const userData = snapshot.val();

        const isTotpEnabledAndSetup = userData?.totp?.enabled === true && userData?.totp?.setupComplete === true;
        const hasPetData = userData?.petName;

        // console.log(`_layout: UserData fetched. TOTP Enabled: ${isTotpEnabledAndSetup}, Has Pet Data: ${hasPetData}`);

        if (isTotpEnabledAndSetup) {
          if (currentTopLevelSegment !== 'verify-totp' && currentTopLevelSegment !== 'petfeeder') {
            console.log(`_layout: User ${currentUser.uid} has TOTP. Redirecting to /verify-totp.`);
            router.replace({
              pathname: '/verify-totp',
              params: { userId: currentUser.uid, userEmail: currentUser.email },
            });
            return;
          }
        }

        if (hasPetData) {
          if (currentTopLevelSegment !== 'petfeeder' && !isCurrentlyOnSetupRoute && currentTopLevelSegment !== 'verify-totp') {
            console.log(`_layout: User ${currentUser.uid} has pet data. Redirecting to /petfeeder.`);
            router.replace('/petfeeder');
          } else {
            // console.log(`_layout: User ${currentUser.uid} has pet data, already on petfeeder, setup, or verify-totp. No redirect.`);
          }
        } else {
          if (currentTopLevelSegment !== '' && currentTopLevelSegment !== 'index' && !isCurrentlyOnSetupRoute && currentTopLevelSegment !== 'verify-totp') {
            console.log(`_layout: User ${currentUser.uid} has NO pet data. Redirecting to / (index for pet selection).`);
            router.replace('/');
          } else {
            // console.log(`_layout: User ${currentUser.uid} has NO pet data, already on index, setup, or verify-totp. No redirect.`);
          }
        }
      } catch (error) {
        console.error("_layout: Error fetching user data for navigation:", error);
        if (!isCurrentlyOnAuthFlowRoute) {
          router.replace('/login');
        }
      }
    };

    if (user) {
      if (user.emailVerified) {
        // console.log(`_layout: User ${user.uid} email is verified. Proceeding to data checks.`);
        navigateUser(user);
      } else {
        // console.log(`_layout: User ${user.uid} email NOT verified.`);
        if (!isCurrentlyOnAuthFlowRoute) {
          console.log("_layout: Email not verified. Redirecting to /login.");
          router.replace('/login');
        }
      }
    } else {
      // console.log("_layout: No user logged in.");
      if (!isCurrentlyOnAuthFlowRoute) {
        console.log("_layout: No user. Redirecting to /login.");
        router.replace('/login');
      }
    }
  }, [isAuthReady, initialUser, segments, router]);

  if (!isAuthReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A06CD5" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  setTimeout(() => {
    if (!isNavigationReady.current) {
      // console.log("_layout: Marking Navigation Ready");
      isNavigationReady.current = true;
    }
  }, 0);

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