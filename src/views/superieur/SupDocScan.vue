<template>
  <transition name="sds-fade">
    <div v-if="doc" class="sds-overlay" @click.self="cancel">
      <div class="sds-modal">
        <div class="sds-head">
          <h2 class="sds-title">Ajouter — {{ doc.label }}</h2>
          <button class="sds-close" type="button" @click="cancel" aria-label="Fermer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="sds-tabs">
          <button type="button" :class="{ on: mode === 'scan' }" @click="setMode('scan')">Scanner (caméra)</button>
          <button type="button" :class="{ on: mode === 'import' }" @click="setMode('import')">Importer un fichier</button>
        </div>

        <div class="sds-body">
          <!-- Aperçu capturé / importé -->
          <div v-if="preview || pdfName" class="sds-preview">
            <img v-if="preview" :src="preview" class="sds-preview-img" alt="Aperçu du document" />
            <div v-else class="sds-pdf">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
              <div>{{ pdfName }}</div>
            </div>
            <label v-if="preview" class="sds-bw">
              <input type="checkbox" v-model="bw" @change="applyPreview" />
              Rendu « document » (noir &amp; blanc, contraste renforcé)
            </label>
          </div>

          <!-- Mode caméra -->
          <template v-else-if="mode === 'scan'">
            <div v-if="camError" class="sds-cam-err">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:6px"><path d="M23 7l-7 5 7 5V7z"/><path d="M16 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h13"/><path d="M1 1l22 22"/></svg>
              <div>{{ camError }}</div>
              <div class="sds-cam-err-actions">
                <button type="button" class="sds-linkbtn" @click="startCamera">Réessayer</button>
                <button type="button" class="sds-linkbtn" @click="setMode('import')">Importer un fichier</button>
              </div>
            </div>
            <div v-else class="sds-cam-wrap">
              <video ref="video" autoplay playsinline muted class="sds-video"></video>
              <div class="sds-cam-frame"></div>
              <div class="sds-cam-hint">Cadrez le document dans le rectangle, puis capturez.</div>
            </div>
          </template>

          <!-- Mode import -->
          <template v-else>
            <label class="sds-drop">
              <input type="file" accept="image/*,application/pdf" @change="onFile" />
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
              <div class="sds-drop-txt">Choisir une photo ou un PDF</div>
              <div class="sds-drop-sub">JPG, PNG ou PDF</div>
            </label>
          </template>
        </div>

        <div class="sds-actions">
          <button type="button" class="sds-btn-ghost" @click="cancel">Annuler</button>
          <button v-if="mode === 'scan' && !preview && !camError" type="button" class="sds-btn-primary" @click="capture">Capturer</button>
          <button v-if="preview || pdfName" type="button" class="sds-btn-ghost" @click="retake">Reprendre</button>
          <button v-if="preview || pdfName" type="button" class="sds-btn-primary" @click="use">Joindre ce document</button>
        </div>
        <canvas ref="canvas" class="sds-hidden"></canvas>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps({ doc: { type: Object, default: null } })
const emit = defineEmits(['close', 'attached'])

const mode = ref('scan')
const video = ref(null)
const canvas = ref(null)
const preview = ref(null)   // dataURL affiché (après éventuel N&B)
const rawPreview = ref(null) // dataURL original (couleur)
const bw = ref(true)
const pdfName = ref(null)
const camError = ref('')
let stream = null

watch(() => props.doc, (d) => {
  if (d) { resetState(); if (mode.value === 'scan') startCamera() }
  else { stopCamera() }
})

function resetState() {
  preview.value = null; rawPreview.value = null; pdfName.value = null; camError.value = ''; bw.value = true
}

async function startCamera() {
  camError.value = ''
  try {
    stopCamera()
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    await nextTick()
    if (video.value) { video.value.srcObject = stream; await video.value.play().catch(() => {}) }
  } catch (e) {
    camError.value = "Caméra indisponible ou accès refusé. Vous pouvez importer un fichier."
  }
}
function stopCamera() {
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null }
  if (video.value) video.value.srcObject = null
}

function setMode(m) {
  mode.value = m
  resetState()
  if (m === 'scan') startCamera(); else stopCamera()
}

function drawToCanvas(source, w, h) {
  const cv = canvas.value
  cv.width = w; cv.height = h
  cv.getContext('2d').drawImage(source, 0, 0, w, h)
}
// Rendu « scan » : niveaux de gris + contraste (façon CamScanner).
function makeDataUrl(applyBw) {
  const cv = canvas.value
  if (applyBw) {
    const ctx = cv.getContext('2d')
    const img = ctx.getImageData(0, 0, cv.width, cv.height)
    const d = img.data
    const contrast = 1.4, brightness = 14
    for (let i = 0; i < d.length; i += 4) {
      let g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      g = (g - 128) * contrast + 128 + brightness
      g = g < 0 ? 0 : g > 255 ? 255 : g
      d[i] = d[i + 1] = d[i + 2] = g
    }
    ctx.putImageData(img, 0, 0)
  }
  return cv.toDataURL('image/jpeg', 0.85)
}

