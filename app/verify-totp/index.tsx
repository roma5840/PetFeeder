// v12:
// added TOTP 2FA

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { getDatabase, ref, get, update } from 'firebase/database';
import { auth } from '../firebaseConfig';
import Icon from "react-native-vector-icons/Ionicons";

const CLOUDFLARE_WORKER_TOTP_URL = "https://petfeeder-totp-auth.ryanoliver565.workers.dev"; 

export default function VerifyTotpScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { userId, userEmail } = params;

  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUsingRecovery, setIsUsingRecovery] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false, gestureEnabled: false });
    if (!userId) {
      Alert.alert("Error", "User information missing. Please log in again.");
      router.replace('/login');
    } else {
      fetchUserData();
    }
  }, [userId]);

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
    //   console.error("Error fetching TOTP user data:", error);
      Alert.alert("Error", "Could not fetch user data. Please try again.");
      await auth.signOut();
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    if (!totpCode.trim()) {
      Alert.alert("Input Error", "Please enter your 6-digit TOTP code.");
      return;
    }
    if (!userData || !userData.encryptedSecret || !userData.iv) {
      Alert.alert("Error", "User TOTP data is incomplete. Please re-login or setup TOTP again.");
      return;
    }
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const response = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/verify-login-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedSecret: userData.encryptedSecret,
          iv: userData.iv,
          token: totpCode.trim(),
          userEmail: userEmail
        }),
      });

      const result = await response.json();

      if (response.ok && result.verified) {
        // Alert.alert("Success", "2FA Verified!");
        router.replace('/petfeeder');
      } else {
        Alert.alert("Verification Failed", result.error || "Invalid TOTP code. Please try again.");
      }
    } catch (error) {
    //   console.error("Error verifying TOTP:", error);
      Alert.alert("Error", "An error occurred during verification. Check connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyRecoveryCode = async () => {
    if (!recoveryCode.trim()) {
      Alert.alert("Input Error", "Please enter your recovery code.");
      return;
    }
    if (!userData || !userData.hashedRecoveryCodes) {
        Alert.alert("Error", "User recovery data is incomplete.");
        return;
    }
    Keyboard.dismiss();
    setIsLoading(true);

    try {
        const response = await fetch(`${CLOUDFLARE_WORKER_TOTP_URL}/totp/verify-recovery-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recoveryCode: recoveryCode.trim(),
                storedHashedCodes: userData.hashedRecoveryCodes || [],
                userEmail: userEmail
            }),
        });
        const result = await response.json();

        if (response.ok && result.verified) {
            // Alert.alert("Success", "Recovery code verified!");
            const db = getDatabase();
            const userTotpRef = ref(db, `users/${userId}/totp`);
            const updatedHashedCodes = (userData.hashedRecoveryCodes || []).filter(hash => hash !== result.usedCodeHash);

            await update(userTotpRef, { hashedRecoveryCodes: updatedHashedCodes });

            router.replace('/petfeeder');
        } else {
            Alert.alert("Verification Failed", result.error || "Invalid recovery code.");
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
        <Text>Loading user data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo3.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Two-Factor Authentication</Text>
      
      {!isUsingRecovery ? (
        <>
          <Text style={styles.instructionText}>
            Enter the 6-digit code from your authenticator app.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="XXXXXX"
            placeholderTextColor="#888"
            value={totpCode}
            onChangeText={setTotpCode}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="off"
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleVerifyTotp}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Verify Code</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsUsingRecovery(true)} disabled={isLoading}>
            <Text style={styles.linkText}>Use a recovery code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.instructionText}>
            Enter one of your recovery codes.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="XXXXX-XXXXX"
            placeholderTextColor="#888"
            value={recoveryCode}
            maxLength={11}
            onChangeText={setRecoveryCode}
            autoCorrect={false}
            autoComplete="off"
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.disabledButton]}
            onPress={handleVerifyRecoveryCode}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Verify Recovery Code</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsUsingRecovery(false)} disabled={isLoading}>
            <Text style={styles.linkText}>Use authenticator app code</Text>
          </TouchableOpacity>
        </>
      )}
       <TouchableOpacity style={styles.signOutButton} onPress={async () => {
           setIsLoading(true);
           await auth.signOut();
           router.replace('/login');
           setIsLoading(false);
        }} disabled={isLoading}>
            <Icon name="log-out-outline" size={20} color="#DC3545" style={{marginRight: 5}} />
            <Text style={styles.signOutButtonText}>Sign Out & Return to Login</Text>
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 20,
    lineHeight: 22,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#A06CD5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#A06CD5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#DAC3E8',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  linkText: {
    color: '#A06CD5',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 10,
  },
  signOutButton: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  signOutButtonText: {
    color: '#DC3545',
    fontSize: 15,
    fontWeight: 'bold',
  },
});