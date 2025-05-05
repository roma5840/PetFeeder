// v3:
// resetpassword

import { Stack, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { auth } from "./firebaseConfig";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
       if (user) {
         const currentRoute = router. LATEST?.pathname;
         if (['/login', '/register', '/resetpassword'].includes(currentRoute)) {
            router.replace("/"); 
         }
       } else {
          const currentRoute = router. LATEST?.pathname;
         if (!['/login', '/register', '/resetpassword'].includes(currentRoute)) {
            router.replace("/login");
         }
       }
    });
    return () => unsubscribe();
  }, [router]); 

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#A06CD5" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        // tabBarStyle: { display: "none" }, 
      }}
    >

      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="petname/index" options={{ headerShown: false }} />
      <Stack.Screen name="confirm/index" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="petfeeder/index" options={{ headerShown: false }} />
      <Stack.Screen name="resetpassword/index" options={{ headerShown: false }} />

    </Stack>
  );
}