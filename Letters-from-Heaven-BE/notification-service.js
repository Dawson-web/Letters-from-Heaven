const https = require("node:https");

const accessTokenCache = {
  mini: {
    token: "",
    expiresAtMs: 0,
  },
  official: {
    token: "",
    expiresAtMs: 0,
  },
};

function normalizeText(input, maxLength) {
  const value = typeof input === "string" ? input.trim() : "";
  return value.slice(0, maxLength);
}

function requestJson(url, method = "GET", payload = null) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = payload ? JSON.stringify(payload) : "";

    const req = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 443,
        method,
        path: `${target.pathname}${target.search}`,
        headers: payload
          ? {
            "content-type": "application/json",
            "content-length": Buffer.byteLength(body),
          }
          : undefined,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          raw += chunk;
        });

        res.on("end", () => {
          if (!raw) {
            return reject(new Error(`Empty response from ${url}`));
          }

          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (error) {
            return reject(new Error(`Invalid JSON from ${url}: ${raw}`));
          }

          if ((res.statusCode || 500) >= 400) {
            return reject(
              new Error(`HTTP ${res.statusCode} ${url}: ${raw}`)
            );
          }

          return resolve(parsed);
        });
      }
    );

    req.on("error", reject);

    if (payload) {
      req.write(body);
    }

    req.end();
  });
}

async function getAccessToken({ appId, appSecret, cacheKey }) {
  if (!appId || !appSecret) {
    return "";
  }

  const now = Date.now();
  const cached = accessTokenCache[cacheKey];
  if (cached.token && cached.expiresAtMs > now + 60 * 1000) {
    return cached.token;
  }

  const response = await requestJson(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
      appId
    )}&secret=${encodeURIComponent(appSecret)}`
  );

  if (!response || typeof response.access_token !== "string") {
    return "";
  }

  const expiresInSeconds = Number(response.expires_in || 7200);
  cached.token = response.access_token;
  cached.expiresAtMs = now + Math.max(expiresInSeconds - 120, 60) * 1000;

  return cached.token;
}

function formatReminderTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    }).format(new Date(Number(timestamp)));
  } catch (_) {
    return "";
  }
}

function buildReplySourceLabel(reply, memorialEvent) {
  if (reply?.sourceType !== "memorial") {
    return "日常回响";
  }

  switch (memorialEvent?.type) {
    case "qingming":
      return "清明回响";
    case "birthday":
      return "生日回响";
    case "anniversary":
      return "周年回响";
    case "death_anniversary":
      return "忌日回响";
    default:
      return normalizeText(memorialEvent?.label, 16) || "纪念回响";
  }
}

async function sendMiniProgramSubscribeMessage({ user, reply, memorialEvent }) {
  const appId = process.env.WECHAT_MINI_APP_ID || "";
  const appSecret = process.env.WECHAT_MINI_APP_SECRET || "";
  const templateId =
    normalizeText(user.miniProgramTemplateId, 128) ||
    normalizeText(process.env.REMINDER_MINI_TEMPLATE_ID, 128);

  if (!appId || !appSecret || !templateId) {
    return { sent: false, reason: "mini_config_missing" };
  }

  const accessToken = await getAccessToken({
    appId,
    appSecret,
    cacheKey: "mini",
  });

  if (!accessToken) {
    return { sent: false, reason: "mini_access_token_missing" };
  }

  const response = await requestJson(
    `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${encodeURIComponent(
      accessToken
    )}`,
    "POST",
    {
      touser: user.id,
      template_id: templateId,
      page:
        normalizeText(process.env.REMINDER_MINI_PAGE, 255) ||
        `/pages/reply/index?id=${reply.id}`,
      lang: normalizeText(user.notifyLanguage, 8) || "zh_CN",
      data: {
        thing1: {
          value: normalizeText(reply.subject, 20) || "有一封回响送达",
        },
        time2: {
          value: formatReminderTime(reply.availableAtMs || reply.availableAt),
        },
        thing3: {
          value: buildReplySourceLabel(reply, memorialEvent),
        },
      },
    }
  );

  if (Number(response.errcode) !== 0) {
    return {
      sent: false,
      reason: "mini_send_failed",
      errcode: response.errcode,
      errmsg: response.errmsg,
    };
  }

  return {
    sent: true,
    channel: "mini_program_subscribe",
  };
}

async function sendOfficialAccountTemplateMessage({ user, reply, memorialEvent }) {
  const appId = process.env.WECHAT_OA_APP_ID || "";
  const appSecret = process.env.WECHAT_OA_APP_SECRET || "";
  const openId = normalizeText(user.officialAccountOpenId, 128);
  const templateId =
    normalizeText(user.officialAccountTemplateId, 128) ||
    normalizeText(process.env.REMINDER_OA_TEMPLATE_ID, 128);

  if (!appId || !appSecret || !templateId || !openId) {
    return { sent: false, reason: "oa_config_missing" };
  }

  const accessToken = await getAccessToken({
    appId,
    appSecret,
    cacheKey: "official",
  });

  if (!accessToken) {
    return { sent: false, reason: "oa_access_token_missing" };
  }

  const miniProgramAppId = normalizeText(process.env.WECHAT_MINI_APP_ID, 64);
  const miniProgramPagePath =
    normalizeText(process.env.REMINDER_MINI_PAGE, 255) ||
    `/pages/reply/index?id=${reply.id}`;

  const payload = {
    touser: openId,
    template_id: templateId,
    data: {
      first: {
        value: "你有一封新的回响已经送达",
      },
      keyword1: {
        value: normalizeText(reply.subject, 32) || "回响送达提醒",
      },
      keyword2: {
        value: buildReplySourceLabel(reply, memorialEvent),
      },
      keyword3: {
        value: formatReminderTime(reply.availableAtMs || reply.availableAt),
      },
      remark: {
        value: "打开云端回信小程序，慢慢读这封信。",
      },
    },
  };

  if (miniProgramAppId) {
    payload.miniprogram = {
      appid: miniProgramAppId,
      pagepath: miniProgramPagePath,
    };
  }

  const response = await requestJson(
    `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${encodeURIComponent(
      accessToken
    )}`,
    "POST",
    payload
  );

  if (Number(response.errcode) !== 0) {
    return {
      sent: false,
      reason: "oa_send_failed",
      errcode: response.errcode,
      errmsg: response.errmsg,
    };
  }

  return {
    sent: true,
    channel: "official_account",
  };
}

async function notifyReplyReady({ user, reply, memorialEvent }) {
  if (!user || !reply || !user.reminderEnabled) {
    return {
      sent: false,
      reason: "disabled",
    };
  }

  const channel = normalizeText(user.reminderChannel, 32) || "none";

  try {
    if (channel === "mini_program_subscribe") {
      return await sendMiniProgramSubscribeMessage({ user, reply, memorialEvent });
    }

    if (channel === "official_account") {
      const result = await sendOfficialAccountTemplateMessage({
        user,
        reply,
        memorialEvent,
      });

      if (result.sent) {
        return result;
      }

      if (process.env.REMINDER_OFFICIAL_FALLBACK_MINI === "true") {
        return await sendMiniProgramSubscribeMessage({ user, reply, memorialEvent });
      }

      return result;
    }

    return {
      sent: false,
      reason: "channel_none",
    };
  } catch (error) {
    return {
      sent: false,
      reason: "exception",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

module.exports = {
  notifyReplyReady,
};
