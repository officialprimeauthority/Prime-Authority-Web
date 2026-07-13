import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let authInstance = null;

function getDatabaseUrl() {
  return process.env.FIREBASE_DATABASE_URL?.trim() || 'https://prime-authority-default-rtdb.asia-southeast1.firebasedatabase.app';
}

function getServiceAccountConfig() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    const resolvedPath = path.resolve(serviceAccountPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Firebase service account file not found at: ${resolvedPath}. Create the file from your Firebase project settings and set FIREBASE_SERVICE_ACCOUNT_PATH to its path.`);
    }

    try {
      return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } catch (error) {
      throw new Error(`Firebase service account file is invalid JSON: ${resolvedPath}`);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables. Please place a service-account.json file and set FIREBASE_SERVICE_ACCOUNT_PATH, or set FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.');
  }

  return {
    project_id: projectId,
    client_email: clientEmail,
    private_key: privateKey,
  };
}

export function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    authInstance = admin.auth();
    return authInstance;
  }

  const serviceAccount = getServiceAccountConfig();

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
    databaseURL: getDatabaseUrl(),
  });

  authInstance = admin.auth();
  return authInstance;
}

export function getFirebaseAuth() {
  if (!authInstance) {
    initializeFirebaseAdmin();
  }
  return authInstance;
}

export default admin;
