// v3:
// resetpassword

// v10:
// added cloudflare turnstile for captcha

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import Icon from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';

const TURNSTILE_SITE_KEY = "0x4AAAAAABcgC0f4En2181LP";
const BACKEND_VERIFY_URL = "https://petfeeder-turnstile.ryanoliver565.workers.dev/verify-turnstile";

const COMPACT_WIDGET_WIDTH = 150;
const COMPACT_WIDGET_HEIGHT = 140;

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);

  const executePasswordReset = async (token: string) => {
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
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        'Password Reset Email Sent',
        'An email with instructions to reset your password has been sent. Please check your inbox (and spam folder).',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      setEmail('');

    } catch (error: any) {
      let errorMessage = "An error occurred. Please try again.";
       if (error.code) {
          if (error.code === 'auth/invalid-email') {
            errorMessage = "The email address is not valid.";
          } else if (error.code === 'auth/user-not-found') {
            errorMessage = "No user found with this email address.";
          } else if (error.code === 'auth/missing-email') {
             errorMessage = "Please enter your email address.";
          } else {
             errorMessage = `Firebase Error: ${error.message}`;
          }
      } else if (error.message) {
          if (error.message.toLowerCase().includes('network request failed')) {
              errorMessage = "Network Error: Could not connect to the server.";
          } else {
              errorMessage = error.message;
          }
      }
      Alert.alert('Error', errorMessage);
      setChallengeToken(null);
    } finally {
      setTimeout(() => setLoading(false), 100);
    }
  };

  const attemptResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your registered email address.');
      return;
    }
    Keyboard.dismiss();
    setChallengeToken(null);
    setShowChallengeModal(true);
    // setLoading(true);
  };

  const handleChallengeVerify = (token: string) => {
    // console.log("Challenge Token received from WebView:", token);
    setShowChallengeModal(false);
    setTimeout(() => {
      executePasswordReset(token);
    }, 100);
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
           data-action="reset_password"
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


  const isButtonDisabled = !email.trim() || loading;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.instructions}>
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />

        <TouchableOpacity
          style={[styles.button, isButtonDisabled && styles.disabledButton]}
          onPress={attemptResetPassword}
          disabled={isButtonDisabled}
        >

          {loading && !showChallengeModal ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

         <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={styles.link}>Back to Login</Text>
         </TouchableOpacity>

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
              </View>
            </View>
          </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  instructions: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#A06CD5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
    width: '100%',
  },
  button: {
    backgroundColor: '#A06CD5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#DAC3E8',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: '#A06CD5',
    fontWeight: 'bold',
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
    // backgroundColor: '#eee',
  },
  webView: {
    width: '100%',
    height: '100%',
    // backgroundColor: 'transparent',
  },
});
