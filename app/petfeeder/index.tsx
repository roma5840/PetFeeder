// v13
// added device logging

// v13.5
// Security Improvement - New more secure backend for TOTP

// v14
// add connect feeder modal

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
  Dimensions,
  Platform,
  BackHandler,
  Linking,
  Clipboard,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LineChart } from "react-native-chart-kit";
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
  push,
  orderByChild,
  equalTo,
} from "firebase/database";

import QRCode from 'react-native-qrcode-svg';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '../AuthContext'; 
import ConnectFeederModal from '../components/ConnectFeederModal'; 
import { useNetInfo } from "@react-native-community/netinfo";

const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return Infinity;
    try {
        const lowerTime = timeStr.toLowerCase().trim();
        const isPM = lowerTime.includes('pm');
        const isAM = lowerTime.includes('am');
        const timePart = lowerTime.replace(/am|pm/g, '').trim();
        let [hours, minutes] = timePart.split(':').map(Number);

        if (isNaN(hours) || isNaN(minutes)) return Infinity;

        if (isPM && hours !== 12) { hours += 12; }
        else if (isAM && hours === 12) { hours = 0; }
        else if (!isAM && !isPM && hours === 24) { hours = 0; }

        return hours * 60 + minutes;
    } catch (e) {
        console.error("Error parsing schedule time for sort/compare:", timeStr, e);
        return Infinity;
    }
};


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

  const [currentFoodLevel, setCurrentFoodLevel] = useState(0);
  const [hopperCapacity, setHopperCapacity] = useState(1000);
  const [showUpdateFoodLevelModal, setShowUpdateFoodLevelModal] = useState(false);
  const [tempInputFoodLevel, setTempInputFoodLevel] = useState('');
  const [tempInputHopperCapacity, setTempInputHopperCapacity] = useState('');
  const lastProcessedFeedTimestampRef = useRef(null);
  const foodConfigListenerUnsubscribe = useRef(null);

  const [gramsToAdd, setGramsToAdd] = useState('');

  const [showHistoryFilterModal, setShowHistoryFilterModal] = useState(false);
  const [historyFilterConfig, setHistoryFilterConfig] = useState({
    type: 'all',
    startDate: null,
    endDate: null,
  });
  const [tempHistoryFilterConfig, setTempHistoryFilterConfig] = useState(historyFilterConfig);
  const [showHistoryStartDatePicker, setShowHistoryStartDatePicker] = useState(false);
  const [showHistoryEndDatePicker, setShowHistoryEndDatePicker] = useState(false);
  const [filteredFeedingHistory, setFilteredFeedingHistory] = useState([]);

  const [petNotes, setPetNotes] = useState([]);
  const [showPetNotesModal, setShowPetNotesModal] = useState(false);
  const [currentNoteText, setCurrentNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const notesListenerUnsubscribe = useRef(null);

  const [showTotpManagementModal, setShowTotpManagementModal] = useState(false);
  const [totpStep, setTotpStep] = useState('initial'); // initial, setupQr, verifySetup, showRecovery, manage
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQrUri, setTotpQrUri] = useState('');
  const [totpVerificationCode, setTotpVerificationCode] = useState('');
  const [plainRecoveryCodes, setPlainRecoveryCodes] = useState([]);
  const [userTotpConfig, setUserTotpConfig] = useState(null);
  const [isTotpLoading, setIsTotpLoading] = useState(false);
  const [confirmSavedRecoveryCodes, setConfirmSavedRecoveryCodes] = useState(false);
  const [showPreTotpReauthModal, setShowPreTotpReauthModal] = useState(false);
  const [preTotpReauthPassword, setPreTotpReauthPassword] = useState('');

  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthAction, setReauthAction] = useState(null);
  const [isReauthenticating, setIsReauthenticating] = useState(false);

  const [deviceSessions, setDeviceSessions] = useState<DeviceSession[]>([]);
  const [isLoadingDeviceSessions, setIsLoadingDeviceSessions] = useState(false);
  const [showDeviceManagementModal, setShowDeviceManagementModal] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const [showDeleteAccountReauthModal, setShowDeleteAccountReauthModal] = useState(false);
  const [deleteAccountReauthPassword, setDeleteAccountReauthPassword] = useState('');
  const [isReauthenticatingForDelete, setIsReauthenticatingForDelete] = useState(false);

  const [showConnectFeederModal, setShowConnectFeederModal] = useState(false);

  const [showTroubleshootModal, setShowTroubleshootModal] = useState(false);

  const CLOUDFLARE_WORKER_TOTP_URL = "https://totp-auth-worker.ryanoliver565.workers.dev"; 
  const CLOUDFLARE_WORKER_DEVICES_URL = "https://petfeeder-device-manager-worker.ryanoliver565.workers.dev"; 

  const [nextScheduledFeedInfo, setNextScheduledFeedInfo] = useState({ time: "N/A", amount: ""});

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [0], color: (opacity = 1) => themeColors.accent, strokeWidth: 2 }],
    legend: ["Daily Consumption (g)"]
  });

  const statusListenerUnsubscribe = useRef(null);
  const schedulesListenerUnsubscribe = useRef(null);
  const historyListenerUnsubscribe = useRef(null);

  const { isTotpSessionVerified } = useAuthContext();
  const auth = getAuth();
  const db = getDatabase();
  const user = auth.currentUser;
  const FEEDER_SETUP_SSID = "PetFeeder-Setup";

  const netInfo = useNetInfo();
  const hasLoadedOnce = useRef(false);

  interface DeviceSession {
    deviceId: string;
    userAgent: string;
    ipAddress: string;
    country: string;
    firstLogin: number;
    lastActive: number;
    status: 'active' | 'pending_logout' | 'logged_out';
  }


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
    const isFeederSetupWifi = netInfo.type === 'wifi' && netInfo.details?.ssid === FEEDER_SETUP_SSID;

    // Treat being on the feeder setup WiFi or having no internet as an offline state for Firebase purposes.
    if (netInfo.isInternetReachable === false || isFeederSetupWifi) {
      const reason = isFeederSetupWifi ? "on feeder setup WiFi" : `internet not reachable (isInternetReachable: ${netInfo.isInternetReachable})`;
      console.log(`PetFeeder Screen: No internet access because ${reason}. Setting to offline state and clearing stale data.`);
      
      setIsLoading(false);
      setIsLoadingHistory(false);
      setIsLoadingNotes(false);
      setFeederOnline(false);

      setSchedules([]);
      setFeedingHistory([]);
      setPetNotes([]);
      setNextScheduledFeedInfo({ time: "App is Offline", amount: "" });

      if (statusListenerUnsubscribe.current) { statusListenerUnsubscribe.current(); statusListenerUnsubscribe.current = null; }
      if (schedulesListenerUnsubscribe.current) { schedulesListenerUnsubscribe.current(); schedulesListenerUnsubscribe.current = null; }
      if (historyListenerUnsubscribe.current) { historyListenerUnsubscribe.current(); historyListenerUnsubscribe.current = null; }
      if (foodConfigListenerUnsubscribe.current) { foodConfigListenerUnsubscribe.current(); foodConfigListenerUnsubscribe.current = null; }
      if (notesListenerUnsubscribe.current) { notesListenerUnsubscribe.current(); notesListenerUnsubscribe.current = null; }
      
      return;
    }

    if (!user || !isTotpSessionVerified) {
        console.log("useEffect: No user found, skipping listener attachment.");
        setIsLoading(false);
        setIsLoadingHistory(false);
        setIsLoadingNotes(false);
        if (statusListenerUnsubscribe.current) { statusListenerUnsubscribe.current(); statusListenerUnsubscribe.current = null; }
        if (schedulesListenerUnsubscribe.current) { schedulesListenerUnsubscribe.current(); schedulesListenerUnsubscribe.current = null; }
        if (historyListenerUnsubscribe.current) { historyListenerUnsubscribe.current(); historyListenerUnsubscribe.current = null; }
        if (foodConfigListenerUnsubscribe.current) { foodConfigListenerUnsubscribe.current(); foodConfigListenerUnsubscribe.current = null; }
        if (notesListenerUnsubscribe.current) { notesListenerUnsubscribe.current(); notesListenerUnsubscribe.current = null; }
        lastProcessedFeedTimestampRef.current = null;
        return;
    }

    console.log(`%cuseEffect: RUNNING for user ${user.uid}. TOTP Session Verified: ${isTotpSessionVerified}`, 'color: blue; font-weight: bold;');
    if (!hasLoadedOnce.current) {
      setIsLoading(true);
    }
    setIsLoadingHistory(true);
    setIsLoadingNotes(true);

    let initialBaseDataFetched = false;
    let statusListenerReady = false;
    let schedulesListenerReady = false;
    let historyListenerReady = false;
    let foodConfigListenerReady = false;
    let notesListenerReady = false;

    const userBaseRef = ref(db, `users/${user.uid}`);
    const statusRefPath = `users/${user.uid}/feederStatus`;
    const schedulesRefPath = `users/${user.uid}/schedules`;
    const historyQuery = query(
        ref(db, `users/${user.uid}/feedingHistory`),
        orderByKey(),
        // limitToLast(100)
    );
    const foodConfigRefPath = `users/${user.uid}/feederConfig`;
    const notesRefPath = `users/${user.uid}/petNotes`;


    const checkAllLoaded = () => {
        console.log(`%cuseEffect: checkAllLoaded: Base=${initialBaseDataFetched}, Status=${statusListenerReady}, Schedules=${schedulesListenerReady}, History=${historyListenerReady}, FoodConfig=${foodConfigListenerReady}, Notes=${notesListenerReady}`, 'color: gray');
        if (initialBaseDataFetched && statusListenerReady && schedulesListenerReady && historyListenerReady && foodConfigListenerReady && notesListenerReady) {
            console.log("%cuseEffect: All data and listeners ready, setting loading false.", 'color: green; font-weight: bold;');
            setIsLoading(false);
            hasLoadedOnce.current = true;
        }
    };

    get(userBaseRef).then((snapshot) => {
        console.log("useEffect: Initial base data (pet details) received.");
        if (snapshot.exists()) {
            const data = snapshot.val();
            setPetName(data.petName || "Unknown");
            setPetType(data.petType || "Unknown");
            setPetWeight(data.petWeight || "");
            const recWeight = calculateRecommendedWeight(data.petWeight || "");
            setRecommendedWeight(recWeight);
            if (!manualWeight) { setManualWeight(recWeight !== "N/A" ? recWeight : "100"); }
        } else {
            console.warn(`useEffect: No base data found for user ${user.uid}. Setting defaults.`);
            setPetName("N/A"); setPetType("N/A"); setPetWeight(""); setRecommendedWeight("N/A");
            if (!manualWeight) setManualWeight("100");
        }
        if (!initialBaseDataFetched) {
            initialBaseDataFetched = true;
            console.log("useEffect: BaseData FETCHED & Processed.");
            checkAllLoaded();
        }
    }).catch(error => {
        // console.error("useEffect: Error fetching initial pet data:", error);
        Alert.alert("Error", "Could not fetch pet details.");
        if (!initialBaseDataFetched) {
            initialBaseDataFetched = true;
            checkAllLoaded();
        }
    });

    console.log(`useEffect: Attaching food config listener to ${foodConfigRefPath}`);
    foodConfigListenerUnsubscribe.current = onValue(ref(db, foodConfigRefPath), (snapshot) => {
        console.log("useEffect: Food config data received from Firebase.");
        const configData = snapshot.val();
        if (configData) {
            setCurrentFoodLevel(configData.currentFoodLevel !== undefined ? configData.currentFoodLevel : 0);
            setHopperCapacity(configData.hopperCapacity !== undefined ? configData.hopperCapacity : 1000);
        } else {
            console.log("useEffect: No food config data in Firebase, using local defaults.");
            setCurrentFoodLevel(0);
            setHopperCapacity(1000);
        }
        if (!foodConfigListenerReady) {
            foodConfigListenerReady = true;
            console.log("useEffect: FoodConfigListener READY.");
            checkAllLoaded();
        }
    }, (error) => {
        // console.error(`useEffect: Error listening to food config at ${foodConfigRefPath}:`, error);
        setCurrentFoodLevel(0); setHopperCapacity(1000);
        if (!foodConfigListenerReady) {
            foodConfigListenerReady = true;
            checkAllLoaded();
        }
    });

    console.log(`useEffect: Attaching status listener to ${statusRefPath}`);
    statusListenerUnsubscribe.current = onValue(ref(db, statusRefPath), (snapshot) => {
        console.log("useEffect: Feeder status data received from Firebase.");
        if (snapshot.exists()) {
            const statusData = snapshot.val();
            setFeederOnline(statusData.isOnline || false);
            setFeederError(statusData.error || "None");

            const lastFeedTimestamp = statusData.lastFeedTimestamp;
            const lastFeedAmountStr = statusData.lastFeedAmount;

            if (lastProcessedFeedTimestampRef.current === null && lastFeedTimestamp && !statusListenerReady) {
                lastProcessedFeedTimestampRef.current = lastFeedTimestamp;
            }

            if (lastFeedTimestamp && lastFeedAmountStr) {
                const date = new Date(lastFeedTimestamp);
                const amountForDisplay = lastFeedAmountStr || 'N/A';
                if (!isNaN(date.getTime())) {
                    setLastFeedInfo(`${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${amountForDisplay}g)`);
                    
                    // Only process food deduction if the timestamp is new
                    if (lastProcessedFeedTimestampRef.current !== lastFeedTimestamp) {
                        get(ref(db, foodConfigRefPath)).then(foodConfigSnapshot => {
                            if (foodConfigSnapshot.exists()) {
                                const currentActualFoodLevel = foodConfigSnapshot.val().currentFoodLevel;
                                const amountDispensed = parseFloat(lastFeedAmountStr);
                                
                                if (!isNaN(amountDispensed) && amountDispensed > 0) {
                                    const newCalculatedLevel = Math.max(0, currentActualFoodLevel - amountDispensed);
                                    console.log(`Food DEDUCTION: DB foodLevel: ${currentActualFoodLevel}g, Dispensed by ESP: ${amountDispensed}g, New calculated: ${newCalculatedLevel}g. ESP Timestamp: ${lastFeedTimestamp}`);

                                    update(ref(db, foodConfigRefPath), { currentFoodLevel: newCalculatedLevel })
                                        .then(() => {
                                            console.log(`Firebase foodLevel updated to ${newCalculatedLevel}g. Marking timestamp ${lastFeedTimestamp} as processed.`);
                                            lastProcessedFeedTimestampRef.current = lastFeedTimestamp;
                                        })
                                        .catch(error => {
                                            console.error("CRITICAL: Failed to update food level in Firebase after deduction:", error);
                                            Alert.alert("Food Level Sync Error", "Failed to update food level after feed. It may be inaccurate.");
                                        });
                                } else {
                                    lastProcessedFeedTimestampRef.current = lastFeedTimestamp;
                                }
                            }
                        });
                    }
                } else { setLastFeedInfo("Invalid Date"); console.warn("Invalid lastFeedTimestamp:", statusData.lastFeedTimestamp); }
            } else { setLastFeedInfo("N/A"); }

            if (lastProcessedFeedTimestampRef.current === null && statusData.lastFeedTimestamp) {
                lastProcessedFeedTimestampRef.current = statusData.lastFeedTimestamp;
            }
        } else {
            console.log("useEffect: No feeder status data in Firebase. Resetting status states.");
            setFeederOnline(false); setFeederError("None"); setLastFeedInfo("N/A");
        }
        if (!statusListenerReady) {
            statusListenerReady = true;
            console.log("useEffect: StatusListener READY.");
            checkAllLoaded();
        }
    }, (error) => {
        // console.error(`useEffect: Error listening to feeder status at ${statusRefPath}:`, error);
        if (!statusListenerReady) {
            statusListenerReady = true;
            checkAllLoaded();
        }
    });

    console.log(`useEffect: Attaching schedules listener to ${schedulesRefPath}`);
    schedulesListenerUnsubscribe.current = onValue(ref(db, schedulesRefPath), (snapshot) => {
        const schedulesData = snapshot.val();
        const loadedSchedules = Array.isArray(schedulesData) ? schedulesData : (schedulesData ? Object.values(schedulesData) : []);
        setSchedules(loadedSchedules.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)));
        if (!schedulesListenerReady) {
            schedulesListenerReady = true;
            console.log("useEffect: SchedulesListener READY.");
            checkAllLoaded();
        }
    }, (error) => {
        // console.error(`useEffect: Error listening to schedules at ${schedulesRefPath}:`, error);
        if (!schedulesListenerReady) {
            schedulesListenerReady = true;
            checkAllLoaded();
        }
    });

    console.log(`useEffect: Attaching history listener.`);
    historyListenerUnsubscribe.current = onValue(historyQuery, (snapshot) => {
        const historyData = snapshot.val();
        const historyArray = historyData ? Object.keys(historyData).map(key => ({ id: key, timestamp: parseInt(key, 10), ...historyData[key] })).filter(item => !isNaN(item.timestamp)).sort((a, b) => b.timestamp - a.timestamp) : [];
        setFeedingHistory(historyArray);
        setIsLoadingHistory(false);
        if (!historyListenerReady) {
            historyListenerReady = true;
            console.log("useEffect: HistoryListener READY.");
            checkAllLoaded();
        }
    }, (error) => {
        // console.error("useEffect: Error listening to feeding history:", error);
        setIsLoadingHistory(false);
        if (!historyListenerReady) {
            historyListenerReady = true;
            checkAllLoaded();
        }
    });

    console.log(`useEffect: Attaching pet notes listener to ${notesRefPath}`);
    notesListenerUnsubscribe.current = onValue(query(ref(db, notesRefPath), orderByKey()), (snapshot) => { // orderByChild('timestamp') if notes have a server timestamp
        const notesData = snapshot.val();
        const loadedNotes = notesData ? Object.keys(notesData)
            .map(key => ({ id: key, ...notesData[key] }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            : [];
        setPetNotes(loadedNotes);
        setIsLoadingNotes(false);
        if (!notesListenerReady) {
            notesListenerReady = true;
            console.log("useEffect: PetNotesListener READY.");
            checkAllLoaded();
        }
    }, (error) => {
        // console.error("useEffect: Error listening to pet notes:", error);
        setIsLoadingNotes(false);
        if (!notesListenerReady) {
            notesListenerReady = true;
            checkAllLoaded();
        }
    });


    return () => {
        console.log(`%cuseEffect: CLEANUP for user ${user?.uid}. Detaching listeners. TOTPSessionVerified was: ${isTotpSessionVerified}`, 'color: orange;');
        if (statusListenerUnsubscribe.current) { statusListenerUnsubscribe.current(); statusListenerUnsubscribe.current = null; }
        if (schedulesListenerUnsubscribe.current) { schedulesListenerUnsubscribe.current(); schedulesListenerUnsubscribe.current = null; }
        if (historyListenerUnsubscribe.current) { historyListenerUnsubscribe.current(); historyListenerUnsubscribe.current = null; }
        if (foodConfigListenerUnsubscribe.current) { foodConfigListenerUnsubscribe.current(); foodConfigListenerUnsubscribe.current = null; }
        if (notesListenerUnsubscribe.current) { notesListenerUnsubscribe.current(); notesListenerUnsubscribe.current = null; }
    };
  }, [user, db, calculateRecommendedWeight, isTotpSessionVerified, netInfo]);

  useEffect(() => {
    if (user) {
        const fetchUserTotpConfig = async () => {
            const db = getDatabase();
            const totpRef = ref(db, `users/${user.uid}/totp`);
            try {
                const snapshot = await get(totpRef);
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    setUserTotpConfig({
                        enabled: data.enabled || false,
                        setupComplete: data.setupComplete || false,
                    });
                } else {
                    setUserTotpConfig({ enabled: false, setupComplete: false });
                }

            } catch (error) {
                // console.error("Error fetching TOTP config:", error);
                setUserTotpConfig({ enabled: false, setupComplete: false });
            }
        };
        fetchUserTotpConfig();
    }
}, [user, db]);


  useEffect(() => {
    const applyFilterAndGenerateChart = () => {
        let tempFiltered = [...feedingHistory];

        if (historyFilterConfig.type !== 'all' && feedingHistory.length > 0) {
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

            if (historyFilterConfig.type === 'last7days') {
                startDate.setDate(now.getDate() - 6);
                startDate.setHours(0,0,0,0);
            } else if (historyFilterConfig.type === 'last30days') {
                startDate.setDate(now.getDate() - 29);
                startDate.setHours(0,0,0,0);
            } else if (historyFilterConfig.type === 'custom' && historyFilterConfig.startDate && historyFilterConfig.endDate) {
                startDate = new Date(historyFilterConfig.startDate);
                startDate.setHours(0,0,0,0);
                endDate = new Date(historyFilterConfig.endDate);
                endDate.setHours(23,59,59,999);
            } else if (historyFilterConfig.type === 'custom' && historyFilterConfig.startDate) {
                startDate = new Date(historyFilterConfig.startDate);
                startDate.setHours(0,0,0,0);
            }


            tempFiltered = feedingHistory.filter(item => {
                const itemDate = new Date(item.timestamp);
                if (historyFilterConfig.type === 'custom') {
                    const startOk = historyFilterConfig.startDate ? itemDate >= startDate : true;
                    const endOk = historyFilterConfig.endDate ? itemDate <= endDate : (historyFilterConfig.startDate ? itemDate <= new Date(new Date(historyFilterConfig.startDate).setHours(23,59,59,999)) : true) ;
                     if(historyFilterConfig.startDate && !historyFilterConfig.endDate) {
                        const singleDayStart = new Date(historyFilterConfig.startDate);
                        singleDayStart.setHours(0,0,0,0);
                        const singleDayEnd = new Date(historyFilterConfig.startDate);
                        singleDayEnd.setHours(23,59,59,999);
                        return itemDate >= singleDayStart && itemDate <= singleDayEnd;
                    }
                    return startOk && endOk;
                }
                return itemDate >= startDate && itemDate <= endDate;
            });
        }
        setFilteredFeedingHistory(tempFiltered.slice(0, 20)); // limit for display list

        const dailyTotals = {};
        tempFiltered.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD for sorting/grouping
            dailyTotals[date] = (dailyTotals[date] || 0) + (parseFloat(item.amount) || 0);
        });

        const sortedDates = Object.keys(dailyTotals).sort();
        const chartLabels = sortedDates.map(date => {
            const d = new Date(date);
            return `${d.getMonth() + 1}/${d.getDate()}`; // MM/DD
        });
        const chartDatasetData = sortedDates.map(date => dailyTotals[date]);

        if (chartLabels.length > 0) {
            setChartData({
                labels: chartLabels.slice(-7),
                datasets: [{ data: chartDatasetData.slice(-7), color: (opacity = 1) => themeColors.accent, strokeWidth: 2 }],
                legend: ["Daily Consumption (g)"]
            });
        } else {
            setChartData({ labels: ["No Data"], datasets: [{ data: [0], color: (opacity = 1) => themeColors.accent, strokeWidth: 2 }], legend: ["Daily Consumption (g)"] });
        }

    };
    applyFilterAndGenerateChart();
  }, [feedingHistory, historyFilterConfig]);

  useEffect(() => {
    const calculateNext = () => {
        if (!feederOnline) {
            setNextScheduledFeedInfo({ time: "Feeder Offline", amount: "" });
            return;
        }
        const activeSchedules = schedules
            .filter(s => s.isOn && parseInt(s.weight) <= currentFoodLevel)
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

        if (activeSchedules.length === 0) {
            const anyActiveSchedule = schedules.find(s => s.isOn);
            if(anyActiveSchedule && parseInt(anyActiveSchedule.weight) > currentFoodLevel) {
                 setNextScheduledFeedInfo({ time: "Low Food", amount: `(${anyActiveSchedule.weight}g needed)`});
            } else {
                 setNextScheduledFeedInfo({ time: "No Active Schedules", amount: "" });
            }
            return;
        }

        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

        let nextFeed = null;
        for (const sched of activeSchedules) {
            const scheduleTimeInMinutes = timeToMinutes(sched.time);
            if (scheduleTimeInMinutes >= currentTimeInMinutes) {
                nextFeed = sched;
                break;
            }
        }

        if (!nextFeed) {
            nextFeed = activeSchedules[0];
            setNextScheduledFeedInfo({ time: `Tomorrow at ${nextFeed.time}`, amount: `(${nextFeed.weight}g)`});
        } else {
            setNextScheduledFeedInfo({ time: `Today at ${nextFeed.time}`, amount: `(${nextFeed.weight}g)`});
        }
    };

    calculateNext();
  }, [schedules, currentFoodLevel, feederOnline]);

  useEffect(() => {
    const handleHardwareBackPress = () => {
      if (showTotpManagementModal) {
        if (isTotpLoading) {
          return true;
        }
        if (totpStep === 'showRecovery') {
          Alert.alert(
            "Action Required",
            "Please confirm you have saved your recovery codes and then tap 'Done'.",
            [{ text: "OK" }]
          );
          return true;
        }
      }
      return false;
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', handleHardwareBackPress);
    }

    return () => {
      if (Platform.OS === 'android') {
        BackHandler.removeEventListener('hardwareBackPress', handleHardwareBackPress);
      }
    };
  }, [showTotpManagementModal, totpStep, isTotpLoading]);


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

      const isDuplicateTime = schedules.some(s => s.time === newSchedule.time);
      if (isDuplicateTime) {
          Alert.alert("Duplicate Time", "A schedule for this time already exists. Please choose a different time or edit the existing one.");
          setSelectedTime(new Date());
          return;
      }

      const updatedSchedules = [...schedules, newSchedule].sort((a,b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      // setSchedules(updatedSchedules);
      setIsSaving(true);

      if (user) {
        const newScheduleRef = ref(db, `users/${user.uid}/schedules/${newSchedule.id}`);
        try {
          await set(newScheduleRef, newSchedule);
          // Alert.alert("Success", "Schedule added!");
        } catch (error) {
          // console.error("Error saving schedule:", error);
          Alert.alert("Error", "Failed to save schedule. Please try again.");
          // setSchedules(schedules.filter(s => s.id !== newSchedule.id));
        } finally {
          setIsSaving(false);
        }
      }
    }
     setSelectedTime(new Date());
  };

  const toggleSchedule = async (id, scheduledAmount) => {
    const scheduleIndex = schedules.findIndex((item) => item.id === id);
    if (scheduleIndex === -1) return;

    const scheduleToUpdate = schedules[scheduleIndex];
    const newIsOnState = !scheduleToUpdate.isOn;

    if (newIsOnState && scheduledAmount > currentFoodLevel) {
        Alert.alert(
            "Low Food",
            `There isn't enough food (${currentFoodLevel}g) in the hopper for this ${scheduledAmount}g schedule. Please refill or adjust. Turn on anyway?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Turn On Anyway", onPress: () => proceedWithToggle(id, newIsOnState) }
            ]
        );
        return;
    }
    proceedWithToggle(id, newIsOnState);
  };

  const proceedWithToggle = async (id, newIsOnState) => {
      setIsSaving(true);
      if (user) {
          const scheduleRef = ref(db, `users/${user.uid}/schedules/${id}`);
          try {
              await update(scheduleRef, { isOn: newIsOnState });
          } catch (error) {
              // console.error("Error updating schedule toggle:", error);
              Alert.alert("Error", "Failed to update schedule status.");
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
                setIsSaving(true);
                if (user) {
                  const scheduleRef = ref(db, `users/${user.uid}/schedules/${id}`);
                  try {
                    await remove(scheduleRef);
                  } catch (error) {
                    // console.error("Error deleting schedule:", error);
                    Alert.alert("Error", "Failed to delete schedule.");
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
     if (feedAmount > currentFoodLevel) {
      Alert.alert("Low Food", `Not enough food (${currentFoodLevel}g) for a ${feedAmount}g serving. Please refill or reduce amount.`);
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
      // console.error("Error sending feed command:", error);
      Alert.alert("Error", "Failed to send feed command. Check connection.");
    } finally {
      setIsFeeding(false);
    }
  };


  // ACCOUNT SETTINGS
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
    setShowChangePasswordModal(true);
  };

  const handleSaveChanges = async () => {
    if (!tempPetDetails.name.trim() || !tempPetDetails.type.trim() || !tempPetDetails.weight.trim()) {
        Alert.alert("Missing Information", "Please fill in all pet details.");
        return;
    }
    const weightRegex = /^\d{1,3}(\.\d{1,2})?$/;
    if (!weightRegex.test(tempPetDetails.weight) || tempPetDetails.weight === '.') {
         Alert.alert("Invalid Weight", "Please enter a valid weight format (e.g., 10.5 or 15). Max 3 digits before decimal, 2 after.");
         return;
    }
    const numericWeight = parseFloat(tempPetDetails.weight);
    if (isNaN(numericWeight) || numericWeight <= 0) {
        Alert.alert("Invalid Weight", "Weight must be a positive number.");
        return;
    }
    if (numericWeight >= 155) {
        Alert.alert(
            "Confirm Pet Weight",
            `Are you sure your pet weighs ${numericWeight} kg?\n\nFun Fact: The heaviest dog, Aicama Zorba, weighed 155.6 kg; and the heaviest domestic cat, Himmy, weighed 21.3 kg!`,
            [
                { text: "No", style: "cancel" },
                { text: "Yes", onPress: proceedWithSave },
            ],
            { cancelable: false }
        );
    } else {
        proceedWithSave();
    }
  };

  const proceedWithSave = async () => {
    if (!auth.currentUser) {
      Alert.alert("Error", "User session not found. Please log in again.");
      return;
    }
    const currentUid = auth.currentUser.uid;
    setIsSaving(true);
    const userRef = ref(db, `users/${currentUid}`);
    const updates = {
      petName: tempPetDetails.name.trim(),
      petType: tempPetDetails.type,
      petWeight: tempPetDetails.weight,
    };
    try {
      await update(userRef, updates);
      setPetName(updates.petName);
      setPetType(updates.petType);
      setPetWeight(updates.petWeight);
      setRecommendedWeight(calculateRecommendedWeight(updates.petWeight));

      setTimeout(() => {
        Alert.alert(
          "Success",
          "Pet details updated.",
          [ { text: "OK", onPress: () => {
                setShowUpdatePetModal(false);
                // setShowSettingsModal(true);
              }
            }
          ], { cancelable: false }
        );
      }, 100);

    } catch (error) {
      // console.error("Error updating pet details:", error);
      Alert.alert("Error", "Failed to update pet details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (auth.currentUser && currentDeviceId) {
        try {
            // console.log(`[handleLogout] Attempting to notify server of self-logout for device: ${currentDeviceId}`);
            await _callDeviceApi(
                '/devices/logout/self',
                'POST',
                auth.currentUser,
                { deviceId: currentDeviceId }
            );
            // console.log(`[handleLogout] Server successfully notified of self-logout for device: ${currentDeviceId}`);
        } catch (apiError: any) {
            console.warn(`[handleLogout] Failed to notify server of self-logout for device ${currentDeviceId}. Error: ${apiError.message}. Proceeding with local logout.`);
        }
    } else {
        console.warn("[handleLogout] Cannot notify server of self-logout: User or currentDeviceId is not available. Proceeding with local logout only.");
    }

    try {
        await signOut(auth);
        console.log("[handleLogout] User signed out locally from Firebase.");
    } catch (signOutError: any) {
        // console.error("[handleLogout] Error during local Firebase signOut:", signOutError);
        Alert.alert("Logout Error", `An error occurred while signing out: ${signOutError.message}`);
    }
  };


  const handleDeleteAccount = () => {
    const userToDelete = auth.currentUser;
    if (!userToDelete) return;

    setShowAccountModal(false);
    setDeleteAccountReauthPassword('');
    setShowDeleteAccountReauthModal(true);

  };

  const handleReauthenticateForDeleteAccount = async () => {
    if (!deleteAccountReauthPassword) {
        Alert.alert("Input Required", "Please enter your current password.");
        return;
    }
    const user = auth.currentUser;
    if (!user || !user.email) {
        Alert.alert("Error", "User session error. Please log in again.");
        return;
    }
    setIsReauthenticatingForDelete(true);
    Keyboard.dismiss();
    try {
        const credential = EmailAuthProvider.credential(user.email, deleteAccountReauthPassword);
        await reauthenticateWithCredential(user, credential);

        setShowDeleteAccountReauthModal(false);
        setDeleteAccountReauthPassword('');
        proceedWithAccountDeletion();

    } catch (error) {
        // console.error("Reauthentication for delete account failed:", error);
        let message = "Reauthentication failed. Please check your password.";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "Incorrect password.";
        } else if (error.code === 'auth/too-many-requests') {
            message = "Too many failed attempts. Please try again later.";
        }
        Alert.alert("Authentication Error", message);
    } finally {
        setIsReauthenticatingForDelete(false);
    }
  };

  const proceedWithAccountDeletion = () => {
    const userToDelete = auth.currentUser;
    if (!userToDelete) {
        Alert.alert("Error", "User session lost. Please try again.");
        return;
    }

    Alert.alert(
      "Confirm Delete Account",
      "This will permanently delete your account and all associated data. This action CANNOT be undone. Are you absolutely sure?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setShowAccountModal(true);
          }
        },
        {
          text: "Delete Permanently",
          style: "destructive",
          onPress: async () => {
            setIsSaving(true);
            try {
              if (userTotpConfig?.enabled && userTotpConfig?.setupComplete) {
                console.log("[Account Deletion] TOTP is enabled, attempting to disable it on the server.");
                try {
                  const idToken = await userToDelete.getIdToken();
                  const workerResponse = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/disable`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({})
                  });
                  const workerData = await workerResponse.json();
                  if (!workerResponse.ok || !workerData.success) {
                    console.warn(`[Account Deletion] Failed to disable TOTP on the server: ${workerData.error || 'Unknown server error'}. Proceeding with account deletion.`);
                  } else {
                    console.log("[Account Deletion] TOTP successfully disabled on the server.");
                  }
                } catch (totpDisableError: any) {
                  console.warn(`[Account Deletion] Error calling TOTP disable endpoint: ${totpDisableError.message}. Proceeding with account deletion.`);
                }
              }

              const userRef = ref(db, `users/${userToDelete.uid}`);
              await remove(userRef);
              await _callDeviceApi('/devices/logout/all-others', 'POST', userToDelete, { currentDeviceId });
              await deleteUser(userToDelete);
              Alert.alert("Account Deleted", "Your account has been successfully deleted.");
            } catch (error) {
              let errorMessage = `Failed to delete account. Please try again.`;
               if (error.code === 'auth/requires-recent-login') {
                  errorMessage = 'This operation requires a very recent login. Please log out and log back in to delete your account.';
              } else if (error.message) {
                  errorMessage = `Failed to delete account: ${error.message}`;
              }
              Alert.alert("Deletion Error", errorMessage);
            } finally {
                setIsSaving(false);
            }
          },
        },
      ], { cancelable: false }
    );
  };


  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Missing Information", "Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Password Mismatch", "New passwords do not match.");
      return;
    }
    const isNewPasswordValid = newPassHasMinLength && newPassHasUpperCase && newPassHasLowerCase && newPassHasNumber && newPassHasSpecialChar;
    if (!isNewPasswordValid) {
      Alert.alert("Invalid New Password", "Please ensure your new password meets all requirements.");
      return;
    }

    Keyboard.dismiss();
    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
      setShowChangePasswordModal(false);
      Alert.alert("Password Changed", "Your password has been successfully updated.");
    } catch (error) {
      let errorMessage = "Failed to change password.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') errorMessage = "Incorrect current password.";
      else if (error.code === 'auth/weak-password') errorMessage = "New password is too weak.";
      else if (error.code === 'auth/requires-recent-login') errorMessage = "This operation requires a recent login. Please log out and log back in.";
      else if (error.message) errorMessage = `Password change failed: ${error.message}`;
      Alert.alert("Update Error", errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const validateNewPassword = (pass, confirmPass) => {
    setNewPassHasMinLength(pass.length >= 6);
    setNewPassHasUpperCase(/[A-Z]/.test(pass));
    setNewPassHasLowerCase(/[a-z]/.test(pass));
    setNewPassHasNumber(/[0-9]/.test(pass));
    setNewPassHasSpecialChar(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass));
    setNewPasswordsMatch(pass === confirmPass && pass.length > 0);
  };


  // HISTORY
  const formatHistoryTimestamp = (timestamp) => {
    if (!timestamp || isNaN(timestamp)) return "Invalid Date";
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return "Invalid Date";
        return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch (e) {
        return "Invalid Date";
    }
  };


  // FOOD LEVEL
  const openUpdateFoodLevelModal = () => {
    setTempInputFoodLevel(currentFoodLevel.toString());
    setTempInputHopperCapacity(hopperCapacity.toString());
    setGramsToAdd('');
    setShowUpdateFoodLevelModal(true);
  };

  const handleSaveFoodLevel = async () => {
    if (!user) return;
    const newCurrentLevel = parseInt(tempInputFoodLevel, 10);
    const newHopperCapacity = parseInt(tempInputHopperCapacity, 10);

    if (isNaN(newCurrentLevel) || newCurrentLevel < 0) {
        Alert.alert("Invalid Input", "Current food level must be a non-negative number.");
        return;
    }
    if (isNaN(newHopperCapacity) || newHopperCapacity <= 0) {
        Alert.alert("Invalid Input", "Hopper capacity must be a positive number.");
        return;
    }
    if (newCurrentLevel > newHopperCapacity) {
        Alert.alert("Invalid Input", "Current food level cannot exceed hopper capacity.");
        return;
    }

    setIsSaving(true);
    const foodConfigPath = `users/${user.uid}/feederConfig`;
    try {
        await update(ref(db, foodConfigPath), { currentFoodLevel: newCurrentLevel, hopperCapacity: newHopperCapacity });
        setShowUpdateFoodLevelModal(false);
        Alert.alert("Success", "Food level and capacity updated.");
    } catch (error) {
        Alert.alert("Error", "Failed to update food level.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddGramsToHopper = () => {
    const toAdd = parseInt(gramsToAdd, 10);
    if (isNaN(toAdd) || toAdd <= 0) {
      Alert.alert("Invalid Amount", "Please enter a positive number of grams to add.");
      setGramsToAdd('');
      return;
    }
    const currentTempLevel = parseInt(tempInputFoodLevel, 10) || 0;
    const capacity = parseInt(tempInputHopperCapacity, 10) || 0;
    if (capacity <= 0) {
        Alert.alert("Set Capacity", "Please set a valid hopper capacity first.");
        return;
    }
    let newLevel = currentTempLevel + toAdd;
    if (newLevel > capacity) {
      newLevel = capacity;
      Alert.alert("Hopper Full", `Food level capped at ${capacity}g capacity.`);
    }
    setTempInputFoodLevel(newLevel.toString());
    setGramsToAdd('');
  };


  // PET NOTES
  const handleSavePetNote = async () => {
    if (!currentNoteText.trim()) {
        Alert.alert("Empty Note", "Cannot save an empty note.");
        return;
    }
    if (!user) return;
    setIsSavingNote(true);
    const notesRef = ref(db, `users/${user.uid}/petNotes`);
    try {
        if (editingNote) {
            const noteToUpdateRef = ref(db, `users/${user.uid}/petNotes/${editingNote.id}`);
            await update(noteToUpdateRef, { text: currentNoteText.trim(), timestamp: editingNote.timestamp });
        } else {
            const newNoteRef = push(notesRef);
            await set(newNoteRef, { text: currentNoteText.trim(), timestamp: Date.now() });
        }
        setCurrentNoteText('');
        setEditingNote(null);
        // setShowPetNotesModal(false);
        Alert.alert("Success", editingNote ? "Note updated." : "Note added.");
    } catch (error) {
        // console.error("Error saving pet note:", error);
        Alert.alert("Error", "Failed to save note.");
    } finally {
        setIsSavingNote(false);
    }
  };

  const openEditPetNote = (note) => {
    setEditingNote(note);
    setCurrentNoteText(note.text);
  };

  const handleDeletePetNote = async (noteId) => {
    if (!user) return;
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
        { text: "Cancel", style: "cancel" },
        {
            text: "Delete", style: "destructive",
            onPress: async () => {
                setIsSavingNote(true);
                const noteRef = ref(db, `users/${user.uid}/petNotes/${noteId}`);
                try {
                    await remove(noteRef);
                    if (editingNote && editingNote.id === noteId) {
                        setEditingNote(null);
                        setCurrentNoteText('');
                    }
                } catch (error) {
                    Alert.alert("Error", "Failed to delete note.");
                } finally {
                    setIsSavingNote(false);
                }
            }
        }
    ]);
  };


  // ANALYTICS
  const handleApplyHistoryFilter = () => {
    setHistoryFilterConfig(tempHistoryFilterConfig);
    setShowHistoryFilterModal(false);
  };

  const onHistoryDateChange = (event, selectedDate, type) => {
    if (type === 'start') setShowHistoryStartDatePicker(false);
    if (type === 'end') setShowHistoryEndDatePicker(false);

    if (event.type === 'set' && selectedDate) {
        if (type === 'start') {
            setTempHistoryFilterConfig(prev => ({ ...prev, startDate: selectedDate, type: 'custom' }));
        } else if (type === 'end') {
            setTempHistoryFilterConfig(prev => ({ ...prev, endDate: selectedDate, type: 'custom' }));
        }
    }
  };


  // TOTP MANAGEMENT
  const openTotpManagement = () => {
    setTotpVerificationCode('');
    setPlainRecoveryCodes([]);
    setConfirmSavedRecoveryCodes(false);
    setPreTotpReauthPassword('');

    setShowSettingsModal(false);
    // setShowAccountModal(false);

    if (userTotpConfig?.enabled && userTotpConfig?.setupComplete) {
        // setShowSettingsModal(false);
        // setShowAccountModal(false);
        setTotpStep('manage');
        setShowTotpManagementModal(true);
    } else {
        // setShowSettingsModal(false);
        setShowPreTotpReauthModal(true);
    }

  };

  const handleStartTotpSetup = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email) {
          Alert.alert("Error", "User not logged in or email missing. Please re-login.");
          return;
      }
      setIsTotpLoading(true);
      try {
          const idToken = await currentUser.getIdToken();
          const response = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/generate-details?email=${encodeURIComponent(currentUser.email)}`, {
              method: 'GET',
              headers: {
                  'Authorization': `Bearer ${idToken}`
              }
          });

          const data = await response.json();
          if (response.ok) {
              setTotpSecret(data.secret);
              setTotpQrUri(data.otpauthUri);
              setTotpStep('setupQr');
          } else {
              Alert.alert("Error", data.error || "Could not generate TOTP secret.");
          }
      } catch (error) {
          // console.error("Error starting TOTP setup:", error);
          Alert.alert("Error", "Failed to connect to server for TOTP setup.");
      } finally {
          setIsTotpLoading(false);
      }
  };

  const handleVerifyAndEnableTotp = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.email || !totpSecret || !totpVerificationCode) {
          Alert.alert("Error", "User session, secret, or verification code missing. Please try again.");
          return;
      }
      setIsTotpLoading(true);
      try {
          const idToken = await currentUser.getIdToken();
          const response = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/verify-and-enable`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                  secret: totpSecret,
                  token: totpVerificationCode,
              }),
          });

          const data = await response.json();
          if (response.ok) {
              const db = getDatabase();
              const totpDataToSaveToDb = {
                  enabled: true,
                  setupComplete: true,
              };
              await set(ref(db, `users/${user.uid}/totp`), totpDataToSaveToDb);

              setUserTotpConfig(totpDataToSaveToDb);
              setPlainRecoveryCodes(data.recoveryCodes);
              setTotpStep('showRecovery');
              // Alert.alert("Success", "2FA enabled! Please save your recovery codes.");
          } else {
              Alert.alert("Verification Failed", data.error || "Invalid verification code.");
          }
      } catch (error) {
          // console.error("Error enabling TOTP:", error);
          Alert.alert("Error", "Failed to enable 2FA.");
      } finally {
          setIsTotpLoading(false);
      }
  };

  const handleFinishTotpSetup = async () => {
      if (!confirmSavedRecoveryCodes) {
          Alert.alert("Confirmation Needed", "Please confirm you have saved your recovery codes.");
          return;
      }

      if (auth.currentUser && currentDeviceId) {
          setIsTotpLoading(true);
          try {
              // console.log(`[2FA Enabled] Attempting to log out all other devices for user ${auth.currentUser.uid}, current device: ${currentDeviceId}`);
              await _callDeviceApi(
                  '/devices/logout/all-others',
                  'POST',
                  auth.currentUser,
                  { currentDeviceId }
              );
              Alert.alert(
                  "2FA Enabled & Devices Secured",
                  "Two-Factor Authentication is now active. All your other active sessions have been instructed to log out for enhanced security."
              );
          } catch (error: any) {
              // console.warn("[2FA Enabled] Failed to automatically log out other devices:", error.message);
              Alert.alert(
                  "2FA Enabled (Action Required)",
                  "Two-Factor Authentication is active, but we couldn't automatically log out your other sessions. Please review and log out other devices manually via Account Settings > Manage Devices for full security."
              );
          } finally {
              setIsTotpLoading(false);
          }
      } else {
          // console.warn("[2FA Enabled] User or currentDeviceId not available. Skipping automatic logout of other devices.");
          Alert.alert(
              "2FA Enabled (Action Recommended)",
              "Two-Factor Authentication is now active. For enhanced security, please review your active sessions in Account Settings > Manage Devices and log out any unrecognized devices."
          );
      }

      setShowTotpManagementModal(false);
      setTotpStep('initial');

      setTotpSecret('');
      setTotpQrUri('');
      setTotpVerificationCode('');
      setPlainRecoveryCodes([]);
      setConfirmSavedRecoveryCodes(false);
  };

  const promptReauthentication = (action) => {
      setReauthAction(action);
      setReauthPassword('');
      setShowTotpManagementModal(false);
      setShowReauthModal(true);
  };

  const handleReauthentication = async () => {
      if (!reauthPassword) {
          Alert.alert("Input Required", "Please enter your current password.");
          return;
      }
      if (!user || !user.email) {
          Alert.alert("Error", "User session error.");
          return;
      }
      setIsReauthenticating(true);
      Keyboard.dismiss();
      try {
          const credential = EmailAuthProvider.credential(user.email, reauthPassword);
          await reauthenticateWithCredential(user, credential);

          // setShowReauthModal(false);
          // setReauthPassword('');
          if (reauthAction === 'disableTotp') {
              setShowReauthModal(false);
              setReauthPassword('');
              await executeDisableTotp();
          } else if (reauthAction === 'regenerateRecovery') {
              setShowReauthModal(false);
              setReauthPassword('');

              setShowTotpManagementModal(true);
              setIsTotpLoading(true);
              await executeRegenerateRecoveryCodes();
          } else if (reauthAction === 'viewRecovery') {
              setShowReauthModal(false);
              setReauthPassword('');
              Alert.alert("Re-authenticated", "You can now manage recovery codes (e.g., regenerate).");
              setShowTotpManagementModal(true);
              setTotpStep('manage'); 
          }
      } catch (error) {
          // console.error("Reauthentication failed:", error);
          let message = "Reauthentication failed. Please check your password.";
          if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
              message = "Incorrect password.";
          }
          Alert.alert("Authentication Error", message);
      } finally {
          setIsReauthenticating(false);
          // setReauthAction(null);
      }
  };

  const handleReauthenticationFor2FASetup = async () => {
    if (!preTotpReauthPassword) {
        Alert.alert("Input Required", "Please enter your current password.");
        return;
    }
    if (!user || !user.email) {
        Alert.alert("Error", "User session error. Please log in again.");
        return;
    }
    setIsTotpLoading(true);
    Keyboard.dismiss();
    try {
        const credential = EmailAuthProvider.credential(user.email, preTotpReauthPassword);
        await reauthenticateWithCredential(user, credential);

        setShowPreTotpReauthModal(false);
        setPreTotpReauthPassword('');

        setTotpStep('initial');
        setShowTotpManagementModal(true);

    } catch (error) {
        // console.error("Reauthentication for 2FA setup failed:", error);
        let message = "Reauthentication failed. Please check your password.";
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "Incorrect password.";
        } else if (error.code === 'auth/too-many-requests') {
            message = "Too many failed attempts. Please try again later.";
        }
        Alert.alert("Authentication Error", message);
    } finally {
        setIsTotpLoading(false);
    }
  };


  const executeDisableTotp = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          Alert.alert("Error", "User session expired. Please log in again.");
          setIsTotpLoading(false);
          setShowTotpManagementModal(false);
          setReauthAction(null);
          return;
      }

      Alert.alert(
          "Confirm Disable 2FA",
          "Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.",
          [
              {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => {
                      setShowTotpManagementModal(true);
                      setTotpStep('manage');
                      setIsTotpLoading(false);
                      setReauthAction(null);
                  }
              },
              {
                  text: "Disable 2FA",
                  style: "destructive",
                  onPress: async () => {
                      const freshCurrentUser = auth.currentUser;
                      if (!freshCurrentUser) {
                          Alert.alert("Error", "User session expired. Please log in again.");
                          setIsTotpLoading(false);
                          setShowTotpManagementModal(false);
                          setReauthAction(null);
                          return;
                      }

                      setIsTotpLoading(true);
                      try {
                          const idToken = await freshCurrentUser.getIdToken();
                          const workerResponse = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/disable`, {
                              method: 'POST',
                              headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${idToken}`
                              },
                              body: JSON.stringify({})
                          });

                          const workerData = await workerResponse.json();

                          if (!workerResponse.ok || !workerData.success) {
                              // console.error("Worker error disabling TOTP:", workerData.error);
                              Alert.alert("Error Disabling 2FA", `Failed to disable 2FA on the server: ${workerData.error || 'Unknown server error'}. Please try again.`);
                              setIsTotpLoading(false);
                              setShowTotpManagementModal(true);
                              setTotpStep('manage');
                              setReauthAction(null);
                              return;
                          }

                          const db = getDatabase();
                          await remove(ref(db, `users/${freshCurrentUser.uid}/totp`));

                          setUserTotpConfig({ enabled: false, setupComplete: false });
                          setShowTotpManagementModal(false);
                          setTotpStep('initial');
                          Alert.alert("Success", "Two-Factor Authentication has been disabled.");

                      } catch (error) {
                          // console.error("Error disabling TOTP:", error);
                          Alert.alert("Error", `Failed to disable 2FA. An unexpected error occurred: ${error.message}`);
                      } finally {
                          setIsTotpLoading(false);
                          setReauthAction(null);
                      }
                  },
              },
          ],
          { cancelable: false }
      );
  };


  const executeRegenerateRecoveryCodes = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          console.warn("executeRegenerateRecoveryCodes called without a user.");
          Alert.alert("Error", "User session lost. Please log out and log back in.");
          setIsTotpLoading(false);
          setShowTotpManagementModal(false);
          setTotpStep('initial');
          setReauthAction(null);
          return;
      }
      try {
          const idToken = await currentUser.getIdToken();
          const response = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/regenerate-recovery`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${idToken}`
              },
              body: JSON.stringify({
                  // userId no longer sent
              })
          });

          const data = await response.json();
          if (response.ok) {
              setPlainRecoveryCodes(data.recoveryCodes);
              setConfirmSavedRecoveryCodes(false);
              setTotpStep('showRecovery');
              // setShowTotpManagementModal(true);
              // Alert.alert("Success", "New recovery codes generated. Please save them securely. Your old codes are now invalid.");
          } else {
              Alert.alert("Error", data.error || "Could not regenerate recovery codes.");
              setTotpStep('manage');
          }
      } catch (error) {
          // console.error("Error regenerating recovery codes:", error);
          Alert.alert("Error", "Failed to connect to server for regenerating codes.");
          setTotpStep('manage');
      } finally {
          setIsTotpLoading(false);
          setReauthAction(null);
      }
  };


  // DEVICE MANAGEMENT
  const getOrCreateDeviceId = async (): Promise<string> => {
    let deviceId = await AsyncStorage.getItem('app_device_id_v2');
    if (!deviceId) {
        deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        await AsyncStorage.setItem('app_device_id_v2', deviceId);
    }
    return deviceId;
  };

  useEffect(() => {
    const initDeviceId = async () => {
        try {
            const id = await getOrCreateDeviceId();
            setCurrentDeviceId(id);
            console.log("Device ID Initialized:", id);
        } catch (error) {
            console.error("Failed to initialize device ID:", error);
        }
    };
    initDeviceId();
  }, []);


  useEffect(() => {
      let heartbeatIntervalId: NodeJS.Timeout | null = null;

      const manageSessionAndHeartbeat = async () => {
          if (user && auth.currentUser && currentDeviceId) {
              console.log(`User ${user.uid} and Device ID ${currentDeviceId} present. Managing session and heartbeat.`);
              try {
                  await logDeviceSessionStart(currentDeviceId, auth.currentUser);

                  if (heartbeatIntervalId) {
                      clearInterval(heartbeatIntervalId);
                  }

                  heartbeatIntervalId = setInterval(async () => {
                      if (auth.currentUser && currentDeviceId) {
                          // console.log(`Heartbeat: User ${auth.currentUser.uid}, Device ${currentDeviceId}`);
                          await sendDeviceHeartbeat(currentDeviceId, auth.currentUser);
                      } else {
                          if (heartbeatIntervalId) {
                              // console.log("Clearing heartbeat interval (user or deviceId became null inside interval).");
                              clearInterval(heartbeatIntervalId);
                              heartbeatIntervalId = null;
                          }
                      }
                  }, 30 * 1000); // heart beat is 30 seconds... so remote session logout would be 30 seconds after. 4 minutes preferable in prod

              } catch (e) {
                  console.error("Error during initial logDeviceSessionStart in useEffect:", e);
              }
          } else {
              // console.log("User or Device ID not present. Skipping session/heartbeat setup.");
          }
      };

      manageSessionAndHeartbeat();

      // Cleanup function
      return () => {
          if (heartbeatIntervalId) {
              // console.log("Cleaning up heartbeat interval from useEffect unmount/dependency change.");
              clearInterval(heartbeatIntervalId);
              heartbeatIntervalId = null;
          }
      };
  }, [user, currentDeviceId, auth]); 

  const _callDeviceApi = async (endpoint: string, method: 'POST' | 'GET', currentUser: User, body?: any) => {
    if (!currentUser) throw new Error("User not authenticated for device API call.");
    const idToken = await currentUser.getIdToken();
    const userAgent = `${Platform.OS}/${Platform.Version} (${Application.applicationName}/${Application.nativeApplicationVersion})`;

    const response = await fetch(`${CLOUDFLARE_WORKER_DEVICES_URL}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      if (!response.ok) throw new Error(`Server error: ${response.status} ${response.statusText}`);
      throw new Error("Invalid JSON response from server.");
    }

    if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || `Device API Error: ${response.status}`;
        console.warn(`Device API call to ${endpoint} failed:`, errorMessage, responseData);
        if (response.status === 401 && (responseData.status === 'session_revoked_logout_all' || responseData.status === 'logged_out_remotely' || responseData.status === 'stale_session_logged_out')) {
            Alert.alert("Session Terminated", responseData.message || "Your session has been remotely terminated or has expired. Please log in again.");
            await signOut(auth);
        }
        throw new Error(errorMessage);
    }
    return responseData;
  };


  const logDeviceSessionStart = async (deviceId: string, currentUser: User) => {
    try {
        const userAgent = `${Platform.OS} ${Platform.Version} (${Application.applicationName}/${Application.nativeApplicationVersion})`;
        await _callDeviceApi('/devices/session-start', 'POST', currentUser, { deviceId, userAgent });
        // console.log('Device session started/updated.');
    } catch (error: any) {
        console.warn('Failed to log device session start:', error.message);
    }
  };

  const sendDeviceHeartbeat = async (deviceId: string, currentUser: User) => {
    try {
        await _callDeviceApi('/devices/heartbeat', 'POST', currentUser, { deviceId });
        // console.log('Device heartbeat sent.');
    } catch (error: any) {
        console.warn('Failed to send device heartbeat:', error.message);
    }
  };

  const fetchDeviceSessions = async () => {
    if (!auth.currentUser) return;
    setIsLoadingDeviceSessions(true);
    try {
        const data = await _callDeviceApi('/devices', 'GET', auth.currentUser);
        const sortedData = (data as DeviceSession[]).sort((a, b) => {
            if (a.deviceId === currentDeviceId) return -1;
            if (b.deviceId === currentDeviceId) return 1;
            return b.lastActive - a.lastActive;
        });

        // const mySession = sortedData.find(s => s.deviceId === currentDeviceId);
        // if (mySession && mySession.status === 'pending_logout') {
        //     console.log("My own session is pending_logout. Initiating immediate local logout.");
        //     Alert.alert("Session Terminated", "This session has been remotely logged out.");
        //     await signOut(auth);
        //     return;
        // }
        setDeviceSessions(sortedData);
    } catch (error: any) {
        Alert.alert('Error Fetching Devices', error.message || 'Could not load device list.');
        setDeviceSessions([]);
    } finally {
        setIsLoadingDeviceSessions(false);
    }
  };

  const openDeviceManagement = () => {
    setShowSettingsModal(false);
    setShowAccountModal(false);
    fetchDeviceSessions();
    setShowDeviceManagementModal(true);
  };

  const handleLogoutSpecificDevice = async (deviceIdToLogout: string) => {
    if (!auth.currentUser || !currentDeviceId) return;

    if (!(userTotpConfig?.enabled && userTotpConfig?.setupComplete)) {
      Alert.alert(
        "2FA Required",
        "Please enable Two-Factor Authentication from Account Settings to log out other devices."
      );
      return;
    }

    Alert.alert(
        "Confirm Logout",
        "Are you sure you want to log out this device session? The device will be signed out on its next activity check.",
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log Out Device", style: "destructive",
                onPress: async () => {
                    setIsLoadingDeviceSessions(true);
                    try {
                        await _callDeviceApi('/devices/logout/specific', 'POST', auth.currentUser!, { deviceIdToLogout, currentDeviceId });
                        Alert.alert("Logout Initiated", "The selected device session will be terminated shortly.");
                        fetchDeviceSessions();
                    } catch (error: any) {
                        Alert.alert("Logout Failed", error.message || "Could not log out the device.");
                    } finally {
                        setIsLoadingDeviceSessions(false);
                    }
                },
            },
        ]
    );
  };

  const handleLogoutAllOtherDevices = async () => {
    if (!auth.currentUser || !currentDeviceId) return;

    if (!(userTotpConfig?.enabled && userTotpConfig?.setupComplete)) {
      Alert.alert(
        "2FA Required",
        "Please enable Two-Factor Authentication from Account Settings to log out other devices."
      );
      return;
    }

      Alert.alert(
        "Confirm Logout All Others",
        "Are you sure you want to log out all other device sessions? This will not affect your current session. Other devices will be signed out on their next activity check.",
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "Log Out All Others", style: "destructive",
                onPress: async () => {
                    setIsLoadingDeviceSessions(true);
                    try {
                        await _callDeviceApi('/devices/logout/all-others', 'POST', auth.currentUser!, { currentDeviceId });
                        Alert.alert("Logout Initiated", "All other device sessions will be terminated shortly.");
                        fetchDeviceSessions();
                    } catch (error: any) {
                        Alert.alert("Logout Failed", error.message || "Could not log out other devices.");
                    } finally {
                        setIsLoadingDeviceSessions(false);
                    }
                },
            },
        ]
    );
  };

  const parseUserAgentForDisplay = (ua: string | null): { name: string, icon: string } => {
    if (!ua) return { name: "Unknown Device", icon: "help-circle-outline" };
    const lowerUa = ua.toLowerCase();
    if (lowerUa.includes("iphone") || lowerUa.includes("ipad")) return { name: "iOS Device", icon: "logo-apple" };
    if (lowerUa.includes("android")) return { name: "Android Device", icon: "logo-android" };
    if (lowerUa.includes("windows")) return { name: "Windows", icon: "desktop-outline" };
    if (lowerUa.includes("mac os") || lowerUa.includes("macos")) return { name: "macOS", icon: "laptop-outline" };
    if (lowerUa.includes("linux")) return { name: "Linux", icon: "desktop-outline" };
    if (lowerUa.includes("cfnetwork") || lowerUa.includes("dart")) return { name: `${Platform.OS} App`, icon: Platform.OS === 'ios' ? "logo-apple" : "logo-android" };
    return { name: "Unknown Web/App", icon: "globe-outline" };
  };

  const formatLastActiveTime = (timestamp: number): string => {
    if (!timestamp) return "N/A";
    const now = Date.now();
    const diffSeconds = Math.round((now - timestamp) / 1000);
    if (diffSeconds < 65) return "Just now";
    if (diffSeconds < 3600) return `${Math.round(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.round(diffSeconds / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };





  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading Pet Feeder...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>

      {/* Header */}
      <View style={styles.headerContainer}>
        <Icon name="paw" size={32} color={themeColors.primary} style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.settingsButton}>
            <Icon name="settings-sharp" size={28} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Dashboard Summary Card */}
      <View style={[styles.sectionCard, styles.summaryCard]}>
        <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
                <Icon name={feederOnline ? "checkmark-circle" : "alert-circle"} size={28} color={feederOnline ? themeColors.success : themeColors.danger} />
                <View style={{ flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={[styles.summaryText, { color: feederOnline ? themeColors.success : themeColors.danger }]}>
                        {feederOnline ? 'Feeder Online' : 'Feeder Offline'}
                    </Text>
                    {!feederOnline && (
                        <TouchableOpacity onPress={() => setShowTroubleshootModal(true)} style={styles.troubleshootButton}>
                            <Icon name="help-circle-outline" size={18} color={themeColors.textOnPrimary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View style={styles.summaryItem}>
                <Icon name="cube" size={28} color={currentFoodLevel < (hopperCapacity * 0.1) ? themeColors.warning : themeColors.accent} />
                <Text style={styles.summaryText}>
                    {currentFoodLevel}g / {hopperCapacity}g
                </Text>
                 <TouchableOpacity onPress={openUpdateFoodLevelModal} style={styles.inlineEditButton}>
                    <Icon name="pencil-outline" size={18} color={themeColors.primary} />
                </TouchableOpacity>
            </View>
        </View>
        <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
                <Icon name="time" size={28} color={themeColors.info} />
                <Text style={styles.summaryText}>Last: {lastFeedInfo}</Text>
            </View>
            <View style={styles.summaryItem}>
                <Icon name="hourglass" size={28} color={themeColors.primary} />
                <Text style={styles.summaryText} numberOfLines={2}>
                    Next: {nextScheduledFeedInfo.time} {nextScheduledFeedInfo.amount}
                </Text>
            </View>
        </View>
        {feederError !== "None" && (
            <View style={[styles.detailRow, { marginTop: 10, justifyContent: 'center'}]}>
                <Icon name="warning-outline" size={20} style={[styles.detailIcon, { color: themeColors.danger }]} />
                <Text style={[styles.infoTextLabel, styles.errorText]}>Feeder Alert: </Text>
                <Text style={[styles.infoTextValue, styles.errorText]}>{feederError}</Text>
            </View>
         )}
      </View>

      {/* Pet Details Card */}
      <View style={styles.sectionCard}>
         <View style={styles.sectionHeader}>
            <Icon name="heart-outline" size={24} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>Pet Details</Text>
            <TouchableOpacity onPress={openUpdateModal} style={styles.headerActionIcon}>
                <Icon name="create-outline" size={22} color={themeColors.primary} />
            </TouchableOpacity>
         </View>
         <View style={styles.detailRow}>
            <Icon name="paw-outline" size={20} style={styles.detailIcon} />
            <Text style={styles.infoTextLabel}>Name: </Text><Text style={styles.infoTextValue}>{petName}</Text>
         </View>
         <View style={styles.detailRow}>
            <Icon name="logo-octocat" size={20} style={styles.detailIcon} />
            <Text style={styles.infoTextLabel}>Type: </Text><Text style={styles.infoTextValue}>{petType}</Text>
         </View>
         <View style={styles.detailRow}>
            <Icon name="barbell-outline" size={20} style={styles.detailIcon} />
            <Text style={styles.infoTextLabel}>Weight: </Text><Text style={styles.infoTextValue}>{petWeight} kg</Text>
         </View>
         <TouchableOpacity style={[styles.actionButton, styles.viewNotesButton, {marginTop: 15}]} onPress={() => setShowPetNotesModal(true)}>
            <Icon name="document-text-outline" size={20} color={themeColors.primary} style={{ marginRight: 8 }}/>
            <Text style={[styles.buttonText, {color: themeColors.primary}]}>View/Add Pet Notes</Text>
        </TouchableOpacity>
      </View>

      {/* Feeding Control Card */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <Icon name="restaurant-outline" size={24} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>Manual Feed</Text>
            <TouchableOpacity style={styles.guideButton} onPress={() => setShowFeedingGuideModal(true)}>
                <Icon name="help-circle-outline" size={18} color={themeColors.primary} />
                <Text style={styles.guideButtonText}>Guide</Text>
            </TouchableOpacity>
        </View>
        <Text style={styles.infoText}>Recommended portion: <Text style={{fontWeight: 'bold'}}>{recommendedWeight}g</Text></Text>
        <TextInput
          style={styles.input}
          placeholder={`Enter amount (g), e.g. ${recommendedWeight !== 'N/A' ? recommendedWeight : '100'}`}
          placeholderTextColor={themeColors.textMuted}
          keyboardType="number-pad"
          value={manualWeight}
          onChangeText={handleManualWeightChange}
          maxLength={3}
        />
        <TouchableOpacity
            style={[
              styles.actionButton, styles.feedNowButton,
              (isFeeding || !feederOnline || (parseInt(manualWeight, 10) || 0) === 0 || (parseInt(manualWeight, 10) || 0) > currentFoodLevel) && styles.buttonDisabled
            ]}
            onPress={handleFeedNow}
            disabled={isFeeding || !feederOnline || (parseInt(manualWeight, 10) || 0) === 0 || (parseInt(manualWeight, 10) || 0) > currentFoodLevel}
        >
            {isFeeding ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Icon name="play-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }}/>
                  <Text style={styles.buttonText}>
                    Feed {manualWeight || '0'}g Now
                    {(parseInt(manualWeight, 10) || 0) > 0 && (parseInt(manualWeight, 10) || 0) > currentFoodLevel && " (Low Food!)"}
                  </Text>
                </>
            )}
        </TouchableOpacity>
      </View>

      {/* Schedule Section Card */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <Icon name="calendar-outline" size={24} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>Feeding Schedule</Text>
            <TouchableOpacity onPress={handleAddFeedingTime} disabled={isSaving} style={styles.headerActionIcon}>
              <Icon name="add-circle-outline" size={26} color={isSaving ? themeColors.textMuted : themeColors.primary}/>
            </TouchableOpacity>
        </View>
        {/* {isSaving && <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 10 }}/>} */}
        {schedules.length === 0 && !isLoading && !isSaving ? (
             <Text style={styles.emptyStateText}>No schedules yet. Tap '+' to add.</Text>
        ) : (
            <FlatList
              data={schedules}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const scheduledAmount = parseInt(item.weight, 10) || 0;
                const hasEnoughFood = currentFoodLevel >= scheduledAmount;
                const lowFoodWarningColor = themeColors.warningMutedPurple;

                return (
                    <View style={styles.scheduleItem}>
                        <Icon name="alarm-outline" size={24} color={item.isOn ? (hasEnoughFood ? themeColors.primary : lowFoodWarningColor) : themeColors.textMuted} style={styles.scheduleIcon} />
                        <View style={styles.scheduleInfo}>
                            <Text style={[styles.scheduleTime, !item.isOn && styles.scheduleTextDisabled, item.isOn && !hasEnoughFood && {color: lowFoodWarningColor }]}>{item.time}</Text>
                            <Text style={[styles.scheduleWeight, !item.isOn && styles.scheduleTextDisabled, item.isOn && !hasEnoughFood && {color: lowFoodWarningColor }]}>
                            {item.weight}g
                            {item.isOn && !hasEnoughFood && " (Low Food!)"}
                            </Text>
                        </View>
                        <View style={styles.scheduleControls}>
                            <Switch
                                trackColor={{ false: "#D1C4E9", true: hasEnoughFood ? themeColors.light : lowFoodWarningColor }}
                                thumbColor={item.isOn ? (hasEnoughFood ? themeColors.primary : lowFoodWarningColor) : "#f4f3f4"}
                                ios_backgroundColor="#E0E0E0"
                                onValueChange={() => toggleSchedule(item.id, scheduledAmount)}
                                value={item.isOn}
                                disabled={isSaving}
                                style={{ transform: [{ scaleX: .9 }, { scaleY: .9 }] }}
                            />
                            <TouchableOpacity onPress={() => deleteSchedule(item.id)} style={styles.deleteButton} disabled={isSaving}>
                                <Icon name="trash-bin-outline" size={22} color={isSaving ? themeColors.textMuted : themeColors.danger} />
                            </TouchableOpacity>
                        </View>
                    </View>
                );
              }}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.listItemSeparator} />}
            />
        )}
      </View>

      {/* Feeding History & Analytics Card */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
            <Icon name="analytics-outline" size={24} color={themeColors.primary} />
            <Text style={styles.sectionTitle}>History & Analytics</Text>
            <TouchableOpacity onPress={() => { setTempHistoryFilterConfig(historyFilterConfig); setShowHistoryFilterModal(true);}} style={styles.headerActionIcon}>
                <Icon name="filter-outline" size={22} color={themeColors.primary} />
            </TouchableOpacity>
        </View>

        {/* Chart */}
        {isLoadingHistory ? (
            <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 20 }} />
        ) : chartData.labels.length > 0 && chartData.labels[0] !== "No Data" ? (
          <>
            <Text style={styles.chartTitle}>{historyFilterConfig.type === 'all' ? 'Recent Daily Intake' : `Daily Intake (${historyFilterConfig.type.replace('last', 'Last ')})`}</Text>
            <LineChart
                data={chartData}
                width={Dimensions.get("window").width - 70}
                height={220}
                yAxisSuffix="g"
                yAxisInterval={1}
                segments={4}
                chartConfig={{
                    backgroundColor: themeColors.background,
                    backgroundGradientFrom: themeColors.background,
                    backgroundGradientTo: themeColors.background,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(${parseInt(themeColors.primary.slice(1,3),16)}, ${parseInt(themeColors.primary.slice(3,5),16)}, ${parseInt(themeColors.primary.slice(5,7),16)}, ${opacity})`,
                    labelColor: (opacity = 1) => themeColors.textSecondary,
                    style: { borderRadius: 16 },
                    propsForDots: { r: "5", strokeWidth: "1.5", stroke: themeColors.light },
                    propsForBackgroundLines: { stroke: themeColors.borderColor, strokeDasharray: "" },
                }}
                bezier
                style={styles.chartStyle}
            />
          </>
        ) : (
          !isLoadingHistory && <Text style={styles.emptyStateText}>Not enough data for chart.</Text>
        )}

        <Text style={[styles.subHeaderTitle, {marginTop: 20}]}>Recent Feedings (max 20 shown)</Text>
        {isLoadingHistory ? (
            <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 20 }} />
        ) : filteredFeedingHistory.length === 0 ? (
            <Text style={styles.emptyStateText}>No feeding history for selected period.</Text>
        ) : (
            <FlatList
                data={filteredFeedingHistory}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                        <Icon
                            name={item.type === 'manual' ? "hand-right-outline" : "sync-circle-outline"}
                            size={24}
                            color={item.type === 'manual' ? themeColors.accent : themeColors.info}
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


      {/* --- MODALS --- */}

      {showPicker && (
        <DateTimePicker
          value={selectedTime} mode="time" is24Hour={false} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeSelected}
          accentColor={Platform.OS === 'android' ? themeColors.primary : undefined}
        />
      )}

      {/* Feeding Guide Modal */}
      <Modal visible={showFeedingGuideModal} transparent={true} animationType="fade" onRequestClose={() => setShowFeedingGuideModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="book-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
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

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent={true} animationType="fade" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="settings-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Settings</Text>

            {/* 
            <TouchableOpacity style={styles.settingsMenuItem} onPress={openUpdateModal} disabled={isSaving}>
              <Icon name="paw-outline" size={22} style={styles.settingsMenuItemIcon} />
              <Text style={styles.settingsMenuItemText}>Update Pet Details</Text>
              <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
            </TouchableOpacity>
              */}
            <TouchableOpacity style={styles.settingsMenuItem} onPress={openAccountModal} disabled={isSaving}>
              <Icon name="person-circle-outline" size={22} style={styles.settingsMenuItemIcon} />
              <Text style={styles.settingsMenuItemText}>Account Settings</Text>
              <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
            </TouchableOpacity>

              {/* 
             <TouchableOpacity style={styles.settingsMenuItem} onPress={() => { setShowSettingsModal(false); openUpdateFoodLevelModal(); }} disabled={isSaving}>
              <Icon name="cube-outline" size={22} style={styles.settingsMenuItemIcon} />
              <Text style={styles.settingsMenuItemText}>Hopper Configuration</Text>
              <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
            </TouchableOpacity>
            */}

            <TouchableOpacity style={styles.settingsMenuItem} onPress={() => { setShowSettingsModal(false); setShowConnectFeederModal(true); }} disabled={isSaving}>
              <Icon name="wifi-outline" size={22} style={styles.settingsMenuItemIcon} />
              <Text style={styles.settingsMenuItemText}>Connect New Feeder</Text>
              <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingsMenuItem} onPress={handleLogout} disabled={isSaving}>
              <Icon name="log-out-outline" size={22} style={[styles.settingsMenuItemIcon, {color: themeColors.textPrimary}]} />
              <Text style={[styles.settingsMenuItemText, {color: themeColors.textPrimary}]}>Logout</Text>
            </TouchableOpacity>
            {isSaving && <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 15 }}/>}
            <TouchableOpacity style={[styles.modalButton, styles.modalCloseButton, {marginTop: 20}]} onPress={() => setShowSettingsModal(false)} disabled={isSaving}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account Settings Modal */}
      <Modal visible={showAccountModal} transparent={true} animationType="fade" onRequestClose={() => !isSaving && !isReauthenticatingForDelete && setShowAccountModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <TouchableOpacity style={styles.modalBackButton} onPress={() => { setShowAccountModal(false); setShowSettingsModal(true); }} disabled={isSaving || isReauthenticatingForDelete}>
                    <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
                </TouchableOpacity>
                <Icon name="person-circle-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
                <Text style={styles.modalTitle}>Account Settings</Text>
                <View style={styles.modalSection}>
                    <Text style={styles.modalSectionHeader}>Account Email</Text>
                    <View style={styles.accountEmailContainer}>
                        <Icon name="mail-outline" size={20} style={styles.accountEmailIcon} />
                        <Text style={styles.infoTextValueEmphasized}>{user ? user.email : 'N/A'}</Text>
                    </View>
                    {user && !user.emailVerified && (
                        <Text style={styles.verificationWarningText}>
                            <Icon name="alert-circle-outline" size={14} color={themeColors.warning} /> Email not verified
                        </Text>
                    )}
                </View>
                <TouchableOpacity style={styles.settingsMenuItem} onPress={openChangePasswordModal} disabled={isSaving}>
                    <Icon name="key-outline" size={22} style={styles.settingsMenuItemIcon} />
                    <Text style={styles.settingsMenuItemText}>Change Password</Text>
                    <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsMenuItem} onPress={openTotpManagement} disabled={isSaving || isTotpLoading}>
                  <Icon name={userTotpConfig?.enabled ? "shield-checkmark-outline" : "shield-outline"} size={22} style={styles.settingsMenuItemIcon} />
                  <Text style={styles.settingsMenuItemText}>
                    {userTotpConfig?.enabled ? "Manage 2FA" : "Enable 2FA"}
                  </Text>
                  <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingsMenuItem} onPress={openDeviceManagement} disabled={isSaving || isLoadingDeviceSessions}>
                  <Icon name="list-circle-outline" size={22} style={styles.settingsMenuItemIcon} />
                  <Text style={styles.settingsMenuItemText}>Manage Devices</Text>
                  <Icon name="chevron-forward-outline" size={22} style={styles.settingsMenuChevron} />
                </TouchableOpacity>

                <View style={styles.modalSection}>
                    <Text style={styles.modalSectionHeader}>Delete Account</Text>
                    <TouchableOpacity style={[styles.modalButton, styles.modalDeleteButton, (isSaving || isReauthenticatingForDelete) && styles.buttonDisabled]} onPress={handleDeleteAccount} disabled={isSaving}>
                        <Icon name="trash-bin-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.modalButtonText}>Delete Account Permanently</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalNoteSmall}>This action is irreversible.</Text>
                </View>
                {(isSaving || isReauthenticatingForDelete) && <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 15 }}/>}
            </View>
        </View>
      </Modal>

      {/* Reauthentication Modal for Account Deletion */}
      <Modal
        visible={showDeleteAccountReauthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isReauthenticatingForDelete) {
            setShowDeleteAccountReauthModal(false);
            setDeleteAccountReauthPassword('');
            setShowAccountModal(true);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!isReauthenticatingForDelete && (
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => {
                  setShowDeleteAccountReauthModal(false);
                  setDeleteAccountReauthPassword('');
                  setShowAccountModal(true);
                }}
                disabled={isReauthenticatingForDelete}
              >
                <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
              </TouchableOpacity>
            )}
            <Icon name="lock-closed-outline" size={30} color={themeColors.primary} style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Account Deletion</Text>
            <Text style={styles.modalText}>
              For your security, please enter your current password to proceed with deleting your account.
            </Text>

            {isReauthenticatingForDelete ? (
              <ActivityIndicator size="large" color={themeColors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInputText}
                    placeholder="Current Password"
                    placeholderTextColor={themeColors.textMuted}
                    value={deleteAccountReauthPassword}
                    onChangeText={setDeleteAccountReauthPassword}
                    secureTextEntry={true}
                    editable={!isReauthenticatingForDelete}
                    onSubmitEditing={handleReauthenticateForDeleteAccount}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalPrimaryButton,
                    // styles.modalDeleteButton,
                    (isReauthenticatingForDelete || !deleteAccountReauthPassword) && styles.buttonDisabled,
                  ]}
                  onPress={handleReauthenticateForDeleteAccount}
                  disabled={isReauthenticatingForDelete || !deleteAccountReauthPassword}
                >
                  <Text style={styles.modalButtonText}>Continue</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePasswordModal} transparent={true} animationType="fade" onRequestClose={() => !isChangingPassword && setShowChangePasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <TouchableOpacity style={styles.modalBackButton} onPress={() => setShowChangePasswordModal(false)} disabled={isChangingPassword}>
                <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
            </TouchableOpacity>
            <Icon name="lock-closed-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Change Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput style={styles.passwordInputText} placeholder="Current Password" placeholderTextColor={themeColors.textMuted} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={!showCurrentPassword} editable={!isChangingPassword}/>
              <TouchableOpacity style={styles.passwordToggleIcon} onPress={() => setShowCurrentPassword(!showCurrentPassword)}><Icon name={showCurrentPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#A06CD5" /></TouchableOpacity>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput style={styles.passwordInputText} placeholder="New Password" placeholderTextColor={themeColors.textMuted} value={newPassword} onChangeText={(t) => { setNewPassword(t); validateNewPassword(t, confirmNewPassword);}} secureTextEntry={!showNewPasswordInput} editable={!isChangingPassword}/>
              <TouchableOpacity style={styles.passwordToggleIcon} onPress={() => setShowNewPasswordInput(!showNewPasswordInput)}><Icon name={showNewPasswordInput ? "eye-outline" : "eye-off-outline"} size={22} color="#A06CD5" /></TouchableOpacity>
            </View>
            <View style={styles.passwordInputContainer}>
              <TextInput style={styles.passwordInputText} placeholder="Confirm New Password" placeholderTextColor={themeColors.textMuted} value={confirmNewPassword} onChangeText={(t) => { setConfirmNewPassword(t); validateNewPassword(newPassword, t);}} secureTextEntry={!showConfirmNewPassword} editable={!isChangingPassword}/>
              <TouchableOpacity style={styles.passwordToggleIcon} onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}><Icon name={showConfirmNewPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#A06CD5" /></TouchableOpacity>
            </View>
            {(newPassword.length > 0 || confirmNewPassword.length > 0) && (
              <View style={styles.passwordChecklistRow}>
                <View style={styles.passwordMinimalChecklist}>
                  {[
                    {met: newPassHasMinLength, icon: "text-outline"}, {met: newPassHasUpperCase, icon: "arrow-up-circle-outline"},
                    {met: newPassHasLowerCase, icon: "arrow-down-circle-outline"}, {met: newPassHasNumber, icon: "apps-outline"},
                    {met: newPassHasSpecialChar, icon: "code-slash-outline"}, {met: newPasswordsMatch && newPassword.length > 0, icon: "git-compare-outline"}
                  ].map((item, idx) => <Icon key={idx} name={item.met ? "checkmark-circle" : item.icon} size={18} color={item.met ? themeColors.success : themeColors.danger} style={styles.checklistItemIcon}/>)}
                </View>
                <TouchableOpacity onPress={() => setShowPasswordInfoModal(true)} style={styles.passwordInfoButton}><Icon name="information-circle-outline" size={22} color={themeColors.primary} /></TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton, (isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword || !(newPassHasMinLength && newPassHasUpperCase && newPassHasLowerCase && newPassHasNumber && newPassHasSpecialChar && newPasswordsMatch)) && styles.buttonDisabled]} onPress={handleChangePassword} disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword || !(newPassHasMinLength && newPassHasUpperCase && newPassHasLowerCase && newPassHasNumber && newPassHasSpecialChar && newPasswordsMatch)}>
                {isChangingPassword ? <ActivityIndicator size="small" color="#fff" /> : <><Icon name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.modalButtonText}>Update Password</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Show Password Info Modal */}
      <Modal visible={showPasswordInfoModal} transparent={true} animationType="fade" onRequestClose={() => setShowPasswordInfoModal(false)}>
        <TouchableOpacity style={styles.passwordInfoModalOverlay} activeOpacity={1} onPressOut={() => setShowPasswordInfoModal(false)}>
            <View style={styles.passwordInfoModalContent} onStartShouldSetResponder={() => true}>
                <Text style={styles.passwordInfoModalTitle}>Password Must Contain:</Text>
                {[
                    {text: "At least 6 characters", icon: "text-outline"}, {text: "An uppercase letter (A-Z)", icon: "arrow-up-circle-outline"},
                    {text: "A lowercase letter (a-z)", icon: "arrow-down-circle-outline"}, {text: "A number (0-9)", icon: "apps-outline"},
                    {text: "A special character (e.g., !@#$%)", icon: "code-slash-outline"}, {text: "New passwords must match", icon: "git-compare-outline"}
                ].map(item => (
                    <View key={item.text} style={styles.passwordInfoItem}><Icon name={item.icon} size={18} color={themeColors.textSecondary} style={styles.passwordInfoIcon} /><Text style={styles.passwordInfoText}>{item.text}</Text></View>
                ))}
                <TouchableOpacity style={[styles.modalButton, styles.modalCloseButton, {marginTop: 15, width: '80%', alignSelf: 'center'}]} onPress={() => setShowPasswordInfoModal(false)}><Text style={styles.modalButtonText}>Got it</Text></TouchableOpacity>
            </View>
        </TouchableOpacity>
      </Modal>

      {/* Update Pet Details Modal */}
      <Modal visible={showUpdatePetModal} transparent={true} animationType="fade" onRequestClose={() => { if (!isSaving) { setShowUpdatePetModal(false); /*setShowSettingsModal(true);*/ } }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalBackButton} onPress={() => { setShowUpdatePetModal(false); /*setShowSettingsModal(true);*/ }} disabled={isSaving}>
              <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
          </TouchableOpacity>
            <Icon name="create-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Update Pet Details</Text>
            <TextInput style={styles.modalInput} placeholder="Pet Name" placeholderTextColor={themeColors.textMuted} value={tempPetDetails.name} onChangeText={(text) => setTempPetDetails({ ...tempPetDetails, name: text })} autoCapitalize="words" maxLength={20} editable={!isSaving}/>
          <Text style={styles.modalLabel}>Pet Type:</Text>
          <View style={styles.petTypeSelectionContainer}>
              <TouchableOpacity style={[ styles.petTypeButton, tempPetDetails.type === 'Dog' && styles.petTypeButtonSelected ]} onPress={() => setTempPetDetails({ ...tempPetDetails, type: 'Dog' })} disabled={isSaving}>
                  <Icon name="logo-octocat" size={20} style={[styles.petTypeIcon, tempPetDetails.type === 'Dog' && styles.petTypeIconSelected]} />{/* Replace with dog icon */}
                  <Text style={[ styles.petTypeButtonText, tempPetDetails.type === 'Dog' && styles.petTypeButtonTextSelected ]}>Dog</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[ styles.petTypeButton, tempPetDetails.type === 'Cat' && styles.petTypeButtonSelected ]} onPress={() => setTempPetDetails({ ...tempPetDetails, type: 'Cat' })} disabled={isSaving}>
                    <Icon name="logo-gitlab" size={20} style={[styles.petTypeIcon, tempPetDetails.type === 'Cat' && styles.petTypeIconSelected]} />{/* Replace with cat icon */}
                    <Text style={[ styles.petTypeButtonText, tempPetDetails.type === 'Cat' && styles.petTypeButtonTextSelected ]}>Cat</Text>
              </TouchableOpacity>
          </View>
          <TextInput style={styles.modalInput} placeholder="Pet Weight (kg)" placeholderTextColor={themeColors.textMuted} keyboardType="decimal-pad" value={tempPetDetails.weight} onChangeText={handleTempWeightChange} editable={!isSaving}/>
            <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton, isSaving && styles.buttonDisabled]} onPress={handleSaveChanges} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <><Icon name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.modalButtonText}>Save Changes</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Hopper Configuration Modal */}
      <Modal visible={showUpdateFoodLevelModal} transparent={true} animationType="fade" onRequestClose={() => !isSaving && setShowUpdateFoodLevelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalBackButton} onPress={() => setShowUpdateFoodLevelModal(false)} disabled={isSaving}>
                <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
            </TouchableOpacity>
            <Icon name="cube-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Hopper Configuration</Text>
            <Text style={styles.modalLabel}>Current Food in Hopper (grams):</Text>
            <TextInput style={styles.modalInput} placeholder={`e.g., ${currentFoodLevel}`} placeholderTextColor={themeColors.textMuted} keyboardType="number-pad" value={tempInputFoodLevel} onChangeText={(text) => setTempInputFoodLevel(text.replace(/[^0-9]/g, ''))} editable={!isSaving} maxLength={5}/>
            <View style={styles.addGramsContainer}>
                <TextInput style={[styles.modalInput, styles.addGramsInput]} placeholder="Add grams" placeholderTextColor={themeColors.textMuted} keyboardType="number-pad" value={gramsToAdd} onChangeText={(text) => setGramsToAdd(text.replace(/[^0-9]/g, ''))} editable={!isSaving} maxLength={4}/>
                <TouchableOpacity style={[styles.addGramsButton, (isSaving || !gramsToAdd || (parseInt(gramsToAdd, 10) || 0) <= 0) && styles.buttonDisabled]} onPress={handleAddGramsToHopper} disabled={isSaving || !gramsToAdd || (parseInt(gramsToAdd, 10) || 0) <= 0}>
                    <Icon name="add-circle-outline" size={20} color="#fff" style={{marginRight: 5}}/><Text style={styles.addGramsButtonText}>Add</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.modalLabel}>Total Hopper Capacity (grams):</Text>
            <TextInput style={styles.modalInput} placeholder={`e.g., ${hopperCapacity}`} placeholderTextColor={themeColors.textMuted} keyboardType="number-pad" value={tempInputHopperCapacity} onChangeText={(text) => setTempInputHopperCapacity(text.replace(/[^0-9]/g, ''))} editable={!isSaving} maxLength={5}/>
            <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton, {marginTop: 20}, isSaving && styles.buttonDisabled]} onPress={handleSaveFoodLevel} disabled={isSaving}>
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <><Icon name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} /><Text style={styles.modalButtonText}>Save Levels</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pet Notes Modal */}
      <Modal visible={showPetNotesModal} transparent={true} animationType="fade" onRequestClose={() => { setCurrentNoteText(''); setEditingNote(null); setShowPetNotesModal(false); }}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {maxHeight: '80%'}]}>
                 <TouchableOpacity style={styles.modalBackButton} onPress={() => { setCurrentNoteText(''); setEditingNote(null); setShowPetNotesModal(false);}} disabled={isSavingNote}>
                    <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
                </TouchableOpacity>
                <Icon name="document-text-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
                <Text style={styles.modalTitle}>{editingNote ? "Edit Note" : "Pet Notes"}</Text>
                {isLoadingNotes ? <ActivityIndicator /> : (
                    <FlatList
                        data={petNotes}
                        keyExtractor={(item) => item.id}
                        renderItem={({item}) => (
                            <View style={styles.noteItem}>
                                <View style={styles.noteTextContainer}>
                                    <Text style={styles.noteText}>{item.text}</Text>
                                    <Text style={styles.noteTimestamp}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                                </View>
                                <View style={styles.noteActions}>
                                    <TouchableOpacity onPress={() => openEditPetNote(item)} style={styles.noteActionButton}>
                                        <Icon name="create-outline" size={20} color={themeColors.accent} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeletePetNote(item.id)} style={styles.noteActionButton}>
                                        <Icon name="trash-outline" size={20} color={themeColors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={<Text style={styles.emptyStateText}>No notes yet. Add one below!</Text>}
                        style={{width: '100%', maxHeight: Dimensions.get('window').height * 0.3}}
                        ItemSeparatorComponent={() => <View style={styles.listItemSeparatorThin} />}
                    />
                )}
                <View style={styles.noteTextInputContainer}>
                    <TextInput
                        style={[styles.modalInput, {marginTop: 15, height: 80, marginBottom: 2}]}
                        placeholder={editingNote ? "Edit note..." : "Add a new note..."}
                        placeholderTextColor={themeColors.textMuted}
                        value={currentNoteText}
                        onChangeText={setCurrentNoteText}
                        multiline
                        textAlignVertical="top"
                        editable={!isSavingNote}
                        maxLength={100}
                    />
                    <Text style={styles.noteCharCounter}>
                        {currentNoteText.length}/100
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.modalButton, styles.modalPrimaryButton, (isSavingNote || !currentNoteText.trim()) && styles.buttonDisabled]}
                    onPress={handleSavePetNote}
                    disabled={isSavingNote || !currentNoteText.trim()}
                >
                    {isSavingNote ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalButtonText}>{editingNote ? "Update Note" : "Add Note"}</Text>}
                </TouchableOpacity>
                {editingNote && (
                    <TouchableOpacity
                        style={[styles.modalButton, styles.modalSecondaryButton]}
                        onPress={() => { setEditingNote(null); setCurrentNoteText(''); }}
                        disabled={isSavingNote}
                    >
                        <Text style={[styles.modalButtonText, {color: themeColors.primary}]}>Cancel Edit</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
      </Modal>

      {/* History Filter Modal */}
      <Modal visible={showHistoryFilterModal} transparent={true} animationType="fade" onRequestClose={() => setShowHistoryFilterModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <TouchableOpacity style={styles.modalBackButton} onPress={() => setShowHistoryFilterModal(false)}>
                    <Icon name="close-outline" size={28} color={themeColors.primary} />
                </TouchableOpacity>
                <Icon name="filter-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
                <Text style={styles.modalTitle}>Filter History</Text>

                <TouchableOpacity style={styles.filterOptionButton} onPress={() => setTempHistoryFilterConfig({ type: 'all', startDate: null, endDate: null })}>
                    <Text style={[styles.filterOptionText, tempHistoryFilterConfig.type === 'all' && styles.filterOptionTextSelected]}>All Time</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterOptionButton} onPress={() => setTempHistoryFilterConfig({ type: 'last7days', startDate: null, endDate: null })}>
                    <Text style={[styles.filterOptionText, tempHistoryFilterConfig.type === 'last7days' && styles.filterOptionTextSelected]}>Last 7 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterOptionButton} onPress={() => setTempHistoryFilterConfig({ type: 'last30days', startDate: null, endDate: null })}>
                    <Text style={[styles.filterOptionText, tempHistoryFilterConfig.type === 'last30days' && styles.filterOptionTextSelected]}>Last 30 Days</Text>
                </TouchableOpacity>

                <Text style={[styles.modalLabel, {marginTop: 15, alignSelf: 'center'}]}>Custom Range</Text>
                <View style={styles.datePickerRow}>
                    <TouchableOpacity style={styles.datePickerInput} onPress={() => setShowHistoryStartDatePicker(true)}>
                        <Text style={styles.datePickerText}>{tempHistoryFilterConfig.startDate ? tempHistoryFilterConfig.startDate.toLocaleDateString() : "Start Date"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.datePickerInput} onPress={() => setShowHistoryEndDatePicker(true)}>
                        <Text style={styles.datePickerText}>{tempHistoryFilterConfig.endDate ? tempHistoryFilterConfig.endDate.toLocaleDateString() : "End Date"}</Text>
                    </TouchableOpacity>
                </View>
                {tempHistoryFilterConfig.startDate && tempHistoryFilterConfig.endDate && tempHistoryFilterConfig.startDate > tempHistoryFilterConfig.endDate && (
                    <Text style={styles.errorTextSmall}>Start date cannot be after end date.</Text>
                )}


                {showHistoryStartDatePicker && (
                    <DateTimePicker
                        value={tempHistoryFilterConfig.startDate || new Date()}
                        mode="date" display="default"
                        onChange={(e,d) => onHistoryDateChange(e,d,'start')}
                        maximumDate={tempHistoryFilterConfig.endDate || new Date()}
                    />
                )}
                {showHistoryEndDatePicker && (
                    <DateTimePicker
                        value={tempHistoryFilterConfig.endDate || new Date()}
                        mode="date" display="default"
                        onChange={(e,d) => onHistoryDateChange(e,d,'end')}
                        minimumDate={tempHistoryFilterConfig.startDate}
                        maximumDate={new Date()}
                    />
                )}
                <TouchableOpacity
                    style={[styles.modalButton, styles.modalPrimaryButton, {marginTop: 20}, (tempHistoryFilterConfig.startDate && tempHistoryFilterConfig.endDate && tempHistoryFilterConfig.startDate > tempHistoryFilterConfig.endDate) && styles.buttonDisabled]}
                    onPress={handleApplyHistoryFilter}
                    disabled={(tempHistoryFilterConfig.startDate && tempHistoryFilterConfig.endDate && tempHistoryFilterConfig.startDate > tempHistoryFilterConfig.endDate)}
                >
                    <Text style={styles.modalButtonText}>Apply Filter</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* Re-authentication Modal */}
      <Modal visible={showReauthModal} transparent={true} animationType="fade" onRequestClose={() => !isReauthenticating && setShowReauthModal(false)}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <TouchableOpacity style={styles.modalBackButton} 
                    onPress={() => {
                          setShowReauthModal(false);
                          setReauthPassword('');
                          setReauthAction(null);
                          if (userTotpConfig?.enabled && userTotpConfig?.setupComplete) {
                              setTotpStep('manage');
                              setShowTotpManagementModal(true);
                          } else {
                              setShowAccountModal(true);
                          }
                      }}
                      disabled={isReauthenticating}>
                      <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
                  </TouchableOpacity>
                  <Icon name="lock-closed-outline" size={30} color={themeColors.primary} style={{ marginBottom: 10 }} />
                  <Text style={styles.modalTitle}>Re-authenticate</Text>
                  <Text style={styles.modalText}>Please enter your current password to continue.</Text>
                  <View style={styles.passwordInputContainer}>
                      <TextInput
                          style={styles.passwordInputText}
                          placeholder="Current Password"
                          placeholderTextColor={themeColors.textMuted}
                          value={reauthPassword}
                          onChangeText={setReauthPassword}
                          secureTextEntry={true}
                          editable={!isReauthenticating}
                      />
                  </View>
                  <TouchableOpacity
                      style={[styles.modalButton, styles.modalPrimaryButton, isReauthenticating && styles.buttonDisabled]}
                      onPress={handleReauthentication}
                      disabled={isReauthenticating || !reauthPassword}
                  >
                      {isReauthenticating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalButtonText}>Continue</Text>}
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>


      {/* TOTP Management Modal */}
      <Modal
      visible={showTotpManagementModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
          if (isTotpLoading) return;
          if (totpStep === 'showRecovery') {
              Alert.alert(
                  "Action Required",
                  "Please confirm you have saved your recovery codes and then tap 'Done'.",
                  [{ text: "OK" }]
              );
              return;
          }

          if (totpStep === 'manage') {
            setShowTotpManagementModal(false);
            setTotpStep('initial');
            // setShowAccountModal(true);
            return;
          }

          setShowTotpManagementModal(false);
          setTotpStep('initial');

      }}
      >
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, {minHeight: 300}]}>
                  {!isTotpLoading && totpStep !== 'showRecovery' && (
                      <TouchableOpacity
                          style={styles.modalBackButton}
                          onPress={() => {
                              if (totpStep === 'manage') {
                                setShowTotpManagementModal(false);
                                setTotpStep('initial');
                                // setShowAccountModal(true);
                              } else {
                                setShowTotpManagementModal(false);
                                setTotpStep('initial');
                              }

                          }}
                          // disabled={isTotpLoading}
                      >
                           <Icon
                  name={totpStep === 'manage' ? "arrow-back-outline" : "close-outline"}
                  size={totpStep === 'manage' ? 24 : 28}
                  color={themeColors.primary}
                />
                      </TouchableOpacity>
                  )}
                  <Icon name="shield-checkmark-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
                  <Text style={styles.modalTitle}>Two-Factor Authentication</Text>

                  {isTotpLoading && <ActivityIndicator size="large" color={themeColors.primary} style={{marginVertical: 20}}/>}

                  {!isTotpLoading && totpStep === 'initial' && (
                      <>
                          <Text style={styles.modalText}>
                              Protect your account by enabling Two-Factor Authentication (2FA).
                              You'll use an authenticator app (like Google Authenticator, Authy, etc.)
                              to generate a unique code each time you log in.
                          </Text>
                          <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton]} onPress={handleStartTotpSetup}>
                              <Text style={styles.modalButtonText}>Start 2FA Setup</Text>
                          </TouchableOpacity>
                      </>
                  )}

                  {!isTotpLoading && totpStep === 'setupQr' && (
                      <>
                          <Text style={styles.modalText}>Scan this QR code with your authenticator app:</Text>
                          {totpQrUri ? (
                              <View style={{ alignItems: 'center', marginVertical: 15, padding:10, backgroundColor: 'white', borderWidth:1, borderColor: themeColors.borderColor }}>
                                  <QRCode value={totpQrUri} size={180} backgroundColor="white" color="black"/>
                              </View>
                          ) : <Text>Loading QR Code...</Text>}
                          <Text style={styles.modalText}>Or, manually enter this key: <Text style={{fontWeight: 'bold'}}>{totpSecret}</Text></Text>
                          <Text style={styles.modalText}>Enter the 6-digit code from your app below:</Text>
                          <TextInput
                              style={styles.modalInput}
                              placeholder="Verification Code (e.g., 123456)"
                              placeholderTextColor={themeColors.textMuted}
                              value={totpVerificationCode}
                              onChangeText={setTotpVerificationCode}
                              keyboardType="number-pad"
                              maxLength={6}
                          />
                          <TouchableOpacity
                              style={[styles.modalButton, styles.modalPrimaryButton, (!totpVerificationCode || totpVerificationCode.length !== 6) && styles.buttonDisabled]}
                              onPress={handleVerifyAndEnableTotp}
                              disabled={!totpVerificationCode || totpVerificationCode.length !== 6}
                          >
                              <Text style={styles.modalButtonText}>Verify & Enable 2FA</Text>
                          </TouchableOpacity>
                      </>
                  )}

                  {!isTotpLoading && totpStep === 'showRecovery' && (
                      <ScrollView style={{width: '100%', maxHeight: Dimensions.get('window').height * 0.5}}>
                          <Text style={[styles.modalText, {color: themeColors.danger, fontWeight: 'bold'}]}>
                              IMPORTANT: Save these recovery codes in a safe place.
                          </Text>
                          <Text style={styles.modalText}>
                              If you lose access to your authenticator app, these codes are the ONLY way to regain access to your account. Each code can only be used once.
                          </Text>
                          <View style={styles.recoveryCodesContainer}>
                              {plainRecoveryCodes.map((code, index) => (
                                  <Text key={index} style={styles.recoveryCodeItem}>{code}</Text>
                              ))}
                          </View>
                          <View style={styles.checkboxContainer}>
                              <Switch
                                  value={confirmSavedRecoveryCodes}
                                  onValueChange={setConfirmSavedRecoveryCodes}
                                  trackColor={{ false: "#D1C4E9", true: themeColors.light }}
                                  thumbColor={confirmSavedRecoveryCodes ? themeColors.primary : "#f4f3f4"}
                              />
                              <Text style={styles.checkboxLabel}>I have saved these codes securely.</Text>
                          </View>
                          <TouchableOpacity
                              style={[styles.modalButton, styles.modalPrimaryButton, !confirmSavedRecoveryCodes && styles.buttonDisabled]}
                              onPress={handleFinishTotpSetup}
                              disabled={!confirmSavedRecoveryCodes}
                          >
                              <Text style={styles.modalButtonText}>Done</Text>
                          </TouchableOpacity>
                      </ScrollView>
                  )}
                  
                  {!isTotpLoading && totpStep === 'manage' && userTotpConfig?.enabled && (
                      <>
                          <Text style={[styles.modalText, {textAlign: 'center', marginBottom: 20, color: themeColors.success, fontWeight: 'bold'}]}>
                              Two-Factor Authentication is currently ENABLED.
                          </Text>
                          <TouchableOpacity
                              style={[styles.modalButton, {backgroundColor: themeColors.info, marginBottom: 10}]}
                              onPress={() => {
                                setShowTotpManagementModal(false);
                                promptReauthentication('regenerateRecovery');
                              }}

                          >
                              <Icon name="refresh-circle-outline" size={20} color="#fff" style={{marginRight: 8}}/>
                              <Text style={styles.modalButtonText}>Regenerate Recovery Codes</Text>
                          </TouchableOpacity>
                          <Text style={styles.modalNoteSmall}>This will invalidate your old recovery codes. Requires password re-authentication.</Text>


                          <TouchableOpacity
                              style={[styles.modalButton, styles.modalDeleteButton, {marginTop: 20}]}
                              onPress={() => {
                                setShowTotpManagementModal(false);
                                promptReauthentication('disableTotp');
                              }}
                          >
                              <Icon name="shield-outline" size={20} color="#fff" style={{marginRight: 8}}/>
                              <Text style={styles.modalButtonText}>Disable 2FA</Text>
                          </TouchableOpacity>
                          <Text style={styles.modalNoteSmall}>Requires password re-authentication.</Text>
                      </>
                  )}

              </View>
          </View>
      </Modal>

      {/* Pre-TOTP Re-authentication Modal */}
      <Modal
        visible={showPreTotpReauthModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isTotpLoading) {
            setShowPreTotpReauthModal(false);
            setPreTotpReauthPassword('');
            // setShowAccountModal(true);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!isTotpLoading && (
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => {
                  setShowPreTotpReauthModal(false);
                  setPreTotpReauthPassword('');
                  // setShowAccountModal(true);
                }}
              >
                <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
              </TouchableOpacity>
            )}
            <Icon name="lock-closed-outline" size={30} color={themeColors.primary} style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Confirm Your Identity</Text>
            <Text style={styles.modalText}>
              For your security, please enter your current password to begin setting up Two-Factor Authentication.
            </Text>

            {isTotpLoading ? (
              <ActivityIndicator size="large" color={themeColors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInputText}
                    placeholder="Current Password"
                    placeholderTextColor={themeColors.textMuted}
                    value={preTotpReauthPassword}
                    onChangeText={setPreTotpReauthPassword}
                    secureTextEntry={true}
                    editable={!isTotpLoading}
                    onSubmitEditing={handleReauthenticationFor2FASetup}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalPrimaryButton,
                    (isTotpLoading || !preTotpReauthPassword) && styles.buttonDisabled,
                  ]}
                  onPress={handleReauthenticationFor2FASetup}
                  disabled={isTotpLoading || !preTotpReauthPassword}
                >
                  <Text style={styles.modalButtonText}>Continue to 2FA Setup</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Device Management Modal */}
      <Modal visible={showDeviceManagementModal} transparent={true} animationType="fade" onRequestClose={() => !isLoadingDeviceSessions && setShowDeviceManagementModal(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '85%', minWidth: '95%'}]}>
                <TouchableOpacity style={styles.modalBackButton} onPress={() => { setShowDeviceManagementModal(false); setShowAccountModal(true); }} disabled={isLoadingDeviceSessions}>
                    <Icon name="arrow-back-outline" size={24} color={themeColors.primary} />
                </TouchableOpacity>
                <Icon name="list-circle-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
                <Text style={styles.modalTitle}>Active Devices</Text>

                {isLoadingDeviceSessions ? (
                    <ActivityIndicator size="large" color={themeColors.primary} style={{marginVertical: 20}} />
                ) : deviceSessions.length === 0 ? (
                    <Text style={styles.emptyStateText}>No other active device sessions found.</Text>
                ) : (
                    <FlatList
                        data={deviceSessions}
                        keyExtractor={(item) => item.deviceId}
                        style={{width: '100%', marginBottom: 15}}
                        ItemSeparatorComponent={() => <View style={styles.listItemSeparatorThin} />}
                        renderItem={({ item }) => {
                          const deviceInfo = parseUserAgentForDisplay(item.userAgent);
                          const isCurrent = item.deviceId === currentDeviceId;
                          const isActiveNow = item.status === 'active' && (Date.now() - item.lastActive) < (65 * 1000);

                          let statusTextComponent = null;
                          if (isCurrent) {
                              if (item.status !== 'logged_out') {
                                  statusTextComponent = <Text style={{color: themeColors.success, fontWeight: 'bold'}}>(Current)</Text>;
                              } else {
                                  statusTextComponent = <Text style={{color: themeColors.textMuted, fontStyle: 'italic'}}>(Logged Out)</Text>;
                              }
                          } else {
                              if (item.status === 'pending_logout') {
                                  statusTextComponent = <Text style={{color: themeColors.warning, fontStyle: 'italic'}}>(Logging out...)</Text>;
                              } else if (item.status === 'logged_out') {
                                  statusTextComponent = <Text style={{color: themeColors.textMuted, fontStyle: 'italic'}}>(Logged Out)</Text>;
                              }
                          }

                          let iconColor = themeColors.accent;
                          if (isCurrent && item.status !== 'logged_out') {
                              iconColor = themeColors.success;
                          } else if (item.status === 'logged_out') {
                              iconColor = themeColors.textMuted;
                          } else if (item.status === 'pending_logout') {
                              iconColor = themeColors.warning;
                          }

                          return (
                            <View style={styles.deviceItemContainer}>
                              <Icon
                                  name={deviceInfo.icon}
                                  size={30}
                                  color={iconColor}
                                  style={styles.deviceItemIcon}
                              />
                              <View style={styles.deviceItemInfo}>
                                  <Text style={styles.deviceItemName}>
                                      {deviceInfo.name}{' '}
                                      {statusTextComponent}
                                  </Text>
                                  <Text style={styles.deviceItemDetail}>Location: {item.country || 'N/A'}</Text>
                                  <Text style={styles.deviceItemDetail}>IP: {item.ipAddress || 'N/A'}</Text>
                                  <Text style={styles.deviceItemDetail}>
                                      Last Active: {formatLastActiveTime(item.lastActive)}
                                      {isActiveNow && !isCurrent && item.status === 'active' && <Text style={{color: themeColors.success, fontSize: 12}}> (Online)</Text>}
                                  </Text>

                                  {item.deviceId &&
                                    <TouchableOpacity onPress={() => { Clipboard.setString(item.deviceId); Alert.alert("Device ID Copied", item.deviceId);}}>
                                        <Text style={styles.deviceIdText}>ID: {item.deviceId.substring(0,8)}...</Text>
                                    </TouchableOpacity>
                                  }
                              </View>

                              {!isCurrent && item.status === 'active' && (
                                  <TouchableOpacity onPress={() => handleLogoutSpecificDevice(item.deviceId)} style={styles.deviceItemLogoutButton} disabled={isLoadingDeviceSessions}>
                                      <Icon name="log-out-outline" size={24} color={themeColors.danger} />
                                  </TouchableOpacity>
                              )}
                          </View>
                          );
                        }}
                    />
                )}

                {deviceSessions.filter(ds => ds.deviceId !== currentDeviceId && ds.status === 'active').length > 0 && (
                    <TouchableOpacity style={[styles.modalButton, styles.modalDeleteButton, { marginTop: 10, marginBottom: 5, backgroundColor: themeColors.warning }]} onPress={handleLogoutAllOtherDevices} disabled={isLoadingDeviceSessions}>
                        <Icon name="nuclear-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.modalButtonText}>Log Out All Other Devices</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
      </Modal>

      <Modal visible={showConnectFeederModal} transparent={true} animationType="fade" onRequestClose={() => setShowConnectFeederModal(false)}>
          <ConnectFeederModal onClose={() => setShowConnectFeederModal(false)} />
      </Modal>

      {/* Troubleshooting Modal */}
      <Modal visible={showTroubleshootModal} transparent={true} animationType="fade" onRequestClose={() => setShowTroubleshootModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="build-outline" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
            <Text style={styles.modalTitle}>Feeder Offline</Text>
            <Text style={styles.modalText}>Please check the following:</Text>
            <View style={styles.troubleshootList}>
                <Text style={styles.troubleshootItem}>1. Is the feeder plugged in and powered on?</Text>
                <Text style={styles.troubleshootItem}>2. Is your home WiFi network working correctly?</Text>
                <Text style={[styles.troubleshootItem, {fontWeight: 'bold'}]}>3. Did you recently change your account password?</Text>
            </View>
            <Text style={styles.modalNote}>If you changed your password or WiFi, you must re-connect the feeder to update its credentials.</Text>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalPrimaryButton]} 
              onPress={() => {
                setShowTroubleshootModal(false);
                setShowConnectFeederModal(true);
              }}
            >
              <Icon name="wifi-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.modalButtonText}>Re-Connect Feeder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.modalCloseButton]} onPress={() => setShowTroubleshootModal(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
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
  success: '#28A745', // green
  danger: '#DC3545',  // red
  warning: '#FFC107', // yellow
  info: '#17A2B8',    // teal/blue
  warningMutedPurple: '#A98BBD',
  successLight: '#D4EDDA',
  totpModalBackground: '#FFFFFF', 
};

const styles = StyleSheet.create({
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
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 10,
  },
  headerIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: themeColors.primary,
    flex: 1,
  },
  settingsButton: {
    padding: 8,
  },
  sectionCard: {
    backgroundColor: themeColors.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryCard: {
    backgroundColor: themeColors.light,
    paddingVertical: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  summaryText: {
    fontSize: 13,
    color: themeColors.textOnPrimary,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  inlineEditButton: {
    position: 'absolute',
    right: 0,
    top: -5,
    padding: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
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
    flex: 1,
  },
  headerActionIcon: {
    padding: 5,
    marginLeft: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 2,
  },
  detailIcon: {
    color: themeColors.accent,
    marginRight: 12,
  },
  infoText: {
    fontSize: 16,
    color: themeColors.textSecondary,
    lineHeight: 24,
    marginBottom: 8,
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
  errorTextSmall: {
    fontSize: 13,
    color: themeColors.danger,
    textAlign: 'center',
    marginTop: 5,
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: themeColors.background,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  guideButtonText: {
    fontSize: 13,
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
    backgroundColor: themeColors.cardBackground, // or themeColors.background for contrast
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
  viewNotesButton: {
    backgroundColor: 'transparent',
    borderColor: themeColors.primary,
    borderWidth: 1.5,
  },
  buttonText: {
    color: themeColors.textOnPrimary,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: 'center',
  },
  buttonDisabled: {
    backgroundColor: themeColors.disabledBackground,
    borderColor: themeColors.disabledBackground,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColors.background,
    padding: 15,
    borderRadius: 10,
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
   scheduleTextDisabled: {
       color: themeColors.textMuted,
       textDecorationLine: 'line-through',
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
   listItemSeparatorThin: {
    height: 1,
    backgroundColor: themeColors.borderColor,
    marginVertical: 5,
   },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  subHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: themeColors.textPrimary,
    marginTop: 15,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderColor,
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
    position: 'relative',
  },
  modalBackButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    padding: 10,
    zIndex: 10,
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
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: themeColors.borderColor,
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
      paddingVertical: 10,
      paddingHorizontal: 5,
      backgroundColor: themeColors.cardBackground,
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
  passwordChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  passwordMinimalChecklist: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    justifyContent: 'space-around',
  },
  checklistItemIcon: {
    marginHorizontal: 2,
  },
  passwordInfoButton: {
    padding: 5,
  },
  passwordInfoModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  passwordInfoModalContent: {
    width: '85%',
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
  addGramsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  addGramsInput: {
    flex: 1,
    marginRight: 10,
    marginBottom: 0,
  },
  addGramsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: themeColors.accent,
    borderRadius: 8,
  },
  addGramsButtonText: {
    color: themeColors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: themeColors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  noteTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  noteText: {
    fontSize: 15,
    color: themeColors.textPrimary,
    marginBottom: 3,
  },
  noteTimestamp: {
    fontSize: 12,
    color: themeColors.textMuted,
  },
  noteActions: {
    flexDirection: 'row',
  },
  noteActionButton: {
    padding: 8,
    marginLeft: 5,
  },
  filterOptionButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderColor,
  },
  filterOptionText: {
    fontSize: 16,
    color: themeColors.textSecondary,
  },
  filterOptionTextSelected: {
    color: themeColors.primary,
    fontWeight: 'bold',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    marginBottom: 5,
  },
  datePickerInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: themeColors.borderColor,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
    backgroundColor: themeColors.background,
  },
  datePickerText: {
    fontSize: 15,
    color: themeColors.textPrimary,
  },
  recoveryCodesContainer: {
    backgroundColor: themeColors.background,
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
    borderWidth: 1,
    borderColor: themeColors.borderColor,
  },
  recoveryCodeItem: {
      fontSize: 16,
      color: themeColors.textPrimary,
      paddingVertical: 5,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      textAlign: 'center',
      letterSpacing: 1,
  },
  checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 15,
      width: '100%',
      justifyContent: 'center',
  },
  checkboxLabel: {
      marginLeft: 10,
      fontSize: 15,
      color: themeColors.textSecondary,
      flexShrink: 1,
  },
  deviceItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    backgroundColor: themeColors.cardBackground,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.borderColor,
  },
  deviceItemIcon: {
    marginRight: 15,
    width: 35,
    textAlign: 'center',
  },
  deviceItemInfo: {
    flex: 1,
  },
  deviceItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.textPrimary,
    marginBottom: 4,
  },
  deviceItemDetail: {
    fontSize: 13,
    color: themeColors.textSecondary,
    marginBottom: 2,
  },
  deviceItemLogoutButton: { padding: 10, marginLeft: 10, },
  deviceIdText: { fontSize: 11, color: themeColors.textMuted, marginTop: 2, fontStyle: 'italic' },
  noteTextInputContainer: {
    width: '100%',
  },
  noteCharCounter: {
    textAlign: 'right',
    fontSize: 12,
    color: themeColors.textMuted,
    paddingRight: 8,
  },
  troubleshootButton: {
    marginLeft: 8,
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 15,
  },
  troubleshootList: {
    alignSelf: 'flex-start',
    width: '100%',
    marginVertical: 15,
  },
  troubleshootItem: {
    fontSize: 15,
    color: themeColors.textSecondary,
    marginBottom: 10,
    lineHeight: 22,
  },



});