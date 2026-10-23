# Education Coaching Centre — Firebase Backend (Hindi setup)

## महत्वपूर्ण
यह backend आपके मौजूदा `portal.html`/`portal.css` के डिजाइन को नहीं बदलता। लेकिन `server.js` को Firebase वाला backend बनाने के लिए बदला गया है। पहले पूरे मौजूदा प्रोजेक्ट का backup/ZIP रखें। यह starter आपके पुराने AI solver और AI question-generator को स्वतः migrate नहीं करता; `server.js` में वे endpoints साफ संदेश देंगे कि Gemini route merge करना बाकी है।

## फाइलें
- `server.js`: Express server और API route mounting
- `firebase.js`: Firebase Admin SDK / Firestore / Storage
- `routes/auth.js`: login/register
- `routes/students.js`: Add/list/update/archive student
- `routes/tests.js`: test publish/list, answer submission, ranking
- `routes/attendance.js`: student check-in, teacher/admin manual attendance
- `routes/fees.js`: fee entry/list/student fee history
- `routes/materials.js`: PDF/image upload to Firebase Storage
- `routes/classes.js`: live timetable
- `routes/admin.js`: admin user list/role management/announcement/admin bootstrap
- `routes/dashboard.js`, `routes/me.js`: existing portal endpoints
- `firestore.rules`: deny browser-direct database access
- `.env.example`: server environment variables

## Firebase को शुरू से सेट करें
1. https://console.firebase.google.com/ खोलें और Add project चुनें।
2. Project ID नोट करें।
3. Build > Firestore Database > Create database चुनें। शुरुआत में production mode रखें।
4. Build > Storage > Get started करें और bucket बना लें।
5. Project settings > Service accounts > Generate new private key से JSON डाउनलोड करें। इसे GitHub/public folder में कभी न रखें।
6. अपने कंप्यूटर पर Node.js 18+ install करें।
7. इस प्रोजेक्ट folder में `npm install` चलाएँ।
8. `.env.example` की कॉपी बनाकर उसका नाम `.env` रखें। Project ID, Storage bucket, ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET भरें।
9. Firebase service-account JSON को project folder से बाहर सुरक्षित रखें और `GOOGLE_APPLICATION_CREDENTIALS` में उसका पूरा path दें। Hosting पर deploy करने पर hosting provider की secret/environment-variable व्यवस्था इस्तेमाल करें।
10. `.env` और service-account JSON को GitHub पर commit न करें।
11. `ADMIN_SETUP_TOKEN` को `.env` में एक बार के लिए एक लंबा random secret दें। Server चलाएँ: `npm start`
12. Admin बनाने के लिए एक बार POST `/api/admin/bootstrap-admin` पर `x-setup-token: <ADMIN_SETUP_TOKEN>` header भेजें। Admin बनने के बाद `.env` से `ADMIN_SETUP_TOKEN` हटा दें और server restart करें। इसे public browser form में न डालें।
13. `http://localhost:3000/portal` खोलें।

## जरूरी API
सभी API calls में login के बाद `Authorization: Bearer <token>` header लगेगा।
- `POST /api/students` — admin/teacher; JSON: `name`, `className`, वैकल्पिक `board`, `rollNumber`, `phone`, `guardianName`, `guardianPhone`, `address`, `email`
- `GET /api/students` — admin/teacher
- `PATCH /api/students/:id` — admin/teacher
- `DELETE /api/students/:id` — admin archive करता है (रिकॉर्ड वास्तव में delete नहीं होता)
- `POST /api/tests` — admin/teacher; JSON: `title`, `className`, `subject`, `questions:[{question,options,answer,marks,explanation}]`; answer 0-based option index है
- `GET /api/tests`, `POST /api/tests/:id/submit`, `GET /api/tests/:id/ranking`
- `GET /api/attendance`, `POST /api/attendance/checkin`, `POST /api/attendance/manual`
- `GET /api/fees` — admin/teacher; `POST /api/fees` — admin/teacher; JSON: `studentId`, `amount`, `paid`, optional `month`, `paymentDate`, `method`, `note`
- `GET /api/fees/student/:studentId` — student अपना रिकॉर्ड; teacher/admin किसी का रिकॉर्ड
- `GET /api/materials`, `POST /api/materials` multipart form fields `title`, `subject`, `className`, `file`
- `GET /api/classes`, `POST /api/classes`
- `GET /api/dashboard`, `GET /api/me`, `GET /api/admin/users`

## मौजूदा UI के साथ compatibility नोट
पुराना `portal.js` tests/attendance/classes/materials/dashboard/login endpoints से मेल खाता है। लेकिन मौजूदा `portal.html` में Student Records और Fees के forms/panels नहीं हैं। इसलिए उन APIs का उपयोग Postman/Thunder Client से किया जा सकता है; UI में Add Student और Fees स्क्रीन दिखाने के लिए अलग panel markup और `portal.js` handlers जोड़ने होंगे। वेबसाइट का visual design बदले बिना इन्हें मौजूदा cards/classes से match कराया जा सकता है।

## सुरक्षा और डेटा
- `service-account.json`, `.env`, passwords, JWT secret कभी public repository में न रखें।
- बच्चों की व्यक्तिगत जानकारी केवल जरूरी सीमा तक रखें; HTTPS, नियमित backup, अभिभावक की उपयुक्त सहमति और privacy notice की व्यवस्था करें।
- Firebase Storage signed file links 60 मिनट में expire होते हैं; सूची में पुराने URL को फिर जारी करने के लिए production में authenticated download endpoint जोड़ें।
- पहले dummy/test records से परीक्षण करें। वास्तविक बच्चों का डेटा डालने से पहले backup और access control जाँचें।
- Firebase Admin SDK Firestore rules को bypass करता है, इसलिए backend में role checks अनिवार्य हैं।
- यह starter code है; production deployment से पहले test environment में login, roles, uploads, rankings, fees और recovery flow जाँचें।
