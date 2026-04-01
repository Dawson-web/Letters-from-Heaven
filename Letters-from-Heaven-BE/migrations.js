const MIGRATIONS = [
  {
    id: "20260320_memorial_profiles_events",
    async up(sequelize) {
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS memorial_profiles (
          id VARCHAR(48) PRIMARY KEY,
          userId VARCHAR(128) NOT NULL,
          relation VARCHAR(16) NOT NULL,
          displayName VARCHAR(32) NOT NULL DEFAULT '',
          keywords VARCHAR(128) NOT NULL DEFAULT '',
          note TEXT,
          timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
          active TINYINT(1) NOT NULL DEFAULT 1,
          createdAtMs BIGINT NOT NULL,
          updatedAtMs BIGINT NOT NULL
        )`
      );

      await createIndexIfMissing(sequelize, "memorial_profiles", "idx_memorial_profiles_user", [
        "userId",
      ]);

      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS memorial_events (
          id VARCHAR(48) PRIMARY KEY,
          profileId VARCHAR(48) NOT NULL,
          type VARCHAR(16) NOT NULL,
          month INT NOT NULL,
          day INT NOT NULL,
          label VARCHAR(32) NOT NULL DEFAULT '',
          windowStartDays INT NOT NULL DEFAULT -1,
          windowEndDays INT NOT NULL DEFAULT 1,
          deliverAtHour INT NOT NULL DEFAULT 9,
          enabled TINYINT(1) NOT NULL DEFAULT 1,
          nextTriggerAtMs BIGINT NOT NULL,
          lastTriggeredYear INT NOT NULL DEFAULT 0
        )`
      );

      await createIndexIfMissing(sequelize, "memorial_events", "idx_memorial_events_profile", [
        "profileId",
      ]);
      await createIndexIfMissing(sequelize, "memorial_events", "idx_memorial_events_next", [
        "nextTriggerAtMs",
      ]);

      const uniqueIndexes = await getUniqueIndexesForColumn(
        sequelize,
        "replies",
        "letterId"
      );
      if (uniqueIndexes.length > 0) {
        const fkNames = await getForeignKeysForColumn(sequelize, "replies", "letterId");
        for (const fkName of fkNames) {
          try {
            await sequelize.query(`ALTER TABLE replies DROP FOREIGN KEY \`${fkName}\``);
          } catch (_) {
            // ignore if already dropped
          }
        }
        for (const indexName of uniqueIndexes) {
          await sequelize.query(`ALTER TABLE replies DROP INDEX \`${indexName}\``);
        }
      }

      await addColumnIfMissing(
        sequelize,
        "replies",
        "sourceType",
        "VARCHAR(16) NOT NULL DEFAULT 'letter'"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "memorialProfileId",
        "VARCHAR(48) NULL"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "memorialEventId",
        "VARCHAR(48) NULL"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "sourceLetterId",
        "VARCHAR(48) NULL"
      );

      await createIndexIfMissing(sequelize, "replies", "idx_replies_source_type", [
        "sourceType",
      ]);
      await createIndexIfMissing(
        sequelize,
        "replies",
        "idx_replies_memorial_profile",
        ["memorialProfileId"]
      );
      await createIndexIfMissing(
        sequelize,
        "replies",
        "idx_replies_memorial_event",
        ["memorialEventId"]
      );
    },
  },
  {
    id: "20260330_memorial_event_minute_precision",
    async up(sequelize) {
      await addColumnIfMissing(
        sequelize,
        "memorial_events",
        "deliverAtMinute",
        "INT NOT NULL DEFAULT 0"
      );
    },
  },
  {
    id: "20260331_reply_controls_preferences_and_lunar_events",
    async up(sequelize) {
      await addColumnIfMissing(
        sequelize,
        "replies",
        "readAtMs",
        "BIGINT NULL"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "favorite",
        "TINYINT(1) NOT NULL DEFAULT 0"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "archived",
        "TINYINT(1) NOT NULL DEFAULT 0"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "feedbackScore",
        "VARCHAR(16) NULL"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "feedbackReason",
        "VARCHAR(255) NULL"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "feedbackAtMs",
        "BIGINT NULL"
      );
      await addColumnIfMissing(
        sequelize,
        "replies",
        "notifiedAtMs",
        "BIGINT NULL"
      );

      await createIndexIfMissing(sequelize, "replies", "idx_replies_archived", [
        "archived",
      ]);
      await createIndexIfMissing(sequelize, "replies", "idx_replies_favorite", [
        "favorite",
      ]);
      await createIndexIfMissing(sequelize, "replies", "idx_replies_read_at", [
        "readAtMs",
      ]);

      await addColumnIfMissing(
        sequelize,
        "users",
        "deliveryPace",
        "VARCHAR(16) NOT NULL DEFAULT 'balanced'"
      );
      await addColumnIfMissing(
        sequelize,
        "users",
        "quietStartMinute",
        "INT NULL"
      );
      await addColumnIfMissing(
        sequelize,
        "users",
        "quietEndMinute",
        "INT NULL"
      );
      await addColumnIfMissing(
        sequelize,
        "users",
        "reminderEnabled",
        "TINYINT(1) NOT NULL DEFAULT 0"
      );
      await addColumnIfMissing(
        sequelize,
        "users",
        "reminderChannel",
        "VARCHAR(32) NOT NULL DEFAULT 'none'"
      );
      await addColumnIfMissing(
        sequelize,
        "users",
        "officialAccountOpenId",
        "VARCHAR(128) NOT NULL DEFAULT ''"
      );
      await addColumnIfMissing(
        sequelize,
        "users",
        "miniProgramTemplateId",
        "VARCHAR(128) NOT NULL DEFAULT ''"
      );
      await addColumnIfMissing(
        sequelize,
        "users",
        "officialAccountTemplateId",
        "VARCHAR(128) NOT NULL DEFAULT ''"
      );
      await addColumnIfMissing(
        sequelize,
        "users",
        "notifyLanguage",
        "VARCHAR(8) NOT NULL DEFAULT 'zh_CN'"
      );

      await addColumnIfMissing(
        sequelize,
        "memorial_events",
        "calendarType",
        "VARCHAR(16) NOT NULL DEFAULT 'solar'"
      );
      await createIndexIfMissing(
        sequelize,
        "memorial_events",
        "idx_memorial_events_calendar",
        ["calendarType"]
      );
    },
  },
];

