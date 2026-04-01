const RELATION_OPTIONS = [
  "妈妈",
  "爸爸",
  "爷爷",
  "奶奶",
  "外公",
  "外婆",
  "爱人",
  "朋友",
  "其他",
];

const REPLY_STATUS = {
  WAITING: "waiting",
  READY: "ready",
};

const MEMORIAL_EVENT_TYPES = [
  "qingming",
  "birthday",
  "anniversary",
  "death_anniversary",
  "custom",
];

const MEMORIAL_SOURCE_TYPE = {
  LETTER: "letter",
  MEMORIAL: "memorial",
};

const MEMORIAL_PROFILE_LIMIT = 5;
const MEMORIAL_CALENDAR_TYPES = ["solar", "lunar"];

const DELIVERY_PACE_OPTIONS = ["fast", "balanced", "slow"];

const REMINDER_CHANNEL_OPTIONS = [
  "none",
  "mini_program_subscribe",
  "official_account",
];

const FEEDBACK_SCORE_OPTIONS = ["match", "neutral", "mismatch"];

module.exports = {
  RELATION_OPTIONS,
  REPLY_STATUS,
  MEMORIAL_EVENT_TYPES,
  MEMORIAL_SOURCE_TYPE,
  MEMORIAL_PROFILE_LIMIT,
  MEMORIAL_CALENDAR_TYPES,
  DELIVERY_PACE_OPTIONS,
  REMINDER_CHANNEL_OPTIONS,
  FEEDBACK_SCORE_OPTIONS,
};
