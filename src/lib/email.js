import nodemailer from "nodemailer"

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export async function sendOTPEmail({ to, code, appName = "wakil.ma" }) {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS

  if (!emailUser || !emailPass) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS not configured")
    return { success: false, error: "Email credentials not configured" }
  }

  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"${appName}" <${emailUser}>`,
      to,
      subject: `${code} — Code de vérification ${appName} / رمز التحقق`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
          <div style="background:#ffffff;border-radius:10px;padding:32px;border:1px solid #e5e7eb;">
            <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">🔐 ${appName}</h2>
            <p style="color:#64748b;margin:0 0 24px;font-size:14px;">Code de vérification / رمز التحقق</p>
            <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-size:42px;font-weight:bold;letter-spacing:12px;color:#1e293b;">${code}</span>
            </div>
            <p style="color:#64748b;font-size:13px;margin:0 0 4px;">⏱ Valide 15 minutes / صالح 15 دقيقة</p>
            <p style="color:#94a3b8;font-size:12px;margin:0;">Ne partagez pas ce code / لا تشارك هذا الرمز مع أحد</p>
          </div>
        </div>
      `,
    })

    console.log(`✅ OTP email sent to ${to}`)
    return { success: true }
  } catch (error) {
    console.error("❌ sendOTPEmail error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function sendWelcomeEmail({ to, name, appName = "wakil.ma" }) {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS

  if (!emailUser || !emailPass) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS not configured")
    return { success: false, error: "Email credentials not configured" }
  }

  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"${appName}" <${emailUser}>`,
      to,
      subject: `🎉 Bienvenue sur ${appName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
          <div style="background:#ffffff;border-radius:10px;padding:40px;border:1px solid #e5e7eb;">
            <div style="text-align:center;margin-bottom:32px;">
              <h1 style="color:#4f46e5;margin:0 0 8px;font-size:32px;">🎉</h1>
              <h2 style="color:#1e293b;margin:0;font-size:24px;">Bienvenue sur ${appName}!</h2>
            </div>
            
            <p style="color:#334155;font-size:15px;line-height:1.7;margin:0 0 24px;">
              Bonjour <strong>${name}</strong>,<br/><br/>
              Nous sommes ravis de vous accueillir ! Votre compte a été créé avec succès.
            </p>

            <div style="background:#f8fafc;border-left:4px solid #4f46e5;padding:20px;margin:24px 0;border-radius:6px;">
              <p style="color:#334155;font-size:14px;line-height:1.6;margin:0;">
                <strong>🤖 Votre agent IA est prêt</strong><br/>
                Transformez vos conversations WhatsApp en ventes automatiquement.
              </p>
            </div>

            <div style="text-align:center;margin:32px 0;">
              <a href="https://www.wakil.ma/dashboard" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
                Accéder au tableau de bord
              </a>
            </div>

            <div style="border-top:1px solid #e5e7eb;padding-top:24px;margin-top:32px;">
              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
                <strong>Prochaines étapes :</strong><br/>
                1️⃣ Configurez votre agent<br/>
                2️⃣ Ajoutez vos produits<br/>
                3️⃣ Connectez WhatsApp
              </p>
            </div>

            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:24px 0 0;">
              Besoin d'aide ? Contactez-nous
            </p>
          </div>
        </div>
      `,
    })

    console.log(`✅ Welcome email sent to ${to}`)
    return { success: true }
  } catch (error) {
    console.error("❌ sendWelcomeEmail error:", error.message)
    return { success: false, error: error.message }
  }
}

export async function sendPasswordResetEmail({ to, resetUrl, appName = "wakil.ma" }) {
  const emailUser = process.env.EMAIL_USER
  const emailPass = process.env.EMAIL_PASS

  if (!emailUser || !emailPass) {
    console.warn("⚠️ EMAIL_USER or EMAIL_PASS not configured")
    return { success: false, error: "Email credentials not configured" }
  }

  try {
    const transporter = createTransporter()

    await transporter.sendMail({
      from: `"${appName}" <${emailUser}>`,
      to,
      subject: `🔐 Réinitialisation mot de passe / إعادة تعيين كلمة السر — ${appName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px;">
          <div style="background:#ffffff;border-radius:10px;padding:32px;border:1px solid #e5e7eb;">
            <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">🔐 ${appName}</h2>
            <p style="color:#64748b;margin:0 0 24px;font-size:14px;">
              Réinitialisation du mot de passe<br/>
              <span dir="rtl">إعادة تعيين كلمة السر</span>
            </p>
            <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px;">
              Bonjour,<br/>
              Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :
            </p>
            <p dir="rtl" style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px;">
              مرحباً،<br/>
              طلبت إعادة تعيين كلمة السر. اضغط على الزر أسفله:
            </p>
            <div style="text-align:center;margin:28px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
                Réinitialiser / إعادة التعيين
              </a>
            </div>
            <p style="color:#64748b;font-size:12px;margin:16px 0 4px;word-break:break-all;">
              ${resetUrl}
            </p>
            <p style="color:#64748b;font-size:13px;margin:16px 0 4px;">⏱ Valide 1 heure / صالح ساعة واحدة</p>
            <p style="color:#94a3b8;font-size:12px;margin:0;">
              Si vous n'avez pas demandé ceci, ignorez cet email.<br/>
              <span dir="rtl">إذا لم تطلب ذلك، تجاهل هذا البريد.</span>
            </p>
          </div>
        </div>
      `,
    })

    console.log(`✅ Password reset email sent to ${to}`)
    return { success: true }
  } catch (error) {
    console.error("❌ sendPasswordResetEmail error:", error.message)
    return { success: false, error: error.message }
  }
}
