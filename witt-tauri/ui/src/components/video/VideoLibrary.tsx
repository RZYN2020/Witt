import { useRef, useState } from 'react';
import { useVideoStore } from '@/stores/useVideoStore';
import { VideoUploader } from './VideoUploader';
import { VideoPlayer } from './VideoPlayer';
import { Upload, Subtitles, X } from 'lucide-react';

/**
 * 视频工作区：上传视频 + 加载字幕 + 使用 VideoPlayer 进行“看 & 抓取”
 */
export function VideoLibrary() {
  const [showUploader, setShowUploader] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentVideoFile, setCurrentVideoFile] = useState<File | null>(null);

  const subtitleInputRef = useRef<HTMLInputElement>(null);
  const { subtitles, loadSubtitles, setSubtitles } = useVideoStore();

  const handleVideoSelect = (file: File, url: string) => {
    setCurrentVideoFile(file);
    setCurrentVideoUrl(url);
    setShowUploader(false);
    // 切换视频时清空字幕，避免错配
    setSubtitles([]);
  };

  if (!currentVideoUrl) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Upload className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">上传视频</h2>
          <p className="text-muted-foreground mb-6">支持 MP4、WebM、OGG、MOV 格式（最大 500MB）</p>
          <button
            onClick={() => setShowUploader(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            选择视频文件
          </button>

          {showUploader && (
            <VideoUploader onVideoSelect={handleVideoSelect} onClose={() => setShowUploader(false)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black">
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10">
        <div className="text-sm text-white/80 truncate">
          {currentVideoFile?.name || '视频'}
          {subtitles.length > 0 ? (
            <span className="ml-2 text-xs text-white/60">（已加载字幕 {subtitles.length} 条）</span>
          ) : (
            <span className="ml-2 text-xs text-white/40">（未加载字幕）</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={subtitleInputRef}
            type="file"
            accept=".srt,.vtt,text/vtt,text/plain"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                await loadSubtitles(file);
              }
              // 允许重复选择同一个文件
              e.currentTarget.value = '';
            }}
          />

          <button
            onClick={() => subtitleInputRef.current?.click()}
            className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            title="加载字幕（SRT/VTT）"
          >
            <Subtitles className="w-4 h-4" />
            字幕
          </button>

          {subtitles.length > 0 && (
            <button
              onClick={() => setSubtitles([])}
              className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              title="清除字幕"
            >
              清除
            </button>
          )}

          <button
            onClick={() => setShowUploader(true)}
            className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            title="更换视频"
          >
            <Upload className="w-4 h-4" />
            视频
          </button>

          <button
            onClick={() => {
              setCurrentVideoUrl(null);
              setCurrentVideoFile(null);
              setSubtitles([]);
            }}
            className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            title="关闭视频"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 播放器 */}
      <div className="flex-1 p-4">
        <VideoPlayer src={currentVideoUrl} filename={currentVideoFile?.name} subtitles={subtitles} />
      </div>

      {/* 上传弹窗 */}
      {showUploader && (
        <VideoUploader onVideoSelect={handleVideoSelect} onClose={() => setShowUploader(false)} />
      )}
    </div>
  );
}

