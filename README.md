## Get started

1. Install dependencies

   ```bash
   npm install
   npx expo install @react-native-community/datetimepicker
   ```

2. Start the app

   ```bash
    npx expo start
   ```

## Current Version

### v12.5 - Enhanced API Security: TOTP Endpoints Now Require Firebase ID Token Authentication
*   All API calls to TOTP endpoints now require a valid Firebase ID Token (JWT) in the Authorization header.

#### TOTP Rate Limits

*   **Generating TOTP:** 5 requests per 10 minutes
*   **Verifying code and enabling TOTP:** 5 attempts per 15 minutes
*   **Verifying code in login:** 10 attempts per 10 minutes
*   **Verifying recovery code in login:** 5 attempts per 30 minutes
*   **Regenerating recovery codes:** 3 requests per 1 hour

Exceeding these limits will result in temporary restrictions on the respective actions.


## Changelog

v12 - First implementation of TOTP

v11 - major UI update
- added pet notes
- added analytics (history)
- for commands -> npx expo install react-native-chart-kit react-native-svg

v10 - implemented cloudflare turnstile captcha for login and bug fixes in app/index.tsx

v9 - added manually setting of food level (with automatic food deduction based on feed now and successful scheduled feed)

v8.2 - added captcha in register

v8.1 - added password checklist in change password and edited eye button in password fields

v8 - petfeeder/index UI OVERHAUL

(Note: Current readme is temporary)