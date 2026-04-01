const { Sequelize, DataTypes } = require("sequelize");
const { applyMigrations } = require("./migrations");

const {
  MYSQL_USERNAME,
  MYSQL_PASSWORD,
  MYSQL_ADDRESS = "",
} = process.env;

if (!MYSQL_USERNAME || !MYSQL_PASSWORD || !MYSQL_ADDRESS) {
  throw new Error(
    "Missing required MySQL env vars: MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS"
  );
}

const [host, rawPort] = MYSQL_ADDRESS.split(":");
const port = rawPort ? Number(rawPort) : 3306;

const sequelize = new Sequelize("nodejs_demo", MYSQL_USERNAME, MYSQL_PASSWORD, {
  host,
  port,
  dialect: "mysql",
  logging: false,
});

const Counter = sequelize.define(
  "Counter",
  {
    count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "counters",
    timestamps: false,
  }
);

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.STRING(128),
      allowNull: false,
      primaryKey: true,
    },
    source: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "unknown",
    },
    lastSeenAtMs: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    deliveryPace: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "balanced",
    },
    quietStartMinute: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    quietEndMinute: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reminderEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reminderChannel: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "none",
    },
    officialAccountOpenId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: "",
    },
    miniProgramTemplateId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: "",
    },
    officialAccountTemplateId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: "",
    },
    notifyLanguage: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: "zh_CN",
    },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

const Letter = sequelize.define(
  "Letter",
  {
    id: {
      type: DataTypes.STRING(48),
      allowNull: false,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "",
    },
    body: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    relation: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    signature: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "",
    },
    publicConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    publicExcerpt: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "",
    },
    replyId: {
      type: DataTypes.STRING(48),
      allowNull: false,
      unique: true,
    },
    createdAtMs: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "letters",
    timestamps: false,
  }
);

const Reply = sequelize.define(
  "Reply",
  {
    id: {
      type: DataTypes.STRING(48),
      allowNull: false,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    letterId: {
      type: DataTypes.STRING(48),
      allowNull: false,
    },
    sourceType: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "letter",
    },
    memorialProfileId: {
      type: DataTypes.STRING(48),
      allowNull: true,
    },
    memorialEventId: {
      type: DataTypes.STRING(48),
      allowNull: true,
    },
    sourceLetterId: {
      type: DataTypes.STRING(48),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    createdAtMs: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    availableAtMs: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    preview: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "",
    },
    body: {
      type: DataTypes.TEXT("long"),
      allowNull: false,
    },
    readAtMs: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    favorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    feedbackScore: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    feedbackReason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    feedbackAtMs: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    notifiedAtMs: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    tableName: "replies",
    timestamps: false,
  }
);

const MemorialProfile = sequelize.define(
  "MemorialProfile",
  {
    id: {
      type: DataTypes.STRING(48),
      allowNull: false,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    relation: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "",
    },
    keywords: {
      type: DataTypes.STRING(128),
      allowNull: false,
      defaultValue: "",
    },
    note: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "Asia/Shanghai",
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAtMs: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    updatedAtMs: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
  },
  {
    tableName: "memorial_profiles",
    timestamps: false,
  }
);

const MemorialEvent = sequelize.define(
  "MemorialEvent",
  {
    id: {
      type: DataTypes.STRING(48),
      allowNull: false,
      primaryKey: true,
    },
    profileId: {
      type: DataTypes.STRING(48),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(16),
      allowNull: false,
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    day: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    label: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "",
    },
    windowStartDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: -1,
    },
    windowEndDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    deliverAtHour: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 9,
    },
    deliverAtMinute: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    nextTriggerAtMs: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    lastTriggeredYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    calendarType: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "solar",
    },
  },
  {
    tableName: "memorial_events",
    timestamps: false,
  }
);

User.hasMany(Letter, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "letters",
});
User.hasMany(Reply, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "replies",
});
User.hasMany(MemorialProfile, {
  foreignKey: "userId",
  sourceKey: "id",
  as: "memorialProfiles",
});
Letter.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});
Reply.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});
MemorialProfile.belongsTo(User, {
  foreignKey: "userId",
  targetKey: "id",
  as: "user",
});
MemorialProfile.hasMany(MemorialEvent, {
  foreignKey: "profileId",
  sourceKey: "id",
  as: "events",
});
MemorialEvent.belongsTo(MemorialProfile, {
  foreignKey: "profileId",
  targetKey: "id",
  as: "profile",
});
Letter.hasMany(Reply, {
  foreignKey: "letterId",
  sourceKey: "id",
  as: "replies",
});
Reply.belongsTo(Letter, {
  foreignKey: "letterId",
  targetKey: "id",
  as: "letter",
});
Reply.belongsTo(MemorialProfile, {
  foreignKey: "memorialProfileId",
  targetKey: "id",
  as: "memorialProfile",
});
Reply.belongsTo(MemorialEvent, {
  foreignKey: "memorialEventId",
  targetKey: "id",
  as: "memorialEvent",
});

async function init() {
  await sequelize.authenticate();
  await applyMigrations(sequelize);
  await sequelize.sync();
}

module.exports = {
  init,
  sequelize,
  Counter,
  User,
  Letter,
  Reply,
  MemorialProfile,
  MemorialEvent,
};
