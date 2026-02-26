import React from 'react';
import { motion } from 'framer-motion';
import '../../styles/components.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
                animation: 'bounce 2s infinite'
              }}
            >
              🔌
            </div>
            <h1>Ой! StandartDesk споткнулся о провод</h1>
            <p style={{ maxWidth: '500px', margin: '0 auto var(--spacing-lg)', color: 'var(--color-text-light)' }}>
              Мы уже звоним системному администратору. <br />
              Попробуйте обновить страницу или вернитесь в главное меню.
            </p>
            <div className="flex gap-md flex-center">
              <button
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Обновить страницу
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="btn btn-secondary"
              >
                На главную
              </button>
            </div>
          </div>

          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
            }
          `}</style>
        </motion.div>
      );
    }

    return this.props.children;
  }
}
