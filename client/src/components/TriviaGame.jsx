import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import ReadyButton from "./ReadyButton";

export default function TriviaGame({ roomId, isHost }){
  const [state, setState] = useState(null);
  const [lobbyCountdown, setLobbyCountdown] = useState(null);
  const [qCountdown, setQCountdown] = useState(null);
  const [answeredIdx, setAnsweredIdx] = useState(null);
  const [answeredCorrect, setAnsweredCorrect] = useState(null);
  const [results, setResults] = useState(null); // NEW: per‑player results
  const prevIdx = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onState = (s) => {
      if (prevIdx.current !== s?.idx){
        setAnsweredIdx(null);
        setAnsweredCorrect(null);
        prevIdx.current = s?.idx;
      }
      setState(s);
    };
    const onLobby = (secs) => setLobbyCountdown(secs);
    const onQ = (secs) => setQCountdown(secs);
    const onAbandoned = ({ roomId: rid }) => {
      alert("Everyone else left — this room is closing.");
      socket.emit("room:leave", { roomId: rid });
      navigate("/", { replace: true });
    };

    socket.on("game:state", onState);
    socket.on("game:countdown", onLobby);
    socket.on("game:qcountdown", onQ);
    socket.on("room:abandoned", onAbandoned);

    socket.emit("game:get", { roomId }, (res) => res?.ok && setState(res.state));

    return () => {
      socket.off("game:state", onState);
      socket.off("game:countdown", onLobby);
      socket.off("game:qcountdown", onQ);
      socket.off("room:abandoned", onAbandoned);
    };
  }, [roomId, navigate]);

  // When game finishes, fetch my results
  useEffect(() => {
    if (state?.finished && !results){
      socket.emit("game:results", { roomId }, (res) => {
        if (res?.ok) setResults(res.results || []);
      });
    }
  }, [state?.finished, results, roomId]);

  const sortedScores = useMemo(() => {
    const arr = (state?.scores || []).slice();
    arr.sort((a,b) => b.score - a.score);
    return arr;
  }, [state]);

  const meReady = useMemo(() => {
    const me = (state?.ready || []).find(r => r.id === socket.id);
    return !!me?.ready;
  }, [state]);

  function toggleReady(){ socket.emit("game:ready", { roomId, ready: !meReady }); }
  function next(){ socket.emit("game:next", { roomId }); }
  function answer(i){
    if (answeredIdx !== null) return;
    setAnsweredIdx(i);
    socket.emit("game:answer", { roomId, choiceIndex: i }, (res) => {
      setAnsweredCorrect(!!res?.correct);
    });
  }

  // Lobby/ready view (not started)
  if (!state || !state.started){
    const players = state?.ready || [];
    const readyCount = players.filter(p => p.ready).length;
    const canStart = state?.canStart;
    return (
      <div className="card">
        <h4>Trivia — Vibe Coding Edition</h4>
        <p className="muted">Need at least {state?.minPlayers ?? 2} players. Everyone must click Ready.</p>

        <div className="space" />
        <ReadyButton meReady={meReady} toggleReady={toggleReady} />
        <div className="space" />
        <ul>
          {players.map(p => (
            <li key={p.id}>• {p.name} {p.ready ? "✅" : "⏳"}</li>
          ))}
        </ul>

        {lobbyCountdown !== null && (
          <div style={{marginTop:12, padding:12, border:"1px solid #ddd", borderRadius:10}}>
            Starting in <strong>{lobbyCountdown}</strong>… (auto-cancels if someone un‑readies)
          </div>
        )}

        {!canStart && lobbyCountdown === null && (
          <p className="muted" style={{marginTop:8}}>{readyCount} / {players.length} ready</p>
        )}
      </div>
    );
  }

  // Finished view
  if (state.finished){
    return (
      <div className="card">
        <h4>🎉 Game Over</h4>
        <ol>
          {sortedScores.map(s => (<li key={s.id}><strong>{s.name}</strong> — {s.score} pts</li>))}
        </ol>

        {/* NEW: per‑player review */}
        <div className="space" />
        <h5>Your Answers</h5>
        <div style={{display:"grid", gap:12}}>
          {(results || []).map((item, qi) => (
            <div key={qi} style={{border:"1px solid #eee", borderRadius:10, padding:12}}>
              <div style={{fontWeight:600, marginBottom:8}}>Q{qi+1}. {item.text}</div>
              <div className="grid" style={{gridTemplateColumns:"1fr 1fr", gap:10}}>
                {item.choices.map((c, i) => {
                  const picked = item.yourIndex === i;
                  const correct = item.correctDisplayIndex === i;
                  let bg = "white", bd = "#ddd";
                  if (picked && correct) { bg = "#e6ffed"; bd = "#93e6a1"; }
                  else if (picked && !correct) { bg = "#ffe6e6"; bd = "#ffb3b3"; }
                  else if (correct) { bg = "#f2fff6"; bd = "#c7f0ce"; }
                  return (
                    <div key={i} style={{border:`1px solid ${bd}`, borderRadius:10, padding:"10px 12px", background:bg}}>
                      {String.fromCharCode(65+i)}. {c}
                      {picked && <span className="pill" style={{marginLeft:8}}>you</span>}
                      {correct && <span className="pill" style={{marginLeft:8}}>correct</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p className="muted" style={{marginTop:12}}>Toggle Ready in the lobby to start another round.</p>
      </div>
    );
  }

  // In-game question view
  const q = state.question;
  return (
    <div className="card">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h4>Vibe Coding Trivia — Question {state.idx + 1} / {state.total}</h4>
        <div style={{display:"flex", gap:12, alignItems:"center"}}>
          <div className="pill">⏱ {qCountdown ?? 0}s</div>
          {isHost && <button className="btn" onClick={next}>Skip ▷</button>}
        </div>
      </div>

      <p style={{fontSize:18, marginTop:6}}>{q?.text}</p>
      <div className="grid" style={{gridTemplateColumns:"1fr 1fr", gap:12}}>
        {(q?.choices || []).map((c, i) => {
          const isChosen = answeredIdx === i;
          let bg = "white";
          if (isChosen && answeredCorrect === true) bg = "#e6ffed"; // green
          if (isChosen && answeredCorrect === false) bg = "#ffe6e6"; // red
          return (
            <button key={i}
              className="btn"
              style={{ padding:"14px 16px", border:"1px solid #ddd", background: bg }}
              onClick={() => answer(i)}
              disabled={answeredIdx !== null}
            >
              {String.fromCharCode(65 + i)}. {c}
            </button>
          );
        })}
      </div>

      <div className="space" />
      <h5>Scoreboard</h5>
      <ul>
        {sortedScores.map(s => (<li key={s.id}>• {s.name}: {s.score}</li>))}
      </ul>
    </div>
  );
}