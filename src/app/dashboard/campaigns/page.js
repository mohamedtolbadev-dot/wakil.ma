"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { campaignsAPI, productsAPI } from "@/lib/api"
import { TEMPLATE_VARIABLE_DEFS } from "@/lib/campaigns/constants"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"
import { formatAmount } from "@/lib/helpers"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Megaphone,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Send,
  ShoppingBag,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react"

function getCopy(language) {
  if (language === "ar") {
    return {
      title: "الحملات",
      subtitle: "صيفط المنتج الجديد للزبائن اللي سبق ليهم شراو عندك، مع audience وtemplates وتتبع منظم.",
      builder: "بناء حملة جديدة",
      templates: "قوالب واتساب",
      history: "الحملات السابقة",
      createTemplate: "إضافة قالب",
      createCampaign: "إنشاء الحملة",
      preview: "معاينة الجمهور",
      launch: "تشغيل",
      pause: "إيقاف مؤقت",
      recheck: "تحديث",
      noTemplates: "ما كاين حتى قالب دابا.",
      noCampaigns: "ما كاين حتى حملة دابا.",
      noPreview: "دير معاينة باش تشوف شحال من زبون غادي يتوصل.",
      loading: "جاري التحميل...",
      name: "اسم الحملة",
      product: "المنتج",
      audience: "الجمهور",
      template: "القالب",
      batch: "حجم الدفعة",
      excludeRecent: "استثناء الزبائن لي توصلو مؤخراً (بالأيام)",
      tag: "تصنيف الزبون",
      recentDays: "الشراء خلال آخر (أيام)",
      templateName: "اسم القالب داخلياً",
      metaTemplateName: "اسم القالب في Meta",
      templatePreview: "نص المعاينة",
      templateLang: "اللغة",
      templateVars: "المتغيرات بالترتيب",
      createTemplateBtn: "حفظ القالب",
      matched: "المطابقين",
      eligible: "القابلين للإرسال",
      skipped: "المتجاوزين",
      optedOut: "المنسحبين",
      samples: "أمثلة من الزبائن",
      allBuyers: "كل المشترين",
      sameProduct: "مشتري نفس المنتج",
      sameCategory: "مشتري نفس الفئة",
      byTag: "حسب التصنيف",
      recentBuyers: "الزبائن الجدد",
      status: {
        DRAFT: "مسودة",
        READY: "جاهزة",
        RUNNING: "شغالة",
        PAUSED: "متوقفة",
        COMPLETED: "مكتملة",
        FAILED: "فشلت",
        CANCELLED: "ملغية",
      },
      createSuccess: "تخلقات الحملة بنجاح.",
      templateSuccess: "تحفظ القالب بنجاح.",
      previewEmpty: "ما لقيناش حتى زبون مطابق بهاد الإعدادات.",
      selectProduct: "اختار منتج",
      selectTemplate: "اختار قالب",
      dispatching: "جاري الإرسال...",
      previewFirst: "الأفضل دير المعاينة قبل الإنشاء.",
      optional: "اختياري",
      templateHint: "خاص اسم القالب يكون مطابق للقالب الموافق عليه فـ Meta.",
      reloadError: "وقع مشكل فالجلب.",
    }
  }

  return {
    title: "Campagnes",
    subtitle: "Diffusez un nouveau produit aux clients deja acheteurs avec audience, templates et suivi propre.",
    builder: "Nouvelle campagne",
    templates: "Templates WhatsApp",
    history: "Campagnes existantes",
    createTemplate: "Ajouter un template",
    createCampaign: "Creer la campagne",
    preview: "Previsualiser l'audience",
    launch: "Lancer",
    pause: "Pause",
    recheck: "Actualiser",
    noTemplates: "Aucun template configure.",
    noCampaigns: "Aucune campagne pour le moment.",
    noPreview: "Faites une previsualisation pour voir combien de clients seront touches.",
    loading: "Chargement...",
    name: "Nom de la campagne",
    product: "Produit",
    audience: "Audience",
    template: "Template",
    batch: "Taille du batch",
    excludeRecent: "Exclure les clients contactes recemment (jours)",
    tag: "Segment client",
    recentDays: "Achat durant les derniers jours",
    templateName: "Nom interne",
    metaTemplateName: "Nom Meta",
    templatePreview: "Texte de previsualisation",
    templateLang: "Langue",
    templateVars: "Variables dans l'ordre",
    createTemplateBtn: "Enregistrer le template",
    matched: "Correspondants",
    eligible: "Eligibles",
    skipped: "Exclus",
    optedOut: "Desabonnes",
    samples: "Exemples clients",
    allBuyers: "Tous les acheteurs",
    sameProduct: "Acheteurs du meme produit",
    sameCategory: "Acheteurs de la meme categorie",
    byTag: "Par segment",
    recentBuyers: "Clients recents",
    status: {
      DRAFT: "Brouillon",
      READY: "Prete",
      RUNNING: "En cours",
      PAUSED: "En pause",
      COMPLETED: "Terminee",
      FAILED: "Echouee",
      CANCELLED: "Annulee",
    },
    createSuccess: "Campagne creee avec succes.",
    templateSuccess: "Template enregistre.",
    previewEmpty: "Aucun client correspondant avec ces filtres.",
    selectProduct: "Choisir un produit",
    selectTemplate: "Choisir un template",
    dispatching: "Envoi en cours...",
    previewFirst: "La previsualisation est recommandee avant creation.",
    optional: "Optionnel",
    templateHint: "Le nom doit correspondre au template approuve dans Meta.",
    reloadError: "Erreur de chargement.",
  }
}

