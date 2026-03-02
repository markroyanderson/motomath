import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ───
const GAME_W = 480;
const GAME_H = 270;
const LANE_COUNT = 3;
const LANE_H = 40;
const LANE_GAP = 2;
const ROAD_BOTTOM = 230;
const SCROLL_SPEED = 1.6;
const GRAVITY = 0.18;
const TOTAL_QUESTIONS = 10;
const FLIP_SPEED = 0.2;
const SPIN_SPEED = 0.15;
const MAX_SPEED_MULTIPLIER = 1.3; // speed at final question vs first
const WHEELIE_SPEED = 0.015;   // how fast wheelie tilts up
const WHEELIE_MAX = 0.55;      // max safe wheelie angle (~31 deg)
const WHEELIE_CRASH = 0.85;    // tip over backwards (crash)
const LAND_PERFECT = 0.25;     // within this = perfect landing
const LAND_OK = 0.8;           // within this = rough but ok
// beyond LAND_OK = crash

// Returns scroll speed for the current point in the level
function getDynamicSpeed(questionIndex, totalQuestions, baseSpeed, maxMultiplier) {
  const t = totalQuestions <= 1 ? 0 : questionIndex / (totalQuestions - 1);
  return baseSpeed * (1 + (maxMultiplier - 1) * t);
}

function laneCenter(lane) {
  return ROAD_BOTTOM - lane * (LANE_H + LANE_GAP) - LANE_H / 2;
}
function laneTop(lane) {
  return ROAD_BOTTOM - lane * (LANE_H + LANE_GAP) - LANE_H;
}

// ─── COLOR PALETTES ───
const PAL = {
  sky: "#6888ff", skyLight: "#88a8ff",
  ground: "#c84c0c", groundDark: "#a03000",
  road: "#c0a060", roadAlt: "#b89858", roadLine: "#f8d878", roadBorder: "#806030",
  bike: "#e40058", bikeDark: "#a00030",
  wheel: "#222", wheelSpoke: "#888",
  rider: "#fcfcfc", riderDark: "#b0b0b0",
  helmet: "#2038ec", helmetVisor: "#00e8d8",
  ramp: "#f8a800", rampDark: "#c87800",
  rampCorrect: "#00a800", rampWrong: "#e40058",
  jumpRamp: "#f8d800", jumpRampDark: "#c8a800",
  text: "#fcfcfc", textShadow: "#222",
  hud: "#222", hudBorder: "#fcfcfc",
  star: "#f8d800", dust: "#d8b068", explosion: "#f87858",
  laneHighlight: "rgba(255,255,255,0.12)",
  answerBox: "#2850a8", answerBoxBorder: "#4878d8",
  cone: "#f85800", coneDark: "#c04000", coneStripe: "#fcfcfc",
  barrel: "#4878a8", barrelDark: "#305878", barrelBand: "#88b8e8",
  bump: "#d8a850", bumpDark: "#b08838",
  perfect: "#00ff88", ok: "#f8d800",
  progressBg: "#333", progressFill: "#00a800", progressBorder: "#fcfcfc",
};

// ─── MATH PROBLEM GENERATOR ───
// questionIndex drives an early/mid/late difficulty ramp for every year.
// Phase boundaries: 0-2 = early, 3-5 = mid, 6+ = late
function genProblem(year, questionIndex = 0) {
  const r = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const phase = questionIndex < 3 ? "early" : questionIndex < 6 ? "mid" : "late";
  let q, answer;

  switch (year) {

    // ── Year 1: single-digit addition, numbers grow through the level ──
    case 1: {
      if (phase === "early") {
        // Very small numbers, sums up to 8
        const a=r(1,4), b=r(1,4); q=`${a} + ${b}`; answer=a+b;
      } else if (phase === "mid") {
        // Standard single digits, sums up to 12
        const a=r(1,7), b=r(1,7); q=`${a} + ${b}`; answer=a+b;
      } else {
        // Full single digits, sums up to 18
        const a=r(1,9), b=r(1,9); q=`${a} + ${b}`; answer=a+b;
      }
      break;
    }

    // ── Year 2: addition and subtraction within 20, range widens ──
    case 2: {
      if (phase === "early") {
        // Addition/subtraction within 10
        if (Math.random()<0.5) { const a=r(2,8),b=r(1,a); q=`${a} - ${b}`; answer=a-b; }
        else { const a=r(1,6),b=r(1,10-a); q=`${a} + ${b}`; answer=a+b; }
      } else if (phase === "mid") {
        // Within 15
        if (Math.random()<0.5) { const a=r(5,12),b=r(1,a); q=`${a} - ${b}`; answer=a-b; }
        else { const a=r(3,10),b=r(1,15-a); q=`${a} + ${b}`; answer=a+b; }
      } else {
        // Full range within 20
        if (Math.random()<0.5) { const a=r(5,15),b=r(1,Math.min(a,15)); q=`${a} - ${b}`; answer=a-b; }
        else { const a=r(5,12),b=r(1,20-a); q=`${a} + ${b}`; answer=a+b; }
      }
      break;
    }

    // ── Year 3: tens addition, then double-digits, then times tables ──
    case 3: {
      const kind = Math.random();
      if (phase === "early") {
        // Tens-based or single-digit add/sub to a round number
        if (kind < 0.5) {
          const a=r(1,9)*10, b=r(1,9)*10;
          if (Math.random()<0.5) { q=`${a} + ${b}`; answer=a+b; }
          else { const big=Math.max(a,b),sm=Math.min(a,b); q=`${big} - ${sm}`; answer=big-sm; }
        } else {
          const a=r(10,50), b=r(1,9);
          if (Math.random()<0.5) { q=`${a} + ${b}`; answer=a+b; }
          else { q=`${a} - ${b}`; answer=a-b; }
        }
      } else if (phase === "mid") {
        if (kind < 0.5) { const a=r(10,40),b=r(10,30); q=`${a} + ${b}`; answer=a+b; }
        else if (kind < 0.8) { const a=r(30,70),b=r(10,Math.min(a,30)); q=`${a} - ${b}`; answer=a-b; }
        else { const t=[2,5,10][r(0,2)],m=r(1,6); q=`${t} × ${m}`; answer=t*m; }
      } else {
        if (kind < 0.33) { const a=r(20,60),b=r(10,99-a); q=`${a} + ${b}`; answer=a+b; }
        else if (kind < 0.66) { const a=r(30,99),b=r(10,a); q=`${a} - ${b}`; answer=a-b; }
        else { const t=[2,5,10][r(0,2)],m=r(1,10); q=`${t} × ${m}`; answer=t*m; }
      }
      break;
    }

    // ── Year 4: times tables, then division introduced, then full mix ──
    case 4: {
      if (phase === "early") {
        // Easy tables only: 2×, 5×, 10×, small multipliers
        const t=[2,5,10][r(0,2)], m=r(1,6); q=`${t} × ${m}`; answer=t*m;
      } else if (phase === "mid") {
        // Extend to 6×6 tables; introduce simple division by 2, 5, 10
        if (Math.random()<0.6) { const a=r(2,6),b=r(2,6); q=`${a} × ${b}`; answer=a*b; }
        else { const d=[2,5,10][r(0,2)],m=r(1,6),n=d*m; q=`${n} ÷ ${d}`; answer=m; }
      } else {
        // Full 12× tables and any divisor
        if (Math.random()<0.6) { const a=r(2,12),b=r(2,12); q=`${a} × ${b}`; answer=a*b; }
        else { const d=r(2,12),m=r(1,12),n=d*m; q=`${n} ÷ ${d}`; answer=m; }
      }
      break;
    }

    // ── Year 5: build from simple × to remainders to fractions ──
    case 5: {
      if (phase === "early") {
        // Small multi-digit multiplication (×2 to ×4)
        const a=r(10,30), b=r(2,4); q=`${a} × ${b}`; answer=a*b;
      } else if (phase === "mid") {
        // Larger × and simple division with remainders (small divisors)
        if (Math.random()<0.5) { const a=r(15,50),b=r(2,6); q=`${a} × ${b}`; answer=a*b; }
        else { const d=r(2,6),m=r(3,8),rem=r(1,d-1),n=d*m+rem; q=`${n} ÷ ${d} remainder?`; answer=rem; }
      } else {
        // Full range: larger ×, bigger remainders, fractions
        const kind=Math.random();
        if (kind<0.4) { const a=r(20,50),b=r(2,9); q=`${a} × ${b}`; answer=a*b; }
        else if (kind<0.7) { const d=r(3,12),m=r(5,15),rem=r(1,d-1),n=d*m+rem; q=`${n} ÷ ${d} remainder?`; answer=rem; }
        else { const num=r(1,4),den=[2,4,5][r(0,2)],whole=r(1,5); q=`${num}/${den} + ${whole}`; answer=parseFloat((num/den+whole).toFixed(2)); }
      }
      break;
    }

    // ── Year 6: easy % and ×+c, then mixed, then full order-of-ops ──
    case 6: {
      if (phase === "early") {
        // Simple: 50% or 10% of round numbers; small ×+c
        if (Math.random()<0.5) { const pct=[10,50][r(0,1)],of_=[20,40,60,80,100][r(0,4)]; q=`${pct}% of ${of_}`; answer=(pct/100)*of_; }
        else { const a=r(2,5),b=r(2,5),c=r(1,5); q=`${a} × ${b} + ${c}`; answer=a*b+c; }
      } else if (phase === "mid") {
        // Extend % to 25%; subtraction × with small numbers
        if (Math.random()<0.5) { const pct=[10,20,25][r(0,2)],of_=[40,60,80,100,200][r(0,4)]; q=`${pct}% of ${of_}`; answer=(pct/100)*of_; }
        else { const a=r(3,8),b=r(2,5),c=r(1,8); q=`${a} × ${b} + ${c}`; answer=a*b+c; }
      } else {
        // Full range: all %, order-of-ops subtraction
        const kind=Math.random();
        if (kind<0.33) { const a=r(2,10),b=r(1,10),c=r(1,10); q=`${a} × ${b} + ${c}`; answer=a*b+c; }
        else if (kind<0.66) { const pct=[10,20,25,50][r(0,3)],of_=[40,60,80,100,200][r(0,4)]; q=`${pct}% of ${of_}`; answer=(pct/100)*of_; }
        else { const a=r(5,20),b=r(2,8),c=r(1,5); q=`${a} - ${b} × ${c}`; answer=a-b*c; }
      }
      break;
    }

    default: { const a=r(1,5),b=r(1,5); q=`${a} + ${b}`; answer=a+b; }
  }
  return { question: q, answer, options: genOptions(answer) };
}

