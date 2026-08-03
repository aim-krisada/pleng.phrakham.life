// Thai (ไทย) — the default + fallback locale. This is the SSOT for every UI string on the
// shell / home / nav surfaces (สาย 2). Add src/i18n/zh.js + en.js later with the SAME keys to
// translate; any key a translation is missing falls back to the Thai value here (i18n/index.js).
// Keys are namespaced by surface. {n}/{k}/… are interpolation slots filled by t(key, params).
export default {
  brand: {
    name: 'เพลง.พระคำ.ชีวิต',
    home: 'หน้าแรก · เพลง.พระคำ.ชีวิต',
  },
  nav: {
    songs: 'รายการเพลง',
    guide: 'คู่มือ',
    guideUse: 'คู่มือใช้งานโปรแกรม',
    guideMake: 'คู่มือทำเพลง',
    phrakham: 'พระคำ.ชีวิต',
    about: 'เกี่ยวกับเรา',
  },
  // รุ่นทดลอง /v2 ที่รันคู่กับรุ่นปัจจุบัน (docs/deploy-v2.md) — แสดงเฉพาะบิลด์ /v2
  version: {
    badge: 'v2',
    trial: 'รุ่นทดลอง',
    switchAria: 'คุณกำลังใช้รุ่นทดลอง v2 — แตะเพื่อกลับไปรุ่นปัจจุบัน',
  },
  action: {
    create: 'สร้างเพลงใหม่',
    createShort: 'เพลงใหม่',
    search: 'ค้นหาเพลง',
    settings: 'ตั้งค่า',
    menu: 'เมนู',
    tools: 'เครื่องมือ',
  },
  a11y: {
    searchFull: 'ค้นหาเพลง — ชื่อเพลง หมายเลข เนื้อร้อง คีย์ หรือโน้ตตัวเลข',
    favAdd: 'เพิ่มเข้ารายการโปรด',
    favRemove: 'เอาออกจากรายการโปรด',
  },
  font: {
    label: 'ตัวอักษรไทย',
    loopless: 'ไม่มีหัว',
    looped: 'มีหัว',
  },
  lang: {
    label: 'ภาษา',
    soon: 'เร็วๆ นี้',
    th: 'ไทย',
    zh: '中文',
    en: 'English',
  },
  list: {
    searchPlaceholder: 'ค้นหาเพลง',
    booksChip: 'เล่ม',
    favChip: 'รายการโปรด',
    favTitle: '★ รายการโปรด',
    favEmpty: 'ยังไม่มีรายการโปรด — แตะรูปดาว ☆ ที่เพลงเพื่อบันทึกไว้ที่นี่',
    results: 'ผลการค้นหา',
    countSongs: '{n} เพลง',
    onlyUnverified: '⚠️ เฉพาะที่ยังไม่ตรวจ',
    allThemes: 'ทุกธีม',
    filterByTheme: 'กรองตามธีม',
    noResults: 'ไม่พบเพลงที่ค้นหา',
    allBooks: '← เล่มทั้งหมด',
    noBookSongs: 'ยังไม่มีเพลงในเล่มนี้',
    dbNote: 'ยังเชื่อมต่อฐานข้อมูลไม่ได้ — แสดงเพลงตัวอย่างไปก่อน',
    loading: 'กำลังโหลด…',
    mustCheck: '⚠️ ต้องตรวจ',
    verified: '✓ ตรวจแล้ว',
    pending: 'ยังไม่ตรวจ',
    reviewed: '✓ ตรวจแล้ว {v} / {t}',
    key: 'คีย์ {k}',
    keyEn: 'Key {k}',
    srcSongs: 'แหล่งเพลง: {list}',
    refTitle: 'อ้างอิง: {list}',
    scripture: '📖 {ref}',
    // sort methods (B131 · labelKey in lib/songSort.js SORT_OPTIONS — keep the two in step)
    sortLabel: 'เรียงตาม',
    sortNumber: 'เลขข้อ',
    sortTitle: 'ชื่อเพลง',
    sortManual: 'ลำดับที่จัดไว้',
    sortRelevance: 'ตรงกับที่ค้นหา',
    // which way round — worded for the field being sorted (ascKey/descKey in songSort.js)
    dirNumberAsc: 'น้อยไปมาก',
    dirNumberDesc: 'มากไปน้อย',
    dirTitleAsc: 'ก ไป ฮ',
    dirTitleDesc: 'ฮ ไป ก',
    // spoken labels for the sort buttons (the arrow on the chip is decoration only)
    sortBtnOn: 'เรียงตาม {name} {dir} — กดเพื่อสลับเป็น {other}',
    sortBtnOff: 'เรียงตาม {name}',
    emptyPublic: 'เพลงกำลังอยู่ระหว่างตรวจทาน จะเปิดให้ชมเร็วๆ นี้',
    emptyNone: 'ยังไม่มีเพลงในระบบ',
    // shared-playlist view (/#/list?d=…)
    sharedBad: 'ลิงก์เพลย์ลิสต์ไม่ถูกต้องหรือเสียหาย',
    sharedIntro: 'เพลย์ลิสต์ที่แชร์มา — กด "บันทึกลงเครื่องนี้" เพื่อเก็บไว้ใช้ต่อ',
    saveHere: '⬇ บันทึกลงเครื่องนี้',
    savedDone: '✓ บันทึกแล้ว',
    backHome: '← กลับหน้าแรก',
    songMissing: '(ไม่พบเพลงนี้ในคลัง)',
    someMissing: 'พบ {found} จาก {total} เพลง (บางเพลงยังไม่มีในคลังนี้)',
    // team QA flag labels (logged-in tooltips)
    flagRepeat: 'ตั้งจุดซ้ำ (repeat)',
    flagLint: 'โน้ตอาจผิด (lint)',
    flagWords: 'เนื้อ≠โน้ต',
    flagPrefix: 'ต้องตรวจ: {kinds}',
  },
  // share sheet (ShareSheet.vue · EPIC H)
  share: {
    title: 'แชร์',
    close: 'ปิด',
    scan: 'สแกน QR เพื่อเปิดบนมือถือ',
    copy: 'คัดลอกลิงก์',
    copied: '✓ คัดลอกแล้ว',
    viaApp: 'แชร์ผ่านแอป…',
    emailLabel: 'ส่งเข้าอีเมล (ไม่เก็บอีเมลไว้):',
    emailPlaceholder: 'อีเมลผู้รับ',
    emailSend: 'ส่ง',
    download: '⬇ ดาวน์โหลดไฟล์สำรอง (.json)',
    songBtn: 'แชร์เพลงนี้',
    songTitle: 'แชร์ "{name}"',
    listTitle: 'แชร์เพลย์ลิสต์ "{name}"',
    listEmailSubject: 'เพลย์ลิสต์: {name}',
    listEmailBody: 'เปิดเพลย์ลิสต์ "{name}" ได้ที่ลิงก์นี้:',
  },
  // 717 — เพลงทำนองเดียวแต่มีเนื้อร้องหลายชุด: แท็บสลับชุดเหนือแผ่นเพลง
  lyricSet: {
    tablist: 'เลือกเนื้อร้อง',
    now: 'กำลังแสดงเนื้อร้อง: {name}',
    // A COUNT, not a list (26 ก.ค.): the sets are captioned by position, so naming them on a
    // catalog card would print "เนื้อร้องที่ 1 · เนื้อร้องที่ 2" and say nothing actionable. What a
    // searcher needs is that this song has words the card's own snippet (set 1's) does not show.
    otherSets: '♪ ทำนองเดียวกัน · {n} ชุดเนื้อร้อง',
    // …unless the search matched a set the card is NOT previewing, in which case the card says
    // WHICH set instead. That is the actionable fact — it replaces the count above rather than
    // joining it, since a card that names set 2 has already said the song has more than one.
    // {name} is always lyricSetName(), never a locally built string, so the card cannot caption
    // a set differently from the reader tabs / print heading / editor.
    foundIn: 'พบใน {name}',
    // the collapsed switcher: "ชุดเนื้อร้อง: <ชื่อชุดที่กำลังดู>  [2 ชุด]  ▾"
    summaryKey: 'ชุดเนื้อร้อง:',
    count: '{n} ชุด',
    // /v2's inline (✏️) editor is the only editor it has, so a new set of WORDS is made here
    add: '＋ เพิ่มชุด',
    addLone: '＋ เพิ่มชุดเนื้อร้อง',
    addTitle: 'เพิ่มเนื้อร้องชุดใหม่บนทำนองเดิม (โน้ตใช้ร่วมกัน)',
    // 🗑 ลบชุดนี้ — /v2 ships the ＋ that MAKES a set, so it has to ship the way out of one too.
    // Every string says the same two things: what goes (this set's WORDS) and what stays (the
    // melody) — the one thing a person needs to be sure of before pressing a destructive button.
    del: 'ลบชุดนี้',
    delTitle: 'ลบชุดเนื้อร้องที่เลือกอยู่ (เนื้อชุดนี้จะหาย · ทำนองยังอยู่)',
    delAria: 'ลบ {name}',
    // shown on the disabled button — a control that refuses has to say why (WCAG 3.3.1)
    delLastTitle: 'ลบไม่ได้ — เพลงต้องเหลือเนื้อร้องอย่างน้อย 1 ชุด',
    confirmTitle: 'ลบ “{name}” ?',
    confirmBody: 'เนื้อร้องชุดนี้จะหายทั้งหมด (กู้ไม่ได้ในหน้านี้) ·',
    confirmKeep: 'ทำนองยังอยู่',
    confirmCancel: 'ยกเลิก',
    confirmDel: 'ลบชุดนี้',
    // aria-live after the delete: the captions RENUMBER, so say what is left, not just "ลบแล้ว"
    deleted: 'ลบ {name} แล้ว · เหลือ {n} ชุด',
    deletedLast: 'ลบ {name} แล้ว · เหลือเนื้อร้องชุดเดียว',
    // A shared link names a set by its PERMANENT id. When that set is gone (deleted, or the song
    // collapsed back to one set) the link still opens the song — one that opens nothing is worse —
    // but the first set's words must NOT be passed off as the ones the link pointed at.
    linkGone: 'เนื้อร้องชุดที่ลิงก์นี้ชี้ไว้ถูกลบไปแล้ว · กำลังแสดงเนื้อร้องชุดแรกแทน',
  },
  // issue9 lead-sheet header — ชื่อเพลง + แถบ คีย์ · อัตราจังหวะ · ความเร็ว เหนือแผ่นเพลง
  leadHeader: {
    metaLabel: 'ข้อมูลเพลง',
    key: 'คีย์',
    orig: 'ต้นฉบับ',
    time: 'อัตราจังหวะ',
    tempo: 'ความเร็ว',
  },
  // playlists manager (SongList · EPIC I)
  playlist: {
    chip: 'เพลย์ลิสต์',
    title: '🎵 เพลย์ลิสต์ของฉัน',
    create: '＋ สร้างเพลย์ลิสต์',
    createName: 'ตั้งชื่อเพลย์ลิสต์',
    empty: 'ยังไม่มีเพลย์ลิสต์ — กด "สร้างเพลย์ลิสต์" เพื่อเริ่มจัดชุดเพลง',
    count: '{n} เพลง',
    share: 'แชร์',
    rename: 'เปลี่ยนชื่อ',
    remove: 'ลบเพลย์ลิสต์',
    confirmDelete: 'ลบเพลย์ลิสต์ "{name}"?',
    back: '← เพลย์ลิสต์ทั้งหมด',
    addSongs: '＋ เพิ่มเพลง',
    doneAdding: 'เสร็จ',
    addSearchPlaceholder: 'ค้นหาเพลงเพื่อเพิ่ม',
    inList: 'อยู่ในลิสต์แล้ว',
    add: 'เพิ่ม',
    removeSong: 'เอาออก',
    emptyList: 'ยังไม่มีเพลงในลิสต์นี้ — กด "เพิ่มเพลง"',
  },
}
