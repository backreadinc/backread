'use client'
import { useState, useRef, useEffect } from 'react'

const C = {
  accent:'#5B50E8', accentLt:'#EEEDFB', accentMd:'#BDB9F4', accentHv:'#4940D4',
  border:'#E4E0DB', borderSt:'#C8C3BC', text:'#0F0F0F',
  textMd:'#6B6868', textSm:'#9B9898', hover:'#F5F3F0', panelSub:'#F7F6F4',
}
const F = "'Inter',-apple-system,sans-serif"
type Mode = 'styles'|'font'|'initials'|'draw'|'upload'

// ═══════════════════════════════════════════════════════════════════════════════
// TRAJECTORY ENGINE
// ─────────────────────────────────────────────────────────────────────────────
// Each letter is a list of pen segments. A segment is an array of [x,y,cluster]
// where cluster=true means points are packed (slow pen = thick stroke).
// Letters connect at baseline. Slant applied globally after.
// Velocity = distance between consecutive samples → width = baseW/√(dist+ε)
// ═══════════════════════════════════════════════════════════════════════════════

function seededRng(seed: number) {
  let s = (seed ^ 0xdeadbeef) >>> 0
  return () => { s ^= s<<13; s ^= s>>17; s ^= s<<5; return (s>>>0)/0xffffffff }
}
function nameSeed(n: string) {
  let h = 5381; for (let i=0;i<n.length;i++) h=((h<<5)+h+n.charCodeAt(i))>>>0; return h||1
}
function vNoise(x: number, seed: number) {
  const fi = (i:number) => { let h=((i*1664525+seed*22695477)^i)*1013904223; return ((h>>>0)&0xffff)/65535 }
  const i=Math.floor(x), f=x-i, u=f*f*(3-2*f)
  return fi(i)*(1-u)+fi(i+1)*u
}

// Catmull-Rom → dense samples
function crSample(pts:[number,number][], i:number, t:number):[number,number] {
  const p0=pts[Math.max(0,i-1)], p1=pts[i], p2=pts[Math.min(pts.length-1,i+1)], p3=pts[Math.min(pts.length-1,i+2)]
  const t2=t*t, t3=t2*t
  return [
    .5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),
    .5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3),
  ]
}
function densify(pts:[number,number][], sps=12):[number,number][] {
  if(pts.length<2) return pts
  const out:[number,number][]=[]
  for(let i=0;i<pts.length-1;i++) for(let j=0;j<sps;j++) out.push(crSample(pts,i,j/sps))
  out.push(pts[pts.length-1]); return out
}

// Render dense trajectory with velocity-based width + noise
function renderTraj(
  ctx:CanvasRenderingContext2D,
  pts:[number,number][],
  color:string, baseW:number,
  wob:number, nSeed:number, alpha=1
) {
  if(pts.length<2) return
  ctx.save(); ctx.strokeStyle=color; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.globalAlpha=alpha
  for(let i=1;i<pts.length;i++){
    const [ax,ay]=pts[i-1],[bx,by]=pts[i]
    const dist=Math.sqrt((bx-ax)**2+(by-ay)**2)
    const w=Math.max(0.22,Math.min(baseW*3.5, baseW*1.8/Math.sqrt(dist*0.5+0.1)))
    const t=i*0.09; const nx=wob*(vNoise(t,nSeed)-.5); const ny=wob*(vNoise(t+44,nSeed+7)-.5)
    ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(ax+nx,ay+ny); ctx.lineTo(bx+nx,by+ny); ctx.stroke()
  }
  ctx.restore()
}

// ── PEN-LIFT: pen leaves paper, moves to new position, touches down again ──────
// Produces separate strokes that share the canvas (not connected)
interface Stroke { pts:[number,number][]; penDown:boolean }

// ── LETTER DEFINITIONS ────────────────────────────────────────────────────────
// Each letter returns control points relative to (ox=leftEdge, bl=baseline)
// h = cap height (negative = up), m = mid height, d = descender height (positive)
// Points packed at apexes/valleys for slow-thick. Spread on straights for thin.
type LetterFn = (ox:number, bl:number, h:number, m:number, d:number, w:number, spd:number, rng:()=>number) => [number,number][][]
// spd: 0=slow/legible … 1=fast/illegible

function cPack(x:number,y:number,n:number,rng:()=>number,j=1.2):[number,number][]{
  // n clustered points near x,y (slow pen = thick)
  return Array.from({length:n},()=>[x+(rng()-.5)*j, y+(rng()-.5)*j] as [number,number])
}