function genOptions(answer) {
  const opts = new Set([answer]);
  let tries = 0;
  while (opts.size < 3 && tries < 100) {
    const offset = Math.floor(Math.random()*7)-3 || 1;
    const wrong = Number.isInteger(answer) ? answer+offset : parseFloat((answer+offset*0.5).toFixed(2));
    if (wrong !== answer) opts.add(wrong);
    tries++;
  }
  while (opts.size < 3) opts.add(answer + opts.size);
  const arr = [...opts];
  for (let i=arr.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}

// ─── SOUND ENGINE ───
class SoundEngine {
  constructor() { this.ctx=null; this.initialized=false; }
  init() {
    if (this.initialized) return;
    try { this.ctx=new(window.AudioContext||window.webkitAudioContext)(); this.initialized=true; } catch(e) {}
  }
  play(type) {
    if (!this.ctx) return;
    try { switch(type) {
      case "jump": this._sweep(300,800,0.15,"square",0.12); break;
      case "correct": this._note(523,0.08,"square",0.1); this._note(659,0.08,"square",0.1,0.1); this._note(784,0.12,"square",0.1,0.2); break;
      case "wrong": this._note(200,0.15,"sawtooth",0.12); this._note(150,0.25,"sawtooth",0.12,0.15); break;
      case "crash": this._noise(0.3,0.15); this._note(100,0.3,"sawtooth",0.08); break;
      case "trick": this._sweep(500,1200,0.1,"square",0.08); break;
      case "land": this._note(150,0.08,"triangle",0.1); this._noise(0.08,0.06); break;
      case "perfect": this._note(523,0.08,"square",0.1); this._note(659,0.08,"square",0.1,0.08); this._note(784,0.08,"square",0.1,0.16); this._note(1047,0.15,"square",0.1,0.24); break;
      case "select": this._note(440,0.06,"square",0.08); break;
      case "win": for(let i=0;i<6;i++) this._note(523+i*60,0.1,"square",0.08,i*0.12); break;
      case "gameover": for(let i=0;i<4;i++) this._note(400-i*60,0.2,"sawtooth",0.08,i*0.2); break;
      case "engine": this._note(80+Math.random()*20,0.05,"sawtooth",0.02); break;
      case "wheelie": this._note(200,0.04,"square",0.03); break;
      case "bounce": this._note(180,0.06,"triangle",0.06); break;
    }} catch(e) {}
  }
  _note(f,d,t,v,delay=0) { const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=t; o.frequency.value=f; g.gain.setValueAtTime(v,this.ctx.currentTime+delay); g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+delay+d); o.connect(g); g.connect(this.ctx.destination); o.start(this.ctx.currentTime+delay); o.stop(this.ctx.currentTime+delay+d+0.05); }
  _sweep(f1,f2,d,t,v) { const o=this.ctx.createOscillator(),g=this.ctx.createGain(); o.type=t; o.frequency.setValueAtTime(f1,this.ctx.currentTime); o.frequency.linearRampToValueAtTime(f2,this.ctx.currentTime+d); g.gain.setValueAtTime(v,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+d); o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime+d+0.05); }
  _noise(d,v) { const b=this.ctx.createBuffer(1,this.ctx.sampleRate*d,this.ctx.sampleRate),data=b.getChannelData(0); for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1; const s=this.ctx.createBufferSource(),g=this.ctx.createGain(); s.buffer=b; g.gain.setValueAtTime(v,this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime+d); s.connect(g); g.connect(this.ctx.destination); s.start(); }
}

