import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'; // Import re-auth methods
import Icon from 'react-native-vector-icons/Ionicons';
import { useNetInfo } from '@react-native-community/netinfo';

// Re-using the theme colors from the main app for consistency
const themeColors = {
  primary: '#7B2CBF',
  light: '#C77DFF',
  accent: '#9D4EDD',
  background: '#F7F4FA',
  cardBackground: '#FFFFFF',
  textPrimary: '#2D2D2D',
  textSecondary: '#5E5E5E',
  textMuted: '#8D8D8D',
  textOnPrimary: '#FFFFFF',
  borderColor: '#E0E0E0',
  disabledBackground: '#E9D8FD',
  danger: '#DC3545',
  success: '#28A745',
};

const FEEDER_SETUP_SSID = "PetFeeder-Setup";

interface ConnectFeederModalProps {
  onClose: () => void;
}

export default function ConnectFeederModal({ onClose }: ConnectFeederModalProps) {
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCorrectWifi, setIsCorrectWifi] = useState(false);
  
  const auth = getAuth();
  const user = auth.currentUser;
  const netInfo = useNetInfo();

  useEffect(() => {
    if (netInfo.type === 'wifi' && netInfo.details && netInfo.details.ssid === FEEDER_SETUP_SSID) {
      setIsCorrectWifi(true);
    } else {
      setIsCorrectWifi(false);
    }
  }, [netInfo]);

  const handleConnect = async () => {
    if (!isCorrectWifi) {
      Alert.alert('Incorrect WiFi', `Please connect to the "${FEEDER_SETUP_SSID}" WiFi network first.`);
      return;
    }
    if (!ssid) {
      Alert.alert('Missing Info', 'Please enter your Home WiFi network name (SSID).');
      return;
    }
    if (!userPassword) {
      Alert.alert('Missing Info', "Please enter your app's account password for security.");
      return;
    }
    if (!user || !user.email) {
      Alert.alert('Error', 'You must be logged in to connect a device.');
      return;
    }

    setIsConnecting(true);

    try {
      console.log("Verifying user password before sending to device...");
      const credential = EmailAuthProvider.credential(user.email, userPassword);
      await reauthenticateWithCredential(user, credential);
      console.log("Password verified successfully.");

      const formData = new URLSearchParams();
      formData.append('ssid', ssid);
      formData.append('password', wifiPassword);
      formData.append('uid', user.uid);
      formData.append('email', user.email);
      formData.append('user_pass', userPassword);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('http://192.168.4.1/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const responseText = await response.text();

      if (response.ok && responseText.includes('OK')) {
        Alert.alert(
          'Success!',
          'The feeder received the configuration and is rebooting. It should appear online shortly. Please reconnect your phone to your home WiFi.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        throw new Error(`Feeder responded with an error: ${responseText}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
         Alert.alert(
          'Configuration Sent!',
          'The feeder is rebooting and should appear online shortly. Please reconnect your phone to your home WiFi.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Incorrect Password', 'The account password you entered is incorrect. Please try again.');
      } else {
        console.error('Error connecting to feeder or re-authenticating:', error);
        Alert.alert(
          'Connection Failed',
          `Could not send configuration. Error: ${error.message}`
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const isButtonDisabled = isConnecting || !ssid || !userPassword || !isCorrectWifi;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <TouchableOpacity style={styles.modalBackButton} onPress={onClose} disabled={isConnecting}>
            <Icon name="close-outline" size={28} color={themeColors.primary} />
        </TouchableOpacity>
        <Icon name="wifi" size={30} color={themeColors.primary} style={{marginBottom: 10}} />
        <Text style={styles.modalTitle}>Connect Your Feeder</Text>

        <View style={styles.stepContainer}>
            <Text style={styles.stepHeader}>Step 1: Connect to Feeder's WiFi</Text>
            <Text style={styles.stepText}>
              Go to your phone's WiFi settings and connect to the network named <Text style={{fontWeight: 'bold'}}>{FEEDER_SETUP_SSID}</Text>.
            </Text>
            <View style={[styles.statusContainer, isCorrectWifi ? styles.statusSuccess : styles.statusError]}>
                <Icon name={isCorrectWifi ? "checkmark-circle" : "alert-circle"} size={20} color={isCorrectWifi ? themeColors.success : themeColors.danger} />
                <Text style={styles.statusText}>
                    {isCorrectWifi ? `Connected to "${FEEDER_SETUP_SSID}"` : "Not connected to feeder WiFi"}
                </Text>
            </View>
        </View>

        <View style={styles.stepContainer}>
            <Text style={styles.stepHeader}>Step 2: Enter Home Credentials</Text>
            <TextInput
            style={styles.modalInput}
            placeholder="Home WiFi Name (SSID)"
            placeholderTextColor={themeColors.textMuted}
            value={ssid}
            onChangeText={setSsid}
            editable={!isConnecting}
            autoCapitalize="none"
            />
            <TextInput
            style={styles.modalInput}
            placeholder="Home WiFi Password (optional)"
            placeholderTextColor={themeColors.textMuted}
            value={wifiPassword}
            onChangeText={setWifiPassword}
            secureTextEntry
            editable={!isConnecting}
            />
            <Text style={styles.modalNote}>For security, confirm your app password:</Text>
            <TextInput
            style={styles.modalInput}
            placeholder="Your App Account Password"
            placeholderTextColor={themeColors.textMuted}
            value={userPassword}
            onChangeText={setUserPassword}
            secureTextEntry
            editable={!isConnecting}
            />
        </View>

        <TouchableOpacity
          style={[styles.modalButton, styles.modalPrimaryButton, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={isButtonDisabled}
        >
          {isConnecting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.modalButtonText}>Link Feeder to Account</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  stepContainer: {
    width: '100%',
    marginBottom: 20,
    padding: 15,
    backgroundColor: themeColors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.borderColor,
  },
  stepHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.primary,
    marginBottom: 10,
  },
  stepText: {
    fontSize: 15,
    color: themeColors.textSecondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: '#d4edda', // light green
  },
  statusError: {
    backgroundColor: '#f8d7da', // light red
  },
  statusText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  modalInput: {
     width: '100%',
     paddingVertical: 12,
     paddingHorizontal: 15,
     borderWidth: 1,
     borderColor: themeColors.borderColor,
     borderRadius: 8,
     marginBottom: 10,
     fontSize: 16,
     backgroundColor: themeColors.cardBackground,
     color: themeColors.textPrimary,
   },
   modalNote: {
     fontSize: 14,
     color: themeColors.textMuted,
     width: '100%',
     marginBottom: 5,
     marginTop: 5,
   },
  modalButton: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
   },
   modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
   },
   modalPrimaryButton: {
    backgroundColor: themeColors.primary,
   },
   buttonDisabled: {
    backgroundColor: themeColors.disabledBackground,
  },
});