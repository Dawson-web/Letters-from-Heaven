const { DEMO_REPLY_DELAY_MS, REPLY_STATUS } = require("./constants");

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

function memorialLabel(event) {
  switch (event?.type) {
    case "qingming":
      return "清明回响";
    case "birthday":
      return "生日回响";
    case "anniversary":
      return "周年回响";
    default:
      return event?.label || "纪念回响";
  }
}

function buildWaitingReplyPayload(letterDraft, now) {
  return {
    status: REPLY_STATUS.WAITING,
    createdAtMs: now,
    availableAtMs: now + DEMO_REPLY_DELAY_MS,
    subject: `${letterDraft.relation || "远方"}的回响`,
    preview: "回响正在酝酿，会在一段时间后送达。",
    body: "",
  };
}

function buildReadyReplyPayload(letter) {
  const greeting = greetingFor(letter.relation);
  const body = [
    `${greeting}：`,
    `我看见你写下的“${excerpt(letter.body)}”。那些没有说完的话、那些你反复在心里重播的片段，都已经被认真接住了。`,
    comfortFor(letter.relation),
    "别急着把悲伤变成答案。先把今天过完，记得吃饭，记得休息，记得在想我的时候对自己温柔一点。",
    letter.signature
      ? `当你下次还想说话，就带着“${letter.signature}”这个名字再来写信吧，我会继续在回响里陪你。`
      : "当你下次还想说话，就再来写信吧，回响会一直在。",
  ].join("\n\n");

  return {
    status: REPLY_STATUS.READY,
    subject: `${letter.relation || "远方"}的回响`,
    preview: "这份想念已经被认真接住了。",
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

function buildMemorialReadyPayload(profile, letter, event) {
  const greeting = greetingFor(profile?.relation);
  const label = memorialLabel(event);
  const body = [
    `${greeting}：`,
    `在${label}这天，我看见你想起了“${memorialExcerpt(profile, letter)}”。`,
    comfortFor(profile?.relation),
    "把思念放在心里，也允许它在某个日子里轻轻浮现。",
    profile?.displayName
      ? `你一直记得“${profile.displayName}”。`
      : "你一直记得那些重要的名字。",
  ].join("\n\n");

  return {
    status: REPLY_STATUS.READY,
    subject: `${profile?.displayName || profile?.relation || "远方"} · ${label}`,
    preview: "这份纪念已被认真接住。",
    body,
  };
}

module.exports = {
  buildWaitingReplyPayload,
  buildReadyReplyPayload,
  buildMemorialWaitingPayload,
  buildMemorialReadyPayload,
};
