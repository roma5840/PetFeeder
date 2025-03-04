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

NOTES DON'T MIND ME LUL:
Current features (v6):
   > Delete Account and Logout in petfeeder->index

   > Login & Register

   > Register -> Password checklist(number, uppercase, lowercase, special, min. 6 char)


Planned:
   > Captcha (possibly math captcha on login page only)

   > Add sidebar drawer on homepage (petfeeder->index)

   > Sidebar drawer includes:\
      >> All pet names, and pet names with their corresponding time/schedule\
      >> Logout and Delete account\
      >> Add "new schedule" button

   > Also make it so that every login must not prompt user to add new pet name\
      >> (If one pet name exists, then user must immediately go to petfeeder->index)

If possible, maybe remove pet naming since it might be kinda useless. Important: scheduling.

Also, another planned feature is binding expo app to esp32 (use mac address and display mac address, print it to paper, and make it so that users could bind their accounts to that specific mac address and that only they can have access to that specific mac address -- other users would not be able to scan and bind their accounts if the mac address has already been bound to one account)