// ─── DRAWING HELPERS ───
function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawBike(ctx, x, y, rotation = 0, crashed = false, wheelie = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const totalRot = rotation + wheelie;
  if (totalRot) ctx.rotate(totalRot);
  if (crashed) {
    drawPixelRect(ctx, -12, -2, 24, 4, PAL.bikeDark);
    drawPixelRect(ctx, -16, 2, 8, 8, PAL.wheel);
    drawPixelRect(ctx, 10, 4, 8, 8, PAL.wheel);
    drawPixelRect(ctx, -4, -14, 8, 8, PAL.helmet);
    drawPixelRect(ctx, -2, -6, 6, 6, PAL.riderDark);
  } else {
    drawPixelRect(ctx, -18, 4, 10, 10, PAL.wheel);
    drawPixelRect(ctx, 10, 4, 10, 10, PAL.wheel);
    drawPixelRect(ctx, -16, 6, 6, 6, PAL.wheelSpoke);
    drawPixelRect(ctx, 12, 6, 6, 6, PAL.wheelSpoke);
    drawPixelRect(ctx, -14, 0, 30, 6, PAL.bike);
    drawPixelRect(ctx, -10, -4, 22, 4, PAL.bike);
    drawPixelRect(ctx, 10, -8, 4, 6, PAL.bikeDark);
    drawPixelRect(ctx, -6, 2, 8, 4, PAL.bikeDark);
    drawPixelRect(ctx, -18, 0, 6, 3, "#888");
    drawPixelRect(ctx, -2, -16, 8, 12, PAL.rider);
    drawPixelRect(ctx, 0, -14, 4, 8, PAL.riderDark);
    drawPixelRect(ctx, 6, -12, 6, 3, PAL.rider);
    drawPixelRect(ctx, -2, -22, 10, 8, PAL.helmet);
    drawPixelRect(ctx, 6, -20, 4, 4, PAL.helmetVisor);
    drawPixelRect(ctx, -4, -4, 4, 6, PAL.rider);
    drawPixelRect(ctx, 4, -4, 4, 6, PAL.rider);
  }
  ctx.restore();
}

function drawAnswerSign(ctx, x, cy, w, h, label, isActive, isHit, isCorrect) {
  const top = cy - h / 2;
  drawPixelRect(ctx, x + 3, top + 3, w, h, "rgba(0,0,0,0.3)");
  const bg = isHit ? (isCorrect ? PAL.rampCorrect : PAL.rampWrong) : PAL.answerBox;
  drawPixelRect(ctx, x, top, w, h, bg);
  ctx.strokeStyle = isActive ? PAL.star : PAL.answerBoxBorder;
  ctx.lineWidth = isActive ? 3 : 1;
  ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
  if (isActive && !isHit) {
    drawPixelRect(ctx, x + 2, top + 2, w - 4, 3, "rgba(255,255,255,0.3)");
    ctx.fillStyle = PAL.star;
    ctx.beginPath(); ctx.moveTo(x-8,cy); ctx.lineTo(x-2,cy-5); ctx.lineTo(x-2,cy+5); ctx.closePath(); ctx.fill();
  }
  if (label !== undefined) {
    ctx.fillStyle = PAL.text; ctx.strokeStyle = PAL.textShadow; ctx.lineWidth = 2.5;
    ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.strokeText(String(label), x+w/2, cy+1); ctx.fillText(String(label), x+w/2, cy+1);
    ctx.textBaseline = "alphabetic";
  }
}

function drawJumpRamp(ctx, x, cy, w, h) {
  const bottom = cy + h/2, top = cy - h/2;
  ctx.fillStyle = PAL.jumpRamp;
  ctx.beginPath(); ctx.moveTo(x,bottom); ctx.lineTo(x+w*0.8,top); ctx.lineTo(x+w,top+h*0.3); ctx.lineTo(x+w,bottom); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.jumpRampDark;
  ctx.beginPath(); ctx.moveTo(x+w*0.8,top); ctx.lineTo(x+w,top+h*0.3); ctx.lineTo(x+w,bottom); ctx.lineTo(x+w*0.8,bottom); ctx.closePath(); ctx.fill();
  for (let i=0;i<3;i++) { const sx=x+6+i*10, progress=(sx-x)/(w*0.8), sy=bottom-progress*h; drawPixelRect(ctx,sx,sy,4,Math.max(4,progress*h*0.5),PAL.rampDark); }
  ctx.fillStyle = PAL.text; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.fillText("JUMP!", x+w/2, cy+2);
}

function drawObstacle(ctx, x, cy, type) {
  switch (type) {
    case "cone":
      drawPixelRect(ctx,x+2,cy+6,12,4,PAL.coneDark);
      ctx.fillStyle=PAL.cone; ctx.beginPath(); ctx.moveTo(x+3,cy+6); ctx.lineTo(x+8,cy-8); ctx.lineTo(x+13,cy+6); ctx.closePath(); ctx.fill();
      drawPixelRect(ctx,x+5,cy-2,6,2,PAL.coneStripe); break;
    case "barrel":
      drawPixelRect(ctx,x,cy-6,16,16,PAL.barrel); drawPixelRect(ctx,x+1,cy-5,14,2,PAL.barrelBand);
      drawPixelRect(ctx,x+1,cy+3,14,2,PAL.barrelBand); drawPixelRect(ctx,x+2,cy-2,12,6,PAL.barrelDark); break;
    case "bump":
      ctx.fillStyle=PAL.bump; ctx.beginPath(); ctx.moveTo(x,cy+8); ctx.quadraticCurveTo(x+16,cy-6,x+32,cy+8); ctx.closePath(); ctx.fill();
      ctx.fillStyle=PAL.bumpDark; ctx.beginPath(); ctx.moveTo(x+4,cy+8); ctx.quadraticCurveTo(x+16,cy-2,x+28,cy+8); ctx.closePath(); ctx.fill();
      drawPixelRect(ctx,x+8,cy+1,3,3,PAL.star); drawPixelRect(ctx,x+18,cy+1,3,3,PAL.star); break;
    case "double_bump":
      for (let b=0;b<2;b++) { const bx=x+b*28;
        ctx.fillStyle=PAL.bump; ctx.beginPath(); ctx.moveTo(bx,cy+8); ctx.quadraticCurveTo(bx+12,cy-5,bx+24,cy+8); ctx.closePath(); ctx.fill();
        ctx.fillStyle=PAL.bumpDark; ctx.beginPath(); ctx.moveTo(bx+3,cy+8); ctx.quadraticCurveTo(bx+12,cy-1,bx+21,cy+8); ctx.closePath(); ctx.fill();
        drawPixelRect(ctx,bx+8,cy+2,3,2,PAL.star); } break;
    case "tires":
      for (let t=0;t<2;t++) { const ty=cy+2-t*10;
        drawPixelRect(ctx,x+1,ty,14,10,PAL.wheel); drawPixelRect(ctx,x+3,ty+2,10,6,"#444"); drawPixelRect(ctx,x+5,ty+3,6,4,"#666"); } break;
  }
}

