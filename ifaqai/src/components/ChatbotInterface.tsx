import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Bot, Send, ArrowLeft, User as UserIcon, Bug, X } from 'lucide-react';
// Removed localStorage import - now using API

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  debugInfo?: any;
}

interface DebugInfo {
  vectorizeMatches: number;
  matchingFaqIds: string[];
  faqsRetrieved: number;
  chatbotOwnerId: string;
  chatbotOwnerUsername?: string;
  contextUsed: boolean;
  faqsUsed: number;
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
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Only allow debug panel if user is the owner
  useEffect(() => {
    if (!isOwner && showDebug) {
      setShowDebug(false);
    }
  }, [isOwner, showDebug]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debugScrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Scroll debug panel to top when new debug info arrives
    if (debugScrollRef.current && debugInfo) {
      debugScrollRef.current.scrollTop = 0;
    }
  }, [debugInfo]);

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
      // Call RAG-based chatbot API with debug enabled only if user is owner
      const debugParam = isOwner ? '&debug=true' : '';
      const response = await fetch(
        `/api/chatbot?text=${encodeURIComponent(question)}&username=${encodeURIComponent(username)}${debugParam}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Store debug information (only if user is owner)
      if (isOwner && data.debug) {
        setDebugInfo({
          vectorizeMatches: data.debug.vectorizeMatches || 0,
          matchingFaqIds: data.debug.matchingFaqIds || [],
          faqsRetrieved: data.debug.faqsRetrieved || 0,
          chatbotOwnerId: data.debug.chatbotOwnerId || '',
          chatbotOwnerUsername: data.debug.chatbotOwnerUsername,
          contextUsed: data.contextUsed || false,
          faqsUsed: data.faqsUsed || 0,
        });
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.answer || 
          "I don't have specific information about that in my knowledge base. Could you try rephrasing your question or ask about something else?",
        sender: 'bot',
        timestamp: new Date(),
        debugInfo: data.debug,
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
            {isOwner && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowDebug(!showDebug)}
                className="ml-2"
                title={showDebug ? 'Hide Debug Panel' : 'Show Debug Panel'}
              >
                <Bug className="w-4 h-4" />
              </Button>
            )}
          </div>
          {botOwner.bio && (
            <p className="text-sm text-gray-600 mt-2">{botOwner.bio}</p>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div className={`flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-4 ${showDebug ? 'max-w-7xl' : 'max-w-4xl'}`}>
        {/* Main Chat Card */}
        <Card className={`flex-1 flex flex-col ${showDebug ? 'flex-1' : ''}`}>
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

        {/* Debug Panel - Only show if user is the owner */}
        {isOwner && showDebug && (
          <Card className="w-96 flex flex-col border-2 border-orange-200">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-lg">Debug Panel</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDebug(false)}
                  className="h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4" ref={debugScrollRef}>
              <div className="space-y-4">
                {debugInfo ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-gray-700">Query Information</h3>
                      <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                        <div><span className="font-medium">Owner ID:</span> {debugInfo.chatbotOwnerId}</div>
                        {debugInfo.chatbotOwnerUsername && (
                          <div><span className="font-medium">Username:</span> {debugInfo.chatbotOwnerUsername}</div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-gray-700">Vectorize Results</h3>
                      <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                        <div><span className="font-medium">Matches Found:</span> {debugInfo.vectorizeMatches}</div>
                        <div><span className="font-medium">After Filtering:</span> {debugInfo.matchingFaqIds.length}</div>
                        {debugInfo.matchingFaqIds.length > 0 && (
                          <div className="mt-2">
                            <span className="font-medium">FAQ IDs:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {debugInfo.matchingFaqIds.map((id) => (
                                <span key={id} className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">
                                  {id}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-gray-700">D1 Database Results</h3>
                      <div className="bg-gray-50 rounded p-2 text-xs space-y-1">
                        <div><span className="font-medium">FAQs Retrieved:</span> {debugInfo.faqsRetrieved}</div>
                        <div>
                          <span className="font-medium">Context Used:</span>{' '}
                          <span className={debugInfo.contextUsed ? 'text-green-600' : 'text-red-600'}>
                            {debugInfo.contextUsed ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div><span className="font-medium">FAQs Used:</span> {debugInfo.faqsUsed}</div>
                      </div>
                    </div>

                    {debugInfo.faqsRetrieved === 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <p className="text-xs text-yellow-800 font-medium">⚠️ No FAQs Retrieved</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          This could mean:
                        </p>
                        <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside space-y-0.5">
                          <li>Vectorize returned no matches</li>
                          <li>All matches were filtered out (userId mismatch)</li>
                          <li>D1 database has no FAQs for this user</li>
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-8">
                    <Bug className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No debug information available yet.</p>
                    <p className="text-xs mt-1">Send a message to see debug data.</p>
                  </div>
                )}

                {/* Latest Message Debug Info */}
                {messages.length > 0 && messages[messages.length - 1]?.debugInfo && (
                  <div className="space-y-2 mt-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm text-gray-700">Latest Response Debug</h3>
                    <div className="bg-gray-50 rounded p-2 text-xs">
                      <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-48">
                        {JSON.stringify(messages[messages.length - 1].debugInfo, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
}
