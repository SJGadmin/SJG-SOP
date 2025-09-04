
export enum Sender {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface StructuredResponse {
  summary?: string;
  steps?: string[];
  notes?: string[];
  sources?: string[];
  clarification?: string;
  isNotFound?: boolean;
  isOutOfScope?: boolean;
}

export interface Message {
  id: string;
  sender: Sender;
  content: string | StructuredResponse;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}