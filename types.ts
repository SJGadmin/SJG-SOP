
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

  // Debug fields to provide transparency on the backend search process
  debug_sliteQuery?: string;
  debug_sliteDocsFound?: number;
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