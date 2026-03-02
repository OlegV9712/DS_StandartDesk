import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../store/authStore';
import { apiService } from '../services/api';
import { chatbotApi } from '../services/chatbotApi';
import '../styles/bot-assistant.css';

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

export const BotAssistant: React.FC = () => {
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
      if (assistantProjects.length > 0) {
        setSelectedProject(assistantProjects[0].id);
        initializeBot(assistantProjects[0].id);
      }
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeBot = async (projectId: number) => {
    try {
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

    // Display user's button click
    const userMessage: Message = {
      id: Math.random().toString(),
      text: button.title,
      sender: 'user',
      createdAt: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Send button click to server
      const botResponse = await chatbotApi.sendMessage(sessionId, {
        selectedButtonId: button.id
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
      console.error('Error handling button click:', err);
      const errorMessage: Message = {
        id: Math.random().toString(),
        text: '❌ Error processing button. Please try again.',
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
      <div className="bot-assistant">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading chatbot...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="bot-assistant">
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <h2>No Assistant Bots</h2>
          <p>Create an Assistant Bot project to start</p>
          <button className="btn-primary" onClick={() => navigate('/dashboard')}>
            Create Bot Project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bot-assistant">
      <div className="bot-container">
        {/* Header */}
        <div className="bot-header">
          <div className="header-content">
            <h1>🤖 Bot Assistant</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {sessionId && messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  background: '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#ff5252';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#ff6b6b';
                }}
                title="Clear conversation history"
              >
                🗑️ Clear History
              </button>
            )}
            {isSessionEnded && <span style={{ color: '#ff6b6b', fontSize: '12px' }}>Session ended</span>}
            {projects.length > 1 && (
              <select
                value={selectedProject || ''}
                onChange={(e) => {
                  const projectId = parseInt(e.target.value);
                  setSelectedProject(projectId);
                  initializeBot(projectId);
                }}
                className="project-select"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="messages-container">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                className={`message ${message.sender}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {message.sender === 'bot' && <span className="bot-avatar">🤖</span>}
                {message.sender === 'user' && <span className="user-avatar">👤</span>}

                <div className="message-content">
                  <p className="message-text">{message.text}</p>

                  {message.buttons && message.buttons.length > 0 && (
                    <div className="message-buttons">
                      {message.buttons.map((button) => (
                        <button
                          key={button.id}
                          className="message-button"
                          onClick={() => handleButtonClick(button)}
                          disabled={isProcessing || isSessionEnded}
                        >
                          {button.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          {error && <div className="error-message">{error}</div>}
          {isSessionEnded && (
            <div style={{ padding: '10px', textAlign: 'center', background: '#f5f5f5', borderTop: '1px solid #ddd' }}>
              <button
                className="btn-primary"
                onClick={() => selectedProject && initializeBot(selectedProject)}
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Start New Session
              </button>
            </div>
          )}
          {!isSessionEnded && (
            <div className="input-wrapper">
              <input
                type="text"
                placeholder="Type your message..."
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
              <button
                onClick={handleSendMessage}
                disabled={isProcessing || !input.trim() || isSessionEnded}
                className="send-button"
              >
                {isProcessing ? '⏳' : '📤'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
