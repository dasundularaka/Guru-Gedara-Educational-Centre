import React, { useState, useMemo } from 'react';
import { 
  X, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Download, 
  Copy, 
  Check, 
  Video, 
  FileText, 
  Link as LinkIcon, 
  Globe, 
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { StudyMaterial } from '../types';
import { binaryStore } from '../lib/binaryStore';

interface ResourceEmbedViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: StudyMaterial | null;
}

export const ResourceEmbedViewerModal: React.FC<ResourceEmbedViewerModalProps> = ({
  isOpen,
  onClose,
  material
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const embedInfo = useMemo(() => {
    if (!material) return { type: 'unknown', url: '', isDirectEmbeddable: false };

    const rawUrl = (material.referenceUrl || '').trim();

    // Check if YouTube
    const ytMatch = rawUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return {
        type: 'youtube',
        url: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
        isDirectEmbeddable: true,
        provider: 'YouTube Video Player'
      };
    }

    // Check if Vimeo
    const vimeoMatch = rawUrl.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/i);
    if (vimeoMatch && vimeoMatch[3]) {
      return {
        type: 'vimeo',
        url: `https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`,
        isDirectEmbeddable: true,
        provider: 'Vimeo Player'
      };
    }

    // Check if Google Drive preview / view
    if (rawUrl.includes('drive.google.com')) {
      let previewUrl = rawUrl;
      if (rawUrl.includes('/view')) {
        previewUrl = rawUrl.replace(/\/view.*$/, '/preview');
      } else if (!rawUrl.includes('/preview')) {
        previewUrl = `${rawUrl}/preview`;
      }
      return {
        type: 'gdrive',
        url: previewUrl,
        isDirectEmbeddable: true,
        provider: 'Google Drive Document'
      };
    }

    // Check if Google Docs / Sheets / Slides
    if (rawUrl.includes('docs.google.com')) {
      let previewUrl = rawUrl;
      if (!previewUrl.includes('embedded=true')) {
        const sep = previewUrl.includes('?') ? '&' : '?';
        previewUrl = `${previewUrl}${sep}embedded=true`;
      }
      return {
        type: 'gdocs',
        url: previewUrl,
        isDirectEmbeddable: true,
        provider: 'Google Workspace Document'
      };
    }

    // Check if direct PDF
    if (rawUrl.toLowerCase().endsWith('.pdf') || (rawUrl.includes('/pdf') && !rawUrl.startsWith('indexeddb://'))) {
      return {
        type: 'pdf',
        url: rawUrl,
        isDirectEmbeddable: true,
        provider: 'PDF Document Viewer'
      };
    }

    // Check if local binaryStore (indexeddb or data url)
    if (rawUrl.startsWith('indexeddb://') || rawUrl.startsWith('data:')) {
      return {
        type: 'stored_file',
        url: rawUrl,
        isDirectEmbeddable: false,
        provider: 'Academy Stored File'
      };
    }

    // Standard web URL
    return {
      type: 'web',
      url: rawUrl,
      isDirectEmbeddable: true,
      provider: 'Web Link / Interactive Resource'
    };
  }, [material]);

  if (!isOpen || !material) return null;

  const handleCopyLink = () => {
    if (!material.referenceUrl) return;
    navigator.clipboard.writeText(material.referenceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    binaryStore.openOrDownload(material);
  };

  return (
    <div 
      className="fixed inset-0 z-[120] overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 transition-all duration-300"
      id={`resource_embed_viewer_modal_${material.id}`}
    >
      <div 
        className={`bg-slate-900 border border-slate-700/80 shadow-2xl rounded-3xl flex flex-col transition-all duration-300 overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none fixed inset-0 z-[130]' 
            : 'w-full max-w-5xl h-[88vh] max-h-[900px]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-xl text-white font-bold shrink-0 ${
              material.type === 'video' ? 'bg-purple-600' :
              material.type === 'file' ? 'bg-emerald-600' : 'bg-indigo-600'
            }`}>
              {material.type === 'video' ? <Video className="w-4 h-4" /> :
               material.type === 'file' ? <FileText className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white truncate max-w-xs sm:max-w-md md:max-w-lg" title={material.title}>
                  {material.title}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-800 text-indigo-300 border border-slate-700 shrink-0">
                  {embedInfo.provider}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-md">
                {material.description || material.referenceUrl}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {material.referenceUrl && !material.referenceUrl.startsWith('indexeddb://') && (
              <button
                onClick={handleCopyLink}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Copy direct resource link"
                id="btn_copy_resource_link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            {material.storagePath || material.fileName || material.referenceUrl?.startsWith('indexeddb://') ? (
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Download file"
                id="btn_download_resource_file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            ) : null}

            {material.referenceUrl && !material.referenceUrl.startsWith('indexeddb://') && (
              <a
                href={material.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Open resource in new tab"
                id="btn_open_external_resource"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Tab</span>
              </a>
            )}

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              id="btn_fullscreen_toggle_resource"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer ml-1"
              title="Close viewer"
              id="btn_close_resource_viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded Body Content */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center">
          {embedInfo.isDirectEmbeddable ? (
            <div className="w-full h-full relative">
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-slate-400">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-300">Loading embedded resource content...</p>
                  <p className="text-[11px] text-slate-500 mt-1">Connecting to {embedInfo.provider}</p>
                </div>
              )}

              <iframe
                src={embedInfo.url}
                title={material.title}
                className="w-full h-full border-0 bg-white"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setIframeError(true);
                }}
              />

              {/* In case the external site prevents iframe embedding due to X-Frame-Options */}
              <div className="absolute bottom-3 right-3 z-20">
                <a
                  href={material.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold border border-slate-700/80 shadow-lg backdrop-blur-md flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3 h-3 text-indigo-400" />
                  <span>Can't view embed? Open in New Window</span>
                </a>
              </div>
            </div>
          ) : (
            /* Non-embeddable or Stored document view card */
            <div className="p-8 max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl text-center shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                {material.fileName?.toLowerCase().endsWith('.pdf') ? (
                  <FileText className="w-8 h-8" />
                ) : material.type === 'video' ? (
                  <Video className="w-8 h-8" />
                ) : (
                  <Globe className="w-8 h-8" />
                )}
              </div>

              <h4 className="text-base font-extrabold text-white mb-2">{material.title}</h4>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                {material.description || 'This course resource is ready for viewing and downloading.'}
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleDownload}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                  id="btn_download_modal_action"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Open Document ({material.fileName || 'Resource'})</span>
                </button>

                {material.referenceUrl && !material.referenceUrl.startsWith('indexeddb://') && (
                  <a
                    href={material.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all"
                    id="btn_open_external_modal_action"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Launch Resource in Browser Tab</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info Strip */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span className="font-mono text-slate-500 truncate max-w-xs sm:max-w-md">
            Source: {material.referenceUrl}
          </span>
          <span className="font-mono text-indigo-400 font-bold">
            Academy Resource Hub
          </span>
        </div>
      </div>
    </div>
  );
};
