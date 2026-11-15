import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera, ImagePlus, Mic, MicOff, Sparkles, LocateFixed, CheckCircle2, AlertTriangle, ShieldAlert, X, PencilLine,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { analyzeComplaint, submitComplaint } from '../../lib/api'
import { compressImage } from '../../lib/image'
import { reverseGeocode } from '../../lib/geocode'
import { CATEGORIES, DEPARTMENTS, SEVERITIES, SEVERITY_FROM_SCORE } from '../../lib/constants'
import { Button, Card, Input, Select, SeverityBadge, useToast } from '../../components/ui'
import MapView from '../../components/MapView'

// Used only when the citizen fills the form manually (no AI score), or changes the severity away from the AI's.
const SCORE_BY_SEVERITY = { Critical: 90, High: 70, Medium: 45, Low: 15 }
const EMPTY_FORM = { title: '', description: '', category: '', subcategory: '', severity: '', department: '', safety_risk: false }
const SpeechRecognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

function Step({ n, title, hint, children }) {
  return (
    <Card as="section" aria-labelledby={`step-${n}`} className="mb-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">{n}</span>
        <div>
          <h2 id={`step-${n}`} className="text-lg font-bold leading-8">{title}</h2>
          {hint && <p className="text-sm text-navy-500">{hint}</p>}
        </div>
      </div>
      {children}
    </Card>
  )
}

