import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";


// NOTE: FIXED CODE SO PET NAME, PET TYPE, AND PET WEIGHT IS POSTED TO PETFEEDER INDEX
export default function Confirm() {
  const { petType, petName, petWeight } = useLocalSearchParams(); 
  const router = useRouter();


  const handleConfirm = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }

    try {
      const db = getDatabase();
      const userRef = ref(db, `users/${user.uid}`);
      
      
      await set(userRef, {
        petName: petName || "Unknown",
        petType: petType || "Unknown",
        petWeight: petWeight || "",
        
        schedules: [] 
      });
      
      router.replace("/petfeeder");
    } catch (error) {
      Alert.alert("Error", "Failed to save pet details. Please try again.");
    }
  };

  return (
    <View style={styles.container}>

<Image
        source={require('../../assets/images/doggy.png')} // Make sure you have this image in the right path
        style={styles.petImage}
        resizeMode="cover" // or 'cover', depending on how you want it to fit
      />

      <Text style={styles.title}>Confirm Your Pet's Details</Text>

      {/* Ensure petType is shown correctly */}
      <Text style={styles.info}>Pet Type: {petType ? petType : "Not Provided"}</Text>
      <Text style={styles.info}>Pet Name: {petName ? petName : "Not Provided"}</Text>
      <Text style={styles.info}>Pet Weight: {petWeight ? petWeight : "Not Provided"} kg</Text>

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>

      <Image
        source={require('../../assets/images/caty.png')} // Make sure you have this image in the right path
        style={styles.catImage}
        resizeMode="contain" // or 'cover', depending on how you want it to fit
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f9fa" },

  petImage: { 
    width: 300, 
    height: 300,
    left: 60,
    bottom: 35, 
    borderRadius: 5 
  }, // Adjust size and border as needed



  title: { 
  fontSize: 24, 
  fontWeight: "bold", 
  marginBottom: 20 },

  info: { 
  fontSize: 18, 
  marginBottom: 10, 
  color: "#333" },

  confirmButton: { 
  padding: 15, 
  backgroundColor: "#A06CD5", 
  borderRadius: 10, 
  width: 200, 
  alignItems: "center", 
  marginTop: 20 },

  buttonText: { 
  color: "#fff", 
  fontSize: 16,
  fontWeight: "bold" },

  catImage: { 
    width: 300, 
    height: 300,
    right: 120,
    top: 40,  
    borderRadius: 5 
  },
});
