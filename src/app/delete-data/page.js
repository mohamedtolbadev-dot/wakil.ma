"use client"

import Link from "next/link"
import { Trash2, AlertCircle, Mail, CheckCircle, Clock, Shield } from "lucide-react"
import { PublicFooter } from "@/components/public/PublicFooter"
import { PublicHeader } from "@/components/public/PublicHeader"

export default function DeleteDataPage() {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicHeader />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">حذف البيانات</h1>
          <p className="text-sm text-muted-foreground">
            كيفية حذف بياناتك من wakil.ma
          </p>
        </div>

        {/* Warning Box */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-700 text-sm mb-1">تنبيه مهم</h3>
              <p className="text-xs text-red-600 leading-relaxed">
                حذف البيانات لا يمكن التراجع عنه. جميع محادثاتك، العملاء، والمنتجات ستحذف نهائياً.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Method 1 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">الطريقة 1: من الإعدادات</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              يمكنك حذف حسابك بنفسك من لوحة التحكم:
            </p>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="bg-brand-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                <span>سجل الدخول إلى <Link href="/login" className="text-brand-600 hover:underline">لوحة التحكم</Link></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-brand-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                <span>اذهب إلى الإعدادات (Settings)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-brand-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                <span>اختر &quot;الحساب&quot; (Account)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-brand-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">4</span>
                <span>اضغط &quot;حذف الحساب&quot; (Delete Account)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-brand-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">5</span>
                <span>أكد الحذف بإدخال كلمة المرور</span>
              </li>
            </ol>
          </section>

          {/* Method 2 */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
                <Mail size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">الطريقة 2: عبر البريد</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              يمكنك طلب حذف البيانات عبر البريد الإلكتروني:
            </p>
            <div className="bg-secondary rounded-lg p-4 mb-4">
              <p className="text-sm text-foreground mb-2">أرسل بريدًا إلى:</p>
              <a 
                href="mailto:contct@wakil.ma?subject=طلب حذف البيانات&body=مرحباً، أريد حذف جميع بياناتي من Wakil.%0D%0A%0D%0AEmail المستخدم: [أدخل إيميلك]%0D%0Aرقم الهاتف: [أدخل رقمك]"
                className="text-brand-600 font-semibold hover:underline"
              >
                contct@wakil.ma
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>الموضوع:</strong> طلب حذف البيانات<br/>
              <strong>المحتوى:</strong> Email المستخدم ورقم الهاتف المسجل
            </p>
          </section>

          {/* What gets deleted */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Trash2 size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">ما الذي سيحذف؟</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">✗</span>
                <span>معلومات الحساب (الاسم، الإيميل، الهاتف)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">✗</span>
                <span>جميع المحادثات والرسائل</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">✗</span>
                <span>بيانات العملاء</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">✗</span>
                <span>المنتجات والأسعار</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">✗</span>
                <span>إحصائيات وتحليلات</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-0.5">✗</span>
                <span>Token واتساب وإعدادات الوكيل</span>
              </li>
            </ul>
          </section>

          {/* Timeline */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Clock size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">مدة الحذف</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">•</span>
                <span><strong>فوراً:</strong> يتم حظر الوصول إلى الحساب</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">•</span>
                <span><strong>خلال 7 أيام:</strong> تُحذف البيانات من قاعدة البيانات</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">•</span>
                <span><strong>خلال 30 يوم:</strong> تُحذف نهائياً من النسخ الاحتياطية</span>
              </li>
            </ul>
          </section>

          {/* Data retention */}
          <section className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Shield size={20} className="text-brand-600" />
              </div>
              <h2 className="text-lg font-bold text-foreground">استثناءات</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              قد نحتفظ ببعض البيانات إذا كان ذلك مطلوباً قانونياً:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">•</span>
                <span>سجلات الفوترة (للضرائب)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">•</span>
                <span>السجلات القانونية (في حال نزاع)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 mt-0.5">•</span>
                <span>تُحذف هذه السجلات بعد 5 سنوات</span>
              </li>
            </ul>
          </section>

          {/* Contact */}
          <section className="bg-brand-600 text-white rounded-xl p-6">
            <h2 className="text-lg font-bold mb-2">استفسارات حول حذف البيانات</h2>
            <p className="text-sm text-white/80 mb-4">
              إذا كان لديك أي سؤال حول حذف بياناتك:
            </p>
            <a 
              href="mailto:contct@wakil.ma"
              className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Mail size={16} />
              contct@wakil.ma
            </a>
          </section>
        </div>

      </main>

      <PublicFooter />
    </div>
  )
}
