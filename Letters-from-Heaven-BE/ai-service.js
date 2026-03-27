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
  const body = normalizeText(letter?.body, 800);
  const signature = normalizeText(letter?.signature, 16);

  return [
    "你是一个中文书信回响助手，目标是写一封温柔、克制、具有抚慰感的回信。",
    "必须遵守：",
    "1. 不要声称自己是真实逝者，不要承诺超自然能力。",
    "2. 不要给医学、法律、投资等专业指令。",
    "3. 不要训诫用户，不要制造内疚，不要输出恐吓内容。",
    "4. 语气真诚、短句、留白，字数 140-260 中文字。",
    "5. 输出纯正文，不要标题，不要 markdown，不要列表。",
    "",
    `关系：${relation}`,
    title ? `来信标题：${title}` : "来信标题：（无）",
    `来信正文：${body}`,
    signature ? `署名：${signature}` : "署名：（无）",
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

async function generateReplyBodyByAI(letter) {
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
          content:
            "你是一个温柔克制的中文回信助手，输出一段能承接哀思的回信正文。",
        },
        {
          role: "user",
          content: buildPrompt(letter),
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
    console.error("[ai-service] generateReplyBodyByAI failed:", error.message || error);
    return "";
  }
}

module.exports = {
  generateReplyBodyByAI,
};
