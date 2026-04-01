const { REPLY_STATUS } = require("./constants");

const HOUR_MS = 60 * 60 * 1000;
const HALF_HOUR_MS = 30 * 60 * 1000;
const TEST_REPLY_DELAY_MS = 90 * 1000;
const AI_READY_PREVIEW = "你的来信已收到，回响已生成。";
const DAY_MS = 24 * HOUR_MS;
const DEFAULT_TIME_ZONE = "Asia/Shanghai";

const PACE_DELAY_WINDOWS = {
  fast: [
    {
      weight: 0.45,
      minMs: 1 * HOUR_MS,
      maxMs: 6 * HOUR_MS,
    },
    {
      weight: 0.4,
      minMs: 8 * HOUR_MS,
      maxMs: 18 * HOUR_MS,
    },
    {
      weight: 0.15,
      minMs: 1 * DAY_MS,
      maxMs: 2 * DAY_MS,
    },
  ],
  balanced: [
    {
      weight: 0.35,
      minMs: 4 * HOUR_MS,
      maxMs: 12 * HOUR_MS,
    },
    {
      weight: 0.4,
      minMs: 18 * HOUR_MS,
      maxMs: 36 * HOUR_MS,
    },
    {
      weight: 0.25,
      minMs: 2 * DAY_MS,
      maxMs: 5 * DAY_MS,
    },
  ],
  slow: [
    {
      weight: 0.2,
      minMs: 12 * HOUR_MS,
      maxMs: 24 * HOUR_MS,
    },
    {
      weight: 0.45,
      minMs: 1 * DAY_MS,
      maxMs: 3 * DAY_MS,
    },
    {
      weight: 0.35,
      minMs: 3 * DAY_MS,
      maxMs: 7 * DAY_MS,
    },
  ],
};

function getDelayWindowsByPace(pace) {
  if (pace === "fast" || pace === "slow") {
    return PACE_DELAY_WINDOWS[pace];
  }

  return PACE_DELAY_WINDOWS.balanced;
}

function pickWeightedDelayWindow(pace) {
  const delayWindows = getDelayWindowsByPace(pace);
  const cursor = Math.random();
  let total = 0;

  for (const window of delayWindows) {
    total += window.weight;
    if (cursor <= total) {
      return window;
    }
  }

  return delayWindows[delayWindows.length - 1];
}

function roundUpToHalfHour(timestamp) {
  return Math.ceil(timestamp / HALF_HOUR_MS) * HALF_HOUR_MS;
}

function toMinuteOfDay(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const minute = Number(value);
  if (!Number.isInteger(minute) || minute < 0 || minute > 1439) {
    return null;
  }

  return minute;
}

function getTimeZoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUTC - date.getTime();
}

function getZonedDateParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function makeZonedDateMs({ year, month, day, minuteOfDay }, timeZone) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return utcGuess - offset;
}

function isInQuietHours(minuteOfDay, quietStartMinute, quietEndMinute) {
  if (quietStartMinute === quietEndMinute) {
    return false;
  }

  if (quietStartMinute < quietEndMinute) {
    return minuteOfDay >= quietStartMinute && minuteOfDay < quietEndMinute;
  }

  return minuteOfDay >= quietStartMinute || minuteOfDay < quietEndMinute;
}

function shiftToQuietEnd(timestamp, quietStartMinute, quietEndMinute, timeZone) {
  const parts = getZonedDateParts(new Date(timestamp), timeZone);
  const minuteOfDay = parts.hour * 60 + parts.minute;

  if (!isInQuietHours(minuteOfDay, quietStartMinute, quietEndMinute)) {
    return timestamp;
  }

  // 跨日静默时段：若命中 [quietStart, 24:00)，需要顺延到次日 quietEnd。
  const shouldShiftToNextDay =
    quietStartMinute > quietEndMinute && minuteOfDay >= quietStartMinute;

  let target = makeZonedDateMs(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      minuteOfDay: quietEndMinute,
    },
    timeZone
  );

  if (shouldShiftToNextDay) {
    target += DAY_MS;
  }

  return target <= timestamp ? timestamp + HALF_HOUR_MS : target;
}

function applyQuietHours(timestamp, options = {}) {
  const quietStartMinute = toMinuteOfDay(options.quietStartMinute);
  const quietEndMinute = toMinuteOfDay(options.quietEndMinute);
  const timeZone = options.timezone || DEFAULT_TIME_ZONE;

  if (quietStartMinute === null || quietEndMinute === null) {
    return timestamp;
  }

  if (quietStartMinute === quietEndMinute) {
    return timestamp;
  }

  let candidate = timestamp;
  for (let i = 0; i < 3; i += 1) {
    const shifted = shiftToQuietEnd(
      candidate,
      quietStartMinute,
      quietEndMinute,
      timeZone
    );
    if (shifted === candidate) {
      break;
    }
    candidate = shifted;
  }

  return candidate;
}