function generateObstacles(worldXStart, worldXEnd) {
  const obstacles = [];
  const types = ["cone","barrel","bump","double_bump","tires"];
  const count = 2 + Math.floor(Math.random()*3);
  for (let i=0; i<count; i++) {
    const spacing = (worldXEnd - worldXStart) / (count+1);
    obstacles.push({
      worldX: worldXStart + spacing*(i+1) + (Math.random()-0.5)*30,
      lane: Math.floor(Math.random()*LANE_COUNT),
      type: types[Math.floor(Math.random()*types.length)],
      width: 32, hit: false,
    });
  }
  return obstacles;
}

function drawText(ctx, text, x, y, size=16, color=PAL.text, align="center") {
  ctx.font = `bold ${size}px monospace`; ctx.textAlign = align;
  ctx.fillStyle = PAL.textShadow; ctx.fillText(text, x+1, y+1);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

// ─── PARTICLE SYSTEM ───
class Particles {
  constructor() { this.items = []; }
  emit(x, y, count, color, speedMul=1) {
    for (let i=0; i<count; i++) this.items.push({
      x, y, vx:(Math.random()-0.5)*4*speedMul, vy:-Math.random()*3*speedMul-1,
      life:20+Math.random()*20, maxLife:40, color, size:2+Math.random()*3
    });
  }
  update() { this.items = this.items.filter(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.15; p.life--; return p.life>0; }); }
  draw(ctx) { this.items.forEach(p => { ctx.globalAlpha=p.life/p.maxLife; drawPixelRect(ctx,p.x,p.y,p.size,p.size,p.color); }); ctx.globalAlpha=1; }
}

