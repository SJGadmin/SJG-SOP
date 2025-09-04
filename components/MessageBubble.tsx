import React from 'react';
import { Message, Sender, StructuredResponse } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const LoadingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
    </div>
);

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.sender === Sender.USER;

  if (message.sender === 'assistant' && typeof message.content === 'string' && message.content === 'loading') {
    return (
        <div className="flex justify-start">
            <div className="bg-[#E7E6E2] text-black p-3 rounded-lg max-w-2xl">
                <LoadingIndicator />
            </div>
        </div>
    );
  }

  const renderContent = () => {
    if (typeof message.content === 'string') {
      return <p>{message.content}</p>;
    }

    const response = message.content as StructuredResponse;

    if (response.isNotFound) {
      return (
        <p>
          That one isn't on the market yet, but you can go here to request it:{' '}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSc3lITA26L8MvnlYJxpZ-SmhU0Qus5bQRHprB0XDWRhFtX4GQ/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#38B6FF] font-semibold hover:underline"
          >
            Request a New SOP
          </a>
        </p>
      );
    }
    
    if (response.isOutOfScope) {
      return <p>I can only answer using our internal SOPs. Would you like me to search for an SOP on this topic?</p>
    }
    
    if (response.clarification) {
      return <p>{response.clarification}</p>;
    }

    return (
      <div className="space-y-4">
        {response.summary && <p>{response.summary}</p>}
        {response.steps && response.steps.length > 0 && (
          <div>
            <h3 className="font-semibold mb-1">Steps:</h3>
            <ul className="list-decimal list-inside space-y-1">
              {response.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ul>
          </div>
        )}
        {response.notes && response.notes.length > 0 && (
          <div>
            <h3 className="font-semibold mb-1">Notes:</h3>
            <ul className="list-disc list-inside space-y-1">
              {response.notes.map((note, i) => <li key={i}>{note}</li>)}
            </ul>
          </div>
        )}
        {response.sources && response.sources.length > 0 && (
          <div className="pt-2 border-t mt-4">
            <h3 className="font-semibold mb-1">Sources:</h3>
            <ul className="list-none space-y-1">
              {response.sources.map((source, i) => <li key={i} className="text-sm text-gray-600">{source}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${
          isUser
            ? 'bg-[#38B6FF] text-white'
            : 'bg-[#E7E6E2] text-black'
        } p-3 rounded-lg max-w-2xl`}
      >
        {renderContent()}
      </div>
    </div>
  );
};

export default MessageBubble;