import React from 'react';
import { getStats } from '../services/textProcessor';

interface TextAreaCardProps {
  title: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  readOnly?: boolean;
  placeholder?: string;
  variant?: 'input' | 'output';
}

const TextAreaCard: React.FC<TextAreaCardProps> = ({
  title,
  value,
  onChange,
  readOnly = false,
  placeholder,
  variant = 'input'
}) => {
  const stats = getStats(value);
  const borderColor = variant === 'input' ? 'focus-within:border-gray-400' : 'focus-within:border-blue-500';
  const bgColor = readOnly ? 'bg-gray-50' : 'bg-white';

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          {variant === 'output' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
          {title}
        </h3>
        <div className="text-xs text-gray-400 font-medium">
          {stats.words} từ | {stats.chars} ký tự
        </div>
      </div>
      <div className={`flex-1 relative group ${bgColor}`}>
        <textarea
          className={`w-full h-full p-4 resize-none focus:outline-none bg-transparent font-mono text-gray-800 leading-relaxed ${readOnly ? 'cursor-text' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          spellCheck={false}
        />
      </div>
    </div>
  );
};

export default TextAreaCard;