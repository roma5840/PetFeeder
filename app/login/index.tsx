import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, BackHandler, Image } from "react-native";
import { Link, useRouter, useNavigation  } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
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
    if (!email || !password) {
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (!userCredential.user.emailVerified) {
        await auth.signOut();
        Alert.alert("Email Not Verified", "Please verify your email before logging in.");
        return;
      }
      
      // IF USER HAS EXISTING DATA
      const db = getDatabase();
      const userRef = ref(db, `users/${userCredential.user.uid}`);
      const snapshot = await get(userRef);
  
      if (snapshot.exists() && snapshot.val().petName) {
        router.replace("/petfeeder"); // GO TO PETFEEDER INDEX IF HAS EXISTING DATA
      } else {
        router.replace("/"); // IF NEW USER
      }
    } catch (error) {
      Alert.alert("Login Error", error.message);
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

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
          onChangeText={setPassword}
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

      <View style={styles.captchaContainer}>
        <Text style={styles.captchaQuestion}>What is {num1} + {num2}?</Text>
        <TextInput
          style={styles.captchaInput}
          placeholder="Enter answer"
          value={captchaAnswer}
          onChangeText={setCaptchaAnswer}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Loading..." : "Login"}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text>Don't have an account? </Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    bottom: 90,
    marginBottom: 30,
    textAlign: "center",
  },

  logo: {
    width: 300,
    height: 300,
    bottom: 70,
    alignSelf: 'center',
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    bottom: 100,
    padding: 10,
    marginBottom: 15,
    backgroundColor: "#DEC9E9",
  },

  button: {
    backgroundColor: "#DEC9E9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    bottom: 90,
    marginTop: 5, // Reduced to move the button higher
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: -5, // Move button text higher
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    bottom: 80,
    marginTop: 10, // Move footer higher
  },

  link: {
    color: "#B185DB",
    fontWeight: "bold",
    marginTop: 0, // Move link higher
  },

  captchaContainer: {
    marginBottom: 10, // Move container higher
  },

  captchaQuestion: {
    fontSize: 16,
    bottom: 110,
    marginBottom: 2, // Reduce space below
    marginTop: -5,   // Move question higher
  },

  captchaInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#A06CD5",
    borderRadius: 8,
    bottom: 100,
    padding: 10,
    backgroundColor: "#DEC9E9",
    marginTop: -5, // Move input higher
  },

  passwordContainer: {
    position: "relative",
    justifyContent: "center",
  },
  eyeButton: {
    position: "absolute",
    right: 10,
    bottom: "155%",
    transform: [{ translateY: -23 }],
    padding: 5,
    zIndex: 1, // Add this to bring the button to the front
  },
  eyeButtonText: {
    color: "#007bff",
    fontWeight: "bold",
    fontSize: 14,
  },
});