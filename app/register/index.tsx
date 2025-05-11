// UPDATED REGISTER UI
// Changes made by me (Ryan):

// v10:
// added cloudflare turnstile for captcha (removed math captcha)

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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from "react-native";
import { Link, useRouter, useNavigation } from "expo-router";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebaseConfig";
import Icon from "react-native-vector-icons/Ionicons";
import { WebView } from 'react-native-webview';

const TURNSTILE_SITE_KEY = "0x4AAAAAABcgC0f4En2181LP";
const BACKEND_VERIFY_URL = "https://petfeeder-turnstile.ryanoliver565.workers.dev/verify-turnstile";

const COMPACT_WIDGET_WIDTH = 150;
const COMPACT_WIDGET_HEIGHT = 140;

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUpperCase, setHasUpperCase] = useState(false);
  const [hasLowerCase, setHasLowerCase] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSpecialChar, setHasSpecialChar] = useState(false);
  const [hasMinLength, setHasMinLength] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      gestureEnabled: false,
    });
    const handleBackPress = () => true;
    BackHandler.addEventListener("hardwareBackPress", handleBackPress);
    return () => BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
  }, [navigation]);

  const validatePassword = (pass: string) => {
    setHasUpperCase(/[A-Z]/.test(pass));
    setHasLowerCase(/[a-z]/.test(pass));
    setHasNumber(/[0-9]/.test(pass));
    setHasSpecialChar(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass));
    setHasMinLength(pass.length >= 6);
  };

  const attemptRegistration = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      Alert.alert("Missing Information", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }
    if (!(hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && hasMinLength)) {
      Alert.alert("Password Requirements", "Password does not meet all complexity requirements.");
      return;
    }

    Keyboard.dismiss();
    setChallengeToken(null);
    setShowChallengeModal(true);
  };

  const handleChallengeVerify = (token: string) => {
    // console.log("Challenge Token received from WebView (Register):", token);
    setShowChallengeModal(false);
    setTimeout(() => {
      verifyTokenAndRegister(token);
    }, 100);
  };

  const verifyTokenAndRegister = async (token: string) => {
    setLoading(true);
    setChallengeToken(token);
    try {
      console.log("Verifying Challenge token with backend (Register):", BACKEND_VERIFY_URL);
      const verifyResponse = await fetch(BACKEND_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      console.log("Challenge verified by backend successfully (Register).");
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(userCredential.user);
      await auth.signOut();

      Alert.alert(
        "Verify Your Email",
        "Registration successful! A verification link has been sent. Please verify your email before logging in.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );

    } catch (error: any) {
        let errorMessage = "An unknown registration error occurred.";
         if (error.code) {
             if (error.code === 'auth/email-already-in-use') { errorMessage = "This email is already registered. Please try logging in."; }
             else if (error.code === 'auth/invalid-email') { errorMessage = "Please enter a valid email address."; }
             else if (error.code === 'auth/weak-password') { errorMessage = "The password is too weak."; }
             else { errorMessage = error.message || "Firebase auth error."; }
         } else if (error.message) {
            if (error.message.toLowerCase().includes('network request failed')) {
                errorMessage = "Network Error: Could not connect to the verification server.";
            } else {
                errorMessage = error.message;
            }
         }
        Alert.alert("Registration Error", errorMessage);
        setChallengeToken(null);
    } finally {
       setTimeout(() => {
        setLoading(false);
       }, 100);
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
           data-action="register"
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

  const isFormValid = Boolean(
    email.trim() && password && confirmPassword &&
    hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && hasMinLength &&
    password === confirmPassword
  );
  const isRegisterDisabled = !isFormValid || loading;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Image
            source={require("../../assets/images/logo3.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Create Account</Text>

          <View style={styles.inputGroup}>
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

            <View style={[styles.passwordInputContainer, {height: 48}]}>
              <TextInput
                  style={styles.passwordInputText}
                  placeholder="Password"
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={(text) => { setPassword(text); validatePassword(text); }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.passwordToggleIcon}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={styles.hitSlop}
              >
                <Icon
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#A06CD5"
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.passwordInputContainer, {height: 48}]}>
              <TextInput
                  style={styles.passwordInputText}
                  placeholder="Confirm Password"
                  placeholderTextColor="#888"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.passwordToggleIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={styles.hitSlop}
              >
                <Icon
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#A06CD5"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.checklist}>
            <Text style={[styles.checkItem, hasMinLength ? styles.valid : styles.invalid]}> {hasMinLength ? '✓' : '•'} At least 6 characters </Text>
            <Text style={[styles.checkItem, hasUpperCase ? styles.valid : styles.invalid]}> {hasUpperCase ? '✓' : '•'} Uppercase letter (A-Z) </Text>
            <Text style={[styles.checkItem, hasLowerCase ? styles.valid : styles.invalid]}> {hasLowerCase ? '✓' : '•'} Lowercase letter (a-z) </Text>
            <Text style={[styles.checkItem, hasNumber ? styles.valid : styles.invalid]}> {hasNumber ? '✓' : '•'} Number (0-9) </Text>
            <Text style={[styles.checkItem, hasSpecialChar ? styles.valid : styles.invalid]}> {hasSpecialChar ? '✓' : '•'} Special character (!@#...) </Text>
            {confirmPassword && password !== confirmPassword && ( <Text style={[styles.checkItem, styles.invalid]}> ✗ Passwords do not match </Text> )}
          </View>

          <TouchableOpacity
            style={[styles.button, isRegisterDisabled && styles.disabledButton]}
            onPress={attemptRegistration}
            disabled={isRegisterDisabled}
          >
            {loading && !showChallengeModal ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild replace={true}>
              <TouchableOpacity>
                <Text style={styles.link}>Login here</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <Image
            source={require("../../assets/images/pets.png")}
            style={styles.bottomImage}
            resizeMode="contain"
          />
        </View>
      </TouchableWithoutFeedback>

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
                            // console.log("WebView Raw Message:", rawData);
                            const messageData = JSON.parse(rawData);
                            if (messageData.type === 'token' && messageData.value) {
                                handleChallengeVerify(messageData.value);
                            } else if (messageData.type === 'expired') {
                                Alert.alert("Challenge Expired", "The security challenge has expired. Please try again.");
                                setShowChallengeModal(false); setChallengeToken(null); if (loading) setLoading(false);
                            } else if (messageData.type === 'error') {
                                console.error("Turnstile WebView Error (Register):", messageData.value);
                                Alert.alert("Security Check Error", `An error occurred with the security check. Details: ${messageData.value}. Please try again.`);
                                setShowChallengeModal(false); setChallengeToken(null); if (loading) setLoading(false);
                            }
                        } catch (e) {
                            console.error("Error parsing WebView message (Register):", e, event.nativeEvent.data);
                            Alert.alert("Error", "Could not process security check response.");
                            setShowChallengeModal(false); setChallengeToken(null); if (loading) setLoading(false);
                        }
                    }}
                    onError={(syntheticEvent) => {
                        const {nativeEvent} = syntheticEvent;
                        // console.error('WebView ERROR (Register): ', nativeEvent);
                        Alert.alert("WebView Error", `Could not load security check. Details: ${nativeEvent.description || 'Unknown error'}`);
                        setShowChallengeModal(false); if (loading) setLoading(false);
                    }}
                    onLoadStart={() => console.log("WebView loading started (Turnstile Register)...")}
                    onLoadEnd={() => console.log("WebView loading finished (Turnstile Register).")}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: '#333',
    marginVertical: 5,
  },
  inputGroup: {
      width: '100%',
      marginBottom: 5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
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
    marginBottom: 10,
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
  hitSlop: {
      top: 10, bottom: 10, left: 10, right: 10
  },
  checklist: {
    width: "100%",
    paddingLeft: 5,
    marginVertical: 5,
  },
  checkItem: {
    fontSize: 13,
    marginVertical: 1,
  },
  invalid: {
    color: '#dc3545',
  },
  valid: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: "#A06CD5",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
    marginVertical: 5,
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
    alignItems: 'center',
    marginVertical: 5,
  },
  footerText: {
    color: '#555',
    fontSize: 14,
  },
  link: {
    color: "#A06CD5",
    fontWeight: "bold",
    fontSize: 14,
  },
  bottomImage: {
    width: '80%',
    maxWidth: 200,
    height: 80,
    resizeMode: "contain",
    alignSelf: "center",
    marginTop: 10,
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