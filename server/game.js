// Trivia engine: 15 questions per game, questions & answers shuffled, 0.5s reveal pause
// Final results include EVERY participant even if they left mid‑game
// NEW: per‑player answer history + results API
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_FILE = path.join(__dirname, "data", "questions.json");

const games = new Map(); // roomId -> state
const MIN_PLAYERS = 2;
const GAME_QUESTION_COUNT = 15;

// Fallback questions (in case JSON is missing)
const DEFAULT_QUESTIONS = [
  { text: "What does 'Vibe Coding' emphasize most?", choices: ["Pure algorithmic speed", "Creativity & collaboration", "Only strict style guides", "Hardware tuning"], answerIndex: 1 },
  { text: "Which practice best supports flow in a team?", choices: ["Loud open-office alerts", "Short feedback loops & pairing", "Async PR reviews only", "Weekend-only sprints"], answerIndex: 1 },
  { text: "Ethical use of AI tools means…", choices: ["Never disclosing AI assistance", "Attribution, evaluation, and accountability", "Copying any code from the web", "Letting AI commit directly to main"], answerIndex: 1 },
  { text: "A good 'vibe' in codebases feels like…", choices: ["Hostile & gatekept", "Welcoming, documented, and playful", "Ambiguous ownership", "Random configs"], answerIndex: 1 },
  { text: "Which ritual strengthens creative collaboration?", choices: ["Solo merges only", "Blameless retros", "No standups ever", "1-year release cycles"], answerIndex: 1 }
];

function loadQuestions(){
  try {
    const text = fs.readFileSync(QUESTIONS_FILE, "utf-8");
    const arr = JSON.parse(text);
    if (Array.isArray(arr) && arr.length) return arr;
  } catch {}
  return DEFAULT_QUESTIONS;
}
let QUESTIONS_CACHE = null;
function getQuestions(){
  if (!QUESTIONS_CACHE) QUESTIONS_CACHE = loadQuestions();
  return QUESTIONS_CACHE;
}

