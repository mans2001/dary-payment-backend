# 🏠 Dartech Payment System — دليل التشغيل الكامل

نظام دفع متكامل لـ Dartech AI Smart Home باستخدام InstaPay مع التحقق اليدوي.

---

## 📁 هيكل المشروع

```
dartech/
├── dartech-backend/          ← Node.js + Express (الـ Backend)
│   ├── index.js              ← نقطة البداية
│   ├── .env                  ← متغيرات البيئة (مش على GitHub)
│   ├── .env.example          ← مثال على المتغيرات
│   ├── schema.sql            ← قاعدة البيانات
│   ├── routes/
│   │   ├── payment.js        ← routes الدفع
│   │   └── admin.js          ← routes الإدارة
│   ├── middleware/
│   │   └── auth.js           ← حماية الـ Admin
│   └── lib/
│       ├── supabase.js       ← اتصال قاعدة البيانات
│       └── cloudinary.js     ← رفع الصور
│
└── dartech-v2/               ← Frontend (HTML/CSS/JS)
    ├── vercel.json           ← إعدادات Vercel
    └── frontend/
        ├── index.html        ← الصفحة الرئيسية
        ├── checkout.html     ← صفحة الدفع
        ├── success.html      ← بعد الإرسال
        └── admin.html        ← لوحة الإدارة
```

---

## 🔁 كيف يعمل النظام

```
Mobile App
    │
    ▼
POST /create-payment ──► Supabase (ينشئ سجل payment)
    │
    ▼
WebView: /checkout?payment_id=XXX
    │
    ▼
GET /payment/:id ──► يجيب تفاصيل الدفع
    │
    ▼
المستخدم يدفع عبر InstaPay
    │
    ▼
POST /upload-proof ──► Cloudinary (الصورة) + Supabase (البيانات)
    │
    ▼
/success.html
    │
    ▼
Admin يفتح /admin ويراجع ويوافق أو يرفض
    │
    ▼
POST /admin/approve ──► Supabase: payment=approved + subscription=active
```

---

## ⚙️ المتطلبات

