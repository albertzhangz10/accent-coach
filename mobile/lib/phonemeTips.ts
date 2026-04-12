export type PhonemeTip = {
  symbol: string;
  example: string;
  tip: string;
};

export const PHONEME_TIPS: Record<string, PhonemeTip> = {
  dh: { symbol: "/dh/", example: "this, they, other", tip: "Voiced 'th' — tongue between your teeth, vibrate the throat." },
  th: { symbol: "/th/", example: "think, three, bath", tip: "Unvoiced 'th' — tongue between your teeth, blow air (no voice)." },
  r: { symbol: "/r/", example: "red, car, right", tip: "Curl your tongue back without touching the roof of your mouth." },
  l: { symbol: "/l/", example: "light, love, fall", tip: "Press your tongue tip against the ridge behind your top teeth." },
  w: { symbol: "/w/", example: "will, wait, away", tip: "Round your lips tightly, then open them quickly." },
  y: { symbol: "/y/", example: "yes, yellow", tip: "Quick 'y' glide — short, light, and smooth." },
  v: { symbol: "/v/", example: "very, love, have", tip: "Upper teeth on lower lip, buzz the throat." },
  f: { symbol: "/f/", example: "food, off, phone", tip: "Upper teeth on lower lip, blow air (no voice)." },
  z: { symbol: "/z/", example: "zoo, easy, buzz", tip: "Like 's' but with throat vibration." },
  s: { symbol: "/s/", example: "see, sun, miss", tip: "Hiss through clenched teeth, no voice." },
  ng: { symbol: "/ŋ/", example: "sing, long, king", tip: "Back of the tongue touches the soft palate, sound goes through your nose." },
  sh: { symbol: "/sh/", example: "ship, wash", tip: "Round your lips slightly and hiss — no voice." },
  zh: { symbol: "/zh/", example: "measure, vision", tip: "Round your lips and buzz — voiced 'sh'." },
  ch: { symbol: "/ch/", example: "church, match", tip: "Quick 't' followed by 'sh'." },
  jh: { symbol: "/dʒ/", example: "judge, gym", tip: "Quick 'd' followed by 'zh' — voiced." },

  ih: { symbol: "/ɪ/", example: "sit, ship, bit", tip: "Short 'i' — quick, relaxed, mouth barely opens." },
  iy: { symbol: "/iː/", example: "see, sheep, meet", tip: "Long 'ee' — stretched, tense, smile slightly." },
  eh: { symbol: "/ɛ/", example: "bed, red, ten", tip: "Short 'e' — mouth open halfway, relaxed." },
  ae: { symbol: "/æ/", example: "cat, bad, man", tip: "Flat 'a' — open mouth wide, tongue forward and low." },
  aa: { symbol: "/ɑ/", example: "father, hot, car", tip: "Open 'ah' — drop your jaw, relaxed." },
  ah: { symbol: "/ʌ/", example: "cup, love, mud", tip: "Short 'uh' — mouth slightly open, very short." },
  ao: { symbol: "/ɔ/", example: "saw, dog, caught", tip: "Rounded 'aw' — lips rounded, jaw drops." },
  uw: { symbol: "/uː/", example: "food, blue, shoe", tip: "Long 'oo' — lips very rounded and forward." },
  uh: { symbol: "/ʊ/", example: "book, could, put", tip: "Short 'oo' — lips lightly rounded, quick." },
  er: { symbol: "/ɝ/", example: "bird, her, work", tip: "'R'-colored vowel — curl tongue back and hold." },
  ax: { symbol: "/ə/", example: "about, camera", tip: "Schwa — the laziest vowel; barely say it." },
  ey: { symbol: "/eɪ/", example: "say, day, name", tip: "Glide from 'eh' into 'ee'." },
  ay: { symbol: "/aɪ/", example: "my, time, fine", tip: "Glide from 'ah' into 'ee'." },
  oy: { symbol: "/ɔɪ/", example: "boy, toy, coin", tip: "Glide from 'aw' into 'ee'." },
  ow: { symbol: "/oʊ/", example: "go, home, no", tip: "Glide from 'oh' into 'oo' — round the lips." },
  aw: { symbol: "/aʊ/", example: "now, how, out", tip: "Glide from 'ah' into 'oo'." },

  p: { symbol: "/p/", example: "pen, cup, apple", tip: "Close your lips, build pressure, then release with a small puff of air." },
  b: { symbol: "/b/", example: "big, cab, baby", tip: "Like 'p' but voiced — lips close, release with vibration." },
  t: { symbol: "/t/", example: "top, cat, butter", tip: "Tongue tip taps the ridge behind your top teeth, quick release." },
  d: { symbol: "/d/", example: "dog, bed, middle", tip: "Like 't' but voiced — tap the ridge with vibration." },
  k: { symbol: "/k/", example: "cat, back, come", tip: "Back of tongue presses the soft palate, release cleanly." },
  g: { symbol: "/g/", example: "go, bag, again", tip: "Like 'k' but voiced — vibrate the throat on release." },
  m: { symbol: "/m/", example: "mom, him, some", tip: "Close your lips, hum through your nose." },
  n: { symbol: "/n/", example: "no, run, funny", tip: "Tongue tip on the ridge, hum through your nose." },
  hh: { symbol: "/h/", example: "hi, house, him", tip: "Just a breath — no voice, no mouth shape." },
};

export function getPhonemeTip(phoneme: string): PhonemeTip | null {
  if (!phoneme) return null;
  const normalized = phoneme.toLowerCase().replace(/[0-9]/g, "");
  return PHONEME_TIPS[normalized] ?? null;
}
