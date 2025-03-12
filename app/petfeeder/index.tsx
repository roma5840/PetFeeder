import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList, Switch, Modal } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getAuth, deleteUser, signOut } from "firebase/auth";
import { getDatabase, ref, get, remove, set } from "firebase/database";

export default function PetFeeder() {
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [recommendedWeight, setRecommendedWeight] = useState("");
  const [manualWeight, setManualWeight] = useState("");
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [schedules, setSchedules] = useState([]); // List of scheduled feedings
  const [showModal, setShowModal] = useState(false);
  const auth = getAuth();
  const db = getDatabase();
  const user = auth.currentUser;

  // FIXED CODE
  useEffect(() => {
    const fetchPetData = async () => {
      if (user) {
        try {
          const userRef = ref(db, `users/${user.uid}`);
          const snapshot = await get(userRef);
    
          if (snapshot.exists()) {
            const data = snapshot.val();
            setPetName(data.petName || "Unknown");
            setPetType(data.petType || "Unknown");
            if (data.petWeight) {
              setPetWeight(data.petWeight);
              const calculatedWeight = calculateRecommendedWeight(data.petWeight);
              setRecommendedWeight(calculatedWeight);
              setManualWeight(calculatedWeight); 
            }
            if (data.schedules) {
              setSchedules(Object.values(data.schedules));
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      }
    };
    

    fetchPetData();
  }, [user]);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (user) {
        const schedulesRef = ref(db, `users/${user.uid}/schedules`);
        const snapshot = await get(schedulesRef);
        if (snapshot.exists()) {
          setSchedules(Object.values(snapshot.val())); 
        }
      }
    };

    fetchSchedules();
  }, [user]);


  const calculateRecommendedWeight = (weight) => {
    if (weight <= 5) return "50";
    if (weight > 5 && weight <= 10) return "120";
    if (weight > 10 && weight <= 20) return "200";
    if (weight > 20 && weight <= 30) return "300";
    if (weight > 30 && weight <= 40) return "400";
    return "500";
  };

  const handleAddFeedingTime = () => {
    setShowPicker(true);
  };


  // NOTE: FIXED CODE SO PRESSING "Cancel" DOES NOT ADD TO LIST/DB
  const onTimeSelected = async (event, time) => {
    setShowPicker(false);
    if (event.type === 'dismissed' || !time) {
      return;
    }
  
    const newSchedule = {
      id: Date.now().toString(),
      time: time.toLocaleTimeString(),
      weight: manualWeight,
      isOn: true,
    };
  
    const updatedSchedules = [...schedules, newSchedule];
    setSchedules(updatedSchedules);
  
    if (user) {
      const schedulesRef = ref(db, `users/${user.uid}/schedules`);
      await set(schedulesRef, updatedSchedules);
    }
  };

  const toggleSchedule = async (id) => {
    const updatedSchedules = schedules.map((item) =>
      item.id === id ? { ...item, isOn: !item.isOn } : item
    );
    setSchedules(updatedSchedules);

    if (user) {
      const schedulesRef = ref(db, `users/${user.uid}/schedules`);
      await set(schedulesRef, updatedSchedules);
    }
  };

  const deleteSchedule = async (id) => {
    const updatedSchedules = schedules.filter((item) => item.id !== id);
    setSchedules(updatedSchedules);

    if (user) {
      const schedulesRef = ref(db, `users/${user.uid}/schedules`);
      await set(schedulesRef, updatedSchedules);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success", "You have been logged out.");
    } catch (error) {
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };


  const handleDeleteAccount = async () => {
    if (!user) return;

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const userRef = ref(db, `users/${user.uid}`);
              await remove(userRef);
              await deleteUser(user);
              Alert.alert("Account Deleted", "Your account has been permanently deleted.");
            } catch (error) {
              Alert.alert("Error", "Failed to delete account. Please log in again and try.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Automatic Scheduled Pet Feeder</Text>

      <Text style={styles.info}>Pet Name: {petName}</Text>
      <Text style={styles.info}>Pet Type: {petType}</Text>
      <Text style={styles.info}>Pet Weight: {petWeight} kg</Text>

      <TouchableOpacity style={styles.recommendButton} onPress={() => setShowModal(true)}>
          <Text style={styles.buttonText}>Recommended</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>Recommended Portion: {recommendedWeight}g per meal</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter feeding weight (g)"
        keyboardType="numeric"
        value={manualWeight}
        onChangeText={setManualWeight}
      />

      <TouchableOpacity style={styles.timeButton} onPress={handleAddFeedingTime}>
        <Text style={styles.buttonText}>Select Feeding Time</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker 
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={onTimeSelected}
        />
      )}

      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.scheduleItem}>
            <Text>{item.time} - {item.weight}</Text>
            <Switch value={item.isOn} onValueChange={() => toggleSchedule(item.id)} />
            <TouchableOpacity onPress={() => deleteSchedule(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.buttonText}>Delete Account</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent={true} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Feeding Guide</Text>
            <Text>- Below 5kg: 50g per meal</Text>
            <Text>- 5-10kg: 120g per meal</Text>
            <Text>- 10-20kg: 200g per meal</Text>
            <Text>- 20-30kg: 300g per meal</Text>
            <Text>- 30-40kg: 400g per meal</Text>
            <Text>- 40kg+: 500g per meal</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: "#f8f9fa",
    alignItems: "center",
  },
  recommendButton: { 
    padding: 10, 
    backgroundColor: "#28a745", 
    borderRadius: 5, 
    alignItems: "center",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
  },

  closeButton: { 
    padding: 10, 
    marginTop: 15, 
    backgroundColor: "#dc3545", 
    borderRadius: 5, 
    alignItems: "center", 
    width: 100,
  },
  

  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 10 
  },
  info: { 
    fontSize: 18, 
    marginBottom: 5 
  },
  input: { 
    width: "80%", 
    padding: 10, 
    borderWidth: 1, 
    borderColor: "#ccc", 
    borderRadius: 5, 
    backgroundColor: "#fff", 
    marginBottom: 10, 
    textAlign: "center"
  },
  timeButton: { 
    padding: 15, 
    backgroundColor: "#007bff", 
    borderRadius: 10, 
    width: 200, 
    alignItems: "center", 
    marginBottom: 10,
  },
  addButton: { 
    padding: 15, 
    backgroundColor: "#28a745", 
    borderRadius: 10, 
    width: 200, 
    alignItems: "center", 
    marginBottom: 10,
  },
  scheduleItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between",
    backgroundColor: "#e9ecef",
    padding: 10, 
    borderRadius: 10, 
    marginVertical: 5, 
    width: "100%",
  },
  deleteText: { 
    color: "red", 
    fontWeight: "bold",
  },
  logoutButton: { 
    padding: 15, 
    backgroundColor: "#ffcc00", 
    borderRadius: 10, 
    width: 200, 
    alignItems: "center", 
    marginTop: 10,
  },
  deleteButton: { 
    padding: 15, 
    backgroundColor: "red", 
    borderRadius: 10, 
    width: 200, 
    alignItems: "center", 
    marginTop: 10,
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
});

