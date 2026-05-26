/**
 * Local SQLite database service (expo-sqlite v14 async API — Expo SDK 51)
 * Caches user profile, family alerts, SOS history and family links
 * so the app stays usable when the device is offline.
 */
import * as SQLite from "expo-sqlite";

let db = null;

export const initDB = async () => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("safeguard.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS kv_store (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_alerts (
      id   INTEGER PRIMARY KEY,
      data TEXT    NOT NULL,
      ts   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sos_history (
      id   INTEGER PRIMARY KEY,
      data TEXT    NOT NULL,
      ts   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS family_links (
      id   INTEGER PRIMARY KEY,
      data TEXT    NOT NULL
    );
  `);
  return db;
};

const getDB = async () => {
  if (!db) await initDB();
  return db;
};

// ─── Key-Value helpers ────────────────────────────────────────────────────────

const kvSet = async (key, value) => {
  const database = await getDB();
  await database.runAsync(
    "INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)",
    [key, JSON.stringify(value)]
  );
};

const kvGet = async (key) => {
  const database = await getDB();
  const row = await database.getFirstAsync(
    "SELECT value FROM kv_store WHERE key = ?",
    [key]
  );
  return row ? JSON.parse(row.value) : null;
};

// ─── User Cache ───────────────────────────────────────────────────────────────

export const saveUser  = (user) => kvSet("current_user", user);
export const getUser   = ()     => kvGet("current_user");
export const clearUser = async () => {
  const database = await getDB();
  await database.runAsync("DELETE FROM kv_store WHERE key = ?", ["current_user"]);
};

// ─── Family Alerts Cache ──────────────────────────────────────────────────────

export const saveFamilyAlerts = async (alerts) => {
  const database = await getDB();
  await database.runAsync("DELETE FROM family_alerts");
  for (const a of alerts) {
    await database.runAsync(
      "INSERT OR REPLACE INTO family_alerts (id, data, ts) VALUES (?, ?, ?)",
      [a.id, JSON.stringify(a), new Date(a.created_at).getTime() || 0]
    );
  }
};

export const getFamilyAlerts = async () => {
  const database = await getDB();
  const rows = await database.getAllAsync(
    "SELECT data FROM family_alerts ORDER BY ts DESC"
  );
  return rows.map((r) => JSON.parse(r.data));
};

// ─── SOS History Cache ────────────────────────────────────────────────────────

export const saveSosHistory = async (alerts) => {
  const database = await getDB();
  await database.runAsync("DELETE FROM sos_history");
  for (const a of alerts) {
    await database.runAsync(
      "INSERT OR REPLACE INTO sos_history (id, data, ts) VALUES (?, ?, ?)",
      [a.id, JSON.stringify(a), new Date(a.created_at).getTime() || 0]
    );
  }
};

export const getSosHistory = async () => {
  const database = await getDB();
  const rows = await database.getAllAsync(
    "SELECT data FROM sos_history ORDER BY ts DESC"
  );
  return rows.map((r) => JSON.parse(r.data));
};

// ─── Family Links Cache ───────────────────────────────────────────────────────

export const saveFamilyLinks = async (links) => {
  const database = await getDB();
  await database.runAsync("DELETE FROM family_links");
  for (const l of links) {
    await database.runAsync(
      "INSERT OR REPLACE INTO family_links (id, data) VALUES (?, ?)",
      [l.id, JSON.stringify(l)]
    );
  }
};

export const getFamilyLinks = async () => {
  const database = await getDB();
  const rows = await database.getAllAsync("SELECT data FROM family_links");
  return rows.map((r) => JSON.parse(r.data));
};

// ─── Clear all (on logout) ────────────────────────────────────────────────────

export const clearAllData = async () => {
  const database = await getDB();
  await database.runAsync("DELETE FROM kv_store");
  await database.runAsync("DELETE FROM family_alerts");
  await database.runAsync("DELETE FROM sos_history");
  await database.runAsync("DELETE FROM family_links");
};