// ─── MAIN COMPONENT ───
export default function ExciteMathBike() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const gameState = useRef(null);
  const keysRef = useRef({});
  const touchRef = useRef({ up:false, down:false, left:false, right:false });
  const canvasTouchRef = useRef({ left:false, right:false });
  const soundRef = useRef(new SoundEngine());
  const animRef = useRef(null);
  const engineTimerRef = useRef(0);
  const [screen, setScreen] = useState("title"); // title | playing | paused | win | gameover
  const [year, setYear] = useState(null);
  const [scale, setScale] = useState(1); // canvas CSS scale factor

  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const s = Math.min(containerRef.current.clientWidth / GAME_W, containerRef.current.clientHeight / GAME_H);
      setScale(Math.max(1, Math.floor(s)) || 1);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard — including Escape for pause
  useEffect(() => {
    const down = (e) => {
      if (e.key === "Escape") {
        setScreen(prev => prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev);
        return;
      }
      keysRef.current[e.key] = true;
    };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  function createAnswerSigns(problem, worldX) {
    return problem.options.map((opt, i) => ({
      worldX, lane: i, value: opt, correct: opt === problem.answer,
      width: 52, height: 30, hit: false,
    }));
  }

  const startGame = useCallback((selectedYear) => {
    soundRef.current.init();
    soundRef.current.play("select");
    setYear(selectedYear);
    canvasTouchRef.current = { left: false, right: false };
    gameState.current = {
      currentSpeed: getDynamicSpeed(0, TOTAL_QUESTIONS, SCROLL_SPEED, MAX_SPEED_MULTIPLIER),
      bikeX: 80, bikeY: laneCenter(1), lane: 1, targetLane: 1,
      vy: 0, airborne: false, rotation: 0,
      wheelieAngle: 0, doingWheelie: false,
      spinCount: 0, flipCount: 0, trickPoints: 0,
      crashed: false, crashTimer: 0, invincible: 0,
      scrollX: 0, particles: new Particles(),
      score: 0, lives: 3, combo: 1,
      questionsAnswered: 0, year: selectedYear,
      currentProblem: null,
      answerSigns: [],
      // answeredThisRound=true + questionDelay gives the player ~2s to orient before Q1
      answeredThisRound: true, questionDelay: 120,
      jumpRamp: null, waitingForJump: false, lastQuestion: false,
      obstacles: [],
      dustTimer: 0, trickDisplay: "READY!", trickDisplayTimer: 80,
    };
    setScreen("playing");
  }, []);

  // ─── GAME LOOP ───
  useEffect(() => {
    if (screen !== "playing") {
      // If paused, stop the loop
      if (animRef.current && screen === "paused") cancelAnimationFrame(animRef.current);
      if (screen !== "playing" && screen !== "paused") return;
      if (screen === "paused") return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    function loop() {
      const gs = gameState.current;
      if (!gs) return;
      update(gs);
      draw(gs, ctx);
      animRef.current = requestAnimationFrame(loop);
    }

    function update(gs) {
      const keys = keysRef.current;
      const touch = touchRef.current;

      if (gs.crashed) {
        gs.crashTimer--;
        gs.particles.update();
        if (gs.crashTimer <= 0) {
          gs.crashed = false; gs.invincible = 90; gs.rotation = 0; gs.wheelieAngle = 0;
          gs.bikeY = laneCenter(gs.lane); gs.vy = 0; gs.airborne = false;
        }
        gs.scrollX += gs.currentSpeed * 0.3;
        return;
      }

      gs.scrollX += gs.currentSpeed;
      engineTimerRef.current++;
      if (engineTimerRef.current % 14 === 0) soundRef.current.play("engine");

      gs.dustTimer++;
      if (!gs.airborne && gs.dustTimer % 8 === 0)
        gs.particles.emit(gs.bikeX - 16, gs.bikeY + 10, 2, PAL.dust, 0.5);

      // ── Wheelie mechanic (grounded only, not during a jump) ──
      if (!gs.airborne) {
        const wantWheelie = keys["ArrowLeft"] || keys["a"] || keys["A"] || touch.left || canvasTouchRef.current.left;
        if (wantWheelie) {
          gs.doingWheelie = true;
          gs.wheelieAngle = Math.min(gs.wheelieAngle + WHEELIE_SPEED, WHEELIE_CRASH + 0.05);
          // Crash if tilted too far
          if (gs.wheelieAngle >= WHEELIE_CRASH) {
            triggerCrash(gs, "TIPPED OVER!");
            return;
          }
        } else {
          // Ease back down
          gs.wheelieAngle = Math.max(0, gs.wheelieAngle - 0.04);
          if (gs.wheelieAngle < 0.02) { gs.wheelieAngle = 0; gs.doingWheelie = false; }
        }
      } else {
        gs.wheelieAngle = 0;
        gs.doingWheelie = false;
      }

      // Lane switching (grounded only)
      if (!gs.airborne) {
        if ((keys["ArrowUp"] || keys["w"] || keys["W"] || touch.up) && gs.targetLane < LANE_COUNT - 1) {
          gs.targetLane++; keys["ArrowUp"]=false; keys["w"]=false; keys["W"]=false; touch.up=false;
          soundRef.current.play("select");
        }
        if ((keys["ArrowDown"] || keys["s"] || keys["S"] || touch.down) && gs.targetLane > 0) {
          gs.targetLane--; keys["ArrowDown"]=false; keys["s"]=false; keys["S"]=false; touch.down=false;
          soundRef.current.play("select");
        }
        const targetY = laneCenter(gs.targetLane);
        gs.bikeY += (targetY - gs.bikeY) * 0.3;
        if (Math.abs(gs.bikeY - targetY) < 1) gs.bikeY = targetY;
        gs.lane = gs.targetLane;
      }

      // ── Airborne ──
      if (gs.airborne) {
        gs.vy += GRAVITY;
        gs.bikeY += gs.vy;

        // Tricks
        if (keys["ArrowUp"] || keys["w"] || keys["W"] || touch.up) {
          gs.rotation -= FLIP_SPEED;
          if (Math.abs(gs.rotation) >= Math.PI * 2) {
            gs.flipCount++; gs.rotation %= (Math.PI*2);
            gs.trickPoints += 100*gs.combo;
            gs.trickDisplay = `FLIP x${gs.flipCount}! +${100*gs.combo}`;
            gs.trickDisplayTimer = 40;
            soundRef.current.play("trick");
            gs.particles.emit(gs.bikeX, gs.bikeY, 5, PAL.star, 1.5);
          }
        }
        if (keys["ArrowDown"] || keys["s"] || keys["S"] || touch.down) {
          gs.rotation += FLIP_SPEED;
          if (Math.abs(gs.rotation) >= Math.PI * 2) {
            gs.flipCount++; gs.rotation %= (Math.PI*2);
            gs.trickPoints += 100*gs.combo;
            gs.trickDisplay = `BACKFLIP x${gs.flipCount}! +${100*gs.combo}`;
            gs.trickDisplayTimer = 40;
            soundRef.current.play("trick");
            gs.particles.emit(gs.bikeX, gs.bikeY, 5, PAL.star, 1.5);
          }
        }
        if (keys["ArrowLeft"] || keys["a"] || keys["A"] || touch.left || canvasTouchRef.current.left) {
          gs.rotation -= SPIN_SPEED;
          // Award points at each quarter-turn (by absolute rotation)
          if (gs.spinCount < 3 && Math.abs(gs.rotation) > Math.PI*0.5*(gs.spinCount+1)) {
            gs.spinCount++; gs.trickPoints += 75*gs.combo;
            gs.trickDisplay = `SPIN x${gs.spinCount}! +${75*gs.combo}`;
            gs.trickDisplayTimer = 40; soundRef.current.play("trick");
          }
        }
        if (keys["ArrowRight"] || keys["d"] || keys["D"] || touch.right || canvasTouchRef.current.right) {
          gs.rotation += SPIN_SPEED;
          // Right spin also earns trick points (positive rotation threshold)
          if (gs.spinCount < 3 && gs.rotation > Math.PI*0.5*(gs.spinCount+1)) {
            gs.spinCount++; gs.trickPoints += 75*gs.combo;
            gs.trickDisplay = `SPIN x${gs.spinCount}! +${75*gs.combo}`;
            gs.trickDisplayTimer = 40; soundRef.current.play("trick");
          }
        }

        // Landing
        const groundLevel = laneCenter(gs.lane);
        if (gs.bikeY >= groundLevel) {
          gs.bikeY = groundLevel; gs.vy = 0; gs.airborne = false;
          gs.score += gs.trickPoints;

          const normRot = ((gs.rotation % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
          const landAngle = Math.min(normRot, Math.PI*2 - normRot); // how far from upright

          if (landAngle < LAND_PERFECT) {
            // Perfect landing!
            gs.rotation = 0;
            const bonus = gs.trickPoints > 0 ? 50 : 0;
            if (bonus > 0) {
              gs.score += bonus;
              gs.trickDisplay = `PERFECT LANDING! +${bonus}`;
              gs.trickDisplayTimer = 45;
              soundRef.current.play("perfect");
              gs.particles.emit(gs.bikeX, gs.bikeY + 6, 10, PAL.perfect, 1.5);
            }
          } else if (landAngle < LAND_OK) {
            // Rough landing — bounce back to flat, no crash
            gs.rotation = 0;
            soundRef.current.play("bounce");
            gs.particles.emit(gs.bikeX, gs.bikeY + 8, 6, PAL.dust, 1);
            if (gs.trickPoints > 0) {
              gs.trickDisplay = "GOOD LANDING";
              gs.trickDisplayTimer = 30;
            }
          } else {
            // Crash!
            triggerCrash(gs, "OUCH!");
          }
          gs.flipCount = 0; gs.spinCount = 0; gs.trickPoints = 0;
        }
      }

      if (gs.invincible > 0) gs.invincible--;
      if (gs.trickDisplayTimer > 0) gs.trickDisplayTimer--;

      // ── Answer sign collision ──
      if (!gs.answeredThisRound && !gs.airborne) {
        for (const sign of gs.answerSigns) {
          if (sign.hit) continue;
          const signScreenX = sign.worldX - gs.scrollX;
          const signCY = laneCenter(sign.lane);
          if (gs.bikeX+16 > signScreenX && gs.bikeX-16 < signScreenX+sign.width && Math.abs(gs.bikeY-signCY) < LANE_H/2) {
            sign.hit = true; gs.answeredThisRound = true;
            if (sign.correct) {
              soundRef.current.play("correct");
              gs.score += 50*gs.combo; gs.combo = Math.min(gs.combo+1, 5);
              gs.questionsAnswered++; gs.particles.emit(gs.bikeX,gs.bikeY,12,PAL.star,2);
              gs.trickDisplay = "CORRECT!"; gs.trickDisplayTimer = 50;
              gs.jumpRamp = { worldX: sign.worldX+120, lane: gs.lane, width: 48, height: 32, active: true };
              gs.waitingForJump = true;
              if (gs.questionsAnswered >= TOTAL_QUESTIONS) gs.lastQuestion = true;
            } else {
              soundRef.current.play("wrong"); gs.combo = 1; gs.questionsAnswered++;
              if (gs.invincible <= 0) {
                gs.lives--;
                if (gs.lives <= 0) { triggerCrash(gs,"WRONG!"); setTimeout(()=>{soundRef.current.play("gameover");setScreen("gameover");},1500); return; }
                else triggerCrash(gs,"WRONG!");
              } else { gs.trickDisplay="WRONG!"; gs.trickDisplayTimer=50; }
              if (gs.questionsAnswered>=TOTAL_QUESTIONS) setTimeout(()=>{soundRef.current.play("win");setScreen("win");},1500);
              else gs.questionDelay = 110;
            }
          }
        }
      }

      // ── Jump ramp collision ──
      if (gs.jumpRamp && gs.jumpRamp.active && !gs.airborne) {
        const jr = gs.jumpRamp;
        const jrScreenX = jr.worldX - gs.scrollX;
        const jrCY = laneCenter(jr.lane);
        if (gs.bikeX+16 > jrScreenX && gs.bikeX-16 < jrScreenX+jr.width && Math.abs(gs.bikeY-jrCY) < LANE_H/2) {
          jr.active = false; gs.waitingForJump = false;
          gs.airborne = true; gs.vy = -7.5; // lower launch so stays more on-screen
          gs.flipCount=0; gs.spinCount=0; gs.trickPoints=0; gs.wheelieAngle=0;
          soundRef.current.play("jump");
          gs.particles.emit(gs.bikeX,gs.bikeY,10,PAL.jumpRamp,2);
          gs.trickDisplay = "BIG AIR! DO TRICKS!"; gs.trickDisplayTimer = 60;
          if (gs.lastQuestion) setTimeout(()=>{soundRef.current.play("win");setScreen("win");},2500);
          else gs.questionDelay = 120;
        }
      }

      // Jump ramp missed
      if (gs.jumpRamp && gs.jumpRamp.active && gs.jumpRamp.worldX - gs.scrollX < -80) {
        gs.jumpRamp.active = false; gs.waitingForJump = false;
        if (gs.lastQuestion) setTimeout(()=>{soundRef.current.play("win");setScreen("win");},1000);
        else gs.questionDelay = 60;
      }

      // ── Obstacle collision ──
      if (!gs.airborne && !gs.crashed) {
        for (const obs of gs.obstacles) {
          if (obs.hit) continue;
          const osx = obs.worldX - gs.scrollX;
          if (osx < -60 || osx > GAME_W+60) continue;
          const obsCY = laneCenter(obs.lane);
          if (gs.bikeX+14 > osx && gs.bikeX-14 < osx+obs.width && Math.abs(gs.bikeY-obsCY) < LANE_H/2-4) {
            obs.hit = true;
            const isBump = obs.type==="bump"||obs.type==="double_bump";
            if (isBump) {
              gs.airborne=true; gs.vy=-3.5; gs.wheelieAngle=0;
              gs.particles.emit(gs.bikeX,gs.bikeY+6,4,PAL.dust,1);
              soundRef.current.play("land");
            } else if (gs.doingWheelie && gs.wheelieAngle > 0.1) {
              // Wheelie-hop over obstacle — same small hop as a bump
              gs.airborne=true; gs.vy=-3.5; gs.wheelieAngle=0;
              gs.particles.emit(gs.bikeX,gs.bikeY+6,4,PAL.dust,1);
              soundRef.current.play("land");
              gs.trickDisplay = "WHEELIE! +10"; gs.trickDisplayTimer = 30;
              gs.score += 10;
            } else {
              gs.particles.emit(gs.bikeX,gs.bikeY,6,PAL.explosion,1);
              gs.score = Math.max(0, gs.score-10);
              gs.trickDisplay = "OUCH! -10"; gs.trickDisplayTimer = 30;
              soundRef.current.play("land");
            }
          }
        }
        gs.obstacles = gs.obstacles.filter(o => o.worldX - gs.scrollX > -100);
      }

      // Answer signs all missed
      if (!gs.answeredThisRound && !gs.waitingForJump) {
        if (gs.answerSigns.every(s => s.worldX+s.width-gs.scrollX < -20)) {
          gs.answeredThisRound=true; gs.combo=1; gs.questionsAnswered++;
          if (gs.invincible<=0) { gs.lives--; if (gs.lives<=0) { triggerCrash(gs,"MISSED!"); setTimeout(()=>{soundRef.current.play("gameover");setScreen("gameover");},1500); return; } }
          gs.trickDisplay="MISSED!"; gs.trickDisplayTimer=40;
          if (gs.questionsAnswered>=TOTAL_QUESTIONS) setTimeout(()=>{soundRef.current.play("win");setScreen("win");},1000);
          else gs.questionDelay=60;
        }
      }

      // Spawn next question
      if (gs.questionDelay > 0) {
        gs.questionDelay--;
        if (gs.questionDelay === 0) {
          const problem = genProblem(gs.year, gs.questionsAnswered);
          gs.currentProblem = problem;
          gs.currentSpeed = getDynamicSpeed(gs.questionsAnswered, TOTAL_QUESTIONS, SCROLL_SPEED, MAX_SPEED_MULTIPLIER);
          const questionWorldX = gs.scrollX + GAME_W + 180;
          gs.answerSigns = createAnswerSigns(problem, questionWorldX);
          gs.answeredThisRound=false; gs.jumpRamp=null; gs.waitingForJump=false; gs.lastQuestion=false;
          const obsStart = gs.scrollX + GAME_W + 20, obsEnd = questionWorldX - 60;
          if (obsEnd > obsStart + 50) gs.obstacles = gs.obstacles.concat(generateObstacles(obsStart, obsEnd));
        }
      }

      gs.particles.update();
    }

    function triggerCrash(gs, msg) {
      gs.crashed=true; gs.crashTimer=60; gs.airborne=false; gs.wheelieAngle=0;
      soundRef.current.play("crash");
      gs.particles.emit(gs.bikeX,gs.bikeY,15,PAL.explosion,2);
      gs.particles.emit(gs.bikeX,gs.bikeY,10,"#888",1.5);
      gs.trickDisplay=msg; gs.trickDisplayTimer=50;
    }

    function draw(gs, ctx) {
      // Sky
      ctx.fillStyle=PAL.sky; ctx.fillRect(0,0,GAME_W,GAME_H);
      for (let i=0;i<5;i++) { ctx.fillStyle=i%2===0?PAL.skyLight:PAL.sky; ctx.fillRect(0,i*12,GAME_W,12); }

      // Mountains
      ctx.fillStyle="#3858a8";
      for (let i=0;i<8;i++) { const mx=i*120-(gs.scrollX*0.15)%120; ctx.beginPath(); ctx.moveTo(mx,100); ctx.lineTo(mx+60,50+(i%3)*15); ctx.lineTo(mx+120,100); ctx.closePath(); ctx.fill(); }

      // Clouds
      for (let i=0;i<5;i++) { const cx=((i*150+30)-gs.scrollX*0.08)%(GAME_W+100)-50; drawPixelRect(ctx,cx,25+i*10,32,8,"#fcfcfc"); drawPixelRect(ctx,cx+8,20+i*10,16,6,"#fcfcfc"); }

      // Ground
      const groundTop = ROAD_BOTTOM + 4;
      ctx.fillStyle=PAL.ground; ctx.fillRect(0,groundTop,GAME_W,GAME_H-groundTop);
      ctx.fillStyle=PAL.groundDark; ctx.fillRect(0,groundTop,GAME_W,3);

      // Lanes
      for (let lane=0; lane<LANE_COUNT; lane++) {
        const lt = laneTop(lane);
        const isActive = gs.lane === lane;
        ctx.fillStyle = lane%2===0 ? PAL.road : PAL.roadAlt;
        ctx.fillRect(0, lt, GAME_W, LANE_H);
        if (isActive && !gs.airborne) { ctx.fillStyle=PAL.laneHighlight; ctx.fillRect(0,lt,GAME_W,LANE_H); }
        const cy = laneCenter(lane);
        for (let dx=-(gs.scrollX%24); dx<GAME_W; dx+=24) drawPixelRect(ctx,dx,cy-1,12,2,PAL.roadLine);
        drawPixelRect(ctx,0,lt,GAME_W,2,PAL.roadBorder);
        drawPixelRect(ctx,0,lt+LANE_H-2,GAME_W,2,PAL.roadBorder);
      }

      // Lane labels
      for (let lane=0;lane<LANE_COUNT;lane++) {
        const cy=laneCenter(lane);
        ctx.fillStyle="rgba(0,0,0,0.35)"; ctx.fillRect(2,cy-8,16,16);
        drawText(ctx, String(lane+1), 10, cy+4, 9, PAL.roadLine);
      }

      // Obstacles
      gs.obstacles.forEach(obs => { if (obs.hit) return; const ox=obs.worldX-gs.scrollX; if (ox>-60&&ox<GAME_W+60) drawObstacle(ctx,ox,laneCenter(obs.lane),obs.type); });

      // Answer signs
      gs.answerSigns.forEach(sign => {
        const sx=sign.worldX-gs.scrollX;
        if (sx>-80&&sx<GAME_W+80) drawAnswerSign(ctx,sx,laneCenter(sign.lane),sign.width,sign.height,sign.value,gs.lane===sign.lane&&!gs.airborne&&!sign.hit,sign.hit,sign.correct);
      });

      // Jump ramp
      if (gs.jumpRamp&&gs.jumpRamp.active) { const jr=gs.jumpRamp,jrX=jr.worldX-gs.scrollX; if(jrX>-80&&jrX<GAME_W+80) drawJumpRamp(ctx,jrX,laneCenter(jr.lane),jr.width,jr.height); }

      // Bike
      if (!(gs.invincible>0&&Math.floor(gs.invincible/3)%2===0))
        drawBike(ctx, gs.bikeX, gs.bikeY, gs.rotation, gs.crashed, gs.airborne ? 0 : -gs.wheelieAngle);

      // Wheelie indicator
      if (gs.doingWheelie && !gs.airborne && !gs.crashed) {
        const pct = gs.wheelieAngle / WHEELIE_CRASH;
        const color = pct < 0.6 ? PAL.rampCorrect : pct < 0.85 ? PAL.star : PAL.explosion;
        drawPixelRect(ctx, gs.bikeX - 12, gs.bikeY - 32, 24 * pct, 3, color);
        drawPixelRect(ctx, gs.bikeX - 12, gs.bikeY - 32, 24, 3, "rgba(255,255,255,0.2)");
      }

      gs.particles.draw(ctx);

      // Question bubble
      if (gs.currentProblem && !gs.answeredThisRound) {
        const qText = `  ${gs.currentProblem.question} = ?  `;
        ctx.font="bold 14px monospace";
        const qw=Math.max(ctx.measureText(qText).width+20,120), qx=GAME_W/2-qw/2;
        ctx.fillStyle="rgba(0,0,0,0.8)"; ctx.fillRect(qx,6,qw,30);
        ctx.strokeStyle=PAL.star; ctx.lineWidth=2; ctx.strokeRect(qx,6,qw,30);
        drawText(ctx,qText,GAME_W/2,26,14,PAL.star);
        drawText(ctx,`Q${gs.questionsAnswered+1}/${TOTAL_QUESTIONS}`,GAME_W/2,48,9,PAL.riderDark);
      }

      // Trick/message display
      if (gs.trickDisplayTimer>0 && gs.trickDisplay) {
        ctx.globalAlpha = Math.min(1, gs.trickDisplayTimer/15);
        const dy = gs.airborne ? -50 : -30;
        drawText(ctx, gs.trickDisplay, GAME_W/2, GAME_H/2+dy, 14, PAL.star);
        ctx.globalAlpha = 1;
      }

      // ── HUD ──
      // Score
      ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(4,GAME_H-26,95,20);
      drawText(ctx,`SCORE: ${gs.score}`,52,GAME_H-11,10,PAL.text);

      // Lives
      for (let i=0;i<gs.lives;i++) {
        drawPixelRect(ctx,GAME_W-60+i*18,GAME_H-24,14,14,PAL.bike);
        drawText(ctx,"♥",GAME_W-53+i*18,GAME_H-11,11,PAL.text);
      }

      // Combo
      if (gs.combo>1) drawText(ctx,`x${gs.combo} COMBO`,GAME_W/2,GAME_H-18,10,PAL.star);

      // Progress bar
      const progW = 120, progH = 8, progX = GAME_W/2-progW/2, progY = GAME_H-10;
      const progFill = Math.min(1, gs.questionsAnswered / TOTAL_QUESTIONS);
      ctx.fillStyle=PAL.progressBg; ctx.fillRect(progX,progY,progW,progH);
      ctx.fillStyle=PAL.progressFill; ctx.fillRect(progX,progY,progW*progFill,progH);
      ctx.strokeStyle=PAL.progressBorder; ctx.lineWidth=1; ctx.strokeRect(progX,progY,progW,progH);
      drawText(ctx,`${gs.questionsAnswered}/${TOTAL_QUESTIONS}`,GAME_W/2,progY-2,7,PAL.text);

      // Year
      drawText(ctx,`YEAR ${gs.year}`,52,GAME_H-1,8,PAL.riderDark);

      // Controls hint
      if (gs.airborne) drawText(ctx,"↑↓ FLIP  ←→ SPIN  (or tap left/right of rider)",GAME_W/2,GAME_H-1,7,"#88a8ff");
    }

    animRef.current = requestAnimationFrame(loop);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [screen]);

  const handleTouch = (dir, isDown) => { touchRef.current[dir] = isDown; };

  // Canvas click/tap: lane switching by tapping the lane strip,
  // wheelie/spin by tapping left or right of the rider.
  function handleCanvasDown(e) {
    e.preventDefault();
    const gs = gameState.current;
    if (!gs) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    const cx = (src.clientX - rect.left) / scale;
    const cy = (src.clientY - rect.top)  / scale;

    // ── Lane switch: tap anywhere in a different lane row ──
    const roadTop = laneTop(LANE_COUNT - 1);
    if (cy >= roadTop && cy <= ROAD_BOTTOM + 4) {
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        const lt = laneTop(lane);
        if (cy >= lt && cy < lt + LANE_H) {
          if (lane !== gs.targetLane) {
            gs.targetLane = lane;
            soundRef.current.play("select");
          }
          break;
        }
      }
    }

    // ── Left/right of rider → wheelie (grounded) or spin (airborne) ──
    if (cx < gs.bikeX) {
      canvasTouchRef.current.left = true;
    } else {
      canvasTouchRef.current.right = true;
    }
  }

  function handleCanvasUp(e) {
    e.preventDefault();
    canvasTouchRef.current.left  = false;
    canvasTouchRef.current.right = false;
  }

  const canvasStyle = { width: GAME_W*scale, height: GAME_H*scale, imageRendering: "pixelated" };

  // ─── TITLE SCREEN ───
  if (screen === "title") {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full" style={{ background:"#1a1a2e", fontFamily:"monospace" }}>
        <div className="text-center p-4" style={{ maxWidth:480 }}>
          <h1 className="text-3xl md:text-5xl font-bold mb-2" style={{ color:PAL.star, textShadow:"3px 3px 0 #a03000" }}>MOTOMATH!</h1>
          <p className="text-sm md:text-base mb-1" style={{ color:PAL.skyLight }}>Answer questions → Hit the jump → Do tricks!</p>
          <p className="text-xs mb-5" style={{ color:PAL.riderDark }}>Hold ◄ to wheelie over obstacles · speed builds as you go!</p>
          <p className="text-xs mb-3 font-bold" style={{ color:PAL.text }}>CHOOSE YOUR YEAR</p>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1,2,3,4,5,6].map(y=>(
              <button key={y} onClick={()=>startGame(y)} className="font-bold py-3 px-4 rounded-lg text-lg md:text-xl transition-transform active:scale-95"
                style={{ background:PAL.ramp, color:"#222", border:"3px solid #c87800", minHeight:56 }}>
                Year {y}
              </button>
            ))}
          </div>
          <div className="text-xs" style={{ color:PAL.riderDark }}>
            <p>Keys: ↑↓ change lanes &amp; flip · ← wheelie/spin · → spin · Esc pause</p>
            <p>Mouse/touch: tap a lane to switch · tap left/right of rider to wheelie or spin</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── PAUSE SCREEN ───
  if (screen === "paused") {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full" style={{ background:"#1a1a2e", fontFamily:"monospace" }}>
        <div className="text-center p-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color:PAL.star, textShadow:"3px 3px 0 #a03000" }}>PAUSED</h1>
          <div className="flex flex-col gap-3" style={{ minWidth: 220 }}>
            <button onClick={()=>setScreen("playing")} className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
              style={{ background:PAL.rampCorrect, color:PAL.text, border:"3px solid #007800" }}>
              RESUME
            </button>
            <button onClick={()=>{if(year) startGame(year);}} className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
              style={{ background:PAL.ramp, color:"#222", border:"3px solid #c87800" }}>
              RESTART
            </button>
            <button onClick={()=>setScreen("title")} className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
              style={{ background:PAL.explosion, color:PAL.text, border:"3px solid #a00030" }}>
              QUIT
            </button>
          </div>
          <p className="text-xs mt-4" style={{ color:PAL.riderDark }}>Press Esc to resume</p>
        </div>
      </div>
    );
  }

  // ─── WIN SCREEN ───
  if (screen === "win") {
    const finalScore = gameState.current?.score || 0;
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full" style={{ background:"#1a1a2e", fontFamily:"monospace" }}>
        <div className="text-center p-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color:PAL.star, textShadow:"3px 3px 0 #a03000" }}>YOU WIN!</h1>
          <p className="text-2xl mb-2" style={{ color:PAL.text }}>FINAL SCORE: {finalScore}</p>
          <p className="text-lg mb-6" style={{ color:PAL.skyLight }}>Year {year} Complete!</p>
          <button onClick={()=>setScreen("title")} className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
            style={{ background:PAL.rampCorrect, color:PAL.text, border:"3px solid #007800" }}>PLAY AGAIN</button>
        </div>
      </div>
    );
  }

  // ─── GAME OVER SCREEN ───
  if (screen === "gameover") {
    const finalScore = gameState.current?.score || 0;
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full" style={{ background:"#1a1a2e", fontFamily:"monospace" }}>
        <div className="text-center p-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color:PAL.explosion, textShadow:"3px 3px 0 #600" }}>GAME OVER</h1>
          <p className="text-2xl mb-2" style={{ color:PAL.text }}>SCORE: {finalScore}</p>
          <p className="text-lg mb-6" style={{ color:PAL.skyLight }}>Answered {gameState.current?.questionsAnswered||0}/{TOTAL_QUESTIONS}</p>
          <button onClick={()=>setScreen("title")} className="font-bold py-3 px-8 rounded-lg text-xl transition-transform active:scale-95"
            style={{ background:PAL.ramp, color:"#222", border:"3px solid #c87800" }}>TRY AGAIN</button>
        </div>
      </div>
    );
  }

  // ─── PLAYING SCREEN ───
  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen w-full select-none" style={{ background:"#1a1a2e", touchAction:"none" }}>
      {/* Pause button */}
      <div className="w-full flex justify-end px-2 mb-1" style={{ maxWidth: GAME_W*scale }}>
        <button onClick={()=>setScreen("paused")} className="font-bold rounded px-3 py-1 text-sm transition-transform active:scale-90"
          style={{ background:"rgba(255,255,255,0.15)", color:PAL.text, fontFamily:"monospace", border:"1px solid rgba(255,255,255,0.3)" }}>
          ⏸ PAUSE
        </button>
      </div>
      <canvas ref={canvasRef} width={GAME_W} height={GAME_H} style={canvasStyle} className="block"
        onMouseDown={handleCanvasDown} onMouseUp={handleCanvasUp} onMouseLeave={handleCanvasUp}
        onTouchStart={handleCanvasDown} onTouchEnd={handleCanvasUp} onTouchCancel={handleCanvasUp}
      />
      {/* Mobile controls */}
      <div className="flex justify-between w-full px-3 mt-2" style={{ maxWidth: GAME_W*scale }}>
        {/* Left - lanes */}
        <div className="flex flex-col items-center gap-1">
          <button onTouchStart={e=>{e.preventDefault();handleTouch("up",true)}} onTouchEnd={e=>{e.preventDefault();handleTouch("up",false)}}
            onMouseDown={()=>handleTouch("up",true)} onMouseUp={()=>handleTouch("up",false)}
            className="font-bold rounded-lg active:scale-90 transition-transform"
            style={{ background:PAL.ramp, color:"#222", border:"3px solid #c87800", width:60, height:44, fontSize:20 }}>▲</button>
          <button onTouchStart={e=>{e.preventDefault();handleTouch("down",true)}} onTouchEnd={e=>{e.preventDefault();handleTouch("down",false)}}
            onMouseDown={()=>handleTouch("down",true)} onMouseUp={()=>handleTouch("down",false)}
            className="font-bold rounded-lg active:scale-90 transition-transform"
            style={{ background:PAL.ramp, color:"#222", border:"3px solid #c87800", width:60, height:44, fontSize:20 }}>▼</button>
        </div>
        {/* Right - spins/wheelie */}
        <div className="flex gap-1 items-center">
          <button onTouchStart={e=>{e.preventDefault();handleTouch("left",true)}} onTouchEnd={e=>{e.preventDefault();handleTouch("left",false)}}
            onMouseDown={()=>handleTouch("left",true)} onMouseUp={()=>handleTouch("left",false)}
            className="font-bold rounded-lg active:scale-90 transition-transform"
            style={{ background:PAL.helmet, color:PAL.text, border:"3px solid #1028b0", width:46, height:60, fontSize:20 }}>◄</button>
          <button onTouchStart={e=>{e.preventDefault();handleTouch("right",true)}} onTouchEnd={e=>{e.preventDefault();handleTouch("right",false)}}
            onMouseDown={()=>handleTouch("right",true)} onMouseUp={()=>handleTouch("right",false)}
            className="font-bold rounded-lg active:scale-90 transition-transform"
            style={{ background:PAL.helmet, color:PAL.text, border:"3px solid #1028b0", width:46, height:60, fontSize:20 }}>►</button>
        </div>
      </div>
    </div>
  );
}
