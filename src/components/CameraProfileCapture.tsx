import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { firestoreService } from '../lib/firestoreService';
import { optimizeImage } from '../lib/imageOptimizer';
import { SyncBadge } from './SyncBadge';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  RotateCcw, 
  AlertCircle, 
  Video, 
  Loader2, 
  Image as ImageIcon, 
  ShieldCheck, 
  Clock, 
  Sparkles,
  SwitchCamera,
  FolderOpen
} from 'lucide-react';

interface CameraProfileCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: UserProfile | null;
  onPhotoUpdated?: (result: { isPending: boolean; url: string }) => void;
}

export const CameraProfileCapture: React.FC<CameraProfileCaptureProps> = ({ 
  isOpen, 
  onClose, 
  targetUser, 
  onPhotoUpdated 
}) => {
  const { currentUser, showToast, refreshUserProfile } = useApp();
  const { syncField, getFieldStatus, getFieldMessage } = useSyncStatus();
  
  const activeUser = targetUser || currentUser;
  const userRole = activeUser?.role || 'student';
  const isAdmin = userRole === 'admin';

  // Mode: 'camera' | 'gallery'
  const [activeMode, setActiveMode] = useState<'camera' | 'gallery'>('camera');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  
  // Image selection state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileObj, setSelectedFileObj] = useState<File | Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check available video input devices
  const checkAvailableCameras = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }
    } catch (e) {
      console.warn("Could not enumerate media devices", e);
    }
  };

  // Start camera stream
  const startCamera = async () => {
    setErrorMsg(null);
    setSelectedImage(null);
    setSelectedFileObj(null);
    
    // Stop existing track if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 640 }, 
          facingMode: facingMode 
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
      checkAvailableCameras();
    } catch (err: any) {
      console.error("Camera access failed", err);
      setStreamActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg("Camera access denied. Please allow camera permissions in your browser or choose 'Upload from Gallery'.");
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMsg("No camera device detected on your hardware. Please use 'Upload from Gallery'.");
      } else {
        setErrorMsg("Camera initialization error: " + (err.message || "Unknown error"));
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

  // Switch between front/back camera
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
  };

  // Auto handle modal open / mode changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSelectedImage(null);
      setSelectedFileObj(null);
      setUploadProgress(0);
      if (activeMode === 'camera') {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode, facingMode]);

  // Capture frame from live video
  const handleCaptureFrame = () => {
    if (!videoRef.current || !streamActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    const size = Math.min(video.videoWidth, video.videoHeight) || 400;
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontal if front-facing for natural mirror selfie
    if (facingMode === 'user') {
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
    }

    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, startX, startY, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedImage(dataUrl);
    setSelectedFileObj(null);
    stopCamera();
  };

  // Handle gallery file selection
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg("Please select a valid image file (JPEG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Image size exceeds 10MB limit. Please choose a smaller image.");
      return;
    }

    setErrorMsg(null);
    try {
      const optimizedDataUrl = await optimizeImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.88
      });
      setSelectedImage(optimizedDataUrl);
      setSelectedFileObj(file);
    } catch (err: any) {
      console.warn("Image pre-processing issue:", err);
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(reader.result as string);
        setSelectedFileObj(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Save and upload directly to Firebase Storage with conditional approval
  const handleSavePhoto = async () => {
    if (!selectedImage || !activeUser) return;

    setIsSaving(true);
    setErrorMsg(null);
    setUploadProgress(15);

    try {
      await syncField('avatar', 'Upload & Save Profile Photo', async () => {
        // 1. Upload directly to Firebase Storage
        const uploadPayload = selectedFileObj || selectedImage;
        const uploadedStorageUrl = await firestoreService.uploadProfilePhoto(
          uploadPayload,
          activeUser.uid,
          userRole,
          (percent) => setUploadProgress(percent)
        );

        setUploadProgress(90);

        // 2. Submit photo change: Admin -> instant approval, Student/Tutor -> pending queue & private
        const result = await firestoreService.submitProfilePhotoChange(
          activeUser.uid,
          uploadedStorageUrl,
          userRole,
          activeUser.name || activeUser.username || 'User'
        );

        setUploadProgress(100);

        if (refreshUserProfile) {
          await refreshUserProfile();
        }

        if (result.isPending) {
          showToast(
            "📸 Profile picture uploaded to Firebase Storage and submitted for Admin verification. It will appear publicly once approved.",
            "info"
          );
        } else {
          showToast(
            "Profile picture updated and published instantly to your public profile!",
            "success"
          );
        }

        if (onPhotoUpdated) {
          onPhotoUpdated({
            isPending: result.isPending,
            url: uploadedStorageUrl
          });
        }
      });

      // Close modal after showing success state
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Save profile photo error:", err);
      setErrorMsg("Failed to save profile picture: " + (err.message || String(err)));
      showToast("Error updating profile photo: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    setSelectedImage(null);
    setSelectedFileObj(null);
    setErrorMsg(null);
    setUploadProgress(0);
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4" id="camera_gallery_capture_overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-100 shadow-2xl relative font-sans"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          disabled={isSaving}
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Role & Approval Context */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-mono text-indigo-600 font-extrabold tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">
              {userRole.toUpperCase()} AVATAR MANAGER
            </span>
            {isAdmin ? (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Instant Admin Auto-Approval
              </span>
            ) : (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" /> Requires Admin Verification to Show Public
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-extrabold text-slate-900 mt-1.5">
            Update Profile Picture
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Capture a live photo using your device camera or upload an image directly from your local gallery to Firebase Storage.
          </p>
        </div>

        {/* Selection Mode Switcher Tabs */}
        {!selectedImage && (
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveMode('camera')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'camera'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4" /> Live Camera
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('gallery')}
              className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeMode === 'gallery'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Gallery / Device Files
            </button>
          </div>
        )}

        {/* Main Stage Display */}
        <div className="bg-slate-950 rounded-2xl aspect-square overflow-hidden relative flex items-center justify-center border border-slate-900 mb-4 shadow-inner">
          {errorMsg && (
            <div className="p-6 text-center text-rose-200 text-xs flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-rose-500 animate-bounce" />
              <p className="font-semibold leading-relaxed max-w-xs">{errorMsg}</p>
              <div className="flex gap-2 mt-1">
                {activeMode === 'camera' && (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="text-xs bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-slate-700 transition-all cursor-pointer border border-slate-700"
                  >
                    Retry Camera
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setActiveMode('gallery');
                  }}
                  className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  Switch to Gallery
                </button>
              </div>
            </div>
          )}

          {!errorMsg && selectedImage && (
            <div className="w-full h-full relative group">
              <img
                src={selectedImage}
                alt="Selected avatar"
                className="w-full h-full object-cover animate-fade-in"
              />
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" /> Preview Selected Photo
              </div>
            </div>
          )}

          {!errorMsg && !selectedImage && activeMode === 'camera' && (
            <div className="w-full h-full relative">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {!streamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  <span>Connecting to secure device camera...</span>
                </div>
              )}
              {streamActive && hasMultipleCameras && (
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="absolute top-3 right-3 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-all border border-white/20 cursor-pointer"
                  title="Switch Camera (Front/Rear)"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {!errorMsg && !selectedImage && activeMode === 'gallery' && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                dragActive ? 'bg-indigo-950/80 border-2 border-dashed border-indigo-400' : 'hover:bg-slate-900/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-3 border border-indigo-500/30">
                <Upload className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-extrabold text-white">Choose Image from Device</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Click to browse files or drag and drop your photo here (PNG, JPG, WEBP up to 10MB)
              </p>
              <span className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                Select from Gallery
              </span>
            </div>
          )}
        </div>

        {/* Upload Progress bar if saving */}
        {isSaving && (
          <div className="mb-4 space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-indigo-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving to Firebase Storage...
              </span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Status Notice about Pending Approval for Students & Tutors */}
        {!isAdmin && (
          <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              <span className="font-bold">Public Image Policy:</span> For academic verification, photos from students and tutors are stored securely in a private pending queue. Your current active avatar remains visible until an administrator approves the new image.
            </p>
          </div>
        )}

        {/* Sync Status Badge */}
        {getFieldStatus('avatar') !== 'idle' && (
          <div className="flex justify-center items-center py-2 mb-3 bg-slate-50 rounded-xl border border-slate-100">
            <SyncBadge status={getFieldStatus('avatar')} message={getFieldMessage('avatar')} showText />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {selectedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4" /> Change / Retake
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isSaving}
                className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> 
                    {isAdmin ? 'Save & Publish Photo' : 'Submit for Admin Approval'}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                disabled={isSaving}
              >
                Cancel
              </button>
              
              {activeMode === 'camera' ? (
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  disabled={!streamActive}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" /> Snap Photo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <FolderOpen className="w-4 h-4" /> Browse Files
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
