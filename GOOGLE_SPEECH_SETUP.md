# 🎤 Google Cloud Speech-to-Text Setup (مجاني!)

## المميزات ✨
- ✅ **60 دقيقة مجانية** كل شهر
- ✅ **بدون بطاقة ائتمان** (free tier)
- ✅ دعم عربي جيد
- ✅ أسرع من OpenAI
- ✅ لا quotas مشكلة

---

## 🚀 الإعداد السريع

### خطوة 1️⃣: إنشاء Google Cloud Project

1. روح: https://console.cloud.google.com
2. اضغط: **Create Project**
3. اكتب: `SalesBot Voice`
4. اضغط: **Create**

### خطوة 2️⃣: تفعيل Google Speech API

1. في الـ Dashboard، اضغط: **Enable APIs and Services**
2. ابحث عن: `Google Cloud Speech-to-Text API`
3. اضغط: **Enable**

### خطوة 3️⃣: إنشاء API Key

1. اذهب إلى: **APIs & Services** → **Credentials**
2. اضغط: **Create Credentials** → **API Key**
3. Copy الـ Key (يبدأ بـ `AIza...`)

### خطوة 4️⃣: إضافة الـ Key على Vercel

#### محليًا:
```bash
# في .env
GOOGLE_CLOUD_SPEECH_API_KEY=AIza...your-key-here...
```

#### على Vercel:
```bash
# عبر CLI
npx vercel env add GOOGLE_CLOUD_SPEECH_API_KEY
# ثم الصق الـ Key

# أو من Dashboard:
# Settings → Environment Variables → Add New
# Name: GOOGLE_CLOUD_SPEECH_API_KEY
# Value: AIza...
```

### خطوة 5️⃣: Deploy

```bash
npx vercel --prod --yes
```

---

## ✅ اختبار الحل

```bash
# يجب تطلع في الـ logs:
🎤 [Whisper] Starting transcription for audioId: ...
📦 [Whisper] Downloaded: X bytes
🔄 [Whisper] Sending to Google Cloud Speech API...
✅ [Whisper] Success! Transcribed X chars
```

---

## 📊 المقارنة

| الميزة | Google Cloud | OpenAI |
|------|------|--------|
| السعر | $0.006/min (بعد 60 min) | $0.006/min (مباشرة) |
| Free Tier | ✅ 60 min/month | ❌ لا |
| دقة | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| سرعة | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 🔍 الفلو الجديد

```
عميل بيبعت صوت 🎤
     ↓
Webhook يستقبل
     ↓
📦 تنزيل الملف من WhatsApp
     ↓
🔄 إرسال لـ Google Cloud Speech API
     ↓
✅ تحويل صوت → نص (مجاني!)
     ↓
🤖 AI يفهم ويرد
```

---

## 💡 Tips

1. **Quota**: 60 دقيقة/شهر كافية للـ testing
2. **Language**: متدعم عربي (`ar-SA`)
3. **Format**: يدعم OGG Opus (WhatsApp format)
4. **Cost**: بعد 60 دقيقة = $0.006/دقيقة

---

## 🆘 في مشكل؟

### خطأ: 403 Forbidden
```
❌ API key invalid or quota exceeded
```
الحل: تأكد من تفعيل Speech API في Google Cloud Console

### خطأ: Quota exceeded
```
استهلكت 60 دقيقة مجاناً
```
الحل: أضيف بطاقة ائتمان أو استنى للشهر الجديد

### خطأ: API Key not set
```
GOOGLE_CLOUD_SPEECH_API_KEY not found
```
الحل: تأكد من إضافتها على Vercel

---

**تم! الآن الـ AI يسمع الرسائل الصوتية بالمجان! 🎉**
