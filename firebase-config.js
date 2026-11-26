/*
  क्लाउड स्टोरेज + Google लॉगिन के लिए Firebase सेटअप (मुफ़्त Spark प्लान).

  1. console.firebase.google.com → Add project
  2. Build → Authentication → Get started → Sign-in method → Google → Enable
     Authentication → Settings → Authorized domains → Add domain:
        arveenargaming786-commits.github.io
  3. Build → Firestore Database → Create database → Production mode
     फिर Rules टैब में नीचे वाले नियम चिपकाकर Publish करें:

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{uid} {
              allow read, write: if request.auth != null && request.auth.uid == uid;
            }
          }
        }

  4. Project settings (⚙) → Your apps → Web (</>) → App बनाएँ → जो firebaseConfig मिले
     उसे नीचे `null` की जगह चिपकाएँ.

  नोट: Firebase का web config गुप्त नहीं होता; असली सुरक्षा ऊपर के Rules से होती है.
  जब तक config खाली (null) है, ऐप पहले की तरह सिर्फ़ फ़ोन की मेमोरी में चलता है.
*/
window.FIREBASE_CONFIG = null;

/* उदाहरण:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "आपका-प्रोजेक्ट.firebaseapp.com",
  projectId: "आपका-प्रोजेक्ट",
  appId: "1:123456789:web:abcdef"
};
*/
