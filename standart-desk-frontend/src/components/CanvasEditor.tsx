import React, { useRef, useEffect, useState } from 'react';
import { BlockSchema } from '../types';
import '../styles/canvas.css';

interface Block {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'process' | 'decision' | 'start' | 'end' | 'data';
  label: string;
  color: string;
}

interface Connection {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  label?: string;
}

interface CanvasEditorProps {
  projectId?: number;
  blockSchema?: BlockSchema | null;
  onSave?: (content: string) => Promise<void>;
}

const BLOCK_WIDTH = 120;
const BLOCK_HEIGHT = 80;

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ blockSchema, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan] = useState({ x: 0, y: 0 });
  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Load from blockSchema
  useEffect(() => {
    if (blockSchema?.content) {
      try {
        const data = JSON.parse(blockSchema.content);
        setBlocks(data.blocks || []);
        setConnections(data.connections || []);
        console.log('[CANVAS] Loaded block schema:', data);
      } catch (e) {
        console.error('[CANVAS] Failed to parse block schema:', e);
      }
    }
  }, [blockSchema?.id]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    const gridSize = 20;
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw connections
    connections.forEach(conn => {
      const fromBlock = blocks.find(b => b.id === conn.fromBlockId);
      const toBlock = blocks.find(b => b.id === conn.toBlockId);
      if (fromBlock && toBlock) {
        const fromX = fromBlock.x + fromBlock.width / 2;
        const fromY = fromBlock.y + fromBlock.height / 2;
        const toX = toBlock.x + toBlock.width / 2;
        const toY = toBlock.y + toBlock.height / 2;

        // Draw curved line with bezier
        ctx.strokeStyle = '#2C3E50';
        ctx.lineWidth = 2.5 / zoom;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        const dx = toX - fromX;
        const dy = toY - fromY;
        const controlX = fromX + dx / 2;
        const controlY = fromY + (dy > 0 ? 100 : -100);
        
        ctx.quadraticCurveTo(controlX, controlY, toX, toY);
        ctx.stroke();

        // Draw arrow head
        const headlen = 20;
        const angle = Math.atan2(toY - controlY, toX - controlX);
        ctx.fillStyle = '#2C3E50';
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw preview line while in connect mode
    if (connectMode && connectFromId) {
      const fromBlock = blocks.find(b => b.id === connectFromId);
      if (fromBlock) {
        const fromX = fromBlock.x + fromBlock.width / 2;
        const fromY = fromBlock.y + fromBlock.height / 2;
        
        // Detect if mouse is near any target block (snap detection)
        const snapDistance = 50 / zoom;
        let targetBlockId: string | null = null;
        let targetX = mousePos.x;
        let targetY = mousePos.y;
        
        for (const block of blocks) {
          if (block.id === connectFromId) continue;
          const blockCenterX = block.x + block.width / 2;
          const blockCenterY = block.y + block.height / 2;
          const distance = Math.sqrt(
            Math.pow(mousePos.x - blockCenterX, 2) + 
            Math.pow(mousePos.y - blockCenterY, 2)
          );
          
          if (distance < snapDistance) {
            targetBlockId = block.id;
            targetX = blockCenterX;
            targetY = blockCenterY;
            break;
          }
        }
        
        // Draw curved preview line
        ctx.strokeStyle = targetBlockId ? '#00AA00' : '#FF6B9D';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        
        const dx = targetX - fromX;
        const dy = targetY - fromY;
        const controlX = fromX + dx / 2;
        const controlY = fromY + (dy > 0 ? 50 : -50);
        
        ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Highlight target block if snapping
        if (targetBlockId) {
          const targetBlock = blocks.find(b => b.id === targetBlockId);
          if (targetBlock) {
            ctx.strokeStyle = '#00AA00';
            ctx.lineWidth = 3 / zoom;
            if (targetBlock.type === 'decision') {
              ctx.beginPath();
              ctx.moveTo(targetBlock.x + targetBlock.width / 2, targetBlock.y);
              ctx.lineTo(targetBlock.x + targetBlock.width, targetBlock.y + targetBlock.height / 2);
              ctx.lineTo(targetBlock.x + targetBlock.width / 2, targetBlock.y + targetBlock.height);
              ctx.lineTo(targetBlock.x, targetBlock.y + targetBlock.height / 2);
              ctx.closePath();
              ctx.stroke();
            } else if (targetBlock.type === 'start' || targetBlock.type === 'end') {
              ctx.beginPath();
              ctx.ellipse(targetBlock.x + targetBlock.width / 2, targetBlock.y + targetBlock.height / 2, targetBlock.width / 2, targetBlock.height / 2, 0, 0, 2 * Math.PI);
              ctx.stroke();
            } else {
              ctx.strokeRect(targetBlock.x, targetBlock.y, targetBlock.width, targetBlock.height);
            }
          }
        }
      }
    }

    // Draw blocks
    blocks.forEach(block => {
      ctx.fillStyle = block.color;
      ctx.strokeStyle = block.id === selectedBlockId ? '#FF6B9D' : '#2C3E50';
      ctx.lineWidth = block.id === selectedBlockId ? 3 : 2;

      // Highlight connecting blocks
      if (connectMode && block.id === connectFromId) {
        ctx.strokeStyle = '#00AA00';
        ctx.lineWidth = 3;
      } else if (connectMode && connectFromId && block.id !== connectFromId) {
        ctx.strokeStyle = '#0099FF';
        ctx.lineWidth = 2;
      }

      if (block.type === 'decision') {
        ctx.beginPath();
        ctx.moveTo(block.x + block.width / 2, block.y);
        ctx.lineTo(block.x + block.width, block.y + block.height / 2);
        ctx.lineTo(block.x + block.width / 2, block.y + block.height);
        ctx.lineTo(block.x, block.y + block.height / 2);
        ctx.closePath();
      } else if (block.type === 'start' || block.type === 'end') {
        ctx.beginPath();
        ctx.ellipse(block.x + block.width / 2, block.y + block.height / 2, block.width / 2, block.height / 2, 0, 0, 2 * Math.PI);
      } else {
        ctx.fillRect(block.x, block.y, block.width, block.height);
        ctx.strokeRect(block.x, block.y, block.width, block.height);
      }

      ctx.fill();
      ctx.stroke();

      // Draw text
      ctx.fillStyle = '#000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const words = block.label.split(' ');
      let y = block.y + block.height / 2 - (words.length - 1) * 7;
      words.forEach(word => {
        ctx.fillText(word, block.x + block.width / 2, y, block.width - 10);
        y += 14;
      });
    });

    ctx.restore();
  }, [blocks, connections, selectedBlockId, zoom, pan, connectMode, connectFromId, mousePos]);

  const screenToCanvas = (screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom
    };
  };

  const getBlockAtPoint = (x: number, y: number): string | null => {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      const margin = 10 / zoom;
      if (x >= block.x - margin && x <= block.x + block.width + margin && y >= block.y - margin && y <= block.y + block.height + margin) {
        return block.id;
      }
    }
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const blockId = getBlockAtPoint(x, y);

    if (connectMode && connectFromId) {
      let targetBlockId = blockId;
      
      // If no direct click, check for snap blocks nearby
      if (!targetBlockId) {
        const snapDistance = 50 / zoom;
        for (const block of blocks) {
          if (block.id === connectFromId) continue;
          const blockCenterX = block.x + block.width / 2;
          const blockCenterY = block.y + block.height / 2;
          const distance = Math.sqrt(
            Math.pow(x - blockCenterX, 2) + 
            Math.pow(y - blockCenterY, 2)
          );
          
          if (distance < snapDistance) {
            targetBlockId = block.id;
            break;
          }
        }
      }
      
      if (targetBlockId && targetBlockId !== connectFromId) {
        // Create connection
        if (!connections.some(c => c.fromBlockId === connectFromId && c.toBlockId === targetBlockId)) {
          const newConnection: Connection = {
            id: `conn-${Date.now()}`,
            fromBlockId: connectFromId,
            toBlockId: targetBlockId
          };
          setConnections([...connections, newConnection]);
          console.log('[CANVAS] Connection created:', newConnection);
        }
      }
      setConnectMode(false);
      setConnectFromId(null);
    } else {
      setSelectedBlockId(blockId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    if (connectMode) return;

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const blockId = getBlockAtPoint(x, y);

    if (blockId) {
      const block = blocks.find(b => b.id === blockId);
      if (block) {
        setSelectedBlockId(blockId);
        setDragOffset({ x: x - block.x, y: y - block.y });
        setIsDragging(true);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setMousePos({ x, y });

    if (!isDragging || !selectedBlockId) return;
    
    setBlocks(blocks.map(b =>
      b.id === selectedBlockId ? { ...b, x: x - dragOffset.x, y: y - dragOffset.y } : b
    ));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const newZoom = e.deltaY > 0 ? zoom * 0.9 : zoom * 1.1;
    setZoom(Math.max(0.1, Math.min(3, newZoom)));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+3 - Toggle connect mode
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        if (selectedBlockId) {
          if (connectMode && connectFromId === selectedBlockId) {
            setConnectMode(false);
            setConnectFromId(null);
          } else {
            setConnectMode(true);
            setConnectFromId(selectedBlockId);
          }
        }
      }

      // Delete - Remove selected block
      if (e.key === 'Delete' && selectedBlockId) {
        deleteSelectedBlock();
      }

      // Escape - Cancel connect mode
      if (e.key === 'Escape' && connectMode) {
        setConnectMode(false);
        setConnectFromId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, connectMode, connectFromId]);

  const addBlock = (type: Block['type']) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      x: 150,
      y: 150,
      width: BLOCK_WIDTH,
      height: BLOCK_HEIGHT,
      type,
      label: `Блок ${blocks.length + 1}`,
      color: '#E8F4F8'
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    console.log('[CANVAS] Block added:', newBlock);
  };

  const updateSelectedBlock = (updates: Partial<Block>) => {
    if (!selectedBlockId) return;
    setBlocks(blocks.map(b => b.id === selectedBlockId ? { ...b, ...updates } : b));
  };

  const deleteSelectedBlock = () => {
    if (!selectedBlockId) return;
    console.log('[CANVAS] Deleting block:', selectedBlockId);
    setBlocks(blocks.filter(b => b.id !== selectedBlockId));
    setConnections(connections.filter(c => c.fromBlockId !== selectedBlockId && c.toBlockId !== selectedBlockId));
    setSelectedBlockId(null);
  };

  const saveCanvas = async () => {
    const content = JSON.stringify({ blocks, connections }, null, 2);
    console.log('[CANVAS] Attempting to save:', { blockCount: blocks.length, connectionCount: connections.length });
    
    if (onSave) {
      try {
        await onSave(content);
        console.log('[CANVAS] Save successful');
        alert('✅ Блок-схема сохранена успешно!');
      } catch (err) {
        console.error('[CANVAS] Save error:', err);
        alert('❌ Ошибка при сохранении: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    } else {
      console.warn('[CANVAS] No onSave callback provided');
      alert('❌ Функция сохранения недоступна');
    }
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="canvas-editor">
      <div className="canvas-toolbar">
        <button onClick={() => addBlock('process')} className="btn btn-sm" title="Добавить процесс (Ctrl+P)">
          ➕ Процесс
        </button>
        <button onClick={() => addBlock('decision')} className="btn btn-sm" title="Добавить решение (Ctrl+D)">
          🔷 Решение
        </button>
        <button onClick={() => addBlock('start')} className="btn btn-sm" title="Добавить начало">
          ◯ Начало
        </button>
        <button onClick={() => addBlock('end')} className="btn btn-sm" title="Добавить конец">
          ◯ Конец
        </button>
        <button onClick={() => addBlock('data')} className="btn btn-sm" title="Добавить данные">
          📋 Данные
        </button>

        <div style={{ borderLeft: '1px solid #ddd', margin: '0 10px', height: '30px' }}></div>

        {selectedBlockId && (
          <>
            <button
              onClick={() => {
                if (connectMode && connectFromId === selectedBlockId) {
                  setConnectMode(false);
                  setConnectFromId(null);
                } else {
                  setConnectMode(true);
                  setConnectFromId(selectedBlockId);
                }
              }}
              className={`btn btn-sm ${connectMode && connectFromId === selectedBlockId ? 'btn-active' : ''}`}
              title="Режим соединения (Ctrl+3)"
            >
              🔗 Соединить
            </button>

            {connectMode && connectFromId === selectedBlockId && (
              <span style={{ marginLeft: '10px', color: '#00AA00', fontWeight: 'bold' }}>
                ✓ Выберите целевой блок...
              </span>
            )}
          </>
        )}

        <div style={{ borderLeft: '1px solid #ddd', margin: '0 10px', height: '30px' }}></div>

        {selectedBlock && (
          <>
            <input
              type="text"
              value={selectedBlock.label}
              onChange={e => updateSelectedBlock({ label: e.target.value })}
              placeholder="Текст блока"
              className="form-input"
              style={{ width: '150px' }}
              title="Редактировать текст блока"
            />
            <input
              type="color"
              value={selectedBlock.color}
              onChange={e => {
                updateSelectedBlock({ color: e.target.value });
                console.log('[CANVAS] Color changed for block', selectedBlockId, 'to', e.target.value);
              }}
              className="color-picker"
              title="Выбрать цвет только для этого блока"
            />
            <button onClick={deleteSelectedBlock} className="btn btn-sm" style={{ background: '#FFB6C1' }} title="Удалить блок (Delete)">
              🗑️ Удалить
            </button>
          </>
        )}

        <div style={{ borderLeft: '1px solid #ddd', margin: '0 10px', height: '30px', marginLeft: 'auto' }}></div>

        <button onClick={() => setZoom(1)} className="btn btn-sm" title="Сброс масштаба (1:1)">
          🔍 1:1
        </button>
        <span className="zoom-display">{(zoom * 100).toFixed(0)}%</span>

        <button onClick={saveCanvas} className="btn btn-primary btn-sm" title="Сохранить блок-схему в БД">
          💾 Сохранить
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={1400}
        height={700}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="canvas"
        style={{ cursor: isDragging ? 'grabbing' : connectMode ? 'crosshair' : 'grab' }}
      />

      <div className="canvas-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f5f5f5', borderTop: '1px solid #ddd' }}>
          <div>
            <strong>Блоков:</strong> {blocks.length} | <strong>Соединений:</strong> {connections.length} | <strong>Выбран:</strong> {selectedBlock?.label || 'Нет'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {connectMode ? '🔗 Режим соединения активен. Нажмите Escape для отмены' : '✌️ Нажмите Ctrl+3 чтобы включить режим соединения'}
          </div>
        </div>
      </div>
    </div>
  );
};
