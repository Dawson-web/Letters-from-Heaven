const { Op } = require("sequelize");
const {
  MemorialProfile,
  MemorialEvent,
  Letter,
  Reply,
  User,
} = require("./db");
const { AppError } = require("./errors");
const {
  RELATION_OPTIONS,
  MEMORIAL_EVENT_TYPES,
  MEMORIAL_CALENDAR_TYPES,
  MEMORIAL_SOURCE_TYPE,
  MEMORIAL_PROFILE_LIMIT,
  REPLY_STATUS,
} = require("./constants");
const {
  buildMemorialWaitingPayload,
} = require("./reply-builder");

const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_NO_LETTER_MS = 6 * 60 * 60 * 1000;
const TEST_DELIVERY_MIN_LEAD_MS = 60 * 1000;
const AI_READY_PREVIEW = "你的来信已收到，回响已生成。";
const LUNAR_MONTH_MAP = {
  正月: 1,
  一月: 1,
  二月: 2,
  三月: 3,
  四月: 4,
  五月: 5,
  六月: 6,
  七月: 7,
  八月: 8,
  九月: 9,
  十月: 10,
  十一月: 11,
  冬月: 11,
  十二月: 12,
  腊月: 12,
};

function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function normalizeText(input, maxLength) {
  const value = typeof input === "string" ? input.trim() : "";
  return value.slice(0, maxLength);
}

function ensureRelation(relation) {
  if (!relation || !RELATION_OPTIONS.includes(relation)) {
    throw new AppError(400, "Invalid relation", {
      relationOptions: RELATION_OPTIONS,
    });
  }
}

function ensureEventType(type) {
  if (!type || !MEMORIAL_EVENT_TYPES.includes(type)) {
    throw new AppError(400, "Invalid memorial event type", {
      eventTypes: MEMORIAL_EVENT_TYPES,
    });
  }
}

function ensureCalendarType(calendarType) {
  if (!calendarType || !MEMORIAL_CALENDAR_TYPES.includes(calendarType)) {
    throw new AppError(400, "Invalid memorial calendar type", {
      calendarTypes: MEMORIAL_CALENDAR_TYPES,
    });
  }
}

function ensureMonthDay(month, day, calendarType = "solar") {
  if (month < 1 || month > 12 || day < 1) {
    throw new AppError(400, "Invalid event date");
  }

  if (calendarType === "lunar") {
    if (day > 30) {
      throw new AppError(400, "Invalid lunar event date");
    }
    return;
  }

  if (day > 31) {
    throw new AppError(400, "Invalid event date");
  }
}

function ensureHour(hour) {
  if (hour < 0 || hour > 23) {
    throw new AppError(400, "Invalid deliver hour");
  }
}

function ensureMinute(minute) {
  if (minute < 0 || minute > 59) {
    throw new AppError(400, "Invalid deliver minute");
  }
}

function ensureWindow(windowStartDays, windowEndDays) {
  if (windowStartDays > windowEndDays) {
    throw new AppError(400, "Invalid event window");
  }

  if (windowStartDays < -14 || windowEndDays > 14) {
    throw new AppError(400, "Event window too wide");
  }
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

function makeZonedDateMs({ year, month, day, hour, minute }, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute || 0, 0);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return utcGuess - offset;
}

function getZonedDateParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = dtf.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getZonedMinuteOfDay(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
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

function isInQuietHours(minuteOfDay, quietStartMinute, quietEndMinute) {
  if (quietStartMinute === quietEndMinute) {
    return false;
  }

  if (quietStartMinute < quietEndMinute) {
    return minuteOfDay >= quietStartMinute && minuteOfDay < quietEndMinute;
  }

  return minuteOfDay >= quietStartMinute || minuteOfDay < quietEndMinute;
}

function applyQuietHours(candidateMs, deliveryOptions = {}, timeZone) {
  const quietStartMinute = toMinuteOfDay(deliveryOptions.quietStartMinute);
  const quietEndMinute = toMinuteOfDay(deliveryOptions.quietEndMinute);
  if (quietStartMinute === null || quietEndMinute === null) {
    return candidateMs;
  }

  if (quietStartMinute === quietEndMinute) {
    return candidateMs;
  }

  const zoned = getZonedDateParts(new Date(candidateMs), timeZone);
  const minuteOfDay = getZonedMinuteOfDay(new Date(candidateMs), timeZone);
  if (!isInQuietHours(minuteOfDay, quietStartMinute, quietEndMinute)) {
    return candidateMs;
  }

  const shouldShiftToNextDay =
    quietStartMinute > quietEndMinute && minuteOfDay >= quietStartMinute;

  let shifted = makeZonedDateMs(
    {
      year: zoned.year,
      month: zoned.month,
      day: zoned.day,
      hour: Math.floor(quietEndMinute / 60),
      minute: quietEndMinute % 60,
    },
    timeZone
  );

  if (shouldShiftToNextDay) {
    shifted += DAY_MS;
  }

  return shifted <= candidateMs ? candidateMs + 30 * 60 * 1000 : shifted;
}

function parseLunarMonthName(monthName) {
  const raw = String(monthName || "");
  const isLeap = raw.startsWith("闰");
  const normalized = isLeap ? raw.slice(1) : raw;
  return {
    month: LUNAR_MONTH_MAP[normalized] || 0,
    isLeap,
  };
}

function getLunarDateParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("zh-Hans-CN-u-ca-chinese", {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const parts = dtf.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const monthMeta = parseLunarMonthName(values.month);

  return {
    relatedYear: Number(values.relatedYear || values.year || 0),
    month: monthMeta.month,
    day: Number(values.day || 0),
    isLeap: monthMeta.isLeap,
  };
}

function findSolarDateForLunarYear(targetLunarYear, month, day, timeZone) {
  // 覆盖春节前后的跨年区间，确保能找到当农历年对应的公历日期。
  const startMs = Date.UTC(targetLunarYear - 1, 11, 1, 0, 0, 0);
  const endMs = Date.UTC(targetLunarYear, 11, 31, 23, 59, 59);

  for (let cursor = startMs; cursor <= endMs; cursor += DAY_MS) {
    const date = new Date(cursor);
    const lunar = getLunarDateParts(date, timeZone);
    if (
      lunar.relatedYear === targetLunarYear &&
      lunar.month === month &&
      lunar.day === day &&
      !lunar.isLeap
    ) {
      return getZonedDateParts(date, timeZone);
    }
  }

  return null;
}

function resolveBaseDateMsForYear(event, targetYear, timeZone) {
  const calendarType = normalizeText(event.calendarType, 16) || "solar";
  if (calendarType === "lunar") {
    const solarDate = findSolarDateForLunarYear(
      targetYear,
      Number(event.month),
      Number(event.day),
      timeZone
    );
    if (!solarDate) {
      return null;
    }

    return makeZonedDateMs(
      {
        year: solarDate.year,
        month: solarDate.month,
        day: solarDate.day,
        hour: event.deliverAtHour,
        minute: event.deliverAtMinute,
      },
      timeZone
    );
  }

  return makeZonedDateMs(
    {
      year: targetYear,
      month: event.month,
      day: event.day,
      hour: event.deliverAtHour,
      minute: event.deliverAtMinute,
    },
    timeZone
  );
}

function buildWindowForYear(event, targetYear, timeZone) {
  const baseMs = resolveBaseDateMsForYear(event, targetYear, timeZone);
  if (!baseMs) {
    return null;
  }

  return {
    year: targetYear,
    windowStartMs: baseMs + event.windowStartDays * DAY_MS,
    windowEndMs: baseMs + event.windowEndDays * DAY_MS,
  };
}

function computeNextWindow(event, timeZone, nowMs) {
  const now = new Date(nowMs);
  const calendarType = normalizeText(event.calendarType, 16) || "solar";
  const { year: solarYear } = getZonedDateParts(now, timeZone);
  const currentLunarYear = getLunarDateParts(now, timeZone).relatedYear || solarYear;
  const currentYear = calendarType === "lunar" ? currentLunarYear : solarYear;

  const currentWindow = buildWindowForYear(event, currentYear, timeZone);
  if (!currentWindow) {
    return {
      year: currentYear,
      windowStartMs: nowMs,
      windowEndMs: nowMs,
    };
  }

  if (currentWindow.windowEndMs >= nowMs) {
    return currentWindow;
  }

  const nextYear = currentYear + 1;
  const nextWindow = buildWindowForYear(event, nextYear, timeZone);
  if (!nextWindow) {
    return {
      year: nextYear,
      windowStartMs: nowMs + DAY_MS,
      windowEndMs: nowMs + DAY_MS,
    };
  }

  return nextWindow;
}

function pickAvailableAt(windowStartMs, windowEndMs, nowMs, deliveryOptions = {}, timeZone = "Asia/Shanghai") {
  if (windowEndMs <= windowStartMs) {
    return applyQuietHours(Math.max(windowEndMs, nowMs), deliveryOptions, timeZone);
  }

  const pace = normalizeText(deliveryOptions.deliveryPace, 16) || "balanced";
  const span = windowEndMs - windowStartMs;
  let minRate = 0;
  let maxRate = 1;
  if (pace === "fast") {
    minRate = 0;
    maxRate = 0.45;
  } else if (pace === "slow") {
    minRate = 0.55;
    maxRate = 1;
  }

  const offset = Math.floor((minRate + Math.random() * (maxRate - minRate)) * span);
  const candidate = windowStartMs + offset;
  return applyQuietHours(candidate < nowMs ? nowMs : candidate, deliveryOptions, timeZone);
}

function serializeReply(reply) {
  if (!reply) {
    return null;
  }

  const bodyReady = typeof reply.body === "string" && reply.body.trim().length > 0;
  const aiGenerated =
    reply.status === REPLY_STATUS.WAITING
      ? bodyReady
      : reply.preview === AI_READY_PREVIEW;
  const aiGenerationStatus = reply.status === REPLY_STATUS.WAITING
    ? (bodyReady ? "generated_waiting_delivery" : "generating")
    : (aiGenerated ? "delivered_ai" : "delivered_fallback");

  return {
    id: reply.id,
    userId: reply.userId,
    letterId: reply.letterId,
    sourceType: reply.sourceType,
    memorialProfileId: reply.memorialProfileId,
    memorialEventId: reply.memorialEventId,
    sourceLetterId: reply.sourceLetterId,
    status: reply.status,
    aiGenerated,
    aiGenerationStatus,
    createdAt: Number(reply.createdAtMs),
    availableAt: Number(reply.availableAtMs),
    subject: reply.subject,
    preview: reply.preview,
    body: reply.body,
    readAt: reply.readAtMs ? Number(reply.readAtMs) : null,
    favorite: Boolean(reply.favorite),
    archived: Boolean(reply.archived),
    feedbackScore: normalizeText(reply.feedbackScore, 16) || null,
    feedbackReason: normalizeText(reply.feedbackReason, 255) || "",
    feedbackAt: reply.feedbackAtMs ? Number(reply.feedbackAtMs) : null,
  };
}

async function findLatestLetterForProfile(profile) {
  const letter = await Letter.findOne({
    where: {
      userId: profile.userId,
      relation: profile.relation,
    },
    order: [["createdAtMs", "DESC"]],
  });

  if (letter) {
    return letter;
  }

  return Letter.findOne({
    where: { userId: profile.userId },
    order: [["createdAtMs", "DESC"]],
  });
}

async function listMemorialProfiles(userContext) {
  const profiles = await MemorialProfile.findAll({
    where: { userId: userContext.userId, active: true },
    order: [["createdAtMs", "DESC"]],
  });

  return profiles.map((profile) => profile.toJSON());
}

async function createMemorialProfile(userContext, payload = {}) {
  const relation = normalizeText(payload.relation, 16);
  ensureRelation(relation);

  const displayName = normalizeText(payload.displayName, 32);
  const keywords = normalizeText(payload.keywords, 128);
  const note = normalizeText(payload.note, 400);
  const timezone = normalizeText(payload.timezone, 64) || "Asia/Shanghai";

  const activeCount = await MemorialProfile.count({
    where: { userId: userContext.userId, active: true },
  });

  if (activeCount >= MEMORIAL_PROFILE_LIMIT) {
    throw new AppError(400, "Memorial profile limit reached", {
      limit: MEMORIAL_PROFILE_LIMIT,
    });
  }

  const now = Date.now();
  const profile = await MemorialProfile.create({
    id: createId("memorial_profile"),
    userId: userContext.userId,
    relation,
    displayName,
    keywords,
    note,
    timezone,
    active: true,
    createdAtMs: now,
    updatedAtMs: now,
  });

  return profile.toJSON();
}

async function updateMemorialProfile(userContext, profileId, payload = {}) {
  const profile = await MemorialProfile.findOne({
    where: { id: profileId, userId: userContext.userId, active: true },
  });

  if (!profile) {
    throw new AppError(404, "Memorial profile not found");
  }

  if (payload.relation) {
    const relation = normalizeText(payload.relation, 16);
    ensureRelation(relation);
    profile.relation = relation;
  }

  if (payload.displayName !== undefined) {
    profile.displayName = normalizeText(payload.displayName, 32);
  }

  if (payload.keywords !== undefined) {
    profile.keywords = normalizeText(payload.keywords, 128);
  }

  if (payload.note !== undefined) {
    profile.note = normalizeText(payload.note, 400);
  }

  if (payload.timezone !== undefined) {
    profile.timezone = normalizeText(payload.timezone, 64) || "Asia/Shanghai";
  }

  profile.updatedAtMs = Date.now();
  await profile.save();
  return profile.toJSON();
}

async function deleteMemorialProfile(userContext, profileId) {
  const profile = await MemorialProfile.findOne({
    where: { id: profileId, userId: userContext.userId, active: true },
  });

  if (!profile) {
    throw new AppError(404, "Memorial profile not found");
  }

  profile.active = false;
  profile.updatedAtMs = Date.now();
  await profile.save();

  return profile.toJSON();
}

async function listMemorialEvents(userContext, profileId) {
  const profile = await MemorialProfile.findOne({
    where: { id: profileId, userId: userContext.userId, active: true },
  });

  if (!profile) {
    throw new AppError(404, "Memorial profile not found");
  }

  const events = await MemorialEvent.findAll({
    where: { profileId: profile.id },
    order: [["nextTriggerAtMs", "ASC"]],
  });

  return events.map((event) => event.toJSON());
}

async function createMemorialEvent(userContext, profileId, payload = {}) {
  const profile = await MemorialProfile.findOne({
    where: { id: profileId, userId: userContext.userId, active: true },
  });

  if (!profile) {
    throw new AppError(404, "Memorial profile not found");
  }

  const type = normalizeText(payload.type, 16);
  ensureEventType(type);
  let calendarType = normalizeText(payload.calendarType, 16) || "solar";
  ensureCalendarType(calendarType);

  let month = Number(payload.month);
  let day = Number(payload.day);

  if (type === "qingming") {
    calendarType = "solar";
    month = 4;
    day = 4;
  }

  ensureMonthDay(month, day, calendarType);

  const label = normalizeText(payload.label, 32);
  const windowStartDays = Number(payload.windowStartDays ?? -1);
  const windowEndDays = Number(payload.windowEndDays ?? 1);
  const deliverAtHour = Number(payload.deliverAtHour ?? 9);
  const deliverAtMinute = Number(payload.deliverAtMinute ?? 0);
  const enabled = payload.enabled !== undefined ? Boolean(payload.enabled) : true;

  ensureWindow(windowStartDays, windowEndDays);
  ensureHour(deliverAtHour);
  ensureMinute(deliverAtMinute);

  const now = Date.now();
  const window = computeNextWindow(
    {
      month,
      day,
      calendarType,
      deliverAtHour,
      deliverAtMinute,
      windowStartDays,
      windowEndDays,
    },
    profile.timezone || "Asia/Shanghai",
    now
  );

  const event = await MemorialEvent.create({
    id: createId("memorial_event"),
    profileId: profile.id,
    type,
    month,
    day,
    calendarType,
    label,
    windowStartDays,
    windowEndDays,
    deliverAtHour,
    deliverAtMinute,
    enabled,
    nextTriggerAtMs: window.windowStartMs,
    lastTriggeredYear: 0,
  });

  return event.toJSON();
}

async function updateMemorialEvent(userContext, eventId, payload = {}) {
  const event = await MemorialEvent.findByPk(eventId);
  if (!event) {
    throw new AppError(404, "Memorial event not found");
  }

  const profile = await MemorialProfile.findOne({
    where: { id: event.profileId, userId: userContext.userId, active: true },
  });

  if (!profile) {
    throw new AppError(404, "Memorial profile not found");
  }

  if (payload.type) {
    const type = normalizeText(payload.type, 16);
    ensureEventType(type);
    event.type = type;
    if (type === "qingming") {
      event.calendarType = "solar";
      event.month = 4;
      event.day = 4;
    }
  }

  if (payload.calendarType !== undefined && event.type !== "qingming") {
    const calendarType = normalizeText(payload.calendarType, 16) || "solar";
    ensureCalendarType(calendarType);
    event.calendarType = calendarType;
  }

  if (payload.month !== undefined || payload.day !== undefined) {
    const month = event.type === "qingming"
      ? 4
      : Number(payload.month ?? event.month);
    const day = event.type === "qingming"
      ? 4
      : Number(payload.day ?? event.day);
    ensureMonthDay(month, day, event.calendarType || "solar");
    event.month = month;
    event.day = day;
  }

  if (payload.label !== undefined) {
    event.label = normalizeText(payload.label, 32);
  }

  if (payload.windowStartDays !== undefined || payload.windowEndDays !== undefined) {
    const start = Number(payload.windowStartDays ?? event.windowStartDays);
    const end = Number(payload.windowEndDays ?? event.windowEndDays);
    ensureWindow(start, end);
    event.windowStartDays = start;
    event.windowEndDays = end;
  }

  if (payload.deliverAtHour !== undefined) {
    const hour = Number(payload.deliverAtHour);
    ensureHour(hour);
    event.deliverAtHour = hour;
  }

  if (payload.deliverAtMinute !== undefined) {
    const minute = Number(payload.deliverAtMinute);
    ensureMinute(minute);
    event.deliverAtMinute = minute;
  }

  if (payload.enabled !== undefined) {
    event.enabled = Boolean(payload.enabled);
  }

  const window = computeNextWindow(
    event,
    profile.timezone || "Asia/Shanghai",
    Date.now()
  );

  event.nextTriggerAtMs = window.windowStartMs;
  await event.save();
  return event.toJSON();
}

async function deleteMemorialEvent(userContext, eventId) {
  const event = await MemorialEvent.findByPk(eventId);
  if (!event) {
    throw new AppError(404, "Memorial event not found");
  }

  const profile = await MemorialProfile.findOne({
    where: { id: event.profileId, userId: userContext.userId, active: true },
  });

  if (!profile) {
    throw new AppError(404, "Memorial profile not found");
  }

  await event.destroy();
  return { deleted: true };
}

async function createMemorialTestReply(userContext, profileId, payload = {}) {
  const profile = await MemorialProfile.findOne({
    where: { id: profileId, userId: userContext.userId, active: true },
  });

  if (!profile) {
    throw new AppError(404, "Memorial profile not found");
  }

  const eventId = normalizeText(payload.eventId, 48);
  if (!eventId) {
    throw new AppError(400, "Memorial event is required for test delivery");
  }

  const event = await MemorialEvent.findOne({
    where: {
      id: eventId,
      profileId: profile.id,
    },
  });

  if (!event) {
    throw new AppError(404, "Memorial event not found");
  }

  const sendAtMs = Number(payload.sendAtMs);
  if (!Number.isFinite(sendAtMs)) {
    throw new AppError(400, "Invalid test delivery time");
  }

  const now = Date.now();
  if (sendAtMs < now + TEST_DELIVERY_MIN_LEAD_MS) {
    throw new AppError(400, "Test delivery time must be at least one minute later");
  }

  const sourceLetter = await findLatestLetterForProfile(profile);
  if (!sourceLetter) {
    throw new AppError(400, "Write at least one letter before testing memorial delivery");
  }

  const waitingPayload = buildMemorialWaitingPayload(
    profile,
    event,
    now,
    sendAtMs
  );

  const reply = await Reply.create({
    id: createId("reply"),
    userId: profile.userId,
    letterId: sourceLetter.id,
    sourceType: MEMORIAL_SOURCE_TYPE.MEMORIAL,
    memorialProfileId: profile.id,
    memorialEventId: event.id,
    sourceLetterId: sourceLetter.id,
    status: REPLY_STATUS.WAITING,
    createdAtMs: waitingPayload.createdAtMs,
    availableAtMs: sendAtMs,
    subject: waitingPayload.subject,
    preview: "测试回响已经排进收件箱，会按你选的时刻送达。",
    body: waitingPayload.body,
  });

  return serializeReply(reply);
}

async function triggerMemorialReplies() {
  const now = Date.now();
  const dueEvents = await MemorialEvent.findAll({
    where: {
      enabled: true,
      nextTriggerAtMs: { [Op.lte]: now },
    },
    order: [["nextTriggerAtMs", "ASC"]],
    limit: 200,
  });

  const results = [];

  for (const event of dueEvents) {
    const profile = await MemorialProfile.findByPk(event.profileId);

    if (!profile || !profile.active) {
      continue;
    }

    const user = await User.findByPk(profile.userId);
    const deliveryOptions = {
      deliveryPace: normalizeText(user?.deliveryPace, 16) || "balanced",
      quietStartMinute: user?.quietStartMinute,
      quietEndMinute: user?.quietEndMinute,
    };

    const window = computeNextWindow(event, profile.timezone || "Asia/Shanghai", now);
    if (event.lastTriggeredYear >= window.year) {
      event.nextTriggerAtMs = window.windowStartMs;
      await event.save();
      continue;
    }

    const sourceLetter = await findLatestLetterForProfile(profile);

    if (!sourceLetter) {
      event.nextTriggerAtMs = now + RETRY_NO_LETTER_MS;
      await event.save();
      results.push({ eventId: event.id, status: "no_letter" });
      continue;
    }

    const availableAtMs = pickAvailableAt(
      window.windowStartMs,
      window.windowEndMs,
      now,
      deliveryOptions,
      profile.timezone || "Asia/Shanghai"
    );
    const waitingPayload = buildMemorialWaitingPayload(
      profile,
      event,
      now,
      availableAtMs
    );

    const reply = await Reply.create({
      id: createId("reply"),
      userId: profile.userId,
      letterId: sourceLetter.id,
      sourceType: MEMORIAL_SOURCE_TYPE.MEMORIAL,
      memorialProfileId: profile.id,
      memorialEventId: event.id,
      sourceLetterId: sourceLetter.id,
      status: REPLY_STATUS.WAITING,
      createdAtMs: waitingPayload.createdAtMs,
      availableAtMs: waitingPayload.availableAtMs,
      subject: waitingPayload.subject,
      preview: waitingPayload.preview,
      body: waitingPayload.body,
    });

    event.lastTriggeredYear = window.year;
    const nextWindow = computeNextWindow(
      {
        month: event.month,
        day: event.day,
        calendarType: event.calendarType,
        deliverAtHour: event.deliverAtHour,
        deliverAtMinute: event.deliverAtMinute,
        windowStartDays: event.windowStartDays,
        windowEndDays: event.windowEndDays,
      },
      profile.timezone || "Asia/Shanghai",
      now + DAY_MS
    );
    event.nextTriggerAtMs = nextWindow.windowStartMs;
    await event.save();

    results.push({
      eventId: event.id,
      replyId: reply.id,
      status: "created",
    });
  }

  return {
    processed: dueEvents.length,
    results,
  };
}

module.exports = {
  listMemorialProfiles,
  createMemorialProfile,
  updateMemorialProfile,
  deleteMemorialProfile,
  listMemorialEvents,
  createMemorialEvent,
  updateMemorialEvent,
  deleteMemorialEvent,
  createMemorialTestReply,
  triggerMemorialReplies,
};
