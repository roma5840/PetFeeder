import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
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
      <Text style={styles.title}>Confirm Your Pet's Details</Text>

      {/* Ensure petType is shown correctly */}
      <Text style={styles.info}>Pet Type: {petType ? petType : "Not Provided"}</Text>
      <Text style={styles.info}>Pet Name: {petName ? petName : "Not Provided"}</Text>
      <Text style={styles.info}>Pet Weight: {petWeight ? petWeight : "Not Provided"} kg</Text>

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f9fa" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  info: { fontSize: 18, marginBottom: 10, color: "#333" },
  confirmButton: { padding: 15, backgroundColor: "#28a745", borderRadius: 10, width: 200, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
