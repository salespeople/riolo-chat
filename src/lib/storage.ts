
'use client';

import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { FirebaseApp } from "firebase/app";
import { Auth } from "firebase/auth";

export function uploadFile(
  app: FirebaseApp,
  auth: Auth,
  file: File,
  basePath: 'uploads' | 'quickReplies',
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const user = auth.currentUser;
    if (!user) {
      const error = new Error("User not authenticated. Cannot upload file.");
      console.error(error.message);
      return reject(error);
    }

    let filePath: string;

    if (basePath === 'quickReplies') {
      // Logic for shared quick replies folder, as requested.
      filePath = `${basePath}/${file.name}`;
    } else {
      // Secure, user-specific path for other uploads.
      const userId = user.uid;
      filePath = `${basePath}/${userId}/${Date.now()}-${file.name}`;
    }

    const storage = getStorage(app);
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        console.error("Upload fallito:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error("Errore nel recuperare l'URL:", error);
          reject(error);
        }
      }
    );
  });
}
