import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getStats } from './services/textProcessor';
import { handleDocxUpload, processAndDownloadDocx, createAndDownloadDocxFromText } from './services/docxService';
import { handlePdfUpload } from './services/pdfService';
import { fixTextWithAI, MODELS } from './services/aiService';
import SettingsModal from './components/SettingsModal';

function App() {
  const [originalText, setOriginalText] = useState('');
  const [correctedText, setCorrectedText] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // AI & Settings State
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [lastUsedModel, setLastUsedModel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File state
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<'docx' | 'pdf' | null>(null);
  
  // Loading states
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const inputStats = getStats(originalText);
  const outputStats = getStats(correctedText);

  // Initialize Theme & API Key
  useEffect(() => {
    // Theme
    const html = document.querySelector('html');
    if (isDarkMode) {
      html?.classList.add('dark');
      html?.classList.remove('light');
    } else {
      html?.classList.remove('dark');
      html?.classList.add('light');
    }

    // Load Settings
    const storedKey = localStorage.getItem('gemini_api_key');
    const storedModel = localStorage.getItem('gemini_model');
    
    if (storedKey) setApiKey(storedKey);
    if (storedModel) setSelectedModel(storedModel);
    
    // Auto open settings if no key
    if (!storedKey) {
      setTimeout(() => setIsSettingsOpen(true), 500);
    }
  }, [isDarkMode]);

  const handleProcess = useCallback(async () => {
    if (!originalText) return;
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }
    
    setIsFixing(true);
    setErrorMsg(null);
    setLastUsedModel(null);

    try {
      const result = await fixTextWithAI(originalText, apiKey, selectedModel);
      setCorrectedText(result.text);
      setLastUsedModel(result.modelUsed);
    } catch (err: any) {
      console.error("AI Processing Failed:", err);
      setErrorMsg(err.message || "Đã có lỗi xảy ra khi xử lý văn bản.");
      setCorrectedText(''); // Clear output on error
    } finally {
      setIsFixing(false);
    }
  }, [originalText, apiKey, selectedModel]);

  const handleCopy = useCallback(async () => {
    if (!correctedText) return;
    try {
      await navigator.clipboard.writeText(correctedText);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, [correctedText]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOriginalText(text);
    } catch (err) {
      console.error('Failed to read clipboard: ', err);
      alert('Không thể truy cập clipboard. Vui lòng cho phép quyền hoặc dán thủ công.');
    }
  }, []);

  const handleSwap = useCallback(() => {
    setOriginalText(correctedText);
    setCorrectedText(originalText);
  }, [correctedText, originalText]);

  const handleClear = useCallback(() => {
    setOriginalText('');
    setCorrectedText('');
    setDocxBuffer(null);
    setFileName('');
    setFileType(null);
    setErrorMsg(null);
    setLastUsedModel(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const onFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isDocx = file.name.endsWith('.docx');
    const isPdf = file.name.endsWith('.pdf');

    if (!isDocx && !isPdf) {
      alert('Vui lòng chỉ tải lên file Word (.docx) hoặc PDF (.pdf)');
      return;
    }

    try {
      setIsProcessingFile(true);
      setFileName(file.name);
      
      if (isDocx) {
        setFileType('docx');
        const { text, originalBuffer } = await handleDocxUpload(file);
        setOriginalText(text);
        setDocxBuffer(originalBuffer);
      } else if (isPdf) {
        setFileType('pdf');
        setDocxBuffer(null);
        const text = await handlePdfUpload(file);
        setOriginalText(text);
      }
      // Note: We don't auto-process with AI immediately to save quota/let user check text first
      
    } catch (error) {
      console.error(error);
      alert('Có lỗi khi đọc file');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleDownload = async () => {
    if (!fileName && !correctedText) return;
    const name = fileName || 'document.docx';
    
    try {
      if (fileType === 'docx' && docxBuffer) {
        // Warning: This DOCX injection is still based on regex logic in services/textProcessor used by docxService
        // Ideally we would rewrite docxService to use the AI result, but that's complex mapping.
        // For now, we will create a NEW fresh docx from the AI text if it's AI corrected.
        await createAndDownloadDocxFromText(correctedText, name);
      } else {
        await createAndDownloadDocxFromText(correctedText, name);
      }
    } catch (error) {
      alert('Có lỗi khi tạo file Word');
    }
  };

  return (
    <>
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-teal-200/80 dark:border-primary-800/80 glass-panel">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-teal-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <div className="relative flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-white to-teal-50 dark:from-primary-900 dark:to-primary-950 border border-teal-200 dark:border-primary-700 shadow-sm">
                <span className="material-symbols-outlined text-primary-600 dark:text-primary-400 text-2xl">auto_fix_high</span>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-teal-950 dark:text-white leading-tight">
                Viet<span className="text-primary-600 dark:text-primary-400">Correct</span>
              </h1>
              <span className="text-[10px] font-semibold tracking-wider text-teal-600 dark:text-teal-400 uppercase">Chuẩn hóa văn bản AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${!apiKey ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-white dark:bg-primary-900 border-teal-200 dark:border-primary-700 text-teal-700 dark:text-teal-300'}`}
             >
                <span className="material-symbols-outlined text-xl">settings</span>
                {!apiKey ? <span className="text-sm font-bold">Nhập API Key</span> : <span className="hidden sm:inline text-sm font-medium">Cài đặt</span>}
             </button>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg text-teal-600 hover:bg-teal-100 dark:text-teal-400 dark:hover:bg-primary-800 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-24 pb-8 px-4 md:px-6 lg:px-8 max-w-[1600px] mx-auto w-full gap-8">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-2">
          {!apiKey ? (
             <div 
               onClick={() => setIsSettingsOpen(true)}
               className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold border border-red-200 shadow-sm hover:bg-red-100 transition-colors"
             >
              <span className="material-symbols-outlined text-base">warning</span>
              Vui lòng nhập API Key để sử dụng App
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-semibold border border-primary-200 dark:border-primary-700/50 shadow-sm">
              <span className="material-symbols-outlined text-base">verified</span>
              Powered by Google Gemini
            </div>
          )}
          
          <h2 className="text-4xl md:text-5xl font-extrabold text-teal-950 dark:text-white tracking-tight leading-tight">
            Biến văn bản của bạn trở nên <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-800 dark:from-primary-400 dark:to-teal-200">chuyên nghiệp hơn</span>
          </h2>
          {fileName && (
              <div className="inline-block px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium border border-blue-100 dark:border-blue-800 mt-2">
                  Đang xử lý: {fileName}
              </div>
          )}
        </div>

        {/* Editor Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
          
          {/* Input Card */}
          <div className="flex flex-col group h-full">
            <div className="relative flex flex-col h-full bg-white dark:bg-primary-900 rounded-2xl border border-teal-200 dark:border-primary-700 shadow-card hover:shadow-card-hover transition-all duration-300 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-teal-100 dark:border-primary-800 bg-white dark:bg-primary-900 z-10">
                <div className="flex items-center gap-2 text-teal-500 dark:text-teal-400">
                  <span className="material-symbols-outlined text-xl">edit_note</span>
                  <span className="text-sm font-semibold text-teal-800 dark:text-teal-100">Văn bản gốc</span>
                </div>
                <button 
                  onClick={() => setOriginalText('')}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
                  title="Xóa nội dung"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                  Xóa
                </button>
              </div>
              <div className="relative flex-1">
                <textarea 
                  className="w-full h-full p-5 bg-transparent border-none resize-none focus:ring-0 text-base leading-7 text-teal-900 dark:text-teal-100 placeholder:text-teal-300 dark:placeholder:text-teal-600" 
                  id="input-text" 
                  placeholder="Nhập hoặc dán văn bản cần xử lý vào đây..."
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                />
              </div>
              <div className="px-4 py-3 bg-teal-50/50 dark:bg-primary-800/50 border-t border-teal-100 dark:border-primary-800 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-medium text-teal-600 dark:text-teal-400">
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-primary-800 border border-teal-200 dark:border-primary-700">
                    {inputStats.words} từ
                  </span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-primary-800 border border-teal-200 dark:border-primary-700">
                    {inputStats.chars} ký tự
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handlePaste}
                    className="text-primary-600 dark:text-primary-400 text-xs font-medium hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_paste</span> Dán
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={onFileUpload}
                    accept=".docx, .pdf"
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary-600 dark:text-primary-400 text-xs font-medium hover:underline flex items-center gap-1"
                  >
                     <span className="material-symbols-outlined text-sm">upload_file</span> {isProcessingFile ? 'Đang đọc...' : 'Tải file'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Output Card */}
          <div className="flex flex-col h-full">
            <div className={`relative flex flex-col h-full bg-teal-50/50 dark:bg-primary-900/50 rounded-2xl border transition-all duration-300 overflow-hidden ring-1 ${errorMsg ? 'border-red-300 bg-red-50/50 ring-red-200' : 'border-teal-200 dark:border-primary-700 ring-emerald-500/10 dark:ring-emerald-500/20 shadow-card hover:shadow-card-hover'}`}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-teal-100 dark:border-primary-800 bg-white/50 dark:bg-primary-900/50 z-10">
                <div className={`flex items-center gap-2 ${errorMsg ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-500'}`}>
                  <span className="material-symbols-outlined text-xl">{errorMsg ? 'error' : 'check_circle'}</span>
                  <span className="text-sm font-semibold text-teal-800 dark:text-teal-100">
                    {errorMsg ? 'Đã dừng do lỗi' : 'Kết quả'}
                  </span>
                </div>
                {lastUsedModel && !errorMsg && (
                    <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                        {MODELS.find(m => m.id === lastUsedModel)?.name || lastUsedModel}
                    </span>
                )}
                <button 
                  onClick={handleCopy}
                  disabled={!!errorMsg || !correctedText}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-50" 
                  title="Sao chép kết quả"
                >
                  <span className="material-symbols-outlined text-base">content_copy</span>
                  Sao chép
                </button>
              </div>
              
              <div className="relative flex-1 bg-white/40 dark:bg-primary-900/40">
                {errorMsg ? (
                    <div className="w-full h-full p-5 text-red-600 font-mono text-sm overflow-auto">
                        <p className="font-bold mb-2">Lỗi từ API:</p>
                        {errorMsg}
                    </div>
                ) : (
                    <textarea 
                    className="w-full h-full p-5 bg-transparent border-none resize-none focus:ring-0 text-base leading-7 text-teal-900 dark:text-teal-100 cursor-default placeholder:text-teal-400" 
                    id="output-text" 
                    placeholder="Văn bản đã chuẩn hóa sẽ hiển thị tại đây..." 
                    readOnly
                    value={correctedText}
                    />
                )}
                
                {isFixing && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-primary-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-medium text-teal-800 dark:text-teal-200 animate-pulse">Đang xử lý thông minh...</p>
                    </div>
                )}
              </div>

              <div className="px-4 py-3 bg-emerald-50/30 dark:bg-emerald-900/10 border-t border-emerald-100/50 dark:border-emerald-900/20 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-medium text-teal-600 dark:text-teal-400">
                  <span className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${errorMsg ? 'bg-red-500' : 'bg-emerald-400'}`}></span> {outputStats.words} từ
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${errorMsg ? 'bg-red-500' : 'bg-emerald-400'}`}></span> {outputStats.chars} ký tự
                  </span>
                </div>
                <div className="flex items-center gap-3">
                    {correctedText && !errorMsg && (
                        <button 
                            onClick={handleDownload}
                            className="text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">download</span> Tải về .docx
                        </button>
                    )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Floating Action Bar */}
        <div className="sticky bottom-8 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 p-1.5 bg-white dark:bg-primary-800 rounded-2xl shadow-xl shadow-teal-900/10 dark:shadow-black/30 border border-teal-200 dark:border-primary-600 ring-1 ring-teal-900/5 transition-transform hover:-translate-y-1 duration-300">
            <button 
              onClick={handleClear}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-primary-700 dark:hover:text-teal-100 transition-colors" 
              title="Xóa tất cả"
            >
              <span className="material-symbols-outlined text-xl">restart_alt</span>
            </button>
            <div className="w-px h-6 bg-teal-200 dark:bg-primary-600 mx-1"></div>
            <button 
              onClick={handleSwap}
              disabled={!!errorMsg}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-primary-700 dark:hover:text-teal-100 transition-colors disabled:opacity-50" 
              title="Hoán đổi"
            >
              <span className="material-symbols-outlined text-xl rotate-90 sm:rotate-0">swap_horiz</span>
            </button>
            <button 
              onClick={handleProcess}
              disabled={isFixing || !originalText}
              className={`group relative flex items-center gap-2 px-6 h-12 bg-teal-900 dark:bg-primary-600 hover:bg-teal-800 dark:hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-teal-900/20 dark:shadow-primary-600/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed`}
            >
              {isFixing ? (
                  <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                  <span className="material-symbols-outlined group-hover:animate-pulse">auto_fix_high</span>
              )}
              <span>{isFixing ? 'Đang xử lý...' : 'Sửa lỗi ngay'}</span>
              {!isFixing && originalText && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>
            <button 
              onClick={handleCopy}
              disabled={!correctedText || !!errorMsg}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-teal-600 hover:text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-primary-700 dark:hover:text-teal-100 transition-colors disabled:opacity-50" 
              title="Sao chép"
            >
              <span className="material-symbols-outlined text-xl">content_copy</span>
            </button>
          </div>
        </div>

      </main>

      {/* Features Section */}
      <section className="border-t border-teal-200 dark:border-primary-800 bg-white/60 dark:bg-primary-900/30 py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="group p-6 rounded-2xl bg-teal-50 dark:bg-primary-800/50 hover:bg-white dark:hover:bg-primary-800 border border-transparent hover:border-teal-200 dark:hover:border-primary-600 hover:shadow-xl hover:shadow-teal-200/20 dark:hover:shadow-none transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-2xl">psychology</span>
            </div>
            <h3 className="font-bold text-lg text-teal-950 dark:text-teal-100 mb-2">Trí tuệ nhân tạo</h3>
            <p className="text-teal-600 dark:text-teal-400 text-sm leading-relaxed">Sử dụng Google Gemini (3.0 & 2.5) để phân tích ngữ cảnh và sửa lỗi chính xác hơn quy tắc thông thường.</p>
          </div>
          <div className="group p-6 rounded-2xl bg-teal-50 dark:bg-primary-800/50 hover:bg-white dark:hover:bg-primary-800 border border-transparent hover:border-teal-200 dark:hover:border-primary-600 hover:shadow-xl hover:shadow-teal-200/20 dark:hover:shadow-none transition-all duration-300">
             <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-2xl">bolt</span>
            </div>
            <h3 className="font-bold text-lg text-teal-950 dark:text-teal-100 mb-2">Cơ chế Fallback</h3>
            <p className="text-teal-600 dark:text-teal-400 text-sm leading-relaxed">Tự động chuyển đổi giữa các model (Flash/Pro) nếu gặp sự cố quá tải, đảm bảo quá trình xử lý liên tục.</p>
          </div>
          <div className="group p-6 rounded-2xl bg-teal-50 dark:bg-primary-800/50 hover:bg-white dark:hover:bg-primary-800 border border-transparent hover:border-teal-200 dark:hover:border-primary-600 hover:shadow-xl hover:shadow-teal-200/20 dark:hover:shadow-none transition-all duration-300">
             <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4 group-hover:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-2xl">format_list_bulleted</span>
            </div>
            <h3 className="font-bold text-lg text-teal-950 dark:text-teal-100 mb-2">Chuẩn hóa Format</h3>
            <p className="text-teal-600 dark:text-teal-400 text-sm leading-relaxed">Xử lý thông minh các gạch đầu dòng, dấu câu và viết hoa tiêu đề dựa trên hiểu biết ngữ nghĩa.</p>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 text-center text-teal-600 dark:text-teal-400/60 text-sm font-medium border-t border-teal-100 dark:border-primary-800/50 bg-white/50 dark:bg-primary-950/50">
         <p>Phát triển bởi thầy <span className="text-primary-600 dark:text-primary-400 font-bold">Trần Hoài Thanh</span></p>
      </footer>

      {/* Toast */}
      <div className={`fixed bottom-24 md:bottom-10 right-1/2 translate-x-1/2 md:translate-x-0 md:right-10 z-50 transform transition-all duration-500 ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3 bg-teal-900 dark:bg-white text-white dark:text-teal-950 px-5 py-3.5 rounded-xl shadow-2xl border border-white/10 dark:border-teal-200">
          <span className="material-symbols-outlined text-emerald-400 dark:text-emerald-600">check_circle</span>
          <div className="flex flex-col">
            <span className="text-sm font-bold">Thành công!</span>
            <span className="text-xs text-teal-300 dark:text-teal-600">Văn bản đã được sao chép.</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;