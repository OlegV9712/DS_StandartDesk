import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../store/authStore';
import { apiService } from '../services/api';
import { ChatbotExecutor } from '../services/chatbot';
import '../styles/bot-assistant.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  buttons?: Array<{
    id: string;
    title: string;
    payload: string;
    nextBlockId?: string;
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
  const [error, setError] = useState('');
  const [executor, setExecutor] = useState<ChatbotExecutor | null>(null);
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
      // Load project details and get pages
      const pagesResponse = await apiService.getPages(projectId);
      
      if (pagesResponse.data.length > 0) {
        // Get the block schema from the first page
        const firstPage = pagesResponse.data[0];
        const schemasResponse = await apiService.getBlockSchemas(firstPage.id);
        
        if (schemasResponse.data.length > 0) {
          const schema = schemasResponse.data[0];
          const content = JSON.parse(schema.content);
          
          // Initialize executor with the schema
          const newExecutor = new ChatbotExecutor(content);
          setExecutor(newExecutor);
          
          // Get initial message
          const initialMsg = newExecutor.getInitialMessage();
          if (initialMsg) {
            const message: Message = {
              ...initialMsg,
              createdAt: new Date()
            };
            setMessages([message]);
          } else {
            // Fallback greeting
            setMessages([{
              id: '1',
              text: '👋 Hello! I am an assistant bot. How can I help you?',
              sender: 'bot',
              buttons: [
                { id: '1', title: 'Help', payload: 'help' },
                { id: '2', title: 'Information', payload: 'info' },
                { id: '3', title: 'Contact', payload: 'contact' }
              ],
              createdAt: new Date()
            }]);
          }
        }
      }
    } catch (err) {
      console.error('Error initializing bot:', err);
      setError('Failed to load bot schema');
      setMessages([{
        id: '1',
        text: '⚠️ Unable to load bot configuration. Please check the project schema.',
        sender: 'bot',
        createdAt: new Date()
      }]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing || !executor) return;

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
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get bot response from executor
      const botResponse = executor.processUserInput(userInput);
      
      if (botResponse) {
        const message: Message = {
          ...botResponse,
          createdAt: new Date()
        };
        setMessages((prev) => [...prev, message]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage: Message = {
        id: Math.random().toString(),
        text: '❌ Error processing message',
        sender: 'bot',
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = (button: { id: string; title: string; payload: string; nextBlockId?: string }) => {
    const userMessage: Message = {
      id: Math.random().toString(),
      text: button.title,
      sender: 'user',
      createdAt: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Process button click with next block ID
      const botResponse = executor?.processUserInput(button.title, button.nextBlockId);
      
      if (botResponse) {
        setTimeout(() => {
          const message: Message = {
            ...botResponse,
            createdAt: new Date()
          };
          setMessages((prev) => [...prev, message]);
          setIsProcessing(false);
        }, 500);
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error handling button click:', err);
      setIsProcessing(false);
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
                          disabled={isProcessing}
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
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isProcessing) {
                  handleSendMessage();
                }
              }}
              disabled={isProcessing}
              className="input-field"
            />
            <button
              onClick={handleSendMessage}
              disabled={isProcessing || !input.trim()}
              className="send-button"
            >
              {isProcessing ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotAssistant;
