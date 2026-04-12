export type PhonemeTip = {
  symbol: string;
  example: string;
  tip: string;
};

export const PHONEME_TIPS: Record<string, PhonemeTip> = {
  dh: { symbol: "/dh/", example: "this, they, other", tip: "Voiced 'th' \u2014 tongue between your teeth, vibrate the throat." },
  th: { symbol: "/th/", example: "think, three, bath", tip: "Unvoiced 'th' \u2014 tongue between your teeth, blow air (no voice)." },
  r: { symbol: "/r/", example: "red, car, right", tip: "Curl your tongue back without touching the roof of your mouth." },
  l: { symbol: "/l/", example: "light, love, fall", tip: "Press your tongue tip against the ridge behind your top teeth." },
  w: { symbol: "/w/", example: "will, wait, away", tip: "Round your lips tightly, then open them quickly." },
  y: { symbol: "/y/", example: "yes, yellow", tip: "Quick 'y' glide \u2014 short, light, and smooth." },
  v: { symbol: "/v/", example: "very, love, have", tip: "Upper teeth on lower lip, buzz the throat." },
  f: { symbol: "/f/", example: "food, off, phone", tip: "Upper teeth on lower lip, blow air (no voice)." },
  z: { symbol: "/z/", example: "zoo, easy, buzz", tip: "Like 's' but with throat vibration." },
  s: { symbol: "/s/", example: "see, sun, miss", tip: "Hiss through clenched teeth, no voice." },
  ng: { symbol: "/\u014b/", example: "sing, long, king", tip: "Back of the tongue touches the soft palate, sound goes through your nose." },
  sh: { symbol: "/sh/", example: "ship, wash", tip: "Round your lips slightly and hiss \u2014 no voice." },
  zh: { symbol: "/zh/", example: "measure, vision", tip: "Round your lips and buzz \u2014 voiced 'sh'." },
  ch: { symbol: "/ch/", example: "church, match", tip: "Quick 't' followed by 'sh'." },
  jh: { symbol: "/d\u0292/", example: "judge, gym", tip: "Quick 'd' followed by 'zh' \u2014 voiced." },

  ih: { symbol: "/\u026a/", example: "sit, ship, bit", tip: "Short 'i' \u2014 quick, relaxed, mouth barely opens." },
  iy: { symbol: "/i\u02d0/", example: "see, sheep, meet", tip: "Long 'ee' \u2014 stretched, tense, smile slightly." },
  eh: { symbol: "/\u025b/", example: "bed, red, ten", tip: "Short 'e' \u2014 mouth open halfway, relaxed." },
  ae: { symbol: "/\u00e6/", example: "cat, bad, man", tip: "Flat 'a' \u2014 open mouth wide, tongue forward and low." },
  aa: { symbol: "/\u0251/", example: "father, hot, car", tip: "Open 'ah' \u2014 drop your jaw, relaxed." },
  ah: { symbol: "/\u028c/", example: "cup, love, mud", tip: "Short 'uh' \u2014 mouth slightly open, very short." },
  ao: { symbol: "/\u0254/", example: "saw, dog, caught", tip: "Rounded 'aw' \u2014 lips rounded, jaw drops." },
  uw: { symbol: "/u\u02d0/", example: "food, blue, shoe", tip: "Long 'oo' \u2014 lips very rounded and forward." },
  uh: { symbol: "/\u028a/", example: "book, could, put", tip: "Short 'oo' \u2014 lips lightly rounded, quick." },
  er: { symbol: "/\u025d/", example: "bird, her, work", tip: "'R'-colored vowel \u2014 curl tongue back and hold." },
  ax: { symbol: "/\u0259/", example: "about, camera", tip: "Schwa \u2014 the laziest vowel; barely say it." },
  ey: { symbol: "/e\u026a/", example: "say, day, name", tip: "Glide from 'eh' into 'ee'." },
  ay: { symbol: "/a\u026a/", example: "my, time, fine", tip: "Glide from 'ah' into 'ee'." },
  oy: { symbol: "/\u0254\u026a/", example: "boy, toy, coin", tip: "Glide from 'aw' into 'ee'." },
  ow: { symbol: "/o\u028a/", example: "go, home, no", tip: "Glide from 'oh' into 'oo' \u2014 round the lips." },
  aw: { symbol: "/a\u028a/", example: "now, how, out", tip: "Glide from 'ah' into 'oo'." },

  p: { symbol: "/p/", example: "pen, cup, apple", tip: "Close your lips, build pressure, then release with a small puff of air." },
  b: { symbol: "/b/", example: "big, cab, baby", tip: "Like 'p' but voiced \u2014 lips close, release with vibration." },
  t: { symbol: "/t/", example: "top, cat, butter", tip: "Tongue tip taps the ridge behind your top teeth, quick release." },
  d: { symbol: "/d/", example: "dog, bed, middle", tip: "Like 't' but voiced \u2014 tap the ridge with vibration." },
  k: { symbol: "/k/", example: "cat, back, come", tip: "Back of tongue presses the soft palate, release cleanly." },
  g: { symbol: "/g/", example: "go, bag, again", tip: "Like 'k' but voiced \u2014 vibrate the throat on release." },
  m: { symbol: "/m/", example: "mom, him, some", tip: "Close your lips, hum through your nose." },
  n: { symbol: "/n/", example: "no, run, funny", tip: "Tongue tip on the ridge, hum through your nose." },
  hh: { symbol: "/h/", example: "hi, house, him", tip: "Just a breath \u2014 no voice, no mouth shape." },
};

export function getPhonemeTip(phoneme: string): PhonemeTip | null {
  if (!phoneme) return null;
  const normalized = phoneme.toLowerCase().replace(/[0-9]/g, "");
  return PHONEME_TIPS[normalized] ?? null;
}
