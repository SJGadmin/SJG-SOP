import React from 'react';
import type { ChatSession } from '../types';

interface SidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ chatSessions, activeChatId, onNewChat, onSelectChat }) => {
  return (
    <div className="flex flex-col h-screen bg-[#000000] text-white w-64 p-4">
      <button
        onClick={onNewChat}
        className="w-full bg-[#38B6FF] hover:bg-[#20A4F3] text-white font-bold py-2 px-4 rounded-lg mb-6 transition-colors"
      >
        + New Chat
      </button>
      <h2 className="text-gray-400 text-sm font-semibold mb-2">History</h2>
      <div className="flex-grow overflow-y-auto">
        <ul className="space-y-2">
          {chatSessions.map((session) => (
            <li key={session.id}>
              <button
                onClick={() => onSelectChat(session.id)}
                className={`w-full text-left p-2 rounded-md text-sm truncate ${
                  activeChatId === session.id ? 'bg-[#38B6FF]' : 'hover:bg-gray-700'
                }`}
              >
                {session.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;