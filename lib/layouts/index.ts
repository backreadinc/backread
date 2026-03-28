// ─── Layout Engine ─────────────────────────────────────────────────────────────
function sc(base: number, W: number) { return Math.max(Math.round(base * (W / 1280)), Math.round(base * 0.4)) }
function pg(bg = '#ffffff', objects: any[] = []) { return { version: '5.3.0', objects, background: bg } }

function TX(text: string, o: any = {}): any {
  return {
    type: 'textbox', left: o.l ?? 60, top: o.t ?? 60, width: o.w ?? 400, text,
    fontSize: o.fs ?? 16, fontFamily: o.ff ?? 'Inter', fill: o.fill ?? '#0F0F0F',
    fontWeight: o.fw ?? '400', lineHeight: o.lh ?? 1.35, textAlign: o.ta ?? 'left',
    opacity: 1, selectable: true, editable: true, charSpacing: o.cs ?? 0,
  }
}
function BX(o: any = {}): any {
  return {
    type: 'rect', left: o.l ?? 0, top: o.t ?? 0, width: o.w ?? 200, height: o.h ?? 60,
    fill: o.fill ?? '#5B50E8', rx: o.rx ?? 0, ry: o.rx ?? 0, selectable: true, opacity: o.op ?? 1,
    stroke: o.stroke, strokeWidth: o.sw ?? 0,
  }
}
function LN(x1: number, y1: number, x2: number, y2: number, color = '#E2E8F0', sw = 1): any {
  return { type: 'line', x1, y1, x2, y2, stroke: color, strokeWidth: sw, selectable: true }
}
function CL(o: any = {}): any {
  return { type: 'circle', left: o.l ?? 0, top: o.t ?? 0, radius: o.r ?? 40, fill: o.fill ?? '#5B50E8', selectable: true, opacity: o.op ?? 1 }
}

export type Layout = {
  id: string
  label: string
  cat: string
  preview: string // bg color for thumbnail
  build: (W: number, H: number) => any
}

