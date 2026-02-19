import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Film } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  onVideoSelect: (file: File, url: string) => void;
  onClose: () => void;
}

/**
 * Video upload dialog for selecting and loading video files
 */
export function VideoUploader({ onVideoSelect, onClose }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFile(file);
    } else {
      setError('Please drop a valid video file');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      setError('Video file is too large (max 500MB)');
      return;
    }

    // Create object URL for playback
    const url = URL.createObjectURL(file);
    onVideoSelect(file, url);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Upload Video</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={cn(
              'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-ring hover:bg-accent/50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
                isDragging ? 'bg-primary/20' : 'bg-muted'
              )}>
                <Upload className={cn(
                  'w-8 h-8',
                  isDragging ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {isDragging ? 'Drop video here' : 'Drag & drop video here'}
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse (MP4, WebM, max 500MB)
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Supported formats */}
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Film className="w-4 h-4" />
            <span>Supported formats: MP4, WebM, OGG, MOV</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
