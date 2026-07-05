// Bundled demo shown only when the database is empty or unreachable.
// Original demo lyrics written for this project (no copyright issue) —
// deliberately uses every notation feature: octave dots, underlines,
// dotted notes, rests, ties, triplets, accidentals.
export const SAMPLE_SONGS = [
  {
    id: 'sample-demo',
    number: null,
    title_th: 'เพลงสาธิตโน้ตตัวเลข',
    title_en: 'Notation demo',
    content: {
      key: 'C',
      timeSignature: '4/4',
      lines: [
        [
          { type: 'segment', chord: 'C', note: '1_ 1_ 3 5', lyric: 'ขอบพระคุณ พระเจ้า' },
          { type: 'bar' },
          { type: 'segment', chord: 'F', note: '6 . 6', lyric: 'ทุก เวลา' },
          { type: 'segment', chord: 'G7', note: '(5 - )', lyric: '' },
          { type: 'bar' },
          { type: 'segment', chord: 'C', note: "{3 4 5} 1'", lyric: 'ทั้ง คืน วัน ผ่าน' },
          { type: 'bar' },
          { type: 'segment', chord: 'G7', note: '2 - 0 .7', lyric: 'ไป — ยัง' },
          { type: 'bar' },
          { type: 'segment', chord: 'C', note: '1 - - -', lyric: 'รัก' },
        ],
      ],
    },
  },
]
