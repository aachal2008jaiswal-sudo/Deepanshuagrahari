// Firebase Admin SDK: server-side only. Never put service-account keys in browser JS.
require("dotenv").config();
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is missing in .env");
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
    ...(storageBucket ? { storageBucket } : {})
  });
}

const db = admin.firestore();
const bucket = process.env.FIREBASE_STORAGE_BUCKET ? admin.storage().bucket() : null;

module.exports = { admin, db, bucket };
