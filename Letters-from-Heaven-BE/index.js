const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { init: initDB, Counter } = require("./db");
const { AppError, asyncHandler, sendSuccess, sendError } = require("./errors");
const { resolveUserContext } = require("./user-context");
const {
  clearMailbox,
  createLetter,
  getMailbox,
  getReplyDetail,
  listLetters,
  listReplies,
  touchUser,
} = require("./mailbox-service");

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

function requireUser(req, res, next) {
  const userContext = resolveUserContext(req);

  if (!userContext) {
    return next(
      new AppError(
        401,
        "Missing user identity. Provide x-wx-openid in cloud or x-user-id locally."
      )
    );
  }

  req.userContext = userContext;
  next();
}

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/health", (req, res) => {
  sendSuccess(res, {
    status: "ok",
  });
});

// 更新计数
app.post("/api/count", asyncHandler(async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  sendSuccess(res, await Counter.count());
}));

// 获取计数
app.get("/api/count", asyncHandler(async (req, res) => {
  const result = await Counter.count();
  sendSuccess(res, result);
}));

app.get("/api/me", requireUser, asyncHandler(async (req, res) => {
  const user = await touchUser(req.userContext);
  sendSuccess(res, {
    userId: user.id,
    source: user.source,
    lastSeenAt: Number(user.lastSeenAtMs),
  });
}));

app.get("/api/mailbox", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await getMailbox(req.userContext));
}));

app.delete("/api/mailbox", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await clearMailbox(req.userContext));
}));

app.get("/api/letters", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await listLetters(req.userContext));
}));

app.post("/api/letters", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await createLetter(req.userContext, req.body), "letter created");
}));

app.get("/api/replies", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await listReplies(req.userContext));
}));

app.get("/api/replies/:id", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await getReplyDetail(req.userContext, req.params.id));
}));

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, {
    openid: req.userContext.userId,
    source: req.userContext.source,
  });
}));

const port = process.env.PORT || 80;

async function bootstrap() {
  try {
    await initDB();
    app.listen(port, () => {
      console.log("启动成功", port);
    });
  } catch (error) {
    console.error("启动失败", error);
    process.exit(1);
  }
}

app.use((error, req, res, next) => {
  sendError(res, error);
});

bootstrap();
