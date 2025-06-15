import { useState, useEffect } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { DatasetUpload } from './components/DatasetUpload';
import { getCurrentDataset } from './services/api';
import type { DatasetInfo } from './types/dataset';
import background1 from './assets/bg.png';
import logo from './assets/logo.png';
import chatbot1 from './assets/chatbot1.png';
import VisualizationPanel from './components/VisualizationPanel';

// Add this CSS animation at the top of the file after the imports
const styles = `
@keyframes slideRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-right {
  animation: slideRight 1s ease-out forwards;
}

@keyframes uploadModalIn {
  0% {
    opacity: 0;
    transform: scale(0.7) translateY(80px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-upload-modal {
  animation: uploadModalIn 0.4s cubic-bezier(0.4,0.2,0.2,1) forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-down {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

.animate-pulse-slow {
  animation: pulse 3s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 25%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 75%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 3s infinite;
}
`;

// Add the style tag right after the imports
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// Greeting Bar Component
function GreetingBar({ visible,}: { visible: boolean; onClose: () => void }) {
  return (
    <div 
      className={`fixed top-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-20 pointer-events-none'
      }`}
    >
      <div className="relative backdrop-blur-xl bg-black/10 shadow-2xl rounded-2xl px-8 py-4 flex items-center animate-fade-in-down max-w-xl w-full overflow-hidden">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 animate-shimmer pointer-events-none"></div>
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-50 pointer-events-none"></div>
        {/* Additional glass highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        <div className="flex items-center w-full justify-center relative z-10">
          <div className="text-white">
            <p className="font-medium text-center italic">Kia Ora! I'm <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">Quin</span>, an Intelligent Analytics Assistant that converts your natural language questions into SQL queries.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatasetInfoCard({ dataset }: { dataset: DatasetInfo }) {
  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow border border-gray-100 p-6 mb-6 mt-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Dataset Information</h2>
          <div className="text-sm text-gray-600">Rows: <b>{dataset.row_count}</b> &nbsp; | &nbsp; Columns: <b>{dataset.columns.length}</b></div>
        </div>
        <div className="text-xs text-gray-500 mt-2 md:mt-0">Uploaded: {dataset.created_at ? new Date(dataset.created_at).toLocaleString() : '-'}</div>
      </div>
      <div className="overflow-x-auto mt-2">
        <table className="min-w-full text-xs border rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Column Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
            </tr>
          </thead>
          <tbody>
            {dataset.columns.map((col, idx) => (
              <tr key={col.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 font-mono text-gray-900">{col.name}</td>
                <td className="px-3 py-2 text-gray-700">{col.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  const [, setGreetingIndex] = useState(0);
  const [userInputted, setUserInputted] = useState(false);
  const [showDatasetInfo, setShowDatasetInfo] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [lastData, setLastData] = useState<any[] | null>(null);
  const [showGreeting, setShowGreeting] = useState(true);

  const greetings = [
    "What's on your mind tonight?",
    "How can I assist you today?",
    "Ready to analyze your data?",
    "What would you like to know?",
    "Looking for data insights?",
  ];

  

  useEffect(() => {
  const loadDataset = async () => {
    try {
      const data = await getCurrentDataset();
      setDataset(data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error loading dataset:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };
    loadDataset();
  }, []);

  useEffect(() => {
    if (!userInputted) {
      const intervalId = setInterval(() => {
        setGreetingIndex(prevIndex => (prevIndex + 1) % greetings.length);
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [userInputted]);

  const handleDatasetUploaded = (newDataset: DatasetInfo) => {
    setDataset(newDataset);
    setShowUpload(false);
  };

  const handleMessagesChange = (hasMessages: boolean) => {
    setHasMessages(hasMessages);
    setUserInputted(hasMessages);
  };

  // Handler to trigger visualization from ChatInterface
  const handleVisualizeData = (data: any[]) => {
    setLastData(data);
    setShowVisualization(true);
  };

  // Handler to close visualization
  const handleCloseVisualization = () => {
    setShowVisualization(false);
  };

  return (
    <div className="h-screen relative">
      {/* Greeting Bar */}
      <GreetingBar visible={showGreeting && !hasMessages} onClose={() => setShowGreeting(false)} />
      
      {/* Background with blur */}
      <div 
        className="absolute inset-0 z-0" 
        style={{ 
          backgroundImage: `url(${background1})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundRepeat: 'no-repeat',
          filter: hasMessages ? 'blur(4px)' : 'none',
          transition: 'filter 0.3s ease-in-out'
        }}>
        <img src={chatbot1} alt="Chatbot" className="absolute top-1/1 right-[-3rem] h-auto w-1/2 z-0 drop-shadow-[0_0_24px_rgba(168,85,247,0.7)]" />
      </div>

      {/*
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
        {!hasMessages && particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-white/20 animate-float"
          style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.id * 0.1}s`,
              animationDuration: `${3 + particle.speed}s`,
            }}
          />
        ))}
      </div>
      */}

      {/* Header */}
      {!hasMessages && (
        <header className="relative z-10 w-full py-6 px-8 flex items-center" style={{ minHeight: '80px' }}>
          <div className="w-full max-w-7xl mx-auto flex items-center relative">
            {/* Logo */}
            <div className="flex items-center space-x-3 z-10">
              <img src={logo} alt="QuantAI Logo" className="h-16 w-auto shadow-lg" />
              <div>
                <h1 className="text-4xl font-semibold text-gray-200">QuantAI</h1>
              </div>
            </div>
            {/* Center Nav */}
            <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="backdrop-blur-xl bg-white/10 border border-white/30 shadow-2xl rounded-full">
                {/* Remove this entire <ul> block */}
              </div>
            </nav>
          </div>
        </header>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center h-screen px-4 pb-8">
        <main className={`w-full transition-all duration-500 ${hasMessages ? 'max-w-6xl' : 'max-w-4xl'} ${!hasMessages ? 'mt-0' : ''}`}>
          {/* Hero Section above chat input */}
          {!hasMessages && (
            <div className="text-center mb-40">
              <h1 className="text-5xl font-bold text-gray-300 mb-4 tracking-tight">
                Unlocking Actionable Intelligence from Natural Language —
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent inline-block animate-slide-right"> Powered by AI.</span>
              </h1>
            </div>
          )}
          {/* Chat Interface */}
          <div className={`transition-all duration-500 ${hasMessages ? 'bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6' : ''}
            ${showVisualization ? 'opacity-0 pointer-events-none translate-y-8' : 'opacity-100 pointer-events-auto translate-y-0'}
          `}>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-600 rounded-full animate-spin animation-delay-150"></div>
                </div>
              </div>
            ) : (
              <ChatInterface 
                onUploadClick={() => setShowUpload(true)} 
                onQueryExecute={async () => {}}
                onMessagesChange={handleMessagesChange}
                onVisualizeData={handleVisualizeData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating Toggle Button for Greeting */}
      {!hasMessages && (
        <div className="fixed top-6 right-6 z-50">
          <button
            onClick={() => setShowGreeting(prev => !prev)}
            className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-full p-3 text-gray-200 hover:bg-white/20 transition-all duration-300 group animate-pulse-slow focus:outline-none focus:ring-0 focus:border-white/20"
            title={showGreeting ? "Hide greeting" : "Show greeting"}
          >
            {/* Info icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="12" y1="8.5" x2="12" y2="8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Visualization Panel Modal */}
      {showVisualization && lastData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <VisualizationPanel
            data={lastData}
            onClose={handleCloseVisualization}
          />
        </div>
      )}

      {/* Modals */}
      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-xl shadow-2xl border-2 border-white/30 rounded-2xl max-w-2xl w-full mx-4 flex flex-col items-center justify-center animate-upload-modal">
            <div className="w-full flex flex-col items-center p-8">
              <div className="flex items-center justify-between w-full mb-8">
                <h3 className="text-2xl font-bold text-white">Upload Dataset</h3>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors bg-transparent shadow-none focus:outline-none focus:ring-0 hover:bg-transparent"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="w-full flex flex-col items-center">
                <DatasetUpload onDatasetUploaded={handleDatasetUploaded} />
              </div>
              <div className="flex flex-row gap-4 mt-6 w-full justify-center">
                {/* Action buttons are inside DatasetUpload */}
              </div>
              <button
                className="mt-6 px-6 py-3 rounded-full bg-white/10 text-white font-semibold shadow hover:bg-white/20 transition-colors whitespace-nowrap w-full max-w-xs"
                onClick={() => setShowDatasetInfo((prev) => !prev)}
                type="button"
              >
                Dataset Info
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dataset Info Full Width Modal */}
      {showDatasetInfo && dataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-2xl max-w-4xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDatasetInfo(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors bg-transparent shadow-none focus:outline-none focus:ring-0 hover:bg-transparent z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-8 w-full">
              <DatasetInfoCard dataset={dataset} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!hasMessages && (
        <footer className="absolute bottom-0 w-full py-4 text-center">
          <p className="text-gray-400 text-sm">
            Powered by <span className="text-gray-200 font-semibold">QuantAI</span>
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;
