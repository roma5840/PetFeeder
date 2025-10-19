<div align="center">
  <img src="./assets/images/logo3.png" alt="ASPetFeeder Logo" width="120">
  <h1>ASPetFeeder</h1>
  <p>
    A React Native mobile app to control and monitor an ESP32-powered smart pet feeder, featuring real-time controls, advanced scheduling, feeding analytics, and robust security with 2FA.
  </p>
</div>

# ASPetFeeder - Smart Pet Feeder Mobile App

ASPetFeeder is a comprehensive React Native mobile application designed to control and monitor a custom-built, ESP32-powered smart pet feeder. It leverages a Firebase backend for real-time data synchronization and user authentication, with a strong emphasis on security through features like Two-Factor Authentication (TOTP), device session management, and bot protection via Cloudflare Turnstile.

The application provides a user-friendly interface for pet owners to manage feeding schedules, dispense food manually, track their pet's consumption habits through analytics, and monitor the feeder's status from anywhere.

<details>
<summary>Click to view App Screenshots</summary>
<br>
<p align="center">
  <img src="https://cdn.imgchest.com/files/e74ed7d9f4f7.jpg" alt="Login Screen" width="200"/>
  <img src="https://cdn.imgchest.com/files/fd11cd7cc3e3.jpg" alt="Register Screen" width="200"/>
  <img src="https://cdn.imgchest.com/files/172217d0bea1.jpg" alt="Dashboard" width="200"/>
  <img src="https://cdn.imgchest.com/files/dd97a0a9d847.jpg" alt="Settings" width="200"/>
</p>
</details>

## Key Features

-   **Real-time Dashboard:** At-a-glance view of the feeder's online status, current food level, last feeding time, and next scheduled feeding.
-   **Manual & Scheduled Feeding:** Instantly dispense a custom amount of food or set up multiple, recurring daily schedules.
-   **Feeding History & Analytics:** View a detailed log of all feeding events and visualize daily consumption with an interactive line chart. History can be filtered by date range.
-   **Hopper Management:** Easily update the current food level in the hopper or add a specific amount after refilling.
-   **Pet Profile Management:** Store and update your pet's name, type (Dog/Cat), and weight.
-   **Pet Notes:** Keep track of important information about your pet with a simple note-taking feature.
-   **Secure User Authentication:**
    -   Standard email/password registration and login.
    -   Secure password reset functionality.
    -   **Cloudflare Turnstile CAPTCHA** on login, registration, and password reset to prevent bot abuse.
-   **Advanced Account Security:**
    -   **Two-Factor Authentication (TOTP):** Enable 2FA using any standard authenticator app (e.g. Google Authenticator, Authy) for an extra layer of security.
    -   **Recovery Codes:** Securely generated recovery codes to regain account access if your 2FA device is lost.
    -   **Device Session Management:** View all active sessions for your account and remotely log out any specific device or all other devices.
-   **Seamless Feeder Setup:** An intuitive in-app modal guides the user through connecting the ESP32 feeder to their home Wi-Fi network and linking it to their account.

## Installation & Getting Started

You can install the app directly on your Android device by downloading the latest `.apk` file.

### Prerequisites
*   An Android device (Android 8.0 or newer recommended).

### Installation Steps

