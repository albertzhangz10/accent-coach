import type { Translations } from "./en";

export const zh: Translations = {
  // Brand & nav
  appName: "口音教练",
  practice: "练习",

  // Home — hero
  heroTitle: "让你的英语发音更自然。",
  heroSubtitle:
    "选择课程，聆听示范发音，然后录制你的声音。即时获取逐词发音反馈。",

  // Home — welcome card
  welcomeTitle: "欢迎！",
  welcomeBody:
    "从下方的入门课程开始。聆听示范短语，录制你的声音，即时获取每个单词的反馈。",

  // Home — stats
  statStreak: "连续天数",
  statPhrases: "练习短语",
  statLessons: "已完成课程",
  day: "天",
  days: "天",

  // Home — level labels
  beginner: "入门",
  intermediate: "进阶",
  advanced: "高级",

  // Home — lesson cards
  done: "已完成",
  best: "最佳 {score}",
  phrasesCount: "{n} 个短语",
  doneCount: "{done} / {total} 已完成",

  // Lesson page
  lessonNotFound: "未找到课程。",
  goBack: "返回",
  allLessons: "所有课程",
  phraseProgress: "第 {current} 句，共 {total} 句",
  nextPhrase: "下一句",
  finishLesson: "完成课程",
  tryAgain: "再试一次",

  // Recorder
  listen: "试听",
  cancel: "取消",
  record: "录音",
  stop: "停止",
  scoring: "评分中…",
  dismiss: "关闭",
  errMicDenied: "麦克风权限被拒绝——请检查浏览器权限设置。",
  errTooShort: "录音时间太短——请至少按住 1 秒钟。",
  errSilent: "没有检测到声音——请检查你的麦克风。",

  // Score display — labels
  excellent: "非常棒",
  great: "很好",
  good: "不错",
  fair: "一般",
  needsWork: "需要练习",

  // Score display — metrics
  accuracy: "准确度",
  accuracyHelp: "每个音素的匹配程度",
  fluency: "流利度",
  fluencyHelp: "节奏和自然流畅感",
  completeness: "完整度",
  completenessHelp: "识别到的词数",
  prosody: "韵律",
  prosodyHelp: "语调和重音",

  // Score display — sections
  coachNotes: "教练点评",
  yourAttempt: "你的发音",
  focusWords: "重点关注这些词",
  whatWeHeard: "我们听到的",

  // Score display — word focus
  weakestSound: "最弱音素",
  weakSyllable: "薄弱音节",
  soundedLike: "听起来像",
  monotone: "语调平平——试着变化音高",
  unexpectedBreak: "意外停顿",

  // Settings
  language: "语言",
  referenceVoice: "示范语音",
};
