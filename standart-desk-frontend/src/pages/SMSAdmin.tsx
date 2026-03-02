import React, { useState } from 'react';
import { motion } from 'framer-motion';
import '../styles/sms-admin.css';

interface ExcelRow {
  [key: string]: string;
}

interface ProcessedResult {
  BRANCH_ID: string;
  BRANCH_NAME: string;
  MarketingName: string;
  Price: string;
  GB: string;
  SMS: string;
  SMS_Template: string;
  IsValid: boolean;
  Error?: string;
}

const TEMPLATE = `{tariff_name} АП {ap}₽/мес.
Включено:
📞 ∞ внутри сети, {minuts} мин. на {direction} (сверх пакета 3₽)
🌐 {gb}ГБ + безлимит на VK, OK, WhatsApp, Viber, Telegram, ТамТам
{SMS_count} SMS по РФ
Сверхпакета:
📞 на гор. номера и по РФ 3₽
📨 по РФ 3₽
При неоплате:
📞 по дом. региону и внутри сети 3₽, на другие номера по РФ 9₽
📨 по РФ 3₽
🌐 100 МБ за 10 ₽
Переход на тариф: {combination} (Переход бесплатный)
Узнать параметры тарифа, остатки, дату списания в ЛК https://t2.ru/lk 🚀`;

const MAX_SMS_LENGTH = 700;