1.  **Download the APK:**
    *   Go to the [**Releases Page**](https://github.com/roma5840/PetFeeder/releases) of this repository.
    *   Download the `.apk` file from the latest release (e.g. `v16.2.preview.apk`).

2.  **Enable "Install from Unknown Sources":**
    *   Before you can install the APK, you must allow your device to install apps from sources other than the Google Play Store.
    *   Navigate to your device's **Settings > Security** (or **Settings > Apps > Special app access** on newer Android versions).
    *   Find the option for **"Install unknown apps"** and enable it for your web browser (e.g. Chrome) or your file manager app.
    > **Note:** This is a standard Android security measure. You can disable it again after installing the app if you wish.

3.  **Install the App:**
    *   Open your device's file manager and navigate to your "Downloads" folder.
    *   Tap on the downloaded `.apk` file.
    *   A prompt will appear. Tap **"Install"** and wait for the installation to complete.
    *   Once finished, you can open the ASPetFeeder app from your app drawer.

## Tech Stack

-   **Frontend:** React Native (with Expo)
-   **Language:** TypeScript
-   **Navigation:** Expo Router
-   **Backend:** Firebase (Realtime Database, Authentication)
-   **Serverless Functions:** Cloudflare Workers (for Turnstile verification, TOTP management, and device session logic)
-   **Security:** Cloudflare Turnstile
-   **Hardware:** ESP32 Microcontroller

## Project Structure

The project follows a standard Expo Router (file-based routing) structure.

```
ASPetFeeder-Latest_Model/
├── app/                  # Main application source code
│   ├── components/       # Reusable React components
│   ├── confirm/          # Setup confirmation screen
│   ├── login/            # Login screen
│   ├── petfeeder/        # Main dashboard and functionality screen
│   ├── petname/          # Initial pet name setup screen
│   ├── register/         # Registration screen
│   ├── resetpassword/    # Password reset screen
│   ├── verify-totp/      # 2FA verification screen
│   ├── _layout.tsx       # Root layout, handles auth state and navigation
│   ├── AuthContext.tsx   # React Context for managing TOTP session state
│   ├── firebaseConfig.js # Firebase project configuration
│   └── index.tsx         # Initial setup screen (pet type selection)
├── assets/               # Static assets like images and fonts
├── plugins/              # Custom Expo config plugins
├── app.json              # Expo application configuration
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Usage Flow

1.  **Register/Login:** New users must register for an account and verify their email. Existing users can log in. Both flows are protected by a security check.
2.  **Initial Setup:** On the first login, the user is prompted to select their pet's type (Dog/Cat) and give their pet a name. This data is saved to their user profile in Firebase.
3.  **Feeder Connection:**
    -   Navigate to `Settings` -> `Connect New Feeder`.
    -   A modal will appear with instructions. The user must first connect their phone's Wi-Fi to the ESP32's hotspot (e.g. `PetFeeder-Setup`).
    -   Once connected, the user enters their home Wi-Fi SSID and password, along with their app password for verification.
    -   The app sends these credentials directly to the ESP32 over the local network. The ESP32 reboots, connects to the home Wi-Fi, and comes online.
4.  **Dashboard Interaction:** Once the feeder is connected, the main dashboard becomes fully functional, allowing the user to schedule feedings, feed manually, and monitor status.

## Hardware Component (ESP32)

The mobile app is the client for a physical pet feeder powered by an ESP32 microcontroller.

-   **Setup Mode:** On first boot (or if unconfigured), it creates a Wi-Fi Access Point (`PetFeeder-Setup`). It hosts a web server to receive configuration data from the mobile app.
-   **Operational Mode:** After configuration, it connects to the user's home Wi-Fi and Firebase.
-   **Real-time Listeners:** It listens for changes in the Firebase Realtime Database for:
    -   Manual feed commands (`/users/{uid}/commands/feedNow`).
    -   Schedule updates (`/users/{uid}/schedules`).
-   **Time Synchronization:** It uses NTP to get the current time, which is crucial for triggering schedules accurately.
-   **Servo Control:** It controls a servo motor to dispense the correct amount of food.
-   **Status Reporting:** It reports its online status and the details of the last feed back to Firebase.

## Acknowledgements

This project was a collaborative effort, and its success is due to the dedication of the entire team. Special thanks to:

-   **[Joey Mary Diolazo](https://github.com/Diolazo)** - Project Manager & Lead Documentarian. Guided the project's overall direction, authored the core technical documentation, and played a key role in hardware setup and application testing.
-   **[Angel Almazan](https://github.com/An-gell)** - UI/UX Designer. Designed the application's visual identity, including the color scheme and logo, while also contributing to the project documentation.
-   **[Jancesar Taguiang](https://github.com/siestayuna)** - Hardware and Testing Specialist. Collaborated on the physical ESP32 setup and performed essential real-world testing to ensure app and hardware reliability.
-   **[Nolibert Eligan](https://github.com/Noliel)** - Conceptual Design and App Flow. Developed the foundational concepts for the app's user flow and the initial dashboard layout.
-   **Jonas Soriano** - Provided valuable support in the preparation and review of the project documentation.