function getAudienceOptions(copy) {
  return [
    { value: "ALL_BUYERS", label: copy.allBuyers },
    { value: "SAME_PRODUCT_BUYERS", label: copy.sameProduct },
    { value: "SAME_CATEGORY_BUYERS", label: copy.sameCategory },
    { value: "TAG_BUYERS", label: copy.byTag },
    { value: "RECENT_BUYERS", label: copy.recentBuyers },
  ]
}

function getStatusClass(status) {
  return {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    READY: "bg-blue-100 text-blue-700 border-blue-200",
    RUNNING: "bg-amber-100 text-amber-700 border-amber-200",
    PAUSED: "bg-zinc-100 text-zinc-700 border-zinc-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    FAILED: "bg-red-100 text-red-700 border-red-200",
    CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
  }[status] || "bg-secondary text-foreground border-border"
}

function readPayload(response) {
  return response?.data || response || {}
}

function readError(error, fallback) {
  return error?.message || error?.error || fallback
}

export default function CampaignsPage() {
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const copy = getCopy(language)
  const actionCopy = language === "ar"
    ? {
        resume: "مواصلة",
        restart: "إعادة تشغيل",
        deleteCampaign: "حذف",
        deleting: "جاري الحذف...",
        deleteTitle: "تأكيد الحذف",
        confirmDelete: "نعم، حذف",
        cancelDelete: "إلغاء",
        deleteConfirm: "واش متأكد بلي بغيتي تحذف حملة {name}؟",
      }
    : {
        resume: "Reprendre",
        restart: "Relancer",
        deleteCampaign: "Supprimer",
        deleting: "Suppression...",
        deleteTitle: "Confirmer la suppression",
        confirmDelete: "Oui, supprimer",
        cancelDelete: "Annuler",
        deleteConfirm: "Voulez-vous vraiment supprimer la campagne {name} ?",
      }
  const templateActionCopy = language === "ar"
    ? {
        edit: "تعديل",
        update: "حفظ التعديل",
        deleteTemplate: "حذف القالب",
        deleting: "جاري حذف القالب...",
        cancelEdit: "إلغاء التعديل",
        editMode: "تعديل القالب",
        createMode: "إضافة قالب",
        deleteConfirm: "واش متأكد بلي بغيتي تحذف القالب {name}؟",
      }
    : {
        edit: "Modifier",
        update: "Enregistrer",
        deleteTemplate: "Supprimer le template",
        deleting: "Suppression du template...",
        cancelEdit: "Annuler",
        editMode: "Modifier le template",
        createMode: "Ajouter un template",
        deleteConfirm: "Voulez-vous vraiment supprimer le template {name} ?",
      }

  const [products, setProducts] = useState([])
  const [templates, setTemplates] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [creatingTemplate, setCreatingTemplate] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState("")
  const [dispatchingId, setDispatchingId] = useState("")
  const [pausingId, setPausingId] = useState("")
  const [deletingId, setDeletingId] = useState("")
  const [deletingTemplateId, setDeletingTemplateId] = useState("")
  const [deleteDialog, setDeleteDialog] = useState(null)

  const productIdFromQuery = searchParams.get("productId") || ""

  const [builder, setBuilder] = useState({
    name: "",
    productId: productIdFromQuery,
    audienceType: productIdFromQuery ? "SAME_PRODUCT_BUYERS" : "ALL_BUYERS",
    templateId: "",
    batchSize: 25,
    excludeContactedWithinDays: 7,
    tag: "REGULAR",
    recentDays: 30,
  })

  const defaultTemplateForm = {
    name: "",
    metaTemplateName: "",
    language: "fr",
    previewText: "",
    bodyVariables: ["customer_name", "product_name", "store_name"],
  }

  const [templateForm, setTemplateForm] = useState(defaultTemplateForm)

  const selectedProduct = products.find((item) => item.id === builder.productId)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [productsRes, templatesRes, campaignsRes] = await Promise.all([
        productsAPI.getAll({ active: true }),
        campaignsAPI.getTemplates(),
        campaignsAPI.getAll(),
      ])

      setProducts(readPayload(productsRes).products || readPayload(productsRes) || [])
      setTemplates(readPayload(templatesRes).templates || [])
      setCampaigns(readPayload(campaignsRes).campaigns || [])
    } catch (loadError) {
      setError(readError(loadError, copy.reloadError))
    } finally {
      setLoading(false)
    }
  }, [copy.reloadError])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!productIdFromQuery) return
    setBuilder((current) => ({
      ...current,
      productId: productIdFromQuery,
      audienceType:
        current.audienceType === "ALL_BUYERS" ? "SAME_PRODUCT_BUYERS" : current.audienceType,
    }))
  }, [productIdFromQuery])

  useEffect(() => {
    if (!selectedProduct) return
    setBuilder((current) => {
      if (current.name.trim()) return current
      return { ...current, name: `Campagne - ${selectedProduct.name}` }
    })
  }, [selectedProduct])

  const upsertCampaign = (campaign) => {
    setCampaigns((current) => {
      const exists = current.some((item) => item.id === campaign.id)
      if (!exists) return [campaign, ...current]
      return current.map((item) => (item.id === campaign.id ? campaign : item))
    })
  }

  const removeCampaign = (campaignId) => {
    setCampaigns((current) => current.filter((item) => item.id !== campaignId))
  }

  const upsertTemplate = (template) => {
    setTemplates((current) => {
      const exists = current.some((item) => item.id === template.id)
      if (!exists) return [template, ...current]
      return current.map((item) => (item.id === template.id ? template : item))
    })
  }

  const removeTemplate = (templateId) => {
    setTemplates((current) => current.filter((item) => item.id !== templateId))
  }

  const resetTemplateForm = () => {
    setTemplateForm(defaultTemplateForm)
    setEditingTemplateId("")
  }

  const getPreviewPayload = () => ({
    productId: builder.productId || null,
    audienceType: builder.audienceType,
    templateId: builder.templateId || null,
    filters: {
      tag: builder.audienceType === "TAG_BUYERS" ? builder.tag : null,
      lastOrderWithinDays: builder.audienceType === "RECENT_BUYERS" ? builder.recentDays : 0,
      excludeContactedWithinDays: builder.excludeContactedWithinDays,
    },
  })

  const handlePreview = async () => {
    setPreviewing(true)
    setError("")
    setSuccess("")

    try {
      const response = await campaignsAPI.preview(getPreviewPayload())
      const payload = readPayload(response)
      setPreview(payload)
      if ((payload.summary?.audienceCount || 0) === 0) {
        setSuccess(copy.previewEmpty)
      }
    } catch (previewError) {
      setError(readError(previewError, copy.reloadError))
    } finally {
      setPreviewing(false)
    }
  }

  const handleCreateCampaign = async () => {
    setCreatingCampaign(true)
    setError("")
    setSuccess("")

    try {
      const response = await campaignsAPI.create({
        name: builder.name,
        productId: builder.productId || null,
        audienceType: builder.audienceType,
        templateId: builder.templateId,
        batchSize: builder.batchSize,
        filters: {
          tag: builder.audienceType === "TAG_BUYERS" ? builder.tag : null,
          lastOrderWithinDays: builder.audienceType === "RECENT_BUYERS" ? builder.recentDays : 0,
          excludeContactedWithinDays: builder.excludeContactedWithinDays,
        },
      })

      const campaign = readPayload(response).campaign
      if (campaign) upsertCampaign(campaign)
      setSuccess(copy.createSuccess)
      setPreview(null)
    } catch (createError) {
      setError(readError(createError, copy.reloadError))
    } finally {
      setCreatingCampaign(false)
    }
  }

  const handleCreateTemplate = async () => {
    setCreatingTemplate(true)
    setError("")
    setSuccess("")

    try {
      const response = editingTemplateId
        ? await campaignsAPI.updateTemplate(editingTemplateId, templateForm)
        : await campaignsAPI.createTemplate(templateForm)
      const template = readPayload(response).template
      if (template) {
        upsertTemplate(template)
        setBuilder((current) => ({
          ...current,
          templateId: current.templateId || template.id,
        }))
      }
      setSuccess(copy.templateSuccess)
      resetTemplateForm()
    } catch (templateError) {
      setDeleteDialog(null)
      setError(readError(templateError, copy.reloadError))
    } finally {
      setCreatingTemplate(false)
    }
  }

  const handleEditTemplate = (template) => {
    setEditingTemplateId(template.id)
    setTemplateForm({
      name: template.name || "",
      metaTemplateName: template.metaTemplateName || "",
      language: template.language || "fr",
      previewText: template.previewText || "",
      bodyVariables: Array.isArray(template.bodyVariables) ? template.bodyVariables : defaultTemplateForm.bodyVariables,
    })
    setError("")
    setSuccess("")
  }

  const handleDeleteTemplate = async (template) => {
    setDeletingTemplateId(template.id)
    setError("")
    setSuccess("")

    try {
      await campaignsAPI.deleteTemplate(template.id)
      removeTemplate(template.id)
      if (builder.templateId === template.id) {
        setBuilder((current) => ({ ...current, templateId: "" }))
      }
      if (editingTemplateId === template.id) {
        resetTemplateForm()
      }
      setDeleteDialog(null)
    } catch (templateError) {
      setError(readError(templateError, copy.reloadError))
    } finally {
      setDeletingTemplateId("")
    }
  }

  const runDispatchLoop = async (campaignId) => {
    for (let round = 0; round < 40; round += 1) {
      const response = await campaignsAPI.dispatch(campaignId)
      const payload = readPayload(response)
      if (payload.campaign) upsertCampaign(payload.campaign)
      if (!payload.hasMore || payload.fatalError || payload.processed === 0) break
    }
  }

  const handleLaunch = async (campaignId) => {
    setDispatchingId(campaignId)
    setError("")
    setSuccess("")

    try {
      await runDispatchLoop(campaignId)
    } catch (dispatchError) {
      setError(readError(dispatchError, copy.reloadError))
    } finally {
      setDispatchingId("")
    }
  }

  const handlePause = async (campaignId) => {
    setPausingId(campaignId)
    setError("")

    try {
      const response = await campaignsAPI.update(campaignId, { status: "PAUSED" })
      const campaign = readPayload(response).campaign
      if (campaign) upsertCampaign(campaign)
    } catch (pauseError) {
      setError(readError(pauseError, copy.reloadError))
    } finally {
      setPausingId("")
    }
  }

  const handleRestart = async (campaignId) => {
    setDispatchingId(campaignId)
    setError("")
    setSuccess("")

    try {
      const response = await campaignsAPI.restart(campaignId)
      const campaign = readPayload(response).campaign
      if (campaign) upsertCampaign(campaign)
      await runDispatchLoop(campaignId)
    } catch (restartError) {
      setError(readError(restartError, copy.reloadError))
    } finally {
      setDispatchingId("")
    }
  }

  const handleDelete = async (campaign) => {
    setDeletingId(campaign.id)
    setError("")
    setSuccess("")

    try {
      await campaignsAPI.delete(campaign.id)
      removeCampaign(campaign.id)
      setDeleteDialog(null)
    } catch (deleteError) {
      setDeleteDialog(null)
      setError(readError(deleteError, copy.reloadError))
    } finally {
      setDeletingId("")
    }
  }

  const getCampaignAction = (campaign) => {
    if (campaign.status === "RUNNING") {
      return {
        label: copy.pause,
        icon: Pause,
        loading: pausingId === campaign.id,
        onClick: () => handlePause(campaign.id),
        className: "inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-60",
      }
    }

    if (["COMPLETED", "FAILED", "CANCELLED"].includes(campaign.status)) {
      return {
        label: actionCopy.restart,
        icon: RotateCcw,
        loading: dispatchingId === campaign.id,
        onClick: () => handleRestart(campaign.id),
        className: "inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60",
      }
    }

    return {
      label: campaign.status === "PAUSED" ? actionCopy.resume : copy.launch,
      icon: Play,
      loading: dispatchingId === campaign.id,
      onClick: () => handleLaunch(campaign.id),
      className: "inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60",
    }
  }

  const toggleVariable = (key) => {
    setTemplateForm((current) => ({
      ...current,
      bodyVariables: current.bodyVariables.includes(key)
        ? current.bodyVariables.filter((item) => item !== key)
        : [...current.bodyVariables, key],
    }))
  }

  const openDeleteDialog = (type, item) => {
    setError("")
    setSuccess("")
    setDeleteDialog({ type, item })
  }

  const closeDeleteDialog = () => {
    if (deletingId || deletingTemplateId) return
    setDeleteDialog(null)
  }

  const confirmDelete = async () => {
    if (!deleteDialog) return

    if (deleteDialog.type === "template") {
      await handleDeleteTemplate(deleteDialog.item)
      return
    }

    await handleDelete(deleteDialog.item)
  }

  const getDeleteDialogMessage = () => {
    if (!deleteDialog) return ""

    const name = deleteDialog.item?.name || copy.optional
    return deleteDialog.type === "template"
      ? templateActionCopy.deleteConfirm.replace("{name}", name)
      : actionCopy.deleteConfirm.replace("{name}", name)
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex items-center gap-3">
        <Loader2 size={18} className="animate-spin text-brand-600" />
        <span className="text-sm text-muted-foreground">{copy.loading}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex flex-col gap-2 rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
            <Megaphone size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className={cn(
          "rounded-2xl border p-4 text-sm",
          error
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        )}>
          <div className="flex items-start gap-2">
            {error ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            <span>{error || success}</span>
          </div>
        </div>
      )}

      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{actionCopy.deleteTitle}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{getDeleteDialogMessage()}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={Boolean(deletingId || deletingTemplateId)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {actionCopy.cancelDelete}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId || deletingTemplateId)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {(deletingId || deletingTemplateId) ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {(deletingId || deletingTemplateId) ? actionCopy.deleting : actionCopy.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-brand-600" />
            <h2 className="text-base font-semibold text-foreground">{copy.builder}</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.name}</span>
              <input
                value={builder.name}
                onChange={(event) => setBuilder((current) => ({ ...current, name: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.product}</span>
              <select
                value={builder.productId}
                onChange={(event) => setBuilder((current) => ({ ...current, productId: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              >
                <option value="">{copy.selectProduct}</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.audience}</span>
              <select
                value={builder.audienceType}
                onChange={(event) => setBuilder((current) => ({ ...current, audienceType: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              >
                {getAudienceOptions(copy).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.template}</span>
              <select
                value={builder.templateId}
                onChange={(event) => setBuilder((current) => ({ ...current, templateId: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              >
                <option value="">{copy.selectTemplate}</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} · {template.language}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.batch}</span>
              <input
                type="number"
                min="1"
                max="100"
                value={builder.batchSize}
                onChange={(event) => setBuilder((current) => ({ ...current, batchSize: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.excludeRecent}</span>
              <input
                type="number"
                min="0"
                value={builder.excludeContactedWithinDays}
                onChange={(event) => setBuilder((current) => ({ ...current, excludeContactedWithinDays: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              />
            </label>

            {builder.audienceType === "TAG_BUYERS" && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">{copy.tag}</span>
                <select
                  value={builder.tag}
                  onChange={(event) => setBuilder((current) => ({ ...current, tag: event.target.value }))}
                  className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
                >
                  <option value="NEW">NEW</option>
                  <option value="REGULAR">REGULAR</option>
                  <option value="VIP">VIP</option>
                  <option value="PROSPECT">PROSPECT</option>
                </select>
              </label>
            )}

            {builder.audienceType === "RECENT_BUYERS" && (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">{copy.recentDays}</span>
                <input
                  type="number"
                  min="1"
                  value={builder.recentDays}
                  onChange={(event) => setBuilder((current) => ({ ...current, recentDays: event.target.value }))}
                  className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
                />
              </label>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handlePreview}
              disabled={previewing}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-60"
            >
              {previewing ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
              {copy.preview}
            </button>
            <button
              onClick={handleCreateCampaign}
              disabled={creatingCampaign || !builder.templateId}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {creatingCampaign ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {copy.createCampaign}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-border bg-secondary/20 p-4">
            {!preview ? (
              <p className="text-sm text-muted-foreground">{copy.noPreview}</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    { label: copy.matched, value: preview.summary?.audienceCount || 0 },
                    { label: copy.eligible, value: preview.summary?.eligibleCount || 0 },
                    { label: copy.skipped, value: preview.summary?.skippedCount || 0 },
                    { label: copy.optedOut, value: preview.summary?.optedOutCount || 0 },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-border bg-card px-4 py-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-lg font-bold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">{copy.samples}</p>
                  {preview.sampleRecipients?.length ? (
                    <div className="mt-3 flex flex-col gap-2">
                      {preview.sampleRecipients.map((recipient) => (
                        <div key={`${recipient.customerId || recipient.phone}`} className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium text-foreground">{recipient.customerName}</p>
                            <p className="text-xs text-muted-foreground">{recipient.phone || "—"}</p>
                          </div>
                          <span className="text-xs font-semibold text-brand-600">
                            {formatAmount(recipient.latestOrderTotal || 0, "fr-FR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">{copy.previewEmpty}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShoppingBag size={16} className="text-brand-600" />
            <h2 className="text-base font-semibold text-foreground">
              {editingTemplateId ? templateActionCopy.editMode : copy.templates}
            </h2>
          </div>

          <div className="grid gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.templateName}</span>
              <input
                value={templateForm.name}
                onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.metaTemplateName}</span>
              <input
                value={templateForm.metaTemplateName}
                onChange={(event) => setTemplateForm((current) => ({ ...current, metaTemplateName: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">{copy.templateLang}</span>
                <select
                  value={templateForm.language}
                  onChange={(event) => setTemplateForm((current) => ({ ...current, language: event.target.value }))}
                  className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
                >
                  <option value="fr">fr</option>
                  <option value="ar">ar</option>
                  <option value="en_US">en_US</option>
                </select>
              </label>

              <div className="rounded-2xl border border-dashed border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                {copy.templateHint}
              </div>
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-muted-foreground">{copy.templatePreview}</span>
              <textarea
                rows={3}
                value={templateForm.previewText}
                onChange={(event) => setTemplateForm((current) => ({ ...current, previewText: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 outline-none focus:border-brand-400"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">{copy.templateVars}</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {TEMPLATE_VARIABLE_DEFS.map((item) => {
                  const active = templateForm.bodyVariables.includes(item.key)
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleVariable(item.key)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "border-brand-300 bg-brand-600/10 text-brand-700 dark:text-brand-300"
                          : "border-border bg-background text-foreground hover:bg-secondary"
                      )}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleCreateTemplate}
              disabled={creatingTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
            >
              {creatingTemplate ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {editingTemplateId ? templateActionCopy.update : copy.createTemplateBtn}
            </button>
            {editingTemplateId && (
              <button
                type="button"
                onClick={resetTemplateForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                {templateActionCopy.cancelEdit}
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{copy.noTemplates}</p>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="rounded-2xl border border-border bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.metaTemplateName} · {template.language}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setBuilder((current) => ({ ...current, templateId: template.id }))}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
                      >
                        {copy.template}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditTemplate(template)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
                      >
                        <Pencil size={12} />
                        {templateActionCopy.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteDialog("template", template)}
                        disabled={deletingTemplateId === template.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingTemplateId === template.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        {deletingTemplateId === template.id ? templateActionCopy.deleting : templateActionCopy.deleteTemplate}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone size={16} className="text-brand-600" />
            <h2 className="text-base font-semibold text-foreground">{copy.history}</h2>
          </div>
          <button
            onClick={loadData}
            className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            {copy.recheck}
          </button>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.noCampaigns}</p>
        ) : (
          <div className="grid gap-3">
            {campaigns.map((campaign) => {
              const action = getCampaignAction(campaign)
              const ActionIcon = action.icon
              const deleteLoading = deletingId === campaign.id
              const canDelete = campaign.status !== "RUNNING"

              return (
              <div key={campaign.id} className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{campaign.name}</p>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", getStatusClass(campaign.status))}>
                        {copy.status[campaign.status] || campaign.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {(campaign.product?.name || copy.optional)} · {(campaign.template?.name || copy.optional)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={action.onClick}
                      disabled={action.loading || deleteLoading}
                      className={action.className}
                    >
                      {action.loading ? <Loader2 size={15} className="animate-spin" /> : <ActionIcon size={15} />}
                      {action.loading ? copy.dispatching : action.label}
                    </button>
                    <button
                      onClick={() => openDeleteDialog("campaign", campaign)}
                      disabled={!canDelete || deleteLoading || action.loading}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleteLoading ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      {deleteLoading ? actionCopy.deleting : actionCopy.deleteCampaign}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  {[
                    { label: copy.matched, value: campaign.audienceCount || 0 },
                    { label: copy.eligible, value: campaign.eligibleCount || 0 },
                    { label: "Sent", value: campaign.sentCount || 0 },
                    { label: "Failed", value: campaign.failedCount || 0 },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border bg-card px-3 py-2">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-base font-bold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
