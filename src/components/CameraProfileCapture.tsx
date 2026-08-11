import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { SyncBadge } from './SyncBadge';
import { motion } from 'motion/react';
import { Camera, X, Check, RotateCcw, AlertCircle, Video, Loader2 } from 'lucide-react';

interface CameraProfileCaptureProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CameraProfileCapture: React.FC<CameraProfileCaptureProps> = ({ isOpen, onClose }) => {
  const { updateProfile, showToast } = useApp();
  const { syncField, getFieldStatus, getFieldMessage } = useSyncStatus();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize and request camera stream
  const startCamera = async () => {
    setErrorMsg(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 400, height: 400, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.error("Camera access failed", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Camera access denied. Please enable camera permissions in your browser settings to capture a photo.");
      } else {
        setErrorMsg("Failed to access camera: " + (err.message || "Unknown error"));
      }
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  // Auto-start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Capture current frame from video stream to a canvas
  const handleCapture = () => {
    if (!videoRef.current || !streamActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Set 1:1 aspect ratio square for avatar image
    const size = Math.min(video.videoWidth, video.videoHeight) || 300;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center-crop video square onto canvas
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    // Convert to jpeg dataUrl
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  // Save base64 photo directly to user profile
  const handleSave = async () => {
    if (!capturedImage) return;
    setIsSaving(true);
    try {
      await syncField('avatar', 'Save Captured Profile Photo', async () => {
        await updateProfile({ photoURL: capturedImage });
      });
      showToast("Profile avatar updated successfully!", "success");
      // Delay so they can see the "Saved & Verified" status next to the button
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      showToast("Failed to save profile photo: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4" id="camera_capture_overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl relative font-sans"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          disabled={isSaving}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <span className="text-[9px] uppercase font-mono text-indigo-600 font-bold tracking-wider block">Live Capture</span>
          <h3 className="text-base font-extrabold text-slate-900 mt-1">Update Profile Photo</h3>
          <p className="text-xs text-slate-400 mt-1">Use your device camera to snap a custom high-quality student card avatar.</p>
        </div>

        {/* Camera Stage */}
        <div className="bg-slate-950 rounded-2xl aspect-square overflow-hidden relative flex items-center justify-center border border-slate-900 mb-5 shadow-inner">
          
          {errorMsg ? (
            <div className="p-6 text-center text-rose-200 text-xs flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-rose-500 animate-bounce" />
              <p className="font-semibold leading-relaxed">{errorMsg}</p>
              <button
                onClick={startCamera}
                className="mt-2 text-xs bg-slate-800 text-white font-bold px-4 py-2 rounded-xl hover:bg-slate-700 transition-all cursor-pointer border border-slate-750"
              >
                Retry Permission
              </button>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured avatar"
              className="w-full h-full object-cover animate-fade-in"
            />
          ) : (
            <div className="w-full h-full relative">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]" // mirror view for natural selfie feel
              />
              {!streamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span>Accessing secure camera stream...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync status tracking indicator */}
        {getFieldStatus('avatar') !== 'idle' && (
          <div className="flex justify-center items-center py-2.5 mb-3 bg-slate-50/50 rounded-xl border border-slate-100/55">
            <SyncBadge status={getFieldStatus('avatar')} message={getFieldMessage('avatar')} showText />
          </div>
        )}

        {/* Action Button Controls */}
        <div className="flex gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={startCamera}
                className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4" /> Retake Photo
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-1/2 py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Save Photo
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-650 hover:bg-slate-50 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={!streamActive}
                className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Capture Frame
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
