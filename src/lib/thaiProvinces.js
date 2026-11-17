// ใบ v3/pleng#166 stat.05 (พี่เอม 17 พ.ย. 2569: "ไทย") — Google Analytics names Thai provinces in English
// ("Chiang Mai", "Chon Buri Province", "Bangkok"). The stats page shows them in Thai. Spellings vary
// ("Chon Buri" / "Chonburi", "Buri Ram" / "Buriram"), so names are matched on a squashed key:
// lowercase, no spaces or dashes, without "Province" / "Changwat". A name not in the list is kept
// as Google sent it (minus " Province"), so a new or odd spelling still shows rather than vanishing.
const PROVINCES = {
  'Bangkok': 'กรุงเทพมหานคร', 'Amnat Charoen': 'อำนาจเจริญ', 'Ang Thong': 'อ่างทอง', 'Bueng Kan': 'บึงกาฬ',
  'Buri Ram': 'บุรีรัมย์', 'Chachoengsao': 'ฉะเชิงเทรา', 'Chai Nat': 'ชัยนาท', 'Chaiyaphum': 'ชัยภูมิ',
  'Chanthaburi': 'จันทบุรี', 'Chiang Mai': 'เชียงใหม่', 'Chiang Rai': 'เชียงราย', 'Chon Buri': 'ชลบุรี',
  'Chumphon': 'ชุมพร', 'Kalasin': 'กาฬสินธุ์', 'Kamphaeng Phet': 'กำแพงเพชร', 'Kanchanaburi': 'กาญจนบุรี',
  'Khon Kaen': 'ขอนแก่น', 'Krabi': 'กระบี่', 'Lampang': 'ลำปาง', 'Lamphun': 'ลำพูน', 'Loei': 'เลย',
  'Lop Buri': 'ลพบุรี', 'Mae Hong Son': 'แม่ฮ่องสอน', 'Maha Sarakham': 'มหาสารคาม', 'Mukdahan': 'มุกดาหาร',
  'Nakhon Nayok': 'นครนายก', 'Nakhon Pathom': 'นครปฐม', 'Nakhon Phanom': 'นครพนม',
  'Nakhon Ratchasima': 'นครราชสีมา', 'Nakhon Sawan': 'นครสวรรค์', 'Nakhon Si Thammarat': 'นครศรีธรรมราช',
  'Nan': 'น่าน', 'Narathiwat': 'นราธิวาส', 'Nong Bua Lam Phu': 'หนองบัวลำภู', 'Nong Khai': 'หนองคาย',
  'Nonthaburi': 'นนทบุรี', 'Pathum Thani': 'ปทุมธานี', 'Pattani': 'ปัตตานี', 'Phang Nga': 'พังงา',
  'Phatthalung': 'พัทลุง', 'Phayao': 'พะเยา', 'Phetchabun': 'เพชรบูรณ์', 'Phetchaburi': 'เพชรบุรี',
  'Phichit': 'พิจิตร', 'Phitsanulok': 'พิษณุโลก', 'Phra Nakhon Si Ayutthaya': 'พระนครศรีอยุธยา',
  'Phrae': 'แพร่', 'Phuket': 'ภูเก็ต', 'Prachin Buri': 'ปราจีนบุรี', 'Prachuap Khiri Khan': 'ประจวบคีรีขันธ์',
  'Ranong': 'ระนอง', 'Ratchaburi': 'ราชบุรี', 'Rayong': 'ระยอง', 'Roi Et': 'ร้อยเอ็ด', 'Sa Kaeo': 'สระแก้ว',
  'Sakon Nakhon': 'สกลนคร', 'Samut Prakan': 'สมุทรปราการ', 'Samut Sakhon': 'สมุทรสาคร',
  'Samut Songkhram': 'สมุทรสงคราม', 'Saraburi': 'สระบุรี', 'Satun': 'สตูล', 'Sing Buri': 'สิงห์บุรี',
  'Si Sa Ket': 'ศรีสะเกษ', 'Songkhla': 'สงขลา', 'Sukhothai': 'สุโขทัย', 'Suphan Buri': 'สุพรรณบุรี',
  'Surat Thani': 'สุราษฎร์ธานี', 'Surin': 'สุรินทร์', 'Tak': 'ตาก', 'Trang': 'ตรัง', 'Trat': 'ตราด',
  'Ubon Ratchathani': 'อุบลราชธานี', 'Udon Thani': 'อุดรธานี', 'Uthai Thani': 'อุทัยธานี',
  'Uttaradit': 'อุตรดิตถ์', 'Yala': 'ยะลา', 'Yasothon': 'ยโสธร',
}
// other spellings seen for the same province (squashed form is enough: "Chonburi" = "Chon Buri" already)
const ALIASES = {
  'Krung Thep Maha Nakhon': 'Bangkok', 'Bangkok Metropolis': 'Bangkok', 'Korat': 'Nakhon Ratchasima',
  'Ayutthaya': 'Phra Nakhon Si Ayutthaya', 'Phet Buri': 'Phetchaburi', 'Samut Prakarn': 'Samut Prakan',
  'Sisaket': 'Si Sa Ket', 'Srisaket': 'Si Sa Ket', 'Nong Bua Lamphu': 'Nong Bua Lam Phu', 'Sa Kaew': 'Sa Kaeo',
  'Prachuap Khirikhan': 'Prachuap Khiri Khan', 'Chainat': 'Chai Nat', 'Phangnga': 'Phang Nga',
}

const squash = (s) => String(s).toLowerCase().replace(/\bprovince\b|\bchangwat\b/g, '').replace(/[^a-z]/g, '')
const TH = new Map(Object.entries(PROVINCES).map(([en, th]) => [squash(en), th]))
for (const [alt, en] of Object.entries(ALIASES)) TH.set(squash(alt), PROVINCES[en])

export const PROVINCE_COUNT = Object.keys(PROVINCES).length

export function thaiProvince(name) {
  return TH.get(squash(name)) || String(name).replace(/ Province$/, '')
}