function pickLetterAvailableAt(now, options = {}) {
  if (options.testMode) {
    return now + TEST_REPLY_DELAY_MS;
  }

  const window = pickWeightedDelayWindow(options.deliveryPace);
  const span = Math.max(window.maxMs - window.minMs, 0);
  const offset = span > 0 ? Math.random() * span : 0;
  const rounded = roundUpToHalfHour(now + window.minMs + offset);
  return applyQuietHours(rounded, options);
}

function excerpt(input) {
  const normalized = String(input || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "今天的想念";
  }

  return normalized.slice(0, 20);
}

function memorialExcerpt(profile, letter) {
  if (letter && letter.body) {
    return excerpt(letter.body);
  }

  const fallback = [profile?.keywords, profile?.note]
    .filter(Boolean)
    .join(" ");

  return excerpt(fallback || "今天的想念");
}

function greetingFor(relation) {
  switch (relation) {
    case "妈妈":
    case "爸爸":
      return "孩子";
    case "爱人":
      return "亲爱的";
    case "朋友":
      return "老朋友";
    default:
      return "我收到了你的来信";
  }
}

function comfortFor(relation) {
  switch (relation) {
    case "妈妈":
      return "好好照顾自己，不必每次都把坚强演给别人看。";
    case "爸爸":
      return "你已经很努力了，不需要把每件事都扛在肩上。";
    case "爱人":
      return "你认真生活的样子，我一直都记得，也依然为你心动。";
    case "朋友":
      return "不用把遗憾都变成惩罚自己，慢一点也没关系。";
    default:
      return "允许自己想念，允许自己软弱，这本来就是爱留下的痕迹。";
  }
}

function normalizeBody(input) {
  const content = String(input || "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!content) {
    return "";
  }

  return content.slice(0, 1800);
}

function memorialLabel(event) {
  switch (event?.type) {
    case "qingming":
      return "清明回响";
    case "birthday":
      return "生日回响";
    case "anniversary":
      return "周年回响";
    case "death_anniversary":
      return "忌日回响";
    default:
      return event?.label || "纪念回响";
  }
}

function buildWaitingReplyPayload(letterDraft, now, options = {}) {
  return {
    status: REPLY_STATUS.WAITING,
    createdAtMs: now,
    availableAtMs: pickLetterAvailableAt(now, options),
    subject: `${letterDraft.relation || "远方"}的回响`,
    preview: "回响已经启程，会在未来的某个时刻送达。",
    body: "",
  };
}

function buildReadyReplyPayload(letter, options = {}) {
  const greeting = greetingFor(letter.relation);
  const fallbackBody = [
    `${greeting}：`,
    `我看见你写下的“${excerpt(letter.body)}”。那些没有说完的话、那些你反复在心里重播的片段，都已经被认真接住了。`,
    comfortFor(letter.relation),
    "别急着把悲伤变成答案。先把今天过完，记得吃饭，记得休息，记得在想我的时候对自己温柔一点。",
    letter.signature
      ? `当你下次还想说话，就带着“${letter.signature}”这个名字再来写信吧，我会继续在回响里陪你。`
      : "当你下次还想说话，就再来写信吧，回响会一直在。",
  ].join("\n\n");
  const aiBody = normalizeBody(options.aiBody);
  const body = aiBody || fallbackBody;

  return {
    status: REPLY_STATUS.READY,
    subject: `${letter.relation || "远方"}的回响`,
    preview: aiBody ? "你的来信已收到，回响已生成。" : "这份想念已经被认真接住了。",
    body,
  };
}

function buildMemorialWaitingPayload(profile, event, now, availableAtMs) {
  const label = memorialLabel(event);
  const name = profile?.displayName || profile?.relation || "远方";
  return {
    status: REPLY_STATUS.WAITING,
    createdAtMs: now,
    availableAtMs,
    subject: `${name} · ${label}`,
    preview: "纪念回响正在酝酿，会在一段时间后送达。",
    body: "",
  };
}

function buildMemorialReadyPayload(profile, letter, event, options = {}) {
  const greeting = greetingFor(profile?.relation);
  const label = memorialLabel(event);
  const fallbackBody = [
    `${greeting}：`,
    `在${label}这天，我看见你想起了“${memorialExcerpt(profile, letter)}”。`,
    comfortFor(profile?.relation),
    "把思念放在心里，也允许它在某个日子里轻轻浮现。",
    profile?.displayName
      ? `你一直记得“${profile.displayName}”。`
      : "你一直记得那些重要的名字。",
  ].join("\n\n");
  const aiBody = normalizeBody(options.aiBody);
  const body = aiBody || fallbackBody;

  return {
    status: REPLY_STATUS.READY,
    subject: `${profile?.displayName || profile?.relation || "远方"} · ${label}`,
    preview: aiBody ? AI_READY_PREVIEW : "这份纪念已被认真接住。",
    body,
  };
}

module.exports = {
  buildWaitingReplyPayload,
  buildReadyReplyPayload,
  buildMemorialWaitingPayload,
  buildMemorialReadyPayload,
};
