import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Bot, Send, ArrowLeft, User as UserIcon } from 'lucide-react';
// Removed localStorage import - now using API

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotInterfaceProps {
  username: string;
  onBack?: () => void;
  isOwner: boolean;
}

export function ChatbotInterface({ username, onBack, isOwner }: ChatbotInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [botName, setBotName] = useState('');
  const [botOwner, setBotOwner] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load bot owner info from D1 database
    const loadBotOwner = async () => {
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(username)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setMessages([
              {
                id: '1',
                text: `Sorry, this chatbot doesn't exist. Please check the URL.`,
                sender: 'bot',
                timestamp: new Date(),
              },
            ]);
            return;
          }
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }
        
        const owner = await response.json();
        setBotOwner(owner);
        setBotName(`${owner.name}'s Bot`);
        
        // Add welcome message
        setMessages([
          {
            id: '1',
            text: `Hi! I'm ${owner.name}'s AI assistant. I'm trained to answer questions based on my knowledge base. Feel free to ask me anything!`,
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error('Error loading bot owner:', error);
        setMessages([
          {
            id: '1',
            text: `Sorry, I'm having trouble loading. Please try again later.`,
            sender: 'bot',
            timestamp: new Date(),
          },
        ]);
      }
    };
    
    loadBotOwner();
  }, [username]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || !botOwner) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Call RAG-based chatbot API
      const response = await fetch(
        `/api/chatbot?text=${encodeURIComponent(question)}&username=${encodeURIComponent(username)}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || 
          "I don't have specific information about that in my knowledge base. Could you try rephrasing your question or ask about something else?",
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error calling chatbot API:', error);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble processing your question right now. Please try again later.",
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!botOwner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-gray-900 mb-2">Chatbot Not Found</h2>
            <p className="text-gray-600">
              The chatbot @{username} doesn't exist.
            </p>
            {onBack && (
              <Button onClick={onBack} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-indigo-600 text-white">
                {botOwner.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-gray-900">{botName}</h1>
              <p className="text-sm text-gray-600">@{username}</p>
            </div>
            {isOwner && (
              <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                Your Chatbot
              </div>
            )}
          </div>
          {botOwner.bio && (
            <p className="text-sm text-gray-600 mt-2">{botOwner.bio}</p>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        <Card className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback
                      className={
                        message.sender === 'bot'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-600 text-white'
                      }
                    >
                      {message.sender === 'bot' ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <UserIcon className="w-4 h-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.sender === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-indigo-600 text-white">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !inputValue.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Powered by {botOwner.faqs.length} FAQ{botOwner.faqs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
