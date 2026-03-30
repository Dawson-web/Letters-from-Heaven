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
  deleteReply,
  getMailbox,
  getReplyDetail,
  listLetters,
  listReplies,
  touchUser,
  updateReply,
} = require("./mailbox-service");
const {
  listMemorialProfiles,
  createMemorialProfile,
  updateMemorialProfile,
  deleteMemorialProfile,
  listMemorialEvents,
  createMemorialEvent,
  updateMemorialEvent,
  deleteMemorialEvent,
  createMemorialTestReply,
  triggerMemorialReplies,
} = require("./memorial-service");

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

function requireJobToken(req, res, next) {
  const expected = process.env.JOB_TOKEN;
  if (!expected) {
    return next();
  }

  const provided = req.headers["x-job-token"];
  if (provided !== expected) {
    return next(new AppError(403, "Invalid job token"));
  }

  return next();
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

app.patch("/api/replies/:id", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await updateReply(req.userContext, req.params.id, req.body));
}));

app.delete("/api/replies/:id", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await deleteReply(req.userContext, req.params.id));
}));

// 纪念档案
app.get("/api/memorial-profiles", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await listMemorialProfiles(req.userContext));
}));

app.post("/api/memorial-profiles", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await createMemorialProfile(req.userContext, req.body));
}));

app.patch("/api/memorial-profiles/:id", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await updateMemorialProfile(req.userContext, req.params.id, req.body));
}));

app.delete("/api/memorial-profiles/:id", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await deleteMemorialProfile(req.userContext, req.params.id));
}));

app.get(
  "/api/memorial-profiles/:id/events",
  requireUser,
  asyncHandler(async (req, res) => {
    sendSuccess(res, await listMemorialEvents(req.userContext, req.params.id));
  })
);

app.post(
  "/api/memorial-profiles/:id/events",
  requireUser,
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await createMemorialEvent(req.userContext, req.params.id, req.body)
    );
  })
);

app.post(
  "/api/memorial-profiles/:id/test-delivery",
  requireUser,
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await createMemorialTestReply(req.userContext, req.params.id, req.body)
    );
  })
);

app.patch("/api/memorial-events/:id", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await updateMemorialEvent(req.userContext, req.params.id, req.body));
}));

app.delete("/api/memorial-events/:id", requireUser, asyncHandler(async (req, res) => {
  sendSuccess(res, await deleteMemorialEvent(req.userContext, req.params.id));
}));

// 定时任务触发
app.post("/api/jobs/memorial/trigger", requireJobToken, asyncHandler(async (req, res) => {
  sendSuccess(res, await triggerMemorialReplies());
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
