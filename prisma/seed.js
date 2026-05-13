// بيانات تجريبية للتطوير
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 بدء إنشاء البيانات التجريبية...")

  // حذف البيانات القديمة
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.product.deleteMany()
  await prisma.objectionReply.deleteMany()
  await prisma.agent.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.user.deleteMany()

  // إنشاء مستخدم تجريبي
  const hashedPassword = await bcrypt.hash("password123", 12)

  const user = await prisma.user.create({
    data: {
      name: "ليلى المراكشي",
      email: "layla@wakil.ma",
      password: hashedPassword,
      phone: "0661234567",
      storeName: "بوتيك ليلى",
      plan: "PRO",
      agent: {
        create: {
          name: "ليلى المراكشي",
          domain: "بوتيك ليلى",
          style: "friendly",
          language: "darija",
          isActive: true,
          // ✅ بدون تعليمات مفروضة ولا objection replies
          // التعليمات تأتي من Settings > Instructions personnalisées (Produits)
        },
      },
    },
  })

  // إنشاء منتجات
  await prisma.product.createMany({
    data: [
      { userId: user.id, name: "جلباب زيتوني",    price: 320, description: "قماش درابزين أصلي، ألوان متعددة", questions: 47 },
      { userId: user.id, name: "كافطان صيفي",     price: 480, description: "خامة خفيفة مناسبة للصيف",       questions: 31 },
      { userId: user.id, name: "حجاب شيفون",      price: 85,  description: "ناعم وخفيف، ألوان كثيرة",      questions: 22 },
      { userId: user.id, name: "فستان سهرة",      price: 650, description: "مناسب للمناسبات الرسمية",       questions: 18 },
      { userId: user.id, name: "عباية كلاسيكية", price: 420, description: "تصميم كلاسيكي أنيق",           questions: 15, isActive: false },
    ],
  })

  // إنشاء زبائن
  const customers = await Promise.all([
    prisma.customer.create({ data: { userId: user.id, name: "سناء بنعلي",   phone: "0662111111", tag: "VIP",      totalSpent: 1840, ordersCount: 5 } }),
    prisma.customer.create({ data: { userId: user.id, name: "أمينة العلوي", phone: "0663222222", tag: "VIP",      totalSpent: 1200, ordersCount: 3 } }),
    prisma.customer.create({ data: { userId: user.id, name: "يحيى الحسني", phone: "0664333333", tag: "NEW",      totalSpent: 320,  ordersCount: 1 } }),
    prisma.customer.create({ data: { userId: user.id, name: "مريم بنسعيد", phone: "0665444444", tag: "REGULAR",  totalSpent: 760,  ordersCount: 2 } }),
    prisma.customer.create({ data: { userId: user.id, name: "كريم الزياني", phone: "0666555555", tag: "PROSPECT", totalSpent: 0,    ordersCount: 0 } }),
  ])

  // إنشاء محادثات مع رسائل
  const conv1 = await prisma.conversation.create({
    data: {
      userId: user.id,
      customerId: customers[0].id,
      stage: "CLOSED",
      score: 100,
      isRead: true,
      totalAmount: 320,
    },
  })

  await prisma.message.createMany({
    data: [
      { conversationId: conv1.id, role: "AGENT", content: "السلام عليكم سناء! كيف يمكنني مساعدتك؟ 🌸" },
      { conversationId: conv1.id, role: "USER",  content: "بغيت نشري جلباب أخضر" },
      { conversationId: conv1.id, role: "AGENT", content: "ممتاز! عندنا جلباب زيتوني بـ 320 درهم + توصيل مجاني 🎁" },
      { conversationId: conv1.id, role: "USER",  content: "زوين، خدي واحد مقاس M" },
      { conversationId: conv1.id, role: "AGENT", content: "تبارك الله! تم تسجيل طلبك ✅ سيوصلك خلال 48 ساعة" },
    ],
  })

  const conv2 = await prisma.conversation.create({
    data: {
      userId: user.id,
      customerId: customers[2].id,
      stage: "OBJECTION",
      score: 70,
      isRead: false,
    },
  })

  await prisma.message.createMany({
    data: [
      { conversationId: conv2.id, role: "AGENT", content: "السلام عليكم! كيف يمكنني مساعدتك؟ 😊" },
      { conversationId: conv2.id, role: "USER",  content: "واش كاين توصيل؟" },
      { conversationId: conv2.id, role: "AGENT", content: "أيه! التوصيل مجاني لكل الطلبات اليوم 🎁" },
      { conversationId: conv2.id, role: "USER",  content: "غالي شوية..." },
      { conversationId: conv2.id, role: "AGENT", content: "نفهمك 😊 لكن القماش يدوم +3 سنين + توصيل مجاني 🎁 واش نحجز ليك؟" },
    ],
  })

  // إنشاء إشعارات
  await prisma.notification.createMany({
    data: [
      { userId: user.id, type: "NEW_ORDER",      title: "طلب جديد!",              message: "سناء بنعلي طلبت جلباب زيتوني — 320 درهم",   isRead: true  },
      { userId: user.id, type: "OBJECTION_ALERT", title: "اعتراض يحتاج متابعة",   message: "يحيى الحسني قال غالي شوية — Score 70%",       isRead: false },
      { userId: user.id, type: "DAILY_REPORT",   title: "تقرير اليوم جاهز",      message: "47 محادثة — 8 مبيعات — 3,240 درهم",           isRead: false },
    ],
  })

  console.log("✅ تم إنشاء البيانات التجريبية بنجاح!")
  console.log("📧 الإيميل: layla@wakil.ma")
  console.log("🔑 كلمة المرور: password123")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