async function ensureMigrationsTable(sequelize) {
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(128) PRIMARY KEY,
      appliedAtMs BIGINT NOT NULL
    )`
  );
}

async function getAppliedMigrations(sequelize) {
  const [rows] = await sequelize.query("SELECT id FROM schema_migrations");
  return new Set(rows.map((row) => row.id));
}

async function addColumnIfMissing(sequelize, table, column, definition) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );

  if (rows[0].count === 0) {
    await sequelize.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function getUniqueIndexesForColumn(sequelize, table, column) {
  const [rows] = await sequelize.query(
    `SHOW INDEX FROM ${table} WHERE Column_name = ? AND Non_unique = 0`,
    { replacements: [column] }
  );

  return rows.map((row) => row.Key_name);
}

async function getForeignKeysForColumn(sequelize, table, column) {
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     AND REFERENCED_TABLE_NAME IS NOT NULL`,
    { replacements: [table, column] }
  );

  return rows.map((row) => row.CONSTRAINT_NAME);
}

async function indexExists(sequelize, table, indexName) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    { replacements: [table, indexName] }
  );

  return rows[0].count > 0;
}

async function createIndexIfMissing(sequelize, table, indexName, columns) {
  if (await indexExists(sequelize, table, indexName)) {
    return;
  }

  await sequelize.query(
    `CREATE INDEX ${indexName} ON ${table} (${columns.join(", ")})`
  );
}

async function applyMigrations(sequelize) {
  await ensureMigrationsTable(sequelize);
  const applied = await getAppliedMigrations(sequelize);

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) {
      continue;
    }

    await migration.up(sequelize);
    await sequelize.query(
      "INSERT INTO schema_migrations (id, appliedAtMs) VALUES (?, ?)",
      { replacements: [migration.id, Date.now()] }
    );
  }
}

module.exports = {
  applyMigrations,
};
