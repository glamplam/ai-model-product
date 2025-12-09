import React, { useState, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Loader } from './components/Loader';
import { generateCompositeImage, editGeneratedImage } from './services/geminiService';
import { UploadedImage, AppStatus } from './types';
import { 
  Wand2, 
  Download, 
  RefreshCw, 
  MessageSquarePlus, 
  AlertCircle,
  Sparkles,
  UserCheck,
  Key,
  ArrowRight,
  Monitor,
  Smartphone,
  Square,
  RectangleHorizontal,
  RectangleVertical
} from 'lucide-react';

const PRESET_PROMPTS = [
  "Model sitting on a vintage chair wearing the product.",
  "Model walking down a city street wearing the product.",
  "Close-up portrait, holding the product near face.",
  "Model jumping joyfully wearing the product.",
  "Side profile shot wearing the product, dramatic lighting."
];

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", icon: Square },
  { label: "3:4", value: "3:4", icon: RectangleVertical },
  { label: "4:3", value: "4:3", icon: RectangleHorizontal },
  { label: "9:16", value: "9:16", icon: Smartphone },
  { label: "16:9", value: "16:9", icon: Monitor },
];

const App: React.FC = () => {
  // State
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [isIdxEnvironment, setIsIdxEnvironment] = useState<boolean>(false);
  
  const [modelImage, setModelImage] = useState<UploadedImage | null>(null);
  const [productImage, setProductImage] = useState<UploadedImage | null>(null);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  const [editPrompt, setEditPrompt] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");

  // Check for API Key or Environment on mount
  useEffect(() => {
    const checkEnvironment = async () => {
      // Check if we are in the specific Google IDX / AI Studio environment
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        setIsIdxEnvironment(true);
        const hasKey = await aiStudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } else {
        // We are on Vercel/Web. Check if env var was somehow baked in (rare) or wait for manual input
        if (process.env.API_KEY) {
          setHasApiKey(true);
        }
      }
    };
    checkEnvironment();
  }, []);

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      const success = await aiStudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleManualKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Strictly sanitize key: remove anything that isn't a letter, number, hyphen, or underscore
    // This fixes the "String contains non ISO-8859-1 code point" error
    const sanitizedKey = customApiKey.replace(/[^a-zA-Z0-9\-_]/g, '');
    
    setCustomApiKey(sanitizedKey);

    if (sanitizedKey.length > 10) {
      setHasApiKey(true);
      setErrorMessage(null);
    } else {
      setErrorMessage("Please enter a valid API Key (remove spaces or special characters).");
    }
  };

  const handleChangeKey = () => {
    setHasApiKey(false);
    setCustomApiKey("");
    setGeneratedImage(null);
  };

  const handleApiError = (err: any) => {
    setStatus(AppStatus.ERROR);
    let msg = err.message || "An error occurred";
    
    // Improve error messages for common issues
    if (JSON.stringify(err).includes("500") || msg.includes("Internal error")) {
      msg = "Server busy or prompt too complex. Please try again in a few seconds.";
    } else if (msg.includes("API Key is missing") || msg.includes("Requested entity was not found") || msg.includes("403")) {
      // Don't fully reset if it's just a momentary glitch, but provide feedback
      if (isIdxEnvironment) {
        setHasApiKey(false);
        msg = "Session expired or invalid key. Please reconnect.";
      } else {
         msg = "Invalid API Key or API error. Please check your key.";
         // Optional: Reset key state if it's definitely invalid, but let user read msg first
         // setHasApiKey(false);
      }
    }
    setErrorMessage(msg);
  };

  // Handlers
  const handleGenerate = async () => {
    if (!modelImage || !productImage) {
      setErrorMessage("Please upload both a model and a product image.");
      return;
    }

    setStatus(AppStatus.GENERATING);
    setErrorMessage(null);

    try {
      const finalPrompt = prompt.trim() || "Model wearing the product naturally in a professional studio setting.";
      // Pass customApiKey if set, otherwise service defaults to process.env
      const resultBase64 = await generateCompositeImage(
        modelImage.base64Data,
        modelImage.mimeType,
        productImage.base64Data,
        productImage.mimeType,
        finalPrompt,
        aspectRatio,
        customApiKey || undefined
      );
      setGeneratedImage(resultBase64);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleEdit = async () => {
    if (!generatedImage || !editPrompt.trim()) return;

    setStatus(AppStatus.GENERATING);
    setErrorMessage(null);

    try {
      const base64Part = generatedImage.split(',')[1];
      const resultBase64 = await editGeneratedImage(
        base64Part, 
        editPrompt,
        aspectRatio,
        customApiKey || undefined
      );
      setGeneratedImage(resultBase64);
      setEditPrompt(""); 
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      handleApiError(err);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `virtual-studio-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Landing Page: Key Selection
  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles size={40} className="text-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">Virtual Studio AI</h1>
            <p className="text-slate-400">Professional product composition using Gemini 3 Pro.</p>
          </div>

          {errorMessage && (
             <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded-lg border border-red-500/20">
               {errorMessage}
             </div>
          )}

          {isIdxEnvironment ? (
            /* Google IDX / AI Studio Environment */
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-sm text-slate-300">
                To use the high-quality image model, select your Google Cloud Project.
              </div>
              <button 
                onClick={handleSelectKey}
                className="w-full py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 group"
              >
                <Key size={20} className="group-hover:scale-110 transition-transform" />
                Connect Google Cloud Project
              </button>
            </div>
          ) : (
            /* Vercel / Public Web Environment Fallback */
            <form onSubmit={handleManualKeySubmit} className="space-y-4 text-left">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Enter Gemini API Key</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-3.5 text-slate-500" />
                  <input 
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Your key is used only in your browser to call Gemini directly.
                </p>
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                Start Studio <ArrowRight size={16} />
              </button>
            </form>
          )}

          <p className="text-xs text-slate-500">
            Get an API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">Google AI Studio</a>.
          </p>
        </div>
      </div>
    );
  }

  // Main App Interface
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Virtual Studio AI
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span className="hidden sm:block">Powered by Gemini 3 Pro</span>
            <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
            <button 
              onClick={isIdxEnvironment ? handleSelectKey : handleChangeKey} 
              className="hover:text-white transition-colors flex items-center gap-1.5"
            >
               <Key size={14} /> {isIdxEnvironment ? "Change Project" : "Change Key"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-200 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* LEFT COLUMN: Inputs */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Upload Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/20">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UploadIcon /> Assets
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <ImageUpload 
                  label="Model" 
                  image={modelImage} 
                  onImageUpload={setModelImage} 
                  onRemove={() => setModelImage(null)}
                />
                <ImageUpload 
                  label="Product" 
                  image={productImage} 
                  onImageUpload={setProductImage} 
                  onRemove={() => setProductImage(null)}
                />
              </div>
            </div>

            {/* Prompt Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl shadow-black/20 flex-1 flex flex-col">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wand2 size={20} className="text-indigo-400" /> Composition & Pose
              </h2>
              
              <div className="flex flex-col gap-3 mb-4">
                <label className="text-sm text-slate-400">Instructions</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the desired pose (e.g., 'Sitting on a bench', 'Running'). AI will adapt the model to this pose while wearing the product."
                  className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none resize-none text-slate-200 placeholder:text-slate-600 transition-all"
                />
              </div>

              {/* Aspect Ratio Selector - Refactored to Grid */}
              <div className="space-y-3 mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aspect Ratio</span>
                <div className="grid grid-cols-5 gap-2">
                  {ASPECT_RATIOS.map((ratio) => {
                    const Icon = ratio.icon;
                    const isSelected = aspectRatio === ratio.value;
                    return (
                      <button
                        key={ratio.value}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-xl border transition-all duration-200
                          ${isSelected 
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-500/10' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-700/50'
                          }`}
                        title={ratio.label}
                      >
                        <Icon size={18} />
                        <span className="text-[10px] font-medium">{ratio.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pose Presets</span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(p)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-slate-300 py-1.5 px-3 rounded-full transition-all text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={status === AppStatus.GENERATING || !modelImage || !productImage}
                className={`mt-auto w-full py-4 rounded-xl font-semibold text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all
                  ${status === AppStatus.GENERATING || !modelImage || !productImage
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/40 hover:scale-[1.02]'
                  }`}
              >
                {status === AppStatus.GENERATING ? (
                   <span className="animate-pulse">Processing...</span>
                ) : (
                  <>
                    <Sparkles size={18} /> Generate Studio Shot
                  </>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Results */}
          <div className="lg:col-span-8 flex flex-col h-full min-h-[500px]">
            <div className="relative flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col">
              
              {/* Canvas/Result Area */}
              <div className="flex-1 relative bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-slate-950 flex items-center justify-center p-8">
                
                {!generatedImage && status !== AppStatus.GENERATING && (
                  <div className="text-center space-y-4 max-w-md p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
                    <div className="w-20 h-20 mx-auto bg-slate-800 rounded-full flex items-center justify-center">
                      <UserCheck size={32} className="text-slate-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-300">Define Your Look</h3>
                    <p className="text-slate-500">Upload a model and product. Describe any pose you want - the AI will adapt the model to match.</p>
                  </div>
                )}

                {status === AppStatus.GENERATING && (
                  <Loader text="AI is adapting model pose & composition..." />
                )}

                {generatedImage && status !== AppStatus.GENERATING && (
                  <img 
                    src={generatedImage} 
                    alt="Generated Result" 
                    className="max-w-full max-h-[60vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-500"
                  />
                )}

                {/* Action Bar Overlay (only when image exists) */}
                {generatedImage && status !== AppStatus.GENERATING && (
                   <div className="absolute top-4 right-4 flex gap-2">
                     <button 
                       onClick={handleDownload}
                       className="bg-black/60 hover:bg-indigo-600/90 text-white p-2 rounded-lg backdrop-blur-md transition-all border border-white/10"
                       title="Download Image"
                     >
                       <Download size={20} />
                     </button>
                   </div>
                )}
              </div>

              {/* Editing/Refinement Bar */}
              {generatedImage && (
                <div className="p-4 bg-slate-800/50 backdrop-blur-sm border-t border-slate-700">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                        <MessageSquarePlus size={16} />
                        Refine with Text
                      </label>
                      <span className="text-xs text-slate-500">e.g., "Turn model to the left", "Change background to beach"</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                        placeholder="Describe changes (pose, lighting, background)..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none text-slate-200 placeholder:text-slate-600"
                      />
                      <button 
                        onClick={handleEdit}
                        disabled={status === AppStatus.GENERATING || !editPrompt.trim()}
                        className="bg-slate-700 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        {status === AppStatus.GENERATING ? (
                           <RefreshCw className="animate-spin" size={18} />
                        ) : (
                           "Edit"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

// Simple Icon helper
const UploadIcon = () => (
  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default App;