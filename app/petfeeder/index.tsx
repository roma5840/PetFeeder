import React, { useState, useEffect } from "react";
import { View, Text, Switch, Button, TouchableOpacity, TextInput, ScrollView, BackHandler, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { auth, database } from "../firebaseConfig";
import { ref, set, onValue, off } from "firebase/database";

const PetFeeder = () => {
  const params = useLocalSearchParams();
  const petType = params?.pet || "Unknown";
  const petName = params?.petName || "Unknown";
  const router = useRouter();
  
  const [schedules, setSchedules] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [weight, setWeight] = useState("");
  const navigation = useNavigation();

  const user = auth.currentUser;
  if (!user) {
    router.replace("/login");
    return null;
  }

  const userSchedulesRef = ref(database, `users/${user.uid}/schedules`);

  useEffect(() => {
    const unsubscribe = onValue(userSchedulesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const schedulesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setSchedules(schedulesArray);
      } else {
        setSchedules([]);
      }
    });

    return () => off(userSchedulesRef, unsubscribe);
  }, []);

  const handleDeleteAccount = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account and all data? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete Account", 
          style: "destructive",
          onPress: async () => {
            try {
              const userDataRef = ref(database, `users/${user.uid}`);
              await set(userDataRef, null);
              await user.delete();
              router.replace("/login");
            } catch (error) {
              Alert.alert("Deletion Error", error.message);
            }
          } 
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.replace("/login");
    } catch (error) {
      Alert.alert("Logout Error", error.message);
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      gestureEnabled: false,
    });

    const handleBackPress = () => true;
    BackHandler.addEventListener("hardwareBackPress", handleBackPress);

    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    };
  }, [navigation]);

  const addFeedingTime = () => {
    if (!weight.trim()) {
      alert("Please enter the weight.");
      return;
    }
    setShowPicker(true);
  };

  const onTimeSelected = async (event, selectedTime) => {
    setShowPicker(false);
    if (selectedTime instanceof Date && !isNaN(selectedTime)) {
      const newSchedule = {
        time: selectedTime.toISOString(),
        enabled: true,
        weight: `${weight}g`,
        petType,
        petName
      };

      const newScheduleRef = ref(database, `users/${user.uid}/schedules/${Date.now()}`);
      await set(newScheduleRef, newSchedule);
      setWeight("");
    }
  };

  const toggleSchedule = async (id) => {
    const scheduleRef = ref(database, `users/${user.uid}/schedules/${id}`);
    await set(scheduleRef, {
      ...schedules.find(s => s.id === id),
      enabled: !schedules.find(s => s.id === id).enabled
    });
  };

  const deleteSchedule = async (id) => {
    const scheduleRef = ref(database, `users/${user.uid}/schedules/${id}`);
    await set(scheduleRef, null);
  };

  const formatTime = (time) => {
    if (!(time instanceof Date)) {
      time = new Date(time);
    }
    let hours = time.getHours();
    let minutes = time.getMinutes().toString().padStart(2, "0");
    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };


  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 10 }}>Automatic Scheduled Pet Feeder</Text>
      <Text style={{ fontSize: 18, marginBottom: 5 }}>Pet Name: {petName}</Text>
      <Text style={{ fontSize: 18, marginBottom: 15 }}>Pet Type: {petType}</Text>
      <ScrollView style={{ marginBottom: 20 }}>
        {schedules.length === 0 ? (
          <Text style={{ fontSize: 16, textAlign: "center", marginVertical: 10 }}>No schedules yet. Add one below.</Text>
        ) : (
          schedules.map((item) => (
            <View key={item.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, padding: 10, backgroundColor: "#f9f9f9", borderRadius: 10 }}>
              <Text style={{ flex: 1, fontSize: 18 }}>{formatTime(item.time)} - {item.weight}</Text>
              <Switch value={item.enabled} onValueChange={() => toggleSchedule(item.id)} />
              <TouchableOpacity onPress={() => deleteSchedule(item.id)} style={{ marginLeft: 10 }}>
                <Text style={{ color: "red", fontWeight: "bold" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
      <TextInput
        placeholder="Enter weight (g)"
        keyboardType="numeric"
        value={weight}
        onChangeText={setWeight}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5, marginBottom: 10 }}
      />
      <Button title="Add Feeding Time" onPress={addFeedingTime} />
      {showPicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={onTimeSelected}
        />
      )}
      <TouchableOpacity 
        style={{
          padding: 15,
          backgroundColor: "#dc3545",
          borderRadius: 10,
          marginTop: 20,
          alignItems: "center",
        }}
        onPress={handleLogout}
      >
        <Text style={{
          color: "#fff",
          fontWeight: "bold",
        }}>Logout</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={{
          padding: 15,
          backgroundColor: "#ff4444",
          borderRadius: 10,
          marginTop: 10,
          alignItems: "center",
        }}
        onPress={handleDeleteAccount}
      >
        <Text style={{ 
          color: "#fff", 
          fontWeight: "bold",
        }}>Delete Account</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PetFeeder;
