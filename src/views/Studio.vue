<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { supabase } from '../supabase.js'
import { KEYS } from '../lib/chords.js'
import SongSheet from '../components/SongSheet.vue'

// ---------- auth ----------
const session = ref(null)
const email = ref('')
const password = ref('')
const authError = ref('')

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  supabase.auth.onAuthStateChange((_e, s) => (session.value = s))
  loadSongList()
})

async function login() {
  authError.value = ''
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  if (error) authError.value = 'เข้าสู่ระบบไม่สำเร็จ: ' + error.message
}

async function logout() {
  await supabase.auth.signOut()
}

// ---------- song being edited ----------
const editingId = ref(null) // null = new song
const meta = reactive({ number: null, title_th: '', title_en: '' })
const content = reactive({ key: 'C', timeSignature: '4/4', lines: [[newSegment()]] })
const saveMsg = ref('')

function newSegment() {
  return { type: 'segment', chord: '', note: '', lyric: '' }
}

function addItem(line, type) {
  if (type === 'segment') line.push(newSegment())
  else if (type === 'bar') line.push({ type: 'bar' })
  else line.push({ type: 'marker', label: '***' })
}

function removeItem(line, idx) {
  line.splice(idx, 1)
}

function addLine() {
  content.lines.push([newSegment()])
}

function copyLine(li) {
  const copy = JSON.parse(JSON.stringify(content.lines[li]))
  copy.forEach((item) => {
    if (item.type === 'segment') item.lyric = ''
  })
  content.lines.splice(li + 1, 0, copy)
}

function removeLine(li) {
  content.lines.splice(li, 1)
}

// ---------- load / save ----------
const songList = ref([])

async function loadSongList() {
  const { data } = await supabase
    .from('songs')
    .select('id, number, title_th')
    .order('number', { ascending: true })
  songList.value = data ?? []
}

async function loadSong(id) {
  if (!id) return resetForm()
  const { data, error } = await supabase.from('songs').select('*').eq('id', id).single()
  if (error || !data) return
  editingId.value = data.id
  meta.number = data.number
  meta.title_th = data.title_th
  meta.title_en = data.title_en
  Object.assign(content, JSON.parse(JSON.stringify(data.content)))
}

function resetForm() {
  editingId.value = null
  meta.number = null
  meta.title_th = ''
  meta.title_en = ''
  content.key = 'C'
  content.timeSignature = '4/4'
  content.lines = [[newSegment()]]
  saveMsg.value = ''
}

async function save() {
  saveMsg.value = ''
  const row = {
    number: meta.number || null,
    title_th: meta.title_th.trim(),
    title_en: meta.title_en?.trim() || null,
    content: JSON.parse(JSON.stringify(content)),
  }
  if (!row.title_th) {
    saveMsg.value = '⚠️ กรุณาใส่ชื่อเพลงภาษาไทย'
    return
  }
  let error
  if (editingId.value) {
    ;({ error } = await supabase.from('songs').update(row).eq('id', editingId.value))
  } else {
    row.author_id = session.value?.user?.id
    const res = await supabase.from('songs').insert(row).select('id').single()
    error = res.error
    if (res.data) editingId.value = res.data.id
  }
  saveMsg.value = error ? '❌ บันทึกไม่สำเร็จ: ' + error.message : '✅ บันทึกแล้ว'
  if (!error) loadSongList()
}

