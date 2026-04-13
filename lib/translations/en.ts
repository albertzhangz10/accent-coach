export const en = {
  // Brand & nav
  appName: "Accent Coach",
  practice: "Practice",

  // Home — hero
  heroTitle: "Sound more natural in English.",
  heroSubtitle:
    "Pick a lesson, listen to the reference, and record yourself. Get instant word-by-word feedback on your pronunciation.",

  // Home — welcome card
  welcomeTitle: "Welcome!",
  welcomeBody:
    "Start with a Beginner lesson below. You will listen to a phrase, record yourself, and get instant feedback on every word.",

  // Home — stats
  statStreak: "Day streak",
  statPhrases: "Phrases",
  statLessons: "Lessons done",
  day: "day",
  days: "days",

  // Home — level labels (mapped from lesson.level data value)
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",

  // Home — lesson cards
  done: "Done",
  best: "Best {score}",
  phrasesCount: "{n} phrases",
  doneCount: "{done} / {total} done",

  // Lesson page
  lessonNotFound: "Lesson not found.",
  goBack: "Go back",
  allLessons: "All lessons",
  phraseProgress: "Phrase {current} of {total}",
  nextPhrase: "Next phrase",
  finishLesson: "Finish lesson",
  tryAgain: "Try again",

  // Recorder
  listen: "Listen",
  cancel: "Cancel",
  record: "Record",
  stop: "Stop",
  scoring: "Scoring…",
  dismiss: "Dismiss",
  errMicDenied: "Microphone access denied — check your browser permissions.",
  errTooShort: "Recording too short — hold for at least 1 second.",
  errSilent: "We didn't hear anything — check your microphone.",

  // Score display — labels
  excellent: "EXCELLENT",
  great: "GREAT",
  good: "GOOD",
  fair: "FAIR",
  needsWork: "NEEDS WORK",

  // Score display — metrics
  accuracy: "Accuracy",
  accuracyHelp: "How well each sound matches",
  fluency: "Fluency",
  fluencyHelp: "Rhythm and natural flow",
  completeness: "Complete",
  completenessHelp: "Words recognized",
  prosody: "Prosody",
  prosodyHelp: "Intonation and stress",

  // Score display — sections
  coachNotes: "Coach\u2019s Notes",
  yourAttempt: "Your attempt",
  focusWords: "Focus on these words",
  whatWeHeard: "What we heard",

  // Score display — word focus
  weakestSound: "Weakest sound",
  weakSyllable: "Weak syllable",
  soundedLike: "Sounded like",
  monotone: "Monotone — vary your pitch",
  unexpectedBreak: "Unexpected break",

  // Settings
  language: "Language",
  referenceVoice: "Reference Voice",
};

export type Translations = { readonly [K in keyof typeof en]: string };
