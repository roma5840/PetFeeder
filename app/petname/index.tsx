import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function PetName() {
  const { pet } = useLocalSearchParams();
  const [petName, setPetName] = useState("");
  const router = useRouter();

  const handleContinue = () => {
    if (petName.trim() !== "") {
      router.push({
        pathname: "./confirm",
        params: { pet, petName },
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You selected: {pet}</Text>
      <Text style={styles.subtitle}>Enter your pet's name:</Text>

      <TextInput
        style={styles.input}
        placeholder="Type your pet's name..."
        value={petName}
        onChangeText={setPetName}
      />

      <TouchableOpacity
        style={[styles.continueButton, petName.trim() === "" && styles.disabled]}
        onPress={handleContinue}
        disabled={petName.trim() === ""}
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
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#555",
    marginBottom: 10,
  },
  input: {
    width: "80%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  continueButton: {
    padding: 15,
    backgroundColor: "#007bff",
    borderRadius: 10,
    width: 200,
    alignItems: "center",
  },
  disabled: {
    backgroundColor: "#A9A9A9",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
