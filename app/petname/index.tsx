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
import RNPickerSelect from 'react-native-picker-select';
import Icon from 'react-native-vector-icons/Ionicons';

// Breed Lists
const dogBreeds = [
  'Labrador Retriever', 'German Shepherd', 'Golden Retriever', 'French Bulldog', 'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Dachshund', 'Siberian Husky', 'Shih Tzu', 'Chihuahua', 'Pomeranian', 'Other...'
].sort();

const catBreeds = [
  'Domestic Shorthair', 'American Shorthair', 'Siamese', 'Ragdoll', 'Maine Coon', 'Persian', 'Bengal', 'Sphynx', 'British Shorthair', 'Scottish Fold', 'Other...'
].sort();

export default function PetName() {
  const { petType } = useLocalSearchParams();
  const [petName, setPetName] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [petGender, setPetGender] = useState<string | null>(null);
  const [selectedBreed, setSelectedBreed] = useState<string | null>(null);
  const [otherBreed, setOtherBreed] = useState("");
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
    let finalBreed = selectedBreed;
    if (selectedBreed === 'Other...') {
        finalBreed = otherBreed.trim();
    }

    if (!trimmedPetName || !petWeight.trim() || !petGender || !finalBreed) {
      Alert.alert("Missing Information", "Please fill in all your pet's details, including name, gender, breed, and weight.");
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
        console.log("Proceeding to confirm screen with:", { petType, petName: trimmedPetName, petWeight, petGender, petBreed: finalBreed });
        router.push({
            pathname: "/confirm",
            params: { 
                petType: petType || "Unknown", 
                petName: trimmedPetName, 
                petWeight,
                petGender,
                petBreed: finalBreed
            },
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

  const breedItems = (petType === 'Dog' ? dogBreeds : catBreeds).map(breed => ({ label: breed, value: breed }));
  const isContinueDisabled = !petName.trim() || !petWeight.trim() || !petGender || !selectedBreed || (selectedBreed === 'Other...' && !otherBreed.trim());

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
                
                <Text style={styles.label}>Pet's Gender</Text>
                <View style={styles.genderContainer}>
                    <TouchableOpacity
                        style={[styles.genderButton, petGender === 'Male' && styles.genderSelected]}
                        onPress={() => setPetGender('Male')}
                    >
                        <Text style={styles.buttonText}>Male</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.genderButton, petGender === 'Female' && styles.genderSelected]}
                        onPress={() => setPetGender('Female')}
                    >
                        <Text style={styles.buttonText}>Female</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.pickerContainer}>
                    <RNPickerSelect
                        onValueChange={(value) => setSelectedBreed(value)}
                        items={breedItems}
                        style={pickerSelectStyles}
                        placeholder={{ label: "Select your pet's breed...", value: null }}
                        useNativeAndroidPickerStyle={false}
                        Icon={() => {
                            return <Icon name="chevron-down" size={24} color="#A06CD5" />;
                        }}
                    />
                </View>
                
                {selectedBreed === 'Other...' && (
                    <TextInput
                        style={styles.input}
                        placeholder={`Enter pet breed`}
                        placeholderTextColor="#888"
                        value={otherBreed}
                        onChangeText={setOtherBreed}
                        autoCapitalize="words"
                        maxLength={30}
                    />
                )}

                <TextInput
                    style={styles.input}
                    placeholder="Enter pet weight (kg)"
                    placeholderTextColor="#888"
                    keyboardType="decimal-pad"
                    value={petWeight}
                    onChangeText={handlePetWeightChange} 
                />

                <TouchableOpacity
                    style={[styles.continueButton, isContinueDisabled && styles.disabledButton]}
                    onPress={handleContinue}
                    disabled={isContinueDisabled} 
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
    height: 150,
    marginBottom: 20, 
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30, 
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  genderContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
  },
  genderButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: '#DEC9E9',
    borderRadius: 8,
    alignItems: 'center',
  },
  genderSelected: {
    backgroundColor: '#B185DB',
  },
  pickerContainer: {
    width: "90%",
    maxWidth: 400,
    marginBottom: 20,
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

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#A06CD5',
    borderRadius: 8,
    color: '#333',
    paddingRight: 30,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#A06CD5',
    borderRadius: 8,
    color: '#333',
    paddingRight: 30,
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  iconContainer: {
    top: 13,
    right: 15,
  },
  placeholder: {
      color: '#888',
  }
});