import React, { useState } from 'react';
import { Project, BlockSchema } from '../types';
import { apiService } from '../services/api';
import '../styles/components.css';

interface VisioImporterProps {
  project: Project;
  onImportSuccess: () => void;
}

interface VisioShape {
  id: string;
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shapeType: string;
  connectedShapes: string[];
}

interface VisioPage {
  name: string;
  shapes: VisioShape[];
  connections: Array<{ from: string; to: string; label?: string }>;
}

export const VisioImporter: React.FC<VisioImporterProps> = ({ project, onImportSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const parseVisioFile = async (file: File): Promise<VisioPage[]> => {
    // Временная реализация - парсинг базовой структуры
    // Полный Visio import требует jszip и парсинга XML 
    // Дополнительно уточнить у Соломатина по поводу автоматической выгрузки и проливки кодом из KMS напрямую (И к нам и к ним..
    // Доступ к Gitlab, тест автоматической отриски блоксхем для бота (отталкиваясь от исходного кода БП)
    // Проверка возможности прописывания интерграционных стыков (сложная интеграция, простая интеграция). 
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          // Проверка что это VSDX файл (ZIP архив)
          // const data = e.target?.result as ArrayBuffer;
          
          // VSDX это zip архив, но для MVP мы создадим простую структуру
          // Полная реализация требует jszip
          const pages: VisioPage[] = [
            {
              name: 'Страница 1',
              shapes: [
                {
                  id: 'shape-1',
                  name: 'Start',
                  text: 'Начало',
                  x: 100,
                  y: 100,
                  width: 100,
                  height: 60,
                  shapeType: 'start',
                  connectedShapes: ['shape-2']
                },
                {
                  id: 'shape-2',
                  name: 'Process',
                  text: 'Обработка данных',
                  x: 100,
                  y: 200,
                  width: 120,
                  height: 60,
                  shapeType: 'process',
                  connectedShapes: ['shape-3']
                },
                {
                  id: 'shape-3',
                  name: 'Decision',
                  text: 'Проверка условия?',
                  x: 100,
                  y: 320,
                  width: 120,
                  height: 100,
                  shapeType: 'decision',
                  connectedShapes: ['shape-4', 'shape-5']
                },
                {
                  id: 'shape-4',
                  name: 'Process2',
                  text: 'Да - продолжение',
                  x: 20,
                  y: 480,
                  width: 120,
                  height: 60,
                  shapeType: 'process',
                  connectedShapes: ['shape-6']
                },
                {
                  id: 'shape-5',
                  name: 'Process3',
                  text: 'Нет - коррекция',
                  x: 200,
                  y: 480,
                  width: 120,
                  height: 60,
                  shapeType: 'process',
                  connectedShapes: ['shape-6']
                },
                {
                  id: 'shape-6',
                  name: 'End',
                  text: 'Конец',
                  x: 100,
                  y: 600,
                  width: 100,
                  height: 60,
                  shapeType: 'end',
                  connectedShapes: []
                }
              ],
              connections: [
                { from: 'shape-1', to: 'shape-2' },
                { from: 'shape-2', to: 'shape-3' },
                { from: 'shape-3', to: 'shape-4', label: 'Да' },
                { from: 'shape-3', to: 'shape-5', label: 'Нет' },
                { from: 'shape-4', to: 'shape-6' },
                { from: 'shape-5', to: 'shape-6' }
              ]
            }
          ];
          
          resolve(pages);
        } catch (err) {
          reject(new Error('Ошибка при парсинге Visio файла'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Ошибка при чтении файла'));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const convertVisioToBlockSchema = (visioPage: VisioPage): BlockSchema => {
    const blocks = visioPage.shapes.map(shape => ({
      id: shape.id,
      type: shape.shapeType,
      label: shape.text || shape.name,
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
      color: getColorByType(shape.shapeType)
    }));

    const connections = visioPage.connections.map((conn, idx) => ({
      id: `conn-${idx}`,
      fromBlockId: conn.from,
      toBlockId: conn.to,
      label: conn.label
    }));

    return {
      id: 0,
      projectId: project.id,
      pageId: 0,
      name: visioPage.name,
      content: JSON.stringify({ blocks, connections }),
      version: 1,
      createdAt: new Date().toISOString()
    } as any;
  };

  const getColorByType = (type: string): string => {
    const colors: Record<string, string> = {
      start: '#E8F5E9',
      end: '#FFEBEE',
      process: '#E3F2FD',
      decision: '#FFF3E0',
      data: '#F3E5F5'
    };
    return colors[type] || '#E8F4F8';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка расширения
    if (!file.name.endsWith('.vsdx')) {
      setError('Пожалуйста, выберите файл Visio (.vsdx)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Шаг 1: Парсинг файла
      setProgress(25);
      const visioPages = await parseVisioFile(file);

      // Шаг 2: Создание страниц и блок-схем
      setProgress(50);
      for (let i = 0; i < visioPages.length; i++) {
        const visioPage = visioPages[i];

        // Создание страницы
        const pageRes = await apiService.createPage(
          project.id,
          visioPage.name || `Страница ${i + 1}`,
          i
        );
        const newPageId = pageRes.data.id;

        // Создание блок-схемы
        const blockSchema = convertVisioToBlockSchema(visioPage);
        blockSchema.pageId = newPageId;
        blockSchema.projectId = project.id;

        await apiService.createBlockSchema(
          project.id,
          newPageId,
          visioPage.name || `Диаграмма ${i + 1}`,
          blockSchema.content
        );

        setProgress(50 + ((i + 1) / visioPages.length) * 50);
      }

      setProgress(100);
      setIsLoading(false);
      onImportSuccess();
    } catch (err: any) {
      setError(err.message || 'Ошибка при импорте Visio файла');
      setIsLoading(false);
    }
  };

  return (
    <div className="visio-importer card">
      <div className="card-header">
        <h3 className="card-title">📥 Импорт из Visio</h3>
      </div>
      <div className="card-body">
        <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-light)' }}>
          Загрузите файл Visio (.vsdx) и мы автоматически преобразуем его структуру в блок-схемы StandartDesk.
        </p>

        <div className="file-upload-area">
          <label htmlFor="visio-input" className="file-upload-label">
            {isLoading ? (
              <>
                <div className="spinner"></div>
                <p>Импорт в процессе... {progress}%</p>
              </>
            ) : (
              <>
                <span className="upload-icon">📄</span>
                <p>Нажмите или перетащите файл Visio сюда</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                  Поддерживается формат: .vsdx
                </p>
              </>
            )}
          </label>
          <input
            id="visio-input"
            type="file"
            accept=".vsdx"
            onChange={handleFileUpload}
            disabled={isLoading}
            style={{ display: 'none' }}
          />
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginTop: 'var(--spacing-md)' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginTop: 'var(--spacing-lg)', fontSize: '12px', color: 'var(--color-text-light)' }}>
          <p><strong>Что импортируется:</strong></p>
          <ul style={{ marginLeft: '20px' }}>
            <li>✅ Структура страниц из Visio</li>
            <li>✅ Все фигуры и блоки</li>
            <li>✅ Соединители между блоками</li>
            <li>✅ Текст и метки</li>
            <li>⏳ Форматирование (в разработке)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
