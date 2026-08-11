import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { SyncBadge } from './SyncBadge';
import { motion } from 'motion/react';
import { Camera, Upload, X, Check, RotateCcw, AlertCircle, Loader2, Image as ImageIcon, ShieldAlert, Sparkles } from 'lucide-react';
import { uploadProfilePhotoToStorage } from '../lib/storageService';
import { firestoreService } from '../lib/firestoreService';

interface CameraProfileCaptureProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CameraProfileCapture: React.FC<CameraProfileCaptureProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile, showToast } = useApp();
  const { syncField, getFieldStatus, getFieldMessage } = useSyncStatus();

  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>('');

  // Start Camera Stream
  const startCamera = async () => {
    setErrorMsg(null);
    setCapturedImage(null);
    setSelectedFile(null);
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

  // Stop Camera Stream
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

  useEffect(() => {
    if (isOpen) {
      if (mode === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
      setCapturedImage(null);
      setSelectedFile(null);
      setErrorMsg(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);

  // Capture Frame from Camera
  const handleCapture = () => {
    if (!videoRef.current || !streamActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    const size = Math.min(video.videoWidth, video.videoHeight) || 300;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    setSelectedFile(null);
    stopCamera();
  };

  // Handle Device File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast("Please select a valid image file (JPG, PNG, WebP).", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Image file size exceeds 10MB limit.", "error");
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload to Firebase Storage & Update Profile
  const handleSavePhoto = async () => {
    if (!capturedImage && !selectedFile) return;
    if (!currentUser) return;

    setIsSaving(true);
    setUploadProgressMsg("Uploading to Firebase Storage...");

    try {
      const inputToUpload = selectedFile || capturedImage!;
      
      // Upload to Firebase Storage
      const storageUrl = await uploadProfilePhotoToStorage(currentUser.uid, inputToUpload);

      const requiresAdminApproval = currentUser.role === 'student' || currentUser.role === 'tutor';

      setUploadProgressMsg(requiresAdminApproval ? "Parking for Admin approval..." : "Saving photo profile...");

      await syncField('avatar', 'Save Profile Photo', async () => {
        if (requiresAdminApproval) {
          // Park changes in pendingPhotoURL
          await updateProfile({
            pendingPhotoURL: storageUrl
          });

          // Trigger alert for admin review
          await firestoreService.triggerNotification(
            currentUser.uid,
            "📸 Profile Photo Approval Requested",
            `Your profile photo upload has been saved to Firebase Storage and parked for Administrator approval.`,
            "announcement"
          );
        } else {
          // Admin directly updates active photoURL
          await updateProfile({
            photoURL: storageUrl,
            pendingPhotoURL: ""
          });
        }
      });

      if (requiresAdminApproval) {
        showToast("📸 Photo saved to Firebase Storage & parked for Admin approval!", "success");
      } else {
        showToast("Profile photo updated successfully!", "success");
      }

      setTimeout(() => {
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Error saving profile photo:", err);
      showToast("Failed to save photo: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsSaving(false);
      setUploadProgressMsg("");
    }
  };

  if (!isOpen) return null;

  const requiresApproval = currentUser?.role === 'student' || currentUser?.role === 'tutor';

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" id="profile_photo_capture_overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl relative font-sans space-y-4"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          disabled={isSaving}
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <span className="text-[9px] uppercase font-mono text-indigo-600 font-bold tracking-wider block">Firebase Storage Media Sync</span>
          <h3 className="text-base font-extrabold text-slate-900 mt-0.5">Update User Profile Photo</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Snap with your device camera or upload an image file from your device.
          </p>
        </div>

        {/* Tab Selector: Camera vs File Upload */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setMode('camera');
              setCapturedImage(null);
              setSelectedFile(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'camera'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>Device Camera</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('upload');
              stopCamera();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'upload'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Upload File</span>
          </button>
        </div>

        {/* Stage Container */}
        <div className="bg-slate-950 rounded-2xl aspect-square overflow-hidden relative flex items-center justify-center border border-slate-900 shadow-inner">
          {mode === 'camera' ? (
            errorMsg ? (
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
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {!streamActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <span>Accessing device camera stream...</span>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Upload Mode Stage */
            <div className="w-full h-full p-4 flex flex-col items-center justify-center relative">
              {capturedImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={capturedImage}
                    alt="File preview"
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      setSelectedFile(null);
                    }}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all bg-slate-900/50 hover:bg-slate-900/80"
                >
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 mb-3">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-slate-200">
                    Click to select image file from device
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Supports JPG, PNG, WEBP (Max 10MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Admin Approval Notice Banner for Students & Tutors */}
        {requiresApproval && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="font-extrabold text-amber-950">Admin Approval Required:</strong> New profile photos uploaded by {currentUser?.role === 'tutor' ? 'tutors' : 'students'} are saved to Firebase Storage and parked for Administrator review. Your live avatar will update once confirmed.
            </p>
          </div>
        )}

        {/* Sync status tracking indicator */}
        {getFieldStatus('avatar') !== 'idle' && (
          <div className="flex justify-center items-center py-2 bg-slate-50/50 rounded-xl border border-slate-100">
            <SyncBadge status={getFieldStatus('avatar')} message={getFieldMessage('avatar')} showText />
          </div>
        )}

        {/* Action Button Controls */}
        <div className="flex gap-2 pt-1">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (mode === 'camera') {
                    startCamera();
                  } else {
                    setCapturedImage(null);
                    setSelectedFile(null);
                  }
                }}
                className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4" /> {mode === 'camera' ? 'Retake' : 'Choose Other'}
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isSaving}
                className="w-1/2 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {uploadProgressMsg || 'Saving...'}
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
                className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                Cancel
              </button>
              {mode === 'camera' ? (
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!streamActive}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" /> Snap Photo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Upload className="w-4 h-4" /> Select File
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
