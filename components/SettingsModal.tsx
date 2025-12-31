import React, { useState, useEffect } from 'react';
import { MODELS } from '../services/aiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  setApiKey,
  selectedModel,
  setSelectedModel
}) => {
  const [tempKey, setTempKey] = useState(apiKey);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setTempKey(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    setApiKey(tempKey);
    localStorage.setItem('gemini_api_key', tempKey);
    localStorage.setItem('gemini_model', selectedModel);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-primary-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-teal-100 dark:border-primary-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-primary-800 bg-teal-50/50 dark:bg-primary-950/30 flex justify-between items-center">
          <h2 className="text-xl font-bold text-teal-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-600">settings</span>
            Cài đặt hệ thống
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Section 1: API Key */}
          <div className="space-y-4">
            <div className="flex justify-between items-baseline">
              <label className="text-sm font-bold text-teal-800 dark:text-teal-100 uppercase tracking-wider">
                Google Gemini API Key <span className="text-red-500">*</span>
              </label>
              <a 
                href="https://aistudio.google.com/api-keys" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1 hover:underline"
              >
                Lấy API Key tại đây <span className="material-symbols-outlined text-sm">open_in_new</span>
              </a>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="Dán mã API của bạn vào đây (bắt đầu bằng AIza...)"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-primary-950 border border-gray-200 dark:border-primary-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-teal-900 dark:text-teal-50 transition-all font-mono text-sm"
              />
              <button 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50 flex gap-3">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 shrink-0">info</span>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <p>Key được lưu trực tiếp trên trình duyệt của bạn (LocalStorage), máy chủ không thu thập thông tin này.</p>
                <a 
                  href="https://drive.google.com/drive/folders/1G6eiVeeeEvsYgNk2Om7FEybWf30EP1HN?usp=drive_link" 
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline hover:text-blue-600 inline-flex items-center gap-1 mt-1"
                >
                  Xem hướng dẫn lấy API Key chi tiết
                </a>
              </div>
            </div>
          </div>

          {/* Section 2: Model Selection */}
          <div className="space-y-4">
            <label className="text-sm font-bold text-teal-800 dark:text-teal-100 uppercase tracking-wider">
              Chọn Model Trí tuệ nhân tạo
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MODELS.map((model) => (
                <div 
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`
                    cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200
                    flex flex-col gap-2
                    ${selectedModel === model.id 
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/60 ring-1 ring-primary-500' 
                      : 'border-gray-100 dark:border-primary-700 bg-white dark:bg-primary-950 hover:border-primary-300 dark:hover:border-primary-600'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <span className={`font-bold text-sm ${selectedModel === model.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {model.name}
                    </span>
                    {selectedModel === model.id && (
                      <span className="material-symbols-outlined text-primary-600 text-lg">check_circle</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {model.desc}
                  </p>
                  {model.priority === 1 && (
                     <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                       DEFAULT
                     </div>
                  )}
                </div>
              ))}
            </div>
             <p className="text-xs text-gray-500 italic">
              * Hệ thống sẽ tự động chuyển sang các model khác nếu model đã chọn bị quá tải (Fallback mechanism).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-primary-950/50 border-t border-gray-100 dark:border-primary-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-primary-800 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSave}
            disabled={!tempKey}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg shadow-lg shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;