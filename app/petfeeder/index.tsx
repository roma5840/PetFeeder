// UPDATED PETFEEDER UI
// Changes made by me (Ryan):

// v7:
// added change password with password validation

// v8:
// PETFEEDER UI OVERHAUL

// v8.1:
// add password checklist in change password & show eye button
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

  const [showPasswordInfoModal, setShowPasswordInfoModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPasswordInput, setShowNewPasswordInput] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

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

      // setShowUpdatePetModal(false);
      // console.log("Modal closed.");
      setTimeout(() => {
        Alert.alert(
          "Success",
          "Pet details updated.",
          [
            {
              text: "OK",
              onPress: () => {
                setShowUpdatePetModal(false);
                setShowSettingsModal(true);
              }
            }
          ],
          { cancelable: false }
        );
      }, 100);

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
        <Icon name="paw" size={32} color={styles.themePalette.primary.color} style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.settingsButton}>
            <Icon name="settings-sharp" size={26} color={styles.themePalette.primary.color} />
        </TouchableOpacity>
      </View>

      {/* Pet Details Section */}
      <View style={styles.sectionCard}>
         <View style={styles.sectionHeader}>
            <Icon name="information-circle-outline" size={24} color={styles.themePalette.primary.color} />
            <Text style={styles.sectionTitle}>Pet Details</Text>
         </View>
         <View style={styles.detailRow}>
            <Icon name="paw-outline" size={20} style={styles.detailIcon} />
            <Text style={styles.infoTextLabel}>Name: </Text><Text style={styles.infoTextValue}>{petName}</Text>
         </View>
         <View style={styles.detailRow}>
            <Icon name="apps-outline" size={20} style={styles.detailIcon} />
            <Text style={styles.infoTextLabel}>Type: </Text><Text style={styles.infoTextValue}>{petType}</Text>
         </View>
         <View style={styles.detailRow}>
            <Icon name="barbell-outline" size={20} style={styles.detailIcon} />
            <Text style={styles.infoTextLabel}>Weight: </Text><Text style={styles.infoTextValue}>{petWeight} kg</Text>
         </View>
      </View>

      {/* Feeder Status Section */}
       <View style={styles.sectionCard}>
         <View style={styles.sectionHeader}>
            <Icon name="pulse-outline" size={24} color={styles.themePalette.primary.color} />
            <Text style={styles.sectionTitle}>Feeder Status</Text>
         </View>
         <View style={styles.statusRow}>
            <Text style={styles.infoTextLabel}>Status: </Text>
            <View style={[styles.statusIndicator, { backgroundColor: feederOnline ? styles.themePalette.success.color : styles.themePalette.danger.color }]} />
            <Text style={[styles.infoTextValue, { marginLeft: 8, fontWeight: 'bold', color: feederOnline ? styles.themePalette.success.color : styles.themePalette.danger.color }]}>{feederOnline ? 'Online' : 'Offline'}</Text>
         </View>
         <View style={styles.detailRow}>
            <Icon name="cube-outline" size={20} style={styles.detailIcon} />
            <Text style={styles.infoTextLabel}>Food Level: </Text><Text style={styles.infoTextValue}>{foodLevelStatus}</Text>
         </View>
         <View style={styles.detailRow}>
            <Icon name="time-outline" size={20} style={styles.detailIcon} />
            <Text style={styles.infoTextLabel}>Last Feed: </Text><Text style={styles.infoTextValue}>{lastFeedInfo}</Text>
         </View>
         {feederError !== "None" && (
            <View style={styles.detailRow}>
                <Icon name="alert-circle-outline" size={20} style={[styles.detailIcon, { color: styles.themePalette.danger.color }]} />
                <Text style={[styles.infoTextLabel, styles.errorText]}>Error: </Text><Text style={[styles.infoTextValue, styles.errorText]}>{feederError}</Text>
            </View>
         )}
       </View>

      {/* Feeding Control Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <Icon name="restaurant-outline" size={24} color={styles.themePalette.primary.color} />
            <Text style={styles.sectionTitle}>Feeding Control</Text>
        </View>
        <View style={styles.feedingRow}>
            <Text style={styles.infoText}>Recommended: <Text style={{fontWeight: 'bold'}}>{recommendedWeight}g</Text> / meal</Text>
            <TouchableOpacity style={styles.guideButton} onPress={() => setShowFeedingGuideModal(true)}>
                <Icon name="help-circle-outline" size={18} color={styles.themePalette.primary.color} />
                <Text style={styles.guideButtonText}>Guide</Text>
            </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder={`Enter feeding weight (g), e.g. ${recommendedWeight !== 'N/A' ? recommendedWeight : '100'}`}
          placeholderTextColor={styles.themePalette.textMuted.color}
          keyboardType="number-pad"
          value={manualWeight}
          onChangeText={handleManualWeightChange}
          maxLength={3}
        />

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
                <>
                  <Icon name="play-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }}/>
                  <Text style={styles.buttonText}>Feed Now ({manualWeight || 'N/A'}g)</Text>
                </>
            )}
        </TouchableOpacity>
      </View>


      {/* Schedule Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <Icon name="calendar-outline" size={24} color={styles.themePalette.primary.color} />
            <Text style={styles.sectionTitle}>Feeding Schedule</Text>
        </View>
        <TouchableOpacity style={[styles.actionButton, styles.addTimeButton]} onPress={handleAddFeedingTime} disabled={isSaving}>
          <Icon name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }}/>
          <Text style={styles.buttonText}>Add Schedule Time</Text>
        </TouchableOpacity>

        {/* {isSaving && <ActivityIndicator size="small" color={styles.themePalette.primary.color} style={{ marginVertical: 10 }}/>} */}

        {schedules.length === 0 && !isLoading && !isSaving ? (
             <Text style={styles.emptyStateText}>No schedules added yet. Tap above to add one!</Text>
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
                  <Icon name="alarm-outline" size={24} color={styles.themePalette.primary.color} style={styles.scheduleIcon} />
                  <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleTime}>{item.time}</Text>
                      <Text style={styles.scheduleWeight}>{item.weight}g</Text>
                  </View>
                  <View style={styles.scheduleControls}>
                      <Switch
                          trackColor={{ false: "#D1C4E9", true: styles.themePalette.light.color }}
                          thumbColor={item.isOn ? styles.themePalette.primary.color : "#f4f3f4"}
                          ios_backgroundColor="#E0E0E0"
                          onValueChange={() => toggleSchedule(item.id)}
                          value={item.isOn}
                          disabled={isSaving}
                          style={{ transform: [{ scaleX: .9 }, { scaleY: .9 }] }}
                      />
                      <TouchableOpacity onPress={() => deleteSchedule(item.id)} style={styles.deleteButton} disabled={isSaving}>
                          <Icon name="trash-bin-outline" size={22} color={isSaving ? styles.themePalette.textMuted.color : styles.themePalette.danger.color} />
                      </TouchableOpacity>
                  </View>
              </View>
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
            />
        )}
      </View>

      {/* Feeding History Section */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <Icon name="list-outline" size={24} color={styles.themePalette.primary.color} />
            <Text style={styles.sectionTitle}>Feeding History (Last 20)</Text>
        </View>
        {isLoadingHistory && (
            <ActivityIndicator size="small" color={styles.themePalette.primary.color} style={{ marginVertical: 20 }} />
        )}
        {!isLoadingHistory && feedingHistory.length === 0 && (
            <Text style={styles.emptyStateText}>No feeding history recorded yet.</Text>
        )}
        {!isLoadingHistory && feedingHistory.length > 0 && (
            <FlatList
                data={feedingHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                        <Icon
                            name={item.type === 'manual' ? "hand-right-outline" : "sync-circle-outline"}
                            size={24}
                            color={item.type === 'manual' ? styles.themePalette.accent.color : styles.themePalette.info.color}
                            style={styles.historyIcon}
                        />
                        <View style={styles.historyInfo}>
                            <Text style={styles.historyTimestamp}>{formatHistoryTimestamp(item.timestamp)}</Text>
                            <Text style={styles.historyDetails}>Amount: {item.amount || 'N/A'}g - <Text style={{fontWeight: 'bold'}}>{item.type === 'manual' ? 'Manual' : 'Scheduled'}</Text></Text>
                        </View>
                    </View>
                )}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
            />
        )}
      </View>

      {showPicker && (
        <DateTimePicker
          value={selectedTime} mode="time" is24Hour={false} display="spinner" onChange={onTimeSelected}
          // maybe add accentColor for Android picker
        />
      )}

      {/* Feeding Guide Modal */}
      <Modal visible={showFeedingGuideModal} transparent={true} animationType="fade" onRequestClose={() => setShowFeedingGuideModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="book-outline" size={30} color={styles.themePalette.primary.color} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Feeding Guide (Example)</Text>
            <Text style={styles.modalText}>• Below 5kg: ~50g per meal</Text>
            <Text style={styles.modalText}>• 5-10kg: ~120g per meal</Text>
            <Text style={styles.modalText}>• 10-20kg: ~200g per meal</Text>
            <Text style={styles.modalText}>• 20-30kg: ~300g per meal</Text>
            <Text style={styles.modalText}>• 30-40kg: ~400g per meal</Text>
            <Text style={styles.modalText}>• 40kg+: ~500g per meal</Text>
            <Text style={styles.modalNote}>Note: These are general guidelines. Consult your vet for specific recommendations.</Text>
            <TouchableOpacity style={[styles.modalButton, styles.modalCloseButton]} onPress={() => setShowFeedingGuideModal(false)}>
              <Text style={styles.modalButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Settings Modal (Main) --- */}
      <Modal visible={showSettingsModal} transparent={true} animationType="fade" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="settings-outline" size={30} color={styles.themePalette.primary.color} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Settings</Text>

            <TouchableOpacity style={styles.settingsMenuItem} onPress={openUpdateModal} disabled={isSaving}>
              <Icon name="paw-outline" size={22} style={styles.settingsMenuItemIcon} />
              <Text style={styles.settingsMenuItemText}>Update Pet Details</Text>
              <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsMenuItem} onPress={openAccountModal} disabled={isSaving}>
              <Icon name="person-circle-outline" size={22} style={styles.settingsMenuItemIcon} />
              <Text style={styles.settingsMenuItemText}>Account Settings</Text>
              <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsMenuItem} onPress={handleLogout} disabled={isSaving}>
              <Icon name="log-out-outline" size={22} style={[styles.settingsMenuItemIcon, {color: themeColors.textPrimary}]} />
              <Text style={[styles.settingsMenuItemText, {color: themeColors.textPrimary}]}>Logout</Text>
              <Icon name="chevron-forward-outline" size={22} style={[styles.settingsMenuChevron, {color: themeColors.textPrimary}]} />
            </TouchableOpacity>

            {isSaving && <ActivityIndicator size="small" color={styles.themePalette.primary.color} style={{ marginVertical: 15 }}/>}

            <TouchableOpacity
              style={[styles.modalButton, styles.modalCloseButton, {marginTop: 20}]}
              onPress={() => setShowSettingsModal(false)}
              disabled={isSaving}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- Account Settings Modal --- */}
      <Modal visible={showAccountModal} transparent={true} animationType="fade" onRequestClose={() => !isSaving && setShowAccountModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Icon name="person-circle-outline" size={30} color={styles.themePalette.primary.color} style={{marginBottom: 10}} />
                <Text style={styles.modalTitle}>Account Settings</Text>

                <View style={styles.modalSection}>
                    <Text style={styles.modalSectionHeader}>Account Email</Text>
                    <View style={styles.accountEmailContainer}>
                        <Icon name="mail-outline" size={20} style={styles.accountEmailIcon} />
                        <Text style={styles.infoTextValueEmphasized}>
                            {user ? user.email : 'N/A'}
                        </Text>
                    </View>
                    {user && !user.emailVerified && (
                        <Text style={styles.verificationWarningText}>
                            <Icon name="alert-circle-outline" size={14} color={styles.themePalette.warning.color} /> Email not verified
                        </Text>
                    )}
                </View>

                <TouchableOpacity style={styles.settingsMenuItem} onPress={openChangePasswordModal} disabled={isSaving}>
                    <Icon name="key-outline" size={22} style={styles.settingsMenuItemIcon} />
                    <Text style={styles.settingsMenuItemText}>Change Password</Text>
                    <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
                </TouchableOpacity>

                <View style={styles.modalSection}>
                    <Text style={styles.modalSectionHeader}>Delete Account</Text>
                    <TouchableOpacity
                        style={[styles.modalButton, styles.modalDeleteButton, isSaving && styles.buttonDisabled]}
                        onPress={handleDeleteAccount}
                        disabled={isSaving}
                    >
                        <Icon name="trash-bin-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.modalButtonText}>Delete Account Permanently</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalNoteSmall}>This action is irreversible and will delete all your data.</Text>
                </View>

                {isSaving && <ActivityIndicator size="small" color={styles.themePalette.primary.color} style={{ marginVertical: 15 }}/>}

                <TouchableOpacity
                    style={[styles.modalButton, styles.modalCloseButton, {marginTop: 10}]}
                    onPress={() => {
                      setShowAccountModal(false);
                      setShowSettingsModal(true);
                  }}
                    disabled={isSaving}
                >
                    <Text style={styles.modalButtonText}>Back to Settings</Text>
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
            <Icon name="lock-closed-outline" size={30} color={styles.themePalette.primary.color} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Change Password</Text>

            <View style={styles.passwordInputContainer}>
              <TextInput
                  style={styles.passwordInputText}
                  placeholder="Current Password"
                  placeholderTextColor={styles.themePalette.textMuted.color}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoComplete="password"
                  editable={!isChangingPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggleIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Icon
                  name={showCurrentPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color={themeColors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput
                  style={styles.passwordInputText}
                  placeholder="New Password"
                  placeholderTextColor={styles.themePalette.textMuted.color}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    validateNewPassword(text, confirmNewPassword);
                  }}
                  secureTextEntry={!showNewPasswordInput}
                  autoComplete="new-password"
                  editable={!isChangingPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggleIcon}
                onPress={() => setShowNewPasswordInput(!showNewPasswordInput)}
              >
                <Icon
                  name={showNewPasswordInput ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color={themeColors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput
                  style={styles.passwordInputText}
                  placeholder="Confirm New Password"
                  placeholderTextColor={styles.themePalette.textMuted.color}
                  value={confirmNewPassword}
                  onChangeText={(text) => {
                    setConfirmNewPassword(text);
                    validateNewPassword(newPassword, text);
                  }}
                  secureTextEntry={!showConfirmNewPassword}
                  autoComplete="new-password"
                  editable={!isChangingPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggleIcon}
                onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
              >
                <Icon
                  name={showConfirmNewPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color={themeColors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* PASSWORD CHECKLIST */}
            { (newPassword.length > 0 || confirmNewPassword.length > 0) && (
              <View style={styles.passwordChecklistRow}>
                <View style={styles.passwordMinimalChecklist}>
                  <Icon
                    name={newPassHasMinLength ? "checkmark-circle" : "text-outline"}
                    size={18}
                    color={newPassHasMinLength ? themeColors.success : themeColors.danger}
                    style={styles.checklistItemIcon}
                  />
                  <Icon
                    name={newPassHasUpperCase ? "checkmark-circle" : "arrow-up-circle-outline"}
                    size={18}
                    color={newPassHasUpperCase ? themeColors.success : themeColors.danger}
                    style={styles.checklistItemIcon}
                  />
                  <Icon
                    name={newPassHasLowerCase ? "checkmark-circle" : "arrow-down-circle-outline"}
                    size={18}
                    color={newPassHasLowerCase ? themeColors.success : themeColors.danger}
                    style={styles.checklistItemIcon}
                  />
                  <Icon
                    name={newPassHasNumber ? "checkmark-circle" : "apps-outline"}
                    size={18}
                    color={newPassHasNumber ? themeColors.success : themeColors.danger}
                    style={styles.checklistItemIcon}
                  />
                  <Icon
                    name={newPassHasSpecialChar ? "checkmark-circle" : "code-slash-outline"}
                    size={18}
                    color={newPassHasSpecialChar ? themeColors.success : themeColors.danger}
                    style={styles.checklistItemIcon}
                  />
                  <Icon
                    name={newPasswordsMatch && newPassword.length > 0 ? "checkmark-circle" : "git-compare-outline"}
                    size={18}
                    color={newPasswordsMatch && newPassword.length > 0 ? themeColors.success : themeColors.danger}
                    style={styles.checklistItemIcon}
                  />
                </View>
                <TouchableOpacity onPress={() => setShowPasswordInfoModal(true)} style={styles.passwordInfoButton}>
                  <Icon name="information-circle-outline" size={22} color={themeColors.primary} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
                style={[
                    styles.modalButton,
                    styles.modalPrimaryButton,
                    (isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword || !(newPassHasMinLength && newPassHasUpperCase && newPassHasLowerCase && newPassHasNumber && newPassHasSpecialChar && newPasswordsMatch)) && styles.buttonDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={
                  isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword ||
                  !(newPassHasMinLength && newPassHasUpperCase && newPassHasLowerCase && newPassHasNumber && newPassHasSpecialChar && newPasswordsMatch)
                }
            >
                {isChangingPassword ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                        <Icon name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.modalButtonText}>Update Password</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.modalButton, styles.modalSecondaryButton, isChangingPassword && styles.buttonDisabled]}
                onPress={() => setShowChangePasswordModal(false)}
                disabled={isChangingPassword}
            >
                <Text style={[styles.modalButtonText, {color: styles.themePalette.primary.color}]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Requirements Info Modal */}
      <Modal
        visible={showPasswordInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordInfoModal(false)}
      >
        <TouchableOpacity
            style={styles.passwordInfoModalOverlay}
            activeOpacity={1}
            onPressOut={() => setShowPasswordInfoModal(false)}
        >
            <View style={styles.passwordInfoModalContent} onStartShouldSetResponder={() => true}>
                <Text style={styles.passwordInfoModalTitle}>Password Must Contain:</Text>
                <View style={styles.passwordInfoItem}>
                    <Icon name="text-outline" size={18} color={themeColors.textSecondary} style={styles.passwordInfoIcon} />
                    <Text style={styles.passwordInfoText}>At least 6 characters</Text>
                </View>
                <View style={styles.passwordInfoItem}>
                    <Icon name="arrow-up-circle-outline" size={18} color={themeColors.textSecondary} style={styles.passwordInfoIcon} />
                    <Text style={styles.passwordInfoText}>An uppercase letter (A-Z)</Text>
                </View>
                <View style={styles.passwordInfoItem}>
                    <Icon name="arrow-down-circle-outline" size={18} color={themeColors.textSecondary} style={styles.passwordInfoIcon} />
                    <Text style={styles.passwordInfoText}>A lowercase letter (a-z)</Text>
                </View>
                <View style={styles.passwordInfoItem}>
                    <Icon name="apps-outline" size={18} color={themeColors.textSecondary} style={styles.passwordInfoIcon} />
                    <Text style={styles.passwordInfoText}>A number (0-9)</Text>
                </View>
                <View style={styles.passwordInfoItem}>
                    <Icon name="code-slash-outline" size={18} color={themeColors.textSecondary} style={styles.passwordInfoIcon} />
                    <Text style={styles.passwordInfoText}>A special character (e.g., !@#$%)</Text>
                </View>
                <View style={styles.passwordInfoItem}>
                    <Icon name="git-compare-outline" size={18} color={themeColors.textSecondary} style={styles.passwordInfoIcon} />
                    <Text style={styles.passwordInfoText}>New passwords must match</Text>
                </View>
                <TouchableOpacity
                    style={[styles.modalButton, styles.modalCloseButton, {marginTop: 15, width: '80%', alignSelf: 'center'}]}
                    onPress={() => setShowPasswordInfoModal(false)}
                >
                    <Text style={styles.modalButtonText}>Got it</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

       {/* Update Pet Details Modal */}
       <Modal visible={showUpdatePetModal} transparent={true} animationType="fade" onRequestClose={() => {
           if (!isSaving) {
               setShowUpdatePetModal(false);
               setShowSettingsModal(true);
           }
       }}>
         <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
             <Icon name="create-outline" size={30} color={styles.themePalette.primary.color} style={{marginBottom: 10}} />
             <Text style={styles.modalTitle}>Update Pet Details</Text>
             <TextInput
                style={styles.modalInput} placeholder="Pet Name"
                placeholderTextColor={styles.themePalette.textMuted.color}
                value={tempPetDetails.name} onChangeText={(text) => setTempPetDetails({ ...tempPetDetails, name: text })}
                autoCapitalize="words" maxLength={20} editable={!isSaving}
            />
            <Text style={styles.modalLabel}>Pet Type:</Text>
            <View style={styles.petTypeSelectionContainer}>
                <TouchableOpacity
                    style={[ styles.petTypeButton, tempPetDetails.type === 'Dog' && styles.petTypeButtonSelected ]}
                    onPress={() => setTempPetDetails({ ...tempPetDetails, type: 'Dog' })} disabled={isSaving}
                >
                    <Icon name="logo-octocat" size={20} style={[styles.petTypeIcon, tempPetDetails.type === 'Dog' && styles.petTypeIconSelected]} />
                    <Text style={[ styles.petTypeButtonText, tempPetDetails.type === 'Dog' && styles.petTypeButtonTextSelected ]}>Dog</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[ styles.petTypeButton, tempPetDetails.type === 'Cat' && styles.petTypeButtonSelected ]}
                    onPress={() => setTempPetDetails({ ...tempPetDetails, type: 'Cat' })} disabled={isSaving}
                >
                     <Icon name="logo-gitlab" size={20} style={[styles.petTypeIcon, tempPetDetails.type === 'Cat' && styles.petTypeIconSelected]} />
                     <Text style={[ styles.petTypeButtonText, tempPetDetails.type === 'Cat' && styles.petTypeButtonTextSelected ]}>Cat</Text>
                </TouchableOpacity>
            </View>
            <TextInput
                style={styles.modalInput} placeholder="Pet Weight (kg)"
                placeholderTextColor={styles.themePalette.textMuted.color}
                keyboardType="decimal-pad" value={tempPetDetails.weight} onChangeText={handleTempWeightChange} editable={!isSaving}
             />
             <TouchableOpacity
                style={[styles.modalButton, styles.modalPrimaryButton, isSaving && styles.buttonDisabled]}
                onPress={handleSaveChanges} disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Icon name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.modalButtonText}>Save Changes</Text>
                    </>
                )}
             </TouchableOpacity>
             <TouchableOpacity
                style={[styles.modalButton, styles.modalSecondaryButton]}
                onPress={() => {
                  setShowUpdatePetModal(false);
                  setShowSettingsModal(true); 
              }}
                disabled={isSaving}
              >
               <Text style={[styles.modalButtonText, {color: styles.themePalette.primary.color}]}>Cancel</Text>
             </TouchableOpacity>
           </View>
         </View>
       </Modal>

    </ScrollView>
  );
}

const themeColors = {
  primary: '#7B2CBF', // main purple (vibrant)
  light: '#C77DFF',   // light  purple (for highlights, secondary elements)
  accent: '#9D4EDD',  // accent pruple (alternative)
  background: '#F7F4FA', // very light purple for screen background
  cardBackground: '#FFFFFF',
  textPrimary: '#2D2D2D',
  textSecondary: '#5E5E5E',
  textMuted: '#8D8D8D',
  textOnPrimary: '#FFFFFF',
  borderColor: '#E0E0E0', // light gray for borders
  disabledBackground: '#E9D8FD', // muted purple
  disabledText: '#A4A4A4',
  success: '#28A745',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#17A2B8',
};

const styles = StyleSheet.create({
  themePalette: {
    primary: { color: themeColors.primary },
    light: { color: themeColors.light },
    accent: { color: themeColors.accent },
    success: { color: themeColors.success },
    danger: { color: themeColors.danger },
    warning: { color: themeColors.warning },
    info: { color: themeColors.info },
    textMuted: { color: themeColors.textMuted },
  },
  scrollView: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  container: {
    paddingBottom: 50,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: themeColors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: themeColors.textSecondary,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 5,
    marginTop: 30,
    marginBottom: 10,
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: themeColors.primary,
    flex: 1,
  },
  settingsButton: {
    padding: 8, // tappable area(?)
  },
  sectionCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderColor,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginLeft: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailIcon: {
    color: themeColors.accent,
    marginRight: 10,
  },
  infoText: {
    fontSize: 16,
    color: themeColors.textSecondary,
    lineHeight: 24,
  },
  infoTextLabel: {
    fontSize: 16,
    color: themeColors.textSecondary,
    fontWeight: '500',
  },
  infoTextValue: {
    fontSize: 16,
    color: themeColors.textPrimary,
    flexShrink: 1,
  },
  infoTextValueEmphasized: {
    fontSize: 16,
    color: themeColors.textPrimary,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: 8,
  },
  errorText: {
    color: themeColors.danger,
    fontWeight: 'bold',
  },
  feedingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: themeColors.background,
    borderRadius: 20,
  },
  guideButtonText: {
    fontSize: 14,
    color: themeColors.primary,
    fontWeight: '600',
    marginLeft: 5,
  },
  input: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: themeColors.borderColor,
    borderRadius: 8,
    backgroundColor: themeColors.cardBackground,
    marginBottom: 15,
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  actionButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
  },
  feedNowButton: {
     backgroundColor: themeColors.primary,
  },
  addTimeButton: {
      backgroundColor: themeColors.primary,
  },
  buttonText: {
    color: themeColors.textOnPrimary,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: 'center',
  },
  buttonDisabled: {
    backgroundColor: themeColors.disabledBackground,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColors.background,
    padding: 15,
    borderRadius: 10,
    // marginBottom: 10, // replaced by itemseparatorcomponent
  },
  scheduleIcon: {
    marginRight: 15,
  },
   scheduleInfo: {
     flex: 1,
   },
   scheduleTime: {
     fontSize: 17,
     fontWeight: 'bold',
     color: themeColors.textPrimary,
   },
   scheduleWeight: {
     fontSize: 15,
     color: themeColors.textSecondary,
     marginTop: 2,
   },
   scheduleControls: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   deleteButton: {
     marginLeft: 12,
     padding: 8,
   },
   emptyStateText: {
       textAlign: 'center',
       color: themeColors.textMuted,
       marginTop: 20,
       marginBottom: 10,
       fontSize: 16,
       fontStyle: 'italic',
   },
   listItemSeparator: {
    height: 10, 
    backgroundColor: 'transparent',
   },
   modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  modalContent: {
    width: "90%",
    maxWidth: 380,
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: themeColors.textPrimary,
    textAlign: 'center',
  },
  modalSection: {
    width: '100%',
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: themeColors.borderColor,
    paddingTop: 20,
  },
  modalSectionHeader: {
      fontSize: 17,
      fontWeight: 'bold',
      color: themeColors.primary,
      marginBottom: 12,
      alignSelf: 'flex-start',
  },
  modalText: {
     fontSize: 16,
     marginBottom: 8,
     color: themeColors.textSecondary,
     textAlign: 'left',
     width: '100%',
     lineHeight: 22,
   },
   modalNote: {
     fontSize: 14,
     color: themeColors.textMuted,
     marginTop: 15,
     marginBottom: 10,
     fontStyle: 'italic',
     textAlign: 'center',
     lineHeight: 20,
   },
   modalNoteSmall: {
      fontSize: 13,
      color: themeColors.danger,
      marginTop: 8,
      textAlign: 'center',
      width: '100%',
  },
  modalButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
   },
   modalButtonText: {
    color: themeColors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
   },
   modalPrimaryButton: {
    backgroundColor: themeColors.primary,
   },
   modalSecondaryButton: {
    backgroundColor: themeColors.cardBackground,
    borderColor: themeColors.primary,
    borderWidth: 1.5,
   },
   modalCloseButton: { 
    backgroundColor: themeColors.textSecondary, 
   },
   modalDeleteButton: {
    backgroundColor: themeColors.danger,
   },
   modalInput: {
     width: '100%',
     paddingVertical: 12,
     paddingHorizontal: 15,
     borderWidth: 1,
     borderColor: themeColors.borderColor,
     borderRadius: 8,
     marginBottom: 15, 
     fontSize: 16,
     backgroundColor: themeColors.background, 
     color: themeColors.textPrimary,
   },
   modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textSecondary,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  settingsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderColor,
  },
  settingsMenuItemIcon: {
    color: themeColors.accent,
    marginRight: 15,
  },
  settingsMenuItemText: {
    flex: 1,
    fontSize: 17,
    color: themeColors.textPrimary,
  },
  settingsMenuChevron: {
    color: themeColors.textMuted,
  },
  accountEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: themeColors.background,
    borderRadius: 8,
  },
  accountEmailIcon: {
    color: themeColors.accent,
    marginRight: 10,
  },
  verificationWarningText: {
    color: themeColors.warning,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  petTypeSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  petTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: themeColors.light,
    backgroundColor: themeColors.cardBackground,
  },
  petTypeButtonSelected: {
    backgroundColor: themeColors.primary,
    borderColor: themeColors.primary,
  },
  petTypeIcon: {
    marginRight: 8,
    color: themeColors.light,
  },
  petTypeIconSelected: {
    color: themeColors.textOnPrimary,
  },
  petTypeButtonText: {
    fontSize: 16,
    color: themeColors.light,
    fontWeight: '600',
  },
  petTypeButtonTextSelected: {
    color: themeColors.textOnPrimary,
  },
  historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 5, 
      // marginBottom: 10, // replaced by itemseparator
      backgroundColor: themeColors.cardBackground, 
      borderRadius: 8, // optional: round corners for history items if not using card BG
  },
  historyIcon: {
    marginRight: 15,
  },
  historyInfo: {
      flex: 1,
  },
  historyTimestamp: {
      fontSize: 15,
      color: themeColors.textPrimary,
      fontWeight: 'bold',
      marginBottom: 2,
  },
  historyDetails: {
      fontSize: 14,
      color: themeColors.textSecondary,
  },
  passwordChecklistContainer: {
    width: '100%',
    marginTop: 5,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  passwordChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: 13,
    marginBottom: 4,
  },
  validCheck: {
    color: themeColors.success,
  },
  invalidCheck: {
    color: themeColors.danger,
  },

  passwordChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // info button to the right
    width: '100%',
    marginBottom: 15, 
    // paddingHorizontal: 5, // optional: less space taken by checklist
  },
  passwordMinimalChecklist: { 
    flexDirection: 'row',
    // justifyContent: 'flex-start', 
    alignItems: 'center',
    flex: 1, 
    marginRight: 10, 
    justifyContent: 'space-around', 
    paddingRight: 10, 
  },
  checklistItemIcon: {
    marginHorizontal: 2, 
  },
  passwordInfoButton: {
    padding: 5, 
  },

  passwordInfoModalOverlay: {
    flex: 1,
    justifyContent: 'center', // flex-end
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  passwordInfoModalContent: {
    width: '85%', // or fixed width like 300
    maxWidth: 320,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 12,
    padding: 20,
    alignItems: 'flex-start', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  passwordInfoModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.primary,
    marginBottom: 15,
    alignSelf: 'center',
  },
  passwordInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  passwordInfoIcon: {
    marginRight: 10,
  },
  passwordInfoText: {
    fontSize: 15,
    color: themeColors.textSecondary,
    flexShrink: 1,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: themeColors.borderColor,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: themeColors.background,
  },
  passwordInputText: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 15,
    paddingRight: 5, 
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  passwordToggleIcon: {
    padding: 10,
  },
});