const LETTERS:Record<string,LetterFn> = {
  // ── CAPITALS ──────────────────────────────────────────────────────────────
  M:(ox,bl,h,m,d,w,spd,rng)=>{
    // Bold M: left stroke up, loop, two humps, down
    const lh=h*(0.85+rng()*.15)
    const s1:[number,number][]=[]
    // Entry: pen approaches from below-left
    s1.push([ox-w*.08, bl+h*.18])
    s1.push([ox,       bl+h*.04])
    s1.push(...cPack(ox+w*.04, bl,       2,rng))  // baseline touch - slow
    s1.push(           ...cPack(ox+w*.05, bl+lh*.5,  1,rng))  // rising
    s1.push(           ...cPack(ox+w*.06, bl+lh*.88, 2,rng))  // near apex - slow
    s1.push(           ...cPack(ox+w*.07, bl+lh,     3,rng))  // APEX - clustered = thick
    s1.push([ox+w*.12, bl+lh*.75])                             // falling fast
    s1.push([ox+w*.22, bl+lh*.35])
    s1.push(           ...cPack(ox+w*.32, bl,        2,rng))  // valley - slow
    s1.push([ox+w*.38, bl+lh*(spd>.5?.50:.65)])               // second rise
    s1.push(           ...cPack(ox+w*.44, bl+lh*(spd>.5?.62:.72), spd>.7?1:2, rng)) // peak2
    s1.push([ox+w*.52, bl+lh*.30])
    s1.push(           ...cPack(ox+w*.58, bl,        2,rng))  // valley2 - slow
    s1.push([ox+w*.68, bl+lh*(spd>.5?.40:.52)])               // third hump
    s1.push(           ...cPack(ox+w*.74, bl+lh*(spd>.5?.48:.55), spd>.7?1:2, rng))
    s1.push([ox+w*.82, bl+lh*.18])
    s1.push([ox+w*.90, bl+h*.06])
    s1.push([ox+w*.96, bl+h*.02])
    return [s1]
  },
  G:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.82+rng()*.12)
    const s1:[number,number][]=[]
    // G: starts at top-right, loops CCW, hooks right at mid
    s1.push([ox+w*.80, bl+lh*.38])
    s1.push([ox+w*.62, bl+lh*.12])
    s1.push(           ...cPack(ox+w*.42, bl+lh*.02, 2,rng))  // top apex
    s1.push([ox+w*.22, bl+lh*.14])
    s1.push([ox+w*.08, bl+lh*.34])
    s1.push(           ...cPack(ox+w*.03, bl+lh*.55, 2,rng))  // left apex
    s1.push([ox+w*.08, bl+lh*.78])
    s1.push([ox+w*.22, bl+lh*.96])
    s1.push(           ...cPack(ox+w*.44, bl+lh,     2,rng))  // bottom apex
    s1.push([ox+w*.64, bl+lh*.92])
    s1.push([ox+w*.80, bl+lh*.74])
    s1.push([ox+w*.86, bl+lh*.58])
    // crossbar (fast = thin)
    s1.push([ox+w*.88, bl+lh*.54])
    s1.push([ox+w*.92, bl+lh*.52])
    return [s1]
  },
  A:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.78+rng()*.12)
    const s1:[number,number][]=[]
    s1.push([ox+w*.06, bl+h*.05])
    s1.push([ox+w*.10, bl+lh*.55])
    s1.push(           ...cPack(ox+w*.16, bl+lh*.88, 2,rng))
    s1.push(           ...cPack(ox+w*.24, bl+lh,     3,rng))  // apex
    s1.push([ox+w*.44, bl+lh*.88])
    s1.push([ox+w*.66, bl+lh*.55])
    s1.push([ox+w*.78, bl+lh*.22])
    s1.push([ox+w*.82, bl+h*.05])
    s1.push([ox+w*.85, bl+h*.02])
    if(spd<.6) { // crossbar only when slower
      s1.push([ox+w*.85, bl+lh*.45])
      s1.push([ox+w*.24, bl+lh*.45])
      s1.push([ox+w*.14, bl+lh*.45])
    }
    return [s1]
  },
  Y:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.75+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.08, bl+h*.04])
    s1.push([ox+w*.12, bl+lh*.40])
    s1.push(           ...cPack(ox+w*.18, bl+lh*.70, 2,rng))
    s1.push(           ...cPack(ox+w*.26, bl+lh*.88, 2,rng))
    s1.push([ox+w*.36, bl+lh*.72])
    s1.push([ox+w*.50, bl+lh*.48])
    // descender loop
    s1.push([ox+w*.58, bl+lh*.20])
    s1.push([ox+w*.64, bl-d*.20])
    s1.push(           ...cPack(ox+w*.62, bl-d*.60, 2,rng))  // descender apex
    s1.push([ox+w*.54, bl-d*.70])
    s1.push([ox+w*.42, bl-d*.55])
    s1.push([ox+w*.50, bl-d*.20])
    s1.push([ox+w*.70, bl+h*.02])
    s1.push([ox+w*.85, bl+h*.02])
    return [s1]
  },
  K:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.82+rng()*.10)
    const s1:[number,number][]=[]
    // vertical
    s1.push([ox+w*.10, bl+h*.04])
    s1.push([ox+w*.08, bl+lh*.50])
    s1.push(           ...cPack(ox+w*.08, bl+lh, 2,rng))
    // diagonal up-right (upper arm)
    s1.push([ox+w*.20, bl+lh*.60])
    s1.push([ox+w*.40, bl+lh*.28])
    s1.push(           ...cPack(ox+w*.56, bl+lh*.06, 2,rng))
    s1.push([ox+w*.68, bl+h*.02])
    // swing back through for lower arm
    s1.push([ox+w*.52, bl+lh*.28])
    s1.push([ox+w*.64, bl+lh*.56])
    s1.push([ox+w*.78, bl+lh*.80])
    s1.push([ox+w*.90, bl+h*.04])
    return [s1]
  },
  I:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.55+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.22, bl+h*.03])
    s1.push([ox+w*.20, bl+lh*.50])
    s1.push(           ...cPack(ox+w*.20, bl+lh, 2,rng))
    s1.push([ox+w*.28, bl+lh*.80])
    s1.push([ox+w*.40, bl+h*.03])
    // dot — lifted, fast
    const s2:[number,number][]=[[ox+w*.18, bl+lh+h*.18],[ox+w*.22, bl+lh+h*.22],[ox+w*.20, bl+lh+h*.19]]
    return [s1, s2]
  },
  N:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.82+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.06, bl+h*.04])
    s1.push(           ...cPack(ox+w*.08, bl+lh*.5, 1,rng))
    s1.push(           ...cPack(ox+w*.08, bl+lh,    3,rng))  // apex
    s1.push([ox+w*.24, bl+lh*.70])
    s1.push([ox+w*.44, bl+lh*.30])
    s1.push([ox+w*.64, bl+lh*.05])
    s1.push(           ...cPack(ox+w*.70, bl,        2,rng))
    s1.push([ox+w*.76, bl+lh*.40])
    s1.push(           ...cPack(ox+w*.78, bl+lh,     3,rng))
    s1.push([ox+w*.86, bl+lh*.55])
    s1.push([ox+w*.92, bl+h*.04])
    return [s1]
  },
  O:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.78+rng()*.10)
    const s1:[number,number][]=[]
    for(let i=0;i<=24;i++){
      const a=-Math.PI/2+(i/24)*Math.PI*2
      s1.push([ox+w*.44+Math.cos(a)*w*.38, bl+lh*.5+Math.sin(a)*lh*.5])
    }
    return [s1]
  },
  D:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.82+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.14, bl+h*.04])
    s1.push(           ...cPack(ox+w*.14, bl+lh*.5, 1,rng))
    s1.push(           ...cPack(ox+w*.14, bl+lh,    3,rng))
    s1.push([ox+w*.30, bl+lh*.98])
    s1.push([ox+w*.55, bl+lh*.90])
    s1.push([ox+w*.78, bl+lh*.68])
    s1.push(           ...cPack(ox+w*.86, bl+lh*.5, 2,rng))
    s1.push([ox+w*.78, bl+lh*.32])
    s1.push([ox+w*.55, bl+lh*.10])
    s1.push([ox+w*.30, bl+h*.04])
    s1.push([ox+w*.14, bl+h*.05])
    return [s1]
  },
  W:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.75+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.04, bl+h*.03])
    s1.push(           ...cPack(ox+w*.04, bl+lh, 3,rng))
    s1.push([ox+w*.16, bl+lh*.42])
    s1.push(           ...cPack(ox+w*.28, bl+lh*.92, 2,rng))
    s1.push([ox+w*.38, bl+lh*.48])
    s1.push(           ...cPack(ox+w*.50, bl+lh*.88, 2,rng))
    s1.push([ox+w*.62, bl+lh*.38])
    s1.push(           ...cPack(ox+w*.70, bl+lh, 3,rng))
    s1.push([ox+w*.82, bl+h*.03])
    s1.push([ox+w*.90, bl+h*.03])
    return [s1]
  },
  B:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.82+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.12, bl+h*.04])
    s1.push(           ...cPack(ox+w*.10, bl+lh*.5, 1,rng))
    s1.push(           ...cPack(ox+w*.10, bl+lh,    3,rng))
    s1.push([ox+w*.26, bl+lh*.98])
    s1.push([ox+w*.52, bl+lh*.92])
    s1.push([ox+w*.66, bl+lh*.75])
    s1.push(           ...cPack(ox+w*.68, bl+lh*.58, 2,rng))
    s1.push([ox+w*.60, bl+lh*.46])
    s1.push([ox+w*.36, bl+lh*.40])
    s1.push([ox+w*.56, bl+lh*.32])
    s1.push([ox+w*.66, bl+lh*.16])
    s1.push(           ...cPack(ox+w*.62, bl+h*.06, 2,rng))
    s1.push([ox+w*.42, bl+h*.04])
    s1.push([ox+w*.16, bl+h*.04])
    return [s1]
  },
  // ── LOWERCASE (compressed, fast) ──────────────────────────────────────────
  a:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=m*(0.85+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.70, bl+lh*.55])
    s1.push([ox+w*.54, bl+lh*.14])
    s1.push(           ...cPack(ox+w*.34, bl+lh*.04, 2,rng))
    s1.push([ox+w*.14, bl+lh*.22])
    s1.push(           ...cPack(ox+w*.06, bl+lh*.54, 2,rng))
    s1.push([ox+w*.14, bl+lh*.84])
    s1.push([ox+w*.34, bl+lh])
    s1.push([ox+w*.56, bl+lh*.88])
    s1.push([ox+w*.70, bl+lh*.60])
    s1.push([ox+w*.72, bl+lh*.40])
    s1.push([ox+w*.74, bl+h*.04])
    s1.push([ox+w*.80, bl+h*.04])
    return [s1]
  },
  y:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=m*(0.82+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.08, bl+h*.03])
    s1.push([ox+w*.12, bl+lh*.55])
    s1.push(           ...cPack(ox+w*.18, bl+lh, 2,rng))
    s1.push([ox+w*.38, bl+lh*.80])
    s1.push([ox+w*.58, bl+lh*.30])
    s1.push([ox+w*.68, bl-d*.25])
    s1.push(           ...cPack(ox+w*.64, bl-d*.60, 2,rng))
    s1.push([ox+w*.52, bl-d*.62])
    s1.push([ox+w*.44, bl-d*.38])
    s1.push([ox+w*.58, bl+h*.03])
    s1.push([ox+w*.80, bl+h*.03])
    return [s1]
  },
  k:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=h*(0.80+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.10, bl+h*.04])
    s1.push(           ...cPack(ox+w*.10, bl+lh*.5, 1,rng))
    s1.push(           ...cPack(ox+w*.10, bl+lh,    2,rng))
    s1.push([ox+w*.18, bl+lh*.60])
    s1.push([ox+w*.36, bl+lh*(spd>.5?.40:.28)])
    s1.push(           ...cPack(ox+w*.50, bl+lh*(spd>.5?.18:.10), 2,rng))
    s1.push([ox+w*.42, bl+lh*(spd>.5?.38:.28)])
    s1.push([ox+w*.58, bl+lh*.64])
    s1.push([ox+w*.72, bl+lh*.88])
    s1.push([ox+w*.82, bl+h*.03])
    return [s1]
  },
  i:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=m*(0.72+rng()*.10)
    const s1:[number,number][]=[[ox+w*.22, bl+h*.03],[ox+w*.20, bl+lh*.50],...cPack(ox+w*.20, bl+lh, 2,rng),[ox+w*.28, bl+lh*.80],[ox+w*.40, bl+h*.03]]
    const s2:[number,number][]=[[ox+w*.14, bl+lh+m*.18],[ox+w*.18, bl+lh+m*.22],[ox+w*.16, bl+lh+m*.19]]
    return [s1, s2]
  },
  n:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=m*(0.82+rng()*.08)
    const s1:[number,number][]=[]
    s1.push([ox+w*.08, bl+h*.03])
    s1.push(           ...cPack(ox+w*.08, bl+lh*.5, 1,rng))
    s1.push(           ...cPack(ox+w*.08, bl+lh,    2,rng))
    s1.push([ox+w*.22, bl+lh*.80])
    s1.push([ox+w*.42, bl+lh*.12])
    s1.push(           ...cPack(ox+w*.54, bl+lh*.04, 2,rng))
    s1.push([ox+w*.66, bl+lh*.20])
    s1.push([ox+w*.74, bl+lh*.60])
    s1.push([ox+w*.80, bl+h*.03])
    return [s1]
  },
  o:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=m*(0.82+rng()*.08)
    const s1:[number,number][]=[]
    for(let i=0;i<=20;i++){
      const a=-Math.PI*.5+(i/20)*Math.PI*2
      s1.push([ox+w*.42+Math.cos(a)*w*.36, bl+lh*.5+Math.sin(a)*lh*.5])
    }
    s1.push([ox+w*.80, bl+h*.03])
    return [s1]
  },
  d:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=m*(0.82+rng()*.08)
    const s1:[number,number][]=[]
    for(let i=0;i<=16;i++){
      const a=Math.PI*.4+(i/16)*Math.PI*1.8
      s1.push([ox+w*.34+Math.cos(a)*w*.28, bl+lh*.5+Math.sin(a)*lh*.5])
    }
    s1.push(           ...cPack(ox+w*.62, bl+lh*.5, 1, rng))
    s1.push([ox+w*.62, bl+h*.02])
    s1.push([ox+w*.62, bl+h*(-.50)])  // tall ascender
    s1.push([ox+w*.68, bl+h*(-0.58)])
    s1.push([ox+w*.75, bl+h*.03])
    return [s1]
  },
  w:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=m*(0.70+rng()*.10)
    const s1:[number,number][]=[]
    s1.push([ox+w*.04, bl+h*.03])
    s1.push(           ...cPack(ox+w*.06, bl+lh, 2,rng))
    s1.push([ox+w*.20, bl+lh*.48])
    s1.push(           ...cPack(ox+w*.34, bl+lh*.92, 2,rng))
    s1.push([ox+w*.46, bl+lh*.46])
    s1.push(           ...cPack(ox+w*.58, bl+lh*.92, 2,rng))
    s1.push([ox+w*.72, bl+lh*.44])
    s1.push(           ...cPack(ox+w*.80, bl+lh, 2,rng))
    s1.push([ox+w*.88, bl+h*.03])
    return [s1]
  },
  // Generic fallback for any other letter (fast scribble)
  _:(ox,bl,h,m,d,w,spd,rng)=>{
    const lh=m*(0.65+rng()*.20)
    const v=Math.floor(rng()*3)
    const s1:[number,number][]=[]
    if(v===0){
      s1.push([ox+w*.06, bl+h*.03])
      s1.push([ox+w*.14, bl+lh*(spd>.5?.60:.78)])
      s1.push(           ...cPack(ox+w*.22, bl+lh, 2, rng))
      s1.push([ox+w*.50, bl+lh*(spd>.5?.55:.72)])
      s1.push(           ...cPack(ox+w*.60, bl+lh, 2, rng))
      s1.push([ox+w*.80, bl+h*.03])
    } else if(v===1){
      s1.push([ox+w*.06, bl+h*.03])
      s1.push([ox+w*.30, bl+lh])
      s1.push([ox+w*.60, bl+lh*.30])
      s1.push([ox+w*.80, bl+h*.03])
    } else {
      s1.push([ox+w*.06, bl+h*.03])
      s1.push(           ...cPack(ox+w*.20, bl+lh, 2,rng))
      s1.push([ox+w*.44, bl+lh*.36])
      s1.push(           ...cPack(ox+w*.58, bl+lh*(spd>.6?.55:.72), 2,rng))
      s1.push([ox+w*.80, bl+h*.03])
    }
    return [s1]
  }
}

