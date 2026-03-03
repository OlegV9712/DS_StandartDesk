import React, { useRef, useEffect, useState } from 'react';
import { BlockSchema } from '../types';
import '../styles/canvas.css';

interface Block {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'process' | 'decision' | 'start' | 'end' | 'data' | 'message' | 'button_container' | 'integration';
  label: string;
  color: string;
  text?: string;
  buttons?: { id: string; label: string; nextBlockId?: string }[];
  integrationConfig?: {
    method: string;
    parameters: Record<string, any>;
    description?: string;
  };
}

interface Connection {
  id: string;
  fromBlockId: string;
  toBlockId: string;
  label?: string;  // Текст кнопки (если соединение от кнопки)
  fromButtonId?: string;  // ID кнопки если соединение от кнопки
}

interface CanvasEditorProps {
  projectId?: number;
  projectType?: number; // 0 = Algorithm, 1 = AssistantBot
  blockSchema?: BlockSchema | null;
  onSave?: (content: string) => Promise<void>;
}

const BLOCK_WIDTH = 120;
const BLOCK_HEIGHT = 80;

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ blockSchema, projectType = 0, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);  // Для выбора соединения
  const [selectedButtonId, setSelectedButtonId] = useState<string | null>(null);  // Для выбора кнопки в button_container
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
    connections.forEach((conn) => {
      let fromX, fromY;
      
      // Если соединение от кнопки, найти кнопку и рисовать от нее
      if (conn.fromButtonId) {
        const containerBlock = blocks.find(b => b.id === conn.fromBlockId);
        const button = containerBlock?.buttons?.find(b => b.id === conn.fromButtonId);
        if (containerBlock && button) {
          // Рисовать от позиции кнопки (примерно внизу button_container)
          fromX = containerBlock.x + containerBlock.width / 2;
          fromY = containerBlock.y + containerBlock.height - 10;
        }
      } else {
        // Обычное соединение от блока
        const fromBlock = blocks.find(b => b.id === conn.fromBlockId);
        if (fromBlock) {
          fromX = fromBlock.x + fromBlock.width / 2;
          fromY = fromBlock.y + fromBlock.height / 2;
        }
      }
      
      const toBlock = blocks.find(b => b.id === conn.toBlockId);
      
      if (fromX !== undefined && fromY !== undefined && toBlock) {
        const toX = toBlock.x + toBlock.width / 2;
        const toY = toBlock.y + toBlock.height / 2;

        // Draw curved line with bezier
        const isSelected = conn.id === selectedConnectionId;
        ctx.strokeStyle = isSelected ? '#FF6B9D' : (conn.fromButtonId ? '#667eea' : '#2C3E50');  // Highlight if selected
        ctx.lineWidth = (isSelected ? 3.5 : 2.5) / zoom;
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
        ctx.fillStyle = isSelected ? '#FF6B9D' : (conn.fromButtonId ? '#667eea' : '#2C3E50');
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        
        // Draw label (button name) on the line if it exists
        if (conn.label) {
          const midX = fromX + (dx / 2);
          const midY = fromY + (dy / 2);
          
          ctx.font = `bold ${12 / zoom}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw white background for label
          ctx.fillStyle = isSelected ? '#FFF0F5' : 'white';
          ctx.strokeStyle = isSelected ? '#FF6B9D' : '#ddd';
          ctx.lineWidth = 1 / zoom;
          const textWidth = ctx.measureText(conn.label).width;
          ctx.fillRect(midX - textWidth / 2 - 4, midY - 8 / zoom, textWidth + 8, 16 / zoom);
          ctx.strokeRect(midX - textWidth / 2 - 4, midY - 8 / zoom, textWidth + 8, 16 / zoom);
          
          // Draw label text
          ctx.fillStyle = conn.fromButtonId ? '#667eea' : '#2C3E50';
          ctx.fillText(conn.label, midX, midY);
        }
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
            } else if (targetBlock.type === 'message' || targetBlock.type === 'button_container' || targetBlock.type === 'integration') {
              ctx.beginPath();
              ctx.roundRect(targetBlock.x, targetBlock.y, targetBlock.width, targetBlock.height, 8);
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
      } else if (block.type === 'message') {
        // Message block - rounded rectangle
        ctx.beginPath();
        ctx.roundRect(block.x, block.y, block.width, block.height, 8);
      } else if (block.type === 'button_container' || block.type === 'integration') {
        // Container blocks - rounded rectangle
        ctx.beginPath();
        ctx.roundRect(block.x, block.y, block.width, block.height, 8);
      } else {
        // Regular process blocks
        ctx.fillRect(block.x, block.y, block.width, block.height);
        ctx.strokeRect(block.x, block.y, block.width, block.height);
      }

      ctx.fill();
      ctx.stroke();

      // Draw text
      ctx.fillStyle = '#000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // For message blocks, use text; for others use label
      const displayText = block.type === 'message' ? block.text : block.label;
      const textContent = displayText || (block.type === 'message' ? 'Ответ бота' : block.label);
      const words = textContent.split(' ');
      let y = block.y + block.height / 2 - (words.length - 1) * 7;
      words.forEach(word => {
        ctx.fillText(word, block.x + block.width / 2, y, block.width - 10);
        y += 14;
      });

      // For button_container, show button count
      if (block.type === 'button_container') {
        ctx.fillStyle = '#FF6B9D';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        const btnCount = block.buttons?.length || 0;
        ctx.fillText(`${btnCount} кнопок`, block.x + block.width - 5, block.y + block.height - 3);
      }
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
    // Обратный порядок чтобы клики попадали на верхние блоки первыми
    let closestBlock: string | null = null;
    let closestDistance = Infinity;
    const margin = 15 / zoom;  // Небольшой margin для удобства, но без конфликтов
    
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i];
      // Проверяем если точка в пределах блока или рядом
      if (x >= block.x - margin && x <= block.x + block.width + margin && 
          y >= block.y - margin && y <= block.y + block.height + margin) {
        // Вычисляем расстояние до центра блока
        const blockCenterX = block.x + block.width / 2;
        const blockCenterY = block.y + block.height / 2;
        const distance = Math.sqrt(
          Math.pow(x - blockCenterX, 2) + Math.pow(y - blockCenterY, 2)
        );
        
        // Выбираем БЛИЖАЙШИЙ блок, чтобы избежать конфликтов
        if (distance < closestDistance) {
          closestDistance = distance;
          closestBlock = block.id;
        }
      }
    }
    
    return closestBlock;
  };

  // Определить если кликнули на соединение (линию)
  const getConnectionAtPoint = (x: number, y: number): string | null => {
    const lineThickness = 15 / zoom;  // Зона клика на линию
    
    for (const conn of connections) {
      let fromX, fromY;
      
      if (conn.fromButtonId) {
        const containerBlock = blocks.find(b => b.id === conn.fromBlockId);
        if (containerBlock) {
          fromX = containerBlock.x + containerBlock.width / 2;
          fromY = containerBlock.y + containerBlock.height - 10;
        }
      } else {
        const fromBlock = blocks.find(b => b.id === conn.fromBlockId);
        if (fromBlock) {
          fromX = fromBlock.x + fromBlock.width / 2;
          fromY = fromBlock.y + fromBlock.height / 2;
        }
      }
      
      const toBlock = blocks.find(b => b.id === conn.toBlockId);
      
      if (fromX !== undefined && fromY !== undefined && toBlock) {
        const toX = toBlock.x + toBlock.width / 2;
        const toY = toBlock.y + toBlock.height / 2;
        
        // Проверить расстояние до квадратной кривой
        // Упрощенная проверка - проверяем область вокруг кривой
        const dx = toX - fromX;
        const dy = toY - fromY;
        
        for (let t = 0; t <= 1; t += 0.05) {
          const controlX = fromX + dx / 2;
          const controlY = fromY + (dy > 0 ? 100 : -100);
          
          const pointX = Math.pow(1 - t, 2) * fromX + 2 * (1 - t) * t * controlX + Math.pow(t, 2) * toX;
          const pointY = Math.pow(1 - t, 2) * fromY + 2 * (1 - t) * t * controlY + Math.pow(t, 2) * toY;
          
          const dist = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
          if (dist < lineThickness) {
            return conn.id;
          }
        }
      }
    }
    
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    
    // Right-click: delete selected connection
    if (e.button === 2) {
      const connectionId = getConnectionAtPoint(x, y);
      if (connectionId) {
        setConnections(connections.filter(c => c.id !== connectionId));
        setSelectedConnectionId(null);
        console.log('[CANVAS] Connection deleted:', connectionId);
      }
      e.preventDefault();
      return;
    }
    
    // Left-click
    const blockId = getBlockAtPoint(x, y);
    const connectionId = getConnectionAtPoint(x, y);

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
        const buttonLabel = selectedButtonId && selectedBlock?.type === 'button_container'
          ? selectedBlock.buttons?.find(b => b.id === selectedButtonId)?.label || ''
          : '';
        
        if (!connections.some(c => c.fromBlockId === connectFromId && c.toBlockId === targetBlockId)) {
          const newConnection: Connection = {
            id: `conn-${Date.now()}`,
            fromBlockId: connectFromId,
            toBlockId: targetBlockId,
            label: buttonLabel,  // Текст кнопки
            fromButtonId: selectedButtonId || undefined  // ID кнопки если соединение от кнопки
          };
          setConnections([...connections, newConnection]);
          console.log('[CANVAS] Connection created:', newConnection);
        }
      }
      setConnectMode(false);
      setConnectFromId(null);
      setSelectedButtonId(null);
    } else {
      // Select block or connection
      if (connectionId) {
        setSelectedConnectionId(connectionId);
        setSelectedBlockId(null);
      } else {
        setSelectedBlockId(blockId);
        setSelectedConnectionId(null);
      }
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
    const blockTypeDefaults: Record<Block['type'], { color: string; label: string; width: number; height: number }> = {
      process: { color: '#E8F4F8', label: `Блок ${blocks.length + 1}`, width: BLOCK_WIDTH, height: BLOCK_HEIGHT },
      decision: { color: '#FFF4E6', label: `Решение ${blocks.length + 1}`, width: BLOCK_WIDTH, height: BLOCK_HEIGHT },
      start: { color: '#E8F5E9', label: 'НАЧАЛО', width: BLOCK_WIDTH, height: BLOCK_HEIGHT },
      end: { color: '#FFEBEE', label: 'КОНЕЦ', width: BLOCK_WIDTH, height: BLOCK_HEIGHT },
      data: { color: '#F3E5F5', label: `Данные ${blocks.length + 1}`, width: BLOCK_WIDTH, height: BLOCK_HEIGHT },
      message: { color: '#E3F2FD', label: 'Введите ответ...', width: 150, height: 80 },
      button_container: { color: '#FFF9C4', label: 'Контейнер кнопок', width: 140, height: 100 },
      integration: { color: '#F0F4C3', label: 'Интеграция', width: 140, height: 80 },
    };

    const defaults = blockTypeDefaults[type];
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      x: 150,
      y: 150,
      width: defaults.width,
      height: defaults.height,
      type,
      label: defaults.label,
      color: defaults.color,
      ...(type === 'message' && { text: 'Здравствуйте! Чем я могу вам помочь?' }),
      ...(type === 'button_container' && { buttons: [] }),
      ...(type === 'integration' && { integrationConfig: { method: '', parameters: {}, description: '' } }),
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
        {/* Algorithm flowchart blocks */}
        {projectType === 0 && (
          <>
            <button onClick={() => addBlock('process')} className="btn btn-sm" title="Добавить процесс">
              ➕ Процесс
            </button>
            <button onClick={() => addBlock('decision')} className="btn btn-sm" title="Добавить решение">
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
          </>
        )}

        {/* Assistant bot scenario blocks */}
        {projectType === 1 && (
          <>
            <button onClick={() => addBlock('start')} className="btn btn-sm" title="Точка входа сценария - фраза при запуске">
              🚀 Начало
            </button>
            <button onClick={() => addBlock('message')} className="btn btn-sm" title="Ответ бота пользователю">
              💬 Ответ
            </button>
            <button onClick={() => addBlock('button_container')} className="btn btn-sm" title="Контейнер для кнопок ответов">
              🔘 Кнопки
            </button>
            <button onClick={() => addBlock('integration')} className="btn btn-sm" title="Интеграционный блок - для проверок и логики">
              ⚙️ Интеграция
            </button>
          </>
        )}

        <div style={{ borderLeft: '1px solid #ddd', margin: '0 10px', height: '30px' }}></div>

        {selectedBlockId && (
          <>
            {/* Для button_container блоков - выбор кнопки перед соединением */}
            {selectedBlock?.type === 'button_container' && connectMode && !selectedButtonId && (
              <div style={{ marginRight: '10px', marginLeft: '10px', padding: '8px', background: '#FFF9C4', borderRadius: '4px', maxWidth: '300px' }}>
                <strong style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>🔘 Выберите кнопку для соединения:</strong>
                {(selectedBlock.buttons || []).map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => {
                      setSelectedButtonId(btn.id);
                      setConnectFromId(selectedBlockId);  // ИСПРАВКА: connectFromId - это ID блока, не кнопки!
                    }}
                    className="btn btn-sm"
                    style={{ 
                      background: '#667eea', 
                      color: 'white', 
                      padding: '4px 8px', 
                      marginRight: '5px',
                      marginBottom: '5px',
                      fontSize: '11px'
                    }}
                    title={`Рисовать соединение от кнопки: ${btn.label}`}
                  >
                    → {btn.label}
                  </button>
                ))}
              </div>
            )}
            
            {/* Если выбрана кнопка - показать статус */}
            {selectedButtonId && connectMode && (
              <span style={{ marginLeft: '10px', color: '#00AA00', fontWeight: 'bold', fontSize: '12px' }}>
                ✓ Кнопка "{selectedBlock?.buttons?.find(b => b.id === selectedButtonId)?.label}" активна. Выберите блок...
              </span>
            )}
            
            <button
              onClick={() => {
                if (selectedBlock?.type === 'button_container' && !selectedButtonId) {
                  // Для button_container - нужно сначала выбрать кнопку
                  setConnectMode(!connectMode);
                } else if (connectMode && connectFromId === selectedBlockId) {
                  setConnectMode(false);
                  setConnectFromId(null);
                  setSelectedButtonId(null);
                } else {
                  setConnectMode(true);
                  setConnectFromId(selectedBlockId);
                  setSelectedButtonId(null);
                }
              }}
              className={`btn btn-sm ${connectMode && (connectFromId === selectedBlockId || selectedButtonId) ? 'btn-active' : ''}`}
              title={selectedBlock?.type === 'button_container' ? "Режим соединения - выберите кнопку" : "Режим соединения - проложить путь сценария"}
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
            {selectedBlock.type === 'message' && (
              <textarea
                value={selectedBlock.text || ''}
                onChange={e => updateSelectedBlock({ text: e.target.value })}
                placeholder="Текст ответа бота"
                className="form-input"
                style={{ width: '200px', height: '60px', marginRight: '10px', padding: '5px' }}
                title="Редактировать ответ бота"
              />
            )}
            {selectedBlock.type === 'button_container' && (
              <div style={{ marginRight: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>🔘 Кнопки: {selectedBlock.buttons?.length || 0}</span>
                <button
                  onClick={() => {
                    const newButton = {
                      id: `btn-${Date.now()}`,
                      label: `Кнопка ${(selectedBlock.buttons?.length || 0) + 1}`
                    };
                    updateSelectedBlock({
                      buttons: [...(selectedBlock.buttons || []), newButton]
                    });
                  }}
                  className="btn btn-sm"
                  style={{ background: '#4CAF50', color: 'white', padding: '4px 8px' }}
                  title="Добавить новую кнопку"
                >
                  ➕ Добавить
                </button>
              </div>
            )}
            {selectedBlock.type !== 'message' && selectedBlock.type !== 'button_container' && (
              <input
                type="text"
                value={selectedBlock.label}
                onChange={e => updateSelectedBlock({ label: e.target.value })}
                placeholder="Текст блока"
                className="form-input"
                style={{ width: '150px' }}
                title="Редактировать текст блока"
              />
            )}
            <input
              type="color"
              value={selectedBlock.color}
              onChange={e => {
                updateSelectedBlock({ color: e.target.value });
                console.log('[CANVAS] Color changed for block', selectedBlockId, 'to', e.target.value);
              }}
              className="color-picker"
              title="Выбрать цвет блока"
            />
            
            {/* Размер блока */}
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginRight: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Размер:</label>
              <input
                type="number"
                min="60"
                max="400"
                value={selectedBlock.width}
                onChange={e => updateSelectedBlock({ width: parseInt(e.target.value) || BLOCK_WIDTH })}
                placeholder="Ширина"
                style={{ width: '60px', padding: '4px', fontSize: '12px' }}
                title="Ширина блока"
              />
              <span style={{ fontSize: '12px' }}>×</span>
              <input
                type="number"
                min="40"
                max="300"
                value={selectedBlock.height}
                onChange={e => updateSelectedBlock({ height: parseInt(e.target.value) || BLOCK_HEIGHT })}
                placeholder="Высота"
                style={{ width: '60px', padding: '4px', fontSize: '12px' }}
                title="Высота блока"
              />
            </div>
            
            <button onClick={deleteSelectedBlock} className="btn btn-sm" style={{ background: '#FFB6C1' }} title="Удалить блок">
              🗑️ Удалить
            </button>
          </>
        )}

        {selectedBlock?.type === 'button_container' && selectedBlock.buttons && selectedBlock.buttons.length > 0 && (
          <div style={{ marginLeft: '10px', marginRight: '10px', padding: '8px', background: '#FFF9C4', borderRadius: '4px', maxWidth: '400px' }}>
            <strong style={{ fontSize: '12px' }}>📋 Кнопки контейнера:</strong>
            {selectedBlock.buttons.map((btn, idx) => (
              <div key={btn.id} style={{ display: 'flex', gap: '5px', marginTop: '5px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={btn.label}
                  onChange={e => {
                    const updated = [...selectedBlock.buttons!];
                    updated[idx].label = e.target.value;
                    updateSelectedBlock({ buttons: updated });
                  }}
                  placeholder="Текст кнопки"
                  style={{ flex: 1, padding: '4px 6px', fontSize: '12px', border: '1px solid #ddd', borderRadius: '3px' }}
                />
                <button
                  onClick={() => {
                    const updated = selectedBlock.buttons!.filter((_, i) => i !== idx);
                    updateSelectedBlock({ buttons: updated });
                  }}
                  className="btn btn-sm"
                  style={{ background: '#FF6B6B', color: 'white', padding: '3px 6px', fontSize: '11px' }}
                  title="Удалить кнопку"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderLeft: '1px solid #ddd', margin: '0 10px', height: '30px', marginLeft: 'auto' }}></div>

        <button onClick={() => setZoom(1)} className="btn btn-sm" title="Сброс масштаба">
          🔍 1:1
        </button>
        <span className="zoom-display">{(zoom * 100).toFixed(0)}%</span>

        <button onClick={saveCanvas} className="btn btn-primary btn-sm" title="Сохранить сценарий/блок-схему">
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
        onContextMenu={(e) => e.preventDefault()}  // Отключить контекстное меню браузера
        className="canvas"
        style={{ cursor: isDragging ? 'grabbing' : connectMode ? 'crosshair' : 'grab' }}
      />

      <div className="canvas-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f5f5f5', borderTop: '1px solid #ddd' }}>
          <div>
            <strong>Блоков:</strong> {blocks.length} | <strong>Соединений:</strong> {connections.length} | <strong>Выбран:</strong> {selectedConnectionId ? '🔗 Соединение' : (selectedBlock?.label || 'Нет')}
          </div>
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
            {selectedConnectionId && (
              <button 
                onClick={() => {
                  setConnections(connections.filter(c => c.id !== selectedConnectionId));
                  setSelectedConnectionId(null);
                }}
                style={{ marginRight: '10px', padding: '4px 8px', background: '#FF6B6B', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '12px' }}
                title="Удалить соединение (или щелк правой кнопкой)"
              >
                🗑️ Удалить соединение
              </button>
            )}
            {connectMode ? '🔗 Режим соединения активен. Нажмите Escape для отмены' : '✌️ Правый клик на линии чтобы удалить'}
          </div>
        </div>
      </div>
    </div>
  );
};
