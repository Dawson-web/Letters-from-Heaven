const { Op } = require("sequelize");
const {
  MemorialProfile,
  MemorialEvent,
  Letter,
  Reply,
} = require("./db");
const { AppError } = require("./errors");
const {
  RELATION_OPTIONS,
  MEMORIAL_EVENT_TYPES,
  MEMORIAL_SOURCE_TYPE,
  MEMORIAL_PROFILE_LIMIT,
  REPLY_STATUS,
} = require("./constants");
const {
  buildMemorialWaitingPayload,
} = require("./reply-builder");

const DAY_MS = 24 * 60 * 60 * 1000;
const RETRY_NO_LETTER_MS = 6 * 60 * 60 * 1000;

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

function ensureMonthDay(month, day) {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new AppError(400, "Invalid event date");
  }
}

function ensureHour(hour) {
  if (hour < 0 || hour > 23) {
    throw new AppError(400, "Invalid deliver hour");
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

function makeZonedDateMs({ year, month, day, hour }, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, 0, 0);
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

function computeNextWindow(event, timeZone, nowMs) {
  const now = new Date(nowMs);
  const { year } = getZonedDateParts(now, timeZone);

  const baseMs = makeZonedDateMs(
    {
      year,
      month: event.month,
      day: event.day,
      hour: event.deliverAtHour,
    },
    timeZone
  );

  const windowStartMs = baseMs + event.windowStartDays * DAY_MS;
  const windowEndMs = baseMs + event.windowEndDays * DAY_MS;

  if (windowEndMs >= nowMs) {
    return {
      year,
      windowStartMs,
      windowEndMs,
    };
  }

  const nextYear = year + 1;
  const nextBaseMs = makeZonedDateMs(
    {
      year: nextYear,
      month: event.month,
      day: event.day,
      hour: event.deliverAtHour,
    },
    timeZone
  );
  return {
    year: nextYear,
    windowStartMs: nextBaseMs + event.windowStartDays * DAY_MS,
    windowEndMs: nextBaseMs + event.windowEndDays * DAY_MS,
  };
}

function pickAvailableAt(windowStartMs, windowEndMs, nowMs) {
  if (windowEndMs <= windowStartMs) {
    return Math.max(windowEndMs, nowMs);
  }

  const offset = Math.floor(Math.random() * (windowEndMs - windowStartMs));
  const candidate = windowStartMs + offset;
  return candidate < nowMs ? nowMs : candidate;
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

  let month = Number(payload.month);
  let day = Number(payload.day);

  if (type === "qingming") {
    month = 4;
    day = 4;
  }

  ensureMonthDay(month, day);

  const label = normalizeText(payload.label, 32);
  const windowStartDays = Number(payload.windowStartDays ?? -1);
  const windowEndDays = Number(payload.windowEndDays ?? 1);
  const deliverAtHour = Number(payload.deliverAtHour ?? 9);
  const enabled = payload.enabled !== undefined ? Boolean(payload.enabled) : true;

  ensureWindow(windowStartDays, windowEndDays);
  ensureHour(deliverAtHour);

  const now = Date.now();
  const window = computeNextWindow(
    {
      month,
      day,
      deliverAtHour,
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
    label,
    windowStartDays,
    windowEndDays,
    deliverAtHour,
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
      event.month = 4;
      event.day = 4;
    }
  }

  if (payload.month !== undefined || payload.day !== undefined) {
    const month = Number(payload.month ?? event.month);
    const day = Number(payload.day ?? event.day);
    ensureMonthDay(month, day);
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

    const window = computeNextWindow(event, profile.timezone || "Asia/Shanghai", now);
    if (event.lastTriggeredYear >= window.year) {
      event.nextTriggerAtMs = window.windowStartMs;
      await event.save();
      continue;
    }

    const letter = await Letter.findOne({
      where: {
        userId: profile.userId,
        relation: profile.relation,
      },
      order: [["createdAtMs", "DESC"]],
    });

    const fallbackLetter = letter
      ? null
      : await Letter.findOne({
          where: { userId: profile.userId },
          order: [["createdAtMs", "DESC"]],
        });

    const sourceLetter = letter || fallbackLetter;

    if (!sourceLetter) {
      event.nextTriggerAtMs = now + RETRY_NO_LETTER_MS;
      await event.save();
      results.push({ eventId: event.id, status: "no_letter" });
      continue;
    }

    const availableAtMs = pickAvailableAt(
      window.windowStartMs,
      window.windowEndMs,
      now
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
        deliverAtHour: event.deliverAtHour,
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
  triggerMemorialReplies,
};
