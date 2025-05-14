// v12:
// added TOTP 2FA

import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  BackHandler,
  Image,
  ActivityIndicator,
  Modal,
  Platform
} from "react-native";
import { Link, useRouter, useNavigation } from "expo-router";
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import Icon from "react-native-vector-icons/Ionicons";
import { WebView } from 'react-native-webview';
import { getDatabase, ref, get } from 'firebase/database';

const TURNSTILE_SITE_KEY = "0x4AAAAAABcgC0f4En2181LP"; 
const BACKEND_VERIFY_URL = "https://petfeeder-turnstile.ryanoliver565.workers.dev/verify-turnstile"; 

const COMPACT_WIDGET_WIDTH = 150;
const COMPACT_WIDGET_HEIGHT = 140;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      gestureEnabled: false
    });
    const handleBackPress = () => true;
    BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    };
  }, [navigation]);

  const attemptLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please fill in email and password.");
      return;
    }
    setChallengeToken(null);
    setShowChallengeModal(true);
  };

  const handleChallengeVerify = (token: string) => {
    // console.log("Challenge Token received from WebView:", token);
    setShowChallengeModal(false);
    setTimeout(() => {
      verifyTokenAndLogin(token);
    }, 100);
  };

  const verifyTokenAndLogin = async (token: string) => {
    setLoading(true);
    setChallengeToken(token);
    try {
      console.log("Verifying Challenge token with backend:", BACKEND_VERIFY_URL);
      const verifyResponse = await fetch(BACKEND_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ token }),
      });

      if (!verifyResponse.ok) {
        let errorMsg = `Server responded with ${verifyResponse.status}.`;
        try {
            const errorResult = await verifyResponse.json();
            errorMsg = errorResult.message || errorMsg;
        } catch (e) {
            errorMsg = verifyResponse.statusText || errorMsg;
        }
        Alert.alert("Challenge Verification Error", errorMsg);
        setChallengeToken(null); setLoading(false); return;
      }

      const verifyResult = await verifyResponse.json();

      if (!verifyResult.success) {
        Alert.alert("Challenge Error", verifyResult.message || "Failed to verify challenge. Please try again.");
        setChallengeToken(null); setLoading(false); return;
      }

      console.log("Challenge verified by backend successfully.");
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        Alert.alert(
          "Email Not Verified",
          "Your email address needs verification. Resend link?",
          [
            { text: "Resend Link", onPress: async () => {
                try { await sendEmailVerification(user); Alert.alert("Link Sent", "Verification link resent."); }
                catch (e) { Alert.alert("Error", "Could not resend link."); }
                finally { await signOut(auth); setLoading(false); setChallengeToken(null); }
            }},
            { text: "OK", onPress: async () => { await signOut(auth); setLoading(false); setChallengeToken(null); }, style: "cancel" },
          ], { cancelable: false });
        return;
      }
      console.log("User logged in and email verified:", user.email);

      const db = getDatabase();
      const userTotpRef = ref(db, `users/${user.uid}/totp`);
      const totpSnapshot = await get(userTotpRef);

      if (totpSnapshot.exists() && totpSnapshot.val().enabled === true && totpSnapshot.val().setupComplete === true) {
        console.log("TOTP is enabled for this user. Navigating to TOTP verification.");
        router.replace({
          pathname: "/verify-totp",
          params: { userId: user.uid, userEmail: user.email },
        });
      } else {
        console.log("TOTP not enabled or setup incomplete. Proceeding to main app.");
        const userPetDataRef = ref(db, `users/${user.uid}`);
        const petDataSnapshot = await get(userPetDataRef);
        if (petDataSnapshot.exists() && petDataSnapshot.val().petName) {
            router.replace("/petfeeder");
        } else {
            router.replace("/");
        }
      }

    } catch (error: any) {
      let errorMessage = "An unknown login error occurred.";
       if (error.code) {
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
              errorMessage = "Invalid email or password.";
          } else if (error.code === 'auth/invalid-email') {
              errorMessage = "Please enter a valid email address.";
          } else if (error.code === 'auth/too-many-requests') {
               errorMessage = "Too many failed login attempts. Please try again later.";
          } else { errorMessage = error.message || "Firebase auth error."; }
      } else if (error.message) {
          if (error.message.toLowerCase().includes('network request failed')) {
              errorMessage = "Network Error: Could not connect to the verification server.";
          } else {
              errorMessage = error.message;
          }
      }
      Alert.alert("Login Error", errorMessage);
      setChallengeToken(null);
    } finally {
      setTimeout(() => setLoading(false), 100);
    }
  };

  const turnstileHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=${COMPACT_WIDGET_WIDTH}, height=${COMPACT_WIDGET_HEIGHT}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Cloudflare Turnstile</title>
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #f8f9fa;
          overflow: hidden;
        }
      </style>
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    </head>
    <body>
      <div class="cf-turnstile"
           data-sitekey="${TURNSTILE_SITE_KEY}"
           data-callback="onTurnstileSuccess"
           data-expired-callback="onTurnstileExpired"
           data-error-callback="onTurnstileError"
           data-theme="light" 
           data-action="login"
           data-language="en"
           data-size="compact"> 
      </div>
      <script>
        function onTurnstileSuccess(token) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', value: token }));
        }
        function onTurnstileExpired() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
        }
        function onTurnstileError(errorCode) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', value: 'Turnstile error: ' + errorCode }));
        }
      </script>
    </body>
    </html>
  `;

  const isLoginDisabled = !email.trim() || !password || loading;

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/logo3.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Pet Feeder Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <View style={[styles.passwordInputContainer, {height: 50}]}>
        <TextInput
            style={styles.passwordInputText}
            placeholder="Password"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
        />
        <TouchableOpacity
          style={styles.passwordToggleIcon}
          onPress={() => setShowPassword(!showPassword)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#A06CD5" />
        </TouchableOpacity>
      </View>
      <View style={styles.forgotPasswordRow}>
        <Link href="/resetpassword" asChild>
        <TouchableOpacity style={styles.forgotPasswordButtonContainer}>
          <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
        </TouchableOpacity>
        </Link>
      </View>
      <TouchableOpacity
        style={[styles.button, (isLoginDisabled) && styles.disabledButton]}
        onPress={attemptLogin}
        disabled={isLoginDisabled}
      >
        {loading && !showChallengeModal ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/register" asChild replace={true}>
          <TouchableOpacity>
            <Text style={styles.link}>Register here</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <Modal
        visible={showChallengeModal}
        onRequestClose={() => {
          setShowChallengeModal(false);
          setChallengeToken(null);
          if (loading) setLoading(false);
        }}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Security Check</Text>
            <View style={styles.webViewWrapper}>
              <View style={styles.webViewContainer}>
                <WebView
                    source={{ html: turnstileHtml, baseUrl: 'https://localhost' }}
                    style={styles.webView}
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={['*']}
                    scrollEnabled={false}
                    onMessage={(event) => {
                        try {
                            const rawData = event.nativeEvent.data;
                            const messageData = JSON.parse(rawData);
                            if (messageData.type === 'token' && messageData.value) {
                                handleChallengeVerify(messageData.value);
                            } else if (messageData.type === 'expired') {
                                Alert.alert("Challenge Expired", "Please try again.");
                                setShowChallengeModal(false); setChallengeToken(null); if (loading) setLoading(false);
                            } else if (messageData.type === 'error') {
                                console.error("Turnstile WebView Error:", messageData.value);
                                Alert.alert("Security Check Error", `An error occurred during the security check. Details: ${messageData.value}. Please try again.`);
                                setShowChallengeModal(false); setChallengeToken(null); if (loading) setLoading(false);
                            }
                        } catch (e) {
                            console.error("Error parsing WebView message:", e, event.nativeEvent.data);
                            Alert.alert("Error", "Could not process security check response.");
                            setShowChallengeModal(false); setChallengeToken(null); if (loading) setLoading(false);
                        }
                    }}
                    onError={(syntheticEvent) => {
                        const {nativeEvent} = syntheticEvent;
                        // console.error('WebView ERROR: ', nativeEvent);
                        Alert.alert("WebView Error", `Could not load the security check. Please check your connection and try again. Details: ${nativeEvent.description || 'Unknown'}`);
                        setShowChallengeModal(false); if (loading) setLoading(false);
                    }}
                    onLoadStart={() => console.log("WebView loading started (Turnstile)...")}
                    onLoadEnd={() => console.log("WebView loading finished (Turnstile).")}
                />
              </View>
            </View>

            {/* 
            <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                    setShowChallengeModal(false);
                    setChallengeToken(null);
                    if (loading) setLoading(false);
                }}
            >
                <Text style={styles.closeModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            */}
            
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
    paddingBottom: 80,
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 0,
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center",
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#fff",
    fontSize: 16,
    color: '#333',
    width: '100%',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  passwordInputText: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 15,
    paddingRight: 10,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  passwordToggleIcon: {
    padding: 12,
  },
  forgotPasswordRow: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordButtonContainer: {},
  forgotPasswordLink: {
    color: "#A06CD5",
    fontWeight: "normal",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#A06CD5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    width: '100%',
  },
  disabledButton: {
    backgroundColor: "#DAC3E8",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
    alignItems: 'center',
  },
  footerText: {
    color: '#555',
    fontSize: 15,
  },
  link: {
    color: "#A06CD5",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    width: 'auto',
    minWidth: COMPACT_WIDGET_WIDTH + 30,
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  webViewWrapper: {
    width: COMPACT_WIDGET_WIDTH,
    height: COMPACT_WIDGET_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  webViewContainer: {
    width: COMPACT_WIDGET_WIDTH,
    height: COMPACT_WIDGET_HEIGHT,
    overflow: 'hidden',
  },
  webView: {
    // flex: 1,
    width: '100%',
    height: '100%',
    // backgroundColor: 'transparent', 
  },
  closeModalButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 25,
    backgroundColor: '#A06CD5',
    borderRadius: 8,
  },
  closeModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});