'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ─── 100 Built-in Images (picsum.photos, no API key needed) ──────────────────
const BUILTIN_IMAGES = {
  business: [
    { id: 'b1', url: 'https://picsum.photos/seed/office1/800/600', label: 'Office' },
    { id: 'b2', url: 'https://picsum.photos/seed/meeting/800/600', label: 'Meeting' },
    { id: 'b3', url: 'https://picsum.photos/seed/desk2/800/600', label: 'Desk' },
    { id: 'b4', url: 'https://picsum.photos/seed/laptop3/800/600', label: 'Laptop' },
    { id: 'b5', url: 'https://picsum.photos/seed/work4/800/600', label: 'Work' },
    { id: 'b6', url: 'https://picsum.photos/seed/team5/800/600', label: 'Team' },
    { id: 'b7', url: 'https://picsum.photos/seed/chart6/800/600', label: 'Data' },
    { id: 'b8', url: 'https://picsum.photos/seed/coffee7/800/600', label: 'Coffee' },
    { id: 'b9', url: 'https://picsum.photos/seed/city8/800/600', label: 'City' },
    { id: 'b10', url: 'https://picsum.photos/seed/skyline9/800/600', label: 'Skyline' },
    { id: 'b11', url: 'https://picsum.photos/seed/boardroom/800/600', label: 'Board Room' },
    { id: 'b12', url: 'https://picsum.photos/seed/startup10/800/600', label: 'Startup' },
    { id: 'b13', url: 'https://picsum.photos/seed/finance/800/600', label: 'Finance' },
    { id: 'b14', url: 'https://picsum.photos/seed/strategy/800/600', label: 'Strategy' },
    { id: 'b15', url: 'https://picsum.photos/seed/growth/800/600', label: 'Growth' },
  ],
  nature: [
    { id: 'n1', url: 'https://picsum.photos/seed/forest1/800/600', label: 'Forest' },
    { id: 'n2', url: 'https://picsum.photos/seed/ocean2/800/600', label: 'Ocean' },
    { id: 'n3', url: 'https://picsum.photos/seed/mountain3/800/600', label: 'Mountains' },
    { id: 'n4', url: 'https://picsum.photos/seed/sunrise4/800/600', label: 'Sunrise' },
    { id: 'n5', url: 'https://picsum.photos/seed/flowers5/800/600', label: 'Flowers' },
    { id: 'n6', url: 'https://picsum.photos/seed/river6/800/600', label: 'River' },
    { id: 'n7', url: 'https://picsum.photos/seed/desert7/800/600', label: 'Desert' },
    { id: 'n8', url: 'https://picsum.photos/seed/snow8/800/600', label: 'Snow' },
    { id: 'n9', url: 'https://picsum.photos/seed/lake9/800/600', label: 'Lake' },
    { id: 'n10', url: 'https://picsum.photos/seed/valley10/800/600', label: 'Valley' },
    { id: 'n11', url: 'https://picsum.photos/seed/cloudy11/800/600', label: 'Clouds' },
    { id: 'n12', url: 'https://picsum.photos/seed/beach12/800/600', label: 'Beach' },
    { id: 'n13', url: 'https://picsum.photos/seed/jungle13/800/600', label: 'Jungle' },
    { id: 'n14', url: 'https://picsum.photos/seed/meadow14/800/600', label: 'Meadow' },
    { id: 'n15', url: 'https://picsum.photos/seed/waterfall/800/600', label: 'Waterfall' },
  ],
  technology: [
    { id: 't1', url: 'https://picsum.photos/seed/code1/800/600', label: 'Code' },
    { id: 't2', url: 'https://picsum.photos/seed/server2/800/600', label: 'Server' },
    { id: 't3', url: 'https://picsum.photos/seed/circuit3/800/600', label: 'Circuit' },
    { id: 't4', url: 'https://picsum.photos/seed/robot4/800/600', label: 'Robot' },
    { id: 't5', url: 'https://picsum.photos/seed/phone5/800/600', label: 'Phone' },
    { id: 't6', url: 'https://picsum.photos/seed/data6/800/600', label: 'Data' },
    { id: 't7', url: 'https://picsum.photos/seed/ai7/800/600', label: 'AI' },
    { id: 't8', url: 'https://picsum.photos/seed/network8/800/600', label: 'Network' },
    { id: 't9', url: 'https://picsum.photos/seed/digital9/800/600', label: 'Digital' },
    { id: 't10', url: 'https://picsum.photos/seed/screen10/800/600', label: 'Screen' },
    { id: 't11', url: 'https://picsum.photos/seed/cloud11/800/600', label: 'Cloud' },
    { id: 't12', url: 'https://picsum.photos/seed/security12/800/600', label: 'Security' },
    { id: 't13', url: 'https://picsum.photos/seed/chip13/800/600', label: 'Chip' },
    { id: 't14', url: 'https://picsum.photos/seed/vr14/800/600', label: 'VR' },
    { id: 't15', url: 'https://picsum.photos/seed/drone15/800/600', label: 'Drone' },
  ],
  abstract: [
    { id: 'a1', url: 'https://picsum.photos/seed/abstract1/800/600', label: 'Waves' },
    { id: 'a2', url: 'https://picsum.photos/seed/gradient2/800/600', label: 'Gradient' },
    { id: 'a3', url: 'https://picsum.photos/seed/texture3/800/600', label: 'Texture' },
    { id: 'a4', url: 'https://picsum.photos/seed/pattern4/800/600', label: 'Pattern' },
    { id: 'a5', url: 'https://picsum.photos/seed/blur5/800/600', label: 'Light' },
    { id: 'a6', url: 'https://picsum.photos/seed/smoke6/800/600', label: 'Smoke' },
    { id: 'a7', url: 'https://picsum.photos/seed/neon7/800/600', label: 'Neon' },
    { id: 'a8', url: 'https://picsum.photos/seed/marble8/800/600', label: 'Marble' },
    { id: 'a9', url: 'https://picsum.photos/seed/bokeh9/800/600', label: 'Bokeh' },
    { id: 'a10', url: 'https://picsum.photos/seed/geometry10/800/600', label: 'Geometry' },
    { id: 'a11', url: 'https://picsum.photos/seed/swirl11/800/600', label: 'Swirl' },
    { id: 'a12', url: 'https://picsum.photos/seed/dark12/800/600', label: 'Dark' },
    { id: 'a13', url: 'https://picsum.photos/seed/vivid13/800/600', label: 'Vivid' },
    { id: 'a14', url: 'https://picsum.photos/seed/minimal14/800/600', label: 'Minimal' },
    { id: 'a15', url: 'https://picsum.photos/seed/fire15/800/600', label: 'Fire' },
  ],
  people: [
    { id: 'p1', url: 'https://picsum.photos/seed/portrait1/800/600', label: 'Portrait' },
    { id: 'p2', url: 'https://picsum.photos/seed/crowd2/800/600', label: 'Crowd' },
    { id: 'p3', url: 'https://picsum.photos/seed/speaker3/800/600', label: 'Speaker' },
    { id: 'p4', url: 'https://picsum.photos/seed/collab4/800/600', label: 'Collab' },
    { id: 'p5', url: 'https://picsum.photos/seed/hands5/800/600', label: 'Hands' },
    { id: 'p6', url: 'https://picsum.photos/seed/community6/800/600', label: 'Community' },
    { id: 'p7', url: 'https://picsum.photos/seed/leader7/800/600', label: 'Leader' },
    { id: 'p8', url: 'https://picsum.photos/seed/student8/800/600', label: 'Student' },
    { id: 'p9', url: 'https://picsum.photos/seed/creative9/800/600', label: 'Creative' },
    { id: 'p10', url: 'https://picsum.photos/seed/athlete10/800/600', label: 'Athlete' },
  ],
  architecture: [
    { id: 'arch1', url: 'https://picsum.photos/seed/building1/800/600', label: 'Building' },
    { id: 'arch2', url: 'https://picsum.photos/seed/bridge2/800/600', label: 'Bridge' },
    { id: 'arch3', url: 'https://picsum.photos/seed/interior3/800/600', label: 'Interior' },
    { id: 'arch4', url: 'https://picsum.photos/seed/modern4/800/600', label: 'Modern' },
    { id: 'arch5', url: 'https://picsum.photos/seed/street5/800/600', label: 'Street' },
    { id: 'arch6', url: 'https://picsum.photos/seed/stairs6/800/600', label: 'Stairs' },
    { id: 'arch7', url: 'https://picsum.photos/seed/facade7/800/600', label: 'Facade' },
    { id: 'arch8', url: 'https://picsum.photos/seed/glass8/800/600', label: 'Glass' },
    { id: 'arch9', url: 'https://picsum.photos/seed/tower9/800/600', label: 'Tower' },
    { id: 'arch10', url: 'https://picsum.photos/seed/urban10/800/600', label: 'Urban' },
  ],
}