- Node.js v18 أو أحدث
- حساب [Supabase](https://supabase.com) مجاني
- حساب [Cloudinary](https://cloudinary.com) مجاني
- حساب [ngrok](https://ngrok.com) مجاني (للتشغيل المحلي)
- حساب [Vercel](https://vercel.com) مجاني (للـ Frontend)

---

## 🗄️ STEP 1 — إعداد Supabase

### 1. إنشاء المشروع
- روح [supabase.com](https://supabase.com)
- اضغط **New Project**
- اختار اسم ومنطقة (افضل: EU West)
- انتظر حتى يخلص الإنشاء

### 2. تشغيل الـ Schema
- روح **SQL Editor** من القائمة الجانبية
- افتح ملف `dartech-backend/schema.sql`
- الصق المحتوى كله واضغط **Run**
- المفروض تشوف: `Success. No rows returned`

### 3. جلب البيانات المطلوبة
- روح **Settings → API**
- احفظ:
  ```
  Project URL    → SUPABASE_URL
  service_role   → SUPABASE_SERVICE_KEY  ⚠️ مش anon key
  ```

---

## ☁️ STEP 2 — إعداد Cloudinary

### 1. إنشاء الحساب
- روح [cloudinary.com](https://cloudinary.com)
- اضغط **Sign Up Free**

### 2. جلب البيانات
- من الـ Dashboard احفظ:
  ```
  Cloud Name  → CLOUDINARY_CLOUD_NAME
  API Key     → CLOUDINARY_API_KEY
  API Secret  → CLOUDINARY_API_SECRET
  ```

---

## 🖥️ STEP 3 — تشغيل الـ Backend محلياً

### 1. تثبيت الـ Dependencies
```bash
cd dartech-backend
npm install
```

### 2. إنشاء ملف .env
```bash
cp .env.example .env
```

### 3. تعبئة ملف .env
```bash
nano .env
```

حط البيانات دي:
```env
# Supabase
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret

# Admin
ADMIN_PASSWORD=DartechAdmin2025

# App
PORT=3000
FRONTEND_URL=https://dary-payment-front.vercel.app

# InstaPay
INSTAPAY_ACCOUNT=dartech@instapay
INSTAPAY_HOLDER=Dartech Technologies
SUBSCRIPTION_PRICE_USD=20
```

احفظ: `CTRL+X` ثم `Y` ثم `Enter`

### 4. تشغيل الـ Server
```bash
node index.js
```

المفروض يظهر:
```
╔══════════════════════════════════════╗
║  Dartech Backend                     ║
║  Port: 3000                          ║
╚══════════════════════════════════════╝
```

⚠️ **خلي هذا الـ Terminal مفتوح دايماً**

---

## 🌐 STEP 4 — تشغيل ngrok

### 1. افتح Terminal جديد (تاني)

### 2. شغّل ngrok
```bash
ngrok http 3000
```

### 3. احفظ الـ URL
هيظهر كده:
```
Forwarding   https://xxxx-xxxx.ngrok-free.app → localhost:3000
```
احفظ الـ URL ده — هتحتاجه في الخطوة الجاية.

### 4. اختبر إن الـ Backend شغال
افتح في البراوزر:
```
https://xxxx-xxxx.ngrok-free.app/health
```
اضغط **Visit Site** لو ظهر warning.

المفروض يرجع:
```json
{"status":"ok","service":"dartech-payment-backend"}
```

---

## 🔗 STEP 5 — ربط الـ Frontend بالـ Backend

### 1. افتح checkout.html وغيّر السطر ده
```javascript
const API = 'https://xxxx-xxxx.ngrok-free.app'; // ← URL بتاع ngrok
```

### 2. افتح admin.html وغيّر نفس السطر
```javascript
const API = 'https://xxxx-xxxx.ngrok-free.app'; // ← URL بتاع ngrok
```

### 3. ارفع الـ Frontend على Vercel
```bash
cd dartech-v2
git add .
git commit -m "connect backend"
git push
```
Vercel هيعمل deploy تلقائي ✅

---

## 🧪 STEP 6 — اختبار النظام كامل

### Test 1 — إنشاء Payment
```bash
curl -X POST https://xxxx-xxxx.ngrok-free.app/create-payment \
  -H "Content-Type: application/json" \
  -H "ngrok-skip-browser-warning: true" \
  -d '{"user_id": "00000000-0000-0000-0000-000000000001"}'
```

النتيجة المتوقعة:
```json
{
  "success": true,
  "payment_id": "xxxx-xxxx-xxxx",
  "reference": "DTX-XXXXXXXX",
  "checkout_url": "https://dary-payment-front.vercel.app/checkout?payment_id=xxx"
}
```

### Test 2 — صفحة الـ Checkout
```
https://dary-payment-front.vercel.app/checkout?payment_id=<payment_id من فوق>
```

المفروض تشوف:
- ✅ المبلغ $20
- ✅ حساب InstaPay
- ✅ الـ Reference Code

### Test 3 — لوحة الـ Admin
```
https://dary-payment-front.vercel.app/admin
```
- ادخل الـ Password: `DartechAdmin2025`
- المفروض تشوف الـ Dashboard

---

## 📡 API Reference

| Method | Route | الوصف |
|--------|-------|-------|
| `GET`  | `/health` | التحقق من تشغيل الـ Server |
| `POST` | `/create-payment` | إنشاء payment جديد |
| `GET`  | `/payment/:id` | جلب تفاصيل payment |
| `POST` | `/upload-proof` | رفع إثبات الدفع |
| `GET`  | `/admin/payments` | قائمة الـ payments للأدمن |
| `GET`  | `/admin/stats` | إحصائيات الـ payments |
| `POST` | `/admin/approve` | الموافقة على payment |
| `POST` | `/admin/reject` | رفض payment |

---

## 🔐 الأمان

| العنصر | الوصف |
|--------|-------|
| `SUPABASE_SERVICE_KEY` | في الـ Backend فقط — لا يُرسل للـ Frontend أبداً |
| `ADMIN_PASSWORD` | في الـ Backend فقط — يُرسل كـ Bearer token |
| RLS | مفعّل على Supabase — لا يوجد وصول مباشر |
| Rate Limiting | 100 request كل 15 دقيقة |
| File Validation | صور فقط — max 10MB |

---

## 🐛 حل المشاكل الشائعة

### ❌ EADDRINUSE: port 3000
```bash
kill -9 $(lsof -t -i:3000)
node index.js
```

### ❌ ERR_NGROK_334 (ngrok شغال مرتين)
```bash
pkill ngrok
ngrok http 3000
```

### ❌ NetworkError في الـ Frontend
- تأكد إن `const API` في `checkout.html` و `admin.html` فيه الـ ngrok URL الصح
- تأكد إن جميع الـ fetch calls فيها header:
  ```javascript
  headers: { 'ngrok-skip-browser-warning': 'true' }
  ```

### ❌ Payment not found
- تأكد إن الـ payment_id في الـ URL صح
- تأكد إن الـ Supabase schema اتشغّل صح

### ❌ الـ ngrok URL اتغيّر
كل مرة تشغّل ngrok الـ URL بيتغيّر — محتاج:
1. تحدّث `const API` في الـ HTML files
2. تعمل `git push` تاني

---

## ⚠️ ملاحظات مهمة

```
1. لازم Terminal 1 (node index.js) يفضل شغال طول الوقت
2. لازم Terminal 2 (ngrok) يفضل شغال طول الوقت
3. لو أغلقت أي terminal — الـ Backend هيوقف
4. الـ ngrok URL بيتغيّر كل مرة تشغّله من جديد
5. ngrok للـ Testing بس — للـ Production استخدم Railway أو Koyeb
```

---

## 🚀 للـ Production (بدون ngrok)

لما تكون جاهز تنشر للـ users الحقيقيين:

1. ارفع الـ Backend على **Railway** أو **Koyeb** (مجاني)
2. حط الـ Environment Variables هناك
3. غيّر `const API` في الـ HTML files للـ URL الجديد
4. ارفع على Vercel

---

## 📞 الـ Flow كامل للـ Mobile App

```javascript
// 1. Mobile App تعمل payment
const res = await fetch('https://your-backend/create-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: currentUser.id })
});
const { checkout_url } = await res.json();

// 2. افتح WebView
openWebView(checkout_url);

// 3. استقبل الـ event لما المستخدم يخلص
// React Native:
<WebView
  source={{ uri: checkoutUrl }}
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.action === 'PAYMENT_SUBMITTED') {
      // أغلق الـ WebView
    }
  }}
/>
```
