const {
  Letter,
  Reply,
  User,
  MemorialProfile,
  MemorialEvent,
  sequelize,
} = require("./db");
const { Op } = require("sequelize");
const { AppError } = require("./errors");
const {
  RELATION_OPTIONS,
  REPLY_STATUS,
  MEMORIAL_SOURCE_TYPE,
  FEEDBACK_SCORE_OPTIONS,
} = require("./constants");
const {
  buildWaitingReplyPayload,
  buildReadyReplyPayload,
  buildMemorialReadyPayload,
} = require("./reply-builder");
const { generateReplyBodyByAI } = require("./ai-service");
const { notifyReplyReady } = require("./notification-service");

const AI_READY_PREVIEW = "你的来信已收到，回响已生成。";

function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function normalizeText(input, maxLength) {
  const value = typeof input === "string" ? input.trim() : "";
  return value.slice(0, maxLength);
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function serializeLetter(letter) {
  if (!letter) {
    return null;
  }

  return {
    id: letter.id,
    userId: letter.userId,
    title: letter.title,
    body: letter.body,
    relation: letter.relation,
    signature: letter.signature,
    replyId: letter.replyId,
    createdAt: Number(letter.createdAtMs),
  };
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

function memorialEventLabel(event) {
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
      return normalizeText(event?.label, 32) || "纪念回响";
  }
}

function validateLetterPayload(payload = {}) {
  const title = normalizeText(payload.title, 32);
  const body = normalizeText(payload.body, 800);
  const relation = normalizeText(payload.relation, 16);
  const signature = normalizeText(payload.signature, 16);
  const testMode = payload.testMode === true;

  if (!relation || !RELATION_OPTIONS.includes(relation)) {
    throw new AppError(400, "Invalid relation", {
      relationOptions: RELATION_OPTIONS,
    });
  }

  if (body.length < 8) {
    throw new AppError(400, "Letter body must be at least 8 characters");
  }

  return {
    title,
    body,
    relation,
    signature,
    testMode,
  };
}

function buildFeedbackHint(recentReplies) {
  if (!Array.isArray(recentReplies) || recentReplies.length === 0) {
    return "";
  }

  const lines = [];
  for (const reply of recentReplies) {
    const score = normalizeText(reply.feedbackScore, 16);
    const reason = normalizeText(reply.feedbackReason, 120);
    if (!score) {
      continue;
    }

    if (score === "match") {
      lines.push(`用户偏好：更喜欢“${reason || "贴近来信细节、克制陪伴"}”的语气。`);
    }

    if (score === "mismatch") {
      lines.push(`用户不喜欢：${reason || "空泛或不贴近来信细节的表达"}。`);
    }
  }

  return lines.slice(0, 3).join("\n");
}

async function getRecentFeedbackHint(userId) {
  const recentReplies = await Reply.findAll({
    where: {
      userId,
      feedbackScore: { [Op.in]: ["match", "mismatch"] },
    },
    order: [["feedbackAtMs", "DESC"]],
    limit: 8,
  });

  return buildFeedbackHint(recentReplies);
}

function buildMemorialAIDraft(profile, event, sourceLetter, feedbackHint) {
  const relation =
    normalizeText(profile?.relation, 16) ||
    normalizeText(sourceLetter?.relation, 16) ||
    "远方";
  const displayName =
    normalizeText(profile?.displayName, 32) ||
    normalizeText(profile?.relation, 16) ||
    "远方";
  const label = memorialEventLabel(event);

  const contextBlocks = [
    `这是一次纪念回响，场景：${label}。`,
    sourceLetter?.body
      ? `最近一次来信：${normalizeText(sourceLetter.body, 1000)}`
      : "",
    profile?.keywords
      ? `记忆线索：${normalizeText(profile.keywords, 128)}`
      : "",
    profile?.note
      ? `补充记忆：${normalizeText(profile.note, 400)}`
      : "",
    feedbackHint
      ? `用户对过往回响的偏好：${feedbackHint}`
      : "",
    "请围绕这个纪念日场景写回信，情绪上以陪伴和安放思念为主。",
  ];

  return {
    relation,
    title: `${displayName} · ${label}`,
    body: contextBlocks.filter(Boolean).join("\n"),
    signature: normalizeText(sourceLetter?.signature, 16) || displayName,
    feedbackHint,
  };
}

async function touchUser(userContext) {
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

async function notifyReplyIfNeeded(reply, context = {}) {
  if (!reply || reply.status !== REPLY_STATUS.READY || reply.notifiedAtMs) {
    return { sent: false, reason: "skip" };
  }

  const user = await User.findByPk(reply.userId);
  if (!user || !user.reminderEnabled) {
    return { sent: false, reason: "disabled" };
  }

  const result = await notifyReplyReady({
    user,
    reply,
    letter: context.letter || null,
    memorialProfile: context.memorialProfile || null,
    memorialEvent: context.memorialEvent || null,
  });

  if (result.sent) {
    reply.notifiedAtMs = Date.now();
    await reply.save();
  }

  return result;
}

async function settleReply(reply, letter) {
  if (
    reply.status !== REPLY_STATUS.WAITING ||
    Number(reply.availableAtMs) > Date.now()
  ) {
    return reply;
  }

  const sourceLetter =
    letter ||
    (reply.sourceLetterId
      ? await Letter.findByPk(reply.sourceLetterId)
      : await Letter.findByPk(reply.letterId));

  const feedbackHint = await getRecentFeedbackHint(reply.userId);

  if (reply.sourceType === MEMORIAL_SOURCE_TYPE.MEMORIAL) {
    const memorialProfile = reply.memorialProfileId
      ? await MemorialProfile.findByPk(reply.memorialProfileId)
      : null;
    const memorialEvent = reply.memorialEventId
      ? await MemorialEvent.findByPk(reply.memorialEventId)
      : null;

    if (!memorialProfile || !memorialEvent) {
      return reply;
    }

    const memorialAIDraft = buildMemorialAIDraft(
      memorialProfile,
      memorialEvent,
      sourceLetter,
      feedbackHint
    );
    const aiBody = reply.body || (await generateReplyBodyByAI(memorialAIDraft));
    const readyPayload = buildMemorialReadyPayload(
      memorialProfile,
      sourceLetter,
      memorialEvent,
      { aiBody }
    );
    reply.status = readyPayload.status;
    reply.subject = readyPayload.subject;
    reply.preview = readyPayload.preview;
    reply.body = readyPayload.body;
    await reply.save();

    await notifyReplyIfNeeded(reply, {
      letter: sourceLetter,
      memorialProfile,
      memorialEvent,
    });

    return reply;
  }

  if (!sourceLetter) {
    return reply;
  }

  const serializedLetter = serializeLetter(sourceLetter);
  const aiBody = reply.body || (await generateReplyBodyByAI({
    ...serializedLetter,
    feedbackHint,
  }));
  const readyPayload = buildReadyReplyPayload(serializedLetter, { aiBody });
  reply.status = readyPayload.status;
  reply.subject = readyPayload.subject;
  reply.preview = readyPayload.preview;
  reply.body = readyPayload.body;
  await reply.save();

  await notifyReplyIfNeeded(reply, {
    letter: sourceLetter,
  });

  return reply;
}

async function settleRepliesForUser(userId) {
  const waitingReplies = await Reply.findAll({
    where: {
      userId,
      status: REPLY_STATUS.WAITING,
    },
  });

  await Promise.all(waitingReplies.map((reply) => settleReply(reply)));
}

async function settleDueReplies(limit = 200) {
  const waitingReplies = await Reply.findAll({
    where: {
      status: REPLY_STATUS.WAITING,
      availableAtMs: {
        [Op.lte]: Date.now(),
      },
    },
    order: [["availableAtMs", "ASC"]],
    limit,
  });

  const settledReplyIds = [];
  for (const reply of waitingReplies) {
    const settled = await settleReply(reply);
    if (settled.status === REPLY_STATUS.READY) {
      settledReplyIds.push(settled.id);
    }
  }

  return {
    processed: waitingReplies.length,
    settled: settledReplyIds.length,
    settledReplyIds,
  };
}

async function createLetter(userContext, payload) {
  const input = validateLetterPayload(payload);
  const now = Date.now();
  const letterId = createId("letter");
  const replyId = createId("reply");

  const user = await touchUser(userContext);
  const replyPayload = buildWaitingReplyPayload(input, now, {
    testMode: input.testMode,
    deliveryPace: user.deliveryPace,
    quietStartMinute: user.quietStartMinute,
    quietEndMinute: user.quietEndMinute,
  });

  const feedbackHint = await getRecentFeedbackHint(userContext.userId);
  const aiBodySeed = await generateReplyBodyByAI({
    ...input,
    feedbackHint,
  });

  const result = await sequelize.transaction(async (transaction) => {
    const letter = await Letter.create(
      {
        id: letterId,
        userId: userContext.userId,
        title: input.title,
        body: input.body,
        relation: input.relation,
        signature: input.signature,
        replyId,
        createdAtMs: now,
      },
      { transaction }
    );

    const reply = await Reply.create(
      {
        id: replyId,
        userId: userContext.userId,
        letterId,
        sourceType: MEMORIAL_SOURCE_TYPE.LETTER,
        memorialProfileId: null,
        memorialEventId: null,
        sourceLetterId: letterId,
        status: replyPayload.status,
        createdAtMs: replyPayload.createdAtMs,
        availableAtMs: replyPayload.availableAtMs,
        subject: replyPayload.subject,
        preview: replyPayload.preview,
        body: aiBodySeed || replyPayload.body,
      },
      { transaction }
    );

    return { letter, reply };
  });

  return {
    letter: serializeLetter(result.letter),
    reply: serializeReply(result.reply),
  };
}

async function listLetters(userContext) {
  await touchUser(userContext);

  const letters = await Letter.findAll({
    where: { userId: userContext.userId },
    order: [["createdAtMs", "DESC"]],
  });

  return letters.map(serializeLetter);
}

function shouldIncludeArchived(options = {}) {
  return options.includeArchived === true || options.includeArchived === "true";
}

async function listReplies(userContext, options = {}) {
  await touchUser(userContext);
  await settleRepliesForUser(userContext.userId);

  const includeArchived = shouldIncludeArchived(options);
  const where = { userId: userContext.userId };
  if (!includeArchived) {
    where.archived = false;
  }

  const replies = await Reply.findAll({
    where,
    order: [["createdAtMs", "DESC"]],
  });

  return replies.map(serializeReply);
}

async function getReplyDetail(userContext, replyId) {
  await touchUser(userContext);

  const reply = await Reply.findOne({
    where: {
      id: replyId,
      userId: userContext.userId,
    },
  });

  if (!reply) {
    throw new AppError(404, "Reply not found");
  }

  const letter = await Letter.findOne({
    where: {
      id: reply.sourceLetterId || reply.letterId,
      userId: userContext.userId,
    },
  });

  await settleReply(reply, letter);

  return {
    reply: serializeReply(reply),
    letter: serializeLetter(letter),
  };
}

async function getMailbox(userContext, options = {}) {
  await touchUser(userContext);
  await settleRepliesForUser(userContext.userId);

  const includeArchived = shouldIncludeArchived(options);
  const replyWhere = { userId: userContext.userId };
  if (!includeArchived) {
    replyWhere.archived = false;
  }

  const [letters, replies] = await Promise.all([
    Letter.findAll({
      where: { userId: userContext.userId },
      order: [["createdAtMs", "DESC"]],
    }),
    Reply.findAll({
      where: replyWhere,
      order: [["createdAtMs", "DESC"]],
    }),
  ]);

  const serializedReplies = replies.map(serializeReply);
  return {
    letters: letters.map(serializeLetter),
    replies: serializedReplies,
    readyCount: serializedReplies.filter(
      (reply) => reply.status === REPLY_STATUS.READY
    ).length,
    waitingCount: serializedReplies.filter(
      (reply) => reply.status === REPLY_STATUS.WAITING
    ).length,
  };
}

async function clearMailbox(userContext) {
  await touchUser(userContext);

  return sequelize.transaction(async (transaction) => {
    const deletedReplies = await Reply.destroy({
      where: { userId: userContext.userId },
      transaction,
    });
    const deletedLetters = await Letter.destroy({
      where: { userId: userContext.userId },
      transaction,
    });

    return {
      deletedLetters,
      deletedReplies,
    };
  });
}

function normalizeFeedbackScore(input) {
  if (input === null) {
    return null;
  }

  const score = normalizeText(input, 16);
  if (!score) {
    return null;
  }

  if (!FEEDBACK_SCORE_OPTIONS.includes(score)) {
    throw new AppError(400, "Invalid feedback score", {
      allowed: FEEDBACK_SCORE_OPTIONS,
    });
  }

  return score;
}

async function updateReply(userContext, replyId, payload = {}) {
  await touchUser(userContext);

  const reply = await Reply.findOne({
    where: {
      id: replyId,
      userId: userContext.userId,
    },
  });

  if (!reply) {
    throw new AppError(404, "Reply not found");
  }

  let changed = false;

  if (payload.subject !== undefined) {
    const subject = normalizeText(payload.subject, 64);
    if (!subject) {
      throw new AppError(400, "Reply subject is required");
    }

    reply.subject = subject;
    changed = true;
  }

  if (payload.readAt !== undefined) {
    if (payload.readAt === null || payload.readAt === "") {
      reply.readAtMs = null;
    } else {
      const readAt = toFiniteNumber(payload.readAt);
      if (!readAt || readAt <= 0) {
        throw new AppError(400, "Invalid readAt");
      }
      reply.readAtMs = Math.floor(readAt);
    }
    changed = true;
  }

  if (payload.favorite !== undefined) {
    reply.favorite = Boolean(payload.favorite);
    changed = true;
  }

  if (payload.archived !== undefined) {
    reply.archived = Boolean(payload.archived);
    changed = true;
  }

  if (payload.feedbackScore !== undefined || payload.feedbackReason !== undefined) {
    const score = normalizeFeedbackScore(payload.feedbackScore !== undefined
      ? payload.feedbackScore
      : reply.feedbackScore);
    const reason = normalizeText(
      payload.feedbackReason !== undefined ? payload.feedbackReason : reply.feedbackReason,
      255
    );

    reply.feedbackScore = score;
    reply.feedbackReason = score ? reason : "";
    reply.feedbackAtMs = score ? Date.now() : null;
    changed = true;
  }

  if (!changed) {
    throw new AppError(400, "No valid fields to update");
  }

  await reply.save();

  return serializeReply(reply);
}

async function deleteReply(userContext, replyId) {
  await touchUser(userContext);

  const reply = await Reply.findOne({
    where: {
      id: replyId,
      userId: userContext.userId,
    },
  });

  if (!reply) {
    throw new AppError(404, "Reply not found");
  }

  await reply.destroy();

  return {
    deleted: true,
    id: replyId,
  };
}

module.exports = {
  createLetter,
  listLetters,
  listReplies,
  getReplyDetail,
  getMailbox,
  clearMailbox,
  updateReply,
  deleteReply,
  touchUser,
  settleDueReplies,
};
