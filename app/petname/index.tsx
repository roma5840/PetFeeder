import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function PetName() {
  const { petType } = useLocalSearchParams();
  const [petName, setPetName] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const router = useRouter();

  const handleContinue = () => {
    if (!petName.trim() || !petWeight.trim()) {
      alert("Please enter your pet's name and weight.");
      return;
    }

    router.push({
      pathname: "/confirm",
      params: { petType, petName, petWeight },
    });
  };

  return (
    <View style={styles.container}>

             <Image
              source={require('../../assets/images/logo3.png')}
              style={styles.foregroundImage}
              resizeMode="contain"
            />

      <Text style={styles.title}>Enter Your Pet's Details</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter pet name"
        value={petName}
        onChangeText={setPetName}
      />

      <TextInput
        style={styles.input}
        placeholder="Enter pet weight (kg)"
        keyboardType="numeric"
        value={petWeight}
        onChangeText={setPetWeight}
      />

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
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
  backgroundColor: "#f8f9fa" },

  title: {
  fontSize: 24, 
  fontWeight: "bold",
  bottom: 80,
  marginBottom: 20 },

  input: { 
  width: "80%",
  padding: 10,
  borderWidth: 1, 
  borderColor: "#A06CD5", 
  bottom: 80,
  borderRadius: 8, 
  backgroundColor: "#DEC9E9", 
  marginBottom: 20, 
  textAlign: "center" },

  continueButton: { 
  padding: 15, 
  backgroundColor: "#A06CD5",
  borderRadius: 10, 
  bottom: 50,
  width: 200, 
  alignItems: "center" },

  buttonText: { 
  color: "#fff",
  fontSize: 16, 
  fontWeight: "bold" },

  foregroundImage: {
    height: 260,
    position: 'relative', 
    bottom: 90, 
    left: 5, 
  },
});

