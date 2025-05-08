// UPDATED REGISTER UI
// Changes made by me (Ryan):

// v2:
// fixed ui
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
} from "react-native";
import { Link, useRouter, useNavigation } from "expo-router";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebaseConfig";

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

  const validatePassword = (pass) => {
    setHasUpperCase(/[A-Z]/.test(pass));
    setHasLowerCase(/[a-z]/.test(pass));
    setHasNumber(/[0-9]/.test(pass));
    setHasSpecialChar(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass));
    setHasMinLength(pass.length >= 6);
  };

  const handleRegister = async () => {
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
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(userCredential.user);
      await auth.signOut(); 

      Alert.alert(
        "Verify Your Email",
        "Registration successful! A verification link has been sent. Please verify your email before logging in.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );

    } catch (error) {
        // console.error("Registration Error Details:", error);
        let errorMessage = "An unknown registration error occurred.";
         if (error.code === 'auth/email-already-in-use') { errorMessage = "This email is already registered. Please try logging in."; }
         else if (error.code === 'auth/invalid-email') { errorMessage = "Please enter a valid email address."; }
         else if (error.code === 'auth/weak-password') { errorMessage = "The password is too weak."; }
         else if (error.message) { errorMessage = error.message; }
        Alert.alert("Registration Error", errorMessage);
    } finally {
       setTimeout(() => setLoading(false), 100);
    }
  };

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
      {/* TouchableWithoutFeedback to dismiss keyboard when tapping outside inputs */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>

          {/* Top Logo Image - Reduced Size */}
          <Image
            source={require("../../assets/images/logo3.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Create Account</Text>

          {/* Input Fields Group */}
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

            <View style={styles.passwordContainer}>
              <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#888" value={password}
                onChangeText={(text) => { setPassword(text); validatePassword(text); }}
                secureTextEntry={!showPassword} autoComplete="new-password"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)} hitSlop={styles.hitSlop}>
                <Text style={styles.eyeButtonText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#888" value={confirmPassword}
                onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} autoComplete="new-password"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)} hitSlop={styles.hitSlop}>
                <Text style={styles.eyeButtonText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements Checklist */}
          <View style={styles.checklist}>
            <Text style={[styles.checkItem, hasMinLength ? styles.valid : styles.invalid]}> {hasMinLength ? '✓' : '•'} At least 6 characters </Text>
            <Text style={[styles.checkItem, hasUpperCase ? styles.valid : styles.invalid]}> {hasUpperCase ? '✓' : '•'} Uppercase letter (A-Z) </Text>
            <Text style={[styles.checkItem, hasLowerCase ? styles.valid : styles.invalid]}> {hasLowerCase ? '✓' : '•'} Lowercase letter (a-z) </Text>
            <Text style={[styles.checkItem, hasNumber ? styles.valid : styles.invalid]}> {hasNumber ? '✓' : '•'} Number (0-9) </Text>
            <Text style={[styles.checkItem, hasSpecialChar ? styles.valid : styles.invalid]}> {hasSpecialChar ? '✓' : '•'} Special character (!@#...) </Text>
            {confirmPassword && password !== confirmPassword && ( <Text style={[styles.checkItem, styles.invalid]}> ✗ Passwords do not match </Text> )}
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.button, isRegisterDisabled && styles.disabledButton]}
            onPress={handleRegister}
            disabled={isRegisterDisabled}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
          </TouchableOpacity>

          {/* Footer Link to Login */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild replace={true}>
              <TouchableOpacity>
                <Text style={styles.link}>Login here</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Bottom Image */}
          {/* remove if space is tight */}
          <Image
            source={require("../../assets/images/pets.png")}
            style={styles.bottomImage}
            resizeMode="contain"
          />

        </View>
      </TouchableWithoutFeedback>
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
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: 15,
    height: '100%', 
    justifyContent: 'center', 
    paddingHorizontal: 5, 
    zIndex: 1,
    bottom: 5,
  },
  eyeButtonText: {
    color: "#A06CD5",
    fontWeight: "bold",
    fontSize: 14,
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
  // Bottom image (optional, might need removal)
  bottomImage: {
    width: '80%',
    maxWidth: 200, 
    height: 80, 
    resizeMode: "contain",
    alignSelf: "center",
    marginTop: 10, 
  },

  hitSlop: {
      top: 10, bottom: 10, left: 10, right: 10
  }
});