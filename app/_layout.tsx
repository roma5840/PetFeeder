import { Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "./firebaseConfig";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (router.canGoBack()) router.replace("/");
      } else {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#007bff" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="petfeeder/index" 
        options={{ 
          title: "Pet Feeder",
          headerLeft: () => null, 
          gestureEnabled: false,
        }} 
      />
    </Stack>
  );
}
