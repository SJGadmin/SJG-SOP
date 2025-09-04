import React, { useState } from 'react';
import type { ChatSession } from '../../types';

interface SidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ chatSessions, activeChatId, onNewChat, onSelectChat, onDeleteChat }) => {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleMenuClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuOpenId(prevId => (prevId === sessionId ? null : sessionId));
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onDeleteChat(sessionId);
    setMenuOpenId(null);
  };

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
            <li key={session.id} className="group relative">
              <div
                className={`flex items-center justify-between w-full rounded-md ${
                  activeChatId === session.id ? 'bg-[#38B6FF]' : 'hover:bg-gray-700'
                }`}
              >
                <button
                  onClick={() => onSelectChat(session.id)}
                  className="flex-grow text-left p-2 text-sm truncate"
                >
                  {session.title}
                </button>
                <button
                  onClick={(e) => handleMenuClick(e, session.id)}
                  className="p-2 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  aria-label="More options"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                  </svg>
                </button>
              </div>
              {menuOpenId === session.id && (
                <div className="absolute right-0 mt-1 w-28 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10">
                  <button
                    onClick={(e) => handleDeleteClick(e, session.id)}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;