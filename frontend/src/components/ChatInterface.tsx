import { useState, useRef, useEffect, ReactElement } from 'react';
import { sendMessage } from '../services/api';
import type { Message,} from '../types/chat';




// Helper function to format different data types
const formatValue = (value: any, columnName: string): string => {
  if (value === null || value === undefined) return 'N/A';
  
  // Format based on column name patterns
  if (columnName.toLowerCase().includes('date') || columnName.toLowerCase().includes('time')) {
    return new Date(value).toLocaleString();
  }
  
  if (columnName.toLowerCase().includes('amount') || 
      columnName.toLowerCase().includes('price') || 
      columnName.toLowerCase().includes('revenue') ||
      columnName.toLowerCase().includes('total')) {
    return typeof value === 'number' 
      ? value.toLocaleString('en-US', { 
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2 
        })
      : String(value);
  }
  
  if (typeof value === 'number') {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  
  return String(value);
};

// Helper function to determine column type
const getColumnType = (columnName: string, sampleValue: any): string => {
  if (columnName.toLowerCase().includes('date') || columnName.toLowerCase().includes('time')) {
    return 'date';
  }
  if (columnName.toLowerCase().includes('amount') || 
      columnName.toLowerCase().includes('price') || 
      columnName.toLowerCase().includes('revenue') ||
      columnName.toLowerCase().includes('total')) {
    return 'currency';
  }
  if (typeof sampleValue === 'number') {
    return 'number';
  }
  return 'text';
};

interface ChatInterfaceProps {
  onUploadClick: () => void;
  onQueryExecute: (sql: string) => Promise<void>;
  onMessagesChange: (hasMessages: boolean) => void;
  onVisualizeData: (data: any[]) => void;
  hidden?: boolean;
}

export function ChatInterface({ onUploadClick, onQueryExecute, onMessagesChange, onVisualizeData, hidden }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [, setIsInputFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 300);
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
    onMessagesChange(messages.length > 0);
  }, [messages, onMessagesChange]);

  // Setup SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        interimTranscript += event.results[i][0].transcript;
      }
      setInput(interimTranscript);
      // If the result is final, stop listening
      if (event.results[event.results.length - 1].isFinal) {
        setIsListening(false);
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    // Cleanup
    return () => {
      recognition.abort();
    };
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current && recognitionRef.current.abort();
      setIsListening(false);
      return;
    }
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const renderDataTable = (data: any[]) => {
    if (!data.length) return <p className="text-gray-600">No data found.</p>;

    const columns = Object.keys(data[0]);
    const columnTypes = columns.reduce((acc, col) => ({
      ...acc,
      [col]: getColumnType(col, data[0][col])
    }), {} as Record<string, string>);

    return (
      <>
        <div className="w-full overflow-x-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr className="bg-gray-800/30">
                    {columns.map((column) => (
                      <th
                        key={column}
                        className={`px-6 py-3 text-left text-xs font-semibold text-gray-200 uppercase tracking-wider ${
                          columnTypes[column] === 'number' || columnTypes[column] === 'currency' 
                            ? 'text-right' 
                            : ''
                        }`}
                      >
                        {column.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-transparent">
                  {data.map((row, i) => (
                    <tr 
                      key={i} 
                      className={i % 2 === 0 ? 'bg-transparent' : 'bg-gray-800/10'}
                    >
                      {columns.map((column, j) => (
                        <td
                          key={j}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            columnTypes[column] === 'number' || columnTypes[column] === 'currency'
                              ? 'text-right font-mono text-gray-200'
                              : 'text-gray-200'
                          }`}
                        >
                          {formatValue(row[column], column)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-6 py-3 text-xs text-gray-400 bg-transparent flex justify-between items-center">
            <span>Showing {data.length} {data.length === 1 ? 'row' : 'rows'}</span>
          </div>
        </div>
        <div className="w-full flex justify-end mt-4">
          <button
            onClick={() => {
              onVisualizeData(data);
            }}
            className="px-6 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold shadow-md transition-all duration-200 hover:bg-white/20 focus:outline-none focus:ring-0"
          >
            Visualize Data
          </button>
        </div>
      </>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    onMessagesChange(true);

    try {
      if (typeof userMessage.content !== 'string') {
        throw new Error('Message content must be a string');
      }
      // Prepare history: last 5 user/assistant pairs
      const history = messages.slice(-10).map(m => ({
        user: m.role === 'user' ? m.content : undefined,
        assistant: m.role === 'assistant' ? (m.summary || m.explanation || m.content) : undefined
      })).filter(h => h.user || h.assistant);
      const response = await sendMessage({ message: userMessage.content, history });
      // Store assistant message as structured data
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        content: '', // not used for assistant messages now
        role: 'assistant',
        timestamp: new Date(),
        explanation: response.explanation,
        summary: response.summary,
        query: response.query,
        data: response.data,
        type: response.type,
      };
      setMessages(prev => [...prev, assistantMessage]);
      // Execute the query if provided
      if (response.sql) {
        await onQueryExecute(response.sql);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to process text for newlines and bullet points
  const processMessageContent = (text: string | undefined) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: ReactElement[] = [];
    let currentListItems: string[] = [];

    const renderParagraph = (paragraphLines: string[]) => {
      if (paragraphLines.length > 0) {
        elements.push(<p key={`para-${elements.length}`} className="whitespace-pre-wrap">{paragraphLines.join('\n')}</p>);
      }
    };

    const renderList = (listItems: string[]) => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 pl-4">
            {listItems.map((item, index) => (
              <li key={`list-item-${elements.length}-${index}`}>{item.trimStart().substring(1).trim()}</li>
            ))}
          </ul>
        );
      }
    };

    let currentParagraphLines: string[] = [];

    lines.forEach((line) => {
      if (line.trim().startsWith('*')) {
        if (currentParagraphLines.length > 0) {
          renderParagraph(currentParagraphLines);
          currentParagraphLines = [];
        }
        currentListItems.push(line);
      } else {
        if (currentListItems.length > 0) {
          renderList(currentListItems);
          currentListItems = [];
        }
        currentParagraphLines.push(line);
      }
    });

    // Render any remaining paragraph or list items
    renderParagraph(currentParagraphLines);
    renderList(currentListItems);

    return <>{elements}</>;
  };

  const renderAssistantMessage = (message: Message) => {
    // Special rendering for dataset summary
    if (message.type === 'dataset_summary') {
      return (
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-purple-200 mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h3m4 4v1a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h5" /></svg>
              Dataset Summary
            </h3>
            {message.summary && (
              <div className="text-purple-100 font-semibold mb-2">{message.summary}</div>
            )}
            {message.explanation && (
              <div className="text-gray-100 whitespace-pre-line text-base leading-relaxed">
                {processMessageContent(message.explanation)}
              </div>
            )}
          </div>
        </div>
      );
    }
    // Special rendering for no dataset
    if (message.type === 'no_dataset') {
      return (
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-md border border-red-400/30 rounded-2xl p-6 shadow-xl flex items-start gap-4">
            <svg className="w-8 h-8 text-red-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
            <div>
              <h3 className="text-lg font-bold text-red-200 mb-2">No Dataset Available</h3>
              <div className="text-red-100 text-base leading-relaxed mb-4">
                {message.explanation || 'Please upload a dataset first, and then I\'ll be happy to help you analyze it!'}
              </div>
              <button
                onClick={onUploadClick}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg shadow hover:from-pink-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-opacity-50 transition"
              >
                Upload Dataset
              </button>
            </div>
          </div>
        </div>
      );
    }
    // Use summary for main chat, fallback to explanation if summary is missing
    const mainText = message.summary || message.explanation;
    // Only show explanation for non-data-analysis types
    const nonDataTypes = [
      'knowledge_base', 'greeting', 'help', 'ai_info', 'operation', 'general_knowledge', 'out_of_scope', 'error'
    ];
    if (message.type && nonDataTypes.includes(message.type)) {
      return (
        <div className="space-y-4">
          {message.explanation && (
            <div className="group relative">
              <div className="text-gray-800 bg-transparent rounded-lg p-4 transition-all duration-300 flex items-start">
                {/* Render processed mainText */}
                <div className="text-gray-200 flex-1 message-content">
                  {processMessageContent(message.explanation)}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {mainText && (
          <div className="group relative">
            <div className="text-gray-800 bg-transparent rounded-lg p-4 transition-all duration-300 flex items-start">
              {/* Render processed mainText */}
              <div className="text-gray-200 flex-1 message-content">
                {processMessageContent(mainText)}
              </div>
            </div>
          </div>
        )}
        {message.query &&
          message.query.toLowerCase().includes('select') &&
          !message.query.toLowerCase().includes("'greeting'") &&
          !message.query.toLowerCase().includes("'ai_info'") &&
          !message.query.toLowerCase().includes("'help'") &&
          !message.query.toLowerCase().includes("'out_of_scope'") && (
            <div className="group relative">
              <div className="bg-transparent rounded-lg p-4 transition-all duration-300 flex items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-gray-200">SQL Query</span>
                  </div>
                  <pre className="font-mono text-sm text-gray-200 overflow-x-auto whitespace-pre-wrap p-3 rounded-md">{message.query}</pre>
                </div>
              </div>
            </div>
        )}
        {message.data && message.data.length > 0 && (
          <div className="mt-4">
            {renderDataTable(message.data)}
          </div>
        )}
      </div>
    );
  };

  

  // Add back button handler
  const handleBackToHome = () => {
    setMessages([]);
    setInput('');
    onMessagesChange(false);
  };

  return (
    <div className={`w-full h-full flex flex-col text-white relative transition-all duration-500 ${hidden ? 'opacity-0 pointer-events-none translate-y-8' : 'opacity-100 pointer-events-auto translate-y-0'}`}>
      {/* Add back button header */}
      {messages.length > 0 && (
        <div className="fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-md z-20 flex items-center px-4">
          <button
            onClick={handleBackToHome}
            className="text-gray-300 p-2 rounded-full bg-gray-800/30 hover:bg-white/20 transition-colors shadow-lg focus:outline-none focus:ring-0"
            aria-label="Back to home"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
      )}

      {/* Blue glow at the bottom for liquid effect */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-t from-blue-600/40 to-transparent rounded-b-3xl blur-2xl pointer-events-none"></div>
      
      {/* Messages Area */}
      <div 
        className="flex-1 p-6 space-y-6 transition-all duration-300 w-full bg-transparent overflow-y-auto max-h-[calc(100vh-200px)]"
        style={{ paddingTop: messages.length > 0 ? '4rem' : '0' }}
      >
        {messages.length === 0 ? (
          <div className="flex justify-center items-center">
            <div className="text-center mx-auto">
              {/* Removing the placeholder text here to avoid duplication */}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end flex-row-reverse' : 'justify-start'} animate-fade-in`}
            >
              {message.role === 'assistant' && (
                <div className="glass-avatar mr-3 flex-shrink-0 flex items-end">
                  {/* Bot Icon - Modern Robot Head */}
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.15)" />
                    <g filter="url(#bot-glass)">
                      <rect x="10" y="16" width="20" height="14" rx="7" fill="#fff" fillOpacity="0.7" />
                      <rect x="15" y="12" width="10" height="8" rx="5" fill="#6366f1" fillOpacity="0.7" />
                      <circle cx="15.5" cy="23.5" r="2" fill="#6366f1" />
                      <circle cx="24.5" cy="23.5" r="2" fill="#6366f1" />
                      <rect x="17" y="27" width="6" height="2" rx="1" fill="#6366f1" fillOpacity="0.5" />
                      <rect x="19" y="8" width="2" height="6" rx="1" fill="#6366f1" fillOpacity="0.7" />
                      <circle cx="20" cy="7" r="2" fill="#fff" fillOpacity="0.7" stroke="#6366f1" strokeWidth="1" />
                    </g>
                    <defs>
                      <filter id="bot-glass" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur" />
                        <feBlend in="SourceGraphic" in2="effect1_backgroundBlur" mode="normal" />
                      </filter>
                    </defs>
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                {message.role === 'user' ? (
                  <div className="flex items-center gap-2 justify-end">
                    <p className="whitespace-pre-wrap text-white">{message.content}</p>
                    <span className="glass-avatar ml-3 flex-shrink-0 flex items-end">
                      {/* User Icon - Modern Silhouette */}
                      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.15)" />
                        <g filter="url(#user-glass)">
                          <circle cx="20" cy="16" r="6" fill="#fff" fillOpacity="0.7" />
                          <ellipse cx="20" cy="27" rx="8" ry="5" fill="#fff" fillOpacity="0.7" />
                          <circle cx="20" cy="16" r="4" fill="#6366f1" fillOpacity="0.7" />
                        </g>
                        <defs>
                          <filter id="user-glass" x="0" y="0" width="40" height="40" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in2="SourceAlpha" operator="in" result="effect1_backgroundBlur" />
                            <feBlend in="SourceGraphic" in2="effect1_backgroundBlur" mode="normal" />
                          </filter>
                        </defs>
                      </svg>
                    </span>
                  </div>
                ) : (
                  renderAssistantMessage(message)
                )}
              </div>
              {message.role === 'user' && null}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="message-bubble max-w-3xl rounded-2xl px-6 py-4 bg-Transparent">
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 p-[2px] rounded-full ${messages.length === 0 ? 'max-w-3xl w-full mx-auto flex justify-center' : ''}`}>
        <form onSubmit={handleSubmit} className={`relative flex items-center bg-[#0a1633] rounded-full overflow-hidden w-full ${messages.length === 0 ? 'px-6 py-2' : 'px-4 py-2'}`} style={{ minHeight: '56px' }}>
          {/* Upload Dataset Button */}
          <button
            type="button"
            onClick={onUploadClick}
            className="mr-3 rounded-full p-2 bg-transparent backdrop-blur-md text-white hover:bg-white/20 transition-colors relative z-10 shadow-lg focus:outline-none focus:ring-0"
            aria-label="Upload Dataset"
            title="Upload Dataset"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="How can I help you today?"
            className={`flex-1 bg-transparent border-none focus:border-transparent outline-none focus:ring-0 focus:outline-none ${messages.length === 0 ? 'text-lg' : 'text-lg'} text-white placeholder-gray-400 px-2 relative z-10`}
            disabled={isLoading}
          />
          {/* Microphone Button for Voice Input */}
          <button
            type="button"
            onClick={handleMicClick}
            className={`ml-2 rounded-full p-2.5 transition-all duration-200 focus:outline-none focus:ring-0 shadow-none border-none ${
              isListening 
                ? 'bg-red-500 text-white shadow-lg scale-105' 
                : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105 active:scale-95'
            } relative z-10`}
            aria-label={isListening ? 'Stop Listening' : 'Start Voice Input'}
            title={isListening ? 'Stop Listening' : 'Start Voice Input'}
            disabled={isLoading}
          >
            {isListening ? (
              // Google-style filled mic icon (listening)
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            ) : (
              // Google-style outlined mic icon (idle)
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`ml-3 rounded-full p-2 transition-colors ${!input.trim() || isLoading ? 'text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-white hover:bg-gray-600'} relative z-10`}
            aria-label="Send"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 20v-2l14-5-14-5V4l19 8-19 8z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
 