function shuffleArray(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function shuffleIndices(n){
  return shuffleArray(Array.from({ length: n }, (_, i) => i));
}

function _ensureGame(roomId){
  let g = games.get(roomId);
  if (!g){
    g = {
      roomId,
      started:false,
      finished:false,
      idx:-1,
      questions: getQuestions().slice(),
      scores:new Map(), // id -> { id, name, score, active }
      answered:new Set(),
      ready:new Map(),
      orders:{},      // idx -> [displayIdx -> originalIdx]
      responses:new Map(), // id -> Array(displayIndex|null) per question
      locked:false    // prevents answering during 0.5s reveal pause
    };
    games.set(roomId, g);
  }
  return g;
}

function _everyoneReady(g){
  const players = Array.from(g.scores.values()).filter(p => p.active);
  if (players.length < MIN_PLAYERS) return false;
  for (const p of players){ if (!g.ready.get(p.id)) return false; }
  return true;
}

function _visibleScores(g){
  const raw = Array.from(g.scores.values());
  if (g.finished) return raw; // show everyone who participated
  return raw.filter(s => s.active); // in-game: only current players
}

function _sanitize(g){
  if (!g) return null;
  const q = g.questions[g.idx] || null;
  const order = g.orders[g.idx];
  const choices = q ? (order ? order.map(i => q.choices[i]) : q.choices) : null;
  const visible = _visibleScores(g);
  const scores = visible.map(s => ({ id:s.id, name:s.name, score:s.score, active: !!s.active }));
  const ready = scores.map(s => ({ id:s.id, name:s.name, ready: !!g.ready.get(s.id) }));
  const canStart = !g.started && !g.finished && _everyoneReady(g);
  return {
    roomId: g.roomId,
    started: g.started,
    finished: g.finished,
    idx: g.idx,
    total: g.questions.length,
    question: q ? { text:q.text, choices } : null,
    scores,
    ready,
    minPlayers: MIN_PLAYERS,
    canStart
  };
}

function _ensurePlayerArrays(g, id){
  if (!g.responses.has(id)){
    const arr = Array(g.questions.length).fill(null);
    g.responses.set(id, arr);
  }
}

function addPlayer(roomId, {id, name}){
  const g = _ensureGame(roomId);
  const existing = g.scores.get(id);
  if (existing){
    existing.active = true;
    if (name) existing.name = name;
  } else {
    g.scores.set(id, { id, name: name || `Player-${id.slice(0,10)}`, score:0, active:true });
  }
  _ensurePlayerArrays(g, id);
  if (!g.ready.has(id)) g.ready.set(id, false);
  return _sanitize(g);
}

function removePlayer(roomId, playerId){
  const g = games.get(roomId);
  if (!g) return null;
  const s = g.scores.get(playerId);
  if (s){ s.active = false; }
  g.ready.delete(playerId);
  return _sanitize(g);
}

function clearGame(roomId){ games.delete(roomId); }

function setReady(roomId, {id, name}, ready){
  const g = _ensureGame(roomId);
  const s = g.scores.get(id) || { id, name: name || `Player-${id.slice(0,10)}`, score:0, active:true };
  s.name = name || s.name;
  s.active = true;
  g.scores.set(id, s);
  _ensurePlayerArrays(g, id);
  g.ready.set(id, !!ready);
  return _sanitize(g);
}

// NEW: unready everyone in lobby (if not started)
function unreadyAll(roomId){
  const g = games.get(roomId);
  if (!g || g.started) return _sanitize(g);
  for (const id of g.ready.keys()) g.ready.set(id, false);
  return _sanitize(g);
}

function start(roomId, players){
  const g = _ensureGame(roomId);
  // Shuffle the full pool and take only 15 for this game
  const pool = shuffleArray(getQuestions().slice());
  g.questions = pool.slice(0, Math.min(GAME_QUESTION_COUNT, pool.length));
  g.started = true;
  g.finished = false;
  g.idx = 0;
  g.answered.clear();
  g.locked = false;
  g.orders = { 0: shuffleIndices(g.questions[0].choices.length) };
  g.responses = new Map();
  for (const p of players){
    const s = g.scores.get(p.id) || { id:p.id, name:p.name, score:0, active:true };
    s.name = p.name || s.name;
    s.active = true;
    g.scores.set(p.id, s);
    _ensurePlayerArrays(g, p.id);
  }
  return _sanitize(g);
}

function next(roomId){
  const g = games.get(roomId);
  if (!g || !g.started) return _sanitize(g);
  g.idx += 1;
  g.answered.clear();
  g.locked = false;
  if (g.idx >= g.questions.length){
    g.finished = true;
    g.idx = g.questions.length - 1;
    return _sanitize(g);
  }
  g.orders[g.idx] = shuffleIndices(g.questions[g.idx].choices.length);
  return _sanitize(g);
}

function lock(roomId, val=true){ const g = games.get(roomId); if (g) g.locked = !!val; }

function answer(roomId, playerId, choiceIndex, timeLeftSeconds = 0){
  const g = games.get(roomId);
  if (!g || !g.started || g.finished) return { state:_sanitize(g), correct:false, allAnswered:false };
  if (g.locked) return { state:_sanitize(g), correct:false, allAnswered:false };
  if (g.answered.has(playerId)) return { state:_sanitize(g), correct:false, allAnswered:false };
  const q = g.questions[g.idx];
  if (!q) return { state:_sanitize(g), correct:false, allAnswered:false };
  const order = g.orders[g.idx];
  const originalIndex = Array.isArray(order) ? order[Number(choiceIndex)] : Number(choiceIndex);
  const correct = Number(originalIndex) === q.answerIndex; // JSON keeps the real correct index (often 1/B)
  g.answered.add(playerId);
  _ensurePlayerArrays(g, playerId);
  g.responses.get(playerId)[g.idx] = Number(choiceIndex); // store DISPLAY index picked
  if (correct){
    const s = g.scores.get(playerId);
    if (s){
      const bonus = Math.max(0, Number(timeLeftSeconds)|0) * 2; // faster → more points
      s.score += 10 + bonus;
    }
  }
  const activeCount = Array.from(g.scores.values()).filter(s => s.active).length;
  const allAnswered = g.answered.size >= activeCount && activeCount > 0;
  if (allAnswered) g.locked = true; // pause answers during the 0.5s reveal
  return { state:_sanitize(g), correct, allAnswered };
}

function get(roomId){ return _sanitize(games.get(roomId)); }

// NEW: return per-player results: questions in display order + your pick
function resultsFor(roomId, playerId){
  const g = games.get(roomId);
  if (!g) return [];
  const out = [];
  for (let i = 0; i < g.questions.length; i++){
    const q = g.questions[i];
    const order = g.orders[i] || q.choices.map((_, idx) => idx);
    const choices = order.map(ix => q.choices[ix]);
    const correctDisplayIndex = order.findIndex(ix => ix === q.answerIndex);
    const yourIndex = (g.responses.get(playerId) || [])[i]; // display index or null
    out.push({
      text: q.text,
      choices,
      correctDisplayIndex,
      yourIndex: (typeof yourIndex === "number" ? yourIndex : null)
    });
  }
  return out;
}

export { games, addPlayer, removePlayer, clearGame, setReady, start, next, answer, get, lock, resultsFor, unreadyAll };
