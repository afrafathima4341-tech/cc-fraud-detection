import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { buildTransactionGraph } from '../utils/transactionGraph'

const nodeColors = {
  customer: '#4dd4ac',
  merchant: '#d4ff3a',
  card: '#ffb627',
  upi: '#75c7e7',
  bank: '#ff936d',
  network: '#c3a6ff',
  channel: '#c5c8d0',
  device: '#ff7bf0',
  ip: '#38ef7d',
}

export default function TransactionNetworkGraph({ transactions, onNodeSelect, filterFlaggedOnly = false, focusNodeId = null }) {
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const hasInitialFit = useRef(false)
  const [size, setSize] = useState({ width: 0, height: 380 })
  
  const rawGraphData = useMemo(() => buildTransactionGraph(transactions), [transactions])

  const graphData = useMemo(() => {
    if (!filterFlaggedOnly) return rawGraphData

    // Filter nodes with fraud or linked directly to fraud
    const activeNodeIds = new Set(
      rawGraphData.nodes.filter(n => n.fraudCount > 0 || n.id === focusNodeId).map(n => n.id)
    )

    // Expand 1 hop around flagged nodes
    rawGraphData.links.forEach(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target
      if (activeNodeIds.has(srcId) || activeNodeIds.has(tgtId) || l.fraudCount > 0) {
        activeNodeIds.add(srcId)
        activeNodeIds.add(tgtId)
      }
    })

    const filteredNodes = rawGraphData.nodes.filter(n => activeNodeIds.has(n.id))
    const filteredLinks = rawGraphData.links.filter(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target
      return activeNodeIds.has(srcId) && activeNodeIds.has(tgtId)
    })

    return { nodes: filteredNodes, links: filteredLinks }
  }, [rawGraphData, filterFlaggedOnly, focusNodeId])

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return undefined

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(1, Math.floor(entry.contentRect.width)),
        height: Math.max(300, Math.floor(entry.contentRect.height)),
      })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const nodeColor = (node) => {
    if (node.id === focusNodeId) return '#00f0ff'
    if (node.fraudCount > 0) return '#ff5e62'
    return nodeColors[node.type] || '#a8a496'
  }

  const drawNode = (node, context, globalScale) => {
    if (typeof node.x !== 'number' || typeof node.y !== 'number') return

    const isFocused = node.id === focusNodeId
    const radius = isFocused ? 8 : (node.type === 'merchant' ? 6 : (node.type === 'device' || node.type === 'ip' ? 5.5 : 5))
    
    // Outer halo for high risk / syndicate / focused nodes
    if (isFocused || node.fraudCount > 0) {
      context.beginPath()
      context.arc(node.x, node.y, radius + 3, 0, 2 * Math.PI, false)
      context.fillStyle = isFocused ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 94, 98, 0.25)'
      context.fill()
    }

    context.beginPath()
    context.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
    context.fillStyle = nodeColor(node)
    context.fill()
    context.lineWidth = isFocused ? 2.5 : (node.fraudCount > 0 ? 2 : 1)
    context.strokeStyle = isFocused ? '#ffffff' : (node.fraudCount > 0 ? '#ffebe9' : 'rgba(13, 14, 20, 0.9)')
    context.stroke()

    if (globalScale < 0.55 && !isFocused) return
    context.font = `500 ${Math.max(8, 10 / globalScale)}px Space Grotesk, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'top'
    context.fillStyle = isFocused ? '#00f0ff' : '#f0ebe1'
    context.fillText(node.label, node.x, node.y + radius + 3, 140)
  }

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Linked transaction network. Drag to pan and scroll to zoom."
      style={{ width: '100%', height: '100%', minHeight: 300, overflow: 'hidden', borderRadius: 6, background: 'rgba(9, 11, 16, 0.42)' }}
    >
      {graphData.nodes.length === 0 ? (
        <div style={{ height: '100%', minHeight: 300, display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', fontSize: 13 }}>
          Waiting for transaction relationships…
        </div>
      ) : size.width === 0 ? (
        <div style={{ height: '100%', minHeight: 300, display: 'grid', placeItems: 'center', color: 'var(--fg-dim)', fontSize: 13 }}>
          Preparing transaction network…
        </div>
      ) : (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0, 0, 0, 0)"
          nodeId="id"
          nodeVal={(node) => 3 + Math.min(node.transactionCount, 8) * 0.45}
          nodeColor={nodeColor}
          nodeLabel={(node) => `${node.label} · ${node.type} · ${node.transactionCount} transaction${node.transactionCount === 1 ? '' : 's'}${node.fraudCount ? ` · ${node.fraudCount} flagged` : ''}`}
          nodeCanvasObject={drawNode}
          nodeCanvasObjectMode="replace"
          linkColor={(link) => link.fraudCount > 0 ? 'rgba(255, 94, 98, 0.72)' : 'rgba(168, 164, 150, 0.28)'}
          linkWidth={(link) => 1 + Math.min(2.5, Math.log2(link.transactionCount + 1))}
          linkLabel={(link) => `${link.type} · ${link.transactionCount} transaction${link.transactionCount === 1 ? '' : 's'}${link.fraudCount ? ` · ${link.fraudCount} flagged` : ''}`}
          linkDirectionalParticles={(link) => link.fraudCount > 0 ? 2 : 0}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleSpeed={0.004}
          cooldownTicks={90}
          d3AlphaDecay={0.035}
          d3VelocityDecay={0.28}
          onEngineStop={() => {
            if (!hasInitialFit.current) {
              graphRef.current?.zoomToFit(500, 42)
              hasInitialFit.current = true
            }
          }}
          onNodeClick={(node) => onNodeSelect?.(node)}
        />
      )}
    </div>
  )
}
