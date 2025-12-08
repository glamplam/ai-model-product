import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoaderProps {
  text?: string;
}

export const Loader: React.FC<LoaderProps> = ({ text = "Generating..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 animate-pulse">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
        <Sparkles className="w-12 h-12 text-indigo-400 animate-spin-slow" />
      </div>
      <p className="text-slate-300 font-medium text-lg">{text}</p>
    </div>
  );
};