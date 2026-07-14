# Prime Authority Backend

## Firebase Admin setup

1. Go to Firebase Console -> Project Settings -> Service accounts.
2. Click "Generate new private key".
3. Download the JSON file.
4. Place the downloaded JSON file inside the `backend` folder.
5. Make sure your `.env` contains:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./prime-authority-firebase-adminsdk-fbsvc-d9e79fb7b8.json
```

## Run the server

```bash
npm install
npm start
```