// Open-source contribution path: anyone can build a song and export JSON
function downloadJson() {
  const data = { ...meta, content: JSON.parse(JSON.stringify(content)) }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = (meta.title_th || 'song') + '.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

const previewContent = computed(() => ({
  key: content.key,
  timeSignature: content.timeSignature,
  lines: content.lines,
}))
</script>

<template>
  <div>
    <!-- auth bar -->
    <div class="card no-print">
      <template v-if="session">
        <span>👤 {{ session.user.email }}</span>
        <button class="secondary" style="margin-left: 10px" @click="logout">ออกจากระบบ</button>
      </template>
      <template v-else>
        <form style="display: flex; gap: 8px; flex-wrap: wrap" @submit.prevent="login">
          <input v-model="email" type="email" placeholder="อีเมลทีมงาน" required />
          <input v-model="password" type="password" placeholder="รหัสผ่าน" required />
          <button type="submit">เข้าสู่ระบบ</button>
        </form>
        <p class="muted" style="margin: 8px 0 0">
          ไม่ได้เป็นทีมงานก็ใช้หน้านี้คีย์เพลงได้ — แล้วกด "ดาวน์โหลด JSON" ส่งให้ทีมงานนำเข้าระบบ
        </p>
        <p v-if="authError" style="color: var(--red); margin: 8px 0 0">{{ authError }}</p>
      </template>
    </div>

    <!-- song picker -->
    <div class="card" v-if="songList.length">
      <label>
        แก้ไขเพลงเดิม:
        <select :value="editingId ?? ''" @change="loadSong($event.target.value)">
          <option value="">— เพลงใหม่ —</option>
          <option v-for="s in songList" :key="s.id" :value="s.id">
            {{ s.number != null ? s.number + '. ' : '' }}{{ s.title_th }}
          </option>
        </select>
      </label>
      <button class="secondary" style="margin-left: 8px" @click="resetForm">เริ่มเพลงใหม่</button>
    </div>

    <!-- metadata -->
    <div class="card">
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <input v-model.number="meta.number" type="number" placeholder="เลขเพลง" style="width: 90px" />
        <input v-model="meta.title_th" placeholder="ชื่อเพลง (ไทย)" style="flex: 1; min-width: 180px" />
        <input v-model="meta.title_en" placeholder="ชื่อเพลง (อังกฤษ ถ้ามี)" style="flex: 1; min-width: 180px" />
        <label>คีย์:
          <select v-model="content.key">
            <option v-for="k in KEYS" :key="k" :value="k">{{ k }}</option>
          </select>
        </label>
        <label>จังหวะ:
          <select v-model="content.timeSignature">
            <option>4/4</option><option>3/4</option><option>6/8</option><option>2/4</option>
          </select>
        </label>
      </div>
    </div>

    <!-- line editor -->
    <div v-for="(line, li) in content.lines" :key="li" class="card">
      <div class="muted" style="margin-bottom: 8px">
        บรรทัดที่ {{ li + 1 }}
        <button class="secondary" style="margin-left: 8px" @click="copyLine(li)">คัดลอกโครง (คอร์ด+โน้ต)</button>
        <button class="danger" style="margin-left: 4px" @click="removeLine(li)" :disabled="content.lines.length === 1">ลบบรรทัด</button>
      </div>
      <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: flex-start">
        <div v-for="(item, ii) in line" :key="ii" style="border: 1px dashed var(--line); border-radius: 6px; padding: 6px">
          <template v-if="item.type === 'segment'">
            <input v-model="item.chord" placeholder="คอร์ด" style="width: 90px; display: block; margin-bottom: 4px; color: var(--red); font-weight: 700" />
            <input v-model="item.note" placeholder="โน้ต เช่น 5 5 6 1" style="width: 90px; display: block; margin-bottom: 4px; color: var(--blue)" />
            <input v-model="item.lyric" placeholder="เนื้อร้อง" style="width: 90px; display: block" />
          </template>
          <template v-else-if="item.type === 'bar'"><strong style="font-size: 20px">|</strong></template>
          <template v-else><input v-model="item.label" style="width: 60px" /></template>
          <button class="secondary" style="display: block; margin-top: 4px; padding: 2px 8px; font-size: 12px" @click="removeItem(line, ii)">✕</button>
        </div>
        <div>
          <button class="secondary" @click="addItem(line, 'segment')">+ ช่อง</button>
          <button class="secondary" @click="addItem(line, 'bar')" style="margin-left: 4px">+ |</button>
          <button class="secondary" @click="addItem(line, 'marker')" style="margin-left: 4px">+ ***</button>
        </div>
      </div>
    </div>
    <button class="secondary" @click="addLine">+ เพิ่มบรรทัด</button>

    <!-- actions -->
    <div class="card" style="margin-top: 12px">
      <button :disabled="!session" @click="save">💾 บันทึกขึ้นระบบ</button>
      <button class="secondary" style="margin-left: 8px" @click="downloadJson">⬇️ ดาวน์โหลด JSON</button>
      <span v-if="!session" class="muted" style="margin-left: 8px">(ต้องเข้าสู่ระบบก่อนจึงบันทึกได้)</span>
      <p v-if="saveMsg" style="margin: 8px 0 0">{{ saveMsg }}</p>
    </div>

    <!-- live preview -->
    <div class="card">
      <h3 style="margin-top: 0">ตัวอย่างแผ่นเพลง</h3>
      <h2 style="color: var(--blue)">{{ meta.number != null ? meta.number + '. ' : '' }}{{ meta.title_th || '(ยังไม่มีชื่อเพลง)' }}</h2>
      <p class="muted">Key {{ content.key }} · {{ content.timeSignature }}</p>
      <SongSheet :content="previewContent" mode="full" chord-system="letter" :display-key="content.key" />
    </div>
  </div>
</template>