const SMSAdminPage: React.FC = () => {
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse CSV/Excel data from uploaded file
  const parseExcelFile = (text: string): ExcelRow[] => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) return [];

      const parseCSVLine = (line: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const rows: ExcelRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: ExcelRow = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        rows.push(row);
      }

      return rows;
    } catch (error) {
      console.error('Parse error:', error);
      throw new Error('Ошибка при парсинге файла');
    }
  };

  // Process Excel data and generate SMS templates
  const processExcelData = (rows: ExcelRow[]): ProcessedResult[] => {
    return rows.map((row, idx) => {
      try {
        // Extract data from row - with flexible column name matching
        const findValue = (keywords: string[]): string => {
          for (const col of Object.keys(row)) {
            const colLower = col.toLowerCase();
            if (keywords.some(k => colLower.includes(k.toLowerCase()))) {
              return String(row[col] || '');
            }
          }
          return '';
        };

        const branchId = findValue(['branch_id', 'id']) || `Region_${idx + 1}`;
        const branchName = findValue(['branch_name', 'название']) || 'Unknown';
        const marketingName = findValue(['маркетинговое', 'tariff_name', 'название']) || '';
        const price = findValue(['ap', 'цена', 'рублей']) || '0';
        const gb = findValue(['гб', 'gb', 'данные']) || '0';
        const smsCount = findValue(['sms', 'смс']) || '0';
        const minutes = findValue(['минуты', 'minutes', 'minuts']) || '0';
        const direction = findValue(['направление', 'direction']) || 'РФ';
        const combination = findValue(['комбинация', 'combination']) || 'Standard';

        // Generate SMS template by replacing placeholders
        let smsTemplate = TEMPLATE
          .replace(/{tariff_name}/g, marketingName)
          .replace(/{ap}/g, price)
          .replace(/{gb}/g, gb)
          .replace(/{SMS_count}/g, smsCount)
          .replace(/{minuts}/g, minutes)
          .replace(/{direction}/g, direction)
          .replace(/{combination}/g, combination);

        // Check length
        const isValid = smsTemplate.length <= MAX_SMS_LENGTH;
        const error = !isValid ? `Шаблон слишком длинный: ${smsTemplate.length}/${MAX_SMS_LENGTH} символов` : undefined;

        return {
          BRANCH_ID: branchId,
          BRANCH_NAME: branchName,
          MarketingName: marketingName,
          Price: price,
          GB: gb,
          SMS: smsCount,
          SMS_Template: smsTemplate,
          IsValid: isValid,
          Error: error
        };
      } catch (error) {
        return {
          BRANCH_ID: `Row_${idx + 1}`,
          BRANCH_NAME: 'Error',
          MarketingName: '',
          Price: '',
          GB: '',
          SMS: '',
          SMS_Template: '',
          IsValid: false,
          Error: String(error)
        };
      }
    });
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessing(true);

    try {
      const text = await file.text();
      const rows = parseExcelFile(text);

      if (rows.length === 0) {
        setErrorMessage('❌ Файл не содержит данных');
        setIsProcessing(false);
        return;
      }

      const processed = processExcelData(rows);
      setResults(processed);

      const validCount = processed.filter(r => r.IsValid).length;
      const invalidCount = processed.length - validCount;

      if (invalidCount > 0) {
        setErrorMessage(`⚠️ Обработано ${processed.length} регионов. ${invalidCount} из них имеют ошибки!`);
      } else {
        setSuccessMessage(`✅ Успешно обработано ${processed.length} регионов с SMS шаблонами`);
      }
    } catch (error) {
      setErrorMessage(`❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResults([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export results to CSV
  const exportResults = () => {
    if (results.length === 0) {
      setErrorMessage('Нет данных для экспорта');
      return;
    }

    try {
      const validResults = results.filter(r => r.IsValid);

      if (validResults.length === 0) {
        setErrorMessage('❌ Нет валидных шаблонов для экспорта');
        return;
      }

      // Create CSV with proper escaping
      let csv = 'BRANCH_ID,BRANCH_NAME,Маркетинговое название,TOBE АП (руб.),TOBE ГБ,SMS_шаблон\n';

      validResults.forEach(result => {
        const template = result.SMS_Template.replace(/"/g, '""').replace(/\n/g, ' ');
        csv += `"${result.BRANCH_ID}","${result.BRANCH_NAME}","${result.MarketingName}","${result.Price}","${result.GB}","${template}"\n`;
      });

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sms-templates-${new Date().getTime()}.csv`);
      link.click();
      URL.revokeObjectURL(url);

      setSuccessMessage(`✅ Экспортировано ${validResults.length} шаблонов`);
    } catch (error) {
      setErrorMessage(`❌ Ошибка при экспорте: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sms-admin-container"
    >
      <div className="sms-admin-header">
        <div>
          <h1>📱 SMS Шаблоны по регионам</h1>
          <p>Загрузите файл с данными по тарифам и автоматически генерируйте SMS шаблоны</p>
        </div>
        <button className="btn-help" onClick={() => setShowHelpModal(true)}>
          ❓ Справка
        </button>
      </div>

      {errorMessage && (
        <motion.div className="message error-message" initial={{ y: -20 }} animate={{ y: 0 }}>
          {errorMessage}
        </motion.div>
      )}
      {successMessage && (
        <motion.div className="message success-message" initial={{ y: -20 }} animate={{ y: 0 }}>
          {successMessage}
        </motion.div>
      )}

      {results.length === 0 ? (
        <div className="sms-section">
          <div className="section-header">
            <h2>📥 Загрузить файл с данными</h2>
          </div>

          <div className="file-upload-area">
            <input
              type="file"
              id="excel-upload"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              disabled={isProcessing}
              style={{ display: 'none' }}
            />
            <label htmlFor="excel-upload" className="file-upload-label">
              <div className="upload-content">
                <div className="upload-icon">📁</div>
                <p>Перетащите CSV файл сюда или нажмите</p>
                <small>Файл должен содержать колонки: BRANCH_ID, BRANCH_NAME, и параметры тарифа</small>
              </div>
            </label>
          </div>
        </div>
      ) : (
        <motion.div
          className="sms-section results-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="section-header">
            <h2>📊 Результаты обработки</h2>
            <span className="result-count">
              {results.filter(r => r.IsValid).length} / {results.length}
            </span>
          </div>

          <div className="results-grid">
            {results.map((result, idx) => (
              <motion.div
                key={idx}
                className={`result-card ${result.IsValid ? 'valid' : 'invalid'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="result-header">
                  <span className="result-status">
                    {result.IsValid ? '✅' : '❌'}
                  </span>
                  <h3>{result.BRANCH_NAME}</h3>
                  <span className="result-id">{result.BRANCH_ID}</span>
                </div>

                {result.IsValid ? (
                  <>
                    <div className="result-info">
                      <p><strong>Тариф:</strong> {result.MarketingName}</p>
                      <p><strong>Цена:</strong> {result.Price}₽</p>
                      <p><strong>ГБ:</strong> {result.GB}</p>
                      <p><strong>SMS:</strong> {result.SMS}</p>
                      <p><strong>Длина SMS:</strong> {result.SMS_Template.length}/{MAX_SMS_LENGTH} символов</p>
                    </div>
                    <div className="result-template">
                      <p className="template-preview">{result.SMS_Template}</p>
                    </div>
                  </>
                ) : (
                  <div className="result-error">
                    <p>⚠️ {result.Error}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="results-actions">
            <button className="btn-primary" onClick={exportResults}>
              📥 Экспортировать валидные шаблоны ({results.filter(r => r.IsValid).length} {results.filter(r => r.IsValid).length === 1 ? 'шаблон' : 'шаблонов'})
            </button>
            <button className="btn-secondary" onClick={() => {
              setResults([]);
              setErrorMessage('');
              setSuccessMessage('');
            }}>
              Загрузить другой файл
            </button>
          </div>
        </motion.div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <motion.div
          className="help-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowHelpModal(false)}
        >
          <motion.div
            className="help-modal"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>❓ Справка</h2>
              <button className="close-btn" onClick={() => setShowHelpModal(false)}>✕</button>
            </div>

            <div className="modal-content">
              <div className="help-section">
                <h3>📖 Как использовать?</h3>
                <ol>
                  <li>Подготовьте CSV файл с данными по тарифам</li>
                  <li>Убедитесь что файл содержит необходимые колонки (см. ниже)</li>
                  <li>Загрузите файл на эту страницу</li>
                  <li>Система автоматически сгенерирует SMS шаблоны</li>
                  <li>Экспортируйте результаты как CSV</li>
                </ol>
              </div>

              <div className="help-section">
                <h3>📋 Обязательные колонки в файле:</h3>
                <ul>
                  <li><strong>BRANCH_ID</strong> - ID региона (уникальный идентификатор)</li>
                  <li><strong>BRANCH_NAME</strong> - Название региона</li>
                  <li><strong>Маркетинговое название</strong> - Имя тарифа для SMS</li>
                  <li><strong>TOBE АП, руб.</strong> - Цена в рублях</li>
                  <li><strong>TOBE ГБ</strong> - Пакет ГБ</li>
                  <li><strong>Минуты</strong> - Пакет минут</li>
                  <li><strong>SMS</strong> - Количество SMS</li>
                  <li><strong>Направление</strong> - Направление звонков</li>
                  <li><strong>Комбинация</strong> - Комбинация для подключения</li>
                </ul>
              </div>

              <div className="help-section">
                <h3>⚠️ Ограничения:</h3>
                <ul>
                  <li>Длина SMS не должна превышать {MAX_SMS_LENGTH} символов</li>
                  <li>Переводы строк в шаблоне очень важны и должны сохраняться</li>
                  <li>При экспорте экспортируются только валидные (без ошибок) шаблоны</li>
                </ul>
              </div>

              <div className="help-section">
                <h3>🔄 Шаблон по умолчанию:</h3>
                <pre className="template-example">{TEMPLATE}</pre>
              </div>

              <div className="help-section">
                <h3>📥 Скачать шаблон файла</h3>
                <p>Нажмите кнопку ниже чтобы скачать заготовку CSV файла с нужными колонками:</p>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    const csvContent = 'BRANCH_ID,BRANCH_NAME,Маркетинговое название,TOBE АП (руб.),TOBE ГБ,Минуты,SMS,Направление,Комбинация\n' +
                      'Moscow,Московская область,Тариф М,299,15,1000,200,РФ,Premium\n' +
                      'SPB,Санкт-Петербург,Тариф П,249,10,800,150,РФ,Standard\n' +
                      'Ekb,Свердловская область,Тариф У,199,5,500,100,РФ,Basic\n';
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    const url = URL.createObjectURL(blob);
                    link.setAttribute('href', url);
                    link.setAttribute('download', 'sms-template-example.csv');
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{ marginTop: '1rem' }}
                >
                  📥 Скачать шаблон CSV
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SMSAdminPage;