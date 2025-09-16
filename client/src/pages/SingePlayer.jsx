import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const MODE_COLORS = { easy: "#4CAF50", medium: "#FFC107", hard: "#F44336" };

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SinglePlayer(){
  const [mode, setMode] = useState(null); // "easy" | "medium" | "hard"
  const [pool, setPool] = useState([]);
  const [game, setGame] = useState(null); // { started, finished, total, questions }
  const [idx, setIdx] = useState(0);
  const [orderMap, setOrderMap] = useState({}); // idx -> [display -> original]
  const [picked, setPicked] = useState(null);   // display index picked (for UI)
  const [correctPick, setCorrectPick] = useState(null);
  const [lock, setLock] = useState(false);      // true during 0.5s reveal
  const [secs, setSecs] = useState(0);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);   // [{ text, choices, correctDisplayIndex, yourIndex }]
  const answersRef = useRef([]);                // authoritative record of picks by question idx
  const timerRef = useRef(null);
  const preTimerRef = useRef(null);
  const [preSecs, setPreSecs] = useState(null); // 3..2..1 before first question
  const navigate = useNavigate();

  // Fetch questions once
  useEffect(() => {
    (async () => {
      try{
        const res = await fetch(`${API_URL}/questions`);
        const data = await res.json();
        if (data?.ok) setPool(data.questions || []);
      } catch {}
    })();
  }, []);

  const secsPerQuestion = useMemo(() => {
    if (mode === "easy") return 5;
    if (mode === "medium") return 4;
    if (mode === "hard") return 3;
    return 0;
  }, [mode]);

  function beginGame(chosen){
    const firstOrder = shuffle(Array.from({ length: chosen[0].choices.length }, (_, i) => i));
    setOrderMap({ 0: firstOrder });
    setGame({ questions: chosen, total: chosen.length, started: true, finished: false });
    setIdx(0);
    setPicked(null);
    setCorrectPick(null);
    setHistory([]);
    answersRef.current = [];
    setScore(0);
    setLock(false);
    setSecs(secsPerQuestion || 0); // seed timer for first question
  }

  function start(m){
    setMode(m);
    const chosen = shuffle(pool).slice(0, Math.min(15, pool.length));
    // 3-second pre-countdown before starting first question
    setPreSecs(3);
    if (preTimerRef.current) clearInterval(preTimerRef.current);
    preTimerRef.current = setInterval(() => {
      setPreSecs(s => {
        if (s <= 1){
          clearInterval(preTimerRef.current);
          setPreSecs(null);
          beginGame(chosen);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  // Per-question timer (starts/refreshes when game/idx changes)
  useEffect(() => {
    if (!game?.started || game.finished || lock) return;
    // ensure seeded
    setSecs(s => (s > 0 ? s : secsPerQuestion));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1){
          clearInterval(timerRef.current);
          setLock(true); // 0.5s reveal
          setTimeout(() => nextQuestion(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [game?.started, game?.finished, idx, lock, secsPerQuestion]);

  function current(){
    if (!game) return null;
    const q = game.questions[idx];
    if (!q) return null;
    const order = orderMap[idx] || q.choices.map((_, i) => i);
    const choices = order.map(i => q.choices[i]);
    const correctDisplayIndex = order.findIndex(i => i === q.answerIndex);
    return { q, choices, correctDisplayIndex };
  }

  function pick(i){
    if (lock || picked !== null) return;
    const cur = current();
    if (!cur) return;
    const isCorrect = i === cur.correctDisplayIndex;
    setPicked(i);
    answersRef.current[idx] = i; // record immediately so results always have your pick
    setCorrectPick(isCorrect);
    if (isCorrect){
      const bonus = Math.max(0, secs) * 2; // faster → more points
      setScore(s => s + 10 + bonus);
    }
    setLock(true);
    setTimeout(() => nextQuestion(), 500); // 0.5s reveal
  }

  function nextQuestion(){
    const cur = current();
    if (!cur) return;
    const yourPick = (typeof answersRef.current[idx] === "number") ? answersRef.current[idx] : null;

    // record history row
    setHistory(h => [...h, {
      text: cur.q.text,
      choices: cur.choices,
      correctDisplayIndex: cur.correctDisplayIndex,
      yourIndex: yourPick
    }]);

    if (idx + 1 >= game.total){
      setGame(g => ({ ...g, finished: true }));
      setLock(true);
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setPicked(null);
    setCorrectPick(null);
    setLock(false);
    setSecs(secsPerQuestion);
    // prepare shuffled order for next question
    setOrderMap(m => ({
      ...m,
      [nextIdx]: shuffle(Array.from({ length: game.questions[nextIdx].choices.length }, (_, i) => i))
    }));
  }

  function restart(){
    setMode(null);
    setGame(null);
    setIdx(0);
    setPicked(null);
    setCorrectPick(null);
    setLock(false);
    setSecs(0);
    setScore(0);
    setHistory([]);
    answersRef.current = [];
    setPreSecs(null);
    if (preTimerRef.current) clearInterval(preTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // Pre‑game: pick difficulty
  if (!game?.started && preSecs == null){
    return (
      <div className="card" style={{ maxWidth: 720 }}>
        <h3>Single Player — Vibe Coding Trivia</h3>
        <p className="muted">Pick a difficulty. Time per question: <strong>Easy 5s</strong>, <strong>Medium 4s</strong>, <strong>Hard 3s</strong>.</p>
        <div className="space" />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn" style={{ background: MODE_COLORS.easy, color: "#fff", border: "none" }} onClick={() => start("easy")} disabled={!pool.length}>Easy (5s)</button>
          <button className="btn" style={{ background: MODE_COLORS.medium, color: "#222", border: "none" }} onClick={() => start("medium")} disabled={!pool.length}>Medium (4s)</button>
          <button className="btn" style={{ background: MODE_COLORS.hard, color: "#fff", border: "none" }} onClick={() => start("hard")} disabled={!pool.length}>Hard (3s)</button>
        </div>
        {!pool.length && <p className="muted" style={{ marginTop: 8 }}>Loading questions…</p>}
      </div>
    );
  }

  // 3-second pre-start countdown UI
  if (preSecs != null){
    const accent = MODE_COLORS[mode] || "#333";
    return (
      <div className="card" style={{ maxWidth: 600, textAlign: "center", padding: 40 }}>
        <h3>Get Ready…</h3>
        <div className="space" />
        <div style={{
          fontSize: 64,
          fontWeight: 700,
          color: accent,
          lineHeight: 1
        }}>{preSecs}</div>
        <div className="muted" style={{ marginTop: 8 }}>Starting in {preSecs}s</div>
      </div>
    );
  }

  // Post‑game: results
  if (game?.finished){
    return (
      <div className="card" style={{ maxWidth: 820 }}>
        <h3>🎉 Finished! Your Score: {score}</h3>
        <div className="space" />
        <h5>Your Answers</h5>
        <div style={{ display: "grid", gap: 12 }}>
          {history.map((item, qi) => (
            <div key={qi} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Q{qi + 1}. {item.text}</div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {item.choices.map((c, i) => {
                  const isYourPick = item.yourIndex === i;
                  const isCorrect = item.correctDisplayIndex === i;
                  let bg = "white", bd = "#ddd";
                  if (isYourPick && isCorrect) { bg = "#e6ffed"; bd = "#93e6a1"; }
                  else if (isYourPick && !isCorrect) { bg = "#ffe6e6"; bd = "#ffb3b3"; }
                  else if (isCorrect) { bg = "#f2fff6"; bd = "#c7f0ce"; }
                  return (
                    <div key={i} style={{ border: `1px solid ${bd}`, borderRadius: 10, padding: "10px 12px", background: bg }}>
                      {String.fromCharCode(65 + i)}. {c}
                      {isYourPick && <span className="pill" style={{ marginLeft: 8 }}>you</span>}
                      {isCorrect && <span className="pill" style={{ marginLeft: 8 }}>correct</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="space" />
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" onClick={restart}>Play Again</button>
          <button className="btn" onClick={() => navigate("/")}>Home</button>
        </div>
      </div>
    );
  }

  // In‑game
  const cur = current();
  const accent = MODE_COLORS[mode] || "#333";
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4>Question {idx + 1} / {game.total}</h4>
        <div className="pill" style={{ background: accent, color: mode === "medium" ? "#222" : "#fff" }}>⏱ {secs}s</div>
      </div>
      <p style={{ fontSize: 18, marginTop: 6 }}>{cur?.q.text}</p>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {(cur?.choices || []).map((c, i) => {
          const isChosen = picked === i;
          let bg = "white";
          if (isChosen && correctPick === true) bg = "#e6ffed"; // green
          if (isChosen && correctPick === false) bg = "#ffe6e6"; // red
          return (
            <button key={i}
              className="btn"
              style={{ padding: "14px 16px", border: "1px solid #ddd", background: bg }}
              onClick={() => pick(i)}
              disabled={picked !== null || lock}
            >
              {String.fromCharCode(65 + i)}. {c}
            </button>
          );
        })}
      </div>
      <div className="space" />
      <div><strong>Score:</strong> {score}</div>
    </div>
  );
}