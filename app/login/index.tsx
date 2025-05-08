// UPDATED LOGIN UI
// Changes made by me (Ryan):

// v2:
// fixed ui

// v2.1:
// adjusted login captcha box and ui padding

// v3:
// fixed for resetpassword

// v6:
// still for testing: bug fix on routing (might be stable?)
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
  ActivityIndicator 
} from "react-native";
import { Link, useRouter, useNavigation } from "expo-router";
import { signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebaseConfig"; 
import { getDatabase, ref, get } from "firebase/database";

export default function Login() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [expectedAnswer, setExpectedAnswer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

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

  useEffect(() => {
    generateCaptcha();
  }, []);


  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setExpectedAnswer(n1 + n2);
    setCaptchaAnswer(""); 
  };

  const handleLogin = async () => {
    if (!email.trim() || !password || !captchaAnswer.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (parseInt(captchaAnswer) !== expectedAnswer) {
      Alert.alert("Error", "Incorrect CAPTCHA answer");
      generateCaptcha(); 
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        console.log("Login successful but email not verified for:", user.email);
    
        Alert.alert(
          "Email Not Verified",
          "Your email address needs verification before you can log in fully. Would you like to resend the verification link?",
          [
            {
              text: "Resend Link",
              onPress: async () => {
                console.log("Resend verification link requested.");
                try {
                  await sendEmailVerification(user);
                  Alert.alert("Link Sent", "Verification link resent. Please check your inbox (and spam folder).");
                } catch (error) {
                  // console.error("Error resending verification email:", error);
                  Alert.alert("Error", "Could not resend verification link. Please try again later.");
                  // if (error.code === 'auth/too-many-requests') { ... }
                } finally {
                  console.log("Signing out user after resend attempt/cancel.");
                  await auth.signOut();
                  setLoading(false);
                  generateCaptcha();
                }
              },
            },
            {
              text: "OK",
              onPress: async () => {
                console.log("Signing out user after pressing OK.");
                await auth.signOut();
                setLoading(false);
                generateCaptcha();
              },
              style: "cancel",
            },
          ],
          { cancelable: false }
        );
    
        return;
      }

      // console.log("User verified, checking database...");

      // const db = getDatabase();
      // const userRef = ref(db, `users/${userCredential.user.uid}`);
      // const snapshot = await get(userRef);

      // if (snapshot.exists() && snapshot.val().petName) {
      //   router.replace("/petfeeder");
      // } else {
      //   router.replace("/");
      // }

    } catch (error) {
      let errorMessage = "An unknown login error occurred.";
       if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/invalid-email') {
          errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
           errorMessage = "Access temporarily disabled due to too many failed login attempts. Please try again later or reset your password.";
      } else if (error.message) {
          errorMessage = error.message;
      }
      Alert.alert("Login Error", errorMessage);
      generateCaptcha(); 
      setLoading(false);
    } finally {
      setTimeout(() => setLoading(false), 100);
    }
  };

  const isCaptchaCorrect = parseInt(captchaAnswer, 10) === expectedAnswer; 
  const isLoginDisabled =
    !email.trim() ||
    !password || 
    !captchaAnswer.trim() ||
    !isCaptchaCorrect;

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

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.input} 
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoComplete="password" 
        />
        {/* Show/Hide Password Button */}
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.eyeButtonText}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.captchaForgotRow}>

        <View style={styles.captchaGroup}>
          <Text style={styles.captchaQuestion}>What is {num1} + {num2}?</Text>
          <TextInput
            style={styles.captchaInput}
            placeholder="?"
            placeholderTextColor="#aaa"
            value={captchaAnswer}
            onChangeText={setCaptchaAnswer}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>


        <Link href="/resetpassword" asChild>
        <TouchableOpacity style={styles.forgotPasswordButtonContainer}>
          <Text style={styles.forgotPasswordLink}>Forgot Password?</Text>
        </TouchableOpacity>
        </Link>

      </View>


      {/* Login Button */}
      <TouchableOpacity
        style={[styles.button, (isLoginDisabled || loading) && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isLoginDisabled || loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/register" asChild replace={true}>
          <TouchableOpacity>
            <Text style={styles.link}>Register here</Text>
          </TouchableOpacity>
        </Link>
      </View>
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
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
     paddingRight: 60, 
  },
  eyeButton: {
    position: 'absolute', 
    right: 0,
    top: 0,
    bottom: 16,
    justifyContent: 'center',
    paddingHorizontal: 15, 
    zIndex: 1,
  },
  eyeButtonText: {
    color: "#A06CD5",
    fontWeight: "bold",
    fontSize: 14,
  },
  captchaForgotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
    // marginTop: 5,
  },

  forgotPasswordContainer: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  forgotPasswordLink: {
    color: "#A06CD5",
    fontWeight: "normal",
    fontSize: 14,
    // alignSelf: 'flex-start',
  },
  captchaRow: {
    flexDirection: 'row',
    // justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  captchaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captchaQuestion: {
    fontSize: 16,
    color: '#555',
    marginRight: 8,
    width: 135, // Adjust width for long question

  },
  captchaInput: {
    height: 45,
    width: 60,
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    // paddingHorizontal: 10,
    backgroundColor: "#fff",
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  forgotPasswordButtonContainer: {
    alignSelf: 'flex-start',
    // paddingTop: 2,
    // paddingVertical: 5,
    // paddingHorizontal: 5,
    marginTop: -5,
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
    backgroundColor: "#E0E0E0", 
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
});