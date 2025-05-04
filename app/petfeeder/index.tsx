// PetFeeder.js
import React, { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/Ionicons";
import {  View,  Text,  TextInput,  TouchableOpacity,  StyleSheet,  Alert,  FlatList,  Switch, Modal, } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getAuth, deleteUser, signOut } from "firebase/auth";
import { getDatabase, ref, get, remove, set } from "firebase/database";

export default function PetFeeder() {
  // State Variables
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [recommendedWeight, setRecommendedWeight] = useState("");
  const [manualWeight, setManualWeight] = useState("");
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [petDetails, setPetDetails] = useState({ name: '', type: '', weight: ''});
  const [tempDetails, setTempDetails] = useState({ name: '', type: '', weight: '' });
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  // Firebase Auth and DB
  const auth = getAuth();
  const db = getDatabase();
  const user = auth.currentUser;

  // Fetch Pet Data
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

    // 🔹 ADDED FEATURE: Fetch Pet Details from Firebase
    const fetchPetDetails = async () => {
      if (!user) return;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        setPetDetails(docSnap.data().petDetails || {});
      }
    };

  // Calculate Recommended Weight
  const calculateRecommendedWeight = (weight) => {
    if (weight <= 5) return "50";
    if (weight > 5 && weight <= 10) return "120";
    if (weight > 10 && weight <= 20) return "200";
    if (weight > 20 && weight <= 30) return "300";
    if (weight > 30 && weight <= 40) return "400";
    return "500";
  };

  // Add Feeding Time
  const handleAddFeedingTime = () => {
    setSelectedTime(new Date()); // Reset time to ensure picker opens
    setShowPicker(true);
  };
  
  
  // Handle Time Selection
  const onTimeSelected = async (event, time) => {
    if (event.type === "dismissed" || !time) {
      setShowPicker(false);
      return;
    }
  
    const newSchedule = {
      id: Date.now().toString(),
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      weight: manualWeight || recommendedWeight, // Use manual or recommended weight
      isOn: true,
    };
  
    const updatedSchedules = [...schedules, newSchedule];
    setSchedules(updatedSchedules);
  
    if (user) {
      const schedulesRef = ref(db, `users/${user.uid}/schedules`);
      await set(schedulesRef, updatedSchedules);
    }
  
    // Reset and close picker after selection
    setShowPicker(false);
    setSelectedTime(new Date());
  };
  

  // Toggle Schedule Switch
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

  // Delete Schedule
  const deleteSchedule = async (id) => {
    const updatedSchedules = schedules.filter((item) => item.id !== id);
    setSchedules(updatedSchedules);

    if (user) {
      const schedulesRef = ref(db, `users/${user.uid}/schedules`);
      await set(schedulesRef, updatedSchedules);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      Alert.alert("Success", "You have been logged out.");
    } catch (error) {
      Alert.alert("Error", "Failed to log out. Please try again.");
    }
  };

  // MODAL FOR UPDATE
  const openUpdateModal = () => {
    setSettingsVisible(false);
    setTempDetails(petDetails);
    setUpdateModalVisible(true);
  };

  const savePetDetails = async () => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, { petDetails: tempDetails });

    setPetDetails(tempDetails);
    setUpdateModalVisible(false);
  };

  

  // Delete Account
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

      <View style={styles.top_layer}>
      <Text style={styles.title}>PET FEEDER</Text>
      <View style={styles.settingsIcon}>
      <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Icon name="settings-outline" size={30} color="#333" />
      </TouchableOpacity>
      </View>
      </View>


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
  <Modal transparent={true} animationType="fade" visible={showPicker}>
    <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={onTimeSelected}
        />
      </View>
    </View>
  </Modal>
)}

      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.scheduleItem}>
            <Text>
              {item.time} - {item.weight}g
            </Text>
            <Switch value={item.isOn} onValueChange={() => toggleSchedule(item.id)} />
            <TouchableOpacity onPress={() => deleteSchedule(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal for Feeding Guide */}
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
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for Settings */}
      <Modal visible={showSettings} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Settings</Text>

{/*             <TouchableOpacity style={styles.settingsButton} onPress={openUpdateModal}>
              <Text style={styles.settingsText}>Update</Text>
            </TouchableOpacity> */}
            <TouchableOpacity style={styles.settingsButton} onPress={handleLogout}>
              <Text style={styles.settingsText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton} onPress={handleDeleteAccount}>
              <Text style={styles.settingsText}>Delete Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSettings(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

{/*       <Modal visible={updateModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Pet Details</Text>

            <TextInput style={styles.input} placeholder="Pet Name" value={petName} onChange={(text) => setTempDetails({ ...TempDetails, name: text})}/>
            <TextInput style={styles.input} placeholder="Pet Type" value={petType} onChange={(text) => setTempDetails({ ...TempDetails, type: text})}/>
            <TextInput style={styles.input} placeholder="Pet Weight (g)" value={petWeight} onChange={(text) => setTempDetails({ ...TempDetails, weight: text})}/>

            <TouchableOpacity onPress={savePetDetails} style={styles.saveButton}>
              <Text style={styles.saveText}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setUpdateModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal> */}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Nunito",
    fontWeight: "bold",
    marginBottom: 10,
    top: 20,
  },
  info: {
    fontSize: 18,
    marginBottom: 5,
    top: 30,
  },
  recommendButton: {
    padding: 10,
    backgroundColor: "#A06CD5",
    borderRadius: 5,
    marginTop: 10,
    top: 25,
  },
  input: {
    width: "80%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    backgroundColor: "#DEC9E9",
    marginBottom: 10,
    textAlign: "center",
    top: 30,
  },
  timeButton: {
    padding: 15,
    backgroundColor: "#A06CD5",
    borderRadius: 10,
    width: 200,
    alignItems: "center",
    marginBottom: 10,
    top: 40, //time
  },

  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#DAC3E8",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    top: 55,
  },
  deleteText: {
    color: "red",
    fontWeight: "bold",
  },

  // TOP LAYER

  top_layer: {
    flexDirection: "row",
    position: "relative",
    width: "100%",
    paddingHorizontal: 15,
    alignItems: "center"
  },

  settingsIcon: {
    position: "absolute",
    right: 2,
    top: "50%",
  },

  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },


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
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  settingsButton: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    marginTop: 10,
  },
  settingsText: {
    color: "#333",
    fontSize: 16,
  },
});
