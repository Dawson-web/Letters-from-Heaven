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

const DEMO_REPLY_DELAY_MS = 90 * 1000;

const REPLY_STATUS = {
  WAITING: "waiting",
  READY: "ready",
};

const MEMORIAL_EVENT_TYPES = [
  "qingming",
  "birthday",
  "anniversary",
  "custom",
];

const MEMORIAL_SOURCE_TYPE = {
  LETTER: "letter",
  MEMORIAL: "memorial",
};

const MEMORIAL_PROFILE_LIMIT = 5;

module.exports = {
  RELATION_OPTIONS,
  DEMO_REPLY_DELAY_MS,
  REPLY_STATUS,
  MEMORIAL_EVENT_TYPES,
  MEMORIAL_SOURCE_TYPE,
  MEMORIAL_PROFILE_LIMIT,
};
