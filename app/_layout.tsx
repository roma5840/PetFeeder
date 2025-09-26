import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { auth } from "./firebaseConfig";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { getDatabase, ref, get } from "firebase/database";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuthContext } from './AuthContext';
import { useNetInfo } from "@react-native-community/netinfo";

const USER_SESSION_KEY = 'petfeederUserSession';
const TOTP_VERIFIED_SESSION_KEY_PREFIX = 'totpVerifiedForUser_';

export default function RootLayoutWrapper() {
  return (
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}

function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [initialUser, setInitialUser] = useState<User | null | undefined>(undefined);
  const [isRouterReady, setIsRouterReady] = useState(false);
  const [authProcessComplete, setAuthProcessComplete] = useState(false);
  const { isTotpSessionVerified, setTotpSessionVerified } = useAuthContext();
  const lastActiveUidRef = useRef<string | null>(null);

  const netInfo = useNetInfo();

  const authFlowRoutes = ["login", "register", "resetpassword", "verify-totp"];
  const setupRoutes = ["petname", "confirm"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // console.log(`_layout (onAuthStateChanged): User ${user.uid} is now active.`);
        setInitialUser(user);
        lastActiveUidRef.current = user.uid;
        try {
          await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify({ uid: user.uid, email: user.email }));
        } catch (error) {
          // console.error("_layout (onAuthStateChanged): Error saving user session info to AsyncStorage", error);
        }
      } else {
        // console.log("_layout (onAuthStateChanged): No user. Processing logout.");
        if (lastActiveUidRef.current) {
          try {
            await AsyncStorage.removeItem(TOTP_VERIFIED_SESSION_KEY_PREFIX + lastActiveUidRef.current);
          } catch (error) {
            // console.error("_layout (onAuthStateChanged): Error clearing TOTP session verification from AsyncStorage", error);
          }
          lastActiveUidRef.current = null;
        }
        setInitialUser(null);
        setTotpSessionVerified(false);
        try {
          await AsyncStorage.removeItem(USER_SESSION_KEY);
        } catch (error) {
          // console.error("_layout (onAuthStateChanged): Error clearing user session info from AsyncStorage", error);
        }
      }

      if (!authProcessComplete) {
        setAuthProcessComplete(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [authProcessComplete, setTotpSessionVerified]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isRouterReady) {
        setIsRouterReady(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isRouterReady]);

  useEffect(() => {
    if (!authProcessComplete || !isRouterReady || initialUser === undefined) {
      return;
    }

    const FEEDER_SETUP_SSID = "PetFeeder-Setup";
    const isFeederSetupWifi = netInfo.type === 'wifi' && netInfo.details?.ssid === FEEDER_SETUP_SSID;

    // If on the feeder setup wifi, there's no internet
    // navigation logic should not run that depends on firebase since it will hang
    if (isFeederSetupWifi) {
        console.log("_layout: Connected to feeder setup WiFi. Halting internet-dependent navigation logic.");
        return;
    }

    // If internet is not reachable (and it's not the known setup wifi), also halt
    // This handles offline cases
    if (netInfo.isInternetReachable === false) {
        console.log("_layout: Internet not reachable. Halting navigation logic to prevent hangs.");
        return;
    }

    const userFromState = initialUser;
    const currentTopLevelSegment = segments[0] ?? '';
    const isCurrentlyOnAuthFlowRoute = authFlowRoutes.includes(currentTopLevelSegment);
    const isCurrentlyOnSetupRoute = setupRoutes.includes(currentTopLevelSegment);

    const navigateUser = async (currentUserForNav: User) => {
      const liveAuthUser = auth.currentUser;
      if (!liveAuthUser || liveAuthUser.uid !== currentUserForNav.uid) {
        console.log(`_layout (navigateUser): User ${currentUserForNav.uid} is stale or logout in progress (live auth: ${liveAuthUser ? liveAuthUser.uid : 'null'}). Aborting navigation logic.`);
        return;
      }

      let sessionVerifiedForNavigationLogic = false;

      try {
        const db = getDatabase();
        const userRef = ref(db, `users/${currentUserForNav.uid}`);
        const snapshot = await get(userRef);
        
        let userDataFromDb = null; 
        let isTotpEnabledByDb = false;
        let hasPetData = false;

        if (snapshot.exists()) {
            userDataFromDb = snapshot.val();
            isTotpEnabledByDb = userDataFromDb?.totp?.enabled === true && userDataFromDb?.totp?.setupComplete === true;
            hasPetData = !!userDataFromDb?.petName; 
        } else {
            console.warn(`_layout (navigateUser): User data node users/${currentUserForNav.uid} not found in Realtime Database. Proceeding as if new user without pet/TOTP data.`);
        }
        
        if (isTotpEnabledByDb) {
            const storedTotpVerification = await AsyncStorage.getItem(TOTP_VERIFIED_SESSION_KEY_PREFIX + currentUserForNav.uid);
            sessionVerifiedForNavigationLogic = storedTotpVerification === "true";
        } else {
            sessionVerifiedForNavigationLogic = true;
        }
        setTotpSessionVerified(sessionVerifiedForNavigationLogic);

        if (isTotpEnabledByDb && !sessionVerifiedForNavigationLogic) {
          if (currentTopLevelSegment !== 'verify-totp') {
            router.replace({
              pathname: '/verify-totp',
              params: { userId: currentUserForNav.uid, userEmail: currentUserForNav.email ?? "" },
            });
            return;
          }
          return;
        }

        if (currentTopLevelSegment === 'verify-totp' && (!isTotpEnabledByDb || sessionVerifiedForNavigationLogic)) {
            if (hasPetData) {
                router.replace('/petfeeder');
            } else {
                router.replace('/');
            }
            return;
        }

        if (hasPetData) {
          if (currentTopLevelSegment !== 'petfeeder' && !isCurrentlyOnSetupRoute) {
            console.log(`_layout (navigateUser): User ${currentUserForNav.uid} has pet data. Redirecting to /petfeeder.`);
            router.replace('/petfeeder');
            return;
          }
        } else {
          if (currentTopLevelSegment !== '' && currentTopLevelSegment !== 'index' && !isCurrentlyOnSetupRoute) {
            console.log(`_layout (navigateUser): User ${currentUserForNav.uid} has NO pet data. Redirecting to / (index).`);
            router.replace('/');
            return;
          }
        }

      } catch (error) {
        console.error("_layout (navigateUser): Error during navigation logic:", error);
        setTotpSessionVerified(false);
        if (!isCurrentlyOnAuthFlowRoute) {
          try {
            if(auth.currentUser) {
              await auth.signOut();
            }
          } catch (signOutError) {
            console.error("_layout (navigateUser): Error signing out after navigation error:", signOutError);
          }
          router.replace('/login');
        }
      }
    };

    if (userFromState) {
      if (userFromState.emailVerified) {
        navigateUser(userFromState);
      } else {
        // console.log(`_layout (Navigation): User ${userFromState.uid} email NOT verified.`);
        setTotpSessionVerified(false);
        if (!isCurrentlyOnAuthFlowRoute) {
          // console.log("_layout (Navigation): Email not verified. Redirecting to /login.");
          router.replace('/login');
        }
      }
    } else {
      if (!isCurrentlyOnAuthFlowRoute) {
        router.replace('/login');
      }
    }
  }, [authProcessComplete, initialUser, segments, router, isRouterReady, setTotpSessionVerified, netInfo]);


  if (initialUser === undefined || !authProcessComplete || !isRouterReady) {
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