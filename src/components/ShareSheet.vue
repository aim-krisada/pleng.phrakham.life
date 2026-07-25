<script setup>
// Reusable share surface (EPIC H). Bottom-sheet on mobile, centred dialog on desktop. Shows a
// self-hosted QR + the link + copy; the OS share sheet when available; and — for a playlist —
// an email row (mailto, address never stored) + a .json backup download. NO account / NO PII:
// it only ever surfaces a link the caller already built (ids + user-set names).
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { t } from '../i18n/index.js'
import { qrSvg } from '../lib/qr.js'
import { copyText, canNativeShare, nativeShare, mailtoLink } from '../lib/share.js'

const props = defineProps({
  title: { type: String, default: '' },   // heading, e.g. 'แชร์ "เพลย์ลิสต์"'
  url: { type: String, required: true },   // the canonical share link
  shareText: { type: String, default: '' },// text for the OS share sheet
  email: { type: Boolean, default: false }, // show the email row (playlists)
  emailSubject: { type: String, default: '' },
  emailBody: { type: String, default: '' }, // the link is appended if not already inside
  downloadFile: { type: Object, default: null }, // { name, data } → offer a .json backup
})
const emit = defineEmits(['close'])

const qr = computed(() => qrSvg(props.url, { cell: 5, margin: 4 }))
const nativeOk = canNativeShare()
const copied = ref(false)
const emailTo = ref('')
const dialog = ref(null)

async function doCopy() {
  copied.value = await copyText(props.url)
  if (copied.value) setTimeout(() => (copied.value = false), 2000)
}
async function doNative() {
  const r = await nativeShare({ title: props.title, text: props.shareText, url: props.url })
  if (r === 'shared') emit('close')
}
function doEmail() {
  const body = props.emailBody && props.emailBody.includes(props.url)
    ? props.emailBody
    : `${props.emailBody ? props.emailBody + '\n\n' : ''}${props.url}`
  // opens the user's mail app; the typed address is used once and never stored/logged
  window.location.href = mailtoLink({ to: emailTo.value.trim(), subject: props.emailSubject, body })
}
function doDownload() {
  const blob = new Blob([JSON.stringify(props.downloadFile.data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = props.downloadFile.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function onKey(e) { if (e.key === 'Escape') emit('close') }
onMounted(() => {
  document.addEventListener('keydown', onKey)
  nextTick(() => dialog.value && dialog.value.focus())
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="ss-scrim" @click.self="emit('close')">
    <div ref="dialog" class="ss-sheet" role="dialog" aria-modal="true" :aria-label="title || t('share.title')" tabindex="-1">
      <div class="ss-head">
        <h2 class="ss-title">{{ title || t('share.title') }}</h2>
        <button type="button" class="ss-x" :aria-label="t('share.close')" @click="emit('close')">✕</button>
      </div>

      <div class="ss-qr" v-html="qr" aria-hidden="true"></div>
      <p class="ss-scan muted">{{ t('share.scan') }}</p>

      <div class="ss-link">
        <span class="ss-url">{{ url }}</span>
      </div>
      <div class="ss-actions">
        <button type="button" class="ss-btn" @click="doCopy">{{ copied ? t('share.copied') : t('share.copy') }}</button>
        <button v-if="nativeOk" type="button" class="ss-btn ghost" @click="doNative">{{ t('share.viaApp') }}</button>
      </div>
      <p v-if="copied" class="ss-toast" role="status" aria-live="polite">{{ t('share.copied') }}</p>

      <template v-if="email">
        <div class="ss-sep"></div>
        <label class="ss-email-lbl" for="ss-email">{{ t('share.emailLabel') }}</label>
        <div class="ss-email">
          <input id="ss-email" v-model="emailTo" type="email" inputmode="email" :placeholder="t('share.emailPlaceholder')" />
          <button type="button" class="ss-btn" @click="doEmail">{{ t('share.emailSend') }}</button>
        </div>
        <button v-if="downloadFile" type="button" class="ss-btn ghost ss-dl" @click="doDownload">{{ t('share.download') }}</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ss-scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;          /* mobile = bottom-sheet */
  justify-content: center;
}
.ss-sheet {
  width: 100%;
  max-width: 420px;
  max-height: 92vh;
  overflow-y: auto;
  background: var(--surface);
  color: var(--ink);
  border-radius: 16px 16px 0 0;
  padding: var(--sp-4) var(--sp-4) calc(var(--sp-4) + env(safe-area-inset-bottom, 0px));
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.25);
}
@media (min-width: 640px) {
  .ss-scrim { align-items: center; }   /* desktop = centred dialog */
  .ss-sheet { border-radius: 16px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3); }
}
.ss-head { display: flex; align-items: flex-start; gap: var(--sp-2); }
.ss-title { font-size: var(--fs-lg); margin: 0; flex: 1; color: var(--brand); }
.ss-x {
  flex: 0 0 auto; background: transparent; border: none; color: var(--muted);
  font-size: 1.1rem; cursor: pointer; min-width: var(--touch-min); min-height: var(--touch-min);
  border-radius: 10px;
}
@media (hover: hover) { .ss-x:hover { background: var(--cream-hover); } }
.ss-qr {
  display: flex; justify-content: center;
  margin: var(--sp-3) auto var(--sp-1);
  padding: var(--sp-3); background: #fff; border-radius: 12px; width: max-content;
}
.ss-qr :deep(svg) { width: 200px; height: 200px; display: block; }
.ss-scan { text-align: center; margin: 0 0 var(--sp-3); }
.ss-link {
  background: var(--cream); border: 1px solid var(--line); border-radius: 10px;
  padding: var(--sp-2) var(--sp-3); margin-bottom: var(--sp-3);
}
.ss-url { font-size: var(--fs-sm); color: var(--ink); word-break: break-all; }
.ss-actions { display: flex; gap: var(--sp-2); flex-wrap: wrap; }
.ss-btn {
  flex: 1 1 auto; min-height: var(--touch-min); border: none; border-radius: 10px;
  background: var(--accent); color: var(--ink); font: inherit; font-weight: 700; cursor: pointer;
  padding: 0 var(--sp-4);
}
@media (hover: hover) { .ss-btn:hover { background: var(--accent-hover); } }
.ss-btn.ghost { background: var(--cream); color: var(--ink); border: 1px solid var(--line); }
@media (hover: hover) { .ss-btn.ghost:hover { background: var(--cream-hover); } }
.ss-toast { text-align: center; color: var(--cat-green); font-size: var(--fs-sm); margin: var(--sp-2) 0 0; }
.ss-sep { border-top: 1px solid var(--line); margin: var(--sp-4) 0 var(--sp-3); }
.ss-email-lbl { display: block; font-size: var(--fs-sm); color: var(--muted); margin-bottom: var(--sp-1); }
.ss-email { display: flex; gap: var(--sp-2); }
.ss-email input { flex: 1 1 auto; min-width: 0; }
.ss-dl { width: 100%; margin-top: var(--sp-3); flex: none; }
</style>
