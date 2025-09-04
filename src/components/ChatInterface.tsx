import React, { useState, useRef, useEffect } from 'react';
import type { ChatSession, Message } from '../types';
import MessageBubble from './MessageBubble';
import WelcomeScreen from './WelcomeScreen';

interface ChatInterfaceProps {
  session: ChatSession | null;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ session, isLoading, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isLoading]);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const showWelcome = !session || session.messages.length === 0;

  return (
    <div className="flex flex-col h-screen flex-1 bg-white">
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
            {showWelcome ? (
                <WelcomeScreen onExampleClick={onSendMessage} />
            ) : (
                <div className="space-y-4">
                    {session.messages.map((msg: Message) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {isLoading && <MessageBubble message={{id: 'loading', sender: 'assistant', content: 'loading'} as Message} />}
                    <div ref={messagesEndRef} />
                </div>
            )}
        </div>
      </main>
      <footer className="bg-white border-t border-[#E7E6E2] p-4">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center bg-[#E7E6E2] rounded-lg p-2">
                <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about an SOP..."
                    className="w-full bg-transparent resize-none focus:outline-none p-2 max-h-40 text-black placeholder-gray-600"
                    rows={1}
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    className="bg-[#38B6FF] text-white rounded-md p-2 ml-2 disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-[#20A4F3] transition-colors flex-shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatInterface;