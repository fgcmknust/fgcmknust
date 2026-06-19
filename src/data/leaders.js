/**
 * Church leadership roster.
 *
 * Edit this file to add, remove, or update leaders. The Leaders page
 * (src/pages/leaders.js) renders a circular portrait with three lines of
 * text below it: name, portfolio (role), and programme of study.
 *
 * Required fields per entry:
 *   id        unique slug
 *   name      display name (with title, e.g. "Min. Ethel Namatey")
 *   role      portfolio / title (e.g. "President")
 *   program   programme of study (e.g. "BSc Computer Engineering")
 *   image     path under /public/images/  (square portrait works best — the
 *             image is cropped to a circle, so any other aspect ratio gets
 *             centre-cropped)
 *
 * Optional fields:
 *   order            numeric — leaders are sorted by this ascending; ties keep
 *                    declaration order
 *   objectPosition   CSS object-position value applied to the portrait img.
 *                    Defaults to "center top" so heads aren't cropped. Use a
 *                    percentage (e.g. "center 25%") to reveal a face that
 *                    sits lower in the source photo, or "center bottom" to
 *                    push the visible window further down.
 *   objectScale      numeric zoom factor (e.g. 1.4 = 140%). Use this for
 *                    landscape source photos where the cover-crop leaves the
 *                    face too small. The transform's origin tracks
 *                    objectPosition, so the face stays centred while it
 *                    grows. 1 (or omit) = no zoom.
 */
export const leadersData = [
  {
    id: 'campus-director',
    order: 1,
    name: 'Rev. Alfred Agyina',
    role: 'Campus Ministry Director',
    image: '/images/Alfred.webp',
  },
  {
    id: 'pastor-in-charge',
    order: 2,
    name: 'Ps. Bernard Etse',
    role: 'Pastor-In-Charge',
    image: '/images/Este.webp',
    // Portrait source (854x1280). 1.4x zoom. Y bumped from 20% to 30% —
    // anchor sits lower in the source, so the scale grows UPWARD from there
    // and his face slides UP inside the circle.
    objectScale: 1.4,
    objectPosition: 'center 30%'
  },
  {
    id: 'resident-minister',
    order: 3,
    name: 'Min. Evans Osei',
    role: 'Resident Minister',
    image: '/images/Evans.webp',
    // Portrait source (720x900). 1.6x zoom. X bumped from 55% to 62% — the
    // anchor sits further right of centre so the scale pushes his face
    // FURTHER LEFT inside the circle. Y stays at 10%.
    objectScale: 1.6,
    objectPosition: '65% 10%'
  },
  {
    id: 'resident-minister-2',
    order: 4,
    name: 'Min. Kofi Aboagye Konadu',
    role: 'Resident Minister',
    image: '/images/default.webp',
  },
  {
    id: 'president-ethel-namatey',
    order: 5,
    name: 'Min. Ethel Korleykour Narmatey',
    role: 'President',
    program: 'BSc Business Administration - Tourism & Hospitality Management',
    image: '/images/Ethel.webp',
    // Portrait source (2048x2560). Zoom in 1.3x with the anchor a touch
    // below the top so the scale grows down from her hairline — her face
    // fills more of the circle without losing the top of her head.
    objectScale: 1.3,
    objectPosition: 'center 15%'
  },
  {
    id: 'vice-president',
    order: 6,
    name: 'Min. Adomaa Akosua Ohemaa Opare',
    role: 'Vice President',
    program: 'BSc Computer Engineering',
    image: '/images/Adomaa.webp',
     // Landscape source (3456x2304). Anchor slightly above-and-right of centre
    // so the 1.5x scale grows down and to the left from there. Dialing the X
    // back from 70% to 60% nudges the picture content RIGHT inside the circle
    // (less leftward push from the scale anchor); Y stays low so it still
    // sits low in the frame.
    objectScale: 1.5,
    objectPosition: '60% 35%'
  },
  {
    id: 'general-secretary',
    order: 7,
    // Double quotes so the apostrophe in "God'sLove" doesn't need escaping.
    name: "Min. Goodness GodsLove Denuabu",
    role: 'General Secretary',
    program: 'BSc Medical Imaging',
    image: '/images/Goodness.webp',
    // Nudge the visible window down on the source photo so her face sits
    // higher inside the circle (matches "move the picture upwards" feedback).
    objectPosition: 'center 22%'
  },
  {
    id: 'financial-secretary',
    order: 8,
    name: 'Min. Stephanie Aggor',
    role: 'Financial Secretary',
    program: 'BSc Economics',
    image: '/images/Stephanie.webp',
    // Landscape source (5184x3456). 2.1x zoom. Anchor nudged to 55%/5% —
    // X drifts slightly right of centre so the scale shifts her LEFT a touch,
    // Y drops near the top so the scale shifts her DOWN a touch.
    objectScale: 2.1,
    objectPosition: '55% 5%'
  },
  {
    id: 'organizing-secretary',
    order: 9,
    name: 'Min. Desmond Adjei',
    role: 'Organizing Secretary',
    program: 'BSc Marine Engineering',
    image: '/images/Desmond.webp',
    // Portrait source (810x1080). Slightly stronger zoom (1.4x) since the
    // source is smaller — fills the circle with his face. Anchor a bit
    // further down than Ethel so we don't cut into his hairline.
    objectScale: 1.4,
    objectPosition: 'center 22%'
  },
  {
    id: 'asst-organizing-secretary',
    order: 10,
    name: 'Min. Maame Esi Efrema Ackon',
    role: 'Organizing Secretary (Ushering & Protocol)',
    program: 'BSc Business Administration - International Business',
    image: '/images/Efremah 1.webp'
  },
  {
    id: 'media-publicity-technical-head',
    order: 11,
    name: 'Min. David Nana Darkwa',
    role: 'Media, Technical & Publicity Head',
    program: 'BSc Physics',
    image: '/images/default.webp'
  },
  {
    id: 'asst-media-publicity-technical-head',
    order: 12,
    name: 'Min. Samuel Kofi Asante',
    role: 'Asst. Media, Technical & Publicity Head',
    program: 'BSc Computer Science',
    image: '/images/Samuel.webp',
    // Near-square source (2388x2509). Anchor at slightly left-of-centre AND
    // near the very top. The 1.5x scale then grows down-and-to-the-right
    // from there, nudging his face further down and a bit to the right
    // inside the circle.
    objectScale: 1.5,
    objectPosition: '40% 4%'
  },
  {
    id: 'evangelism-coordinator',
    order: 13,
    name: 'Min. Freda Oforiwaa Doku',
    role: 'Evangelism, Outreach & Ladies Wing Head',
    program: 'BA Public Administration',
    image: '/images/Freda.webp',
    // Landscape source (1280x853). 3.0x zoom. X dropped from 50% to 40% —
    // anchor sits left of centre, so the strong scale pushes her face
    // RIGHTWARD inside the circle. Y stays at 30%.
    objectScale: 3.0,
    objectPosition: '40% 30%'
  },
  {
    id: 'worship-director',
    order: 14,
    name: 'Min. Steven Otabil',
    role: 'Music & Theater Arts Director',
    program: 'BSc Information Technology',
    image: '/images/Steven.webp',
    // Landscape source (1264x842). 1.5x zoom; Y nudged further to 15% — the
    // anchor sits even closer to the top of the source, so the scale grows
    // more aggressively downward and his face drops lower in the circle.
    objectScale: 1.5,
    objectPosition: 'center 15%'
  }
];
