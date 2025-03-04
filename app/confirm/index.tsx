import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function Confirm() {
    const { pet, petName } = useLocalSearchParams();
    const router = useRouter();
  
    const handleProceed = () => {
      router.replace({
        pathname: "./petfeeder",
        params: { pet, petName },
      });
    };
  
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Confirmation</Text>
        <Text style={styles.info}>Pet Type: {pet}</Text>
        <Text style={styles.info}>Pet Name: {petName}</Text>
  
        <TouchableOpacity style={styles.continueButton} onPress={handleProceed}>
          <Text style={styles.buttonText}>Proceed to Feeder</Text>
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
  info: {
    fontSize: 18,
    marginBottom: 10,
    color: "#333",
  },
  continueButton: {
    padding: 15,
    backgroundColor: "#007bff",
    borderRadius: 10,
    width: 200,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
