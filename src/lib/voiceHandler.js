// lib/voiceHandler.js

const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0"

// ─── Download audio buffer from WhatsApp Media API ─────────────────────────
// WhatsApp sends a mediaId in the webhook. We fetch the temporary URL first,
// then download the binary audio buffer.

export async function downloadWhatsAppAudio(mediaId) {
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN
  if (!mediaId) throw new Error("[voiceHandler] mediaId is required")
  if (!WHATSAPP_TOKEN) throw new Error("[voiceHandler] WHATSAPP_TOKEN not set")

  // Step 1: get the temporary download URL
  const metaRes = await fetch(`${WHATSAPP_API_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  })
  if (!metaRes.ok) {
    const errText = await metaRes.text()
    throw new Error(`[voiceHandler] WA media meta ${metaRes.status}: ${errText.slice(0, 200)}`)
  }
  const meta = await metaRes.json()
  if (!meta.url) throw new Error("[voiceHandler] No URL in WA media response")

  // Step 2: download binary
  const audioRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
  })
  if (!audioRes.ok) {
    throw new Error(`[voiceHandler] WA audio download ${audioRes.status}`)
  }

  const arrayBuffer = await audioRes.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: meta.mime_type || "audio/ogg; codecs=opus",
  }
}

// ─── Transcribe audio buffer using OpenAI Whisper ─────────────────────────
// Whisper accepts: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg
// WhatsApp sends ogg/opus — works directly, no conversion needed.
// Language auto-detection handles Darija, Arabic, French, Arabizi.

export async function transcribeAudio(audioBuffer, mimeType = "audio/ogg") {
  const OPENAI_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_KEY) throw new Error("[voiceHandler] OPENAI_API_KEY not set")

  // Determine file extension from MIME type
  const ext = mimeType.includes("ogg")  ? "ogg"
            : mimeType.includes("mp4")  ? "mp4"
            : mimeType.includes("webm") ? "webm"
            : mimeType.includes("wav")  ? "wav"
            : mimeType.includes("mpeg") ? "mp3"
            : "ogg" // default for WhatsApp

  const formData = new FormData()
  const blob = new Blob([audioBuffer], { type: mimeType })
  formData.append("file", blob, `voice.${ext}`)
  formData.append("model", "whisper-1")
  // NOTE: Do NOT set "language" — auto-detection handles Darija/Arabic/French mix

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[voiceHandler] Whisper ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = (data.text || "").trim()

  if (!text) {
    console.warn("[voiceHandler] Whisper returned empty transcription")
    return null
  }

  console.log(`🎙️ [Whisper] ${audioBuffer.length}B → "${text.slice(0, 100)}${text.length > 100 ? "…" : ""}"`)
  return text
}

// ─── Generate speech from text using OpenAI TTS ───────────────────────────
// Maps agent language to the most suitable voice.
// Cleans text before sending: removes tags, markdown, excess emoji.

const TTS_VOICE_MAP = {
  darija:  "nova",   // warm, natural Arabic feel
  arabic:  "nova",
  french:  "alloy",  // neutral, clear for French
  auto:    "nova",   // default: nova handles multilingual well
}

export async function generateSpeech(text, agentLanguage = "auto") {
  const OPENAI_KEY = process.env.OPENAI_API_KEY
  if (!OPENAI_KEY) throw new Error("[voiceHandler] OPENAI_API_KEY not set")

  // Clean text: remove system tags + markdown + emoji clutter
  const cleaned = text
    .replace(/\[STAGE:\w+\]/g, "")
    .replace(/\[ORDER_CONFIRMED\]/g, "")
    .replace(/\[SEND[_ ]IMAGES?\]/gi, "")
    .replace(/\[CANCEL_ORDER\]/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")  // bold **text** → text
    .replace(/\*([^*]+)\*/g, "$1")      // bold *text* → text
    // Keep emoji in TTS input — Whisper/TTS handles them as pauses naturally
    .replace(/\n{3,}/g, "\n\n")
    .trim()

  if (!cleaned || cleaned.length < 2) {
    console.warn("[voiceHandler] Text too short for TTS, skipping")
    return null
  }

  const voice = TTS_VOICE_MAP[agentLanguage] || "nova"
  const model = process.env.TTS_MODEL || "tts-1" // tts-1-hd for higher quality

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: cleaned,
      voice,
      response_format: "opus", // best compression for WhatsApp (ogg/opus)
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[voiceHandler] TTS ${res.status}: ${err.slice(0, 200)}`)
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  console.log(`🔊 [TTS] "${cleaned.slice(0, 60)}…" → ${buffer.length}B (voice=${voice} model=${model})`)
  return buffer
}

// ─── Upload audio buffer to WhatsApp and send as audio message ───────────
// Two-step: (1) upload media → get media ID, (2) send message with that ID.

export async function uploadAndSendVoice(audioBuffer, toPhone) {
  const WHATSAPP_TOKEN    = process.env.WHATSAPP_TOKEN
  const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    throw new Error("[voiceHandler] WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set")
  }

  // Step 1: Upload the audio file
  const uploadForm = new FormData()
  const blob = new Blob([audioBuffer], { type: "audio/ogg; codecs=opus" })
  uploadForm.append("file", blob, "reply.ogg")
  uploadForm.append("type", "audio/ogg")
  uploadForm.append("messaging_product", "whatsapp")

  const uploadRes = await fetch(
    `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/media`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
      body: uploadForm,
    }
  )
  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`[voiceHandler] WA media upload ${uploadRes.status}: ${err.slice(0, 200)}`)
  }
  const { id: uploadedMediaId } = await uploadRes.json()
  if (!uploadedMediaId) throw new Error("[voiceHandler] No media ID returned from upload")

  // Step 2: Send the audio message
  const sendRes = await fetch(
    `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhone,
        type: "audio",
        audio: { id: uploadedMediaId },
      }),
    }
  )
  if (!sendRes.ok) {
    const err = await sendRes.json()
    throw new Error(`[voiceHandler] WA send audio ${sendRes.status}: ${JSON.stringify(err).slice(0, 200)}`)
  }

  const data = await sendRes.json()
  const sentMsgId = data.messages?.[0]?.id
  console.log(`📤 [VoiceReply] Sent to ...${toPhone.slice(-4)} msgId=${sentMsgId}`)
  return data
}

// ─── Detect if a WhatsApp message is a voice message ─────────────────────

export function isVoiceMessage(waMessage) {
  if (!waMessage || typeof waMessage !== "object") return false
  return waMessage.type === "audio" || waMessage.type === "voice"
}

// ─── Extract mediaId from a WhatsApp voice message ───────────────────────

export function extractVoiceMediaId(waMessage) {
  if (!waMessage) return null
  return waMessage.audio?.id || waMessage.voice?.id || null
}
