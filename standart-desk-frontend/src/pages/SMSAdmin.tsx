import React from 'react';
import { motion } from 'framer-motion';
import '../styles/components.css';

export const SMSAdminPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-column flex-center min-h-screen gap-lg p-lg"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
    >
      <div className="text-center" style={{ maxWidth: '700px', color: 'white' }}>
        <div
          style={{
            fontSize: '120px',
            marginBottom: 'var(--spacing-lg)',
            animation: 'pulse-dev 2s ease-in-out infinite',
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
          }}
        >
          👨‍💻
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
          Разработчик на задаче!
        </h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.95, lineHeight: '1.6' }}>
          SMS автоматизация в процессе разработки. <br />
          <strong>Наш верный инженер</strong> сейчас усиленно работает над этой функцией. ☕
        </p>
        
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '2rem',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <p style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            💡 <strong>В разработке:</strong> Автоматическая отправка SMS уведомлений
          </p>
          <p style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            🔧 <strong>Что делает:</strong> Конфигурирование шаблонов и правил доставки
          </p>
          <p style={{ fontSize: '1rem' }}>
            ⏳ <strong>Статус:</strong> Почти готово! Следите за обновлениями 📱
          </p>
        </div>

        <p style={{ fontSize: '0.95rem', opacity: 0.85, fontStyle: 'italic', marginBottom: '2rem' }}>
          "If it's not broken, it's not in development yet" — Наш девелопер
        </p>

        <div className="flex gap-md flex-center" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            На главную
          </button>
          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Назад
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dev {
          0%, 100% { 
            transform: scale(1) translateY(0px);
            opacity: 1;
          }
          50% { 
            transform: scale(1.1) translateY(-10px);
            opacity: 0.8;
          }
        }
        @media (max-width: 768px) {
          h1 {
            font-size: 1.8rem !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default SMSAdminPage;