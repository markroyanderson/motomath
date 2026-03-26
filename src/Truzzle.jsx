// Truzzle — 8-Bit Puzzle Edition (React component)
// Converted from standalone index.html for embedding in the MotoMath app.

import { useState, useEffect, useRef, useCallback } from "react";

// ---- Piece definitions (55 cells total = 5×11 board) ----
const PIECE_DEFS = [
  { id:'A', color:'#e94560', shape:[[0,0],[0,1],[0,2],[1,0],[1,1]] },
  { id:'B', color:'#f5a623', shape:[[0,0],[0,1],[0,2],[0,3],[1,0]] },
  { id:'C', color:'#50fa7b', shape:[[0,0],[0,1],[1,1],[1,2],[2,2]] },
  { id:'D', color:'#8be9fd', shape:[[0,0],[0,1],[0,2],[1,1]] },
  { id:'E', color:'#bd93f9', shape:[[0,0],[0,1],[1,0],[2,0],[2,1]] },
  { id:'F', color:'#ff79c6', shape:[[0,0],[1,0],[1,1],[1,2]] },
  { id:'G', color:'#f1fa8c', shape:[[0,0],[0,1],[0,2],[1,2],[1,3]] },
  { id:'H', color:'#ffb86c', shape:[[0,0],[0,1],[0,2]] },
  { id:'I', color:'#6272a4', shape:[[0,0],[0,1],[0,2],[1,0],[2,0]] },
  { id:'J', color:'#00bcd4', shape:[[0,0],[0,1],[1,0],[1,1]] },
  { id:'K', color:'#ff5555', shape:[[0,0],[1,0],[1,1],[2,1],[2,2]] },
  { id:'L', color:'#69ff94', shape:[[0,0],[0,1],[0,2],[0,3],[1,1]] },
];

const ROWS = 5, COLS = 11;

