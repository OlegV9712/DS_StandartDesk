import { motion } from 'framer-motion';
import '../../styles/components.css';

export const NotFound = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-column flex-center min-h-screen gap-lg p-lg"
      style={{ background: 'linear-gradient(135deg, #ECF0F1 0%, #FFE5F0 100%)' }}
    >
      <div className="text-center">
        <div
          style={{
            fontSize: '120px',
            marginBottom: 'var(--spacing-lg)',
            animation: 'float 3s ease-in-out infinite'
          }}
        >
          ☕
        </div>
        <h1>Ой! Эта страница сбежала на кофе-брейк</h1>
        <p style={{ maxWidth: '500px', margin: '0 auto var(--spacing-lg)', color: 'var(--color-text-light)' }}>
          Возможно, она переехала или архивировалась. <br />
          Давайте попробуем найти её по новому адресу или вернёмся в главное меню.
        </p>
        <div className="flex gap-md flex-center">
          <button
            onClick={() => (window.location.href = '/')}
            className="btn btn-primary"
          >
            На главную
          </button>
          <button
            onClick={() => window.history.back()}
            className="btn btn-secondary"
          >
            Вернуться назад
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
    </motion.div>
  );
};

export default NotFound;
