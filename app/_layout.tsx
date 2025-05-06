// v6:
// still for testing: bug fix on routing (might be stable?)

import { Stack, useRouter, useSegments } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { auth } from "./firebaseConfig";
import { ActivityIndicator, View, StyleSheet, Text } from "react-native";
import { getDatabase, ref, get } from "firebase/database";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [initialUser, setInitialUser] = useState(null);
  const isNavigationReady = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // console.log("User:", user?.uid, "| Verified:", user?.emailVerified);
      setInitialUser(user);
      if (!isAuthReady) {
        // console.log("Setting AuthReady to true.");
        setIsAuthReady(true);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthReady || !isNavigationReady.current) {
      // console.log(`Navigation deferred: isAuthReady=${isAuthReady}, isNavigationReady=${isNavigationReady.current}`);
      return;
    }

    const user = initialUser;

    const publicRoutes = ["login", "register", "resetpassword"];
    const setupRoutes = ["petname", "confirm"];
    const currentTopLevelSegment = segments[0] ?? '';
    const isPublicRoute = publicRoutes.includes(currentTopLevelSegment);
    const isSetupRoute = setupRoutes.includes(currentTopLevelSegment); 
    // console.log(`Current segment: ${currentTopLevelSegment}, Is public: ${isPublicRoute}, Is setup: ${isSetupRoute}`);

    const navigateBasedOnPetData = async (currentUser) => {
      try {
        const db = getDatabase();
        const userRef = ref(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists() && snapshot.val().petName) {
          console.log("Pet details found.");
          if (currentTopLevelSegment !== 'petfeeder' && !isSetupRoute) {
             console.log("Navigating verified user WITH pet data to /petfeeder");
             router.replace('/petfeeder');
          } else {
             console.log("Verified user WITH pet data - staying on current route (feeder or setup).");
          }
        } else {
          console.log("Pet details NOT found.");
          if (currentTopLevelSegment !== '' && currentTopLevelSegment !== 'index' && !isSetupRoute) {
             console.log("Navigating verified user WITHOUT pet data (and not in setup) to / (index)");
             router.replace('/');
          } else {
             console.log("Verified user WITHOUT pet data - staying on current route (index or setup).");
          }
        }
      } catch (error) {
        // console.error("ERROR checking pet data in _layout:", error);
        if (isPublicRoute) router.replace('/');
      }
    };

    try {
      if (user) {
        if (user.emailVerified) {
          console.log("User verified.");
          navigateBasedOnPetData(user);
        } else {
          console.log("User NOT verified.");
          if (!isPublicRoute) {
            console.log("Navigating unverified user TO login route.");
            router.replace('/login');
          } else {
            console.log("Unverified user stays on public route.");
          }
        }
      } else {
        console.log("No user.");
        if (!isPublicRoute) {
          console.log("Navigating logged out user TO login route.");
          router.replace('/login');
        } else {
          console.log("No user, staying on public route.");
        }
      }
    } catch (error) {
      // console.error("ERROR during navigation logic:", error);
    } finally {
      // console.log("Navigation useEffect END");
    }

  }, [isAuthReady, initialUser, segments, router]); 

  if (!isAuthReady) {
    // console.log("Rendering Loading Indicator (isAuthReady=false)");
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A06CD5" />
        <Text style={{ marginTop: 10, color: '#555' }}>Initializing...</Text>
      </View>
    );
  }

  // console.log("Rendering Stack Navigator (isAuthReady=true)");
  setTimeout(() => {
    if (!isNavigationReady.current) {
      // console.log("Marking Navigation Ready");
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
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="petname/index" />
      <Stack.Screen name="confirm/index" />
      <Stack.Screen name="index" />
      <Stack.Screen name="petfeeder/index" />
      <Stack.Screen name="resetpassword/index" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  }
});