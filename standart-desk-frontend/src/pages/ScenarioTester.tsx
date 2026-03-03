import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../store/authStore';
import { apiService } from '../services/api';
import { chatbotApi } from '../services/chatbotApi';
import '../styles/scenario-tester.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  buttons?: Array<{
    id: string;
    title: string;
    payload: string;
  }>;
  createdAt: Date;
}

interface BotProject {
  id: number;
  name: string;
  type: number;
}

export const ScenarioTester: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [projects, setProjects] = useState<BotProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isSessionEnded, setIsSessionEnded] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getProjects(user?.id);
      const assistantProjects = response.data.filter((p: any) => p.type === 1) as BotProject[];
      setProjects(assistantProjects);
      // Don't auto-load, show project selection instead
      setMessages([]);
      setSelectedProject(null);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeBot = async (projectId: number) => {
    try {
      setSelectedProject(projectId);
      setIsSessionEnded(false);
      setMessages([]);
      setSessionId(null);
      setError('');

      // Start new session via API
      const sessionStart = await chatbotApi.startSession(projectId);
      
      setSessionId(sessionStart.sessionId);

      // Display initial message from server
      const initialMessage: Message = {
        id: Math.random().toString(),
        text: sessionStart.initialMessage.text,
        sender: 'bot',
        buttons: sessionStart.initialMessage.buttons
          ? sessionStart.initialMessage.buttons.map((btn) => ({
              id: btn.id,
              title: btn.title,
              payload: btn.payload,
            }))
          : undefined,
        createdAt: new Date()
      };

      setMessages([initialMessage]);
    } catch (err) {
      console.error('Error initializing bot:', err);
      setError('Failed to start bot session. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing || !sessionId || isSessionEnded) return;

    const userInput = input;
    const userMessage: Message = {
      id: Math.random().toString(),
      text: userInput,
      sender: 'user',
      createdAt: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Send message to server
      const botResponse = await chatbotApi.sendMessage(sessionId, {
        message: userInput
      });

      if (botResponse.isEnded) {
        setIsSessionEnded(true);
      }

      // Display bot response
      const message: Message = {
        id: Math.random().toString(),
        text: botResponse.text,
        sender: 'bot',
        buttons: botResponse.buttons
          ? botResponse.buttons.map((btn) => ({
              id: btn.id,
              title: btn.title,
              payload: btn.payload,
            }))
          : undefined,
        createdAt: new Date()
      };

      setMessages((prev) => [...prev, message]);
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage: Message = {
        id: Math.random().toString(),
        text: '❌ Error processing message. Please try again.',
        sender: 'bot',
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = async (button: { id: string; title: string; payload: string }) => {
    if (!sessionId || isProcessing || isSessionEnded) return;

    setIsProcessing(true);

    // Сохраняем ВСЕ сообщения, но удаляем кнопки только из последнего сообщения бота
    const userMessage: Message = {
      id: Math.random().toString(),
      text: button.title,
      sender: 'user',
      createdAt: new Date()
    };

    // Обновляем состояние в одном вызове: удаляем кнопки и добавляем пользовательское сообщение
    setMessages((prev) => {
      // Удаляем кнопки из последнего сообщения бота
      const messagesWithoutButtons = prev.map((msg, idx) => {
        if (idx === prev.length - 1 && msg.sender === 'bot') {
          const msgCopy = { ...msg };
          msgCopy.buttons = undefined;
          return msgCopy;
        }
        return msg;
      });
      // Добавляем пользовательское сообщение
      return [...messagesWithoutButtons, userMessage];
    });

    try {
      // Отправляем на сервер
      const botResponse = await chatbotApi.sendMessage(sessionId, {
        selectedButtonId: button.id
      });

      if (botResponse.isEnded) {
        setIsSessionEnded(true);
      }

      // Добавляем ответ бота
      const message: Message = {
        id: Math.random().toString(),
        text: botResponse.text,
        sender: 'bot',
        buttons: botResponse.buttons
          ? botResponse.buttons.map((btn) => ({
              id: btn.id,
              title: btn.title,
              payload: btn.payload,
            }))
          : undefined,
        createdAt: new Date()
      };

      setMessages((prev) => [...prev, message]);
    } catch (err) {
      console.error('Error handling button click:', err);
      const errorMessage: Message = {
        id: Math.random().toString(),
        text: '❌ Ошибка обработки кнопки. Попробуйте ещё раз.',
        sender: 'bot',
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearHistory = async () => {
    if (!sessionId) return;
    
    try {
      await chatbotApi.clearHistory(sessionId);
      setMessages([]);
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="scenario-tester">
        <motion.div 
          className="loading-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="spinner"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          <p>Loading scenario tester...</p>
        </motion.div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="scenario-tester">
        <motion.div 
          className="empty-state"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="empty-icon">🔧</div>
          <h2>No Test Scenarios Available</h2>
          <p>Create a bot scenario project to start testing</p>
          <button 
            className="btn-primary" 
            onClick={() => navigate('/dashboard')}
          >
            Create Scenario Project
          </button>
        </motion.div>
      </div>
    );
  }

  // Show project selection if no project is selected
  if (!selectedProject || messages.length === 0) {
    return (
      <div className="scenario-tester">
        <div className="tester-container">
          <motion.div 
            className="tester-header compact"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="header-left">
              <h1>🧪 Test Scenarios</h1>
            </div>
          </motion.div>

          <div className="projects-selection">
            <h2>Select a scenario to test:</h2>
            <div className="projects-grid">
              {projects.map((project) => (
                <motion.button
                  key={project.id}
                  className="project-card"
                  onClick={() => initializeBot(project.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="project-icon">🚀</div>
                  <div className="project-name">{project.name}</div>
                  <div className="project-action">Start Testing →</div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scenario-tester">
      <div className="tester-container">
        {/* Header */}
        <motion.div 
          className="tester-header compact"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="header-left">
            <h1>🧪 {projects.find(p => p.id === selectedProject)?.name}</h1>
          </div>
          
          <div className="header-right">
            {projects.length > 1 && (
              <motion.button
                className="btn-back"
                onClick={() => {
                  setMessages([]);
                  setSelectedProject(null);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ← Back to Scenarios
              </motion.button>
            )}
            {sessionId && messages.length > 0 && (
              <motion.button
                className="btn-clear"
                onClick={handleClearHistory}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Clear conversation"
              >
                🗑️ Clear
              </motion.button>
            )}
            {isSessionEnded && (
              <motion.span 
                className="session-ended"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Ended
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Messages */}
        <div className="messages-container">
          <AnimatePresence>
            {messages.map((message) => {
              // START блок (empty text) показываем только как кнопку
              const isStartBlock = message.sender === 'bot' && !message.text && message.buttons?.length === 1;
              
              return (
              <motion.div
                key={message.id}
                className={`message-wrapper ${message.sender}`}
                initial={{ opacity: 0, x: message.sender === 'user' ? 100 : -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: message.sender === 'user' ? 100 : -100 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
              >
                {message.sender === 'bot' && !isStartBlock && (
                  <motion.div 
                    className="avatar bot-avatar"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🤖
                  </motion.div>
                )}
                
                {!isStartBlock ? (
                  // Обычное сообщение с текстом
                  <motion.div 
                    className={`message-bubble ${message.sender}`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <p className="message-text">{message.text}</p>

                    {message.buttons && message.buttons.length > 0 && (
                      <motion.div 
                        className="message-buttons"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {message.buttons.map((button, idx) => (
                          <motion.button
                            key={button.id}
                            className="message-button"
                            onClick={() => handleButtonClick(button)}
                            disabled={isProcessing || isSessionEnded}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {button.title}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  // START блок - только кнопка "НАЧАЛО"
                  <motion.button
                    className="start-button"
                    onClick={() => message.buttons && handleButtonClick(message.buttons[0])}
                    disabled={isProcessing || isSessionEnded}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {message.buttons?.[0]?.title || 'НАЧАЛО'}
                  </motion.button>
                )}

                {message.sender === 'user' && (
                  <div className="avatar user-avatar">👤</div>
                )}
              </motion.div>
            );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-section">
          {error && (
            <motion.div 
              className="error-message"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ❌ {error}
            </motion.div>
          )}
          
          {isSessionEnded ? (
            <motion.div 
              className="session-ended-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.button
                className="btn-primary"
                onClick={() => selectedProject && initializeBot(selectedProject)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🔄 Restart Test
              </motion.button>
            </motion.div>
          ) : (
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Type your message or click a button to continue..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isProcessing && !isSessionEnded) {
                    handleSendMessage();
                  }
                }}
                disabled={isProcessing || isSessionEnded}
                className="input-field"
              />
              <motion.button
                onClick={handleSendMessage}
                disabled={isProcessing || !input.trim() || isSessionEnded}
                className="send-button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isProcessing ? '⏳' : '➤'}
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
