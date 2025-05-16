// v12:
// added TOTP 2FA

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Keyboard,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { getDatabase, ref, get, update } from 'firebase/database';
import { auth } from '../firebaseConfig';
import Icon from "react-native-vector-icons/Ionicons";

const CLOUDFLARE_WORKER_TOTP_URL = "https://petfeeder-totp-auth.ryanoliver565.workers.dev";
const SCREEN_TIMEOUT_DURATION_MS = 3 * 60 * 1000; // 3 minutes for inactivity

export default function VerifyTotpScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { userId, userEmail } = params;

  const [totpDigits, setTotpDigits] = useState<string[]>(Array(6).fill(''));
  const [activeOtpIndex, setActiveOtpIndex] = useState<number>(0);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUsingRecovery, setIsUsingRecovery] = useState(false);
  const [userData, setUserData] = useState(null);

  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const isProgrammaticFocusChange = useRef(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false, gestureEnabled: false });
    if (!userId) {
      Alert.alert("Error", "User information missing. Please log in again.");
      router.replace('/login');
    } else {
      fetchUserData();
    }
  }, [userId]);

  useEffect(() => {
    if (!isUsingRecovery && otpInputRefs.current[0]) {
        setTimeout(() => {
            isProgrammaticFocusChange.current = true;
            otpInputRefs.current[0]?.focus();
            setActiveOtpIndex(0);
        }, 100);
    }
  }, [isUsingRecovery]);

  const resetScreenTimer = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    timeoutIdRef.current = setTimeout(async () => {
      console.log("Verify TOTP screen timeout reached due to inactivity.");
      Alert.alert(
        "Session Timeout",
        "For your security, you have been logged out due to inactivity.",
        [{ text: "OK" }]
      );
      setIsLoading(true);
      try {
        await auth.signOut();
      } catch (error) {
        console.error("Error signing out on timeout:", error);
      } finally {
        setTotpDigits(Array(6).fill(''));
        setRecoveryCode('');
        setActiveOtpIndex(0);
        setIsLoading(false);
        router.replace('/login');
      }
    }, SCREEN_TIMEOUT_DURATION_MS);
    // console.log(`Verify TOTP screen inactivity timer reset/started for ${SCREEN_TIMEOUT_DURATION_MS / 1000 / 60} minutes.`);
  };

  useEffect(() => {
    resetScreenTimer();

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        // console.log("Verify TOTP screen timer cleared on unmount.");
        timeoutIdRef.current = null;
      }
    };
  }, []); 


  const fetchUserData = async () => {
    setIsLoading(true);
    const db = getDatabase();
    const userTotpRef = ref(db, `users/${userId}/totp`);
    try {
      const snapshot = await get(userTotpRef);
      if (snapshot.exists()) {
        setUserData(snapshot.val());
      } else {
        Alert.alert("Error", "TOTP configuration not found. Please contact support or try re-login.");
        await auth.signOut();
        router.replace('/login');
      }
    } catch (error) {
      // console.error("Error fetching TOTP user data:", error);
      Alert.alert("Error", "Could not fetch user data. Please try again.");
      await auth.signOut();
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpFocus = (currentIndex: number) => {
    if (isProgrammaticFocusChange.current) {
      isProgrammaticFocusChange.current = false;
      // setActiveOtpIndex(currentIndex);
      return;
    }

    const firstEmptyActual = totpDigits.findIndex(digit => digit === '');

    if (firstEmptyActual !== -1) {
      if (currentIndex !== firstEmptyActual) {
        isProgrammaticFocusChange.current = true;
        otpInputRefs.current[firstEmptyActual]?.focus();
        setActiveOtpIndex(firstEmptyActual);
      } else {
        setActiveOtpIndex(firstEmptyActual);
      }
    } else {
      setActiveOtpIndex(currentIndex);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    resetScreenTimer();
    const newOtpDigits = [...totpDigits];
    const cleanText = text.replace(/[^0-9]/g, '');

    if (cleanText.length === 0) {
        newOtpDigits[index] = '';
        setTotpDigits(newOtpDigits);
        // setActiveOtpIndex(index);
        return;
    }

    if (cleanText.length === 1) {
        newOtpDigits[index] = cleanText;
        setTotpDigits(newOtpDigits);
        if (index < 5) {
            isProgrammaticFocusChange.current = true;
            otpInputRefs.current[index + 1]?.focus();
            setActiveOtpIndex(index + 1);
        } else {
            setActiveOtpIndex(index);
            Keyboard.dismiss();
        }
    } else if (cleanText.length > 1 && index === 0) {
        const pastedDigits = cleanText.slice(0, 6).split('');
        const filledOtpDigits = Array(6).fill('');
        for (let i = 0; i < pastedDigits.length; i++) {
            filledOtpDigits[i] = pastedDigits[i];
        }
        setTotpDigits(filledOtpDigits);
        const nextFocusIndex = Math.min(pastedDigits.length, 5);
        isProgrammaticFocusChange.current = true;
        otpInputRefs.current[nextFocusIndex]?.focus();
        setActiveOtpIndex(nextFocusIndex);
        if (pastedDigits.length >= 6) {
            Keyboard.dismiss();
        }
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      resetScreenTimer();
      e.preventDefault();

      const newOtpDigits = [...totpDigits];

      if (newOtpDigits[index] !== '') {
        newOtpDigits[index] = '';
        setTotpDigits(newOtpDigits);
        // setActiveOtpIndex(index);
      } else if (index > 0) {

        newOtpDigits[index - 1] = '';
        setTotpDigits(newOtpDigits);

        isProgrammaticFocusChange.current = true;
        otpInputRefs.current[index - 1]?.focus();
        setActiveOtpIndex(index - 1);
      }
    }
  };

  const handleVerifyTotp = async () => {
    resetScreenTimer();
    const currentTotpCode = totpDigits.join('');
    if (currentTotpCode.length !== 6) {
      Alert.alert("Input Error", "Please enter your complete 6-digit TOTP code.");
      return;
    }
    if (!userData || !userData.encryptedSecret || !userData.iv) {
      Alert.alert("Error", "User TOTP data is incomplete. Please re-login or setup TOTP again.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        Alert.alert("Error", "User session expired. Please log in again.");
        setIsLoading(false);
        router.replace('/login');
        return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const idToken = await currentUser.getIdToken();

      // console.log("ID Token from Firebase Auth (VerifyTotpScreen):", idToken);
      // console.log("Type of ID Token:", typeof idToken);

      const response = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/verify-login-token`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
              encryptedSecret: userData.encryptedSecret,
              iv: userData.iv,
              token: currentTotpCode,
          }),
      });
      const result = await response.json();

      if (response.ok && result.verified) {
        // Alert.alert("Success", "2FA Verified!");
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        router.replace('/petfeeder');
      } else {
        Alert.alert("Verification Failed", result.error || "Invalid TOTP code. Please try again.");
        setTotpDigits(Array(6).fill(''));
        setActiveOtpIndex(0);
        if (otpInputRefs.current[0]) {
            isProgrammaticFocusChange.current = true;
            otpInputRefs.current[0]?.focus();
        }
      }
    } catch (error) {
    //   console.error("Error verifying TOTP:", error);
      Alert.alert("Error", "An error occurred during verification. Check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async () => {
    resetScreenTimer();
    if (!recoveryCode.trim()) {
      Alert.alert("Input Error", "Please enter your recovery code.");
      return;
    }
    if (recoveryCode.trim().length !== 11) {
        Alert.alert("Input Error", "Recovery code must be 11 characters long.");
        return;
    }
    if (!userData || !userData.hashedRecoveryCodes) {
        Alert.alert("Error", "User recovery data is incomplete.");
        return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
        Alert.alert("Error", "User session expired. Please log in again.");
        setIsLoading(false);
        router.replace('/login');
        return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/verify-recovery-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                recoveryCode: recoveryCode.trim(),
                storedHashedCodes: userData.hashedRecoveryCodes || [],
            }),
        });
        const result = await response.json();
        if (response.ok && result.verified) {
            // Alert.alert("Success", "Recovery code verified!");
            const db = getDatabase();
            const userTotpRef = ref(db, `users/${userId}/totp`);
            const updatedHashedCodes = (userData.hashedRecoveryCodes || []).filter(hash => hash !== result.usedCodeHash);
            await update(userTotpRef, { hashedRecoveryCodes: updatedHashedCodes });
            if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
            router.replace('/petfeeder');
        } else {
            Alert.alert("Verification Failed", result.error || "Invalid recovery code.");
            setRecoveryCode('');
        }
    } catch (error) {
        // console.error("Error verifying recovery code:", error);
        Alert.alert("Error", "An error occurred during recovery code verification.");
    } finally {
        setIsLoading(false);
    }
  };

  if (!userData && isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A06CD5" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={"height"}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <Image
              source={require('../../assets/images/logo3.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.mainTitle}>Two-Factor Authentication</Text>
            {userEmail && (
              <Text style={styles.emailSubtitle}>
                Verifying for: <Text style={styles.emailText}>{String(userEmail)}</Text>
              </Text>
            )}
          </View>

          <View style={styles.formCard}>
            {!isUsingRecovery ? (
              <>
                <Icon name="shield-checkmark-outline" size={36} color="#A06CD5" style={styles.formIcon} />
                <Text style={styles.instructionTitle}>Enter Authenticator Code</Text>
                <Text style={styles.instructionText}>
                  Open your authenticator app and enter the 6-digit code.
                </Text>
                <View style={styles.otpInputContainer}>
                  {totpDigits.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (otpInputRefs.current[index] = ref)}
                      style={[
                        styles.otpInputBox,
                        activeOtpIndex === index && styles.otpInputBoxActive
                      ]}
                      keyboardType="number-pad"
                      maxLength={1}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      onFocus={() => handleOtpFocus(index)}
                      value={digit}
                      textContentType="oneTimeCode"
                      caretHidden
                    />
                  ))}
                </View>
                <TouchableOpacity
                  style={[
                    styles.button,
                    (isLoading || totpDigits.join('').length !== 6) && styles.disabledButton
                  ]}
                  onPress={handleVerifyTotp}
                  disabled={isLoading || totpDigits.join('').length !== 6}
                >
                  {isLoading && !isUsingRecovery ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => {
                    resetScreenTimer();
                    setIsUsingRecovery(true);
                    setTotpDigits(Array(6).fill(''));
                    setActiveOtpIndex(0);
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.switchModeButtonText}>Use a recovery code instead</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Icon name="key-outline" size={36} color="#A06CD5" style={styles.formIcon} />
                <Text style={styles.instructionTitle}>Enter Recovery Code</Text>
                <Text style={styles.instructionText}>
                  Enter one of your 11-character recovery codes.
                </Text>
                <TextInput
                  style={styles.inputRecovery}
                  placeholder="XXXXX-XXXXX"
                  placeholderTextColor="#B0B0B0"
                  value={recoveryCode}
                  maxLength={11}
                  onChangeText={(text) => {
                    resetScreenTimer();
                    setRecoveryCode(text);
                  }}
                  autoCorrect={false}
                  autoComplete="off"
                  autoFocus={true}
                />
                <TouchableOpacity
                  style={[
                    styles.button,
                    (isLoading || !recoveryCode || recoveryCode.trim().length !== 11) && styles.disabledButton
                  ]}
                  onPress={handleVerifyRecoveryCode}
                  disabled={isLoading || !recoveryCode || recoveryCode.trim().length !== 11}
                >
                  {isLoading && isUsingRecovery ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Recovery Code</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => {
                    resetScreenTimer();
                    setIsUsingRecovery(false);
                    setRecoveryCode('');
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.switchModeButtonText}>Use authenticator app code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.signOutButton, isLoading && styles.disabledSignOutButton]}
            onPress={async () => {
              if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);

              setIsLoading(true);
              await auth.signOut();

              setTotpDigits(Array(6).fill(''));
              setRecoveryCode('');
              setActiveOtpIndex(0);
              router.replace('/login');
            }}
            disabled={isLoading}
          >
            <Icon name="log-out-outline" size={20} color={isLoading ? "#E57373" : "#DC3545"} style={styles.signOutIcon} />
            <Text style={[styles.signOutButtonText, isLoading && styles.disabledSignOutText]}>Sign Out & Return to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F2FA',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F2FA",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#A06CD5',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 5,
  },
  emailSubtitle: {
    fontSize: 14,
    color: '#5A5A5A',
    textAlign: 'center',
  },
  emailText: {
    fontWeight: '600',
    color: '#A06CD5',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 30,
  },
  formIcon: {
    marginBottom: 15,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 15,
    textAlign: 'center',
    color: '#5A5A5A',
    marginBottom: 25,
    lineHeight: 22,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 25,
  },
  otpInputBox: {
    width: 45,
    height: 55,
    borderWidth: 1.5,
    borderColor: '#E0D1F0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    color: '#333333',
    backgroundColor: '#F7F2FA',
    fontWeight: 'bold',
  },
  otpInputBoxActive: {
    borderColor: '#A06CD5',
    borderWidth: 2,
  },
  inputRecovery: {
    height: 55,
    width: '100%',
    backgroundColor: '#F7F2FA',
    borderWidth: 1,
    borderColor: '#E0D1F0',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#A06CD5',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: "#A06CD5",
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#D6BEEF',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchModeButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  switchModeButtonText: {
    color: '#A06CD5',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DC3545',
    backgroundColor: 'transparent',
  },
  disabledSignOutButton: {
    borderColor: '#E57373',
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutButtonText: {
    color: '#DC3545',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disabledSignOutText: {
    color: '#E57373',
  }
});