const CHALLENGES = [
  { name:'1', difficulty:'Starter', prePlaced:[
    { pieceId:'A', cells:[[0,0],[0,1],[1,0],[1,1],[1,2]] },
    { pieceId:'B', cells:[[0,2],[0,3],[1,3],[2,3],[3,3]] },
    { pieceId:'C', cells:[[0,4],[0,5],[1,5],[1,6],[2,6]] },
    { pieceId:'D', cells:[[0,6],[0,7],[0,8],[1,7]] },
    { pieceId:'E', cells:[[3,8],[3,10],[4,8],[4,9],[4,10]] },
    { pieceId:'F', cells:[[0,9],[0,10],[1,10],[2,10]] },
    { pieceId:'I', cells:[[2,0],[3,0],[4,0],[4,1],[4,2]] },
    { pieceId:'K', cells:[[1,4],[2,4],[2,5],[3,5],[3,6]] },
  ]},
  { name:'2', difficulty:'Easy', prePlaced:[
    { pieceId:'B', cells:[[0,1],[0,2],[1,2],[2,2],[3,2]] },
    { pieceId:'F', cells:[[2,3],[3,3],[3,4],[3,5]] },
    { pieceId:'G', cells:[[1,9],[2,9],[3,9],[3,10],[4,10]] },
    { pieceId:'H', cells:[[4,2],[4,3],[4,4]] },
    { pieceId:'J', cells:[[3,0],[3,1],[4,0],[4,1]] },
    { pieceId:'K', cells:[[2,7],[3,7],[3,8],[4,8],[4,9]] },
    { pieceId:'L', cells:[[0,4],[0,5],[0,6],[0,7],[1,5]] },
  ]},
  { name:'3', difficulty:'Easy', prePlaced:[
    { pieceId:'B', cells:[[0,3],[0,4],[0,5],[0,6],[1,6]] },
    { pieceId:'C', cells:[[0,7],[1,7],[1,8],[2,8],[2,9]] },
    { pieceId:'E', cells:[[1,2],[1,3],[1,4],[2,2],[2,4]] },
    { pieceId:'G', cells:[[1,5],[2,5],[3,5],[3,6],[4,6]] },
    { pieceId:'K', cells:[[2,3],[3,3],[3,4],[4,4],[4,5]] },
    { pieceId:'L', cells:[[3,2],[4,0],[4,1],[4,2],[4,3]] },
  ]},
  { name:'4', difficulty:'Medium', prePlaced:[
    { pieceId:'A', cells:[[0,0],[0,1],[1,0],[1,1],[2,0]] },
    { pieceId:'E', cells:[[3,0],[3,2],[4,0],[4,1],[4,2]] },
    { pieceId:'F', cells:[[3,5],[4,5],[4,6],[4,7]] },
    { pieceId:'H', cells:[[3,6],[3,7],[3,8]] },
    { pieceId:'K', cells:[[1,2],[1,3],[2,1],[2,2],[3,1]] },
  ]},
  { name:'5', difficulty:'Medium', prePlaced:[
    { pieceId:'C', cells:[[0,5],[0,6],[1,4],[1,5],[2,4]] },
    { pieceId:'F', cells:[[1,6],[2,6],[3,6],[3,7]] },
    { pieceId:'H', cells:[[4,5],[4,6],[4,7]] },
    { pieceId:'K', cells:[[2,5],[3,4],[3,5],[4,3],[4,4]] },
    { pieceId:'L', cells:[[1,2],[2,2],[3,1],[3,2],[4,2]] },
  ]},
  { name:'6', difficulty:'Medium', prePlaced:[
    { pieceId:'B', cells:[[0,2],[1,2],[2,2],[3,2],[3,3]] },
    { pieceId:'C', cells:[[0,3],[0,4],[1,4],[1,5],[2,5]] },
    { pieceId:'F', cells:[[3,1],[4,1],[4,2],[4,3]] },
    { pieceId:'J', cells:[[3,8],[3,9],[4,8],[4,9]] },
  ]},
  { name:'7', difficulty:'Hard', prePlaced:[
    { pieceId:'C', cells:[[0,4],[0,5],[1,5],[1,6],[2,6]] },
    { pieceId:'G', cells:[[3,7],[3,8],[3,9],[4,9],[4,10]] },
    { pieceId:'I', cells:[[2,0],[2,1],[2,2],[3,2],[4,2]] },
  ]},
  { name:'8', difficulty:'Hard', prePlaced:[
    { pieceId:'A', cells:[[0,0],[0,1],[0,2],[1,0],[1,1]] },
    { pieceId:'B', cells:[[0,3],[1,3],[2,3],[3,2],[3,3]] },
    { pieceId:'C', cells:[[0,4],[0,5],[1,5],[1,6],[2,6]] },
  ]},
  { name:'9', difficulty:'Expert', prePlaced:[
    { pieceId:'G', cells:[[3,7],[3,8],[3,9],[4,9],[4,10]] },
    { pieceId:'L', cells:[[3,3],[4,2],[4,3],[4,4],[4,5]] },
  ]},
  { name:'10', difficulty:'Expert', prePlaced:[
    { pieceId:'B', cells:[[0,2],[0,3],[1,3],[2,3],[3,3]] },
  ]},
];

// ---- Shape helpers ----
function rotateShape(shape) {
  return normalizeShape(shape.map(([r,c]) => [c,-r]));
}
function flipShape(shape) {
  return normalizeShape(shape.map(([r,c]) => [r,-c]));
}
function normalizeShape(shape) {
  const minR = Math.min(...shape.map(s=>s[0]));
  const minC = Math.min(...shape.map(s=>s[1]));
  return shape.map(([r,c]) => [r-minR, c-minC]).sort((a,b) => a[0]-b[0] || a[1]-b[1]);
}
function makeFreshPieces() {
  return PIECE_DEFS.map(d => ({
    id: d.id, color: d.color,
    baseShape: d.shape.map(c=>[...c]),
    shape: d.shape.map(c=>[...c]),
    placed: false, locked: false,
  }));
}
function makeEmptyBoard() {
  return Array.from({length:ROWS}, () => Array(COLS).fill(null));
}