// Letter widths (unit, scaled by letterScale)
const LWIDTHS:Record<string,number> = {
  M:1.9, W:1.8, G:1.6, D:1.6, N:1.5, B:1.5, O:1.4, K:1.5,
  A:1.4, Y:1.4, I:0.7, m:1.7, w:1.6, n:1.3, o:1.2, a:1.1,
  d:1.3, y:1.3, k:1.4, i:0.6, _:1.2,
}

// ── VARIANT CONFIG ─────────────────────────────────────────────────────────────
interface VC {
  id:string
  letterScale:number    // overall letter size
  speed:number         // 0=legible … 1=fast scribble
  slant:number         // rightward lean
  capBold:number       // capital letter scale vs body (1.1–1.5)
  baseW:number
  wob:number
  // Encircling oval params (relative to body center)
  oCX:number; oCY:number; oRX:number; oRY:number; oStart:number; oSweep:number
  cross:boolean; cLen:number; cAng:number
  // Underline: left-extend, right-extend, double
  ulL:number; ulR:number; ul2:boolean
  // Bottom ellipse
  bRX:number; bRY:number; bCX:number; bCY:number; bStart:number; bSweep:number
}

function makeVC(id:string, ls:number, sp:number, sl:number, cb:number, bw:number, wb:number,
  oc:[number,number,number,number,number,number], cr:boolean, cl:number, ca:number,
  ul:[number,number,boolean], be:[number,number,number,number,number,number]
):VC {
  return {id,letterScale:ls,speed:sp,slant:sl,capBold:cb,baseW:bw,wob:wb,
    oCX:oc[0],oCY:oc[1],oRX:oc[2],oRY:oc[3],oStart:oc[4],oSweep:oc[5],
    cross:cr,cLen:cl,cAng:ca, ulL:ul[0],ulR:ul[1],ul2:ul[2],
    bRX:be[0],bRY:be[1],bCX:be[2],bCY:be[3],bStart:be[4],bSweep:be[5]}
}

