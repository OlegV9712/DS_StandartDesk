import React from 'react';
import { motion } from 'framer-motion';
import '../styles/maintenance.css';

interface MaintenancePageProps {
  contentOnly?: boolean; // If true, show content only (inside Layout); if false, full-screen
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ contentOnly = false }) => {
  const coffeeVariants = {
    floating: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.8,
      },
    }),
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const containerClassName = contentOnly ? "maintenance-content-only" : "maintenance-container";

  return (
    <div className={containerClassName}>
      <motion.div
        className="maintenance-content"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Animated Emoji */}
        <motion.div className="maintenance-emoji" variants={coffeeVariants}>
          ☕
        </motion.div>

        <motion.h1 className="maintenance-title" variants={textVariants} custom={0}>
          Ухххх ты, наш разработчик
        </motion.h1>

        <motion.p className="maintenance-subtitle" variants={textVariants} custom={1}>
          что-то совсем разошелся и скоро обновит тут все 🚀
        </motion.p>

        <motion.div className="maintenance-message" variants={textVariants} custom={2}>
          <p>Поэтому ничего не работает, но вы подождите немного!</p>
          <p className="highlight">Выпейте кофейку или чая 🍵</p>
          <p>Отдохните и вернитесь позднее 😊</p>
        </motion.div>

        {/* Animated dots */}
        <div className="loading-dots">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          >
            .
          </motion.span>
        </div>

        {/* Animated background elements */}
        <div className="maintenance-decorations">
          <motion.div
            className="decoration decoration-1"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            🔧
          </motion.div>
          <motion.div
            className="decoration decoration-2"
            animate={{ x: [0, 20, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            🛠️
          </motion.div>
          <motion.div
            className="decoration decoration-3"
            animate={{ y: [0, 30, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            ⚙️
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenancePage;
