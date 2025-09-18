import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const MODE_COLORS = { easy: "#4CAF50", medium: "#FFC107", hard: "#F44336" };

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SinglePlayer() {
  const [mode, setMode] = useState(null);
  const [pool, setPool] = useState([]);
  const [game, setGame] = useState(null);
  const [idx, setIdx] = useState(0);
  const [orderMap, setOrderMap] = useState({});
  const [picked, setPicked] = useState(null);
  const [correctPick, setCorrectPick] = useState(null);
  const [lock, setLock] = useState(false);
  const [secs, setSecs] = useState(0);
  const [score, setScore] = useState(0);
  const [history, setHistory] = useState([]);
  const answersRef = useRef([]);
  const timerRef = useRef(null);
  const preTimerRef = useRef(null);
  const [preSecs, setPreSecs] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
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

  function beginGame(chosen) {
    const firstOrder = shuffle(
      Array.from({ length: chosen[0].choices.length }, (_, i) => i)
    );
    setOrderMap({ 0: firstOrder });
    setGame({
      questions: chosen,
      total: chosen.length,
      started: true,
      finished: false,
    });
    setIdx(0);
    setPicked(null);
    setCorrectPick(null);
    setHistory([]);
    answersRef.current = [];
    setScore(0);
    setLock(false);
    setSecs(secsPerQuestion || 0);
  }

  function start(m) {
    setMode(m);
    const chosen = shuffle(pool).slice(0, Math.min(15, pool.length));
    setPreSecs(3);
    if (preTimerRef.current) clearInterval(preTimerRef.current);
    preTimerRef.current = setInterval(() => {
      setPreSecs((s) => {
        if (s <= 1) {
          clearInterval(preTimerRef.current);
          setPreSecs(null);
          beginGame(chosen);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    if (!game?.started || game.finished || lock) return;
    setSecs((s) => (s > 0 ? s : secsPerQuestion));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecs((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setLock(true);
          setTimeout(() => nextQuestion(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game?.started, game?.finished, idx, lock, secsPerQuestion]);

  function current() {
    if (!game) return null;
    const q = game.questions[idx];
    if (!q) return null;
    const order = orderMap[idx] || q.choices.map((_, i) => i);
    const choices = order.map((i) => q.choices[i]);
    const correctDisplayIndex = order.findIndex((i) => i === q.answerIndex);
    return { q, choices, correctDisplayIndex };
  }

  function pick(i) {
    if (lock || picked !== null) return;
    const cur = current();
    if (!cur) return;
    const isCorrect = i === cur.correctDisplayIndex;
    setPicked(i);
    answersRef.current[idx] = i;
    setCorrectPick(isCorrect);
    if (isCorrect) {
      const bonus = Math.max(0, secs) * 2;
      setScore((s) => s + 10 + bonus);
    }
    setLock(true);
    setTimeout(() => nextQuestion(), 500);
  }

  function nextQuestion() {
    const cur = current();
    if (!cur) return;
    const yourPick =
      typeof answersRef.current[idx] === "number"
        ? answersRef.current[idx]
        : null;

    setHistory((h) => [
      ...h,
      {
        text: cur.q.text,
        choices: cur.choices,
        correctDisplayIndex: cur.correctDisplayIndex,
        yourIndex: yourPick,
      },
    ]);

    if (idx + 1 >= game.total) {
      setGame((g) => ({ ...g, finished: true }));
      setLock(true);
      return;
    }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setPicked(null);
    setCorrectPick(null);
    setLock(false);
    setSecs(secsPerQuestion);
    setOrderMap((m) => ({
      ...m,
      [nextIdx]: shuffle(
        Array.from(
          { length: game.questions[nextIdx].choices.length },
          (_, i) => i
        )
      ),
    }));
  }

  function restart() {
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

  // Layout: center big card
  return (
    <div
      style={{
        minHeight: "62vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      {/* ---------- PRE-GAME ---------- */}
      {!game?.started && preSecs == null && (
        <div
          className="card"
          style={{ maxWidth: 900, margin: "40px auto", padding: "40px 32px" }}
        >
          <h2>🎯 Single Player — Vibe Coding Trivia</h2>
          <p className="muted">
            Pick a difficulty. Time per question:{" "}
            <strong>Easy 5s</strong>, <strong>Medium 4s</strong>,{" "}
            <strong>Hard 3s</strong>.
          </p>
          <div className="space" />
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            <button
              className="btn lg"
              style={{
                background: MODE_COLORS.easy,
                color: "#fff",
                minWidth: 140,
              }}
              onClick={() => start("easy")}
              disabled={!pool.length}
            >
              Easy (5s)
            </button>
            <button
              className="btn lg"
              style={{
                background: MODE_COLORS.medium,
                color: "#000",
                minWidth: 140,
              }}
              onClick={() => start("medium")}
              disabled={!pool.length}
            >
              Medium (4s)
            </button>
            <button
              className="btn lg"
              style={{
                background: MODE_COLORS.hard,
                color: "#fff",
                minWidth: 140,
              }}
              onClick={() => start("hard")}
              disabled={!pool.length}
            >
              Hard (3s)
            </button>
          </div>
          {!pool.length && (
            <p className="muted" style={{ marginTop: 8 }}>
              Loading questions…
            </p>
          )}
        </div>
      )}

      {/* ---------- PRE-START COUNTDOWN ---------- */}
      {preSecs != null && (
        <div
          className="card"
          style={{
            maxWidth: 800,
            width: "100%",
            textAlign: "center",
            padding: 60,
          }}
        >
          <h3>⏳ Get Ready…</h3>
          <div className="space" />
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: MODE_COLORS[mode],
              lineHeight: 1,
            }}
          >
            {preSecs}
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            Starting in {preSecs}s
          </div>
        </div>
      )}

      {/* ---------- POST-GAME: results ---------- */}
      {game?.finished && (
        <div
          className="card"
          style={{ maxWidth: 1000, width: "100%", padding: 40 }}
        >
          <h3>🎉 Finished! Your Score: {score}</h3>
          <div className="space" />
          <h5>Your Answers</h5>
          <div style={{ display: "grid", gap: 12 }}>
            {history.map((item, qi) => (
              <div
                key={qi}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 8 }}>
                  Q{qi + 1}. {item.text}
                </div>
                <div
                  className="grid"
                  style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}
                >
                  {item.choices.map((c, i) => {
                    const isYourPick = item.yourIndex === i;
                    const isCorrect = item.correctDisplayIndex === i;
                    let bg = "white",
                      bd = "#ddd";
                    if (isYourPick && isCorrect) {
                      bg = "#e6ffed";
                      bd = "#93e6a1";
                    } else if (isYourPick && !isCorrect) {
                      bg = "#ffe6e6";
                      bd = "#ffb3b3";
                    } else if (isCorrect) {
                      bg = "#f2fff6";
                      bd = "#c7f0ce";
                    }
                    return (
                      <div
                        key={i}
                        style={{
                          border: `1px solid ${bd}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: bg,
                        }}
                      >
                        {String.fromCharCode(65 + i)}. {c}
                        {isYourPick && (
                          <span className="pill" style={{ marginLeft: 8 }}>
                            you
                          </span>
                        )}
                        {isCorrect && (
                          <span className="pill" style={{ marginLeft: 8 }}>
                            correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="space" />
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" onClick={restart}>
              Play Again
            </button>
            <button className="btn" onClick={() => navigate("/")}>
              Home
            </button>
          </div>
        </div>
      )}

      {/* ---------- IN-GAME ---------- */}
      {game?.started && !game.finished && (
        <div
          className="card"
          style={{ maxWidth: 900, width: "100%", padding: 40 }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h4>
              Question {idx + 1} / {game.total}
            </h4>
            <div
              className="pill"
              style={{
                background: MODE_COLORS[mode],
                color: mode === "medium" ? "#222" : "#fff",
              }}
            >
              ⏱ {secs}s
            </div>
          </div>
          <p style={{ fontSize: 20, marginTop: 12 }}>{current()?.q.text}</p>
          <div
            className="grid"
            style={{ gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}
          >
            {(current()?.choices || []).map((c, i) => {
              const isChosen = picked === i;
              let bg = "white";
              if (isChosen && correctPick === true) bg = "#e6ffed";
              if (isChosen && correctPick === false) bg = "#ffe6e6";
              return (
                <button
                  key={i}
                  className="btn"
                  style={{
                    padding: "16px 18px",
                    border: "1px solid #ddd",
                    background: bg,
                    fontSize: 16,
                  }}
                  onClick={() => pick(i)}
                  disabled={picked !== null || lock}
                >
                  {String.fromCharCode(65 + i)}. {c}
                </button>
              );
            })}
          </div>
          <div className="space" />
          <div>
            <strong>Score:</strong> {score}
          </div>
        </div>
      )}
    </div>
  );
}