const V40:VC[] = [
  makeVC('01',28,.25,.22,1.30,1.55,1.20, [30,-55, 78,34,-2.0,5.5], true, 55,-1.10, [65,92,true],  [120,22,110,62,3.4,5.4]),
  makeVC('02',26,.35,.26,1.25,1.45,1.05, [20,-48, 86,28,-1.9,5.6], true, 48,-1.00, [55,96,true],  [108,20,125,56,3.2,5.5]),
  makeVC('03',30,.18,.18,1.38,1.70,1.35, [42,-62, 68,40,-2.1,5.4], false,60,-1.20, [70,82,true],  [132,26,105,65,3.6,5.2]),
  makeVC('04',24,.45,.28,1.20,1.38,0.90, [12,-43, 95,24,-1.8,5.7], true, 42,-0.90, [48,100,true], [98,17,140,50,3.1,5.6]),
  makeVC('05',32,.15,.20,1.45,1.82,1.50, [48,-68, 64,44,-2.2,5.3], true, 65,-1.30, [78,76,false], [138,28,118,68,3.7,5.0]),
  makeVC('06',27,.30,.21,1.28,1.58,1.12, [26,-52, 80,32,-2.0,5.5], true, 52,-1.08, [60,90,true],  [115,21,118,58,3.4,5.4]),
  makeVC('07',25,.38,.25,1.22,1.46,0.98, [16,-47, 88,30,-1.9,5.6], true, 46,-1.02, [52,94,true],  [106,19,132,54,3.3,5.5]),
  makeVC('08',29,.22,.17,1.35,1.75,1.30, [44,-60, 70,38,-2.1,5.4], false,58,-1.16, [68,82,true],  [128,24,112,62,3.5,5.3]),
  makeVC('09',23,.50,.30,1.18,1.35,0.88, [10,-40, 96,22,-1.8,5.7], true, 40,-0.92, [46,102,true], [96,16,145,48,3.2,5.6]),
  makeVC('10',28,.25,.22,1.30,1.60,1.15, [32,-54, 76,34,-2.0,5.5], true, 54,-1.09, [62,90,true],  [118,21,120,58,3.4,5.4]),
  makeVC('11',31,.12,.16,1.42,1.85,1.52, [54,-70, 62,44,-2.2,5.3], false,64,-1.26, [74,78,false], [140,28,108,66,3.7,5.1]),
  makeVC('12',22,.55,.32,1.15,1.32,0.80, [8, -38, 100,20,-1.7,5.8], true, 36,-0.82, [42,106,true], [94,16,150,46,3.1,5.7]),
  makeVC('13',27,.28,.20,1.28,1.62,1.18, [36,-54, 75,35,-2.0,5.5], true, 53,-1.07, [62,88,true],  [117,22,120,58,3.4,5.4]),
  makeVC('14',26,.36,.24,1.24,1.52,1.02, [22,-50, 84,30,-1.9,5.6], true, 48,-1.01, [54,92,true],  [108,20,130,56,3.3,5.5]),
  makeVC('15',33,.10,.18,1.48,1.90,1.58, [50,-72, 60,46,-2.2,5.3], true, 68,-1.32, [80,74,false], [145,30,115,70,3.7,5.0]),
  makeVC('16',24,.42,.26,1.20,1.42,0.95, [14,-45, 92,26,-1.8,5.7], false,44,-0.96, [50,98,true],  [100,17,138,52,3.2,5.6]),
  makeVC('17',29,.20,.20,1.32,1.68,1.24, [38,-58, 74,36,-2.0,5.5], true, 56,-1.07, [64,88,true],  [120,23,116,60,3.4,5.4]),
  makeVC('18',25,.40,.23,1.22,1.48,1.00, [18,-48, 88,28,-1.9,5.6], false,46,-1.00, [52,94,false], [106,18,134,54,3.3,5.5]),
  makeVC('19',28,.28,.24,1.30,1.56,1.10, [28,-52, 78,34,-2.0,5.5], true, 52,-1.08, [60,90,true],  [116,21,122,58,3.4,5.4]),
  makeVC('20',26,.32,.22,1.26,1.54,1.08, [24,-50, 82,32,-1.9,5.5], true, 50,-1.04, [58,92,true],  [112,20,126,56,3.4,5.4]),
  makeVC('21',31,.14,.18,1.40,1.80,1.45, [46,-64, 64,42,-2.1,5.4], false,62,-1.22, [72,80,false], [136,26,110,64,3.6,5.2]),
  makeVC('22',23,.48,.29,1.18,1.36,0.85, [10,-41, 94,23,-1.7,5.7], true, 38,-0.85, [44,104,true], [96,16,148,48,3.1,5.7]),
  makeVC('23',28,.26,.21,1.30,1.58,1.14, [32,-54, 77,34,-2.0,5.5], true, 53,-1.08, [61,90,true],  [118,21,120,58,3.4,5.4]),
  makeVC('24',26,.34,.24,1.24,1.50,1.00, [20,-49, 85,30,-1.9,5.6], true, 47,-1.01, [53,93,true],  [108,19,131,55,3.3,5.5]),
  makeVC('25',30,.18,.19,1.36,1.72,1.32, [42,-61, 69,39,-2.1,5.4], false,58,-1.17, [67,83,true],  [128,25,113,63,3.5,5.3]),
  makeVC('26',25,.38,.24,1.22,1.48,0.98, [17,-47, 87,30,-1.9,5.6], true, 45,-0.98, [51,93,false], [106,18,133,54,3.3,5.5]),
  makeVC('27',29,.22,.18,1.34,1.76,1.38, [44,-62, 68,38,-2.1,5.4], false,60,-1.20, [68,81,true],  [130,25,112,63,3.5,5.3]),
  makeVC('28',23,.50,.30,1.16,1.34,0.84, [10,-42, 96,23,-1.7,5.8], true, 38,-0.85, [44,104,true], [96,15,148,48,3.1,5.7]),
  makeVC('29',28,.25,.22,1.30,1.57,1.13, [31,-53, 77,34,-2.0,5.5], true, 53,-1.08, [61,90,true],  [118,21,121,58,3.4,5.4]),
  makeVC('30',27,.30,.22,1.28,1.60,1.12, [28,-52, 80,33,-2.0,5.5], true, 52,-1.05, [59,90,true],  [116,21,122,57,3.4,5.4]),
  makeVC('31',32,.12,.16,1.44,1.88,1.56, [52,-70, 62,44,-2.2,5.3], false,65,-1.28, [75,77,false], [142,28,109,67,3.7,5.0]),
  makeVC('32',22,.55,.31,1.14,1.30,0.78, [7, -38, 102,20,-1.7,5.8], true, 33,-0.79, [40,108,true], [92,14,152,44,3.0,5.8]),
  makeVC('33',28,.26,.20,1.30,1.60,1.16, [33,-54, 77,34,-2.0,5.5], true, 53,-1.08, [61,89,true],  [118,21,120,58,3.4,5.4]),
  makeVC('34',26,.34,.23,1.24,1.52,1.02, [21,-50, 85,30,-1.9,5.6], true, 47,-1.01, [52,93,false], [108,18,132,55,3.3,5.5]),
  makeVC('35',30,.19,.19,1.36,1.74,1.35, [44,-62, 70,37,-2.1,5.4], false,57,-1.17, [66,82,true],  [127,24,113,62,3.5,5.3]),
  makeVC('36',25,.40,.26,1.22,1.46,0.95, [16,-47, 90,28,-1.8,5.7], true, 44,-0.94, [50,97,true],  [103,17,137,52,3.2,5.6]),
  makeVC('37',29,.20,.18,1.34,1.74,1.38, [44,-62, 70,38,-2.1,5.4], false,57,-1.18, [67,82,true],  [128,24,113,62,3.5,5.3]),
  makeVC('38',26,.36,.24,1.24,1.50,0.99, [21,-50, 87,30,-1.9,5.6], true, 46,-1.00, [52,93,true],  [108,19,133,55,3.3,5.5]),
  makeVC('39',28,.25,.22,1.30,1.58,1.14, [32,-53, 77,34,-2.0,5.5], true, 52,-1.07, [60,89,true],  [117,21,121,58,3.4,5.4]),
  makeVC('40',27,.30,.22,1.28,1.58,1.10, [30,-52, 79,33,-2.0,5.5], true, 52,-1.06, [60,90,true],  [116,21,121,57,3.4,5.4]),
]