// ---- Audio ----
let _audioCtx = null;
function ensureAudio() { if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playTone(freq, dur, type='square', vol=0.12) {
  try {
    ensureAudio();
    const o = _audioCtx.createOscillator();
    const g = _audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, _audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + dur);
    o.connect(g).connect(_audioCtx.destination);
    o.start(); o.stop(_audioCtx.currentTime + dur);
  } catch(e) {}
}
const sfxPlace   = () => { playTone(440,.08); setTimeout(()=>playTone(660,.08),60); };
const sfxRotate  = () => playTone(330,.06);
const sfxError   = () => playTone(180,.15,'sawtooth',.1);
const sfxUndo    = () => { playTone(520,.06); setTimeout(()=>playTone(380,.06),50); };
const sfxVictory = () => { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,.18,'square',.15),i*120)); };

// ============================================================
export default function TruzzleGame({ onBack }) {
  // All mutable game state lives in refs so we avoid stale closure issues
  const boardRef        = useRef(makeEmptyBoard());
  const piecesRef       = useRef(makeFreshPieces());
  const placedRef       = useRef([]);
  const selectedIdxRef  = useRef(null);
  const modeRef         = useRef('free');
  const challengeIdxRef = useRef(null);
  const startTimeRef    = useRef(null);
  const previewCellsRef = useRef(new Set()); // "r,c" strings currently highlighted

  // React state only for triggering re-renders + overlay/panel visibility
  const [tick,         setTick]          = useState(0);
  const [infoText,     setInfoText]      = useState('Select a piece, then tap the board to place it.');
  const [showChallenges, setShowChallenges] = useState(false);
  const [showVictory,  setShowVictory]   = useState(false);
  const [victoryTime,  setVictoryTime]   = useState('');
  const [solvedSet,    setSolvedSet]     = useState(() => new Set());

  const redraw = useCallback(() => setTick(t => t+1), []);

  // ---- Board logic ----
  function canPlace(shape, row, col) {
    const board = boardRef.current;
    for (const [dr,dc] of shape) {
      const r=row+dr, c=col+dc;
      if (r<0||r>=ROWS||c<0||c>=COLS) return false;
      if (board[r][c] !== null) return false;
    }
    return true;
  }

  function placeOnBoard(pieceIdx, row, col) {
    const p = piecesRef.current[pieceIdx];
    const cells = p.shape.map(([dr,dc]) => [row+dr, col+dc]);
    cells.forEach(([r,c]) => { boardRef.current[r][c] = p.id; });
    p.placed = true;
    placedRef.current.push({ id:p.id, idx:pieceIdx, cells, shape:p.shape.map(s=>[...s]), row, col });
    return cells;
  }

  function placeDirectly(pieceIdx, cells) {
    const p = piecesRef.current[pieceIdx];
    cells.forEach(([r,c]) => { boardRef.current[r][c] = p.id; });
    p.placed = true;
    p.locked = true;
    const minR = Math.min(...cells.map(c=>c[0]));
    const minC = Math.min(...cells.map(c=>c[1]));
    const shape = cells.map(([r,c]) => [r-minR, c-minC]);
    placedRef.current.push({ id:p.id, idx:pieceIdx, cells:cells.map(c=>[...c]), shape, row:minR, col:minC });
  }

  function removeFromBoard(entry) {
    const board = boardRef.current;
    entry.cells.forEach(([r,c]) => { if (board[r][c]===entry.id) board[r][c]=null; });
    const p = piecesRef.current[entry.idx];
    p.placed = false;
    p.shape = entry.shape.map(s=>[...s]);
  }

  function checkVictory() {
    const board = boardRef.current;
    for (let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) if(board[r][c]===null) return false;
    return true;
  }

  // ---- Game modes ----
  function startFreePlay() {
    modeRef.current = 'free';
    challengeIdxRef.current = null;
    boardRef.current = makeEmptyBoard();
    piecesRef.current = makeFreshPieces();
    placedRef.current = [];
    selectedIdxRef.current = null;
    startTimeRef.current = Date.now();
    setShowChallenges(false);
    setInfoText('Free play! Fill the entire board.');
    redraw();
  }

  function startChallenge(idx) {
    modeRef.current = 'challenge';
    challengeIdxRef.current = idx;
    boardRef.current = makeEmptyBoard();
    piecesRef.current = makeFreshPieces();
    placedRef.current = [];
    selectedIdxRef.current = null;
    const ch = CHALLENGES[idx];
    ch.prePlaced.forEach(pp => {
      const pieceIdx = piecesRef.current.findIndex(p => p.id === pp.pieceId);
      if (pieceIdx !== -1) placeDirectly(pieceIdx, pp.cells);
    });
    startTimeRef.current = Date.now();
    setShowChallenges(false);
    setInfoText(`Challenge ${ch.name} (${ch.difficulty}) — fill the board!`);
    redraw();
  }

  // ---- Board click ----
  function onBoardClick(row, col) {
    previewCellsRef.current = new Set();
    if (selectedIdxRef.current === null) {
      const id = boardRef.current[row][col];
      if (id !== null) {
        const entry = [...placedRef.current].reverse().find(e => e.id === id);
        if (entry && !piecesRef.current[entry.idx].locked) {
          removeFromBoard(entry);
          placedRef.current = placedRef.current.filter(e => e !== entry);
          selectedIdxRef.current = entry.idx;
          sfxUndo();
          setInfoText(`Picked up piece ${id}. Tap to re-place.`);
          redraw();
        }
      }
      return;
    }

    const p = piecesRef.current[selectedIdxRef.current];
    const maxR = Math.max(...p.shape.map(s=>s[0]));
    const maxC = Math.max(...p.shape.map(s=>s[1]));
    const placeR = row - Math.floor(maxR/2);
    const placeC = col - Math.floor(maxC/2);

    if (canPlace(p.shape, placeR, placeC)) {
      placeOnBoard(selectedIdxRef.current, placeR, placeC);
      sfxPlace();
      selectedIdxRef.current = null;
      setInfoText('Placed! Select another piece.');
      redraw();
      if (checkVictory()) triggerVictory();
    } else {
      sfxError();
      // flash invalid cells briefly via state
      const flashCells = new Set();
      p.shape.forEach(([dr,dc]) => {
        const r=placeR+dr, c=placeC+dc;
        if(r>=0&&r<ROWS&&c>=0&&c<COLS) flashCells.add(`${r},${c},invalid`);
      });
      previewCellsRef.current = flashCells;
      redraw();
      setTimeout(() => { previewCellsRef.current = new Set(); redraw(); }, 300);
    }
  }

  // ---- Board hover preview ----
  function onBoardMouseMove(e) {
    if (selectedIdxRef.current === null) { previewCellsRef.current = new Set(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;
    const col = Math.floor((e.clientX - rect.left) / (cellW + 0.2));
    const row = Math.floor((e.clientY - rect.top)  / (cellH + 0.2));
    updatePreview(row, col);
  }

  function updatePreview(row, col) {
    if (selectedIdxRef.current === null) { previewCellsRef.current = new Set(); redraw(); return; }
    const p = piecesRef.current[selectedIdxRef.current];
    const maxR = Math.max(...p.shape.map(s=>s[0]));
    const maxC = Math.max(...p.shape.map(s=>s[1]));
    const placeR = row - Math.floor(maxR/2);
    const placeC = col - Math.floor(maxC/2);
    const valid = canPlace(p.shape, placeR, placeC);
    const cells = new Set();
    p.shape.forEach(([dr,dc]) => {
      const r=placeR+dr, c=placeC+dc;
      if(r>=0&&r<ROWS&&c>=0&&c<COLS) cells.add(`${r},${c},${valid?'highlight':'invalid'}`);
    });
    previewCellsRef.current = cells;
    redraw();
  }

  // ---- Controls ----
  function doRotate() {
    const idx = selectedIdxRef.current;
    if (idx === null) return;
    piecesRef.current[idx].shape = rotateShape(piecesRef.current[idx].shape);
    sfxRotate();
    redraw();
  }
  function doFlip() {
    const idx = selectedIdxRef.current;
    if (idx === null) return;
    piecesRef.current[idx].shape = flipShape(piecesRef.current[idx].shape);
    sfxRotate();
    redraw();
  }
  function doUndo() {
    const placed = placedRef.current;
    for (let i = placed.length-1; i >= 0; i--) {
      const entry = placed[i];
      if (!piecesRef.current[entry.idx].locked) {
        removeFromBoard(entry);
        placedRef.current.splice(i,1);
        sfxUndo();
        setInfoText(`Removed piece ${entry.id}.`);
        redraw();
        return;
      }
    }
  }
  function doReset() {
    const toKeep = placedRef.current.filter(e => piecesRef.current[e.idx].locked);
    const toRemove = placedRef.current.filter(e => !piecesRef.current[e.idx].locked);
    toRemove.forEach(e => removeFromBoard(e));
    placedRef.current = toKeep;
    selectedIdxRef.current = null;
    setInfoText('Board reset. Select a piece.');
    redraw();
  }

  // ---- Victory ----
  function triggerVictory() {
    sfxVictory();
    const elapsed = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current)/1000) : 0;
    const mins = Math.floor(elapsed/60);
    const secs = elapsed % 60;
    setVictoryTime(`Time: ${mins}:${String(secs).padStart(2,'0')}`);
    if (challengeIdxRef.current !== null) {
      setSolvedSet(prev => { const next = new Set(prev); next.add(challengeIdxRef.current); return next; });
    }
    setShowVictory(true);
  }

  // ---- Keyboard ----
  useEffect(() => {
    const onKey = (e) => {
      if (e.key==='r'||e.key==='R') doRotate();
      else if (e.key==='f'||e.key==='F') doFlip();
      else if (e.key==='z'||e.key==='Z') doUndo();
      else if (e.key==='Escape') { selectedIdxRef.current=null; previewCellsRef.current=new Set(); redraw(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line

  // ---- Init ----
  useEffect(() => { startFreePlay(); }, []); // eslint-disable-line

  // ---- Derived render data ----
  const board   = boardRef.current;
  const pieces  = piecesRef.current;
  const selIdx  = selectedIdxRef.current;
  const preview = previewCellsRef.current;
  const pieceLookup = Object.fromEntries(pieces.map(p=>[p.id,p]));

  function cellClass(r, c) {
    const id = board[r][c];
    const key = `${r},${c}`;
    if (preview.has(`${key},highlight`)) return 'highlight';
    if (preview.has(`${key},invalid`))   return 'invalid';
    if (id !== null) return 'filled';
    return '';
  }

  // ---- Styles (inline so the component is self-contained) ----
  const styles = {
    wrapper: {
      fontFamily: "'Press Start 2P', monospace",
      background: '#1a1a2e',
      color: '#eee',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflowX: 'hidden',
      touchAction: 'manipulation',
      paddingBottom: 24,
    },
    backBtn: {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 7,
      padding: '6px 10px',
      border: '2px solid #555',
      background: 'transparent',
      color: '#888',
      cursor: 'pointer',
      alignSelf: 'flex-start',
      margin: '10px 12px 0',
    },
    h1: {
      fontSize: 18,
      margin: '10px 0 2px',
      textAlign: 'center',
      color: '#e94560',
      textShadow: '2px 2px 0 #000',
      letterSpacing: 4,
    },
    subtitle: {
      fontSize: 8,
      color: '#888',
      marginBottom: 8,
      textAlign: 'center',
    },
    controls: {
      display: 'flex',
      gap: 6,
      marginBottom: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    btn: {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 8,
      padding: '8px 12px',
      border: '2px solid #e94560',
      background: '#16213e',
      color: '#eee',
      cursor: 'pointer',
    },
    btnActive: {
      background: '#e94560',
    },
    boardWrapper: {
      position: 'relative',
      margin: '0 auto',
    },
    board: {
      display: 'grid',
      gridTemplateColumns: `repeat(${COLS}, var(--tz-cell, 38px))`,
      gridTemplateRows:    `repeat(${ROWS}, var(--tz-cell, 38px))`,
      gap: 2,
      background: '#16213e',
      border: '3px solid #4a4a6a',
      padding: 3,
      borderRadius: 4,
    },
    infoBar: {
      fontSize: 8,
      color: '#aaa',
      margin: '6px 0',
      textAlign: 'center',
      minHeight: 18,
      padding: '0 8px',
    },
    trayLabel: {
      fontSize: 8,
      color: '#888',
      margin: '8px 0 4px',
      textAlign: 'center',
    },
    tray: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      maxWidth: 500,
      padding: 6,
      marginBottom: 12,
    },
    challengePanel: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      margin: '6px 0',
    },
    challengeList: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      justifyContent: 'center',
      maxWidth: 400,
    },
    chBtn: (solved) => ({
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 7,
      width: 32, height: 32,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: solved ? '2px solid #3a8a3a' : '2px solid #4a4a6a',
      background: solved ? '#1a4a1a' : '#16213e',
      color: '#eee',
      cursor: 'pointer',
    }),
    victoryOverlay: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.85)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
  };

  return (
    <>
      {/* Load Press Start 2P font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />

      <style>{`
        :root { --tz-cell: 38px; }
        @media (max-width: 520px) { :root { --tz-cell: 28px; } }
        @media (max-width: 380px) { :root { --tz-cell: 24px; } }
        .tz-btn:hover, .tz-btn:active { background: #e94560 !important; }
        .tz-cell { width: var(--tz-cell); height: var(--tz-cell); background: #2a2a4a; border: 1px solid #3a3a5a; transition: background .1s; cursor: pointer; box-sizing: border-box; }
        .tz-cell.highlight { background: rgba(233,69,96,.3); }
        .tz-cell.invalid   { background: rgba(255,0,0,.4); }
        .tz-cell.filled    { border-color: rgba(0,0,0,.4); }
        .tz-cell.locked::after { content:''; display:block; width:6px; height:6px; margin:auto; margin-top:calc(var(--tz-cell)/2 - 3px); background:rgba(255,255,255,.2); border-radius:1px; }
        .tz-piece-container { cursor:grab; position:relative; padding:2px; border:2px solid transparent; border-radius:4px; transition:border-color .15s, transform .15s; }
        .tz-piece-container:hover { border-color: #e94560; }
        .tz-piece-container.selected { border-color: #fff; transform: scale(1.08); }
        .tz-piece-container.placed { opacity: .25; pointer-events: none; }
        .tz-piece-cell { width:15px; height:15px; image-rendering:pixelated; }
        @media (max-width: 520px) { .tz-piece-cell { width:12px; height:12px; } }
        @media (max-width: 380px) { .tz-piece-cell { width:10px; height:10px; } }
        @keyframes tz-victory-pulse { from{transform:scale(1)} to{transform:scale(1.1)} }
      `}</style>

      <div style={styles.wrapper}>
        {/* Back button */}
        {onBack && (
          <button style={styles.backBtn} onClick={onBack} className="tz-btn">
            ← BACK
          </button>
        )}

        <h1 style={styles.h1}>TRUZZLE</h1>
        <p style={styles.subtitle}>8-BIT PUZZLE EDITION</p>

        {/* Controls */}
        <div style={styles.controls}>
          <button className="tz-btn" style={{...styles.btn, ...(modeRef.current==='free'?styles.btnActive:{})}}
            onClick={startFreePlay}>FREE PLAY</button>
          <button className="tz-btn" style={{...styles.btn, ...(showChallenges?styles.btnActive:{})}}
            onClick={()=>setShowChallenges(v=>!v)}>CHALLENGES</button>
          <button className="tz-btn" style={styles.btn} onClick={doRotate}>ROTATE (R)</button>
          <button className="tz-btn" style={styles.btn} onClick={doFlip}>FLIP (F)</button>
          <button className="tz-btn" style={styles.btn} onClick={doUndo}>UNDO (Z)</button>
          <button className="tz-btn" style={styles.btn} onClick={doReset}>RESET</button>
        </div>

        {/* Challenge panel */}
        {showChallenges && (
          <div style={styles.challengePanel}>
            <div style={styles.challengeList}>
              {CHALLENGES.map((ch, i) => (
                <button key={i} style={styles.chBtn(solvedSet.has(i))}
                  title={ch.difficulty} onClick={()=>startChallenge(i)}>
                  {ch.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={styles.infoBar}>{infoText}</div>

        {/* Board */}
        <div style={styles.boardWrapper}>
          <div
            style={styles.board}
            onMouseMove={onBoardMouseMove}
            onMouseLeave={() => { previewCellsRef.current = new Set(); redraw(); }}
          >
            {Array.from({length:ROWS}, (_,r) =>
              Array.from({length:COLS}, (_,c) => {
                const id = board[r][c];
                const piece = id ? pieceLookup[id] : null;
                const cls = cellClass(r,c);
                return (
                  <div
                    key={`${r},${c}`}
                    className={`tz-cell${cls?' '+cls:''} ${piece?.locked?'locked':''}`}
                    style={piece ? {
                      background: piece.color,
                      boxShadow: 'inset -2px -2px 0 rgba(0,0,0,.3), inset 2px 2px 0 rgba(255,255,255,.15)',
                    } : {}}
                    onClick={() => onBoardClick(r,c)}
                    onTouchEnd={e => { e.preventDefault(); onBoardClick(r,c); }}
                  />
                );
              })
            )}
          </div>
        </div>

        <div style={styles.trayLabel}>PIECES</div>

        {/* Piece tray */}
        <div style={styles.tray}>
          {pieces.map((p, idx) => {
            const maxR = Math.max(...p.shape.map(s=>s[0]))+1;
            const maxC = Math.max(...p.shape.map(s=>s[1]))+1;
            const shapeSet = new Set(p.shape.map(([r,c])=>`${r},${c}`));
            const isSel = idx === selIdx;
            return (
              <div
                key={p.id}
                className={`tz-piece-container${p.placed?' placed':''}${isSel?' selected':''}`}
                onClick={e => { e.stopPropagation(); if (!p.placed && !p.locked) {
                  selectedIdxRef.current = isSel ? null : idx;
                  previewCellsRef.current = new Set();
                  setInfoText(isSel ? 'Select a piece, then tap the board.' : `Piece ${p.id} selected. Tap board to place. R=rotate, F=flip.`);
                  redraw();
                }}}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${maxC}, 15px)`,
                  gridTemplateRows:    `repeat(${maxR}, 15px)`,
                  gap: 1,
                }}>
                  {Array.from({length:maxR}, (_,r) =>
                    Array.from({length:maxC}, (_,c) => {
                      const filled = shapeSet.has(`${r},${c}`);
                      return (
                        <div key={`${r},${c}`} className="tz-piece-cell"
                          style={filled ? {
                            background: p.color,
                            border: '1px solid rgba(0,0,0,.3)',
                            boxShadow: 'inset -1px -1px 0 rgba(0,0,0,.3), inset 1px 1px 0 rgba(255,255,255,.2)',
                          } : { background:'transparent' }}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Victory overlay */}
        {showVictory && (
          <div style={styles.victoryOverlay}>
            <div style={{fontSize:28, letterSpacing:8}}>★ ★ ★</div>
            <h2 style={{
              fontFamily:"'Press Start 2P',monospace",
              fontSize:20, color:'#e94560',
              textShadow:'3px 3px 0 #000',
              animation:'tz-victory-pulse 0.5s ease-in-out infinite alternate',
            }}>PUZZLE SOLVED!</h2>
            <div style={{fontFamily:"'Press Start 2P',monospace", fontSize:10, color:'#ccc'}}>{victoryTime}</div>
            <button className="tz-btn" style={styles.btn} onClick={()=>setShowVictory(false)}>CONTINUE</button>
          </div>
        )}
      </div>
    </>
  );
}