export default function ReportIssue() {
  const { user } = useAuth()
  const toast = useToast()

  const [image, setImage] = useState(null) // { blob, dataUrl, base64 }
  const [text, setText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [analysisError, setAnalysisError] = useState('')
  const [manual, setManual] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const formRef = useRef(null)

  const [location, setLocation] = useState(null) // { lat, lng } from geolocation or a dropped pin only
  const [locating, setLocating] = useState(false)
  const [address, setAddress] = useState('')
  const [addressTouched, setAddressTouched] = useState(false)

  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const showForm = Boolean(analysis) || manual
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  /* ---------- Step 1: evidence ---------- */
  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file.')
    try {
      setImage(await compressImage(file))
      setAnalysisError('')
    } catch (e) {
      toast.error(e.message)
    }
  }

  useEffect(() => () => recRef.current?.stop(), [])
  function toggleVoice() {
    if (listening) return recRef.current?.stop()
    const rec = new SpeechRecognition()
    rec.lang = 'en-IN'
    rec.continuous = true
    rec.interimResults = false
    rec.onresult = (e) => {
      const heard = Array.from(e.results).slice(e.resultIndex).filter((r) => r.isFinal).map((r) => r[0].transcript).join(' ').trim()
      if (heard) setText((prev) => (prev ? `${prev} ${heard}` : heard))
    }
    rec.onerror = (e) => {
      setListening(false)
      toast.error(e.error === 'not-allowed' ? 'Microphone permission was denied.' : 'Voice input stopped. You can type instead.')
    }
    rec.onend = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  /* ---------- Step 2: AI analysis ---------- */
  async function analyze() {
    if (!image && !text.trim()) return toast.error('Add a photo or describe the problem first.')
    setAnalyzing(true)
    setAnalysisError('')
    try {
      const a = await analyzeComplaint({
        ...(image && { imageBase64: image.base64, mimeType: 'image/jpeg' }),
        ...(text.trim() && { text: text.trim() }),
      })
      setAnalysis(a)
      setManual(false)
      setForm({
        title: a.suggested_title || '',
        description: a.description || '',
        category: CATEGORIES.includes(a.category) ? a.category : 'Other',
        subcategory: a.subcategory || '',
        severity: SEVERITIES.includes(a.severity) ? a.severity : SEVERITY_FROM_SCORE(a.priority_score),
        department: DEPARTMENTS.includes(a.department) ? a.department : 'General Administration',
        safety_risk: Boolean(a.safety_risk),
      })
    } catch (e) {
      setAnalysisError(e.message || 'The AI analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }
  useEffect(() => { if (analysis) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [analysis])

  function continueManually() {
    setManual(true)
    setForm((f) => ({ ...f, description: f.description || text.trim() }))
  }

  /* ---------- Step 4: location ---------- */
  function useMyLocation() {
    if (!navigator.geolocation) return toast.error('Your browser does not support location. Tap the map to drop a pin instead.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); setErrors((e) => ({ ...e, location: undefined })) },
      (err) => {
        setLocating(false)
        toast.error(err.code === 1 ? 'Location permission was denied. Tap the map to drop a pin instead.' : 'Could not get your location. Tap the map to drop a pin instead.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }
  function pinMoved(p) { setLocation(p); setErrors((e) => ({ ...e, location: undefined })) }

  // One debounced Nominatim request per pin move
  useEffect(() => {
    if (!location || addressTouched) return
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try { const a = await reverseGeocode(location.lat, location.lng, ctrl.signal); if (a) setAddress(a) } catch { /* address is optional */ }
    }, 1000)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [location, addressTouched])

  /* ---------- Step 5: submit ---------- */
  async function submit() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Add a short title.'
    if (!form.description.trim()) errs.description = 'Describe the problem.'
    if (!form.category) errs.category = 'Choose a category.'
    if (!form.severity) errs.severity = 'Choose a severity.'
    if (!form.department) errs.department = 'Choose a department.'
    if (!location) errs.location = 'Share your location or tap the map to drop a pin.'
    setErrors(errs)
    if (Object.keys(errs).length) return toast.error('Please fix the highlighted fields.')

    setSubmitting(true)
    try {
      let image_url
      if (image) {
        const path = `${user.id}/${crypto.randomUUID()}.jpg`
        const { error } = await supabase.storage.from('complaint-images').upload(path, image.blob, { contentType: 'image/jpeg' })
        if (error) throw new Error(`Photo upload failed: ${error.message}`)
        image_url = supabase.storage.from('complaint-images').getPublicUrl(path).data.publicUrl
      }
      const keepAiScore = analysis && SEVERITY_FROM_SCORE(analysis.priority_score) === form.severity
      const res = await submitComplaint({
        title: form.title.trim(),
        description: form.description.trim(),
        ai_description: analysis?.description ?? null,
        category: form.category,
        subcategory: form.subcategory.trim() || null,
        severity: form.severity,
        priority_score: keepAiScore ? analysis.priority_score : SCORE_BY_SEVERITY[form.severity],
        ai_confidence: analysis?.confidence ?? null,
        safety_risk: form.safety_risk,
        department: form.department,
        latitude: location.lat,
        longitude: location.lng,
        address: address.trim() || null,
        ...(image_url && { image_url }),
      })
      setResult(res)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      toast.error(e.message || 'Could not submit your complaint. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setImage(null); setText(''); setAnalysis(null); setAnalysisError(''); setManual(false); setForm(EMPTY_FORM)
    setLocation(null); setAddress(''); setAddressTouched(false); setErrors({}); setResult(null)
  }

  /* ---------- Confirmation ---------- */
  if (result) {
    return (
      <div className="page max-w-xl">
        <Card className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-low/10 text-low"><CheckCircle2 className="h-8 w-8" aria-hidden="true" /></span>
          <h1 className="text-2xl font-extrabold">Complaint submitted</h1>
          <p className="mt-2 text-navy-500">Your complaint number is</p>
          <p className="my-2 font-display text-3xl font-extrabold text-brand">{result.complaint_number}</p>
          <p className="text-sm text-navy-500">Use it to track progress. You will see every status change on the complaint page.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button as={Link} to={`/complaints/${result.id}`}>View complaint</Button>
            <Button variant="secondary" onClick={reset}>Report another</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="page max-w-3xl">
      <h1 className="text-3xl font-extrabold">Report an issue</h1>
      <p className="mb-6 mt-1 text-navy-500">Add a photo or a few words. AI drafts the complaint and you check it before it is sent.</p>

      {/* 1. Evidence */}
      <Step n={1} title="Add evidence" hint="A photo, a description, or both.">
        {image ? (
          <div className="relative mb-4 overflow-hidden rounded-xl border border-line">
            <img src={image.dataUrl} alt="Your uploaded evidence" className="max-h-72 w-full object-cover" />
            <button onClick={() => setImage(null)} aria-label="Remove photo" className="absolute right-2 top-2 rounded-full bg-navy/80 p-1.5 text-white hover:bg-navy"><X className="h-4 w-4" /></button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
            className={`mb-4 flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-8 text-center ${dragOver ? 'border-brand bg-brand-soft' : 'border-line bg-canvas'}`}
          >
            <ImagePlus className="mb-2 h-8 w-8 text-navy-300" aria-hidden="true" />
            <p className="mb-3 text-sm text-navy-500">Drag a photo here, or choose one</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button as="label" variant="secondary" size="sm" icon={ImagePlus} className="cursor-pointer">
                Choose photo
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
              </Button>
              <Button as="label" variant="secondary" size="sm" icon={Camera} className="cursor-pointer">
                Take photo
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
              </Button>
            </div>
          </div>
        )}
        <Input
          as="textarea" rows={3} label="Describe the problem (optional)" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Large pothole near the bus stop, two bikes have already slipped here"
        />
        {SpeechRecognition && (
          <Button variant={listening ? 'danger' : 'secondary'} size="sm" icon={listening ? MicOff : Mic} onClick={toggleVoice} className="mt-2" aria-pressed={listening}>
            {listening ? 'Stop listening' : 'Speak instead'}
          </Button>
        )}
      </Step>

      {/* 2. Analyse */}
      <Step n={2} title="Analyse with AI" hint="AI reads your evidence and drafts the complaint. You can edit everything.">
        <Button icon={Sparkles} size="lg" loading={analyzing} onClick={analyze} disabled={analyzing}>
          {analysis ? 'Analyse again' : 'Analyse with AI'}
        </Button>
        {analyzing && (
          <div className="mt-4 space-y-2" aria-hidden="true">
            <div className="skeleton h-5 w-2/3" /><div className="skeleton h-4 w-full" /><div className="skeleton h-4 w-5/6" />
          </div>
        )}
        {analysisError && (
          <div role="alert" className="mt-4 flex gap-3 rounded-lg border border-critical/30 bg-critical/5 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-critical" aria-hidden="true" />
            <div>
              <p className="font-semibold">AI analysis failed</p>
              <p className="text-navy-500">{analysisError}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={analyze}>Try again</Button>
                <Button size="sm" variant="ghost" icon={PencilLine} onClick={continueManually}>Fill in manually</Button>
              </div>
            </div>
          </div>
        )}
        {!showForm && !analysisError && !analyzing && (
          <button onClick={continueManually} className="mt-3 block text-sm font-semibold text-brand hover:underline">Skip AI and fill in manually</button>
        )}
      </Step>

      {/* 3. Review */}
      {showForm && (
        <div ref={formRef} className="scroll-mt-24">
          <Step n={3} title="Review the details" hint={analysis ? undefined : 'Fill in the details yourself.'}>
            {analysis && (
              <div className="mb-5 rounded-lg border border-brand/20 bg-brand-soft p-4 text-sm">
                <p className="mb-2 flex items-center gap-2 font-semibold text-brand"><Sparkles className="h-4 w-4" aria-hidden="true" />AI suggested, please review</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span>Priority score: <strong>{analysis.priority_score}/100</strong></span>
                  <span>Confidence: <strong>{Math.round((analysis.confidence ?? 0) * 100)}%</strong></span>
                  <SeverityBadge severity={form.severity} aiSuggested={form.severity === analysis.severity} />
                </div>
                {analysis.safety_risk && (
                  <p className="mt-3 flex items-center gap-2 font-semibold text-critical"><ShieldAlert className="h-4 w-4" aria-hidden="true" />AI flagged a possible safety risk</p>
                )}
                {analysis.reasoning && <p className="mt-3 text-navy-500">{analysis.reasoning}</p>}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Input label="Title" value={form.title} onChange={setField('title')} error={errors.title} maxLength={120} /></div>
              <div className="sm:col-span-2"><Input as="textarea" rows={4} label="Description" value={form.description} onChange={setField('description')} error={errors.description} /></div>
              <Select label="Category" value={form.category} onChange={setField('category')} options={CATEGORIES} placeholder="Choose a category" error={errors.category} />
              <Input label="Subcategory (optional)" value={form.subcategory} onChange={setField('subcategory')} placeholder="e.g. Pothole" />
              <Select label="Severity" value={form.severity} onChange={setField('severity')} options={SEVERITIES} placeholder="Choose a severity" error={errors.severity} />
              <Select label="Department" value={form.department} onChange={setField('department')} options={DEPARTMENTS} placeholder="Choose a department" error={errors.department} />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" className="h-4 w-4 accent-brand" checked={form.safety_risk} onChange={(e) => setForm((f) => ({ ...f, safety_risk: e.target.checked }))} />
                This could put people at risk right now
              </label>
            </div>
          </Step>

          {/* 4. Location */}
          <Step n={4} title="Pin the location" hint="Use your current location, or tap the map to drop a pin. Drag the pin to adjust.">
            <Button variant="secondary" icon={LocateFixed} loading={locating} onClick={useMyLocation} className="mb-3">Use my current location</Button>
            <MapView
              selectable selected={location} onSelect={pinMoved} zoom={location ? 17 : 12}
              className="h-72 w-full" center={location ?? undefined}
            />
            {errors.location && <p role="alert" className="mt-2 text-sm text-critical">{errors.location}</p>}
            {location && <p className="mt-2 text-xs text-navy-500">Pin at {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>}
            <div className="mt-4">
              <Input
                label="Address or landmark (optional)" value={address}
                onChange={(e) => { setAddress(e.target.value); setAddressTouched(true) }}
                hint="Filled in automatically from the pin. You can edit it."
              />
              {addressTouched && location && (
                <button onClick={() => setAddressTouched(false)} className="mt-1 text-sm font-semibold text-brand hover:underline">Use address from pin</button>
              )}
            </div>
          </Step>

          {/* 5. Submit */}
          <Step n={5} title="Submit your complaint">
            <Button size="lg" loading={submitting} onClick={submit}>Submit complaint</Button>
            <p className="mt-3 text-xs text-navy-500">CivicEye is a demonstration platform. Complaints are not officially registered with any government authority.</p>
          </Step>
        </div>
      )}
    </div>
  )
}
