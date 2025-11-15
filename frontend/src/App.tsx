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
      className={`fixed top-4 sm:top-8 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-in-out px-4 w-full ${ // Added px-4 w-full
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-20 pointer-events-none'
      }`}
    >
      <div className="relative backdrop-blur-xl bg-black/10 shadow-2xl rounded-2xl px-4 py-3 sm:px-8 sm:py-4 flex items-center animate-fade-in-down max-w-xl w-full mx-auto overflow-hidden"> {/* Reduced padding px/py and added mx-auto */}
        {/* Shimmer overlay */}
        <div className="absolute inset-0 animate-shimmer pointer-events-none"></div>
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-xl opacity-50 pointer-events-none"></div>
        {/* Additional glass highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        <div className="flex items-center w-full justify-center relative z-10">
          <div className="text-white">
            {/* Reduced font size for mobile */}
            <p className="font-medium text-center italic text-sm sm:text-base">Kia Ora! I'm <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">Quant - Query</span>, an Intelligent Analytics Assistant that converts your natural language questions into SQL queries.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatasetInfoCard({ dataset }: { dataset: DatasetInfo }) {
  return (
    // Adjusted: Reduced margin-top on mobile, p-4 instead of p-6
    <div className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6 mt-4 sm:mt-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Dataset Information</h2> {/* Adjusted font size */}
          <div className="text-xs sm:text-sm text-gray-600">Rows: <b>{dataset.row_count}</b> &nbsp; | &nbsp; Columns: <b>{dataset.columns.length}</b></div> {/* Adjusted font size */}
        </div>
        <div className="text-xs text-gray-500 mt-2 md:mt-0">Uploaded: {dataset.created_at ? new Date(dataset.created_at).toLocaleString() : '-'}</div>
      </div>
      <div className="overflow-x-auto mt-2">
        <table className="min-w-full text-xs border rounded"> {/* Ensured text-xs is default */}
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Column Name</th> {/* Reduced padding */}
              <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th> {/* Reduced padding */}
            </tr>
          </thead>
          <tbody>
            {dataset.columns.map((col, idx) => (
              <tr key={col.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 font-mono text-gray-900">{col.name}</td> {/* Reduced padding */}
                <td className="px-3 py-2 text-gray-700">{col.type}</td> {/* Reduced padding */}
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
  const [uploadSuccess, setUploadSuccess] = useState(false);
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

  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => {
        setShowUpload(false);
      }, 2000); // Hide after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [uploadSuccess]);

  const handleDatasetUploaded = (newDataset: DatasetInfo) => {
    setDataset(newDataset);
    setUploadSuccess(true);
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
        {/* Adjusted: Scaled chatbot image down slightly for mobile, reduced negative right margin */}
        <img src={chatbot1} alt="Chatbot" className="absolute top-1/1 right-[-6rem] sm:right-[-3rem] h-auto w-2/3 sm:w-1/2 z-0 drop-shadow-[0_0_24px_rgba(168,85,247,0.7)]" />
      </div>

      {/* Header */}
      {!hasMessages && (
        // Adjusted: Reduced vertical padding on mobile
        <header className="relative z-10 w-full py-4 px-4 sm:py-6 sm:px-8 flex items-center" style={{ minHeight: '60px' }}>
          <div className="w-full max-w-7xl mx-auto flex items-center relative">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3 z-10">
              {/* Adjusted: Reduced logo size on mobile */}
              <img src={logo} alt="QuantAI Logo" className="h-10 w-auto sm:h-16 shadow-lg" />
              <div>
                {/* Adjusted: Reduced font size on mobile */}
                <h1 className="text-2xl sm:text-4xl font-semibold text-gray-200">QuantAI</h1>
              </div>
            </div>
            {/* Center Nav - Removed since it was empty, ensuring no layout issues */}
            <nav className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="backdrop-blur-xl bg-white/10 border border-white/30 shadow-2xl rounded-full">
              </div>
            </nav>
          </div>
        </header>
      )}

      {/* Main Content */}
      {/* Adjusted: Reduced horizontal padding on mobile */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center h-screen px-4 pb-8">
        {/* Adjusted: Max width is full width on mobile, max-w-6xl on desktop. */}
        <main className={`w-full transition-all duration-500 ${hasMessages ? 'max-w-6xl' : 'max-w-full sm:max-w-4xl'} ${!hasMessages ? 'mt-0' : ''}`}>
          {/* Hero Section above chat input */}
          {!hasMessages && (
            // Adjusted: Reduced margin-bottom on mobile, adjusted font sizes
            <div className="text-center mb-20 sm:mb-40 px-2">
              <h1 className="text-3xl sm:text-5xl font-bold text-gray-300 mb-2 sm:mb-4 tracking-tight">
                Unlocking Actionable Intelligence from Natural Language —
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent inline-block animate-slide-right"> Powered by AI.</span>
              </h1>
            </div>
          )}
          {/* Chat Interface Container */}
          <div className={`transition-all duration-500 ${hasMessages ? 'bg-gradient-to-br from-gray-900/50 to-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 sm:p-6' : ''}
            ${showVisualization ? 'opacity-0 pointer-events-none translate-y-8' : 'opacity-100 pointer-events-auto translate-y-0'}
          `}> {/* Reduced padding p-6 to p-4 */}
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
                // ChatInterface component should manage its own responsiveness
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating Toggle Button for Greeting */}
      {!hasMessages && (
        // Adjusted: Moved button to top-4 on mobile
        <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
          <button
            onClick={() => setShowGreeting(prev => !prev)}
            className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl rounded-full p-2 sm:p-3 text-gray-200 hover:bg-white/20 transition-all duration-300 group animate-pulse-slow focus:outline-none focus:ring-0 focus:border-white/20"
            title={showGreeting ? "Hide greeting" : "Show greeting"}
          > {/* Reduced padding on mobile */}
            {/* Info icon - size is fine */}
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
          {/* VisualizationPanel manages its own sizing */}
          <VisualizationPanel
            data={lastData}
            onClose={handleCloseVisualization}
          />
        </div>
      )}

      {/* Modals */}
      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"> {/* Added p-4 to prevent modal edge-to-edge on very small screens */}
          {/* Adjusted: Reduced max-w to max-w-lg on mobile, max-w-2xl on desktop. */}
          <div className="bg-white/10 backdrop-blur-xl shadow-2xl border-2 border-white/30 rounded-2xl max-w-lg sm:max-w-2xl w-full flex flex-col items-center justify-center animate-upload-modal">
            <div className="w-full flex flex-col items-center p-6 sm:p-8"> {/* Reduced padding p-8 to p-6 */}
              <div className="flex items-center justify-between w-full mb-6 sm:mb-8"> {/* Reduced margin-bottom */}
                <h3 className="text-xl sm:text-2xl font-bold text-white">Upload Dataset</h3> {/* Reduced font size */}
                <button
                  onClick={() => {
                    setShowUpload(false);
                    setUploadSuccess(false); // Reset on close
                  }}
                  className="text-gray-400 hover:text-gray-200 transition-colors bg-transparent shadow-none focus:outline-none focus:ring-0 hover:bg-transparent"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="w-full flex flex-col items-center">
                {/* DatasetUpload manages its own responsiveness */}
                <DatasetUpload 
                  onDatasetUploaded={handleDatasetUploaded} 
                  uploadSuccess={uploadSuccess}
                  setUploadSuccess={setUploadSuccess}
                />
              </div>
              <div className="flex flex-row gap-4 mt-6 w-full justify-center">
                {/* Action buttons are inside DatasetUpload */}
              </div>
              <button
                className="mt-6 px-4 py-2 rounded-full bg-white/10 text-white font-semibold shadow hover:bg-white/20 transition-colors whitespace-nowrap w-full max-w-xs text-sm" // Reduced padding and font size
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"> {/* Added p-4 */}
          {/* Reduced max-w to max-w-3xl on mobile, max-w-4xl on desktop. */}
          <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-2xl max-w-3xl sm:max-w-4xl w-full relative max-h-[95vh] overflow-y-auto">
            <button
              onClick={() => setShowDatasetInfo(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors bg-transparent shadow-none focus:outline-none focus:ring-0 hover:bg-transparent z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-4 sm:p-8 w-full"> {/* Reduced padding */}
              {/* DatasetInfoCard manages its own responsiveness */}
              <DatasetInfoCard dataset={dataset} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!hasMessages && (
        <footer className="absolute bottom-0 w-full py-4 text-center">
          <p className="text-gray-400 text-xs sm:text-sm"> {/* Reduced font size */}
            Powered by <span className="text-gray-200 font-semibold">QuantAI</span>
          </p>
        </footer>
      )}
    </div>
  );
}

export default App;