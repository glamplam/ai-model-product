import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { UploadedImage } from '../types';

interface ImageUploadProps {
  label: string;
  image: UploadedImage | null;
  onImageUpload: (image: UploadedImage) => void;
  onRemove: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ label, image, onImageUpload, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // Extract base64 data part
      const base64Data = result.split(',')[1];
      
      onImageUpload({
        file,
        preview: result,
        base64Data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">{label}</span>
      
      {image ? (
        <div className="relative group w-full aspect-square rounded-xl overflow-hidden border border-slate-700 bg-slate-800">
          <img 
            src={image.preview} 
            alt={label} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
          />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="absolute top-2 right-2 bg-black/50 hover:bg-red-500/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-colors"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-white truncate">
            {image.file.name}
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="w-full aspect-square rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-800/50 hover:bg-slate-800 cursor-pointer flex flex-col items-center justify-center gap-3 transition-all group"
        >
          <div className="p-3 rounded-full bg-slate-700/50 group-hover:bg-indigo-500/20 text-slate-400 group-hover:text-indigo-400 transition-colors">
            <Upload size={24} />
          </div>
          <p className="text-sm text-slate-400 font-medium">Click to upload</p>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
        </div>
      )}
    </div>
  );
};