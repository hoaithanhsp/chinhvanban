import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: LucideIcon;
  label: string;
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  icon: Icon, 
  label, 
  isLoading = false,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 text-sm md:text-base";
  
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 focus:ring-blue-500",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 shadow-sm focus:ring-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 focus:ring-red-500",
    ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        Icon && <Icon size={18} strokeWidth={2} />
      )}
      <span>{label}</span>
    </button>
  );
};

export default Button;