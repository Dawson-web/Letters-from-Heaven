let cloudbaseSDK = null;

try {
  require("dotenv").config();
} catch (error) {
  // 部署环境通常由平台注入变量，本地未安装 dotenv 时直接跳过。
}

try {
  cloudbaseSDK = require("@cloudbase/node-sdk");
} catch (error) {
  cloudbaseSDK = null;
}

const DEFAULT_MODEL_GROUP = process.env.CLOUDBASE_AI_MODEL_GROUP || "hunyuan-exp";
const DEFAULT_MODEL = process.env.CLOUDBASE_AI_MODEL || "hunyuan-turbos-latest";
const DEFAULT_TIMEOUT_MS = Number(process.env.CLOUDBASE_AI_TIMEOUT_MS || 12000);
const AI_ENABLED = process.env.CLOUDBASE_AI_ENABLED !== "false";

let cloudbaseClient = null;
let authReadyPromise = null;
let hasLoggedDisabled = false;
let hasLoggedMissingSDK = false;

function normalizeText(input, maxLength) {
  const value = typeof input === "string" ? input.trim() : "";
  return value.slice(0, maxLength);
}

function normalizeInlineText(input, maxLength) {
  const value = typeof input === "string" ? input.replace(/\s+/g, " ").trim() : "";
  return value.slice(0, maxLength);
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`AI generation timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

function isConfigured() {
  return Boolean(
    process.env.CLOUDBASE_ENV_ID &&
      process.env.CLOUDBASE_SECRETID &&
      process.env.CLOUDBASE_SECRETKEY
  );
}

function shouldUseAI() {
  if (!AI_ENABLED) {
    if (!hasLoggedDisabled) {
      console.log("[ai-service] AI is disabled by CLOUDBASE_AI_ENABLED=false");
      hasLoggedDisabled = true;
    }
    return false;
  }

  if (!cloudbaseSDK) {
    if (!hasLoggedMissingSDK) {
      console.warn(
        "[ai-service] @cloudbase/node-sdk is not installed. Fallback to template reply."
      );
      hasLoggedMissingSDK = true;
    }
    return false;
  }

  if (!isConfigured()) {
    return false;
  }

  return true;
}

function getClient() {
  if (!shouldUseAI()) {
    return null;
  }

  if (!cloudbaseClient) {
    cloudbaseClient = cloudbaseSDK.init({
      env: process.env.CLOUDBASE_ENV_ID,
      secretId: process.env.CLOUDBASE_SECRETID,
      secretKey: process.env.CLOUDBASE_SECRETKEY,
    });
  }

  return cloudbaseClient;
}

async function ensureAuth(client) {
  if (!client || typeof client.auth !== "function") {
    return;
  }

  if (authReadyPromise) {
    await authReadyPromise;
    return;
  }

  const auth = client.auth();
  if (!auth || typeof auth.signInAnonymously !== "function") {
    return;
  }

  authReadyPromise = auth.signInAnonymously().catch((error) => {
    authReadyPromise = null;
    throw error;
  });

  await authReadyPromise;
}

function buildPrompt(letter) {
  const relation = normalizeText(letter?.relation, 16) || "远方";
  const title = normalizeText(letter?.title, 32);
  const body = normalizeText(letter?.body, 1000);
  const signature = normalizeText(letter?.signature, 16);
  const feedbackHint = normalizeText(letter?.feedbackHint, 400);

  return [
    "任务：请基于来信内容，写一封像真人写出来的回信。",
    "写作流程（只在心里完成，不要输出这些步骤）：",
    "1. 先识别来信的核心情绪和隐藏情绪（想念、遗憾、自责、委屈、感激、愧疚等），并判断情绪轻重。",
    "2. 再提取来信的语气线索：词汇习惯、句长节奏、称呼方式、停顿重复、克制或外放程度。",
    "3. 根据这些线索推断“回信人”的性格与说话方式（温厚、直率、寡言、幽默、细腻等），再以这个人格回信。",
    "硬性要求：",
    "1. 必须用回信人第一人称写信，不得出现 AI、模型、系统、助手、生成 等字眼。",
    "2. 不要写分析过程，不要解释你在做什么，不要出现“首先/其次/最后”“我理解你的感受”等套话。",
    "3. 语言必须生活化、口语化、自然，有人味；允许短句、停顿和留白，但不要矫揉造作。",
    "4. 回信要紧扣来信细节，至少回应一个具体信息（称呼、事件、场景、原话或情绪触发点）。",
    "5. 情绪基调以接住对方为主：真诚、克制、有分寸；不训诫、不施压、不制造内疚。",
    "6. 不要声称超自然能力，不要提供医学、法律、投资等专业建议。",
    "7. 只输出回信正文，不要标题，不要署名解释，不要 markdown，不要列表。",
    "8. 字数控制在 180-600 个中文字符。",
    "",
    `关系：${relation}`,
    title ? `来信标题：${title}` : "来信标题：（无）",
    `来信正文：${body || "（无）"}`,
    signature ? `署名：${signature}` : "署名：（无）",
    feedbackHint ? `用户反馈偏好：${feedbackHint}` : "",
  ].join("\n");
}

function buildFeaturedLetterReviewPrompt(letter) {
  const relation = normalizeText(letter?.relation, 16) || "远方";
  const title = normalizeText(letter?.title, 32);
  const body = normalizeText(letter?.body, 1000);
  const excerpt = normalizeInlineText(letter?.excerpt, 160);

  return [
    "任务：审核一封匿名书信，判断它是否适合进入首页“今日共鸣”的公开展示候选。",
    "拒绝标准：",
    "1. 内容太少、太空、太像测试文本，或主要是寒暄、流水账、事务通知。",
    "2. 含有不适合公开首页展示的内容，例如露骨色情、仇恨辱骂、广告引流、联系方式、自伤引导、过于血腥暴力或违法信息。",
    "3. 即使匿名后，仍然明显带有隐私、账号、联系方式或强识别性细节。",
    "通过标准：",
    "1. 有真实情绪或具体生活感，能给读者陪伴感。",
    "2. 适合首页公开展示，语气克制，不会让人明显不适。",
    "3. 如果通过，请给出一段适合首页展示的节选，长度控制在 45-110 个中文字符。",
    "输出要求：只输出一行 JSON，不要解释，不要 markdown。",
    'JSON 格式：{"approved":true,"reason":"...","excerpt":"..."}',
    '或：{"approved":false,"reason":"...","excerpt":""}',
    "",
    `关系：${relation}`,
    title ? `来信标题：${title}` : "来信标题：（无）",
    excerpt ? `当前节选：${excerpt}` : "当前节选：（无）",
    `来信正文：${body || "（无）"}`,
  ].join("\n");
}

function normalizeAIResponse(text) {
  const content = String(text || "")
    .replace(/\r\n/g, "\n")
    .trim();

  if (!content) {
    return "";
  }

  return content.slice(0, 1800);
}

async function requestTextFromAI({ systemContent, userContent }) {
  const client = getClient();
  if (!client) {
    return "";
  }

  try {
    await ensureAuth(client);
    const ai = client.ai();
    const model = ai.createModel(DEFAULT_MODEL_GROUP);
    const request = {
      model: DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: systemContent,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    };

    const response = await withTimeout(model.streamText(request), DEFAULT_TIMEOUT_MS);
    let output = "";

    if (response && response.textStream && response.textStream[Symbol.asyncIterator]) {
      for await (const chunk of response.textStream) {
        if (typeof chunk === "string") {
          output += chunk;
        }
      }
    } else if (response && typeof response.text === "string") {
      output = response.text;
    }

    return normalizeAIResponse(output);
  } catch (error) {
    console.error("[ai-service] requestTextFromAI failed:", error.message || error);
    return "";
  }
}

async function generateReplyBodyByAI(letter) {
  return requestTextFromAI({
    systemContent:
      "你是一位中文私人书信代笔者。先读懂来信真实情感，再按来信语气推断回信人的性格，用回信人第一人称写回信。文字必须像真人写信，禁止AI腔、模板腔和分析旁白，只输出正文。",
    userContent: buildPrompt(letter),
  });
}

function extractJSONObject(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start < 0 || end <= start) {
    return "";
  }

  return raw.slice(start, end + 1);
}

async function reviewFeaturedLetterByAI(letter) {
  const raw = await requestTextFromAI({
    systemContent:
      "你是一名中文内容审核与编辑助手。你只负责判断这封匿名书信是否适合进入首页公开展示候选，并在适合时给出更稳妥的匿名节选。只能输出 JSON。",
    userContent: buildFeaturedLetterReviewPrompt(letter),
  });

  if (!raw) {
    return null;
  }

  const jsonText = extractJSONObject(raw);
  if (!jsonText) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonText);
    return {
      approved: parsed?.approved === true,
      reason: normalizeText(parsed?.reason, 120),
      excerpt: normalizeInlineText(parsed?.excerpt, 255),
    };
  } catch (error) {
    console.error("[ai-service] reviewFeaturedLetterByAI parse failed:", error.message || error);
    return null;
  }
}

module.exports = {
  generateReplyBodyByAI,
  reviewFeaturedLetterByAI,
};
