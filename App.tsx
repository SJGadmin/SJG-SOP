
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { ChatSession, Sender, Message, StructuredResponse } from './types';

const App: React.FC = () => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load chat sessions from localStorage only once on initial component mount
  useEffect(() => {
    try {
      const storedChats = localStorage.getItem('chatSessions');
      if (storedChats) {
        const parsedChats = JSON.parse(storedChats);
        if (Array.isArray(parsedChats)) {
          setChatSessions(parsedChats);
          if (parsedChats.length > 0) {
            // Default to the most recent chat on load
            setActiveChatId(parsedChats[0].id);
          }
        }
      }
    } catch (error) {
        console.error("Failed to parse chat sessions from localStorage", error);
        setChatSessions([]);
    }
  }, []);

  // Save chat sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
  }, [chatSessions]);

  const handleNewChat = () => {
    // Set active chat to null to show the WelcomeScreen
    setActiveChatId(null);
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    const userMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: Sender.USER,
        content: messageText,
    };

    let chatToUpdateId = activeChatId;
    let isNewChat = false;

    // --- Part 1: Synchronous UI Update ---
    // This part runs instantly to give the user immediate feedback.
    if (!chatToUpdateId) {
        isNewChat = true;
        const newChatId = `chat-${Date.now()}`;
        const fallbackTitle = messageText.split(' ').slice(0, 5).join(' ');
        const newChat: ChatSession = {
            id: newChatId,
            title: fallbackTitle, // Use fallback title initially
            messages: [userMessage],
        };
        
        chatToUpdateId = newChatId;
        
        // Immediately switch from Welcome Screen to the new chat view
        setActiveChatId(newChatId); 
        setChatSessions(prev => [newChat, ...prev]);
    } else {
        // Just add the user's message to the current chat
        setChatSessions(prev => prev.map(session =>
            session.id === chatToUpdateId
                ? { ...session, messages: [...session.messages, userMessage] }
                : session
        ));
    }

    // Now that the UI has updated with the user's message, show the loading indicator.
    setIsLoading(true);

    // --- Part 2: Asynchronous API Calls ---
    // These run in the background.

    // If it was a new chat, generate a better title in the background.
    if (isNewChat) {
        try {
            const titleResponse = await fetch('/api/generate-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText }),
            });
            if (titleResponse.ok) {
                const data = await titleResponse.json();
                if (data.title && typeof data.title === 'string' && data.title.trim() !== '') {
                    // Update the title of the chat we just created.
                    setChatSessions(prev => prev.map(session =>
                        session.id === chatToUpdateId ? { ...session, title: data.title } : session
                    ));
                }
            }
        } catch (error) {
            console.error("Could not generate smart title, using fallback:", error);
        }
    }
    
    // Now, get the assistant's response.
    try {
        const apiResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: messageText }),
        });

        if (!apiResponse.ok) {
            throw new Error(`API error: ${apiResponse.statusText}`);
        }
        
        const assistantResponseData: StructuredResponse = await apiResponse.json();

        const assistantMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            sender: Sender.ASSISTANT,
            content: assistantResponseData,
        };
        
        setChatSessions(prev => prev.map(session =>
            session.id === chatToUpdateId
                ? { ...session, messages: [...session.messages, assistantMessage] }
                : session
        ));

    } catch (error) {
        console.error("Error getting response from service:", error);
         const errorMessage: Message = {
            id: `msg-${Date.now() + 1}`,
            sender: Sender.ASSISTANT,
            content: { summary: "Sorry, I encountered an error. Please try again." },
        };
        setChatSessions(prev => prev.map(session =>
            session.id === chatToUpdateId
                ? { ...session, messages: [...session.messages, errorMessage] }
                : session
        ));
    } finally {
        setIsLoading(false);
    }
  }, [activeChatId]);

  const activeSession = chatSessions.find((session) => session.id === activeChatId) || null;
  
  return (
    <div className="flex h-screen font-sans">
      <Sidebar
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
      />
      <ChatInterface
        session={activeSession}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};

export default App;
