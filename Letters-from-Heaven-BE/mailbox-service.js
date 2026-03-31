const {
  Letter,
  Reply,
  User,
  MemorialProfile,
  MemorialEvent,
  sequelize,
} = require("./db");
const { AppError } = require("./errors");
const {
  RELATION_OPTIONS,
  REPLY_STATUS,
  MEMORIAL_SOURCE_TYPE,
} = require("./constants");
const {
  buildWaitingReplyPayload,
  buildReadyReplyPayload,
  buildMemorialWaitingPayload,
  buildMemorialReadyPayload,
} = require("./reply-builder");
const { generateReplyBodyByAI } = require("./ai-service");
const AI_READY_PREVIEW = "你的来信已收到，回响已生成。";

function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${random}`;
}

function normalizeText(input, maxLength) {
  const value = typeof input === "string" ? input.trim() : "";
  return value.slice(0, maxLength);
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
    default:
      return normalizeText(event?.label, 32) || "纪念回响";
  }
}

function buildMemorialAIDraft(profile, event, sourceLetter) {
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
    "请围绕这个纪念日场景写回信，情绪上以陪伴和安放思念为主。",
  ];

  return {
    relation,
    title: `${displayName} · ${label}`,
    body: contextBlocks.filter(Boolean).join("\n"),
    signature: normalizeText(sourceLetter?.signature, 16) || displayName,
  };
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
      sourceLetter
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
    return reply;
  }

  if (!sourceLetter) {
    return reply;
  }

  const serializedLetter = serializeLetter(sourceLetter);
  const aiBody = reply.body || (await generateReplyBodyByAI(serializedLetter));
  const readyPayload = buildReadyReplyPayload(serializedLetter, { aiBody });
  reply.status = readyPayload.status;
  reply.subject = readyPayload.subject;
  reply.preview = readyPayload.preview;
  reply.body = readyPayload.body;
  await reply.save();

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

async function createLetter(userContext, payload) {
  const input = validateLetterPayload(payload);
  const now = Date.now();
  const letterId = createId("letter");
  const replyId = createId("reply");
  const replyPayload = buildWaitingReplyPayload(input, now, {
    testMode: input.testMode,
  });

  await touchUser(userContext);
  const aiBodySeed = await generateReplyBodyByAI(input);

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

async function listReplies(userContext) {
  await touchUser(userContext);
  await settleRepliesForUser(userContext.userId);

  const replies = await Reply.findAll({
    where: { userId: userContext.userId },
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

async function getMailbox(userContext) {
  await touchUser(userContext);
  await settleRepliesForUser(userContext.userId);

  const [letters, replies] = await Promise.all([
    Letter.findAll({
      where: { userId: userContext.userId },
      order: [["createdAtMs", "DESC"]],
    }),
    Reply.findAll({
      where: { userId: userContext.userId },
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

  const subject = normalizeText(payload.subject, 64);
  if (!subject) {
    throw new AppError(400, "Reply subject is required");
  }

  reply.subject = subject;
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
};
