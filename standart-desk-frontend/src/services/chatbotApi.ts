import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:5000';

// Create axios instance with proper CORS config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// DTO Types from backend
export interface ChatSessionStartDto {
  sessionId: number;
  currentBlockId: string;
  initialMessage: ChatBlockResponseDto;
}

export interface ChatMessageDto {
  message?: string;
  selectedButtonId?: string;
}

export interface ChatBlockResponseDto {
  blockId: string;
  blockType: string;
  text: string;
  buttons: ChatButtonDto[];
  isEnded: boolean;
  error?: string;
}

export interface ChatButtonDto {
  id: string;
  title: string;
  payload: string;
}

export interface ChatMessageHistoryDto {
  text: string;
  sender: 'bot' | 'user';
  createdAt: string;
  buttons?: ChatButtonDto[];
}

/**
 * API client for chatbot backend communication
 */
export const chatbotApi = {
  /**
   * Start a new chat session
   */
  async startSession(projectId: number): Promise<ChatSessionStartDto> {
    try {
      const response = await axiosInstance.post<ChatSessionStartDto>(
        `/api/chatbot/projects/${projectId}/session/start`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to start chat session:', axiosError.response?.data);
      throw error;
    }
  },

  /**
   * Send a message or button click to an active session
   */
  async sendMessage(
    sessionId: number,
    input: ChatMessageDto
  ): Promise<ChatBlockResponseDto> {
    try {
      const response = await axiosInstance.post<ChatBlockResponseDto>(
        `/api/chatbot/session/${sessionId}/message`,
        input
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to send message:', axiosError.response?.data);
      throw error;
    }
  },

  /**
   * Get conversation history for a session
   */
  async getHistory(sessionId: number): Promise<ChatMessageHistoryDto[]> {
    try {
      const response = await axiosInstance.get<ChatMessageHistoryDto[]>(
        `/api/chatbot/session/${sessionId}/history`
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to fetch history:', axiosError.response?.data);
      throw error;
    }
  },

  /**
   * End a chat session
   */
  async endSession(sessionId: number): Promise<void> {
    try {
      await axiosInstance.post(`/api/chatbot/session/${sessionId}/end`);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to end session:', axiosError.response?.data);
      throw error;
    }
  },

  /**
   * Clear conversation history for a session
   */
  async clearHistory(sessionId: number): Promise<void> {
    try {
      await axiosInstance.post(`/api/chatbot/session/${sessionId}/clear-history`);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Failed to clear history:', axiosError.response?.data);
      throw error;
    }
  },
};