// ── MASTER RENDER ─────────────────────────────────────────────────────────────
function renderSig(name:string, v:VC, color:string, W:number, H:number):string {
  const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H
  const ctx=canvas.getContext('2d')!
  const rng=seededRng(nameSeed(name)*7+nameSeed(v.id)*13)

  const BL=H*0.54           // baseline
  const H_=H*0.48           // cap height (negative)
  const M_=H*0.26           // mid/x-height
  const D_=H*0.12           // descender
  const SX=W*0.06           // start x

  // Apply global slant
  const slant=(x:number,y:number):[number,number]=>[x+v.slant*(BL-y), y]

  // Build all strokes from name letters
  const parts=name.trim().split(/\s+/)
  const allStrokes:[number,number][][] = []
  let cx=SX

  parts.forEach((word, wi)=>{
    const chars=[...word]
    chars.forEach((ch, ci)=>{
      const uch=ch.toUpperCase()
      // Scale: capitals are bigger and bolder
      const isCap=ci===0&&wi===0
      const ls=v.letterScale*(isCap?v.capBold:1.0)*(1-v.speed*.08)
      const lw=(LWIDTHS[isCap?uch:ch]||LWIDTHS._||1.2)*ls
      const fn=LETTERS[isCap?uch:ch]||LETTERS[uch]||LETTERS._
      const strokes=fn(cx, BL, H_, M_, D_, lw, v.speed, rng)

      // Apply slant to all points
      strokes.forEach(s=>{
        allStrokes.push(s.map(([x,y])=>slant(x,y)))
      })
      cx+=lw+ls*0.06
    })
    if(wi<parts.length-1) cx+=v.letterScale*0.4 // word space
  })

  const bodyRight=cx

  // Connect and render each stroke
  let allBodyPts:[number,number][]=[]
  allStrokes.forEach(s=>{ allBodyPts=[...allBodyPts,...densify(s,12)] })
  renderTraj(ctx,allBodyPts,color,v.baseW,v.wob,nameSeed(name),1)

  // Oval flourish above/around body
  const bodyCX=(SX+bodyRight)/2
  const oPts:[number,number][]=[]
  for(let i=0;i<=60;i++){
    const a=v.oStart+(i/60)*v.oSweep
    const[x,y]=slant(bodyCX+v.oCX+Math.cos(a)*v.oRX, BL+v.oCY+Math.sin(a)*v.oRY)
    oPts.push([x+(rng()-.5)*1.8, y+(rng()-.5)*1.4])
  }
  renderTraj(ctx,oPts,color,v.baseW*.38,v.wob*.65,nameSeed(name)+1,0.85)

  // Cross stroke
  if(v.cross){
    const cX=bodyRight*.74, cY=BL+10
    const cPts:[number,number][]=[]
    for(let i=0;i<=16;i++){
      const t=i/16
      const[x,y]=slant(cX+v.cLen*t, cY+Math.tan(v.cAng)*v.cLen*t)
      cPts.push([x+(rng()-.5)*.9, y+(rng()-.5)*.9])
    }
    renderTraj(ctx,densify(cPts,6),color,v.baseW*.48,v.wob*.5,nameSeed(name)+2,0.80)
  }

  // Sweeping underlines
  const ulY=BL+22
  for(let li=0;li<(v.ul2?2:1);li++){
    const dY=li*10
    const x1=SX-v.ulL, x2=bodyRight+v.ulR
    const uPts:[number,number][]=[]
    for(let i=0;i<=28;i++){
      const t=i/28
      const x=x1+(x2-x1)*t
      const y=ulY+dY+Math.sin(t*Math.PI*.7)*10+(rng()-.5)*.8
      const[sx,sy]=slant(x,y)
      uPts.push([sx+(rng()-.5)*1.0, sy+(rng()-.5)*.9])
    }
    renderTraj(ctx,uPts,color,v.baseW*(li===0?.44:.30),v.wob*.38,nameSeed(name)+3+li,li===0?.86:.50)
  }

  // Bottom ellipse
  const bCX=bodyCX+v.bCX
  const bPts:[number,number][]=[]
  for(let i=0;i<=68;i++){
    const a=v.bStart+(i/68)*v.bSweep
    const[x,y]=slant(bCX+Math.cos(a)*v.bRX, BL+v.bCY+Math.sin(a)*v.bRY)
    bPts.push([x+(rng()-.5)*1.6, y+(rng()-.5)*1.2])
  }
  renderTraj(ctx,toSamples(bPts,10),color,v.baseW*.34,v.wob*.52,nameSeed(name)+5,0.75)

  return canvas.toDataURL('image/png')
}

