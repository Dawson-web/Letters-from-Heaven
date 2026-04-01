const { User } = require("./db");
const { AppError } = require("./errors");
const {
  DELIVERY_PACE_OPTIONS,
  REMINDER_CHANNEL_OPTIONS,
} = require("./constants");

function normalizeText(input, maxLength) {
  const value = typeof input === "string" ? input.trim() : "";
  return value.slice(0, maxLength);
}

function normalizeMinute(input) {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  const minute = Number(input);
  if (!Number.isInteger(minute) || minute < 0 || minute > 1439) {
    throw new AppError(400, "Quiet hour minute must be an integer between 0 and 1439");
  }

  return minute;
}

function serializePreferences(user) {
  return {
    deliveryPace: normalizeText(user.deliveryPace, 16) || "balanced",
    quietStartMinute:
      user.quietStartMinute === null || user.quietStartMinute === undefined
        ? null
        : Number(user.quietStartMinute),
    quietEndMinute:
      user.quietEndMinute === null || user.quietEndMinute === undefined
        ? null
        : Number(user.quietEndMinute),
    reminderEnabled: Boolean(user.reminderEnabled),
    reminderChannel: normalizeText(user.reminderChannel, 32) || "none",
    officialAccountOpenId: normalizeText(user.officialAccountOpenId, 128),
    miniProgramTemplateId: normalizeText(user.miniProgramTemplateId, 128),
    officialAccountTemplateId: normalizeText(user.officialAccountTemplateId, 128),
    notifyLanguage: normalizeText(user.notifyLanguage, 8) || "zh_CN",
  };
}

async function ensureUser(userContext) {
  const now = Date.now();
  const [user, created] = await User.findOrCreate({
    where: { id: userContext.userId },
    defaults: {
      id: userContext.userId,
      source: userContext.source,
      lastSeenAtMs: now,
    },
  });

  if (!created) {
    user.source = userContext.source;
    user.lastSeenAtMs = now;
    await user.save();
  }

  return user;
}

async function getUserPreferences(userContext) {
  const user = await ensureUser(userContext);
  return serializePreferences(user);
}

async function updateUserPreferences(userContext, payload = {}) {
  const user = await ensureUser(userContext);

  if (payload.deliveryPace !== undefined) {
    const deliveryPace = normalizeText(payload.deliveryPace, 16) || "balanced";
    if (!DELIVERY_PACE_OPTIONS.includes(deliveryPace)) {
      throw new AppError(400, "Invalid delivery pace", {
        allowed: DELIVERY_PACE_OPTIONS,
      });
    }

    user.deliveryPace = deliveryPace;
  }

  if (payload.quietStartMinute !== undefined || payload.quietEndMinute !== undefined) {
    const quietStartMinute = payload.quietStartMinute !== undefined
      ? normalizeMinute(payload.quietStartMinute)
      : user.quietStartMinute;
    const quietEndMinute = payload.quietEndMinute !== undefined
      ? normalizeMinute(payload.quietEndMinute)
      : user.quietEndMinute;

    if ((quietStartMinute === null) !== (quietEndMinute === null)) {
      throw new AppError(400, "quietStartMinute and quietEndMinute must both be set or both be null");
    }

    if (quietStartMinute === quietEndMinute) {
      user.quietStartMinute = null;
      user.quietEndMinute = null;
    } else {
      user.quietStartMinute = quietStartMinute;
      user.quietEndMinute = quietEndMinute;
    }
  }

  if (payload.reminderEnabled !== undefined) {
    user.reminderEnabled = Boolean(payload.reminderEnabled);
  }

  if (payload.reminderChannel !== undefined) {
    const reminderChannel = normalizeText(payload.reminderChannel, 32) || "none";
    if (!REMINDER_CHANNEL_OPTIONS.includes(reminderChannel)) {
      throw new AppError(400, "Invalid reminder channel", {
        allowed: REMINDER_CHANNEL_OPTIONS,
      });
    }

    user.reminderChannel = reminderChannel;
  }

  if (payload.officialAccountOpenId !== undefined) {
    user.officialAccountOpenId = normalizeText(payload.officialAccountOpenId, 128);
  }

  if (payload.miniProgramTemplateId !== undefined) {
    user.miniProgramTemplateId = normalizeText(payload.miniProgramTemplateId, 128);
  }

  if (payload.officialAccountTemplateId !== undefined) {
    user.officialAccountTemplateId = normalizeText(payload.officialAccountTemplateId, 128);
  }

  if (payload.notifyLanguage !== undefined) {
    const notifyLanguage = normalizeText(payload.notifyLanguage, 8) || "zh_CN";
    user.notifyLanguage = notifyLanguage;
  }

  if (
    user.reminderEnabled &&
    user.reminderChannel === "official_account" &&
    !normalizeText(user.officialAccountOpenId, 128)
  ) {
    throw new AppError(400, "officialAccountOpenId is required for official_account reminders");
  }

  await user.save();
  return serializePreferences(user);
}

module.exports = {
  getUserPreferences,
  updateUserPreferences,
};
