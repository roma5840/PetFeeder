## Current Version

### v16.2 - add cleartexttraffic (v16.1 increase timeout to 30 seconds)

### v13.5 - Major TOTP Backend Update
1.  **Per-User Encrypted TOTP Secrets:**
    *   Each user's core TOTP secret (used to generate 2FA codes) is now individually encrypted at rest within their dedicated Cloudflare Durable Object instance (Old version had a specified "Master Key").
    *   A unique AES-GCM encryption key is generated and managed per-user within the Durable Object. This key is used to encrypt and decrypt that specific user's TOTP secret.

2.  **JWT Verification with 'jose':**
    *   User authentication (via Firebase ID Tokens) is now handled using 'jose' library.

3.  **Secure Handling of Recovery Codes:**
    *   While users receive plain-text recovery codes for their own safekeeping, the backend only stores cryptographically secure hashes (SHA-256) of these codes.
    *   When a recovery code is used, the provided plain code is hashed and then compared against the stored hashes within the user's Durable Object.
    *   The original recovery codes cannot be reconstructed from server-side storage. This protects recovery codes even if the backend data store were to be exposed.

4. **Other Notes:**
    *   All user-specific TOTP state (encrypted secret, initialization vector, hashed recovery codes, rate limit counters) is managed within a Durable Object instance unique to each user.
    *   Endpoint-specific rate limits are enforced per user via their Durable Object.

#### Previous Versions
*   **v13.2:** Bug fix in verify-totp where users could potentially bypass due to bugs in login persistence.
*   **v13.1:** Added login persistence: Users remain logged in even after closing the app or removing it from multitasking.

#### General Changes in v13:
*   Device Management: Users can now log out specific devices or all devices at once.
*   2FA Requirement for Session Control: Users must enable two-factor authentication (2FA) to remove device sessions.
*   OTA Update Support: Added support for over-the-air updates for preview builds using EAS.
*   Command Executed: npx expo install expo-application

## Usage on EAS Build
*   EAS builds are only used if there are custom native modules (e.g. soon-to-be-implemented BLE feature for ESP32 connection)
*   Note to team: using EAS to build the app would take time, and using 'npx expo start' is more suitable for local development (unless of course it's for the BLE feature, in which case you have to create your own expo account and link this project to your own expo account and build it with EAS to be able to accurately test the BLE feature).

```
npm install -g eas-cli 
OR 
npm insatll --save-dev eas-cli (for local directory only)
```

*   Remove 'npx' if installed globally
*   No need to build/configure

```
npx eas login
npx eas project:init 
npx eas build:configure
```

```
npx eas build -p android --profile preview
OR
npx eas build -p android --profile development
npx expo start --dev-client (for development)
```

*   Preview profile is how it would look like if deployed for production (apk file)
*   Development profile is just like doing 'npx expo start' and scanning the QR using expo go app in android (which means hot reloading is supported). Use it if there are custom native modules (e.g. planned feature of react-native-ble-plx for BLE for the app to ESP32)

## TOTP Backend Security Features

### Summary

*   **Authentication:** Firebase JWT via jose
*   **Authorization:** User can only affect their own Durable Object
*   **Data at Rest Protection:** AES-GCM for TOTP secret in Durable Object
*   **Data in Transit Protection:** HTTPS (Cloudflare Workers)
*   **Brute-Force Protection:** Rate limiting on critical actions
*   **Secret Management:** TOTP secret encrypted, recovery codes hashed & consumed
*   **Encryption:** Strong crypto algorithms (crypto.subtle) and secure random number generation (crypto.getRandomValues)
*   **Input Validation**

### TOTP Rate Limits

*   **Generating TOTP:** 5 requests per 10 minutes
*   **Verifying code and enabling TOTP:** 5 attempts per 15 minutes
*   **Verifying code in login:** 10 attempts per 10 minutes
*   **Verifying recovery code in login:** 5 attempts per 15 minutes
*   **Regenerating recovery codes:** 5 requests per 1 hour

### Notes
*    As explained, TOTP Rate Limits apply per user (not per IP)
*    Reauthentication is needed for enabling 2FA, regenerating recovery codes, and disabling 2FA

## Device Logging Key Features

*   **Automatic Device Registration:** When a user logs in, their device is automatically registered with a unique ID and its type (e.g., iOS, Android) is recorded. The IP Address is also recorded.
*   **Last Active Tracking:** The system keeps track of the last time each device communicated with the server.
*   **"Online" Status:** Devices that have recently sent a heartbeat (within the last ~30 seconds) are shown as "Online".
*   **Location Indication:** An approximate geographical location (country) for each session is displayed (still needs further testing).
*   **Session Viewing:** Users can access a list in their account settings showing:
    *   Currently active devices.
    *   Devices pending logout (remotely instructed to log out).
    *   Recently logged out devices.
*   **Manage Other Sessions:**
    *   **Remotely Log Out Specific Device:** Users can select another device from their list and instruct it to log out. The target device will be logged out upon its next activity check with the server (typically within 30 seconds).
    *   **Remotely Log Out All Other Devices:** Users can log out all sessions except the current one. This also invalidates older session tokens for enhanced security.

### Notes
*    All communication with the server for device management is encrypted and authenticated.
*    The "Online" status is based on recent heartbeats. A device might appear "Offline" if it hasn't sent a heartbeat recently, even if the app is technically still open.
*    Remote logouts are enforced when the targeted device next communicates with the server. This typically happens within its heartbeat interval (around 30 seconds).
*    2FA must be enabled to be able to log out other devices.


## Changelog

v12.5 - Enhanced API Security: TOTP Endpoints Now Require Firebase ID Token Authentication
*   All API calls to TOTP endpoints now require a valid Firebase ID Token (JWT) in the Authorization header.

v12 - First implementation of TOTP

v11 - major UI update
*   added pet notes
*   added analytics (history)
*   for commands -> npx expo install react-native-chart-kit react-native-svg

v10 - implemented cloudflare turnstile captcha for login and bug fixes in app/index.tsx

v9 - added manually setting of food level (with automatic food deduction based on feed now and successful scheduled feed)

v8.2 - added captcha in register

v8.1 - added password checklist in change password and edited eye button in password fields

v8 - petfeeder/index UI OVERHAUL

(Note: Current readme is temporary)