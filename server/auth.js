import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

async function ensureFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(USERS_FILE); }
  catch { await fs.writeFile(USERS_FILE, "[]", "utf-8"); }
}

async function loadUsers() {
  await ensureFiles();
  const text = await fs.readFile(USERS_FILE, "utf-8");
  return JSON.parse(text);
}

async function saveUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

export async function createUser({ username, password }) {
  await ensureFiles();
  username = String(username || "").trim().toLowerCase();
  if (!username || !password) return { ok: false, error: "Missing username or password" };
  if (username.length < 3) return { ok: false, error: "Username must be at least 3 characters" };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters" };

  const users = await loadUsers();
  if (users.find(u => u.username === username)) return { ok: false, error: "Username already exists" };

  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ username, passwordHash, createdAt: new Date().toISOString() });
  await saveUsers(users);
  return { ok: true, username };
}

export async function verifyUser({ username, password }) {
  await ensureFiles();
  username = String(username || "").trim().toLowerCase();
  if (!username || !password) return { ok: false, error: "Missing username or password" };
  const users = await loadUsers();
  const u = users.find(u => u.username === username);
  if (!u) return { ok: false, error: "Invalid username or password" };
  const match = await bcrypt.compare(password, u.passwordHash);
  if (!match) return { ok: false, error: "Invalid username or password" };
  return { ok: true, username: u.username };
}