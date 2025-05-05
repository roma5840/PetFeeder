// v4 changes:
// edit manual pet feeding grams (three digits, max 500g, no decimal)
// add fun fact for pet weight
// three digits and two decimal places on pet weight

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function PetName() {
  const { petType } = useLocalSearchParams();
  const [petName, setPetName] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const router = useRouter();

  const handlePetWeightChange = (text) => {

    if (text === '') {
      setPetWeight('');
      return;
    }

    const regex = /^(\d{1,3}(\.\d{0,2})?)?$/;

    if (regex.test(text)) {
      setPetWeight(text);
    }

  };

  const handleContinue = () => {
    console.log("handleContinue triggered");

    const trimmedPetName = petName.trim();
    if (!trimmedPetName || !petWeight.trim()) {
      Alert.alert("Missing Information", "Please enter your pet's name and weight.");
      console.log("Validation failed: Missing fields");
      return;
    }

    const weightRegex = /^\d{1,3}(\.\d{1,2})?$/;
    if (!weightRegex.test(petWeight) || petWeight === '.') {
         Alert.alert("Invalid Weight", "Please enter a valid weight format (e.g., 10.5 or 15). Max 3 digits before decimal, 2 after.");
         console.log("Validation failed: Invalid weight format", petWeight);
         return;
    }

    const numericWeight = parseFloat(petWeight);

    if (isNaN(numericWeight)) {
        Alert.alert("Invalid Weight", "Please enter a valid number for weight.");
        console.log("Validation failed: Weight is NaN");
        return;
    }

    if (numericWeight <= 0) {
        Alert.alert("Invalid Weight", "Weight must be greater than zero.");
        console.log("Validation failed: Weight <= 0");
        return;
    }

    Keyboard.dismiss();

    const proceedToConfirmScreen = () => {
        console.log("Proceeding to confirm screen with:", { petType, petName: trimmedPetName, petWeight });
        router.push({
            pathname: "/confirm",
            params: { petType: petType || "Unknown", petName: trimmedPetName, petWeight },
        });
    };

    if (numericWeight >= 155) {
        console.log("Weight >= 155, showing confirmation alert.");
        Alert.alert(
            "Confirm Pet Weight",
            `Are you sure your pet weighs ${numericWeight} kg?\n\nFun Fact: The heaviest dog, Aicama Zorba, weighed 155.6 kg; and the heaviest domestic cat, Himmy, weighed 21.3 kg!`,
            [
                {
                    text: "No",
                    style: "cancel",
                    onPress: () => console.log("Weight confirmation cancelled by user."),
                 },
                {
                    text: "Yes",
                    onPress: proceedToConfirmScreen,
                },
            ],
             { cancelable: false }
        );
    } else {
        console.log("Weight < 155, proceeding directly to confirm screen.");
        proceedToConfirmScreen();
    }

  };


  return (
    <KeyboardAvoidingView
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>

                <Image
                    source={require('../../assets/images/logo3.png')}
                    style={styles.logoImage} 
                    resizeMode="contain"
                />

                <Text style={styles.title}>Enter Your Pet's Details</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Enter pet name"
                    placeholderTextColor="#888"
                    value={petName}
                    onChangeText={setPetName}
                    autoCapitalize="words" 
                    maxLength={20}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Enter pet weight (kg)"
                    placeholderTextColor="#888"
                    keyboardType="decimal-pad"
                    value={petWeight}
                    onChangeText={handlePetWeightChange} 
                />

                {/* Disable button if fields are empty */}
                <TouchableOpacity
                    style={[styles.continueButton, (!petName.trim() || !petWeight.trim()) && styles.disabledButton]}
                    onPress={handleContinue}
                    disabled={!petName.trim() || !petWeight.trim()} 
                >
                    <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
    backgroundColor: "#f8f9fa"
  },
  logoImage: { 
    width: 200, 
    height: 200,
    marginBottom: 20, 
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30, 
    textAlign: 'center',
    color: '#333',
  },
  input: {
    width: "90%", 
    maxWidth: 400, 
    height: 50,
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: "#fff", 
    marginBottom: 20, 
    textAlign: "center", 
    fontSize: 16,
    color: '#333',
  },
  continueButton: {
    paddingVertical: 14,
    paddingHorizontal: 20, 
    backgroundColor: "#A06CD5",
    borderRadius: 10,
    width: "70%",
    maxWidth: 300, 
    alignItems: "center", 
    marginTop: 10, 
  },
  disabledButton: {
      backgroundColor: "#E0E0E0", 
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
});