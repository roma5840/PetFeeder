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

NOTES DON'T MIND ME LUL:\
Current features (v7 -> dled to 7z):
   > Delete Account and Logout in petfeeder->index

   > Login & Register

   > Register -> Password checklist(number, uppercase, lowercase, special, min. 6 char)

   > Email Verification

   > Captcha (only in login -> numeric captcha)


Planned:
   > Add sidebar drawer on homepage (petfeeder->index) (ui)

   > Sidebar drawer includes:\
      >> Logout and Delete account\
      >> Add "new schedule" button\
      >> Edit button -> petname and pettype(?)

   > Also make it so that every login must not prompt user to add new pet name\
      >> (If one pet name exists, then user must immediately go to petfeeder->index)

Important: scheduling.

Also, another planned feature is binding expo app to esp32 (use mac address and display mac address, print it to paper, and make it so that users could bind their accounts to that specific mac address and that only they can have access to that specific mac address -- other users would not be able to scan and bind their accounts if the mac address has already been bound to one account)

readme v7.1.1