export const LAYOUTS: Layout[] = [

  // ══ HERO ════════════════════════════════════════════════════════════════════

  { id: 'hero-dark', label: 'Hero Dark', cat: 'Hero', preview: '#080D1A',
    build: (W, H) => pg('#080D1A', [
      BX({ l:0, t:0, w:W, h:H, fill:'#080D1A' }),
      BX({ l:0, t:H-4, w:W, h:4, fill:'#5B50E8' }),
      BX({ l:Math.round(W*.07), t:Math.round(H*.32), w:4, h:Math.round(H*.28), fill:'#5B50E8' }),
      TX('Your Headline\nGoes Here', { l:Math.round(W*.09), t:Math.round(H*.33), w:Math.round(W*.57), fs:sc(54,W), fw:'800', fill:'#FFFFFF', lh:.97 }),
      TX('Supporting subtitle that pulls the reader in.', { l:Math.round(W*.09), t:Math.round(H*.33)+sc(54,W)*2+22, w:Math.round(W*.5), fs:sc(15,W), fill:'rgba(255,255,255,.48)', lh:1.7 }),
    ])
  },
  { id: 'hero-light', label: 'Hero Light', cat: 'Hero', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      TX('CATEGORY', { l:Math.round(W*.1), t:Math.round(H*.2), w:W*.8, fs:sc(9,W), fw:'700', fill:'#5B50E8', ta:'center', ff:'JetBrains Mono', cs:200 }),
      TX('Centered Impact\nHeadline Here', { l:Math.round(W*.06), t:Math.round(H*.22)+20, w:Math.round(W*.88), fs:sc(54,W), fw:'800', fill:'#0F172A', ta:'center', lh:.97 }),
      TX('A clear, compelling subtitle that expands the headline.', { l:Math.round(W*.16), t:Math.round(H*.22)+20+sc(54,W)*2+22, w:Math.round(W*.68), fs:sc(15,W), fill:'#64748B', ta:'center', lh:1.7 }),
    ])
  },
  { id: 'hero-gradient', label: 'Purple Gradient', cat: 'Hero', preview: '#5B50E8',
    build: (W, H) => pg('#5B50E8', [
      BX({ l:0, t:0, w:W, h:H, fill:'#5B50E8' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.14), w:56, h:3, fill:'rgba(255,255,255,.35)', rx:2 }),
      TX('Bold Gradient\nSlide Title', { l:Math.round(W*.06), t:Math.round(H*.22), w:Math.round(W*.62), fs:sc(60,W), fw:'900', fill:'#FFFFFF', lh:.95 }),
      TX('For key moments — launches, announcements, big bets.', { l:Math.round(W*.06), t:Math.round(H*.22)+sc(60,W)*2+26, w:Math.round(W*.5), fs:sc(15,W), fill:'rgba(255,255,255,.6)', lh:1.65 }),
    ])
  },
  { id: 'hero-split', label: 'Split Accent', cat: 'Hero', preview: '#FFFFFF',
    build: (W, H) => pg('#FFFFFF', [
      BX({ l:Math.round(W*.57), t:0, w:Math.round(W*.43), h:H, fill:'#5B50E8' }),
      TX('Headline\nLeft Column', { l:Math.round(W*.06), t:Math.round(H*.26), w:Math.round(W*.46), fs:sc(46,W), fw:'800', fill:'#0F172A', lh:.97 }),
      TX('Description text on the left with space for more detail.', { l:Math.round(W*.06), t:Math.round(H*.26)+sc(46,W)*2+20, w:Math.round(W*.44), fs:sc(14,W), fill:'#64748B', lh:1.65 }),
      TX('Right\nHighlight', { l:Math.round(W*.62), t:Math.round(H*.3), w:Math.round(W*.3), fs:sc(38,W), fw:'700', fill:'#FFFFFF', lh:.97 }),
    ])
  },
  { id: 'hero-bold-type', label: 'Bold Typography', cat: 'Hero', preview: '#FAFAF8',
    build: (W, H) => pg('#FAFAF8', [
      LN(0, Math.round(H*.12), W, Math.round(H*.12), '#0F172A', 3),
      LN(0, Math.round(H*.88), W, Math.round(H*.88), '#0F172A', 3),
      TX('BIG\nSTATEMENT', { l:Math.round(W*.04), t:Math.round(H*.15), w:W*.92, fs:sc(88,W), fw:'900', fill:'#0F172A', lh:.82, ff:'Inter', cs:-30 }),
      TX('Design your future.', { l:Math.round(W*.05), t:Math.round(H*.79), w:W*.6, fs:sc(13,W), fill:'#64748B' }),
    ])
  },
  { id: 'hero-dark-grid', label: 'Dark Grid', cat: 'Hero', preview: '#090C14',
    build: (W, H) => pg('#090C14', [
      BX({ l:0, t:0, w:W, h:H, fill:'#090C14' }),
      ...[...Array(8)].map((_, i) => LN(Math.round(W/8*i), 0, Math.round(W/8*i), H, 'rgba(255,255,255,.04)')),
      ...[...Array(6)].map((_, i) => LN(0, Math.round(H/6*i), W, Math.round(H/6*i), 'rgba(255,255,255,.04)')),
      BX({ l:Math.round(W*.06), t:Math.round(H*.38), w:Math.round(W*.34), h:Math.round(H*.24), fill:'#5B50E8', rx:3 }),
      TX('Grid\nLayout', { l:Math.round(W*.42), t:Math.round(H*.35), w:Math.round(W*.52), fs:sc(46,W), fw:'800', fill:'#FFFFFF' }),
    ])
  },
  { id: 'hero-photo', label: 'Photo Overlay', cat: 'Hero', preview: '#1A1A2E',
    build: (W, H) => pg('#1A1A2E', [
      BX({ l:0, t:0, w:W, h:H, fill:'#1A1A2E' }),
      BX({ l:0, t:Math.round(H*.55), w:W, h:Math.round(H*.45), fill:'rgba(0,0,0,.65)', op:.85 }),
      TX('Click to replace\nwith your photo', { l:Math.round(W*.3), t:Math.round(H*.2), w:Math.round(W*.4), fs:sc(14,W), fill:'rgba(255,255,255,.22)', ta:'center', ff:'JetBrains Mono' }),
      TX('Image Headline', { l:Math.round(W*.08), t:Math.round(H*.62), w:Math.round(W*.84), fs:sc(44,W), fw:'800', fill:'#FFFFFF' }),
      TX('Caption text beneath the main headline.', { l:Math.round(W*.08), t:Math.round(H*.62)+sc(44,W)+14, w:Math.round(W*.58), fs:sc(14,W), fill:'rgba(255,255,255,.55)', lh:1.6 }),
    ])
  },
  { id: 'hero-warm', label: 'Warm Cream', cat: 'Hero', preview: '#FAF5EF',
    build: (W, H) => pg('#FAF5EF', [
      BX({ l:Math.round(W*.76), t:0, w:Math.round(W*.24), h:H, fill:'#E8DDD0' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.36), w:Math.round(W*.58), h:2, fill:'#C4A882' }),
      TX('Warm & Inviting\nHeadline', { l:Math.round(W*.06), t:Math.round(H*.15), w:Math.round(W*.64), fs:sc(48,W), fw:'700', fill:'#2C1810', ff:'Cormorant Garamond', lh:.95 }),
      TX('Perfect for proposals, invitations, and premium brands.', { l:Math.round(W*.06), t:Math.round(H*.38)+14, w:Math.round(W*.56), fs:sc(14,W), fill:'#6B4C3B', lh:1.7 }),
    ])
  },
  { id: 'hero-teal', label: 'Teal Accent', cat: 'Hero', preview: '#0D2B2B',
    build: (W, H) => pg('#0D2B2B', [
      BX({ l:0, t:0, w:W, h:H, fill:'#0D2B2B' }),
      BX({ l:0, t:Math.round(H*.48), w:Math.round(W*.28), h:Math.round(H*.52), fill:'#0F9B8E', op:.18 }),
      TX('Teal Dark\nStatement', { l:Math.round(W*.06), t:Math.round(H*.2), w:Math.round(W*.7), fs:sc(52,W), fw:'800', fill:'#FFFFFF', lh:.96 }),
      TX('A refined, confident layout for ambitious brands.', { l:Math.round(W*.06), t:Math.round(H*.2)+sc(52,W)*2+22, w:Math.round(W*.48), fs:sc(15,W), fill:'rgba(255,255,255,.45)', lh:1.65 }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.73), w:Math.round(W*.06), h:2, fill:'#0F9B8E', rx:2 }),
    ])
  },
  { id: 'hero-red', label: 'Bold Red', cat: 'Hero', preview: '#B91C1C',
    build: (W, H) => pg('#B91C1C', [
      BX({ l:0, t:0, w:W, h:H, fill:'#B91C1C' }),
      TX('BOLD\nSTATEMENT', { l:Math.round(W*.04), t:Math.round(H*.18), w:W*.92, fs:sc(80,W), fw:'900', fill:'#FFFFFF', lh:.86 }),
      LN(Math.round(W*.04), Math.round(H*.75), Math.round(W*.18), Math.round(H*.75), '#FFFFFF', 2),
      TX('Powerful. Direct. Unmissable.', { l:Math.round(W*.04), t:Math.round(H*.77), w:W*.6, fs:sc(16,W), fill:'rgba(255,255,255,.7)', fw:'500' }),
    ])
  },

  // ══ PITCH DECK ════════════════════════════════════════════════════════════

  { id: 'pitch-title', label: 'Deck Title', cat: 'Pitch', preview: '#070A14',
    build: (W, H) => pg('#070A14', [
      BX({ l:0, t:0, w:W, h:H, fill:'#070A14' }),
      BX({ l:Math.round(W*.5)-2, t:Math.round(H*.2), w:4, h:Math.round(H*.6), fill:'rgba(91,80,232,.25)' }),
      TX('Company\nName', { l:Math.round(W*.08), t:Math.round(H*.22), w:Math.round(W*.38), fs:sc(52,W), fw:'800', fill:'#FFFFFF', lh:.95 }),
      TX('Tagline — one unforgettable line', { l:Math.round(W*.08), t:Math.round(H*.22)+sc(52,W)*2+18, w:Math.round(W*.4), fs:sc(15,W), fill:'rgba(255,255,255,.38)', lh:1.6 }),
      TX('Series A · 2025', { l:Math.round(W*.55), t:Math.round(H*.56), w:Math.round(W*.35), fs:sc(10,W), fill:'rgba(255,255,255,.25)', ff:'JetBrains Mono' }),
    ])
  },
  { id: 'pitch-problem', label: 'The Problem', cat: 'Pitch', preview: '#FFF5F5',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#DC2626' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.12), w:52, h:4, fill:'#DC2626', rx:2 }),
      TX('The Problem', { l:Math.round(W*.06), t:Math.round(H*.12)+16, w:Math.round(W*.7), fs:sc(38,W), fw:'900', fill:'#0F172A', lh:1.0 }),
      TX('Your customers face this painful challenge every single day.', { l:Math.round(W*.06), t:Math.round(H*.12)+16+sc(38,W)+14, w:Math.round(W*.55), fs:sc(15,W), fill:'#374151', lh:1.65 }),
      ...[['😤', 'Wasted Time', '#FEF2F2', '#991B1B'], ['💸', 'Lost Revenue', '#FFF7ED', '#92400E'], ['🔥', 'Broken Process', '#FFFBEB', '#78350F']].map(([icon, title, bg, col], i) => {
        const x = Math.round(W*.06)+i*Math.round(W*.31); const y = Math.round(H*.58)
        return [BX({ l:x, t:y, w:Math.round(W*.28), h:Math.round(H*.26), fill:bg, rx:14 }), TX(`${icon}  ${title}`, { l:x+16, t:y+18, w:Math.round(W*.24), fs:sc(14,W), fw:'700', fill:col })]
      }).flat(),
    ])
  },
  { id: 'pitch-solution', label: 'The Solution', cat: 'Pitch', preview: '#F0FDF4',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#16A34A' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.12), w:52, h:4, fill:'#16A34A', rx:2 }),
      TX('The Solution', { l:Math.round(W*.06), t:Math.round(H*.12)+16, w:Math.round(W*.7), fs:sc(38,W), fw:'900', fill:'#0F172A' }),
      TX('How we solve it — clearly and concisely.', { l:Math.round(W*.06), t:Math.round(H*.12)+16+sc(38,W)+14, w:Math.round(W*.54), fs:sc(15,W), fill:'#374151', lh:1.65 }),
      ...(['#16A34A', '#5B50E8', '#D97706'].map((col, i) => {
        const x = Math.round(W*.06)+i*Math.round(W*.3); const y = Math.round(H*.56)
        return [BX({ l:x, t:y, w:Math.round(W*.27), h:Math.round(H*.3), fill:'#F9FAFB', rx:14 }), BX({ l:x+16, t:y+16, w:38, h:38, fill:col, rx:10 }), TX(`0${i+1}`, { l:x+25, t:y+21, w:26, fs:sc(13,W), fw:'800', fill:'#fff', ta:'center', ff:'JetBrains Mono' }), TX(['Core Feature', 'Unique Edge', 'Key Outcome'][i], { l:x+14, t:y+70, w:Math.round(W*.24), fs:sc(14,W), fw:'700', fill:'#0F172A' }), TX('Benefit-driven description of this capability.', { l:x+14, t:y+70+sc(14,W)+8, w:Math.round(W*.24), fs:sc(11,W), fill:'#6B7280', lh:1.55 })]
      })).flat(),
    ])
  },
  { id: 'pitch-market', label: 'Market Size', cat: 'Pitch', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#5B50E8' }),
      TX('Market Opportunity', { l:Math.round(W*.06), t:36, w:Math.round(W*.7), fs:sc(32,W), fw:'800', fill:'#0F172A' }),
      ...[['$450B', 'TAM', 'Total Addressable Market', '#5B50E8'], ['$62B', 'SAM', 'Serviceable Addressable Market', '#D97706'], ['$8B', 'SOM', 'Serviceable Obtainable Market', '#16A34A']].map(([val, label, desc, col], i) => {
        const cw = Math.round((W - 140) / 3); const cx = 50 + i * (cw + 20); const cy = Math.round(H*.32)
        return [CL({ l:cx+cw/2-(60+i*12), t:cy-(60+i*12), r:60+i*12, fill:col, op:.12+i*.06 }), TX(val, { l:cx, t:cy, w:cw, fs:sc(36,W), fw:'800', fill:col, ta:'center', ff:'JetBrains Mono' }), TX(label, { l:cx, t:cy+sc(36,W)+6, w:cw, fs:sc(11,W), fw:'700', fill:col, ta:'center', ff:'JetBrains Mono' }), TX(desc, { l:cx-10, t:cy+sc(36,W)+30, w:cw+20, fs:sc(11,W), fill:'#64748B', ta:'center', lh:1.5 })]
      }).flat(),
    ])
  },
  { id: 'pitch-traction', label: 'Traction', cat: 'Pitch', preview: '#080D1A',
    build: (W, H) => pg('#080D1A', [
      BX({ l:0, t:0, w:W, h:H, fill:'#080D1A' }),
      TX('Traction', { l:Math.round(W*.06), t:38, w:Math.round(W*.6), fs:sc(30,W), fw:'900', fill:'#FFFFFF' }),
      TX("We're growing fast.", { l:Math.round(W*.06)+sc(30,W)*8+20, t:38+sc(30,W)*.15, w:300, fs:sc(13,W), fill:'rgba(255,255,255,.35)' }),
      ...([['$0M', 'ARR', '#16A34A'], ['0K', 'Customers', '#5B50E8'], ['0%', 'MoM Growth', '#D97706'], ['0', 'NPS', '#EC4899']].map(([val, lbl, col], i) => {
        const cw = Math.round((W-120)/4); const cx = 50+i*(cw+13)
        return [BX({ l:cx, t:Math.round(H*.28), w:cw, h:Math.round(H*.54), fill:'rgba(255,255,255,.04)', rx:16 }), BX({ l:cx, t:Math.round(H*.28), w:cw, h:4, fill:col, rx:2 }), TX(val, { l:cx+16, t:Math.round(H*.28)+28, w:cw-32, fs:sc(34,W), fw:'800', fill:col }), TX(lbl, { l:cx+16, t:Math.round(H*.28)+28+sc(34,W)+10, w:cw-32, fs:sc(12,W), fw:'500', fill:'rgba(255,255,255,.52)' })]
      })).flat(),
    ])
  },
  { id: 'pitch-team', label: 'Team', cat: 'Pitch', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('The Team', { l:Math.round(W*.06), t:36, w:Math.round(W*.7), fs:sc(32,W), fw:'900', fill:'#0F172A' }),
      ...(['CEO & Founder', 'CTO & Co-Founder', 'Head of Growth'].map((role, i) => {
        const cw = Math.round((W-140)/3); const cx = 50+i*(cw+20)
        return [BX({ l:cx, t:Math.round(H*.38), w:cw, h:Math.round(H*.46), fill:'#FFFFFF', rx:16 }), CL({ l:cx+cw/2-30, t:Math.round(H*.38)+18, r:30, fill:'#EEF2FF' }), TX('Full Name', { l:cx+10, t:Math.round(H*.38)+90, w:cw-20, fs:sc(15,W), fw:'700', fill:'#0F172A', ta:'center' }), TX(role, { l:cx+10, t:Math.round(H*.38)+90+sc(15,W)+6, w:cw-20, fs:sc(10,W), fill:'#5B50E8', ta:'center', ff:'JetBrains Mono', fw:'600' }), TX('10+ years · Ex-Google', { l:cx+10, t:Math.round(H*.38)+90+sc(15,W)+28, w:cw-20, fs:sc(11,W), fill:'#64748B', ta:'center', lh:1.5 })]
      })).flat(),
    ])
  },
  { id: 'pitch-product', label: 'Product Demo', cat: 'Pitch', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#5B50E8' }),
      TX('Product Overview', { l:Math.round(W*.06), t:36, w:Math.round(W*.5), fs:sc(28,W), fw:'800', fill:'#0F172A' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.28), w:Math.round(W*.56), h:Math.round(H*.56), fill:'#E2E8F0', rx:14 }),
      BX({ l:Math.round(W*.66), t:Math.round(H*.28), w:Math.round(W*.28), h:Math.round(H*.14), fill:'#EEF2FF', rx:12 }),
      BX({ l:Math.round(W*.66), t:Math.round(H*.28)+Math.round(H*.16), w:Math.round(W*.28), h:Math.round(H*.14), fill:'#F0FDF4', rx:12 }),
      BX({ l:Math.round(W*.66), t:Math.round(H*.28)+Math.round(H*.32), w:Math.round(W*.28), h:Math.round(H*.14), fill:'#FFFBEB', rx:12 }),
      TX('Add screenshot', { l:Math.round(W*.18), t:Math.round(H*.48), w:Math.round(W*.32), fs:sc(11,W), fill:'#94A3B8', ta:'center', ff:'JetBrains Mono' }),
      TX('Feature 1', { l:Math.round(W*.67), t:Math.round(H*.32), w:Math.round(W*.24), fs:sc(12,W), fw:'600', fill:'#3730A3' }),
      TX('Feature 2', { l:Math.round(W*.67), t:Math.round(H*.28)+Math.round(H*.18), w:Math.round(W*.24), fs:sc(12,W), fw:'600', fill:'#166534' }),
      TX('Feature 3', { l:Math.round(W*.67), t:Math.round(H*.28)+Math.round(H*.34), w:Math.round(W*.24), fs:sc(12,W), fw:'600', fill:'#92400E' }),
    ])
  },
  { id: 'pitch-competition', label: 'Competition', cat: 'Pitch', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Competitive Landscape', { l:Math.round(W*.06), t:36, w:Math.round(W*.7), fs:sc(28,W), fw:'800', fill:'#0F172A' }),
      LN(Math.round(W*.5), Math.round(H*.2), Math.round(W*.5), Math.round(H*.9), '#E2E8F0'),
      LN(Math.round(W*.12), Math.round(H*.55), Math.round(W*.88), Math.round(H*.55), '#E2E8F0'),
      TX('Easy to Use →', { l:Math.round(W*.78), t:Math.round(H*.52), w:120, fs:sc(9,W), fill:'#94A3B8', fw:'600', ff:'JetBrains Mono' }),
      TX('← Complex', { l:Math.round(W*.1), t:Math.round(H*.52), w:100, fs:sc(9,W), fill:'#94A3B8', fw:'600', ff:'JetBrains Mono' }),
      TX('↑ Enterprise', { l:Math.round(W*.47), t:Math.round(H*.2), w:100, fs:sc(9,W), fill:'#94A3B8', fw:'600', ff:'JetBrains Mono' }),
      TX('SMB ↓', { l:Math.round(W*.47), t:Math.round(H*.88), w:80, fs:sc(9,W), fill:'#94A3B8', fw:'600', ff:'JetBrains Mono' }),
      CL({ l:Math.round(W*.62), t:Math.round(H*.25), r:14, fill:'#94A3B8', op:.5 }), TX('Comp A', { l:Math.round(W*.67), t:Math.round(H*.25), w:80, fs:sc(9,W), fill:'#64748B' }),
      CL({ l:Math.round(W*.25), t:Math.round(H*.65), r:14, fill:'#94A3B8', op:.5 }), TX('Comp B', { l:Math.round(W*.3), t:Math.round(H*.65), w:80, fs:sc(9,W), fill:'#64748B' }),
      CL({ l:Math.round(W*.65), t:Math.round(H*.38), r:24, fill:'#5B50E8' }), TX('You', { l:Math.round(W*.7), t:Math.round(H*.39), w:60, fs:sc(12,W), fill:'#5B50E8', fw:'700' }),
    ])
  },
  { id: 'pitch-bizmodel', label: 'Business Model', cat: 'Pitch', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#D97706' }),
      TX('Business Model', { l:Math.round(W*.06), t:36, w:Math.round(W*.7), fs:sc(32,W), fw:'900', fill:'#0F172A' }),
      ...[['Revenue Streams', ['SaaS Subscription', '$99–$499/mo'], '#FFFBEB', '#92400E'], ['Cost Structure', ['R&D · 35%', 'S&M · 40%', 'G&A · 25%'], '#FFF7ED', '#78350F'], ['Unit Economics', ['LTV $12,000', 'CAC $800', 'LTV:CAC 15x'], '#F0FDF4', '#14532D']].map(([title, items, bg, col], i) => {
        const cw = Math.round((W-140)/3); const cx = 50+i*(cw+20)
        return [BX({ l:cx, t:Math.round(H*.34), w:cw, h:Math.round(H*.52), fill:bg, rx:14 }), TX(title as string, { l:cx+14, t:Math.round(H*.34)+16, w:cw-28, fs:sc(13,W), fw:'700', fill:col }), ...(items as string[]).map((item, j) => TX(item, { l:cx+14, t:Math.round(H*.34)+16+sc(13,W)+10+j*sc(16,W), w:cw-28, fs:sc(12,W), fill:col, lh:1.5 }))]
      }).flat(),
    ])
  },
  { id: 'pitch-roadmap', label: 'Roadmap', cat: 'Pitch', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Product Roadmap', { l:Math.round(W*.06), t:36, w:Math.round(W*.7), fs:sc(30,W), fw:'800', fill:'#0F172A' }),
      LN(Math.round(W*.08), Math.round(H*.5), Math.round(W*.92), Math.round(H*.5), '#5B50E8', 3),
      ...[['Q1 2025', 'Launch', '#5B50E8'], ['Q2 2025', 'Growth', '#7C3AED'], ['Q3 2025', 'Scale', '#2563EB'], ['Q4 2025', 'Enterprise', '#0F172A']].map(([q, label, col], i) => {
        const x = Math.round(W*.1)+i*Math.round(W*.22)
        return [CL({ l:x-12, t:Math.round(H*.5)-12, r:12, fill:col }), TX(q as string, { l:x-40, t:Math.round(H*.5)+24, w:100, fs:sc(9,W), fill:'#94A3B8', ff:'JetBrains Mono', ta:'center' }), TX(label as string, { l:x-50, t:Math.round(H*.5)-60, w:120, fs:sc(13,W), fw:'700', fill:col, ta:'center' })]
      }).flat(),
    ])
  },
  { id: 'pitch-ask', label: 'The Ask', cat: 'Pitch', preview: '#4F46E5',
    build: (W, H) => pg('#4F46E5', [
      BX({ l:0, t:0, w:W, h:H, fill:'#4F46E5' }),
      TX('We are raising', { l:Math.round(W*.1), t:Math.round(H*.2), w:Math.round(W*.8), fs:sc(18,W), fill:'rgba(255,255,255,.55)', ta:'center' }),
      TX('$2M Seed Round', { l:Math.round(W*.06), t:Math.round(H*.2)+sc(18,W)+16, w:Math.round(W*.88), fs:sc(62,W), fw:'900', fill:'#FFFFFF', ta:'center', lh:.94 }),
      LN(Math.round(W*.5)-50, Math.round(H*.68), Math.round(W*.5)+50, Math.round(H*.68), 'rgba(255,255,255,.35)', 2),
      TX('hello@company.com · company.com', { l:Math.round(W*.1), t:Math.round(H*.7), w:Math.round(W*.8), fs:sc(14,W), fill:'rgba(255,255,255,.6)', ta:'center' }),
    ])
  },
  { id: 'pitch-vision', label: 'Vision', cat: 'Pitch', preview: '#020817',
    build: (W, H) => pg('#020817', [
      BX({ l:0, t:0, w:W, h:H, fill:'#020817' }),
      TX('★', { l:Math.round(W*.5)-24, t:Math.round(H*.1), w:48, fs:36, fill:'#FCD34D', ta:'center' }),
      TX('Our Vision', { l:Math.round(W*.08), t:Math.round(H*.22), w:Math.round(W*.84), fs:sc(16,W), fill:'rgba(255,255,255,.3)', ta:'center', fw:'600', ff:'JetBrains Mono', cs:400 }),
      TX('"To be the global\nstandard for intelligent\ndocument experiences."', { l:Math.round(W*.08), t:Math.round(H*.3), w:Math.round(W*.84), fs:sc(34,W), fw:'600', fill:'#FFFFFF', ta:'center', ff:'Cormorant Garamond', lh:1.22 }),
    ])
  },

  // ══ PROPOSAL / DOC ════════════════════════════════════════════════════════

  { id: 'prop-cover', label: 'Proposal Cover', cat: 'Proposal', preview: '#FAFAF8',
    build: (W, H) => pg('#FAFAF8', [
      BX({ l:0, t:0, w:W, h:6, fill:'#0F172A' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.14), w:Math.round(W*.05), h:4, fill:'#5B50E8', rx:2 }),
      TX('BUSINESS PROPOSAL', { l:Math.round(W*.13), t:Math.round(H*.14)+4, w:280, fs:sc(9,W), fw:'700', fill:'#5B50E8', ff:'JetBrains Mono' }),
      TX('Proposal for\nClient Company', { l:Math.round(W*.06), t:Math.round(H*.24), w:Math.round(W*.58), fs:sc(54,W), fw:'900', fill:'#0F172A', ff:'Cormorant Garamond', lh:.9 }),
      LN(Math.round(W*.06), Math.round(H*.66), Math.round(W*.34), Math.round(H*.66), '#E2E8F0'),
      TX('Prepared by Your Company · hello@company.com', { l:Math.round(W*.06), t:Math.round(H*.68), w:Math.round(W*.5), fs:sc(12,W), fill:'#64748B', lh:1.65 }),
      TX(new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}), { l:Math.round(W*.06), t:Math.round(H*.82), w:240, fs:sc(11,W), fill:'#94A3B8', ff:'JetBrains Mono' }),
    ])
  },
  { id: 'prop-exec-summary', label: 'Executive Summary', cat: 'Proposal', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Executive Summary', { l:Math.round(W*.06), t:34, w:Math.round(W*.55), fs:sc(26,W), fw:'800', fill:'#0F172A' }),
      LN(Math.round(W*.06), Math.round(H*.22), Math.round(W*.94), Math.round(H*.22), '#E2E8F0'),
      TX('Overview', { l:Math.round(W*.06), t:Math.round(H*.24), w:Math.round(W*.3), fs:sc(11,W), fw:'700', fill:'#5B50E8', ff:'JetBrains Mono' }),
      TX('Provide a concise summary of your proposal, the key opportunity, and why your company is uniquely positioned to deliver.', { l:Math.round(W*.06), t:Math.round(H*.28), w:Math.round(W*.88), fs:sc(14,W), fill:'#374151', lh:1.7 }),
      TX('Key Objectives', { l:Math.round(W*.06), t:Math.round(H*.46), w:200, fs:sc(11,W), fw:'700', fill:'#5B50E8', ff:'JetBrains Mono' }),
      ...['Objective 1 — describe the first goal', 'Objective 2 — describe the second goal', 'Objective 3 — describe the third goal'].map((item, i) => TX(`→  ${item}`, { l:Math.round(W*.06), t:Math.round(H*.5)+i*sc(20,W), w:Math.round(W*.8), fs:sc(13,W), fill:'#374151', lh:1.6 })),
    ])
  },
  { id: 'prop-scope', label: 'Scope of Work', cat: 'Proposal', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Scope of Work', { l:Math.round(W*.06), t:34, w:Math.round(W*.6), fs:sc(28,W), fw:'800', fill:'#0F172A' }),
      ...[['Discovery', '1 week'], ['Strategy & Planning', '2 weeks'], ['Design & Build', '6 weeks'], ['Testing & QA', '2 weeks'], ['Launch & Handover', '1 week']].map(([phase, dur], i) => {
        const y = Math.round(H*.24)+i*Math.round(H*.12)
        return [BX({ l:Math.round(W*.06), t:y, w:Math.round(W*.88), h:Math.round(H*.1), fill:i%2===0?'#FFFFFF':'#F8FAFC', rx:10 }), BX({ l:Math.round(W*.06), t:y, w:4, h:Math.round(H*.1), fill:'#5B50E8', rx:2 }), TX(`${i+1}. ${phase}`, { l:Math.round(W*.09), t:y+Math.round(H*.03), w:Math.round(W*.6), fs:sc(13,W), fw:'600', fill:'#0F172A' }), TX(dur, { l:Math.round(W*.8), t:y+Math.round(H*.03), w:Math.round(W*.12), fs:sc(11,W), fill:'#64748B', ta:'right', ff:'JetBrains Mono' })]
      }).flat(),
    ])
  },
  { id: 'prop-pricing', label: 'Pricing Table', cat: 'Proposal', preview: '#FFFFFF',
    build: (W, H) => pg('#FFFFFF', [
      BX({ l:0, t:0, w:W, h:5, fill:'#16A34A' }),
      TX('Investment', { l:Math.round(W*.06), t:36, w:Math.round(W*.6), fs:sc(30,W), fw:'900', fill:'#0F172A' }),
      LN(Math.round(W*.06), Math.round(H*.26), Math.round(W*.94), Math.round(H*.26), '#E2E8F0'),
      ...[['Discovery & Strategy', '$2,500'], ['Design & Prototyping', '$5,000'], ['Development', '$12,000'], ['Testing & Launch', '$2,500']].map(([item, price], i) => {
        const y = Math.round(H*.28)+i*Math.round(H*.1)
        return [BX({ l:Math.round(W*.06), t:y, w:Math.round(W*.88), h:Math.round(H*.09), fill:i%2===0?'#F9FAFB':'#FFFFFF' }), TX(item as string, { l:Math.round(W*.09), t:y+Math.round(H*.03), w:Math.round(W*.6), fs:sc(13,W), fw:'500', fill:'#0F172A' }), TX(price as string, { l:Math.round(W*.76), t:y+Math.round(H*.03), w:Math.round(W*.16), fs:sc(13,W), fw:'700', fill:'#16A34A', ta:'right', ff:'JetBrains Mono' })]
      }).flat(),
      LN(Math.round(W*.06), Math.round(H*.72), Math.round(W*.94), Math.round(H*.72), '#0F172A', 2),
      TX('Total Investment', { l:Math.round(W*.09), t:Math.round(H*.74), w:Math.round(W*.5), fs:sc(15,W), fw:'700', fill:'#0F172A' }),
      TX('$22,000', { l:Math.round(W*.74), t:Math.round(H*.74), w:Math.round(W*.18), fs:sc(17,W), fw:'800', fill:'#0F172A', ta:'right', ff:'JetBrains Mono' }),
    ])
  },
  { id: 'prop-timeline', label: 'Project Timeline', cat: 'Proposal', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#5B50E8' }),
      TX('Project Timeline', { l:Math.round(W*.06), t:36, w:Math.round(W*.7), fs:sc(28,W), fw:'800', fill:'#0F172A' }),
      LN(Math.round(W*.08), Math.round(H*.4), Math.round(W*.92), Math.round(H*.4), '#5B50E8', 3),
      ...['Week 1-2', 'Week 3-5', 'Week 6-9', 'Week 10-12'].map((wk, i) => {
        const x = Math.round(W*.1)+i*Math.round(W*.22)
        return [BX({ l:x-10, t:Math.round(H*.4)-10, w:20, h:20, fill:'#5B50E8', rx:10 }), TX(wk, { l:x-50, t:Math.round(H*.4)+24, w:120, fs:sc(10,W), fill:'#5B50E8', ta:'center', fw:'600', ff:'JetBrains Mono' }), TX(['Kick-off', 'Design', 'Build', 'Launch'][i], { l:x-50, t:Math.round(H*.4)-50, w:120, fs:sc(13,W), fw:'700', fill:'#0F172A', ta:'center' })]
      }).flat(),
      TX('Total duration: 12 weeks', { l:Math.round(W*.06), t:Math.round(H*.75), w:Math.round(W*.5), fs:sc(13,W), fill:'#64748B', ff:'JetBrains Mono' }),
    ])
  },
  { id: 'prop-case-study', label: 'Case Study', cat: 'Proposal', preview: '#F0F9FF',
    build: (W, H) => pg('#F0F9FF', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0369A1' }),
      TX('Case Study', { l:Math.round(W*.06), t:34, w:Math.round(W*.5), fs:sc(28,W), fw:'800', fill:'#0C4A6E' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.22), w:Math.round(W*.42), h:Math.round(H*.64), fill:'#FFFFFF', rx:14 }),
      TX('Client Challenge', { l:Math.round(W*.09), t:Math.round(H*.25), w:Math.round(W*.36), fs:sc(11,W), fw:'700', fill:'#0369A1', ff:'JetBrains Mono' }),
      TX('The client faced a critical gap in their customer onboarding flow, resulting in a 68% drop-off rate.', { l:Math.round(W*.09), t:Math.round(H*.29), w:Math.round(W*.36), fs:sc(12,W), fill:'#0C4A6E', lh:1.6 }),
      TX('Our Solution', { l:Math.round(W*.09), t:Math.round(H*.49), w:Math.round(W*.36), fs:sc(11,W), fw:'700', fill:'#0369A1', ff:'JetBrains Mono' }),
      TX('We redesigned the entire onboarding experience with progressive disclosure.', { l:Math.round(W*.09), t:Math.round(H*.53), w:Math.round(W*.36), fs:sc(12,W), fill:'#0C4A6E', lh:1.6 }),
      TX('Results', { l:Math.round(W*.55), t:Math.round(H*.22), w:Math.round(W*.36), fs:sc(11,W), fw:'700', fill:'#0369A1', ff:'JetBrains Mono' }),
      ...(['↑ 89%', '↑ $2.4M', '↓ 42%', '4.8/5'].map((val, i) => TX(val, { l:Math.round(W*.55), t:Math.round(H*.28)+i*Math.round(H*.13), w:Math.round(W*.36), fs:sc(28,W), fw:'800', fill:'#0369A1', ff:'JetBrains Mono' }))),
    ])
  },

  // ══ EDITORIAL ════════════════════════════════════════════════════════════

  { id: 'editorial-cover', label: 'Magazine Cover', cat: 'Editorial', preview: '#FAFAF8',
    build: (W, H) => pg('#FAFAF8', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }), BX({ l:0, t:H-5, w:W, h:5, fill:'#0F172A' }),
      TX('VOL. 01 · ISSUE 04 · 2025', { l:Math.round(W*.06), t:22, w:Math.round(W*.5), fs:sc(9,W), fw:'600', fill:'#5B50E8', ff:'JetBrains Mono' }),
      TX('The Future\nof Design', { l:Math.round(W*.06), t:Math.round(H*.12), w:Math.round(W*.56), fs:sc(72,W), fw:'900', fill:'#0F172A', ff:'Cormorant Garamond', lh:.87 }),
      LN(Math.round(W*.06), Math.round(H*.63), Math.round(W*.28), Math.round(H*.63), '#0F172A', 2),
      TX('A deep dive into visual systems that shape how the world works.', { l:Math.round(W*.06), t:Math.round(H*.65), w:Math.round(W*.46), fs:sc(13,W), fill:'#475569', lh:1.7 }),
      BX({ l:Math.round(W*.62), t:0, w:Math.round(W*.38), h:H, fill:'#0F172A' }),
    ])
  },
  { id: 'editorial-article', label: 'Article Spread', cat: 'Editorial', preview: '#FFFFFF',
    build: (W, H) => pg('#FFFFFF', [
      LN(Math.round(W*.5), Math.round(H*.08), Math.round(W*.5), Math.round(H*.92), '#E2E8F0'),
      TX('FEATURE STORY', { l:Math.round(W*.06), t:Math.round(H*.08), w:Math.round(W*.4), fs:sc(9,W), fw:'700', fill:'#5B50E8', ff:'JetBrains Mono', cs:200 }),
      TX('Article\nHeadline', { l:Math.round(W*.06), t:Math.round(H*.12), w:Math.round(W*.4), fs:sc(40,W), fw:'900', fill:'#0F172A', ff:'Cormorant Garamond', lh:.93 }),
      TX('Lead paragraph that introduces the story and hooks the reader with the key insight or revelation.', { l:Math.round(W*.06), t:Math.round(H*.12)+sc(40,W)*2+18, w:Math.round(W*.4), fs:sc(14,W), fill:'#374151', lh:1.7, fw:'500' }),
      TX('Body copy continues here. Replace with your article text. Great editorial design gives space to breathe between ideas and sections.', { l:Math.round(W*.06), t:Math.round(H*.62), w:Math.round(W*.4), fs:sc(12,W), fill:'#64748B', lh:1.75 }),
      TX('"The best visual storytelling is invisible."', { l:Math.round(W*.55), t:Math.round(H*.28), w:Math.round(W*.38), fs:sc(22,W), fw:'500', fill:'#0F172A', ff:'Cormorant Garamond', lh:1.25 }),
      LN(Math.round(W*.55), Math.round(H*.6), Math.round(W*.78), Math.round(H*.6), '#E2E8F0'),
      TX('— Byline, Publication', { l:Math.round(W*.55), t:Math.round(H*.62), w:250, fs:sc(11,W), fill:'#94A3B8', lh:1.5 }),
    ])
  },
  { id: 'editorial-pullquote', label: 'Pull Quote', cat: 'Editorial', preview: '#0F172A',
    build: (W, H) => pg('#0F172A', [
      TX('"', { l:Math.round(W*.07), t:Math.round(H*.04), w:100, fs:sc(160,W), fw:'900', fill:'#5B50E8', lh:1 }),
      TX('The best designs solve real problems elegantly, not just look good.', { l:Math.round(W*.07), t:Math.round(H*.28), w:Math.round(W*.78), fs:sc(32,W), fw:'600', fill:'#FFFFFF', ff:'Cormorant Garamond', lh:1.22 }),
      LN(Math.round(W*.07), Math.round(H*.72), Math.round(W*.14), Math.round(H*.72), '#5B50E8', 3),
      TX('— Author Name, Title at Company', { l:Math.round(W*.07), t:Math.round(H*.74), w:Math.round(W*.58), fs:sc(13,W), fill:'rgba(255,255,255,.35)' }),
    ])
  },
  { id: 'editorial-data', label: 'Data Story', cat: 'Editorial', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#5B50E8' }),
      TX('DATA STORY', { l:Math.round(W*.06), t:22, w:200, fs:sc(9,W), fw:'700', fill:'#5B50E8', ff:'JetBrains Mono', cs:200 }),
      TX('By The\nNumbers', { l:Math.round(W*.06), t:Math.round(H*.1), w:Math.round(W*.4), fs:sc(46,W), fw:'900', fill:'#0F172A', ff:'Cormorant Garamond', lh:.93 }),
      ...[['2.4B', 'People affected globally', '#5B50E8'], ['$847M', 'Industry investment in 2024', '#16A34A'], ['340%', 'Year over year growth rate', '#D97706']].map(([val, desc, col], i) => {
        const y = Math.round(H*.2)+i*Math.round(H*.22)
        return [TX(val as string, { l:Math.round(W*.54), t:y, w:Math.round(W*.4), fs:sc(44,W), fw:'900', fill:col, ff:'JetBrains Mono' }), TX(desc as string, { l:Math.round(W*.54), t:y+sc(44,W)+6, w:Math.round(W*.4), fs:sc(12,W), fill:'#64748B', lh:1.5 })]
      }).flat(),
    ])
  },
  { id: 'editorial-manifesto', label: 'Manifesto', cat: 'Editorial', preview: '#FAFAF8',
    build: (W, H) => pg('#FAFAF8', [
      BX({ l:0, t:0, w:W, h:H, fill:'#FAFAF8' }),
      LN(Math.round(W*.08), Math.round(H*.08), Math.round(W*.08), Math.round(H*.92), '#0F172A', 2),
      TX('We believe in building with intention. Every line, every shape, every choice is a statement about what matters.', { l:Math.round(W*.12), t:Math.round(H*.14), w:Math.round(W*.78), fs:sc(26,W), fw:'300', fill:'#0F172A', ff:'Cormorant Garamond', lh:1.35 }),
      TX('This is our work. This is our craft.', { l:Math.round(W*.12), t:Math.round(H*.7), w:Math.round(W*.6), fs:sc(18,W), fw:'700', fill:'#5B50E8', ff:'Cormorant Garamond' }),
    ])
  },

  // ══ STATS / DATA ══════════════════════════════════════════════════════════

  { id: 'stats-kpi-dark', label: 'KPI Dark', cat: 'Stats', preview: '#090C14',
    build: (W, H) => pg('#090C14', [
      BX({ l:0, t:0, w:W, h:H, fill:'#090C14' }),
      TX('Performance Overview', { l:Math.round(W*.05), t:36, w:Math.round(W*.7), fs:sc(22,W), fw:'700', fill:'#FFFFFF' }),
      TX('Q4 2024 · Executive Dashboard', { l:Math.round(W*.05), t:36+sc(22,W)+8, w:Math.round(W*.5), fs:sc(10,W), fill:'rgba(255,255,255,.35)', ff:'JetBrains Mono' }),
      ...([['↑ 47%', 'Revenue Growth', '#16A34A'], ['↑ 23K', 'New Users', '#5B50E8'], ['94%', 'Retention Rate', '#D97706'], ['4.8★', 'Avg Rating', '#EC4899']].map(([val, lbl, col], i) => {
        const cw = Math.round((W-120)/4); const cx = 50+i*(cw+13)
        return [BX({ l:cx, t:Math.round(H*.3), w:cw, h:Math.round(H*.56), fill:'rgba(255,255,255,.04)', rx:14 }), BX({ l:cx, t:Math.round(H*.3), w:cw, h:3, fill:col, rx:2 }), TX(val as string, { l:cx+14, t:Math.round(H*.3)+22, w:cw-28, fs:sc(32,W), fw:'800', fill:col }), TX(lbl as string, { l:cx+14, t:Math.round(H*.3)+22+sc(32,W)+10, w:cw-28, fs:sc(12,W), fw:'500', fill:'rgba(255,255,255,.62)' })]
      })).flat(),
    ])
  },
  { id: 'stats-kpi-light', label: 'KPI Light', cat: 'Stats', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Business Dashboard', { l:Math.round(W*.05), t:34, w:Math.round(W*.6), fs:sc(22,W), fw:'800', fill:'#0F172A' }),
      ...([['$4.2M', 'Monthly Revenue', '#16A34A', '#F0FDF4'], ['↑ 28%', 'Growth MoM', '#5B50E8', '#EEF2FF'], ['8,421', 'Active Users', '#D97706', '#FFFBEB'], ['99.9%', 'Uptime SLA', '#EC4899', '#FDF4FF']].map(([val, lbl, col, bg], i) => {
        const cw = Math.round((W-140)/4); const cx = 50+i*(cw+20)
        return [BX({ l:cx, t:Math.round(H*.28), w:cw, h:Math.round(H*.54), fill:bg, rx:14 }), TX(val as string, { l:cx+14, t:Math.round(H*.3), w:cw-28, fs:sc(30,W), fw:'800', fill:col, ff:'JetBrains Mono' }), TX(lbl as string, { l:cx+14, t:Math.round(H*.3)+sc(30,W)+10, w:cw-28, fs:sc(12,W), fill:'#374151', fw:'500', lh:1.5 })]
      })).flat(),
    ])
  },
  { id: 'stats-comparison', label: 'Before / After', cat: 'Stats', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      BX({ l:Math.round(W*.5)-1, t:0, w:2, h:H, fill:'#E2E8F0' }),
      TX('BEFORE', { l:Math.round(W*.06), t:34, w:Math.round(W*.4), fs:sc(10,W), fw:'700', fill:'#DC2626', ff:'JetBrains Mono', cs:200 }),
      TX('AFTER', { l:Math.round(W*.55), t:34, w:Math.round(W*.4), fs:sc(10,W), fw:'700', fill:'#16A34A', ff:'JetBrains Mono', cs:200 }),
      TX('68%\nDrop-off', { l:Math.round(W*.06), t:Math.round(H*.3), w:Math.round(W*.4), fs:sc(48,W), fw:'900', fill:'#DC2626', ff:'JetBrains Mono', lh:.9 }),
      TX('12%\nDrop-off', { l:Math.round(W*.55), t:Math.round(H*.3), w:Math.round(W*.4), fs:sc(48,W), fw:'900', fill:'#16A34A', ff:'JetBrains Mono', lh:.9 }),
      TX('Result: 56 point improvement in completion rate', { l:Math.round(W*.06), t:Math.round(H*.8), w:Math.round(W*.88), fs:sc(14,W), fill:'#374151', ta:'center', fw:'600' }),
    ])
  },
  { id: 'stats-progress', label: 'Progress Metrics', cat: 'Stats', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#5B50E8' }),
      TX('Goal Progress', { l:Math.round(W*.06), t:34, w:Math.round(W*.6), fs:sc(26,W), fw:'800', fill:'#0F172A' }),
      ...([['Revenue Target', 78, '#16A34A'], ['User Acquisition', 62, '#5B50E8'], ['Customer NPS', 91, '#D97706'], ['Product Delivery', 55, '#EC4899']].map(([label, pct, col], i) => {
        const y = Math.round(H*.26)+i*Math.round(H*.16); const bw = Math.round(W*.7)
        return [TX(label as string, { l:Math.round(W*.06), t:y, w:Math.round(W*.5), fs:sc(13,W), fw:'600', fill:'#0F172A' }), TX(`${pct}%`, { l:Math.round(W*.8), t:y, w:80, fs:sc(13,W), fw:'700', fill:col, ff:'JetBrains Mono' }), BX({ l:Math.round(W*.06), t:y+sc(13,W)+8, w:bw, h:8, fill:'#E2E8F0', rx:4 }), BX({ l:Math.round(W*.06), t:y+sc(13,W)+8, w:Math.round(bw*(pct as number)/100), h:8, fill:col, rx:4 })]
      })).flat(),
    ])
  },

  // ══ CONTENT / FEATURE ════════════════════════════════════════════════════

  { id: 'content-three-col', label: '3 Feature Cards', cat: 'Content', preview: '#FFFFFF',
    build: (W, H) => pg('#FFFFFF', [
      BX({ l:0, t:0, w:W, h:5, fill:'#5B50E8' }),
      TX('Core Features', { l:50, t:36, w:W-100, fs:sc(26,W), fw:'700', fill:'#0F172A', ta:'center' }),
      ...[['⚡', 'Lightning Fast', 'Sub-100ms response times across all core workflows.', '#5B50E8', '#EEF2FF'], ['🔐', 'Enterprise Secure', 'SOC 2 Type II certified with end-to-end encryption.', '#16A34A', '#F0FDF4'], ['📊', 'Real-time Analytics', 'See exactly what happens after you hit send.', '#D97706', '#FFFBEB']].map(([icon, title, body, col, bg], i) => {
        const cw = Math.round((W-140)/3); const cx = 50+i*(cw+20)
        return [BX({ l:cx, t:Math.round(H*.34), w:cw, h:Math.round(H*.52), fill:bg, rx:16 }), TX(icon as string, { l:cx+16, t:Math.round(H*.34)+18, w:cw-32, fs:32, lh:1 }), TX(title as string, { l:cx+16, t:Math.round(H*.34)+66, w:cw-32, fs:sc(15,W), fw:'700', fill:'#0F172A' }), TX(body as string, { l:cx+16, t:Math.round(H*.34)+66+sc(15,W)+8, w:cw-32, fs:sc(12,W), fill:'#64748B', lh:1.6 })]
      }).flat(),
    ])
  },
  { id: 'content-two-col', label: '2 Column Feature', cat: 'Content', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Two Columns', { l:50, t:36, w:W-100, fs:sc(26,W), fw:'700', fill:'#0F172A', ta:'center' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.28), w:Math.round(W*.43), h:Math.round(H*.56), fill:'#EEF2FF', rx:16 }),
      BX({ l:Math.round(W*.52), t:Math.round(H*.28), w:Math.round(W*.43), h:Math.round(H*.56), fill:'#F0FDF4', rx:16 }),
      TX('Left Column Heading', { l:Math.round(W*.09), t:Math.round(H*.33), w:Math.round(W*.37), fs:sc(16,W), fw:'700', fill:'#3730A3' }),
      TX('Describe the left column feature, benefit, or piece of content here.', { l:Math.round(W*.09), t:Math.round(H*.33)+sc(16,W)+10, w:Math.round(W*.37), fs:sc(13,W), fill:'#475569', lh:1.6 }),
      TX('Right Column Heading', { l:Math.round(W*.55), t:Math.round(H*.33), w:Math.round(W*.37), fs:sc(16,W), fw:'700', fill:'#166534' }),
      TX('Describe the right column feature, benefit, or piece of content here.', { l:Math.round(W*.55), t:Math.round(H*.33)+sc(16,W)+10, w:Math.round(W*.37), fs:sc(13,W), fill:'#374151', lh:1.6 }),
    ])
  },
  { id: 'content-numbered', label: 'Numbered Steps', cat: 'Content', preview: '#FFFFFF',
    build: (W, H) => pg('#FFFFFF', [
      BX({ l:0, t:0, w:W, h:5, fill:'#5B50E8' }),
      TX('How It Works', { l:50, t:36, w:W-100, fs:sc(26,W), fw:'700', fill:'#0F172A', ta:'center' }),
      ...[['Connect', 'Link your tools in seconds with our native integrations.'], ['Configure', 'Set up your workspace with smart defaults that adapt to you.'], ['Collaborate', 'Invite your team and start working in real time instantly.'], ['Close', 'Hit your goals faster with AI-powered insights and actions.']].map(([title, body], i) => {
        const y = Math.round(H*.28)+i*Math.round(H*.15)
        return [BX({ l:Math.round(W*.06), t:y, w:40, h:40, fill:['#5B50E8','#7C3AED','#2563EB','#0F172A'][i], rx:20 }), TX(`${i+1}`, { l:Math.round(W*.06), t:y+10, w:40, fs:sc(14,W), fw:'800', fill:'#FFFFFF', ta:'center' }), TX(title as string, { l:Math.round(W*.13), t:y+4, w:Math.round(W*.7), fs:sc(15,W), fw:'700', fill:'#0F172A' }), TX(body as string, { l:Math.round(W*.13), t:y+4+sc(15,W)+6, w:Math.round(W*.72), fs:sc(12,W), fill:'#64748B', lh:1.55 })]
      }).flat(),
    ])
  },
  { id: 'content-image-text', label: 'Image + Text', cat: 'Content', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      BX({ l:Math.round(W*.06), t:Math.round(H*.18), w:Math.round(W*.44), h:Math.round(H*.64), fill:'#E2E8F0', rx:14 }),
      TX('Add your\nimage here', { l:Math.round(W*.14), t:Math.round(H*.42), w:Math.round(W*.28), fs:sc(12,W), fill:'#94A3B8', ta:'center', ff:'JetBrains Mono' }),
      TX('Section Heading', { l:Math.round(W*.56), t:Math.round(H*.2), w:Math.round(W*.36), fs:sc(28,W), fw:'800', fill:'#0F172A', lh:.97 }),
      TX('A compelling description of what makes this section important. Keep it concise and benefit-focused.', { l:Math.round(W*.56), t:Math.round(H*.2)+sc(28,W)*2+16, w:Math.round(W*.36), fs:sc(14,W), fill:'#475569', lh:1.65 }),
      BX({ l:Math.round(W*.56), t:Math.round(H*.66), w:Math.round(W*.1), h:3, fill:'#5B50E8', rx:2 }),
    ])
  },
  { id: 'content-checklist', label: 'Checklist', cat: 'Content', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#16A34A' }),
      TX('What You Get', { l:Math.round(W*.06), t:34, w:Math.round(W*.6), fs:sc(28,W), fw:'800', fill:'#0F172A' }),
      ...['Unlimited document sharing and tracking', 'AI-powered insights for every view', 'Digital signature with legal validity', 'Real-time viewer analytics', 'Forwarding chain detection', 'Custom branding and domain', 'Priority 24/7 support'].map((item, i) => {
        const y = Math.round(H*.26)+i*Math.round(H*.1)
        return [BX({ l:Math.round(W*.06), t:y+6, w:20, h:20, fill:'#16A34A', rx:10 }), TX('✓', { l:Math.round(W*.06), t:y+5, w:20, fs:11, fw:'700', fill:'#fff', ta:'center' }), TX(item, { l:Math.round(W*.12), t:y+6, w:Math.round(W*.78), fs:sc(14,W), fill:'#0F172A', fw:'500' })]
      }).flat(),
    ])
  },
  { id: 'content-icon-grid', label: 'Icon Grid', cat: 'Content', preview: '#FFFFFF',
    build: (W, H) => pg('#FFFFFF', [
      BX({ l:0, t:0, w:W, h:5, fill:'#5B50E8' }),
      TX('Why Choose Us', { l:50, t:36, w:W-100, fs:sc(26,W), fw:'700', fill:'#0F172A', ta:'center' }),
      ...([['🚀', 'Fast Setup'], ['🔐', 'Secure'], ['📊', 'Analytics'], ['🤖', 'AI-Powered'], ['🌍', 'Global'], ['💬', '24/7 Support']].map(([icon, label], i) => {
        const cols = 3; const cw = Math.round((W-160)/(cols)); const cx = 60+(i%cols)*(cw+20); const cy = Math.round(H*.3)+(Math.floor(i/cols))*Math.round(H*.28)
        return [BX({ l:cx, t:cy, w:cw, h:Math.round(H*.22), fill:'#F8FAFC', rx:14, stroke:'#E2E8F0', sw:1 }), TX(icon as string, { l:cx, t:cy+14, w:cw, fs:26, ta:'center', lh:1 }), TX(label as string, { l:cx, t:cy+52, w:cw, fs:sc(12,W), fw:'600', fill:'#0F172A', ta:'center' })]
      })).flat(),
    ])
  },

  // ══ TEAM / PEOPLE ════════════════════════════════════════════════════════

  { id: 'team-grid', label: 'Team Grid', cat: 'Team', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Meet the Team', { l:50, t:36, w:W-100, fs:sc(28,W), fw:'800', fill:'#0F172A', ta:'center' }),
      ...([['Alex Chen', 'CEO'], ['Sarah Kim', 'CTO'], ['Marcus Webb', 'Design'], ['Priya Nair', 'Growth'], ['Daniel Fox', 'Engineering'], ['Luna Park', 'Product']].map(([name, role], i) => {
        const cols = 3; const cw = Math.round((W-160)/cols); const cx = 60+(i%cols)*(cw+20); const cy = Math.round(H*.32)+Math.floor(i/cols)*Math.round(H*.4)
        return [BX({ l:cx, t:cy, w:cw, h:Math.round(H*.34), fill:'#FFFFFF', rx:12 }), CL({ l:cx+cw/2-24, t:cy+14, r:24, fill:'#EEF2FF' }), TX(name as string, { l:cx+8, t:cy+70, w:cw-16, fs:sc(13,W), fw:'700', fill:'#0F172A', ta:'center' }), TX(role as string, { l:cx+8, t:cy+70+sc(13,W)+4, w:cw-16, fs:sc(10,W), fill:'#5B50E8', ta:'center', fw:'600', ff:'JetBrains Mono' })]
      })).flat(),
    ])
  },
  { id: 'team-spotlight', label: 'Speaker Spotlight', cat: 'Team', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      CL({ l:Math.round(W*.06), t:Math.round(H*.2), r:Math.round(Math.min(W,H)*.14), fill:'#E2E8F0' }),
      TX('Keynote Speaker', { l:Math.round(W*.44), t:Math.round(H*.2), w:Math.round(W*.48), fs:sc(10,W), fw:'700', fill:'#5B50E8', ff:'JetBrains Mono', cs:200 }),
      TX('Dr. Sarah\nMcAllister', { l:Math.round(W*.44), t:Math.round(H*.24), w:Math.round(W*.48), fs:sc(42,W), fw:'900', fill:'#0F172A', ff:'Cormorant Garamond', lh:.93 }),
      TX('Chief Innovation Officer, TechGlobal Inc.', { l:Math.round(W*.44), t:Math.round(H*.24)+sc(42,W)*2+14, w:Math.round(W*.48), fs:sc(14,W), fill:'#64748B', lh:1.6 }),
      TX('"Building systems that make people unstoppable."', { l:Math.round(W*.44), t:Math.round(H*.62), w:Math.round(W*.48), fs:sc(15,W), fill:'#0F172A', ff:'Cormorant Garamond', fw:'500', lh:1.4 }),
    ])
  },

  // ══ TESTIMONIALS ════════════════════════════════════════════════════════

  { id: 'testimonial-single', label: 'Single Quote', cat: 'Testimonials', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      LN(Math.round(W*.5)-50, Math.round(H*.2), Math.round(W*.5)+50, Math.round(H*.2), '#5B50E8', 3),
      TX('"Working with this team transformed our business in ways we never imagined possible. The results speak for themselves."', { l:Math.round(W*.08), t:Math.round(H*.28), w:Math.round(W*.84), fs:sc(24,W), fw:'500', fill:'#0F172A', ff:'Cormorant Garamond', ta:'center', lh:1.35 }),
      CL({ l:Math.round(W*.5)-24, t:Math.round(H*.68), r:24, fill:'#E2E8F0' }),
      TX('Sarah Chen · Head of Product, Acme Corp', { l:Math.round(W*.08), t:Math.round(H*.68)+56, w:Math.round(W*.84), fs:sc(12,W), fill:'#64748B', ta:'center' }),
      TX('★★★★★', { l:Math.round(W*.08), t:Math.round(H*.68)+56+sc(12,W)+8, w:Math.round(W*.84), fs:18, fill:'#FCD34D', ta:'center' }),
    ])
  },
  { id: 'testimonial-triple', label: 'Three Quotes', cat: 'Testimonials', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('What Our Customers Say', { l:50, t:36, w:W-100, fs:sc(24,W), fw:'800', fill:'#0F172A', ta:'center' }),
      ...(['"Incredible tool that saved us 10 hours per week."', '"The analytics gave us insights we never had before."', '"Best investment we made this year. Full stop."'].map((quote, i) => {
        const cw = Math.round((W-140)/3); const cx = 50+i*(cw+20)
        return [BX({ l:cx, t:Math.round(H*.3), w:cw, h:Math.round(H*.54), fill:'#FFFFFF', rx:14 }), TX('"', { l:cx+12, t:Math.round(H*.3)+8, w:30, fs:42, fw:'900', fill:'#5B50E8', lh:1 }), TX(quote as string, { l:cx+14, t:Math.round(H*.3)+50, w:cw-28, fs:sc(13,W), fill:'#0F172A', ff:'Cormorant Garamond', lh:1.5 }), TX('— Customer Name', { l:cx+14, t:Math.round(H*.74), w:cw-28, fs:sc(11,W), fill:'#94A3B8' }), TX('★★★★★', { l:cx+14, t:Math.round(H*.74)+sc(11,W)+6, w:cw-28, fs:12, fill:'#FCD34D' })]
      })).flat(),
    ])
  },
  { id: 'testimonial-logos', label: 'Logo Wall', cat: 'Testimonials', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      TX('Trusted by Leading Companies', { l:50, t:Math.round(H*.12), w:W-100, fs:sc(22,W), fw:'700', fill:'#0F172A', ta:'center' }),
      TX('Join 2,000+ companies already using Folio', { l:50, t:Math.round(H*.12)+sc(22,W)+12, w:W-100, fs:sc(13,W), fill:'#64748B', ta:'center' }),
      ...Array.from({length:5}).map((_, i) => {
        const cw = Math.round((W-180)/5); const cx = 60+i*(cw+30)
        return [BX({ l:cx, t:Math.round(H*.45), w:cw, h:50, fill:'#F1F5F9', rx:10 }), TX(`Logo ${i+1}`, { l:cx, t:Math.round(H*.45)+15, w:cw, fs:sc(11,W), fill:'#94A3B8', ta:'center', ff:'JetBrains Mono' })]
      }).flat(),
    ])
  },

  // ══ MINIMAL ════════════════════════════════════════════════════════════

  { id: 'minimal-dark', label: 'Dark Minimal', cat: 'Minimal', preview: '#09090B',
    build: (W, H) => pg('#09090B', [
      LN(Math.round(W*.07), Math.round(H*.44), Math.round(W*.93), Math.round(H*.44), 'rgba(255,255,255,.06)'),
      TX('Minimal.', { l:Math.round(W*.07), t:Math.round(H*.2), w:W-80, fs:sc(80,W), fw:'800', fill:'#FFFFFF' }),
      TX('Sometimes restraint is everything.', { l:Math.round(W*.07), t:Math.round(H*.2)+sc(80,W)+18, w:Math.round(W*.6), fs:sc(18,W), fill:'rgba(255,255,255,.28)' }),
    ])
  },
  { id: 'minimal-light', label: 'Light Minimal', cat: 'Minimal', preview: '#FAFAF8',
    build: (W, H) => pg('#FAFAF8', [
      TX('Elegant\n& Simple', { l:Math.round(W*.08), t:Math.round(H*.3), w:Math.round(W*.84), fs:sc(62,W), fw:'300', fill:'#0F172A', ff:'Cormorant Garamond', ta:'center', lh:.97 }),
      LN(Math.round(W*.5)-24, Math.round(H*.67), Math.round(W*.5)+24, Math.round(H*.67), '#CBD5E1', 2),
      TX('Restraint is a design decision.', { l:Math.round(W*.16), t:Math.round(H*.67)+14, w:Math.round(W*.68), fs:sc(13,W), fill:'#94A3B8', ta:'center', lh:1.7 }),
    ])
  },
  { id: 'minimal-type-only', label: 'Type Only', cat: 'Minimal', preview: '#FFFFFF',
    build: (W, H) => pg('#FFFFFF', [
      TX('Words\nhave\npower.', { l:Math.round(W*.06), t:Math.round(H*.06), w:Math.round(W*.88), fs:sc(76,W), fw:'900', fill:'#0F172A', lh:.9, ff:'Inter' }),
      TX('— Your Company', { l:Math.round(W*.07), t:Math.round(H*.82), w:Math.round(W*.4), fs:sc(14,W), fill:'#94A3B8', fw:'500' }),
    ])
  },
  { id: 'minimal-line', label: 'Single Line', cat: 'Minimal', preview: '#F8F8F8',
    build: (W, H) => pg('#F8F8F8', [
      LN(0, Math.round(H*.5), W, Math.round(H*.5), '#0F172A', 1),
      TX('One line of text.', { l:Math.round(W*.06), t:Math.round(H*.5)-sc(24,W)-10, w:Math.round(W*.88), fs:sc(24,W), fw:'400', fill:'#0F172A', ff:'Cormorant Garamond' }),
    ])
  },
  { id: 'minimal-centered-circle', label: 'Circle Focus', cat: 'Minimal', preview: '#FAFAFA',
    build: (W, H) => pg('#FAFAFA', [
      CL({ l:Math.round(W*.5)-Math.round(H*.28), t:Math.round(H*.5)-Math.round(H*.28), r:Math.round(H*.28), fill:'#EEF2FF' }),
      TX('Focus.', { l:Math.round(W*.06), t:Math.round(H*.42), w:W*.88, fs:sc(58,W), fw:'800', fill:'#0F172A', ta:'center' }),
    ])
  },

  // ══ COMPARISON ════════════════════════════════════════════════════════

  { id: 'compare-two', label: '2-Way Compare', cat: 'Compare', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Comparing Options', { l:50, t:36, w:W-100, fs:sc(24,W), fw:'800', fill:'#0F172A', ta:'center' }),
      BX({ l:Math.round(W*.05), t:Math.round(H*.24), w:Math.round(W*.42), h:Math.round(H*.62), fill:'#FEF2F2', rx:16 }),
      BX({ l:Math.round(W*.53), t:Math.round(H*.24), w:Math.round(W*.42), h:Math.round(H*.62), fill:'#F0FDF4', rx:16 }),
      TX('Option A', { l:Math.round(W*.07), t:Math.round(H*.28), w:Math.round(W*.38), fs:sc(18,W), fw:'800', fill:'#991B1B', ta:'center' }),
      TX('Option B', { l:Math.round(W*.55), t:Math.round(H*.28), w:Math.round(W*.38), fs:sc(18,W), fw:'800', fill:'#166534', ta:'center' }),
    ])
  },
  { id: 'compare-vs', label: 'Us vs Them', cat: 'Compare', preview: '#0F172A',
    build: (W, H) => pg('#0F172A', [
      TX('US', { l:Math.round(W*.07), t:Math.round(H*.2), w:Math.round(W*.4), fs:sc(64,W), fw:'900', fill:'#16A34A', ff:'JetBrains Mono' }),
      TX('THEM', { l:Math.round(W*.53), t:Math.round(H*.2), w:Math.round(W*.4), fs:sc(64,W), fw:'900', fill:'rgba(255,255,255,.25)', ff:'JetBrains Mono' }),
      LN(Math.round(W*.5), Math.round(H*.15), Math.round(W*.5), Math.round(H*.85), 'rgba(255,255,255,.12)', 1),
      TX('vs', { l:Math.round(W*.5)-24, t:Math.round(H*.38), w:48, fs:sc(14,W), fw:'600', fill:'rgba(255,255,255,.35)', ta:'center' }),
      ...['AI-native', 'Real-time', 'No per-seat pricing', 'Setup in 5 min', 'SOC 2 certified'].map((feat, i) => {
        const y = Math.round(H*.42)+i*Math.round(H*.1)
        return [TX(`✓  ${feat}`, { l:Math.round(W*.08), t:y, w:Math.round(W*.38), fs:sc(12,W), fill:'rgba(255,255,255,.8)', fw:'500' }), TX(`✗`, { l:Math.round(W*.56), t:y, w:Math.round(W*.38), fs:sc(12,W), fill:'rgba(255,255,255,.2)', fw:'500' })]
      }).flat(),
    ])
  },

  // ══ CLOSING ════════════════════════════════════════════════════════════

  { id: 'closing-cta', label: 'Call to Action', cat: 'Closing', preview: '#5B50E8',
    build: (W, H) => pg('#5B50E8', [
      BX({ l:0, t:0, w:W, h:H, fill:'#5B50E8' }),
      TX('Ready to get\nstarted?', { l:Math.round(W*.08), t:Math.round(H*.2), w:Math.round(W*.84), fs:sc(56,W), fw:'900', fill:'#FFFFFF', ta:'center', lh:.95 }),
      TX('Join thousands of teams already using Folio.', { l:Math.round(W*.12), t:Math.round(H*.2)+sc(56,W)*2+20, w:Math.round(W*.76), fs:sc(15,W), fill:'rgba(255,255,255,.65)', ta:'center', lh:1.6 }),
      BX({ l:Math.round(W*.5)-100, t:Math.round(H*.7), w:200, h:48, fill:'#FFFFFF', rx:24 }),
      TX('Get Started Free', { l:Math.round(W*.5)-100, t:Math.round(H*.7)+14, w:200, fs:sc(13,W), fw:'700', fill:'#5B50E8', ta:'center' }),
    ])
  },
  { id: 'closing-thankyou', label: 'Thank You', cat: 'Closing', preview: '#FFFFFF',
    build: (W, H) => pg('#FFFFFF', [
      BX({ l:0, t:H-5, w:W, h:5, fill:'#5B50E8' }),
      TX('Thank\nYou.', { l:Math.round(W*.08), t:Math.round(H*.22), w:Math.round(W*.84), fs:sc(80,W), fw:'900', fill:'#0F172A', ta:'center', ff:'Inter', lh:.92 }),
      LN(Math.round(W*.5)-40, Math.round(H*.72), Math.round(W*.5)+40, Math.round(H*.72), '#5B50E8', 3),
      TX('hello@yourcompany.com · yourwebsite.com', { l:Math.round(W*.1), t:Math.round(H*.74), w:Math.round(W*.8), fs:sc(14,W), fill:'#64748B', ta:'center' }),
    ])
  },
  { id: 'closing-nextSteps', label: 'Next Steps', cat: 'Closing', preview: '#F8FAFC',
    build: (W, H) => pg('#F8FAFC', [
      BX({ l:0, t:0, w:W, h:5, fill:'#0F172A' }),
      TX('Next Steps', { l:50, t:36, w:W-100, fs:sc(28,W), fw:'800', fill:'#0F172A', ta:'center' }),
      ...[['📞', 'Schedule a Call', 'Book a 30-min demo with our team', '#5B50E8', '#EEF2FF'], ['📝', 'Sign the Agreement', 'Review and countersign the proposal', '#16A34A', '#F0FDF4'], ['🚀', 'Kick-Off', 'We start within 48 hours of signing', '#D97706', '#FFFBEB']].map(([icon, title, body, col, bg], i) => {
        const y = Math.round(H*.3)+i*Math.round(H*.2)
        return [BX({ l:Math.round(W*.08), t:y, w:Math.round(W*.84), h:Math.round(H*.17), fill:bg, rx:14 }), TX(icon as string, { l:Math.round(W*.11), t:y+Math.round(H*.05), w:40, fs:24, lh:1 }), TX(`${i+1}. ${title}`, { l:Math.round(W*.2), t:y+Math.round(H*.04), w:Math.round(W*.6), fs:sc(15,W), fw:'700', fill:'#0F172A' }), TX(body as string, { l:Math.round(W*.2), t:y+Math.round(H*.04)+sc(15,W)+6, w:Math.round(W*.62), fs:sc(13,W), fill:'#475569', lh:1.5 })]
      }).flat(),
    ])
  },
  { id: 'closing-contact', label: 'Contact Info', cat: 'Closing', preview: '#0F172A',
    build: (W, H) => pg('#0F172A', [
      BX({ l:0, t:0, w:W, h:H, fill:'#0F172A' }),
      TX('Let\'s talk.', { l:Math.round(W*.08), t:Math.round(H*.18), w:Math.round(W*.84), fs:sc(56,W), fw:'900', fill:'#FFFFFF', ta:'center', lh:.95 }),
      ...[['📧', 'hello@company.com'], ['🌐', 'www.company.com'], ['📱', '+1 (555) 000-0000'], ['📍', 'San Francisco, CA']].map(([icon, value], i) => {
        const perRow = 2; const cw = Math.round((W-180)/perRow); const cx = 70+(i%perRow)*(cw+40); const cy = Math.round(H*.56)+Math.floor(i/perRow)*Math.round(H*.2)
        return [TX(`${icon}  ${value}`, { l:cx, t:cy, w:cw, fs:sc(14,W), fill:'rgba(255,255,255,.55)', ta:'center', lh:1.6 })]
      }).flat(),
    ])
  },
]

export const LAYOUT_CATS = ['All', ...Array.from(new Set(LAYOUTS.map(l => l.cat)))]