function capture() {
  if (!video.value || !video.value.videoWidth) return
  drawToCanvas(video.value, video.value.videoWidth, video.value.videoHeight)
  rawPreview.value = canvas.value.toDataURL('image/jpeg', 0.85)
  applyPreview()
  stopCamera()
}

function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  if (file.type === 'application/pdf') { pdfName.value = file.name; preview.value = null; rawPreview.value = null; return }
  const reader = new FileReader()
  reader.onload = () => {
    const im = new Image()
    im.onload = () => { drawToCanvas(im, im.naturalWidth, im.naturalHeight); rawPreview.value = canvas.value.toDataURL('image/jpeg', 0.85); applyPreview() }
    im.src = reader.result
  }
  reader.readAsDataURL(file)
}

// Recalcule l'aperçu depuis l'image brute selon l'option N&B.
function applyPreview() {
  if (!rawPreview.value) return
  const im = new Image()
  im.onload = () => { drawToCanvas(im, im.naturalWidth, im.naturalHeight); preview.value = makeDataUrl(bw.value) }
  im.src = rawPreview.value
}

function retake() {
  preview.value = null; rawPreview.value = null; pdfName.value = null
  if (mode.value === 'scan') startCamera()
}
function use() {
  emit('attached', { key: props.doc.key, dataUrl: preview.value || null, isPdf: !!pdfName.value, name: pdfName.value || null })
  stopCamera()
}
function cancel() { stopCamera(); emit('close') }

onUnmounted(stopCamera)
</script>

<style scoped>
.sds-overlay { position: fixed; inset: 0; z-index: 1200; background: rgba(12, 45, 90, 0.6); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 18px; }
.sds-modal { width: 100%; max-width: 460px; max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 18px; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32); }
.sds-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; border-bottom: 1px solid #eef1f6; }
.sds-title { font-family: 'Poppins', sans-serif; font-size: 15px; font-weight: 800; color: #14203f; margin: 0; }
.sds-close { width: 30px; height: 30px; border-radius: 8px; background: #f1f3f7; border: none; color: #6b7280; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.sds-tabs { display: flex; gap: 6px; padding: 12px 18px 0; }
.sds-tabs button { flex: 1; background: #f5f7fb; border: 1.5px solid #e2e7f0; border-radius: 10px; padding: 9px 8px; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 12.5px; color: #5b6472; cursor: pointer; }
.sds-tabs button.on { border-color: #1558B0; background: rgba(21, 88, 176, 0.06); color: #1558B0; }
.sds-body { padding: 16px 18px; min-height: 220px; display: flex; flex-direction: column; justify-content: center; }
.sds-cam-wrap { position: relative; }
.sds-video { width: 100%; border-radius: 12px; background: #000; display: block; }
.sds-cam-frame { position: absolute; inset: 12px; border: 2px dashed rgba(255, 255, 255, 0.7); border-radius: 8px; pointer-events: none; }
.sds-cam-hint { text-align: center; font-size: 12px; color: #6b7280; margin-top: 8px; }
.sds-cam-err { text-align: center; color: #B45309; font-size: 13.5px; padding: 20px 8px; }
.sds-cam-err-actions { display: flex; gap: 16px; justify-content: center; margin-top: 6px; flex-wrap: wrap; }
.sds-linkbtn { display: inline-block; margin-top: 10px; background: none; border: none; color: #1558B0; font-weight: 600; text-decoration: underline; cursor: pointer; font-size: 13px; }
.sds-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 30px 16px; border: 2px dashed #cdd6e5; border-radius: 12px; color: #5b6472; cursor: pointer; text-align: center; }
.sds-drop input { display: none; }
.sds-drop-txt { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 14px; color: #14203f; }
.sds-drop-sub { font-size: 12px; color: #9aa2b1; }
.sds-preview { text-align: center; }
.sds-preview-img { max-width: 100%; max-height: 300px; border-radius: 10px; border: 1px solid #e2e7f0; }
.sds-pdf { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #5b6472; padding: 24px; font-size: 13.5px; }
.sds-bw { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 12px; font-size: 13px; color: #14203f; }
.sds-bw input { width: 16px; height: 16px; accent-color: #1558B0; }
.sds-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; padding: 4px 18px 18px; }
.sds-btn-ghost { padding: 9px 15px; border: 1.5px solid #e2e7f0; border-radius: 10px; background: #fff; font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 13px; color: #5b6472; cursor: pointer; }
.sds-btn-primary { padding: 9px 16px; border: none; border-radius: 10px; background: linear-gradient(135deg, #1558B0, #3b7dd8); color: #fff; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; }
.sds-hidden { display: none; }
.sds-fade-enter-active, .sds-fade-leave-active { transition: opacity 0.2s ease; }
.sds-fade-enter-from, .sds-fade-leave-to { opacity: 0; }
</style>
