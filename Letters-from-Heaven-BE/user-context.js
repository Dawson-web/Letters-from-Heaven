const DEV_FALLBACK_USER_ID = "demo-user";

function normalizeUserId(candidate) {
  if (typeof candidate !== "string") {
    return "";
  }

  return candidate.trim();
}

function resolveUserContext(req) {
  const wxSource = normalizeUserId(req.headers["x-wx-source"]);
  const wxOpenId = normalizeUserId(req.headers["x-wx-openid"]);

  if (wxSource && wxOpenId) {
    return {
      userId: wxOpenId,
      source: "wx-openid",
    };
  }

  const headerUserId = normalizeUserId(req.headers["x-user-id"]);
  const queryUserId = normalizeUserId(req.query && req.query.userId);
  const bodyUserId = normalizeUserId(req.body && req.body.userId);
  const explicitUserId = headerUserId || queryUserId || bodyUserId;

  if (explicitUserId) {
    return {
      userId: explicitUserId,
      source: "explicit",
    };
  }

  if (process.env.NODE_ENV !== "production") {
    return {
      userId: DEV_FALLBACK_USER_ID,
      source: "dev-fallback",
    };
  }

  return null;
}

module.exports = {
  DEV_FALLBACK_USER_ID,
  resolveUserContext,
};
