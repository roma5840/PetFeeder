import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, BackHandler, Image } from "react-native";
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
      gestureEnabled: false
    });
  
    const handleBackPress = () => true;
    BackHandler.addEventListener("hardwareBackPress", handleBackPress);
  
    return () => {
      BackHandler.removeEventListener("hardwareBackPress", handleBackPress);
    };
  }, [navigation]);

  const validatePassword = (pass) => {
    setHasUpperCase(/[A-Z]/.test(pass));
    setHasLowerCase(/[a-z]/.test(pass));
    setHasNumber(/[0-9]/.test(pass));
    setHasSpecialChar(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass));
    setHasMinLength(pass.length >= 6);
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords don't match");
      return;
    }

    if (!(hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar)) {
      Alert.alert("Error", "Password does not meet all requirements");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await sendEmailVerification(userCredential.user);
      
      // await auth.signOut();
      
      Alert.alert(
        "Verify Your Email",
        "A verification link has been sent to your email. Please verify your account before logging in."
      );
      router.replace("/login");
    } catch (error) {
      Alert.alert("Registration Error", error.message);
    } finally {
      setLoading(false);
    }
  
  };

  const isFormValid = Boolean(
    email &&
    password &&
    confirmPassword &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar &&
    hasMinLength &&
    password === confirmPassword
  );

  return (
    <View style={styles.container}>

      {/* Top Image */}
      <Image
        source={require("../../assets/images/logo3.png")}
        style={styles.image}
      />

      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            validatePassword(text);
          }}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Text style={styles.eyeButtonText}>
            {showPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Text style={styles.eyeButtonText}>
            {showConfirmPassword ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Password Requirements Checklist */}
      <View style={styles.checklist}>
        <Text style={[styles.checkItem, hasMinLength && styles.valid]}>
          {hasMinLength ? '✓' : '✗'} At least 6 characters
        </Text>
        <Text style={[styles.checkItem, hasUpperCase && styles.valid]}>
          {hasUpperCase ? '✓' : '✗'} Uppercase character
        </Text>
        <Text style={[styles.checkItem, hasLowerCase && styles.valid]}>
          {hasLowerCase ? '✓' : '✗'} Lowercase character
        </Text>
        <Text style={[styles.checkItem, hasNumber && styles.valid]}>
          {hasNumber ? '✓' : '✗'} Numeric character
        </Text>
        <Text style={[styles.checkItem, hasSpecialChar && styles.valid]}>
          {hasSpecialChar ? '✓' : '✗'} Special character
        </Text>
      </View>

      <TouchableOpacity 
        style={isFormValid  ? styles.button : styles.disabledButton} 
        onPress={handleRegister}
        disabled={loading || !isFormValid }
      >
        <Text style={styles.buttonText}>
        {loading ? "Loading..." : "Register"}
        </Text>
      </TouchableOpacity>

      {/* Bottom Image */}
      <Image
        source={require("../../assets/images/pets.png")}
        style={styles.bottomImage}
      />

      <View style={styles.footer}>
        <Text>Already have an account? </Text>
        <Link href="/login" asChild replace={true}>
          <TouchableOpacity>
            <Text style={styles.link}>Login here</Text>
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
    alignItems: "center", // Centers the image horizontally
  },

  title: {
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 10,
    top: 50,
    textAlign: "center",
  },

   input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    padding: 5,
    top: 60,
    marginBottom: 10,
    backgroundColor: "#DEC9E9",
    width: "100%", // Ensures inputs align properly
  },

   button: {
    backgroundColor: "#A06CD5",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    top: 70,
    width: "100%",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 90,
  },

  link: {
    color: "#B185DB",
    fontWeight: "bold",
  },

  checklist: {
    marginVertical: 10,
    width: "100%", // Ensures checklist aligns properly
  },

  checkItem: {
    color: '#ff0000',
    fontSize: 13,
    bottom: 10,
    top: 60,
    marginVertical: 2,
  },

  valid: {
    color: '#00aa00',
  },

  disabledButton: {
    backgroundColor: "#DEC9E9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    top: 45,
    width: "100%",
  },

  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: 10,
    top: '150%',
    transform: [{ translateY: -23 }],
    padding: 5,
  },
  eyeButtonText: {
    color: "#007bff",
    fontWeight: "bold",
    fontSize: 14,
  },

  image: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    position: 'absolute', // Take it out of normal flow
    bottom: 650,              // Adjust as needed
    alignSelf: 'center',  // Center horizontally
  },

  bottomImage: {
    width: 350,
    height: 300,
    resizeMode: "contain",
    top: 200,
    marginTop: 500,
    position: 'absolute',
    alignSelf: "center",
  },
});