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
      // User clicked a button - get the next block from button
      nextBlockId = selectedButtonId;
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

        // Handle start block
        if (nextBlock.type === 'start') {
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
    // If block has explicit buttons, use those
    if (block.buttons && block.buttons.length > 0) {
      const message: ChatMessage = {
        id: block.id,
        text: block.text || block.label || 'Select an option:',
        sender: 'bot',
        buttons: block.buttons.map((btn) => {
          let nextBlockId = btn.nextBlockId;
          if (!nextBlockId) {
            // Try to find a block connected from this button
            const connected = this.getConnectedBlocks(btn.id);
            nextBlockId = connected.length > 0 ? connected[0] : undefined;
          }
          return {
            id: btn.id,
            title: btn.label,
            payload: btn.label,
            nextBlockId
          };
        })
      };
      this.conversationHistory.push(message);
      return message;
    }

    // If no buttons, try to find button_container in next blocks
    const connectedBlocks = this.getConnectedBlocks(block.id);
    for (const blockId of connectedBlocks) {
      const nextBlock = this.getBlockById(blockId);
      if (nextBlock && nextBlock.type === 'button_container') {
        return this.createResponseWithButtons(nextBlock);
      }
    }

    // Default message without buttons
    const message: ChatMessage = {
      id: block.id,
      text: block.text || block.label || 'Processing...',
      sender: 'bot'
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
