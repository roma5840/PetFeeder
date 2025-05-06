// UPDATED PETFEEDER UI
// Changes made by me (Ryan):

// v5:
// added account settings (shows email and delete account button)

// v7:
// added change password with password validation
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
  Keyboard,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getAuth,
  deleteUser,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  get,
  remove,
  set,
  update,
  onValue,
  query,
  orderByKey,
  limitToLast,
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
  const [showAccountModal, setShowAccountModal] = useState(false); 
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [newPassHasMinLength, setNewPassHasMinLength] = useState(false);
  const [newPassHasUpperCase, setNewPassHasUpperCase] = useState(false);
  const [newPassHasLowerCase, setNewPassHasLowerCase] = useState(false);
  const [newPassHasNumber, setNewPassHasNumber] = useState(false);
  const [newPassHasSpecialChar, setNewPassHasSpecialChar] = useState(false);
  const [newPasswordsMatch, setNewPasswordsMatch] = useState(false);

  const [tempPetDetails, setTempPetDetails] = useState({ name: '', type: '', weight: '' });

  const [feederOnline, setFeederOnline] = useState(false);
  const [lastFeedInfo, setLastFeedInfo] = useState("N/A");
  const [foodLevelStatus, setFoodLevelStatus] = useState("Unknown");
  const [feederError, setFeederError] = useState("None");

  const [feedingHistory, setFeedingHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const statusListenerUnsubscribe = useRef(null);
  const schedulesListenerUnsubscribe = useRef(null);
  const historyListenerUnsubscribe = useRef(null);

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
        setIsLoadingHistory(false);
         if (statusListenerUnsubscribe.current) { statusListenerUnsubscribe.current(); statusListenerUnsubscribe.current = null; }
         if (schedulesListenerUnsubscribe.current) { schedulesListenerUnsubscribe.current(); schedulesListenerUnsubscribe.current = null; }
         if (historyListenerUnsubscribe.current) { historyListenerUnsubscribe.current(); historyListenerUnsubscribe.current = null; }
        return;
    }

    console.log(`useEffect: Setting up for user ${user.uid}`);

    setIsLoading(true);
    setIsLoadingHistory(true);
    let initialBaseDataFetched = false;
    let statusListenerAttached = false;
    let schedulesListenerAttached = false;
    let historyListenerAttached = false;

    const userBaseRef = ref(db, `users/${user.uid}`);
    const statusRef = ref(db, `users/${user.uid}/feederStatus`);
    const schedulesRef = ref(db, `users/${user.uid}/schedules`);
    const historyRef = query(
        ref(db, `users/${user.uid}/feedingHistory`),
        orderByKey(),
        limitToLast(20)
    );

    const checkAllLoaded = () => {
         if (initialBaseDataFetched && statusListenerAttached && schedulesListenerAttached && historyListenerAttached) {
            console.log("useEffect: All data and listeners ready, setting loading false.");
            setIsLoading(false);
            setIsLoadingHistory(false);
        }
    }

    get(userBaseRef).then((snapshot) => {
        console.log("useEffect: Initial base data received.");
        if (snapshot.exists()) {
            const data = snapshot.val();
            setPetName(data.petName || "Unknown");
            setPetType(data.petType || "Unknown");
            setPetWeight(data.petWeight || "");
            const recWeight = calculateRecommendedWeight(data.petWeight || "");
            setRecommendedWeight(recWeight);
            if (!manualWeight) { setManualWeight(recWeight !== "N/A" ? recWeight : "100"); }
        } else {
            console.warn(`useEffect: No base data found for user ${user.uid}.`);
            setPetName("N/A");
            setPetType("N/A");
            setPetWeight("");
            setRecommendedWeight("N/A");
            if (!manualWeight) setManualWeight("100");
        }
        initialBaseDataFetched = true;
        checkAllLoaded();
    }).catch(error => {
        console.error("useEffect: Error fetching initial pet data:", error);
        Alert.alert("Error", "Could not fetch pet details.");
        setIsLoading(false); setIsLoadingHistory(false);
    });

    console.log(`useEffect: Attaching status listener for ${user.uid}`);
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
                 if (!isNaN(date.getTime())) {
                    setLastFeedInfo(`${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${amount}g)`);
                } else {
                    console.warn("useEffect: Invalid lastFeedTimestamp received:", statusData.lastFeedTimestamp);
                    setLastFeedInfo("Invalid Date");
                }
            } else {
                setLastFeedInfo("N/A");
            }
        } else {
            console.log("useEffect: No feeder status data found, resetting state.");
            setFeederOnline(false);
            setFoodLevelStatus("Unknown");
            setFeederError("None");
            setLastFeedInfo("N/A");
        }
        statusListenerAttached = true;
        checkAllLoaded();
    }, (error) => {
        console.error("useEffect: Error listening to feeder status:", error);
        if (error.code !== 'PERMISSION_DENIED') { Alert.alert("Error", "Could not load feeder status."); }
        setIsLoading(false); setIsLoadingHistory(false);
    });

    console.log(`useEffect: Attaching schedules listener for ${user.uid}`);
    schedulesListenerUnsubscribe.current = onValue(schedulesRef, (snapshot) => {
        console.log("useEffect: Schedules data received.");
        const schedulesData = snapshot.val();
        let schedulesArray = [];
        if (typeof schedulesData === 'object' && schedulesData !== null) { schedulesArray = Object.values(schedulesData); }
        else if (Array.isArray(schedulesData)) { schedulesArray = schedulesData; }
        setSchedules(schedulesArray);
        schedulesListenerAttached = true;
        checkAllLoaded();
    }, (error) => {
        console.error("useEffect: Error listening to schedules:", error);
        if (error.code !== 'PERMISSION_DENIED') { Alert.alert("Error", "Could not load schedules."); }
        setIsLoading(false); setIsLoadingHistory(false);
    });

    console.log(`useEffect: Attaching history listener for ${user.uid}`);
    historyListenerUnsubscribe.current = onValue(historyRef, (snapshot) => {
        console.log("useEffect: Feeding history data received.");
        const historyData = snapshot.val();
        let historyArray = [];
        if (historyData) {
            historyArray = Object.keys(historyData).map(key => ({
                id: key,
                timestamp: parseInt(key, 10),
                ...historyData[key]
            })).filter(item => !isNaN(item.timestamp));
            historyArray.sort((a, b) => b.timestamp - a.timestamp);
        }
        setFeedingHistory(historyArray);
        historyListenerAttached = true;
        checkAllLoaded();
    }, (error) => {
        console.error("useEffect: Error listening to feeding history:", error);
        if (error.code !== 'PERMISSION_DENIED') { Alert.alert("Error", "Could not load feeding history."); }
        setIsLoading(false); setIsLoadingHistory(false);
    });

    return () => {
        console.log(`useEffect: Running cleanup for PetFeeder (User: ${user?.uid})`);
        if (statusListenerUnsubscribe.current) {
            console.log("useEffect cleanup: Detaching status listener.");
            try { statusListenerUnsubscribe.current(); } catch(e) { console.error("Cleanup detach status error:", e); }
            statusListenerUnsubscribe.current = null;
        }

        if (schedulesListenerUnsubscribe.current) {
            console.log("useEffect cleanup: Detaching schedules listener.");
            try { schedulesListenerUnsubscribe.current(); } catch(e) { console.error("Cleanup detach schedules error:", e); }
            schedulesListenerUnsubscribe.current = null;
        }

        if (historyListenerUnsubscribe.current) {
            console.log("useEffect cleanup: Detaching history listener.");
            try { historyListenerUnsubscribe.current(); } catch(e) { console.error("Cleanup detach history error:", e); }
            historyListenerUnsubscribe.current = null;
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
                const originalSchedules = [...schedules];
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
                    setSchedules(originalSchedules);
                  } finally {
                    setIsSaving(false);
                  }
                }
            },
          },
        ]
      );

  };

  const handleManualWeightChange = (text) => {
    if (text === '') {
      setManualWeight('');
      return;
    }
    const digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly === '') { return; }
    const numericValue = parseInt(digitsOnly, 10);
    if (numericValue > 500) {
      Alert.alert("Limit Exceeded", "Maximum feeding weight is 500g.");
      setManualWeight("500");
    } else {
      setManualWeight(digitsOnly);
    }
  };

  const handleTempWeightChange = (text) => {
    if (text === '') {
      setTempPetDetails({ ...tempPetDetails, weight: '' });
      return;
    }
    const regex = /^(\d{1,3}(\.\d{0,2})?)?$/;
    if (regex.test(text)) {
      setTempPetDetails({ ...tempPetDetails, weight: text });
    }
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

  const openAccountModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');

    setShowSettingsModal(false); 
    setShowAccountModal(true);
  };

  const openChangePasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    // close the main account settings modal (optional)
    // setShowAccountModal(false);
    setShowChangePasswordModal(true);
  };


  const handleSaveChanges = async () => {
    console.log("handleSaveChanges triggered");
    if (!tempPetDetails.name.trim() || !tempPetDetails.type.trim() || !tempPetDetails.weight.trim()) {
        Alert.alert("Missing Information", "Please fill in all pet details.");
        console.log("Validation failed: Missing fields");
        return;
    }
    const weightRegex = /^\d{1,3}(\.\d{1,2})?$/;
    if (!weightRegex.test(tempPetDetails.weight) || tempPetDetails.weight === '.') {
         Alert.alert("Invalid Weight", "Please enter a valid weight format (e.g., 10.5 or 15). Max 3 digits before decimal, 2 after.");
         console.log("Validation failed: Invalid weight format", tempPetDetails.weight);
         return;
    }
    const numericWeight = parseFloat(tempPetDetails.weight);
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
    if (numericWeight >= 155) {
        console.log("Weight >= 155, showing confirmation alert.");
        Alert.alert(
            "Confirm Pet Weight",
            `Are you sure your pet weighs ${numericWeight} kg?\n\nFun Fact: The heaviest dog, Aicama Zorba, weighed 155.6 kg; and the heaviest domestic cat, Himmy, weighed 21.3 kg!`,
            [
                { text: "No", style: "cancel", onPress: () => console.log("Weight confirmation cancelled by user."), },
                { text: "Yes", onPress: () => { console.log("Weight confirmed by user, proceeding to save..."); proceedWithSave(); } },
            ],
            { cancelable: false }
        );
    } else {
        console.log("Weight < 155, proceeding directly to save...");
        proceedWithSave();
    }
  };

  const proceedWithSave = async () => {
    console.log("proceedWithSave called");
    if (!auth.currentUser) {
      Alert.alert("Error", "User session not found. Please log in again.");
      return;
    }
    const currentUid = auth.currentUser.uid;
    setIsSaving(true);
    console.log("Setting isSaving to true");
    const userRef = ref(db, `users/${currentUid}`);
    const updates = {
      petName: tempPetDetails.name.trim(),
      petType: tempPetDetails.type,
      petWeight: tempPetDetails.weight,
    };
    console.log("Update payload:", updates);
    try {
      console.log("Attempting Firebase update...");
      await update(userRef, updates);
      console.log("Firebase update successful.");
      setPetName(updates.petName);
      setPetType(updates.petType);
      setPetWeight(updates.petWeight);
      const newRecWeight = calculateRecommendedWeight(updates.petWeight);
      setRecommendedWeight(newRecWeight);
      console.log("Local state updated.");
      setShowUpdatePetModal(false);
      console.log("Modal closed.");
      setTimeout(() => { Alert.alert("Success", "Pet details updated."); }, 100);
    } catch (error) {
      console.error("Error updating pet details:", error);
      Alert.alert("Error", "Failed to update pet details. Please check your connection and try again.");
    } finally {
      console.log("Setting isSaving to false");
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    console.log("handleLogout: Initiated.");

    if (statusListenerUnsubscribe.current) { try { statusListenerUnsubscribe.current(); } catch (e) { console.error("Logout detach status error:", e); } statusListenerUnsubscribe.current = null; }
    if (schedulesListenerUnsubscribe.current) { try { schedulesListenerUnsubscribe.current(); } catch (e) { console.error("Logout detach schedules error:", e); } schedulesListenerUnsubscribe.current = null; }
    if (historyListenerUnsubscribe.current) { try { historyListenerUnsubscribe.current(); } catch (e) { console.error("Logout detach history error:", e); } historyListenerUnsubscribe.current = null; }

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
            if (statusListenerUnsubscribe.current) { try { statusListenerUnsubscribe.current(); } catch(e) { console.error("Delete detach status error:", e); } statusListenerUnsubscribe.current = null; }
            if (schedulesListenerUnsubscribe.current) { try { schedulesListenerUnsubscribe.current(); } catch (e) { console.error("Delete detach schedules error:", e); } schedulesListenerUnsubscribe.current = null; }
            if (historyListenerUnsubscribe.current) { try { historyListenerUnsubscribe.current(); } catch (e) { console.error("Delete detach history error:", e); } historyListenerUnsubscribe.current = null; }

            try {
              console.log("handleDeleteAccount: Deleting database data...");
              const userRef = ref(db, `users/${userToDelete.uid}`);
              await remove(userRef);
              console.log("handleDeleteAccount: Database data deleted successfully.");

              console.log("handleDeleteAccount: Deleting auth user...");
              await deleteUser(userToDelete);
              console.log("handleDeleteAccount: Auth user deleted successfully.");


            } catch (error) {
              // console.error("handleDeleteAccount: Error during deletion process:", error);
              let errorMessage = `Failed to delete account. Please try again.`;
               if (error.code === 'auth/requires-recent-login') {
                  errorMessage = 'This operation requires a recent login. Please log out and log back in to delete your account.';
              } else if (error.message) {
                  errorMessage = `Failed to delete account: ${error.message}`;
              }
              Alert.alert("Deletion Error", errorMessage);
            } finally {
                setIsSaving(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Missing Information", "Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert("Password Mismatch", "New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
        Alert.alert("Weak Password", "New password must be at least 6 characters long.");
        return;
    }

    const isNewPasswordValid =
        newPassHasMinLength &&
        newPassHasUpperCase &&
        newPassHasLowerCase &&
        newPassHasNumber &&
        newPassHasSpecialChar &&
        newPasswordsMatch;

    if (!isNewPasswordValid) {
      Alert.alert(
        "Invalid New Password",
        "Please ensure your new password meets all the requirements and that the passwords match."
      );
      return;
    }


    Keyboard.dismiss();
    setIsChangingPassword(true);

    try {
      console.log("handleChangePassword: Attempting re-authentication...");
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      console.log("handleChangePassword: Re-authentication successful.");

      console.log("handleChangePassword: Attempting to update password...");
      await updatePassword(user, newPassword);
      console.log("handleChangePassword: Password updated successfully.");

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowChangePasswordModal(false);
      // close the modal / let user close it
      // setShowAccountModal(false);

      Alert.alert(
        "Password Changed",
        "Your password has been successfully updated."
      );

    } catch (error) {
      let errorMessage = "Failed to change password. Please try again.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Incorrect current password.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The new password is too weak. Please choose a stronger password.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "This operation requires a recent login. Please log out and log back in to change your password.";
      } else if (error.message) {
        errorMessage = `Password change failed: ${error.message}`;
      }
      Alert.alert("Update Error", errorMessage);
      // setNewPassword('');
      // setConfirmNewPassword('');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const validateNewPassword = (pass: string, confirmPass: string) => {
    const minLength = pass.length >= 6;
    const upperCase = /[A-Z]/.test(pass);
    const lowerCase = /[a-z]/.test(pass);
    const number = /[0-9]/.test(pass);
    const specialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass);
    const match = pass === confirmPass && pass.length > 0;

    setNewPassHasMinLength(minLength);
    setNewPassHasUpperCase(upperCase);
    setNewPassHasLowerCase(lowerCase);
    setNewPassHasNumber(number);
    setNewPassHasSpecialChar(specialChar);
    setNewPasswordsMatch(match);

    return minLength && upperCase && lowerCase && number && specialChar && match;
  };


  const formatHistoryTimestamp = (timestamp) => {
    if (!timestamp || isNaN(timestamp)) return "Invalid Date";
    try {
        const date = new Date(timestamp);
         if (isNaN(date.getTime())) { return "Invalid Date"; }
        const dateString = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        const timeString = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateString}, ${timeString}`;
    } catch (e) {
        console.error("Error formatting timestamp:", e, "Timestamp:", timestamp);
        return "Invalid Date";
    }
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
          keyboardType="number-pad"
          value={manualWeight}
          onChangeText={handleManualWeightChange}
          maxLength={3}
        />

        {/* Feed Now Button */}
        <TouchableOpacity
            style={[
              styles.actionButton,
              styles.feedNowButton,
              (isFeeding || !feederOnline) && styles.buttonDisabled
            ]}
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
              data={schedules.slice().sort((a, b) => {
                const timeToMinutes = (timeStr) => {
                    if (!timeStr || typeof timeStr !== 'string') return 0;
                    try {
                        const lowerTime = timeStr.toLowerCase().trim();
                        const isPM = lowerTime.includes('pm');
                        const isAM = lowerTime.includes('am');
                        const timePart = lowerTime.replace('am', '').replace('pm', '').trim();
                        let [hours, minutes] = timePart.split(':').map(Number);

                        if (isNaN(hours) || isNaN(minutes)) return 0;

                        if (isPM && hours !== 12) { hours += 12; }
                        else if (isAM && hours === 12) { hours = 0; }
                        if (hours === 24) hours = 0;

                        return hours * 60 + minutes;
                    } catch (e) {
                        console.error("Error parsing schedule time for sort:", timeStr, e);
                        return 0;
                    }
                };
                const timeA = timeToMinutes(a.time);
                const timeB = timeToMinutes(b.time);
                return timeA - timeB;
              })}
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
                          disabled={isSaving}
                      />
                      <TouchableOpacity onPress={() => deleteSchedule(item.id)} style={styles.deleteButton} disabled={isSaving}>
                          <Icon name="trash-outline" size={22} color={isSaving ? "#aaa" : "#dc3545"} />
                      </TouchableOpacity>
                  </View>
              </View>
              )}
              scrollEnabled={false}
            />
        )}
      </View>

      {/* Feeding History Section */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Feeding History (Last 20)</Text>
        {isLoadingHistory && (
            <ActivityIndicator size="small" color="#A06CD5" style={{ marginVertical: 15 }} />
        )}
        {!isLoadingHistory && feedingHistory.length === 0 && (
            <Text style={styles.noHistoryText}>No feeding history recorded yet.</Text>
        )}
        {!isLoadingHistory && feedingHistory.length > 0 && (
            <FlatList
                data={feedingHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                        <View style={styles.historyInfo}>
                            <Text style={styles.historyTimestamp}>{formatHistoryTimestamp(item.timestamp)}</Text>
                            <Text style={styles.historyDetails}>Amount: {item.amount || 'N/A'}g</Text>
                        </View>
                        <Text style={[ styles.historyType, item.type === 'manual' ? styles.historyTypeManual : styles.historyTypeScheduled ]}>
                            {item.type === 'manual' ? 'Manual' : 'Scheduled'}
                        </Text>
                    </View>
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.historySeparator} />}
            />
        )}
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedTime} mode="time" is24Hour={false} display="spinner" onChange={onTimeSelected}
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
            <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={() => setShowFeedingGuideModal(false)}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Settings Modal (Main) --- */}
      <Modal visible={showSettingsModal} transparent={true} animationType="fade" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>

            {/* --- Pet Section --- */}
            <View style={styles.modalSection}>
              <TouchableOpacity style={styles.modalButton} onPress={openUpdateModal} disabled={isSaving}>
                <View style={styles.modalButtonRow}>
                  <Icon name="paw-outline" size={22} style={styles.modalButtonIcon} />
                  <Text style={styles.modalButtonText}>Update Pet Details</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* --- Account Section Button --- */}
            <View style={styles.modalSection}>
              <TouchableOpacity style={styles.modalButton} onPress={openAccountModal} disabled={isSaving}>
                 <View style={styles.modalButtonRow}>
                  <Icon name="person-circle-outline" size={22} style={styles.modalButtonIcon} />
                  <Text style={styles.modalButtonText}>Account Settings</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* --- Logout Section --- */}
            <View style={styles.modalSection}>
              <TouchableOpacity style={styles.modalButton} onPress={handleLogout} disabled={isSaving}>
                 <View style={styles.modalButtonRow}>
                  <Icon name="log-out-outline" size={22} style={styles.modalButtonIcon} />
                  <Text style={styles.modalButtonText}>Logout</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Loading Indicator (for pet details save, delete account) */}
            {isSaving && <ActivityIndicator size="small" color="#A06CD5" style={{ marginVertical: 10 }}/>}

            {/* Close Button */}
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setShowSettingsModal(false)}
              disabled={isSaving}
            >
              <View style={styles.modalButtonRow}>
                  <Icon name="close-circle-outline" size={22} style={[styles.modalButtonIcon, { color: '#fff' }]} />
                  <Text style={styles.buttonText}>Close</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Account Settings Modal --- */}
      <Modal visible={showAccountModal} transparent={true} animationType="fade" onRequestClose={() => !isSaving && setShowAccountModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Account Settings</Text>

              {/* --- Display Email Section --- */}
                <View style={styles.modalSection}>
                    <Text style={styles.modalSectionHeader}>Account Email</Text>
                    <Text style={styles.infoText}>
                        {user ? user.email : 'N/A'}
                    </Text>
                    {user && !user.emailVerified && ( 
                        <Text style={[styles.infoText, { color: '#ffc107', marginTop: 5, fontSize: 14 }]}>
                            (Not Verified)
                        </Text>
                    )}
                </View>

                <View style={styles.modalSection}>
                    <TouchableOpacity
                        style={[styles.modalButton, styles.changePasswordTriggerButton]}
                        onPress={openChangePasswordModal}
                        disabled={isSaving}
                    >
                        <View style={styles.modalButtonRow}>
                            <Icon name="key-outline" size={22} style={[styles.modalButtonIcon, styles.changePasswordTriggerButtonIconText]} />
                            <Text style={[styles.modalButtonText, styles.changePasswordTriggerButtonIconText]}>Change Password</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* --- Delete Account Section --- */}
                <View style={styles.modalSection}>
                    <Text style={styles.modalSectionHeader}>Delete Account</Text>
                    <TouchableOpacity
                        style={[styles.modalButton, styles.modalDeleteButton, (isSaving) && styles.buttonDisabled]}
                        onPress={handleDeleteAccount}
                        disabled={isSaving }
                    >
                        <View style={styles.modalButtonRowCenter}>
                            <Icon name="trash-outline" size={20} style={[styles.modalButtonIcon, styles.modalDeleteButtonText, { marginRight: 5 }]} />
                            <Text style={[styles.modalButtonText, styles.modalDeleteButtonText]}>Delete Account Permanently</Text>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.modalNoteSmall}>This action is irreversible.</Text>
                </View>

                {/* Loading Indicator (for delete account) */}
                {isSaving && <ActivityIndicator size="small" color="#A06CD5" style={{ marginVertical: 10 }}/>}

                {/* Close Button */}
                <TouchableOpacity
                    style={[styles.modalButton, styles.closeButton]}
                    onPress={() => setShowAccountModal(false)}
                    disabled={isSaving}
                >
                    <View style={styles.modalButtonRowCenter}>
                        <Icon name="close-circle-outline" size={22} style={[styles.modalButtonIcon, { color: '#fff' }]} />
                        <Text style={styles.buttonText}>Cancel</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* --- Change Password Modal --- */}
      <Modal
        visible={showChangePasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isChangingPassword && setShowChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <View style={styles.modalSectionNoBorder}>
              <TextInput
                  style={styles.modalInput}
                  placeholder="Current Password"
                  placeholderTextColor="#888"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={true}
                  autoComplete="password"
                  editable={!isChangingPassword}
              />
              <TextInput
                  style={styles.modalInput}
                  placeholder="New Password"
                  placeholderTextColor="#888"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    validateNewPassword(text, confirmNewPassword);
                }}
                  secureTextEntry={true}
                  autoComplete="new-password"
                  editable={!isChangingPassword}
              />
              <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#888"
                  value={confirmNewPassword}
                  onChangeText={(text) => {
                    setConfirmNewPassword(text);
                    validateNewPassword(newPassword, text);
                }}
                  secureTextEntry={true}
                  autoComplete="new-password"
                  editable={!isChangingPassword}
              />


               {(newPassword.length > 0 || confirmNewPassword.length > 0) && ( 
                <View style={styles.passwordChecklistContainer}>
                  <Text style={styles.passwordChecklistItem}>
                    <Icon name={newPassHasMinLength ? "checkmark-circle" : "ellipse-outline"} size={16} color={newPassHasMinLength ? styles.validCheck.color : styles.invalidCheck.color} /> Min 6 chars
                  </Text>
                  <Text style={styles.passwordChecklistItem}>
                    <Icon name={newPassHasUpperCase ? "checkmark-circle" : "ellipse-outline"} size={16} color={newPassHasUpperCase ? styles.validCheck.color : styles.invalidCheck.color} /> Uppercase
                  </Text>
                  <Text style={styles.passwordChecklistItem}>
                    <Icon name={newPassHasLowerCase ? "checkmark-circle" : "ellipse-outline"} size={16} color={newPassHasLowerCase ? styles.validCheck.color : styles.invalidCheck.color} /> Lowercase
                  </Text>
                  <Text style={styles.passwordChecklistItem}>
                    <Icon name={newPassHasNumber ? "checkmark-circle" : "ellipse-outline"} size={16} color={newPassHasNumber ? styles.validCheck.color : styles.invalidCheck.color} /> Number
                  </Text>
                  <Text style={styles.passwordChecklistItem}>
                    <Icon name={newPassHasSpecialChar ? "checkmark-circle" : "ellipse-outline"} size={16} color={newPassHasSpecialChar ? styles.validCheck.color : styles.invalidCheck.color} /> Special
                  </Text>
                  <Text style={styles.passwordChecklistItem}>
                    <Icon name={newPasswordsMatch ? "checkmark-circle" : "ellipse-outline"} size={16} color={newPasswordsMatch ? styles.validCheck.color : styles.invalidCheck.color} /> Match
                  </Text>
                </View>
              )}


            </View>

            {/* {isChangingPassword && <ActivityIndicator size="small" color="#A06CD5" style={{ marginVertical: 10 }} />} */}

            <TouchableOpacity
                style={[
                    styles.modalButton,
                    styles.updatePasswordButton,
                    (isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword) && styles.buttonDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmNewPassword ||
                  !(newPassHasMinLength && newPassHasUpperCase && newPassHasLowerCase && newPassHasNumber && newPassHasSpecialChar && newPasswordsMatch)
              }

            >
                {isChangingPassword ? <ActivityIndicator size="small" color="#fff" /> : (
                    <View style={styles.modalButtonRowCenter}>
                        <Icon name="save-outline" size={20} color="#fff" style={{ marginRight: 5 }} />
                        <Text style={styles.buttonText}>Update Password</Text>
                    </View>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.modalButton, styles.closeButton, isChangingPassword && styles.buttonDisabled]}
                onPress={() => setShowChangePasswordModal(false)}
                disabled={isChangingPassword}
            >
                <View style={styles.modalButtonRowCenter}>
                    <Icon name="close-circle-outline" size={22} style={[styles.modalButtonIcon, { color: '#fff' }]} />
                    <Text style={styles.buttonText}>Cancel</Text>
                </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

       {/* Update Pet Details Modal */}
       <Modal visible={showUpdatePetModal} transparent={true} animationType="fade" onRequestClose={() => !isSaving && setShowUpdatePetModal(false)}>
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Update Pet Details</Text>
             <TextInput
                style={styles.modalInput} placeholder="Pet Name" value={tempPetDetails.name} onChangeText={(text) => setTempPetDetails({ ...tempPetDetails, name: text })}
                autoCapitalize="words" maxLength={20} editable={!isSaving}
            />
            <Text style={styles.modalLabel}>Pet Type:</Text>
            <View style={styles.petTypeSelectionContainer}>
                <TouchableOpacity
                    style={[ styles.petTypeButton, tempPetDetails.type === 'Dog' && styles.petTypeButtonSelected ]}
                    onPress={() => setTempPetDetails({ ...tempPetDetails, type: 'Dog' })} disabled={isSaving}
                >
                    <Text style={[ styles.petTypeButtonText, tempPetDetails.type === 'Dog' && styles.petTypeButtonTextSelected ]}>Dog</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[ styles.petTypeButton, tempPetDetails.type === 'Cat' && styles.petTypeButtonSelected ]}
                    onPress={() => setTempPetDetails({ ...tempPetDetails, type: 'Cat' })} disabled={isSaving}
                >
                     <Text style={[ styles.petTypeButtonText, tempPetDetails.type === 'Cat' && styles.petTypeButtonTextSelected ]}>Cat</Text>
                </TouchableOpacity>
            </View>
            <TextInput
                style={styles.modalInput} placeholder="Pet Weight (kg)" keyboardType="decimal-pad" value={tempPetDetails.weight} onChangeText={handleTempWeightChange} editable={!isSaving}
             />
             <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, isSaving && styles.buttonDisabled]}
                onPress={handleSaveChanges} disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
             </TouchableOpacity>
             <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowUpdatePetModal(false)} disabled={isSaving}
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
    // fontFamily: "Nunito", 
  },
  settingsIcon: {
    position: "absolute",
    right: 15,
    top: '50%',
    transform: [{ translateY: -14 }], 
    padding: 5, 
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
    lineHeight: 22, 
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
    marginTop: 5,
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
    backgroundColor: '#e9ecef', // Lighter gray
    borderRadius: 5,
  },
  guideButtonText: {
    fontSize: 14,
    color: '#495057', // darker gray text
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
    color: '#333', 
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
    textAlignVertical: 'center',
  },
  buttonDisabled: {
    backgroundColor: "#ced4da", 
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
       fontStyle: 'italic',
   },


   modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    paddingVertical: 20,
    paddingHorizontal: 20, 
    backgroundColor: "#fff",
    borderRadius: 12,
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
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modalSection: {
    width: '100%',
    marginBottom: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  modalSectionHeader: { 
      fontSize: 16,
      fontWeight: 'bold',
      color: '#555',
      marginBottom: 10,
      alignSelf: 'flex-start',
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
   modalNoteSmall: { 
      fontSize: 12,
      color: '#dc3545', 
      marginTop: 5,
      textAlign: 'center',
      width: '100%',
  },
   modalButton: { 
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1, 
    borderColor: 'transparent', 
   },
   modalButtonRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15, 
    justifyContent: 'flex-start', 
   },
   modalButtonRowCenter: { 
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center', 
   },
   modalButtonIcon: {
    marginRight: 10, 
    color: '#555',
   },
   modalButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
   },

   modalDeleteButton: { 
    backgroundColor: '#f8d7da', 
    borderColor: '#dc3545', 
   },
   modalDeleteButtonText: { 
    color: '#dc3545',
    fontWeight: 'bold',
   },
   saveButton: { 
       backgroundColor: '#007bff', 
       borderColor: '#007bff',
       alignItems: 'center', 
   },
   closeButton: { 
     backgroundColor: "#6c757d", 
     borderColor: '#6c757d',
     marginTop: 15,
     alignItems: 'center', 
   },
   modalInput: { 
     width: '100%',
     padding: 12,
     borderWidth: 1,
     borderColor: '#ccc',
     borderRadius: 8,
     marginBottom: 10,
     fontSize: 16,
     backgroundColor: '#fff', 
   },
   modalLabel: { 
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 5,
    alignSelf: 'flex-start',
    // marginLeft: '5%', 
  },

  petTypeSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', 
    width: '100%',
    marginBottom: 15,
  },
  petTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 30, 
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

  noHistoryText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 15,
    fontSize: 15,
    fontStyle: 'italic',
  },
  historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
  },
  historyInfo: {
      flex: 1,
      marginRight: 10,
  },
  historyTimestamp: {
      fontSize: 14,
      color: '#555',
      fontWeight: 'bold',
  },
  historyDetails: {
      fontSize: 13,
      color: '#666',
  },
  historyType: {
      fontSize: 12,
      fontWeight: 'bold',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
      overflow: 'hidden', 
      textAlign: 'center', 
      minWidth: 70,
  },
  historyTypeManual: {
      backgroundColor: '#d1e7dd', // lighter green
      color: '#0f5132', // darker green text
      // borderColor: '#badbcc', // border
      // borderWidth: 1,
  },
  historyTypeScheduled: {
      backgroundColor: '#cfe2ff', // lighter blue
      color: '#052c65', // darker blue text
      // borderColor: '#b6d4fe', 
      // borderWidth: 1,
  },
  historySeparator: {
      height: 1,
      backgroundColor: '#eee',
      width: '100%',
      marginVertical: 2, 
  },

  changePasswordTriggerButton: {
    backgroundColor: '#f0e8f6',
    borderColor: '#A06CD5',
    borderWidth: 1,
  },
  changePasswordTriggerButtonIconText: {
    color: '#A06CD5',
  },

  updatePasswordButton: {
    backgroundColor: '#A06CD5',
    borderColor: '#A06CD5',
  },

  modalSectionNoBorder: {
    width: '100%',
    marginBottom: 15,
    // paddingTop: 15,
  },


  passwordChecklistContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around', 
    marginTop: 5,
    marginBottom: 10,
    paddingHorizontal: 5, 
  },
  passwordChecklistItem: {
    fontSize: 12,         
    marginRight: 8,    
    marginBottom: 3, 
    alignItems: 'center', 
  },
  validCheck: {
    color: '#28a745',
  },
  invalidCheck: {
    color: '#dc3545', 
  },

});
