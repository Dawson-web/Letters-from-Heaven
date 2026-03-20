const { Letter, Reply, User, sequelize } = require("./db");
const { AppError } = require("./errors");
const { RELATION_OPTIONS, REPLY_STATUS } = require("./constants");
const {
  buildWaitingReplyPayload,
  buildReadyReplyPayload,
} = require("./reply-builder");

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

  return {
    id: reply.id,
    userId: reply.userId,
    letterId: reply.letterId,
    status: reply.status,
    createdAt: Number(reply.createdAtMs),
    availableAt: Number(reply.availableAtMs),
    subject: reply.subject,
    preview: reply.preview,
    body: reply.body,
  };
}

function validateLetterPayload(payload = {}) {
  const title = normalizeText(payload.title, 32);
  const body = normalizeText(payload.body, 800);
  const relation = normalizeText(payload.relation, 16);
  const signature = normalizeText(payload.signature, 16);

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

  const sourceLetter = letter || (await Letter.findByPk(reply.letterId));
  if (!sourceLetter) {
    return reply;
  }

  const readyPayload = buildReadyReplyPayload(serializeLetter(sourceLetter));
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
  const replyPayload = buildWaitingReplyPayload(input, now);

  await touchUser(userContext);

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
        status: replyPayload.status,
        createdAtMs: replyPayload.createdAtMs,
        availableAtMs: replyPayload.availableAtMs,
        subject: replyPayload.subject,
        preview: replyPayload.preview,
        body: replyPayload.body,
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
      id: reply.letterId,
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

module.exports = {
  createLetter,
  listLetters,
  listReplies,
  getReplyDetail,
  getMailbox,
  clearMailbox,
  touchUser,
};
