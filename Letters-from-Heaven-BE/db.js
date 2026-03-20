const { Sequelize, DataTypes } = require("sequelize");

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
      unique: true,
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
  },
  {
    tableName: "replies",
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
Letter.hasOne(Reply, {
  foreignKey: "letterId",
  sourceKey: "id",
  as: "reply",
});
Reply.belongsTo(Letter, {
  foreignKey: "letterId",
  targetKey: "id",
  as: "letter",
});

async function init() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
}

module.exports = {
  init,
  sequelize,
  Counter,
  User,
  Letter,
  Reply,
};
