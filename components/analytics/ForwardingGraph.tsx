'use client'
import { useMemo } from 'react'

interface Session {
  id: string
  viewer_name: string | null
  viewer_email: string | null
  parent_session_id: string | null
  engagement_score: number
  total_time_seconds: number
  started_at: string
  completion_rate: number
}

interface ForwardingGraphProps {
  sessions: Session[]
}

interface GraphNode {
  id: string
  label: string
  score: number
  isRoot: boolean
  depth: number
  x: number
  y: number
  children: GraphNode[]
}

function buildTree(sessions: Session[]): GraphNode[] {
  const byId = new Map<string, Session>()
  const children = new Map<string, string[]>()
  sessions.forEach(s => {
    byId.set(s.id, s)
    const parent = s.parent_session_id ?? 'root'
    if (!children.has(parent)) children.set(parent, [])
    children.get(parent)!.push(s.id)
  })

  function buildNode(id: string, depth: number): GraphNode {
    const session = byId.get(id)!
    const kids = (children.get(id) ?? []).map(cid => buildNode(cid, depth + 1))
    return {
      id,
      label: session.viewer_name ?? session.viewer_email ?? 'Anonymous',
      score: session.engagement_score ?? 0,
      isRoot: !session.parent_session_id,
      depth,
      x: 0,
      y: 0,
      children: kids,
    }
  }

  const roots = sessions.filter(s => !s.parent_session_id).map(s => buildNode(s.id, 0))
  return roots
}

function layoutTree(nodes: GraphNode[], startX: number, startY: number, levelGap: number, nodeGap: number): void {
  let x = startX
  nodes.forEach(node => {
    node.x = x
    node.y = startY
    if (node.children.length > 0) {
      layoutTree(node.children, x, startY + levelGap, levelGap, nodeGap)
      // center parent over children
      const firstChild = node.children[0]
      const lastChild = node.children[node.children.length - 1]
      node.x = (firstChild.x + lastChild.x) / 2
    }
    x += nodeGap
  })
}

function collectNodes(nodes: GraphNode[]): GraphNode[] {
  const result: GraphNode[] = []
  const stack = [...nodes]
  while (stack.length) {
    const n = stack.pop()!
    result.push(n)
    stack.push(...n.children)
  }
  return result
}

function collectEdges(nodes: GraphNode[]): Array<{ from: GraphNode; to: GraphNode }> {
  const edges: Array<{ from: GraphNode; to: GraphNode }> = []
  const stack = [...nodes]
  while (stack.length) {
    const n = stack.pop()!
    n.children.forEach(c => { edges.push({ from: n, to: c }); stack.push(c) })
  }
  return edges
}

function scoreColor(score: number): string {
  if (score >= 80) return '#16A34A'
  if (score >= 60) return '#DC6B19'
  if (score >= 40) return '#D97706'
  return '#94A3B8'
}

export default function ForwardingGraph({ sessions }: ForwardingGraphProps) {
  const hasForwarding = sessions.some(s => s.parent_session_id)

  const { allNodes, edges, viewBox } = useMemo(() => {
    const roots = buildTree(sessions)
    layoutTree(roots, 60, 40, 80, 140)
    const all = collectNodes(roots)
    // normalize positions
    const minX = Math.min(...all.map(n => n.x))
    const maxX = Math.max(...all.map(n => n.x))
    const maxY = Math.max(...all.map(n => n.y))
    const width = Math.max(maxX - minX + 120, 400)
    const height = maxY + 80
    all.forEach(n => { n.x = n.x - minX + 60 })
    return {
      allNodes: all,
      edges: collectEdges(roots),
      viewBox: `0 0 ${width} ${height}`,
    }
  }, [sessions])

  if (!hasForwarding && sessions.length <= 1) {
    return (
      <div style={{ background: '#F5F3EF', borderRadius: 12, padding: '28px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 22, margin: '0 0 8px' }}>🔗</p>
        <p style={{ fontSize: 13, color: '#9C9389', margin: 0, lineHeight: 1.5 }}>No forwarding detected yet.<br />Forwarding chains appear here when viewers share your link.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ color: '#16A34A', label: 'High (80+)' }, { color: '#DC6B19', label: 'Medium (60+)' }, { color: '#D97706', label: 'Low (40+)' }, { color: '#94A3B8', label: 'Minimal' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
              <span style={{ fontSize: 11, color: '#9C9389' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: '#FAFAF8', border: '1px solid #E5E0D8', borderRadius: 12, overflow: 'auto' }}>
        <svg width="100%" viewBox={viewBox} style={{ minWidth: 360 }}>
          {/* Edges */}
          {edges.map((e, i) => (
            <line key={i}
              x1={e.from.x} y1={e.from.y + 14}
              x2={e.to.x} y2={e.to.y - 14}
              stroke="#E5E0D8" strokeWidth="1.5" strokeDasharray={e.to.depth > 1 ? '4 3' : undefined}
            />
          ))}
          {/* Nodes */}
          {allNodes.map(node => {
            const color = scoreColor(node.score)
            const label = node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label
            return (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={14}
                  fill={node.isRoot ? '#FFF3E8' : 'white'}
                  stroke={color} strokeWidth={node.isRoot ? 2 : 1.5}
                />
                {node.isRoot && (
                  <circle cx={node.x} cy={node.y} r={18}
                    fill="none" stroke={color} strokeWidth={0.5} opacity={0.3}
                  />
                )}
                <text x={node.x} y={node.y + 4} textAnchor="middle"
                  style={{ fontSize: 10, fontFamily: 'DM Sans, system-ui, sans-serif', fontWeight: 600, fill: color }}>
                  {node.score}
                </text>
                <text x={node.x} y={node.y + 26} textAnchor="middle"
                  style={{ fontSize: 10, fontFamily: 'DM Sans, system-ui, sans-serif', fill: '#6B6559' }}>
                  {label}
                </text>
                {node.children.length > 0 && (
                  <text x={node.x + 16} y={node.y - 10} textAnchor="start"
                    style={{ fontSize: 9, fontFamily: 'DM Sans, system-ui, sans-serif', fill: '#DC6B19', fontWeight: 600 }}>
                    ↗{node.children.length}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <p style={{ fontSize: 11, color: '#C4BDB4', marginTop: 6, lineHeight: 1.5 }}>
        Circle color = engagement score. ↗ indicates the viewer forwarded the link. Score shown inside each node.
      </p>
    </div>
  )
}
