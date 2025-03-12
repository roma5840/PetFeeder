import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { getDatabase, ref, get } from "firebase/database";


// FIXED CODE
export default function Home() {
  const [selectedPet, setSelectedPet] = useState<string | null>(null);
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
      } else {
        const db = getDatabase();
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists() && snapshot.val().petName) {
          router.replace("/petfeeder");
        } else {
          setSelectedPet(null);
        }
      }
    });
  
    return unsubscribe;
  }, []);
  
  

  return (
    <View style={styles.container}>
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
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 30,
  },
  optionButton: {
    padding: 15,
    backgroundColor: "#ddd",
    borderRadius: 10,
    width: 100,
    alignItems: "center",
  },
  selected: {
    backgroundColor: "#4CAF50", // Green for selected option
  },
  continueButton: {
    padding: 15,
    backgroundColor: "#007bff", // Blue for active button
    borderRadius: 10,
    width: 200,
    alignItems: "center",
  },
  disabled: {
    backgroundColor: "#A9A9A9", // Grey when disabled
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