function toSamples(pts:[number,number][],sps=12):[number,number][]{
  if(pts.length<2)return pts
  const out:[number,number][]=[]
  for(let i=0;i<pts.length-1;i++) for(let j=0;j<sps;j++) out.push(crSample(pts,i,j/sps))
  out.push(pts[pts.length-1]); return out
}

// ── CARD ──────────────────────────────────────────────────────────────────────
function SigCard({v,name,color,selected,onSelect,ready}:{v:VC;name:string;color:string;selected:boolean;onSelect:()=>void;ready:boolean}){
  const [url,setUrl]=useState('')
  const t=useRef<NodeJS.Timeout|null>(null)
  useEffect(()=>{
    if(!ready)return
    if(t.current)clearTimeout(t.current)
    t.current=setTimeout(()=>{try{setUrl(renderSig(name||'Your Name',v,color,500,190))}catch(e){console.error(e)}},parseInt(v.id)*15)
    return()=>{if(t.current)clearTimeout(t.current)}
  },[name,color,ready,v])
  return(
    <div onClick={onSelect} onMouseEnter={e=>{if(!selected){const el=e.currentTarget as HTMLElement;el.style.borderColor='#BDB9F4';el.style.background='#F8F7FF'}}} onMouseLeave={e=>{if(!selected){const el=e.currentTarget as HTMLElement;el.style.borderColor='#E4E0DB';el.style.background='#fff'}}}
      style={{border:`2px solid ${selected?'#5B50E8':'#E4E0DB'}`,borderRadius:11,background:selected?'#EEEDFB':'#fff',cursor:'pointer',overflow:'hidden',transition:'all .13s',boxShadow:selected?'0 0 0 3px #EEEDFB':'0 1px 3px rgba(0,0,0,.05)',position:'relative'}}>
      <div style={{height:96,display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',overflow:'hidden'}}>
        {url?<img src={url} alt="" style={{maxWidth:'96%',maxHeight:90,objectFit:'contain',display:'block'}}/>:<div style={{width:24,height:24,border:'2px solid #E4E0DB',borderTopColor:'#5B50E8',borderRadius:'50%',animation:'spin .9s linear infinite'}}/>}
      </div>
      {selected&&<div style={{position:'absolute',top:5,right:5,width:16,height:16,background:'#5B50E8',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg></div>}
    </div>
  )
}

// ── FONTS ──────────────────────────────────────────────────────────────────────
let _fi=false
function ensureFonts(){if(_fi||typeof document==='undefined')return;_fi=true;const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Herr+Von+Muellerhoff&family=Ruthie&family=Meow+Script&family=Waterfall&family=Whisper&family=Qwigley&family=Monsieur+La+Doulaise&family=Tangerine:wght@400;700&family=Great+Vibes&family=Dancing+Script:wght@400;700&family=Sacramento&family=Allura&family=Alex+Brush&family=Pinyon+Script&family=Parisienne&family=Satisfy&family=Courgette&family=Italianno&family=Norican&family=Zeyada&family=Kaushan+Script&family=Arizonia&family=Bilbo&family=Cormorant+Garamond:ital,wght@1,400;1,700&family=Playfair+Display:ital,wght@1,400;1,700&family=Caveat:wght@400;700&family=Indie+Flower&family=Patrick+Hand&family=La+Belle+Aurore&family=Nothing+You+Could+Do&family=Reenie+Beanie&family=Shadows+Into+Light&display=swap';document.head.appendChild(l)}
const FL=['Herr Von Muellerhoff','Ruthie','Whisper','Waterfall','Meow Script','Qwigley','Monsieur La Doulaise','Tangerine','Great Vibes','Dancing Script','Sacramento','Allura','Alex Brush','Pinyon Script','Parisienne','Satisfy','Courgette','Italianno','Norican','Zeyada','Kaushan Script','Arizonia','Bilbo','Cormorant Garamond','Playfair Display','Caveat','Indie Flower','Patrick Hand','La Belle Aurore','Nothing You Could Do','Reenie Beanie','Shadows Into Light']

// ── MAIN ──────────────────────────────────────────────────────────────────────
interface Props{signerName?:string;onSign:(d:string)=>void;onClose:()=>void}

export default function SignModal({signerName='',onSign,onClose}:Props){
  const [mode,setMode]=useState<Mode>('styles')
  const [name,setName]=useState(signerName||'Godwin Mayaki')
  const [initials,setInitials]=useState('GM')
  const [inkColor,setInkColor]=useState('#0A0A0A')
  const [selV,setSelV]=useState('01')
  const [selFont,setSelFont]=useState('Herr Von Muellerhoff')
  const [fSearch,setFSearch]=useState('')
  const [sigSize,setSigSize]=useState(52)
  const [ready,setReady]=useState(false)
  const [drawing,setDrawing]=useState(false)
  const drawRef=useRef<HTMLCanvasElement>(null)
  const lastPt=useRef<{x:number;y:number}|null>(null)
  const [upSig,setUpSig]=useState<string|null>(null)
  const [bgDone,setBgDone]=useState(false)
  const upRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{ensureFonts();setTimeout(()=>setReady(true),200)},[])

  const gp=(e:any,c:HTMLCanvasElement)=>{const r=c.getBoundingClientRect();const s=e.touches?.[0]??e;return{x:(s.clientX-r.left)*(c.width/r.width),y:(s.clientY-r.top)*(c.height/r.height)}}
  const onDown=(e:any)=>{e.preventDefault();setDrawing(true);const c=drawRef.current!;const p=gp(e,c);lastPt.current=p;const ctx=c.getContext('2d')!;ctx.strokeStyle=inkColor;ctx.lineWidth=2.4;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(p.x,p.y)}
  const onMove=(e:any)=>{if(!drawing||!lastPt.current)return;e.preventDefault();const c=drawRef.current!;const ctx=c.getContext('2d')!;const p=gp(e,c);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x,p.y);lastPt.current=p}
  const onUp=()=>{setDrawing(false);lastPt.current=null}
  const clearDraw=()=>{const c=drawRef.current;if(!c)return;c.getContext('2d')!.clearRect(0,0,c.width,c.height)}
  const handleUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>{setBgDone(false);setUpSig(ev.target?.result as string)};r.readAsDataURL(f)}
  const removeBg=async()=>{if(!upSig)return;const img=new Image();img.src=upSig;await new Promise(r=>img.onload=r);const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);const dt=ctx.getImageData(0,0,c.width,c.height);const d=dt.data;const sR=(d[0]+d[c.width*4-4]+d[(c.height-1)*c.width*4]+d[d.length-4])/4,sG=(d[1]+d[c.width*4-3]+d[(c.height-1)*c.width*4+1]+d[d.length-3])/4,sB=(d[2]+d[c.width*4-2]+d[(c.height-1)*c.width*4+2]+d[d.length-2])/4;for(let i=0;i<d.length;i+=4){if(Math.sqrt((d[i]-sR)**2+(d[i+1]-sG)**2+(d[i+2]-sB)**2)<60)d[i+3]=0}ctx.putImageData(dt,0,0);setUpSig(c.toDataURL('image/png'));setBgDone(true)}

  const apply=()=>{
    if(mode==='draw'){const c=drawRef.current;if(!c)return;onSign(c.toDataURL('image/png'));return}
    if(mode==='upload'){if(upSig)onSign(upSig);return}
    if(mode==='font'||mode==='initials'){
      const disp=mode==='initials'?initials:name
      const cv=document.createElement('canvas');cv.width=700;cv.height=220;const ctx=cv.getContext('2d')!
      ctx.save();ctx.translate(350,110);ctx.rotate(-0.07);ctx.font=`700 ${sigSize}px '${selFont}',cursive`
      ctx.strokeStyle=inkColor;ctx.lineWidth=0.85;ctx.lineCap='round'
      const tw=ctx.measureText(disp).width;ctx.strokeText(disp,-tw/2,0)
      ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-tw/2-5,32);ctx.lineTo(tw/2+8,32);ctx.stroke()
      ctx.restore();onSign(cv.toDataURL('image/png'));return
    }
    const v=V40.find(x=>x.id===selV)??V40[0]
    onSign(renderSig(name,v,inkColor,800,260))
  }

  const filtF=FL.filter(f=>f.toLowerCase().includes(fSearch.toLowerCase()))
  const disp=mode==='initials'?initials:name
  const TABS:[Mode,string][]=[['styles','Signature Styles'],['font','Font Styles'],['initials','AB Initials'],['draw','✏ Draw'],['upload','⬆ Upload']]

  const Hdr=({lbl}:{lbl:string})=><label style={{fontSize:9,fontWeight:700,color:C.textSm,display:'block',marginBottom:3,fontFamily:F,textTransform:'uppercase',letterSpacing:'.07em'}}>{lbl}</label>

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.62)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:12,backdropFilter:'blur(12px)'}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{background:'#fff',borderRadius:22,width:'min(1060px,98vw)',maxHeight:'96vh',display:'flex',flexDirection:'column',boxShadow:'0 40px 100px rgba(0,0,0,.3)',border:`1px solid ${C.border}`,overflow:'hidden'}}>
        <div style={{padding:'15px 22px 10px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'#FAFAF8'}}>
          <div><h2 style={{margin:'0 0 2px',fontSize:18,fontWeight:800,color:C.text,fontFamily:F}}>Signature Studio</h2><p style={{margin:0,fontSize:11,color:C.textSm,fontFamily:F}}>Name-driven trajectory engine · 40 executive styles</p></div>
          <button onClick={onClose} style={{width:30,height:30,background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,cursor:'pointer',fontSize:15,color:C.textMd}}>✕</button>
        </div>
        <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {TABS.map(([m,l])=><button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'9px 4px',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:F,background:mode===m?C.accentLt:'transparent',color:mode===m?C.accent:C.textMd,borderBottom:`2.5px solid ${mode===m?C.accent:'transparent'}`,transition:'all .12s',whiteSpace:'nowrap'}}>{l}</button>)}
        </div>
        {mode!=='draw'&&mode!=='upload'&&(
          <div style={{padding:'9px 16px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:10,alignItems:'flex-end',flexShrink:0,background:'#FAFAF8',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:150}}><Hdr lbl={mode==='initials'?'Initials':'Full Name'}/><input value={mode==='initials'?initials:name} onChange={e=>mode==='initials'?setInitials(e.target.value.toUpperCase().slice(0,3)):setName(e.target.value)} placeholder={mode==='initials'?'GM':'Your full name'} style={{width:'100%',padding:'7px 11px',border:`1.5px solid ${C.border}`,borderRadius:8,fontSize:15,color:C.text,background:'#fff',outline:'none'}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/></div>
            <div><Hdr lbl="Ink"/><input type="color" value={inkColor} onChange={e=>setInkColor(e.target.value)} style={{width:42,height:36,border:`1.5px solid ${C.border}`,borderRadius:8,cursor:'pointer',padding:3,display:'block'}}/></div>
            {(mode==='font'||mode==='initials')&&<div style={{minWidth:110}}><Hdr lbl={`Size ${sigSize}px`}/><input type="range" min={24} max={88} value={sigSize} onChange={e=>setSigSize(Number(e.target.value))} style={{width:'100%',accentColor:C.accent,marginTop:7}}/></div>}
          </div>
        )}
        <div style={{flex:1,overflow:'auto',minHeight:0}}>
          {mode==='styles'&&<div style={{padding:'12px 10px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>{V40.map(v=><SigCard key={v.id} v={v} name={name} color={inkColor} selected={selV===v.id} onSelect={()=>setSelV(v.id)} ready={ready}/>)}</div>}
          {(mode==='font'||mode==='initials')&&(
            <div style={{display:'flex',height:'100%'}}>
              <div style={{width:186,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',flexShrink:0}}>
                <div style={{padding:'8px'}}><input value={fSearch} onChange={e=>setFSearch(e.target.value)} placeholder="Search…" style={{width:'100%',padding:'5px 8px',border:`1px solid ${C.border}`,borderRadius:7,fontSize:11,fontFamily:F,outline:'none'}} onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/></div>
                <div style={{flex:1,overflow:'auto'}}>{filtF.map(f=><button key={f} onClick={()=>setSelFont(f)} style={{width:'100%',padding:'7px 11px',border:'none',cursor:'pointer',textAlign:'left',background:selFont===f?C.accentLt:'transparent',borderLeft:`3px solid ${selFont===f?C.accent:'transparent'}`,transition:'background .1s'}} onMouseOver={e=>{if(selFont!==f)(e.currentTarget as HTMLElement).style.background=C.hover}} onMouseOut={e=>{if(selFont!==f)(e.currentTarget as HTMLElement).style.background='transparent'}}><div style={{fontSize:Math.min(sigSize*.36,20),fontFamily:`'${f}',cursive`,color:inkColor,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{disp}</div><div style={{fontSize:8,color:C.textSm,fontFamily:F,marginTop:1}}>{f}</div></button>)}</div>
              </div>
              <div style={{flex:1,overflow:'auto',padding:10,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,alignContent:'start'}}>{filtF.map(f=><div key={f} onClick={()=>setSelFont(f)} onMouseEnter={e=>{if(selFont!==f){(e.currentTarget as HTMLElement).style.borderColor='#BDB9F4';(e.currentTarget as HTMLElement).style.background='#F8F7FF'}}} onMouseLeave={e=>{if(selFont!==f){(e.currentTarget as HTMLElement).style.borderColor='#E4E0DB';(e.currentTarget as HTMLElement).style.background='#FAFAF8'}}} style={{border:`2px solid ${selFont===f?'#5B50E8':'#E4E0DB'}`,borderRadius:10,background:selFont===f?'#EEEDFB':'#FAFAF8',cursor:'pointer',padding:'12px 10px',textAlign:'center',transition:'all .13s',minHeight:68}}><div style={{fontSize:Math.min(sigSize*.5,30),fontFamily:`'${f}',cursive`,color:inkColor,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{mode==='initials'?initials:disp}</div><div style={{fontSize:8,color:'#9B9898',fontFamily:F,marginTop:3}}>{f}</div></div>)}</div>
            </div>
          )}
          {mode==='draw'&&(
            <div style={{padding:'14px 18px',display:'flex',flexDirection:'column',gap:10,height:'100%'}}>
              <div style={{display:'flex',gap:10,alignItems:'center'}}><div><Hdr lbl="Ink"/><input type="color" value={inkColor} onChange={e=>setInkColor(e.target.value)} style={{width:42,height:36,border:`1.5px solid ${C.border}`,borderRadius:8,cursor:'pointer',padding:3}}/></div><button onClick={clearDraw} style={{alignSelf:'flex-end',padding:'8px 16px',border:`1.5px solid ${C.border}`,borderRadius:8,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:C.textMd,fontFamily:F}}>Clear</button></div>
              <div style={{flex:1,background:'#FCFCFA',borderRadius:12,border:`2px solid ${C.border}`,overflow:'hidden',cursor:'crosshair',position:'relative',minHeight:220}}>
                <canvas ref={drawRef} width={960} height={340} style={{width:'100%',height:'100%',display:'block',touchAction:'none'}} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}/>
                <div style={{position:'absolute',bottom:0,left:'8%',right:'8%',height:1,background:'rgba(0,0,0,.07)',pointerEvents:'none'}}/>
                <div style={{position:'absolute',bottom:10,left:0,right:0,textAlign:'center',pointerEvents:'none',fontSize:11,color:'rgba(0,0,0,.13)',fontFamily:F,letterSpacing:'.08em'}}>SIGN HERE</div>
              </div>
            </div>
          )}
          {mode==='upload'&&(
            <div style={{padding:'22px 20px',display:'flex',flexDirection:'column',gap:14}}>
              <input ref={upRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleUpload}/>
              {!upSig?(<div onClick={()=>upRef.current?.click()} style={{border:`2px dashed ${C.borderSt}`,borderRadius:14,padding:'44px 24px',textAlign:'center',cursor:'pointer',background:'#FAFAF8',transition:'all .13s'}} onMouseOver={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.accent;(e.currentTarget as HTMLElement).style.background=C.accentLt}} onMouseOut={e=>{(e.currentTarget as HTMLElement).style.borderColor=C.borderSt;(e.currentTarget as HTMLElement).style.background='#FAFAF8'}}><div style={{fontSize:36,marginBottom:10}}>✍</div><div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:5,fontFamily:F}}>Upload your signature</div><div style={{fontSize:12,color:C.textSm,fontFamily:F}}>PNG, JPG or SVG · Best on white background</div></div>):(
                <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{background:'#FAFAL8',borderRadius:12,border:`1.5px solid ${C.border}`,padding:'20px',display:'flex',alignItems:'center',justifyContent:'center',minHeight:150,position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(45deg,#E5E7EB 25%,transparent 25%),linear-gradient(-45deg,#E5E7EB 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#E5E7EB 75%),linear-gradient(-45deg,transparent 75%,#E5E7EB 75%)',backgroundSize:'14px 14px',backgroundPosition:'0 0,0 7px,7px -7px,-7px 0',opacity:0.35}}/>
                    <img src={upSig} alt="sig" style={{maxWidth:'90%',maxHeight:130,objectFit:'contain',position:'relative',zIndex:1}}/>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={removeBg} disabled={bgDone} style={{flex:1,padding:'9px 12px',border:`1.5px solid ${bgDone?C.border:C.accent}`,borderRadius:9,background:bgDone?C.panelSub:C.accentLt,cursor:bgDone?'default':'pointer',fontSize:13,fontWeight:700,color:bgDone?C.textSm:C.accent,fontFamily:F,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>{bgDone?'✓ Background removed':'✂ Remove Background'}</button>
                    <button onClick={()=>{setUpSig(null);setBgDone(false)}} style={{padding:'9px 16px',border:`1.5px solid ${C.border}`,borderRadius:9,background:'#fff',cursor:'pointer',fontSize:12,fontWeight:600,color:C.textMd,fontFamily:F}}>Change</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{padding:'11px 18px',borderTop:`1px solid ${C.border}`,display:'flex',gap:10,flexShrink:0,background:'#FAFAF8'}}>
          <button onClick={onClose} style={{flex:1,padding:'11px',border:`1.5px solid ${C.border}`,borderRadius:10,background:'#fff',fontSize:13,cursor:'pointer',fontWeight:600,color:C.textMd,fontFamily:F}}>Cancel</button>
          <button onClick={apply} style={{flex:2,padding:'11px',border:'none',borderRadius:10,background:C.accent,color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:F,transition:'all .13s'}} onMouseOver={e=>(e.currentTarget.style.background=C.accentHv)} onMouseOut={e=>(e.currentTarget.style.background=C.accent)}>Apply Signature</button>
        </div>
      </div>
    </div>
  )
}
