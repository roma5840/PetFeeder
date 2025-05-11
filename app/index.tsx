// UPDATED index
// Changes made by me (Ryan):

// v10:
// bug fix (made it so that it's loading instead of the temporary flash of index.tsx)
// still to test for errors

import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { auth } from "./firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";

export default function Home() {
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const handleContinue = () => {
    if (selectedPet) {
      router.push({
        pathname: "/petname",
        params: { petType: selectedPet },
      });
    }
  };

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (!user) {
        router.replace("/login");
      } else {
        try {
          const db = getDatabase();
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);

          if (snapshot.exists() && snapshot.val().petName) {
            router.replace("/petfeeder");
          } else {
            // User is logged in, but no pet data exists -> show pet selection.
            setSelectedPet(null);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // router.replace("/login"); // or some error screen
          setIsLoading(false);
        }
      }
    });

    return () => {
      unsubscribe();
      // setIsLoading(false);
    };
  }, [router]); 

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B185DB" />

      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/logo3.png')}
        style={styles.foregroundImage}
      />

      <Text style={styles.title}>Select Your Pet</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.optionButton, selectedPet === "Dog" && styles.selected]}
          onPress={() => setSelectedPet("Dog")}
        >
          <Text style={styles.buttonText}>Dog</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionButton, selectedPet === "Cat" && styles.selected]}
          onPress={() => setSelectedPet("Cat")}
        >
          <Text style={styles.buttonText}>Cat</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, !selectedPet && styles.disabled]}
        onPress={handleContinue}
        disabled={!selectedPet}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  foregroundImage: {
    width: 300,
    height: 300,
    position: 'absolute',
    top: 50,
    right: 60,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    marginTop: 250,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 30,
  },
  optionButton: {
    padding: 15,
    backgroundColor: "#DEC9E9",
    borderRadius: 10,
    width: 100,
    alignItems: "center",
  },
  selected: {
    backgroundColor: "#B185DB",
  },
  continueButton: {
    padding: 15,
    backgroundColor: "#C19EE0",
    borderRadius: 10,
    width: 200,
    alignItems: "center",
  },
  disabled: {
    backgroundColor: "#C0B5DB",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});