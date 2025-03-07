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

Current features (v7.2 -> undled to 7z):
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

readme v7.2

Changelog:

v7.2:
- Added show/hide button in login and register

v7:
- Added captcha

v6:
- Added delete account button in PetFeeder->index
- Added email verification

v5:
- Base login/register
- Features: login, register, schedule syncing to firebase realtime database instead of asyncstorage