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
      for (const indexName of uniqueIndexes) {
        await dropForeignKeyIfExists(sequelize, "replies", indexName);
        await sequelize.query(`ALTER TABLE replies DROP INDEX \`${indexName}\``);
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

async function dropForeignKeyIfExists(sequelize, table, indexName) {
  const [rows] = await sequelize.query(
    `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
     AND NON_UNIQUE = 0`,
    { replacements: [table, indexName] }
  );

  for (const row of rows) {
    try {
      await sequelize.query(`ALTER TABLE ${table} DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
    } catch (error) {
      // Ignore if constraint doesn't exist
      if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') {
        throw error;
      }
    }
  }
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
