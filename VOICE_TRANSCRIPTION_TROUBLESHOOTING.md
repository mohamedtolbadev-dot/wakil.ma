# 🔧 Voice Transcription Troubleshooting

## الرسالة الخاطئة
```
سمح لي، ما يمكنش لي نسمع الرسائل الصوتية.
إذا كان عندك سؤال أو استفسار، ياريت تكتبه لي هنا...
```

---

## 🎯 المشاكل والحلول

### ❌ المشكلة #1: OPENAI_API_KEY ما موجودة على Vercel

**الأعراض**:
- الرسائل الصوتية ما تتحول لنص
- في الـ logs: `CRITICAL: OPENAI_API_KEY not set in environment!`

**السبب**:
الـ Key موجودة في `.env` محليًا بس ما تم رفعها على Vercel

**الحل**:
```bash
# 1. اسحب الـ variables من Vercel
npx vercel env pull

# 2. أو أضيفها يدويًا من Dashboard
# Settings → Environment Variables → Add New
# OPENAI_API_KEY = sk-proj-...

# 3. Deploy من جديد
npx vercel --prod --yes
```

**التحقق**:
```bash
# اختبر محليًا
$env:OPENAI_API_KEY  # PowerShell
# يجب تطلع الـ Key
```

---

### ❌ المشكلة #2: API Key Invalid/Expired

**الأعراض**:
- Logs: `❌ [Whisper] API Error (401): ...`

**السبب**:
الـ Key انتهت صلاحيتها أو ما صح

**الحل**:
1. روح https://platform.openai.com/account/api-keys
2. اعمل Key جديدة
3. ضيفها على Vercel

---

### ❌ المشكلة #3: WhatsApp Token ما صح

**الأعراض**:
- Logs: `❌ [Whisper] Failed to download media from WhatsApp`

**السبب**:
`agent.whatsappToken` ما صح أو انتهت صلاحيتها

**الحل**:
في Dashboard → Settings → WhatsApp
تحقق من أن الـ Token موجودة وصحيحة

---

### ❌ المشكلة #4: WhatsApp Media ما تنزل

**الأعراض**:
- Logs: `Failed to download media from WhatsApp`
- Audio file size = 0 bytes

**السبب**:
مشكل في تنزيل الملف من WhatsApp API

**الحل**:
```javascript
// في downloadWhatsAppMedia() تأكد من:
1. mediaId صح ✓
2. Token صح ✓
3. الملف ما فات مدة الـ expiry (24 ساعة)
```

---

### ❌ المشكلة #5: Whisper Rate Limit

**الأعراض**:
- Logs: `❌ [Whisper] API Error (429): ...`

**السبب**:
تجاوزت الـ rate limit من OpenAI

**الحل**:
1. انتظر شوي قبل ما تبعت أصوات جديدة
2. أو استخدم API Key مع quotas أعلى

---

### ❌ المشكلة #6: Webhook ما يستقبل الرسائل الصوتية

**الأعراض**:
- الصوت ما يوصل للـ webhook
- في الـ dashboard بلاش رسائل

**السبب**:
WhatsApp ما عندها إذن لإرسال Audit

**الحل**:
في تطبيق Facebook Developer:
```
Settings → Webhooks
✓ audio (تأكد من التفعيل)
```

---

## 🔍 Debug Steps

### 1️⃣ تحقق من الـ Environment
```bash
# Local
Get-Content .env | Select-String "OPENAI_API_KEY"

# Vercel
npx vercel env list
```

### 2️⃣ شوف الـ Logs
```bash
# Real-time logs
npx vercel logs --follow

# أو من Dashboard:
# Project → Settings → Function Logs
```

### 3️⃣ ابحث عن:
```
🎤 [Whisper] Starting transcription  ← يقول بدء التحويل
📦 [Whisper] Downloaded: X bytes    ← حجم الملف
🔄 [Whisper] Sending to OpenAI      ← إرسال للـ API
✅ [Whisper] Success!               ← نجح! ✓

أو

❌ [Whisper] API Error (401)        ← Key خاطئة
🚨 CRITICAL: OPENAI_API_KEY not set ← ما موجودة
```

---

## 📊 Checklist للتشخيص

```
☐ OPENAI_API_KEY موجودة في .env محليًا
☐ OPENAI_API_KEY موجودة على Vercel Dashboard
☐ الـ Key ما انتهت صلاحيتها
☐ agent.whatsappToken موجودة وصحيحة
☐ WhatsApp Webhook مفعل
☐ audio permission مفعل في WhatsApp settings
☐ Deploy تم تاني بعد إضافة الـ Key
☐ Logs ما فيها أخطاء 401 أو 404
```

---

## 🚀 اختبر الحل

### Test 1: Send Audio locally
```bash
# في Terminal بتاعك
node -e "
const key = process.env.OPENAI_API_KEY;
console.log('✓ Key exists:', !!key);
console.log('✓ Key length:', key?.length);
"
```

### Test 2: اطلب من عميل يبعت صوت
```
العميل: يبعت رسالة صوتية على WhatsApp
صيانة: شوف الـ logs بـ npx vercel logs
```

### Test 3: شوف الـ Dashboard
```
Dashboard → Conversations
اختر محادثة → شوف الرسائل
الرسائل الصوتية يجب تظهر بـ "[رسالة صوتية]"
```

---

## 💡 Optimization Tips

### 1️⃣ تقليل التكاليف
```javascript
// تخزين النصوص المحولة
// (تجنب تحويل نفس الرسالة مرتين)
```

### 2️⃣ تحسين السرعة
```javascript
// تحويل الصوت بشكل متوازي
// (بدل الانتظار)
```

### 3️⃣ تحسين الدقة
```javascript
// استخدام language parameter
const formData = new FormData()
formData.append("language", "ar")  // عربي
```

---

## 📞 إذا لازال في مشكل

### اجمع المعلومات:
1. Screenshot من الـ error message
2. Logs من `npx vercel logs`
3. OPENAI_API_KEY (آخر 4 حروف فقط: `...gmjrQA`)
4. WhatsApp Business Account ID

### ثم اسأل:
"في مشكل في تحويل الرسائل الصوتية. شوفت الـ logs وطلعت:
```
[logs هنا]
```
شنو الحل؟"

---

**آخر تحديث**: April 16, 2026  
**Version**: v1.0
