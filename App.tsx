
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

  const handleDeleteChat = (chatId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== chatId));
    // If the active chat is the one being deleted, return to the welcome screen.
    if (activeChatId === chatId) {
      setActiveChatId(null);
    }
  };

  const handleSendMessage = useCallback(async (messageText: string) => {
    const userMessage: Message = {
        id: `msg-${Date.now()}`,
        sender: Sender.USER,
        content: messageText,
    };

    let chatToUpdateId = activeChatId;
    let isNewChat = false;

    // Prepare the message history for the API call *before* queuing the state update.
    const currentActiveSession = chatSessions.find(s => s.id === activeChatId);
    const messagesForApi = currentActiveSession
        ? [...currentActiveSession.messages, userMessage]
        : [userMessage];

    // --- Part 1: Synchronous UI Update ---
    if (!chatToUpdateId) {
        isNewChat = true;
        const newChatId = `chat-${Date.now()}`;
        const fallbackTitle = messageText.split(' ').slice(0, 5).join(' ');
        const newChat: ChatSession = {
            id: newChatId,
            title: fallbackTitle,
            messages: [userMessage],
        };
        
        chatToUpdateId = newChatId;
        
        setActiveChatId(newChatId); 
        setChatSessions(prev => [newChat, ...prev]);
    } else {
        setChatSessions(prev => prev.map(session =>
            session.id === chatToUpdateId
                ? { ...session, messages: [...session.messages, userMessage] }
                : session
        ));
    }

    setIsLoading(true);

    // --- Part 2: Asynchronous API Calls ---
    if (isNewChat) {
        try {
            const titleResponse = await fetch('/api/generate-title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: messageText }),
            });

            if (!titleResponse.ok) {
                 let errorDetails = `Title generation failed: ${titleResponse.status} ${titleResponse.statusText}`;
                 try {
                     const errorData = await titleResponse.json();
                     if (errorData && errorData.error) {
                         errorDetails = `Title generation failed: ${errorData.error}`;
                     }
                 } catch (e) { /* ignore json parse error */ }
                 throw new Error(errorDetails);
            }

            const data = await titleResponse.json();
            if (data.title && typeof data.title === 'string' && data.title.trim() !== '') {
                setChatSessions(prev => prev.map(session =>
                    session.id === chatToUpdateId ? { ...session, title: data.title } : session
                ));
            }
        } catch (error) {
            console.error("Could not generate smart title, using fallback:", error);
        }
    }
    
    try {
        const apiResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: messagesForApi }), // Send the full history
        });

        if (!apiResponse.ok) {
            let errorDetails = `API error: ${apiResponse.status} ${apiResponse.statusText}`;
            try {
                const errorData = await apiResponse.json();
                if (errorData && errorData.error) {
                    errorDetails = errorData.error;
                }
            } catch (e) {
                // If the response isn't JSON, stick with the status text
            }
            throw new Error(errorDetails);
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
  }, [activeChatId, chatSessions]);

  const activeSession = chatSessions.find((session) => session.id === activeChatId) || null;
  
  return (
    <div className="flex h-screen font-sans">
      <Sidebar
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
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