// ─── Layout Definitions (what Fabric objects to add) ─────────────────────────
const LAYOUT_DEFINITIONS = [
  {
    id: 'blank',
    name: 'Blank',
    icon: '□',
    preview: { bg: '#ffffff', elements: [] },
    description: 'Empty slide',
    build: (W: number, H: number) => [],
  },
  {
    id: 'title',
    name: 'Title Slide',
    icon: 'T',
    preview: { bg: '#1a1a2e', text: true },
    description: 'Centered title + subtitle',
    build: (W: number, H: number) => [
      {
        type: 'textbox', text: 'Click to add title',
        left: W * 0.1, top: H * 0.3, width: W * 0.8,
        fontSize: 48, fontWeight: 'bold', fill: '#1a1a2e',
        textAlign: 'center', fontFamily: 'Georgia'
      },
      {
        type: 'textbox', text: 'Click to add subtitle',
        left: W * 0.15, top: H * 0.55, width: W * 0.7,
        fontSize: 22, fill: '#555555',
        textAlign: 'center', fontFamily: 'Arial'
      },
      {
        type: 'line', x1: W * 0.35, y1: H * 0.52, x2: W * 0.65, y2: H * 0.52,
        stroke: '#3b82f6', strokeWidth: 3
      }
    ],
  },
  {
    id: 'title-content',
    name: 'Title + Content',
    icon: '≡',
    preview: { bg: '#f8fafc', hasTitle: true, hasBody: true },
    description: 'Title bar with content area',
    build: (W: number, H: number) => [
      {
        type: 'rect',
        left: 0, top: 0, width: W, height: H * 0.18,
        fill: '#1e3a5f', rx: 0, ry: 0
      },
      {
        type: 'textbox', text: 'Slide Title',
        left: W * 0.05, top: H * 0.04, width: W * 0.9,
        fontSize: 32, fontWeight: 'bold', fill: '#ffffff',
        fontFamily: 'Arial'
      },
      {
        type: 'textbox', text: '• Key point one\n• Key point two\n• Key point three',
        left: W * 0.05, top: H * 0.24, width: W * 0.9,
        fontSize: 20, fill: '#333333', lineHeight: 1.6,
        fontFamily: 'Arial'
      },
    ],
  },
  {
    id: 'two-column',
    name: 'Two Column',
    icon: '⬛⬛',
    preview: { bg: '#ffffff', cols: 2 },
    description: 'Side-by-side content',
    build: (W: number, H: number) => [
      {
        type: 'textbox', text: 'Slide Title',
        left: W * 0.05, top: H * 0.04, width: W * 0.9,
        fontSize: 30, fontWeight: 'bold', fill: '#1e293b',
        fontFamily: 'Arial'
      },
      {
        type: 'rect', left: W * 0.04, top: H * 0.2,
        width: W * 0.43, height: H * 0.7, fill: '#f1f5f9', rx: 8, ry: 8
      },
      {
        type: 'textbox', text: 'Left Column\n\nAdd your content here',
        left: W * 0.07, top: H * 0.26, width: W * 0.37,
        fontSize: 18, fill: '#334155', lineHeight: 1.5, fontFamily: 'Arial'
      },
      {
        type: 'rect', left: W * 0.53, top: H * 0.2,
        width: W * 0.43, height: H * 0.7, fill: '#f1f5f9', rx: 8, ry: 8
      },
      {
        type: 'textbox', text: 'Right Column\n\nAdd your content here',
        left: W * 0.56, top: H * 0.26, width: W * 0.37,
        fontSize: 18, fill: '#334155', lineHeight: 1.5, fontFamily: 'Arial'
      },
    ],
  },
  {
    id: 'image-right',
    name: 'Image Right',
    icon: '▤',
    preview: { bg: '#ffffff', imgRight: true },
    description: 'Text left, image right',
    build: (W: number, H: number) => [
      {
        type: 'textbox', text: 'Section Title',
        left: W * 0.04, top: H * 0.08, width: W * 0.45,
        fontSize: 32, fontWeight: 'bold', fill: '#0f172a', fontFamily: 'Georgia'
      },
      {
        type: 'textbox', text: 'Add your supporting content here. This layout works well for image-driven narratives.',
        left: W * 0.04, top: H * 0.28, width: W * 0.44,
        fontSize: 17, fill: '#475569', lineHeight: 1.6, fontFamily: 'Arial'
      },
      {
        type: 'rect', left: W * 0.52, top: H * 0.05,
        width: W * 0.44, height: H * 0.9, fill: '#e2e8f0', rx: 12, ry: 12
      },
      {
        type: 'textbox', text: '[ Image ]',
        left: W * 0.52, top: H * 0.44, width: W * 0.44,
        fontSize: 20, fill: '#94a3b8', textAlign: 'center', fontFamily: 'Arial'
      },
    ],
  },
  {
    id: 'image-left',
    name: 'Image Left',
    icon: '▧',
    preview: { bg: '#ffffff', imgLeft: true },
    description: 'Image left, text right',
    build: (W: number, H: number) => [
      {
        type: 'rect', left: W * 0.04, top: H * 0.05,
        width: W * 0.44, height: H * 0.9, fill: '#e2e8f0', rx: 12, ry: 12
      },
      {
        type: 'textbox', text: '[ Image ]',
        left: W * 0.04, top: H * 0.44, width: W * 0.44,
        fontSize: 20, fill: '#94a3b8', textAlign: 'center', fontFamily: 'Arial'
      },
      {
        type: 'textbox', text: 'Section Title',
        left: W * 0.52, top: H * 0.08, width: W * 0.45,
        fontSize: 32, fontWeight: 'bold', fill: '#0f172a', fontFamily: 'Georgia'
      },
      {
        type: 'textbox', text: 'Add your supporting content here.',
        left: W * 0.52, top: H * 0.28, width: W * 0.44,
        fontSize: 17, fill: '#475569', lineHeight: 1.6, fontFamily: 'Arial'
      },
    ],
  },
  {
    id: 'three-column',
    name: 'Three Column',
    icon: '⬛⬛⬛',
    preview: { bg: '#ffffff', cols: 3 },
    description: 'Three equal columns',
    build: (W: number, H: number) => {
      const colW = W * 0.28
      const gap = W * 0.03
      const startX = W * 0.04
      return [
        {
          type: 'textbox', text: 'Three Column Layout',
          left: W * 0.05, top: H * 0.03, width: W * 0.9,
          fontSize: 28, fontWeight: 'bold', fill: '#1e293b',
          textAlign: 'center', fontFamily: 'Arial'
        },
        ...[0, 1, 2].flatMap((i) => [
          {
            type: 'rect',
            left: startX + i * (colW + gap), top: H * 0.18,
            width: colW, height: H * 0.72, fill: '#f8fafc', rx: 8, ry: 8
          },
          {
            type: 'rect',
            left: startX + i * (colW + gap), top: H * 0.18,
            width: colW, height: H * 0.12, fill: ['#3b82f6', '#10b981', '#f59e0b'][i], rx: 8, ry: 0
          },
          {
            type: 'textbox', text: ['Column 1', 'Column 2', 'Column 3'][i],
            left: startX + i * (colW + gap) + W * 0.01, top: H * 0.2,
            width: colW - W * 0.02,
            fontSize: 16, fontWeight: 'bold', fill: '#ffffff',
            textAlign: 'center', fontFamily: 'Arial'
          },
          {
            type: 'textbox', text: 'Add content here',
            left: startX + i * (colW + gap) + W * 0.01, top: H * 0.34,
            width: colW - W * 0.02,
            fontSize: 15, fill: '#64748b', lineHeight: 1.5,
            textAlign: 'center', fontFamily: 'Arial'
          },
        ])
      ]
    }
  },
  {
    id: 'big-quote',
    name: 'Big Quote',
    icon: '❝',
    preview: { bg: '#0f172a', quote: true },
    description: 'Full-width quote slide',
    build: (W: number, H: number) => [
      {
        type: 'rect', left: 0, top: 0, width: W, height: H, fill: '#0f172a'
      },
      {
        type: 'textbox', text: '"',
        left: W * 0.05, top: H * 0.05, width: W * 0.15,
        fontSize: 120, fill: '#3b82f6', fontFamily: 'Georgia', opacity: 0.4
      },
      {
        type: 'textbox', text: 'Your powerful quote goes here. Make it count.',
        left: W * 0.1, top: H * 0.2, width: W * 0.8,
        fontSize: 36, fill: '#f1f5f9', textAlign: 'center',
        lineHeight: 1.5, fontFamily: 'Georgia', fontStyle: 'italic'
      },
      {
        type: 'line',
        x1: W * 0.4, y1: H * 0.68, x2: W * 0.6, y2: H * 0.68,
        stroke: '#3b82f6', strokeWidth: 2
      },
      {
        type: 'textbox', text: '— Author Name',
        left: W * 0.1, top: H * 0.72, width: W * 0.8,
        fontSize: 18, fill: '#94a3b8', textAlign: 'center', fontFamily: 'Arial'
      },
    ],
  },
  {
    id: 'stats',
    name: 'Stats / Numbers',
    icon: '#',
    preview: { bg: '#ffffff', stats: true },
    description: 'Key metrics layout',
    build: (W: number, H: number) => {
      const stats = [
        { num: '98%', label: 'Satisfaction' },
        { num: '2.4M', label: 'Users' },
        { num: '150+', label: 'Countries' },
        { num: '$12B', label: 'Revenue' },
      ]
      return [
        {
          type: 'textbox', text: 'Key Metrics',
          left: W * 0.05, top: H * 0.04, width: W * 0.9,
          fontSize: 28, fontWeight: 'bold', fill: '#0f172a',
          textAlign: 'center', fontFamily: 'Arial'
        },
        ...stats.flatMap((s, i) => {
          const x = W * 0.04 + i * (W * 0.24)
          return [
            {
              type: 'rect', left: x, top: H * 0.2,
              width: W * 0.22, height: H * 0.55, fill: '#f8fafc', rx: 12, ry: 12
            },
            {
              type: 'textbox', text: s.num,
              left: x, top: H * 0.29, width: W * 0.22,
              fontSize: 42, fontWeight: 'bold', fill: '#3b82f6',
              textAlign: 'center', fontFamily: 'Georgia'
            },
            {
              type: 'textbox', text: s.label,
              left: x, top: H * 0.58, width: W * 0.22,
              fontSize: 16, fill: '#64748b',
              textAlign: 'center', fontFamily: 'Arial'
            },
          ]
        })
      ]
    }
  },
  {
    id: 'section-header',
    name: 'Section Header',
    icon: '═',
    preview: { bg: '#3b82f6', header: true },
    description: 'Bold section divider',
    build: (W: number, H: number) => [
      {
        type: 'rect', left: 0, top: 0, width: W, height: H, fill: '#1d4ed8'
      },
      {
        type: 'rect', left: W * 0.1, top: H * 0.42, width: W * 0.04, height: H * 0.16,
        fill: '#93c5fd'
      },
      {
        type: 'textbox', text: 'Section 01',
        left: W * 0.16, top: H * 0.4, width: W * 0.8,
        fontSize: 56, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Georgia'
      },
      {
        type: 'textbox', text: 'Section subtitle or description',
        left: W * 0.16, top: H * 0.63, width: W * 0.6,
        fontSize: 20, fill: '#bfdbfe', fontFamily: 'Arial'
      },
    ],
  },
  {
    id: 'agenda',
    name: 'Agenda',
    icon: '☰',
    preview: { bg: '#ffffff', list: true },
    description: 'Numbered agenda list',
    build: (W: number, H: number) => [
      {
        type: 'rect', left: 0, top: 0, width: W * 0.35, height: H,
        fill: '#0f172a'
      },
      {
        type: 'textbox', text: 'AGENDA',
        left: W * 0.03, top: H * 0.1, width: W * 0.28,
        fontSize: 28, fontWeight: 'bold', fill: '#ffffff',
        fontFamily: 'Arial', letterSpacing: 4
      },
      {
        type: 'textbox', text: 'Today\'s\nTopics',
        left: W * 0.03, top: H * 0.25, width: W * 0.28,
        fontSize: 40, fontWeight: 'bold', fill: '#93c5fd',
        fontFamily: 'Georgia', lineHeight: 1.2
      },
      ...[1, 2, 3, 4].flatMap((n, i) => [
        {
          type: 'rect', left: W * 0.4, top: H * (0.12 + i * 0.2),
          width: W * 0.05, height: W * 0.05, fill: '#3b82f6', rx: 4, ry: 4
        },
        {
          type: 'textbox', text: `0${n}`,
          left: W * 0.4, top: H * (0.115 + i * 0.2), width: W * 0.05,
          fontSize: 16, fontWeight: 'bold', fill: '#ffffff',
          textAlign: 'center', fontFamily: 'Arial'
        },
        {
          type: 'textbox', text: `Agenda Item ${n}`,
          left: W * 0.47, top: H * (0.115 + i * 0.2), width: W * 0.48,
          fontSize: 20, fill: '#1e293b', fontFamily: 'Arial'
        },
      ])
    ],
  },
  {
    id: 'full-image',
    name: 'Full Image',
    icon: '⬜',
    preview: { bg: '#e2e8f0', fullImg: true },
    description: 'Full-bleed with caption',
    build: (W: number, H: number) => [
      {
        type: 'rect', left: 0, top: 0, width: W, height: H, fill: '#e2e8f0'
      },
      {
        type: 'textbox', text: '[ Drop or click to add full-bleed image ]',
        left: W * 0.15, top: H * 0.43, width: W * 0.7,
        fontSize: 20, fill: '#94a3b8', textAlign: 'center', fontFamily: 'Arial'
      },
      {
        type: 'rect', left: 0, top: H * 0.78, width: W, height: H * 0.22,
        fill: 'rgba(0,0,0,0.6)'
      },
      {
        type: 'textbox', text: 'Image caption or slide title',
        left: W * 0.05, top: H * 0.82, width: W * 0.7,
        fontSize: 24, fontWeight: 'bold', fill: '#ffffff', fontFamily: 'Georgia'
      },
    ],
  },
]

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DocumentEditorPage({ params }: { params: { id: string } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [activePanel, setActivePanel] = useState<string>('layouts')
  const [activeTool, setActiveTool] = useState<string>('select')
  const [zoom, setZoom] = useState(75)
  const [pages, setPages] = useState([{ id: 1, json: null as any }])
  const [currentPage, setCurrentPage] = useState(0)
  const [docTitle, setDocTitle] = useState('Untitled Document')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(true)
  const [selectedObj, setSelectedObj] = useState<any>(null)
  const [imgCategory, setImgCategory] = useState<keyof typeof BUILTIN_IMAGES>('business')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showTableModal, setShowTableModal] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [fontFamily, setFontFamily] = useState('Arial')
  const [fontSize, setFontSize] = useState(20)
  const [fontBold, setFontBold] = useState(false)
  const [fontItalic, setFontItalic] = useState(false)
  const [textColor, setTextColor] = useState('#000000')
  const [fillColor, setFillColor] = useState('#3b82f6')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const CANVAS_W = 1280
  const CANVAS_H = 720

  // ── Load Fabric ────────────────────────────────────────────────────────────
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js'
    script.onload = () => initCanvas()
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  const initCanvas = useCallback(() => {
    if (!canvasRef.current || !(window as any).fabric) return
    const fabric = (window as any).fabric

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_W,
      height: CANVAS_H,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    })

    fabricRef.current = canvas

    // Keyboard shortcuts
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { undoAction(); e.preventDefault() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { redoAction(); e.preventDefault() }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = canvas.getActiveObject()
        if (active && !active.isEditing) { canvas.remove(active); canvas.discardActiveObject(); canvas.renderAll(); pushHistory() }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const obj = canvas.getActiveObject()
        if (obj) obj.clone((cloned: any) => { (canvas as any)._clipboard = cloned })
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        const clip = (canvas as any)._clipboard
        if (clip) clip.clone((cloned: any) => {
          cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 })
          canvas.add(cloned); canvas.setActiveObject(cloned); canvas.renderAll(); pushHistory()
        })
      }
    }
    window.addEventListener('keydown', onKey)

    // Selection events
    canvas.on('selection:created', (e: any) => { setSelectedObj(e.selected?.[0] || null) })
    canvas.on('selection:updated', (e: any) => { setSelectedObj(e.selected?.[0] || null) })
    canvas.on('selection:cleared', () => setSelectedObj(null))
    canvas.on('object:modified', () => { setSaved(false); pushHistory() })

    // Double-click to edit text
    canvas.on('mouse:dblclick', (opt: any) => {
      const target = opt.target
      if (target && (target.type === 'textbox' || target.type === 'i-text')) {
        canvas.setActiveObject(target)
        target.enterEditing()
        canvas.renderAll()
      }
    })

    loadPage(0)
    pushHistory()
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const getCanvas = () => fabricRef.current
  const getFabric = () => (window as any).fabric

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    const c = getCanvas()
    if (!c) return
    const json = c.toJSON(['id', 'name'])
    setHistory(prev => {
      const newH = prev.slice(0, historyIndex + 1)
      newH.push(json)
      setHistoryIndex(newH.length - 1)
      return newH
    })
  }, [historyIndex])

  const undoAction = useCallback(() => {
    if (historyIndex <= 0) return
    const c = getCanvas()
    const newIdx = historyIndex - 1
    c?.loadFromJSON(history[newIdx], () => { c.renderAll(); setHistoryIndex(newIdx) })
  }, [history, historyIndex])

  const redoAction = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const c = getCanvas()
    const newIdx = historyIndex + 1
    c?.loadFromJSON(history[newIdx], () => { c.renderAll(); setHistoryIndex(newIdx) })
  }, [history, historyIndex])

  // ── Page Management ────────────────────────────────────────────────────────
  const loadPage = (idx: number) => {
    const c = getCanvas()
    if (!c) return
    if (pages[idx]?.json) {
      c.loadFromJSON(pages[idx].json, () => { c.renderAll() })
    } else {
      c.clear()
      c.backgroundColor = '#ffffff'
      c.renderAll()
    }
    setCurrentPage(idx)
  }

  const savePage = (idx: number) => {
    const c = getCanvas()
    if (!c) return
    const json = c.toJSON(['id', 'name'])
    setPages(prev => prev.map((p, i) => i === idx ? { ...p, json } : p))
  }

  const addPage = () => {
    savePage(currentPage)
    const newPages = [...pages, { id: pages.length + 1, json: null }]
    setPages(newPages)
    const newIdx = newPages.length - 1
    setTimeout(() => loadPage(newIdx), 50)
  }

  const switchPage = (idx: number) => {
    savePage(currentPage)
    setTimeout(() => loadPage(idx), 50)
  }

  // ── Layout Injection ───────────────────────────────────────────────────────
  const applyLayout = useCallback((layout: typeof LAYOUT_DEFINITIONS[0]) => {
    const c = getCanvas()
    const fabric = getFabric()
    if (!c || !fabric) return

    c.clear()
    c.backgroundColor = bgColor
    c.renderAll()

    const objects = layout.build(CANVAS_W, CANVAS_H)
    objects.forEach((obj: any) => {
      let fabricObj: any

      if (obj.type === 'rect') {
        fabricObj = new fabric.Rect({
          left: obj.left, top: obj.top,
          width: obj.width, height: obj.height,
          fill: obj.fill, rx: obj.rx || 0, ry: obj.ry || 0,
          opacity: obj.opacity || 1,
          selectable: true,
        })
      } else if (obj.type === 'textbox') {
        fabricObj = new fabric.Textbox(obj.text, {
          left: obj.left, top: obj.top, width: obj.width,
          fontSize: obj.fontSize, fontWeight: obj.fontWeight || 'normal',
          fill: obj.fill, textAlign: obj.textAlign || 'left',
          fontFamily: obj.fontFamily || 'Arial',
          lineHeight: obj.lineHeight || 1.3,
          fontStyle: obj.fontStyle || 'normal',
          opacity: obj.opacity || 1,
          editable: true,
          selectable: true,
        })
      } else if (obj.type === 'line') {
        fabricObj = new fabric.Line([obj.x1, obj.y1, obj.x2, obj.y2], {
          stroke: obj.stroke, strokeWidth: obj.strokeWidth || 2,
          selectable: true,
        })
      }

      if (fabricObj) c.add(fabricObj)
    })

    c.renderAll()
    setSaved(false)
    pushHistory()
  }, [bgColor, pushHistory])

  // ── Add Text ───────────────────────────────────────────────────────────────
  const addText = () => {
    const c = getCanvas(); const fabric = getFabric()
    if (!c || !fabric) return
    const t = new fabric.Textbox('Double-click to edit text', {
      left: 100, top: 100, width: 400,
      fontSize, fontFamily, fill: textColor,
      fontWeight: fontBold ? 'bold' : 'normal',
      fontStyle: fontItalic ? 'italic' : 'normal',
      editable: true,
    })
    c.add(t); c.setActiveObject(t); c.renderAll(); setSaved(false); pushHistory()
  }

  // ── Add Shape ─────────────────────────────────────────────────────────────
  const addShape = (shape: string) => {
    const c = getCanvas(); const fabric = getFabric()
    if (!c || !fabric) return
    let obj: any
    const opts = { left: 200, top: 200, fill: fillColor, selectable: true }
    if (shape === 'rect') obj = new fabric.Rect({ ...opts, width: 200, height: 120, rx: 8, ry: 8 })
    if (shape === 'circle') obj = new fabric.Circle({ ...opts, radius: 80 })
    if (shape === 'triangle') obj = new fabric.Triangle({ ...opts, width: 160, height: 140 })
    if (shape === 'line') obj = new fabric.Line([0, 0, 300, 0], { left: 200, top: 300, stroke: fillColor, strokeWidth: 3 })
    if (obj) { c.add(obj); c.setActiveObject(obj); c.renderAll(); setSaved(false); pushHistory() }
  }

  // ── Add Image ──────────────────────────────────────────────────────────────
  const addBuiltinImage = (url: string) => {
    const c = getCanvas(); const fabric = getFabric()
    if (!c || !fabric) return
    fabric.Image.fromURL(url, (img: any) => {
      img.scaleToWidth(Math.min(400, CANVAS_W * 0.4))
      img.set({ left: 100, top: 100 })
      c.add(img); c.setActiveObject(img); c.renderAll(); setSaved(false); pushHistory()
    }, { crossOrigin: 'anonymous' })
  }

  const addImageFromFile = (file: File) => {
    const c = getCanvas(); const fabric = getFabric()
    if (!c || !fabric) return
    const reader = new FileReader()
    reader.onload = (e) => {
      fabric.Image.fromURL(e.target?.result as string, (img: any) => {
        img.scaleToWidth(Math.min(500, CANVAS_W * 0.5))
        img.set({ left: 80, top: 80 })
        c.add(img); c.setActiveObject(img); c.renderAll(); setSaved(false); pushHistory()
      })
    }
    reader.readAsDataURL(file)
  }

  // ── Add Table ──────────────────────────────────────────────────────────────
  const insertTable = useCallback((rows: number, cols: number) => {
    const c = getCanvas(); const fabric = getFabric()
    if (!c || !fabric) return

    const cellW = Math.min(160, (CANVAS_W * 0.8) / cols)
    const cellH = 50
    const startX = (CANVAS_W - cols * cellW) / 2
    const startY = 200
    const headerColor = '#1e3a5f'
    const borderColor = '#cbd5e1'
    const altColor = '#f8fafc'

    const objects: any[] = []

    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * cellW
        const y = startY + r * cellH
        const isHeader = r === 0

        // Cell background
        const cellRect = new fabric.Rect({
          left: x, top: y, width: cellW, height: cellH,
          fill: isHeader ? headerColor : (r % 2 === 0 ? '#ffffff' : altColor),
          stroke: borderColor, strokeWidth: 1,
          selectable: false, evented: false,
        })

        // Cell text - editable IText
        const cellText = new fabric.IText(
          isHeader ? `Header ${col + 1}` : `Cell ${r},${col + 1}`,
          {
            left: x + 8, top: y + 14,
            fontSize: isHeader ? 14 : 13,
            fontWeight: isHeader ? 'bold' : 'normal',
            fill: isHeader ? '#ffffff' : '#334155',
            fontFamily: 'Arial',
            editable: true,
            selectable: true,
            hasControls: true,
          }
        )

        objects.push(cellRect, cellText)
      }
    }

    // Group cells visually but keep texts independently selectable
    objects.forEach(obj => c.add(obj))
    c.renderAll()
    setSaved(false)
    setShowTableModal(false)
    pushHistory()
  }, [pushHistory])

  // ── Set Background ─────────────────────────────────────────────────────────
  const setBackground = (color: string) => {
    const c = getCanvas()
    if (!c) return
    c.backgroundColor = color
    c.renderAll()
    setBgColor(color)
    setSaved(false)
    pushHistory()
  }

  // ── Update Selected Object ─────────────────────────────────────────────────
  const updateSelected = (props: any) => {
    const c = getCanvas()
    const obj = c?.getActiveObject()
    if (!obj) return
    obj.set(props)
    c.renderAll()
    setSaved(false)
  }

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const applyZoom = (z: number) => {
    const c = getCanvas()
    if (!c) return
    const scale = z / 100
    c.setZoom(scale)
    c.setWidth(CANVAS_W * scale)
    c.setHeight(CANVAS_H * scale)
    setZoom(z)
  }

  // ── Save to Supabase ───────────────────────────────────────────────────────
  const saveDocument = async () => {
    savePage(currentPage)
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const canvasData = getCanvas()?.toJSON(['id', 'name'])
      await supabase.from('documents').upsert({
        id: params.id,
        user_id: user.id,
        title: docTitle,
        canvas_data: JSON.stringify(canvasData),
        pages: JSON.stringify(pages),
        updated_at: new Date().toISOString(),
      })
      setSaved(true)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  // ── Send to Back / Bring to Front ─────────────────────────────────────────
  const bringForward = () => { const c = getCanvas(); const o = c?.getActiveObject(); if (o) { c.bringForward(o); c.renderAll() } }
  const sendBackward = () => { const c = getCanvas(); const o = c?.getActiveObject(); if (o) { c.sendBackwards(o); c.renderAll() } }
  const deleteSelected = () => {
    const c = getCanvas(); const o = c?.getActiveObject()
    if (o) { c.remove(o); c.discardActiveObject(); c.renderAll(); setSaved(false); pushHistory() }
  }
  const duplicateSelected = () => {
    const c = getCanvas(); const o = c?.getActiveObject()
    if (o) o.clone((cloned: any) => {
      cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 })
      c.add(cloned); c.setActiveObject(cloned); c.renderAll(); pushHistory()
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const sidebarItems = [
    { id: 'layouts', icon: '⊞', label: 'Layouts' },
    { id: 'text', icon: 'T', label: 'Text' },
    { id: 'shapes', icon: '◻', label: 'Shapes' },
    { id: 'images', icon: '⬜', label: 'Images' },
    { id: 'table', icon: '⊟', label: 'Table' },
    { id: 'background', icon: '◈', label: 'Background' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0f172a', color: '#fff', padding: '0 16px', height: 52,
        borderBottom: '1px solid #1e293b', gap: 12, flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/documents')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>←</button>
          <div style={{ width: 28, height: 28, background: '#3b82f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>B</div>
          <input value={docTitle} onChange={e => { setDocTitle(e.target.value); setSaved(false) }}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 15, fontWeight: 500, outline: 'none', minWidth: 180 }} />
          <span style={{ fontSize: 11, color: saved ? '#22c55e' : '#f59e0b', background: saved ? '#14532d22' : '#78350f22', padding: '2px 8px', borderRadius: 4 }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : '● Unsaved'}
          </span>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[
            { icon: '↩', action: undoAction, tip: 'Undo (Ctrl+Z)' },
            { icon: '↪', action: redoAction, tip: 'Redo' },
            { icon: 'T', action: addText, tip: 'Text' },
            { icon: '⬜', action: () => addShape('rect'), tip: 'Rectangle' },
            { icon: '○', action: () => addShape('circle'), tip: 'Circle' },
            { icon: '△', action: () => addShape('triangle'), tip: 'Triangle' },
            { icon: '—', action: () => addShape('line'), tip: 'Line' },
          ].map(btn => (
            <button key={btn.tip} title={btn.tip} onClick={btn.action}
              style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>
              {btn.icon}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: '#334155', margin: '0 4px' }} />
          <select value={zoom} onChange={e => applyZoom(Number(e.target.value))}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 5, padding: '4px 8px', fontSize: 12 }}>
            {[50, 75, 100, 125, 150].map(z => <option key={z} value={z}>{z}%</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={saveDocument} style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '6px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Save</button>
          <button onClick={() => router.push(`/documents/${params.id}/present`)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>▶ Present</button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT NAV ── */}
        <div style={{ width: 56, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 4, borderRight: '1px solid #1e293b' }}>
          {sidebarItems.map(item => (
            <button key={item.id} title={item.label}
              onClick={() => setActivePanel(p => p === item.id ? '' : item.id)}
              style={{
                width: 42, height: 42, background: activePanel === item.id ? '#3b82f6' : 'none',
                border: 'none', color: activePanel === item.id ? '#fff' : '#64748b',
                borderRadius: 8, cursor: 'pointer', fontSize: item.id === 'text' ? 16 : 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, transition: 'all 0.15s'
              }}>
              {item.icon}
            </button>
          ))}
        </div>

        {/* ── SIDE PANEL ── */}
        {activePanel && (
          <div style={{ width: 280, background: '#fff', borderRight: '1px solid #e2e8f0', overflowY: 'auto', flexShrink: 0 }}>

            {/* LAYOUTS */}
            {activePanel === 'layouts' && (
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Layouts</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {LAYOUT_DEFINITIONS.map(layout => (
                    <button key={layout.id} onClick={() => applyLayout(layout)}
                      title={layout.description}
                      style={{
                        border: '2px solid #e2e8f0', borderRadius: 8, padding: 0,
                        cursor: 'pointer', overflow: 'hidden', background: '#fff',
                        transition: 'border-color 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}>
                      {/* Visual Preview */}
                      <LayoutPreview layout={layout} />
                      <div style={{ padding: '5px 8px', fontSize: 11, color: '#475569', fontWeight: 500, textAlign: 'left', borderTop: '1px solid #f1f5f9' }}>
                        {layout.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TEXT */}
            {activePanel === 'text' && (
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Text</div>
                {[
                  { label: 'Add Heading', size: 36, weight: 'bold', style: 'normal' },
                  { label: 'Add Subheading', size: 24, weight: 'bold', style: 'normal' },
                  { label: 'Add Body Text', size: 16, weight: 'normal', style: 'normal' },
                  { label: 'Add Caption', size: 12, weight: 'normal', style: 'italic' },
                ].map(t => (
                  <button key={t.label} onClick={() => {
                    const c = getCanvas(); const fabric = getFabric()
                    if (!c || !fabric) return
                    const txt = new fabric.Textbox('Click to edit', {
                      left: 100, top: 100, width: CANVAS_W * 0.5,
                      fontSize: t.size, fontWeight: t.weight, fontStyle: t.style,
                      fill: '#0f172a', fontFamily: 'Arial', editable: true
                    })
                    c.add(txt); c.setActiveObject(txt); c.renderAll(); setSaved(false); pushHistory()
                  }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px',
                      marginBottom: 6, border: '1px solid #e2e8f0', borderRadius: 7,
                      cursor: 'pointer', background: '#f8fafc',
                      fontSize: Math.min(t.size * 0.45, 16),
                      fontWeight: t.weight as any, fontStyle: t.style as any,
                      color: '#1e293b',
                    }}>
                    {t.label}
                  </button>
                ))}
                <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>FORMAT SELECTED TEXT</div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); updateSelected({ fontFamily: e.target.value }) }}
                      style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 5, padding: '5px 8px', fontSize: 12 }}>
                      {['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Helvetica', 'Trebuchet MS', 'Impact'].map(f =>
                        <option key={f}>{f}</option>)}
                    </select>
                    <input type="number" value={fontSize} min={8} max={200}
                      onChange={e => { setFontSize(Number(e.target.value)); updateSelected({ fontSize: Number(e.target.value) }) }}
                      style={{ width: 60, border: '1px solid #e2e8f0', borderRadius: 5, padding: '5px 6px', fontSize: 12 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {[
                      { icon: 'B', prop: { fontWeight: fontBold ? 'normal' : 'bold' }, active: fontBold, action: () => { setFontBold(!fontBold); updateSelected({ fontWeight: !fontBold ? 'bold' : 'normal' }) } },
                      { icon: 'I', prop: { fontStyle: fontItalic ? 'normal' : 'italic' }, active: fontItalic, action: () => { setFontItalic(!fontItalic); updateSelected({ fontStyle: !fontItalic ? 'italic' : 'normal' }) } },
                    ].map(btn => (
                      <button key={btn.icon} onClick={btn.action}
                        style={{ padding: '5px 12px', border: `1px solid ${btn.active ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 5, background: btn.active ? '#eff6ff' : '#fff', cursor: 'pointer', fontWeight: btn.icon === 'B' ? 'bold' : 'normal', fontStyle: btn.icon === 'I' ? 'italic' : 'normal', fontSize: 14 }}>
                        {btn.icon}
                      </button>
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>Color</span>
                      <input type="color" value={textColor}
                        onChange={e => { setTextColor(e.target.value); updateSelected({ fill: e.target.value }) }}
                        style={{ width: 32, height: 28, border: '1px solid #e2e8f0', borderRadius: 4, padding: 2, cursor: 'pointer' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SHAPES */}
            {activePanel === 'shapes' && (
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Shapes</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { shape: 'rect', label: 'Rectangle', icon: '⬜' },
                    { shape: 'circle', label: 'Circle', icon: '⭕' },
                    { shape: 'triangle', label: 'Triangle', icon: '△' },
                    { shape: 'line', label: 'Line', icon: '—' },
                  ].map(s => (
                    <button key={s.shape} onClick={() => addShape(s.shape)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', background: '#f8fafc', fontSize: 13, color: '#334155' }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>FILL COLOR</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#0f172a', '#ffffff'].map(c => (
                      <button key={c} onClick={() => { setFillColor(c); updateSelected({ fill: c }) }}
                        style={{ width: 28, height: 28, background: c, border: fillColor === c ? '3px solid #0f172a' : '1px solid #e2e8f0', borderRadius: 5, cursor: 'pointer' }} />
                    ))}
                    <input type="color" value={fillColor} onChange={e => { setFillColor(e.target.value); updateSelected({ fill: e.target.value }) }}
                      style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 5, padding: 2, cursor: 'pointer' }} />
                  </div>
                </div>
                {selectedObj && (
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginTop: 4 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>SELECTED OBJECT</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {[
                        { label: '↑ Front', action: bringForward },
                        { label: '↓ Back', action: sendBackward },
                        { label: '⿻ Copy', action: duplicateSelected },
                        { label: '✕ Delete', action: deleteSelected, danger: true },
                      ].map(btn => (
                        <button key={btn.label} onClick={btn.action}
                          style={{ padding: '5px 10px', border: `1px solid ${btn.danger ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 5, cursor: 'pointer', fontSize: 12, background: btn.danger ? '#fef2f2' : '#f8fafc', color: btn.danger ? '#ef4444' : '#334155' }}>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IMAGES */}
            {activePanel === 'images' && (
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Built-in Images</div>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', border: '2px dashed #cbd5e1', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#64748b', marginBottom: 14, background: '#f8fafc' }}>
                  ⬆ Upload Image
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && addImageFromFile(e.target.files[0])} />
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {(Object.keys(BUILTIN_IMAGES) as (keyof typeof BUILTIN_IMAGES)[]).map(cat => (
                    <button key={cat} onClick={() => setImgCategory(cat)}
                      style={{ padding: '4px 10px', border: `1px solid ${imgCategory === cat ? '#3b82f6' : '#e2e8f0'}`, borderRadius: 20, fontSize: 11, cursor: 'pointer', background: imgCategory === cat ? '#eff6ff' : '#fff', color: imgCategory === cat ? '#3b82f6' : '#64748b', fontWeight: imgCategory === cat ? 600 : 400, textTransform: 'capitalize' }}>
                      {cat}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {BUILTIN_IMAGES[imgCategory].map(img => (
                    <button key={img.id} onClick={() => addBuiltinImage(img.url)}
                      style={{ border: '2px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0, background: '#f1f5f9', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#3b82f6'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'}>
                      <img src={img.url} alt={img.label} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} loading="lazy" />
                      <div style={{ padding: '4px 6px', fontSize: 10, color: '#64748b', textAlign: 'center' }}>{img.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TABLE */}
            {activePanel === 'table' && (
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Insert Table</div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Click a size to insert a table with editable cells:</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>Double-click any cell to edit its content</div>
                </div>
                <TableSizeGrid onSelect={(r, c) => insertTable(r, c)} />
                <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>CUSTOM SIZE</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="number" value={tableRows} min={1} max={20} onChange={e => setTableRows(Number(e.target.value))}
                      placeholder="Rows" style={{ width: 70, border: '1px solid #e2e8f0', borderRadius: 5, padding: '6px 8px', fontSize: 13 }} />
                    <span style={{ color: '#94a3b8' }}>×</span>
                    <input type="number" value={tableCols} min={1} max={10} onChange={e => setTableCols(Number(e.target.value))}
                      placeholder="Cols" style={{ width: 70, border: '1px solid #e2e8f0', borderRadius: 5, padding: '6px 8px', fontSize: 13 }} />
                    <button onClick={() => insertTable(tableRows, tableCols)}
                      style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                      Insert
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BACKGROUND */}
            {activePanel === 'background' && (
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Background</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>SOLID COLOR</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {[
                    '#ffffff', '#f8fafc', '#0f172a', '#1e3a5f',
                    '#eff6ff', '#fef2f2', '#f0fdf4', '#fffbeb',
                    '#f5f3ff', '#fdf4ff', '#1d4ed8', '#15803d',
                    '#b45309', '#be123c', '#6d28d9', '#0369a1',
                  ].map(c => (
                    <button key={c} onClick={() => setBackground(c)}
                      style={{ width: 36, height: 36, background: c, border: bgColor === c ? '3px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 8 }}>CUSTOM COLOR</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={bgColor} onChange={e => setBackground(e.target.value)}
                    style={{ width: 44, height: 36, border: '1px solid #e2e8f0', borderRadius: 6, padding: 2, cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: '#334155', fontFamily: 'monospace' }}>{bgColor}</span>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── CANVAS AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Canvas scroll area */}
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 24, background: '#e2e8f0' }}>
            <div style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.18)', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* ── PAGE STRIP ── */}
          <div style={{ height: 100, background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', overflowX: 'auto' }}>
            {pages.map((page, idx) => (
              <div key={page.id} onClick={() => switchPage(idx)}
                style={{
                  width: 80, height: 72, border: idx === currentPage ? '2px solid #3b82f6' : '2px solid #475569',
                  borderRadius: 4, cursor: 'pointer', background: '#0f172a', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#94a3b8', position: 'relative',
                  transition: 'border-color 0.15s'
                }}>
                {idx + 1}
                <div style={{ position: 'absolute', bottom: 2, right: 3, fontSize: 9, color: '#64748b' }}>{idx + 1}</div>
              </div>
            ))}
            <button onClick={addPage}
              style={{ width: 80, height: 72, border: '2px dashed #475569', borderRadius: 4, cursor: 'pointer', background: 'none', color: '#64748b', fontSize: 22, flexShrink: 0 }}>
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Layout Preview Component ─────────────────────────────────────────────────
function LayoutPreview({ layout }: { layout: typeof LAYOUT_DEFINITIONS[0] }) {
  const p = layout.preview as any
  const W = 120, H = 68

  return (
    <div style={{ width: W, height: H, background: p.bg || '#ffffff', position: 'relative', overflow: 'hidden' }}>
      {/* Title Slide */}
      {layout.id === 'title' && <>
        <div style={{ position: 'absolute', left: '10%', top: '30%', width: '80%', height: 3, background: '#3b82f6', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '15%', top: '40%', width: '70%', height: 8, background: '#1a1a2e', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '20%', top: '60%', width: '60%', height: 4, background: '#888', borderRadius: 2 }} />
      </>}
      {/* Title + Content */}
      {layout.id === 'title-content' && <>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '20%', background: '#1e3a5f' }} />
        <div style={{ position: 'absolute', left: '5%', top: '30%', width: '90%', height: 4, background: '#475569', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '5%', top: '45%', width: '80%', height: 3, background: '#94a3b8', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '5%', top: '58%', width: '85%', height: 3, background: '#94a3b8', borderRadius: 2 }} />
      </>}
      {/* Two Column */}
      {layout.id === 'two-column' && <>
        <div style={{ position: 'absolute', left: '5%', top: '5%', width: '90%', height: 6, background: '#1e293b', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '4%', top: '20%', width: '43%', height: '70%', background: '#f1f5f9', borderRadius: 3 }} />
        <div style={{ position: 'absolute', left: '53%', top: '20%', width: '43%', height: '70%', background: '#f1f5f9', borderRadius: 3 }} />
      </>}
      {/* Image Right */}
      {layout.id === 'image-right' && <>
        <div style={{ position: 'absolute', left: '5%', top: '10%', width: '40%', height: 5, background: '#0f172a', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '5%', top: '28%', width: '42%', height: 3, background: '#94a3b8', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '5%', top: '38%', width: '38%', height: 3, background: '#94a3b8', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '52%', top: '5%', width: '44%', height: '90%', background: '#e2e8f0', borderRadius: 4 }} />
      </>}
      {/* Image Left */}
      {layout.id === 'image-left' && <>
        <div style={{ position: 'absolute', left: '4%', top: '5%', width: '44%', height: '90%', background: '#e2e8f0', borderRadius: 4 }} />
        <div style={{ position: 'absolute', left: '54%', top: '10%', width: '40%', height: 5, background: '#0f172a', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '54%', top: '28%', width: '38%', height: 3, background: '#94a3b8', borderRadius: 2 }} />
      </>}
      {/* Three Column */}
      {layout.id === 'three-column' && <>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ position: 'absolute', left: `${4 + i * 33}%`, top: '20%', width: '28%', height: '70%', background: '#f8fafc', borderRadius: 3 }}>
            <div style={{ height: '22%', background: ['#3b82f6', '#10b981', '#f59e0b'][i], borderRadius: '3px 3px 0 0' }} />
          </div>
        ))}
      </>}
      {/* Big Quote */}
      {layout.id === 'big-quote' && <>
        <div style={{ position: 'absolute', left: '5%', top: '5%', fontSize: 32, color: '#3b82f640', lineHeight: 1 }}>"</div>
        <div style={{ position: 'absolute', left: '10%', top: '30%', width: '80%', height: 4, background: '#f1f5f9', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '15%', top: '44%', width: '70%', height: 3, background: '#f1f5f9', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '35%', top: '65%', width: '30%', height: 1, background: '#3b82f6' }} />
      </>}
      {/* Stats */}
      {layout.id === 'stats' && <>
        <div style={{ position: 'absolute', left: '5%', top: '5%', width: '90%', height: 5, background: '#0f172a', borderRadius: 2 }} />
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ position: 'absolute', left: `${4 + i * 24}%`, top: '22%', width: '22%', height: '60%', background: '#f8fafc', borderRadius: 3 }}>
            <div style={{ marginTop: '25%', height: 6, background: '#3b82f6', borderRadius: 2, width: '60%', margin: '25% auto 0' }} />
          </div>
        ))}
      </>}
      {/* Section Header */}
      {layout.id === 'section-header' && <>
        <div style={{ position: 'absolute', left: '10%', top: '40%', width: 4, height: '18%', background: '#93c5fd' }} />
        <div style={{ position: 'absolute', left: '16%', top: '40%', width: '70%', height: 7, background: '#fff', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: '16%', top: '62%', width: '50%', height: 4, background: '#bfdbfe', borderRadius: 2 }} />
      </>}
      {/* Agenda */}
      {layout.id === 'agenda' && <>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '35%', height: '100%', background: '#0f172a' }} />
        <div style={{ position: 'absolute', left: '5%', top: '25%', width: '22%', height: 8, background: '#93c5fd', borderRadius: 2 }} />
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ position: 'absolute', left: '40%', top: `${12 + i * 20}%`, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, background: '#3b82f6', borderRadius: 2 }} />
            <div style={{ width: 40, height: 3, background: '#1e293b', borderRadius: 1 }} />
          </div>
        ))}
      </>}
      {/* Full Image */}
      {layout.id === 'full-image' && <>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '22%', background: 'rgba(0,0,0,0.55)' }} />
        <div style={{ position: 'absolute', bottom: '6%', left: '5%', width: '60%', height: 4, background: '#fff', borderRadius: 2, opacity: 0.8 }} />
      </>}
      {/* Blank */}
      {layout.id === 'blank' && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2e8f0', fontSize: 20 }}>+</div>
      )}
    </div>
  )
}

// ─── Table Size Grid ───────────────────────────────────────────────────────────
function TableSizeGrid({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState<[number, number] | null>(null)
  const MAX_R = 6, MAX_C = 6

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${MAX_C}, 1fr)`, gap: 3, marginBottom: 8 }}>
        {Array.from({ length: MAX_R * MAX_C }).map((_, i) => {
          const r = Math.floor(i / MAX_C) + 1
          const c = (i % MAX_C) + 1
          const active = hover && r <= hover[0] && c <= hover[1]
          return (
            <div key={i}
              onMouseEnter={() => setHover([r, c])}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(r, c)}
              style={{
                width: 28, height: 28, border: `2px solid ${active ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: 3, cursor: 'pointer', background: active ? '#eff6ff' : '#f8fafc',
                transition: 'all 0.08s'
              }} />
          )
        })}
      </div>
      {hover && (
        <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, textAlign: 'center' }}>
          {hover[0]} × {hover[1]} Table
        </div>
      )}
    </div>
  )
}
