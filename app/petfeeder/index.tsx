// UPDATED PETFEEDER UI (current v: v1.1)
// Changes made by me (Ryan):

// v1:
// 1. UI UPDATES
// 2. Feeder Status 
// 3. Feed Now button
// 4. Update Pet Details
// 5. Added more error handling
// NEXT STEPS: ESP32 code needs to use the Firebase library to listen to users/{uid}/commands/feedNow

// v1.1:
// fixed error handling (cleanup function)

// v1.2:
// updated pet details (from text type to selectable between dog and cat)
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  Switch,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getAuth, deleteUser, signOut } from "firebase/auth";
import {
  getDatabase,
  ref,
  get,
  remove,
  set,
  update,
  onValue,
  off,
} from "firebase/database";

export default function PetFeeder() {
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [recommendedWeight, setRecommendedWeight] = useState("");
  const [manualWeight, setManualWeight] = useState("");
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);

  const [showFeedingGuideModal, setShowFeedingGuideModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showUpdatePetModal, setShowUpdatePetModal] = useState(false);

  const [tempPetDetails, setTempPetDetails] = useState({ name: '', type: '', weight: '' });

  const [feederOnline, setFeederOnline] = useState(false);
  const [lastFeedInfo, setLastFeedInfo] = useState("N/A");
  const [foodLevelStatus, setFoodLevelStatus] = useState("Unknown");
  const [feederError, setFeederError] = useState("None");

  const statusListenerUnsubscribe = useRef(null);
  const schedulesListenerUnsubscribe = useRef(null);

  const auth = getAuth();
  const db = getDatabase();
  const user = auth.currentUser;


  const calculateRecommendedWeight = useCallback((weight) => {
    const numericWeight = parseFloat(weight);
    if (isNaN(numericWeight)) return "N/A";
    if (numericWeight <= 5) return "50";
    if (numericWeight > 5 && numericWeight <= 10) return "120";
    if (numericWeight > 10 && numericWeight <= 20) return "200";
    if (numericWeight > 20 && numericWeight <= 30) return "300";
    if (numericWeight > 30 && numericWeight <= 40) return "400";
    return "500";
  }, []);

  useEffect(() => {
    if (!user) {
        console.log("useEffect: No user found, skipping listener attachment.");
        setIsLoading(false);
         if (statusListenerUnsubscribe.current) {
            statusListenerUnsubscribe.current();
            statusListenerUnsubscribe.current = null;
        }
         if (schedulesListenerUnsubscribe.current) {
            schedulesListenerUnsubscribe.current();
            schedulesListenerUnsubscribe.current = null;
        }
        return;
    }

    console.log(`useEffect: Setting up for user ${user.uid}`);
    setIsLoading(true);
    let initialDataFetched = false;
    let listenersAttached = false;

    const userBaseRef = ref(db, `users/${user.uid}`);
    const statusRef = ref(db, `users/${user.uid}/feederStatus`);
    const schedulesRef = ref(db, `users/${user.uid}/schedules`);

    get(userBaseRef).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            setPetName(data.petName || "Unknown");
            setPetType(data.petType || "Unknown");
            setPetWeight(data.petWeight || "");

            const recWeight = calculateRecommendedWeight(data.petWeight || "");
            setRecommendedWeight(recWeight);
            if (!manualWeight) {
                setManualWeight(recWeight !== "N/A" ? recWeight : "100");
            }
        } else {
            setPetName("N/A");
            setPetType("N/A");
            setPetWeight("");
            setRecommendedWeight("N/A");
             if (!manualWeight) setManualWeight("100");
        }
         initialDataFetched = true;
         if (listenersAttached) setIsLoading(false);
    }).catch(error => {
        console.error("useEffect: Error fetching initial pet data:", error);
        Alert.alert("Error", "Could not fetch pet details.");
        setIsLoading(false);
    });

    console.log(`useEffect: Attaching listeners for UID: ${user.uid}`);

    statusListenerUnsubscribe.current = onValue(statusRef, (snapshot) => {
        console.log("useEffect: Feeder status data received.");
        if (snapshot.exists()) {
            const statusData = snapshot.val();
            setFeederOnline(statusData.isOnline || false);
            setFoodLevelStatus(statusData.foodLevel || "Unknown");
            setFeederError(statusData.error || "None");
            if (statusData.lastFeedTimestamp) {
                const date = new Date(statusData.lastFeedTimestamp);
                const amount = statusData.lastFeedAmount || 'N/A';
                setLastFeedInfo(`${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${amount}g)`);
            } else {
                setLastFeedInfo("N/A");
            }
        } else {
            setFeederOnline(false);
            setFoodLevelStatus("Unknown");
            setFeederError("None");
            setLastFeedInfo("N/A");
        }
        listenersAttached = true;
        if(initialDataFetched) setIsLoading(false);
    }, (error) => {
        console.error("useEffect: Error listening to feeder status:", error);
        if (error.code !== 'PERMISSION_DENIED') {
            Alert.alert("Error", "Could not load feeder status.");
        }
        setIsLoading(false);
    });

    schedulesListenerUnsubscribe.current = onValue(schedulesRef, (snapshot) => {
        console.log("useEffect: Schedules data received.");
        const schedulesData = snapshot.val();
        let schedulesArray = [];
        if (typeof schedulesData === 'object' && schedulesData !== null) {
            schedulesArray = Object.values(schedulesData);
        } else if (Array.isArray(schedulesData)) {
            schedulesArray = schedulesData;
        }
        setSchedules(schedulesArray);
        listenersAttached = true;
        if(initialDataFetched) setIsLoading(false);
    }, (error) => {
        console.error("useEffect: Error listening to schedules:", error);
        if (error.code !== 'PERMISSION_DENIED') {
            Alert.alert("Error", "Could not load schedules.");
        }
        setIsLoading(false);
    });


    return () => {
        console.log(`useEffect: Running cleanup for PetFeeder (User: ${user?.uid})`);
        if (statusListenerUnsubscribe.current) {
            console.log("useEffect cleanup: Detaching status listener.");
            statusListenerUnsubscribe.current();
            statusListenerUnsubscribe.current = null;
        } else {
             console.log("useEffect cleanup: Status listener already detached or never attached.");
        }
        if (schedulesListenerUnsubscribe.current) {
            console.log("useEffect cleanup: Detaching schedules listener.");
            schedulesListenerUnsubscribe.current();
            schedulesListenerUnsubscribe.current = null;
        } else {
             console.log("useEffect cleanup: Schedules listener already detached or never attached.");
        }
    };

  }, [user, db, calculateRecommendedWeight]);




  const handleAddFeedingTime = () => {
    if (!manualWeight || isNaN(parseInt(manualWeight)) || parseInt(manualWeight) <= 0) {
        Alert.alert("Invalid Weight", "Please enter a valid positive number for the feeding weight before selecting a time.");
        return;
      }
    setSelectedTime(new Date());
    setShowPicker(true);
  };

  const onTimeSelected = async (event, time) => {
    setShowPicker(false);

    if (event.type === "set" && time) {
        const weightToSave = parseInt(manualWeight);
        if (isNaN(weightToSave) || weightToSave <= 0) {
            Alert.alert("Invalid Weight", "Cannot save schedule with invalid weight.");
            return;
        }

      const newSchedule = {
        id: Date.now().toString(),
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        weight: weightToSave.toString(),
        isOn: true,
      };

      const updatedSchedules = [...schedules, newSchedule];
      setSchedules(updatedSchedules);
      setIsSaving(true);

      if (user) {
        const newScheduleRef = ref(db, `users/${user.uid}/schedules/${newSchedule.id}`);
        try {
          await set(newScheduleRef, newSchedule);
          // Alert.alert("Success", "Schedule added!"); // optional success message
        } catch (error) {
          console.error("Error saving schedule:", error);
          Alert.alert("Error", "Failed to save schedule. Please try again.");
          setSchedules(schedules.filter(s => s.id !== newSchedule.id));
        } finally {
          setIsSaving(false);
        }
      }
    }
     setSelectedTime(new Date());
  };

  const toggleSchedule = async (id) => {
    const scheduleIndex = schedules.findIndex((item) => item.id === id);
    if (scheduleIndex === -1) return;

    const scheduleToUpdate = schedules[scheduleIndex];
    const updatedSchedule = { ...scheduleToUpdate, isOn: !scheduleToUpdate.isOn };

    const updatedSchedules = [...schedules];
    updatedSchedules[scheduleIndex] = updatedSchedule;
    setSchedules(updatedSchedules);

    setIsSaving(true);
    if (user) {
      const scheduleRef = ref(db, `users/${user.uid}/schedules/${id}`);
      try {
        await update(scheduleRef, { isOn: updatedSchedule.isOn });
      } catch (error) {
        console.error("Error updating schedule toggle:", error);
        Alert.alert("Error", "Failed to update schedule status.");
        setSchedules(schedules);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const deleteSchedule = async (id) => {
    Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this schedule?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
                const updatedSchedules = schedules.filter((item) => item.id !== id);
                setSchedules(updatedSchedules);

                setIsSaving(true);
                if (user) {
                  const scheduleRef = ref(db, `users/${user.uid}/schedules/${id}`);
                  try {
                    await remove(scheduleRef);
                  } catch (error) {
                    console.error("Error deleting schedule:", error);
                    Alert.alert("Error", "Failed to delete schedule.");
                    setSchedules(schedules);
                  } finally {
                    setIsSaving(false);
                  }
                }
            },
          },
        ]
      );

  };

  const handleFeedNow = async () => {
    const feedAmount = parseInt(manualWeight);
    if (isNaN(feedAmount) || feedAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive feeding weight (g).");
      return;
    }

    if (!user) {
      Alert.alert("Error", "User not logged in.");
      return;
    }

    setIsFeeding(true);
    const commandRef = ref(db, `users/${user.uid}/commands/feedNow`);

    try {
      await set(commandRef, {
        amount: feedAmount,
        timestamp: Date.now(),
      });
      Alert.alert("Command Sent", `${feedAmount}g feed command sent to the feeder.`);
    } catch (error) {
      console.error("Error sending feed command:", error);
      Alert.alert("Error", "Failed to send feed command. Check connection.");
    } finally {
      setIsFeeding(false);
    }
  };

  const openUpdateModal = () => {
    setTempPetDetails({
        name: petName,
        type: petType,
        weight: petWeight
    });
    setShowSettingsModal(false);
    setShowUpdatePetModal(true);
  };

  const handleSaveChanges = async () => {
    if (!tempPetDetails.name.trim() || !tempPetDetails.type.trim() || !tempPetDetails.weight.trim()) {
        Alert.alert("Missing Information", "Please fill in all pet details.");
        return;
    }
    const weightValue = parseFloat(tempPetDetails.weight);
     if (isNaN(weightValue) || weightValue <= 0) {
        Alert.alert("Invalid Weight", "Please enter a valid positive number for weight (kg).");
        return;
    }


    if (!user) {
      Alert.alert("Error", "User not logged in.");
      return;
    }

    setIsSaving(true);
    const userRef = ref(db, `users/${user.uid}`);
    const updates = {
      petName: tempPetDetails.name,
      petType: tempPetDetails.type,
      petWeight: tempPetDetails.weight,
    };

    try {
      await update(userRef, updates);

      setPetName(updates.petName);
      setPetType(updates.petType);
      setPetWeight(updates.petWeight);
      const newRecWeight = calculateRecommendedWeight(updates.petWeight);
      setRecommendedWeight(newRecWeight);
      // if (manualWeight === recommendedWeight && newRecWeight !== "N/A") {
      //    setManualWeight(newRecWeight);
      // }

      setShowUpdatePetModal(false);
      Alert.alert("Success", "Pet details updated.");
    } catch (error) {
      console.error("Error updating pet details:", error);
      Alert.alert("Error", "Failed to update pet details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };


  const handleLogout = async () => {
    console.log("handleLogout: Initiated.");

    console.log("handleLogout: Attempting to detach listeners...");
    if (statusListenerUnsubscribe.current) {
        console.log("handleLogout: Detaching status listener.");
        try {
            statusListenerUnsubscribe.current();
            statusListenerUnsubscribe.current = null;
            console.log("handleLogout: Status listener detached successfully.");
        } catch (e) {
             console.error("handleLogout: Error detaching status listener:", e);
        }
    } else {
        console.log("handleLogout: Status listener ref is null (already detached or never attached).");
    }

    if (schedulesListenerUnsubscribe.current) {
        console.log("handleLogout: Detaching schedules listener.");
         try {
            schedulesListenerUnsubscribe.current();
            schedulesListenerUnsubscribe.current = null;
            console.log("handleLogout: Schedules listener detached successfully.");
        } catch (e) {
             console.error("handleLogout: Error detaching schedules listener:", e);
        }
    } else {
        console.log("handleLogout: Schedules listener ref is null (already detached or never attached).");
    }

    try {
        console.log("handleLogout: Calling signOut...");
        await signOut(auth);
        console.log("handleLogout: SignOut successful.");
    } catch (error) {
        Alert.alert("Error", "Failed to log out. Please try again.");
        console.error("handleLogout: SignOut error:", error);
    }
};



const handleDeleteAccount = () => {
  const userToDelete = auth.currentUser;
  if (!userToDelete) {
      Alert.alert("Error", "User not found. Cannot delete account.");
      return;
  }

  Alert.alert(
      "Confirm Delete Account",
      "Are you sure? This will permanently delete your account and all associated data. This action cannot be undone.",
      [
          { text: "Cancel", style: "cancel" },
          {
              text: "Delete Permanently",
              style: "destructive",
              onPress: async () => {
                  console.log(`handleDeleteAccount: Initiated for user ${userToDelete.uid}.`);
                  setIsSaving(true);

                  console.log("handleDeleteAccount: Attempting to detach listeners...");
                   if (statusListenerUnsubscribe.current) {
                      console.log("handleDeleteAccount: Detaching status listener.");
                      try {
                          statusListenerUnsubscribe.current();
                          statusListenerUnsubscribe.current = null;
                          console.log("handleDeleteAccount: Status listener detached.");
                      } catch(e) { console.error("handleDeleteAccount: Error detaching status listener:", e); }
                  } else {
                      console.log("handleDeleteAccount: Status listener ref is null.");
                  }
                   if (schedulesListenerUnsubscribe.current) {
                      console.log("handleDeleteAccount: Detaching schedules listener.");
                      try {
                          schedulesListenerUnsubscribe.current();
                          schedulesListenerUnsubscribe.current = null;
                          console.log("handleDeleteAccount: Schedules listener detached.");
                      } catch (e) { console.error("handleDeleteAccount: Error detaching schedules listener:", e); }
                  } else {
                      console.log("handleDeleteAccount: Schedules listener ref is null.");
                  }

                  try {
                      // Delete Realtime Database data
                      console.log("handleDeleteAccount: Deleting database data...");
                      const userRef = ref(db, `users/${userToDelete.uid}`);
                      await remove(userRef);
                      console.log("handleDeleteAccount: Database data deleted successfully.");

                      // Delete Firebase Auth user
                      console.log("handleDeleteAccount: Deleting auth user...");
                      await deleteUser(userToDelete);
                      console.log("handleDeleteAccount: Auth user deleted successfully.");

                  } catch (error) {
                      console.error("handleDeleteAccount: Error during deletion process:", error);
                      let errorMessage = `Failed to delete account. Please try again.`;
                       if (error.code === 'auth/requires-recent-login') {
                          errorMessage = 'This operation requires a recent login. Please log out and log back in to delete your account.';
                      } else if (error.message) {
                          errorMessage = `Failed to delete account: ${error.message}`;
                      }
                      Alert.alert("Deletion Error", errorMessage);
                      setIsSaving(false); 
                  }
              },
          },
      ]
    );
  };





  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A06CD5" />
        <Text>Loading Pet Feeder...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>PET FEEDER</Text>
        <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.settingsIcon}>
            <Icon name="settings-outline" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Pet Details Section */}
      <View style={styles.sectionContainer}>
         <Text style={styles.sectionTitle}>Pet Details</Text>
         <Text style={styles.infoText}>Name: {petName}</Text>
         <Text style={styles.infoText}>Type: {petType}</Text>
         <Text style={styles.infoText}>Weight: {petWeight} kg</Text>
      </View>

      {/* Feeder Status Section */}
       <View style={styles.sectionContainer}>
         <Text style={styles.sectionTitle}>Feeder Status</Text>
         <View style={styles.statusRow}>
            <Text style={styles.infoText}>Status: </Text>
            <View style={[styles.statusIndicator, { backgroundColor: feederOnline ? '#4CAF50' : '#F44336' }]} />
            <Text style={[styles.infoText, { marginLeft: 5 }]}>{feederOnline ? 'Online' : 'Offline'}</Text>
         </View>
         <Text style={styles.infoText}>Food Level: {foodLevelStatus}</Text>
         <Text style={styles.infoText}>Last Feed: {lastFeedInfo}</Text>
         {feederError !== "None" && (
             <Text style={[styles.infoText, styles.errorText]}>Error: {feederError}</Text>
         )}
       </View>

      {/* Feeding Control Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Feeding Control</Text>
        <View style={styles.feedingRow}>
            <Text style={styles.infoText}>Recommended: {recommendedWeight}g / meal</Text>
            <TouchableOpacity style={styles.guideButton} onPress={() => setShowFeedingGuideModal(true)}>
                <Text style={styles.guideButtonText}>Guide</Text>
            </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder={`Enter feeding weight (g) e.g. ${recommendedWeight !== 'N/A' ? recommendedWeight : '100'}`}
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={manualWeight}
          onChangeText={setManualWeight}
        />

        {/* Feed Now Button */}
        <TouchableOpacity
            style={[styles.actionButton, styles.feedNowButton, isFeeding && styles.buttonDisabled]}
            onPress={handleFeedNow}
            disabled={isFeeding || !feederOnline}
        >
            {isFeeding ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Text style={styles.buttonText}>Feed Now ({manualWeight || 'N/A'}g)</Text>
            )}
        </TouchableOpacity>
      </View>


      {/* Schedule Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Feeding Schedule</Text>
        <TouchableOpacity style={[styles.actionButton, styles.addTimeButton]} onPress={handleAddFeedingTime}>
          <Text style={styles.buttonText}>Add Schedule Time</Text>
        </TouchableOpacity>

        {/* Loading indicator for saves */}
        {isSaving && <ActivityIndicator size="small" color="#A06CD5" style={{ marginVertical: 5 }}/>}

        {schedules.length === 0 && !isLoading ? (
             <Text style={styles.noSchedulesText}>No schedules added yet.</Text>
        ) : (
            <FlatList
                data={schedules.sort((a, b) => a.time.localeCompare(b.time))}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                <View style={styles.scheduleItem}>
                    <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleTime}>{item.time}</Text>
                        <Text style={styles.scheduleWeight}>{item.weight}g</Text>
                    </View>
                    <View style={styles.scheduleControls}>
                        <Switch
                            trackColor={{ false: "#ccc", true: "#B185DB" }}
                            thumbColor={item.isOn ? "#A06CD5" : "#f4f3f4"}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={() => toggleSchedule(item.id)}
                            value={item.isOn}
                        />
                        <TouchableOpacity onPress={() => deleteSchedule(item.id)} style={styles.deleteButton}>
                            <Icon name="trash-outline" size={22} color="#dc3545" />
                        </TouchableOpacity>
                    </View>
                </View>
                )}
                scrollEnabled={false}
            />
        )}
      </View>

      {/* DateTime Picker Modal */}
      {showPicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="spinner"
          onChange={onTimeSelected}
        />
      )}


      {/* Feeding Guide Modal */}
      <Modal visible={showFeedingGuideModal} transparent={true} animationType="fade" onRequestClose={() => setShowFeedingGuideModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Feeding Guide (Example)</Text>
            <Text style={styles.modalText}>- Below 5kg: ~50g per meal</Text>
            <Text style={styles.modalText}>- 5-10kg: ~120g per meal</Text>
            <Text style={styles.modalText}>- 10-20kg: ~200g per meal</Text>
            <Text style={styles.modalText}>- 20-30kg: ~300g per meal</Text>
            <Text style={styles.modalText}>- 30-40kg: ~400g per meal</Text>
            <Text style={styles.modalText}>- 40kg+: ~500g per meal</Text>
            <Text style={styles.modalNote}>Note: These are general guidelines. Consult your vet for specific recommendations.</Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setShowFeedingGuideModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent={true} animationType="fade" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            <TouchableOpacity style={styles.modalButton} onPress={openUpdateModal}>
              <Text style={styles.modalButtonText}>Update Pet Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={handleLogout}>
              <Text style={styles.modalButtonText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.deleteAccountButton]} onPress={handleDeleteAccount}>
              <Text style={styles.modalButtonText}>Delete Account</Text>
            </TouchableOpacity>
             {isSaving && <ActivityIndicator size="small" color="#A06CD5" style={{ marginTop: 10 }}/>}
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

       {/* Update Pet Details Modal */}
       <Modal visible={showUpdatePetModal} transparent={true} animationType="fade" onRequestClose={() => setShowUpdatePetModal(false)}>
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Update Pet Details</Text>
             <TextInput
                style={styles.modalInput}
                placeholder="Pet Name"
                value={tempPetDetails.name}
                onChangeText={(text) => setTempPetDetails({ ...tempPetDetails, name: text })}
            />
            <Text style={styles.modalLabel}>Pet Type:</Text>
            <View style={styles.petTypeSelectionContainer}>
                <TouchableOpacity
                    style={[
                        styles.petTypeButton,
                        tempPetDetails.type === 'Dog' && styles.petTypeButtonSelected
                    ]}
                    onPress={() => setTempPetDetails({ ...tempPetDetails, type: 'Dog' })}
                    disabled={isSaving}
                >
                    <Text style={[
                        styles.petTypeButtonText,
                        tempPetDetails.type === 'Dog' && styles.petTypeButtonTextSelected
                    ]}>Dog</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.petTypeButton,
                        tempPetDetails.type === 'Cat' && styles.petTypeButtonSelected
                    ]}
                    onPress={() => setTempPetDetails({ ...tempPetDetails, type: 'Cat' })}
                    disabled={isSaving}
                >
                     <Text style={[
                        styles.petTypeButtonText,
                        tempPetDetails.type === 'Cat' && styles.petTypeButtonTextSelected
                    ]}>Cat</Text>
                </TouchableOpacity>
            </View>
            <TextInput
                style={styles.modalInput}
                placeholder="Pet Weight (kg)"
                keyboardType="numeric"
                value={tempPetDetails.weight}
                onChangeText={(text) => setTempPetDetails({ ...tempPetDetails, weight: text })}
             />

             <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSaveChanges}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
             </TouchableOpacity>
             <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowUpdatePetModal(false)}
                disabled={isSaving}
              >
               <Text style={styles.buttonText}>Cancel</Text>
             </TouchableOpacity>
           </View>
         </View>
       </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    paddingBottom: 40,
    alignItems: "center",
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  headerContainer: {
    width: '100%',
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 30,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    fontFamily: "Nunito",
  },
  settingsIcon: {
    position: "absolute",
    right: 15,
    top: '50%',
    transform: [{ translateY: -14 }]
  },
  sectionContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#555',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#444",
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  errorText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  feedingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  guideButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
  },
  guideButtonText: {
    fontSize: 14,
    color: '#555',
    fontWeight: 'bold',
  },
  input: {
    width: "100%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 12,
    fontSize: 16,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    width: '100%',
  },
  feedNowButton: {
     backgroundColor: "#28a745",
  },
  addTimeButton: {
      backgroundColor: "#A06CD5",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0e8f6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
   scheduleInfo: {
     flex: 1,
     marginRight: 10,
   },
   scheduleTime: {
     fontSize: 16,
     fontWeight: 'bold',
     color: '#333',
   },
   scheduleWeight: {
     fontSize: 14,
     color: '#555',
   },
   scheduleControls: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   deleteButton: {
     marginLeft: 15,
     padding: 5,
   },
   noSchedulesText: {
       textAlign: 'center',
       color: '#888',
       marginTop: 15,
       fontSize: 15,
   },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "90%",
    maxWidth: 350,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
   modalText: {
     fontSize: 15,
     marginBottom: 5,
     color: '#444',
     textAlign: 'left',
     width: '100%',
   },
   modalNote: {
     fontSize: 13,
     color: '#777',
     marginTop: 10,
     fontStyle: 'italic',
     textAlign: 'center',
   },
   modalButton: {
       width: '100%',
       paddingVertical: 12,
       borderRadius: 8,
       alignItems: 'center',
       marginTop: 10,
       backgroundColor: '#f0f0f0',
   },
   modalButtonText: {
       color: '#333',
       fontSize: 16,
       fontWeight: 'bold',
   },
   deleteAccountButton: {
      backgroundColor: '#dc3545',
   },
   saveButton: {
       backgroundColor: '#007bff',
   },
   closeButton: {
     backgroundColor: "#6c757d",
   },
   modalInput: {
     width: '100%',
     padding: 10,
     borderWidth: 1,
     borderColor: '#ccc',
     borderRadius: 5,
     marginBottom: 10,
     fontSize: 16,
   },
   modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
    alignSelf: 'flex-start',
    marginLeft: '5%',
  },
  petTypeSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginBottom: 15,
  },
  petTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A06CD5',
    backgroundColor: '#f8f9fa',
  },
  petTypeButtonSelected: {
    backgroundColor: '#B185DB',
    borderColor: '#A06CD5',
  },
  petTypeButtonText: {
    fontSize: 16,
    color: '#A06CD5',
    fontWeight: 'bold',
  },
  petTypeButtonTextSelected: {
    color: '#fff',
  },

});