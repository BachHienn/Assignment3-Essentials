import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { OAuth2Client } from "google-auth-library"; // NEW

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID); // NEW

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
  users.push({ username, passwordHash, provider: "local", createdAt: new Date().toISOString() });
  await saveUsers(users);
  return { ok: true, username };
}

export async function verifyUser({ username, password }) {
  await ensureFiles();
  username = String(username || "").trim().toLowerCase();
  if (!username || !password) return { ok: false, error: "Missing username or password" };
  const users = await loadUsers();
  const u = users.find(u => u.username === username && u.provider !== "google");
  if (!u) return { ok: false, error: "Invalid username or password" };
  const match = await bcrypt.compare(password, u.passwordHash);
  if (!match) return { ok: false, error: "Invalid username or password" };
  return { ok: true, username: u.username };
}

// NEW: Google Sign-In helpers
function slugify(base){
  const s = String(base || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "user";
}
async function uniqueUsername(base){
  const users = await loadUsers();
  let name = slugify(base).slice(0, 20);
  const exists = (n) => users.some(u => u.username === n);
  if (!exists(name)) return name;
  let i = 2;
  while (exists(`${name}-${i}`)) i++;
  return `${name}-${i}`;
}

export async function verifyGoogleIdToken(idToken){
  if (!process.env.GOOGLE_CLIENT_ID) throw new Error("Missing GOOGLE_CLIENT_ID env var");
  const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
  return ticket.getPayload(); // { sub, email, name, picture, ... }
}

export async function createOrFindGoogleUser({ googleId, email, name }){
  await ensureFiles();
  const users = await loadUsers();
  let user = users.find(u => u.provider === "google" && u.googleId === googleId);
  if (!user && email){
    user = users.find(u => u.provider === "google" && u.email === String(email).toLowerCase());
  }
  if (!user){
    const username = await uniqueUsername(name || (email ? email.split("@")[0] : `g-${googleId.slice(-6)}`));
    user = { username, provider: "google", googleId, email: email ? String(email).toLowerCase() : undefined, createdAt: new Date().toISOString() };
    users.push(user);
    await saveUsers(users);
    return { ok: true, username: user.username, created: true };
  }
  return { ok: true, username: user.username, created: false };
}