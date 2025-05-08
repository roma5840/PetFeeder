// UPDATED REGISTER UI
// Changes made by me (Ryan):

// v8.2:
// add captcha in register
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
import Icon from "react-native-vector-icons/Ionicons";

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

  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [expectedAnswer, setExpectedAnswer] = useState(0);

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

  useEffect(() => {
    generateCaptcha();
  }, []);

  const validatePassword = (pass) => {
    setHasUpperCase(/[A-Z]/.test(pass));
    setHasLowerCase(/[a-z]/.test(pass));
    setHasNumber(/[0-9]/.test(pass));
    setHasSpecialChar(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pass));
    setHasMinLength(pass.length >= 6);
  };

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 10) + 1;
    const n2 = Math.floor(Math.random() * 10) + 1;
    setNum1(n1);
    setNum2(n2);
    setExpectedAnswer(n1 + n2);
    setCaptchaAnswer("");
  };

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword || !captchaAnswer.trim()) {
      Alert.alert("Missing Information", "Please fill in all fields, including the CAPTCHA.");
      return;
    }

    if (parseInt(captchaAnswer) !== expectedAnswer) {
      Alert.alert("CAPTCHA Error", "Incorrect CAPTCHA answer. Please try again.");
      generateCaptcha();
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
        generateCaptcha();
    } finally {
       setTimeout(() => setLoading(false), 100);
    }
  };

  const isCaptchaCorrect = parseInt(captchaAnswer, 10) === expectedAnswer;
  const isFormValid = Boolean(
    email.trim() && password && confirmPassword &&
    hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && hasMinLength &&
    password === confirmPassword &&
    captchaAnswer.trim() && isCaptchaCorrect
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

          {/* CAPTCHA Section */}
          <View style={styles.captchaSection}>
            <Text style={styles.captchaQuestion}>What is {num1} + {num2}?</Text>
            <TextInput
              style={styles.captchaInput}
              placeholder="?"
              placeholderTextColor="#888"
              value={captchaAnswer}
              onChangeText={setCaptchaAnswer}
              keyboardType="number-pad"
              maxLength={2}
            />
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
            onPress={handleRegister}
            disabled={isRegisterDisabled}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
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
    // height: 48,
  },
  passwordInputText: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 15,
    paddingRight: 10,
    fontSize: 16,
    color: '#333',
  },
  passwordToggleIcon: {
    padding: 12,
  },
  hitSlop: {
      top: 10, bottom: 10, left: 10, right: 10
  },

  captchaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    // marginTop: 5, // space after input
    // marginBottom: 5, // space before checklist
    paddingLeft: 5, 
  },
  captchaQuestion: {
    fontSize: 15,
    color: '#555',
    marginRight: 10,
  },
  captchaInput: {
    height: 45,
    width: 60,
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
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
});