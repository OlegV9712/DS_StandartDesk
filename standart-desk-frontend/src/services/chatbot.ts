import { Block, Connection, BlockSchemaContent } from '../types';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  buttons?: Array<{
    id: string;
    title: string;
    payload: string;
    nextBlockId?: string;
  }>;
}

export class ChatbotExecutor {
  private blocks: Block[] = [];
  private connections: Connection[] = [];
  private currentBlockId: string | null = null;
  private conversationHistory: ChatMessage[] = [];
  private isEnded: boolean = false;

  constructor(schemaContent: BlockSchemaContent) {
    this.blocks = schemaContent.blocks;
    this.connections = schemaContent.connections;
    
    // Find the starting block (type 'start')
    const startBlock = this.blocks.find(b => b.type === 'start');
    this.currentBlockId = startBlock?.id || null;
  }

  /**
   * Gets the initial greeting with start block as button
   */
  getInitialMessage(): ChatMessage | null {
    if (!this.currentBlockId) return null;

    const startBlock = this.getBlockById(this.currentBlockId);
    if (!startBlock || startBlock.type !== 'start') return null;

    // Return start block as a button to click
    const message: ChatMessage = {
      id: 'init',
      text: 'Click to start the conversation:',
      sender: 'bot',
      buttons: [{
        id: startBlock.id,
        title: startBlock.label || '🚀 Start',
        payload: startBlock.label,
        nextBlockId: startBlock.id
      }]
    };

    return message;
  }

  /**
   * Processes user input and returns bot response with next block
   */
  processUserInput(userMessage: string, selectedButtonId?: string): ChatMessage | null {
    if (this.isEnded) {
      return {
        id: Math.random().toString(),
        text: '❌ Conversation has ended. Please restart.',
        sender: 'bot'
      };
    }

    if (!userMessage.trim() && !selectedButtonId) return null;

    // Record user message if provided
    if (userMessage.trim()) {
      const userMsg: ChatMessage = {
        id: Math.random().toString(),
        text: userMessage,
        sender: 'user'
      };
      this.conversationHistory.push(userMsg);
    }

    // Find next block
    let nextBlockId: string | null = null;

    if (selectedButtonId) {
      // User clicked a button - find what block is connected FROM it
      const connectedBlocks = this.getConnectedBlocks(selectedButtonId);
      if (connectedBlocks.length > 0) {
        nextBlockId = connectedBlocks[0];
      } else {
        // No connected block, might be the end
        nextBlockId = selectedButtonId;
      }
    } else if (this.currentBlockId) {
      // Try to find next block from current
      const connectedBlocks = this.getConnectedBlocks(this.currentBlockId);
      if (connectedBlocks.length > 0) {
        nextBlockId = connectedBlocks[0];
      }
    }

    if (nextBlockId) {
      this.currentBlockId = nextBlockId;
      const nextBlock = this.getBlockById(nextBlockId);
      
      if (nextBlock) {
        // Check if this is the end block
        if (nextBlock.type === 'terminator' || nextBlock.label?.toLowerCase().includes('end')) {
          this.isEnded = true;
          const botResponse: ChatMessage = {
            id: nextBlock.id,
            text: nextBlock.label || 'Conversation ended.',
            sender: 'bot'
          };
          this.conversationHistory.push(botResponse);
          return botResponse;
        }

        // Handle message block with buttons from button_container
        if (nextBlock.type === 'message') {
          return this.createResponseWithButtons(nextBlock);
        }

        // Handle button_container block
        if (nextBlock.type === 'button_container') {
          return this.createResponseWithButtons(nextBlock);
        }

        // Handle start block - show what's connected from start
        if (nextBlock.type === 'start') {
          // Show message of start block or find what's connected
          const connected = this.getConnectedBlocks(nextBlock.id);
          if (connected.length > 0) {
            const connectedBlock = this.getBlockById(connected[0]);
            if (connectedBlock) {
              this.currentBlockId = connectedBlock.id;
              return this.createResponseWithButtons(connectedBlock);
            }
          }
          // Fallback: show start message
          return this.createResponseWithButtons(nextBlock);
        }

        // Handle other blocks
        const botResponse = this.createMessageFromBlock(nextBlock);
        this.conversationHistory.push(botResponse);
        return botResponse;
      }
    }

    // Default response if no next block found
    const defaultResponse: ChatMessage = {
      id: Math.random().toString(),
      text: '❓ I did not understand that. Please try again.',
      sender: 'bot'
    };
    this.conversationHistory.push(defaultResponse);
    return defaultResponse;
  }

  /**
   * Creates a response with buttons
   */
  private createResponseWithButtons(block: Block): ChatMessage {
    let messageText = block.text || block.label || 'Select an option:';
    let buttons = block.buttons || [];

    // If block is message type, look for connected button_container
    if (block.type === 'message' && buttons.length === 0) {
      const connectedBlocks = this.getConnectedBlocks(block.id);
      for (const blockId of connectedBlocks) {
        const nextBlock = this.getBlockById(blockId);
        if (nextBlock && nextBlock.type === 'button_container') {
          // Use the button_container's buttons
          buttons = nextBlock.buttons || [];
          break;
        }
      }
    }

    // If block is button_container, use its buttons
    if (block.type === 'button_container') {
      buttons = block.buttons || [];
    }

    const message: ChatMessage = {
      id: block.id,
      text: messageText,
      sender: 'bot',
      buttons: buttons.map((btn, btnIndex) => {
        // Each button should pass its own ID as the selectedButtonId
        // The executor will then find what's connected from that button
        return {
          id: btn.id || `btn-${btnIndex}`,
          title: btn.label,
          payload: btn.label,
          nextBlockId: btn.id // Pass button ID so processUserInput knows which button
        };
      })
    };

    this.conversationHistory.push(message);
    return message;
  }

  /**
   * Creates a chat message from a block
   */
  private createMessageFromBlock(block: Block): ChatMessage {
    return {
      id: block.id,
      text: block.text || block.label || 'Processing...',
      sender: 'bot'
    };
  }

  /**
   * Gets a block by ID
   */
  private getBlockById(blockId: string): Block | undefined {
    return this.blocks.find((b) => b.id === blockId);
  }

  /**
   * Gets all blocks connected to a specific block
   */
  private getConnectedBlocks(blockId: string): string[] {
    return this.connections
      .filter((c) => c.fromBlockId === blockId)
      .map((c) => c.toBlockId);
  }

  /**
   * Gets conversation history
   */
  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  /**
   * Resets the conversation
   */
  reset(): void {
    this.conversationHistory = [];
    this.isEnded = false;
    const startBlock = this.blocks.find(b => b.type === 'start');
    this.currentBlockId = startBlock?.id || null;
  }

  /**
   * Checks if conversation has ended
   */
  hasEnded(): boolean {
    return this.isEnded;
  }
}
