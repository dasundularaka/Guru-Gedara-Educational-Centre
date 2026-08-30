import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  Download, 
  QrCode, 
  RotateCw, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  GraduationCap, 
  Phone, 
  Check, 
  Copy, 
  Layers, 
  BadgeCheck,
  Building2,
  BookOpen,
  FileDown,
  Briefcase,
  Award,
  Crown
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { UserProfile, ClassItem, Booking } from '../types';

interface DigitalStudentIDCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  enrolledClasses?: ClassItem[];
  bookings?: Booking[];
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onOpenPhotoUpload?: () => void;
}

type CardTheme = 'navy' | 'indigo' | 'emerald' | 'obsidian' | 'crimson';
type ViewMode = 'single_flip' | 'dual_side' | 'printable_sheet';

export const DigitalStudentIDCardModal: React.FC<DigitalStudentIDCardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  enrolledClasses = [],
  bookings = [],
  showToast,
  onOpenPhotoUpload
}) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>(
    currentUser.role === 'admin' ? 'obsidian' : currentUser.role === 'tutor' ? 'emerald' : 'navy'
  );
  const [viewMode, setViewMode] = useState<ViewMode>('single_flip');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const printableSheetRef = useRef<HTMLDivElement>(null);
  const exportFrontRef = useRef<HTMLDivElement>(null);
  const exportBackRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const role = currentUser.role || 'student';
  const rawId = currentUser.username || currentUser.uid || 'USER';
  
  // Format formatted card ID based on role
  let formattedId = rawId;
  let roleTitle = 'Digital Student Identity Pass';
  let roleHeader = 'Official Digital Student ID Card';
  let roleBadge = currentUser.isFreeCard ? 'Free Card Scholar' : 'Active Scholar';

  if (role === 'tutor') {
    formattedId = rawId.startsWith('GT') || rawId.startsWith('TUT') ? rawId : `TUT-${rawId.toUpperCase()}`;
    roleTitle = 'Faculty & Tutor Identity Pass';
    roleHeader = 'Official Faculty & Tutor ID Card';
    roleBadge = 'Accredited Faculty';
  } else if (role === 'admin') {
    formattedId = rawId.startsWith('GA') || rawId.startsWith('ADM') ? rawId : `ADM-${rawId.toUpperCase()}`;
    roleTitle = 'Executive Administration Identity Pass';
    roleHeader = 'Official Executive Admin ID Card';
    roleBadge = 'Executive Administration';
  } else {
    formattedId = rawId.startsWith('GB') || rawId.startsWith('STU') ? rawId : `STU-${rawId.toUpperCase()}`;
    roleTitle = 'Digital Student Identity Pass';
    roleHeader = 'Official Digital Student ID Card';
    roleBadge = currentUser.isFreeCard ? 'Free Card Scholar' : 'Active Scholar';
  }

  const studentGrade = currentUser.studentDetails?.grade || 'Grade 11 - Advanced Level';
  const admissionDateStr = currentUser.createdAt 
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Aug 2025';
  const validityPeriod = '2025 / 2026';

  // Extract enrolled course & subject names
  const enrolledSubjectNames = Array.from(
    new Set([
      ...enrolledClasses.map(c => c.subject || c.title),
      ...bookings.filter(b => b.status === 'active').map(b => b.classTitle),
      ...(currentUser.tutorDetails?.subjects || [])
    ])
  ).filter(Boolean);

  const displayCourses = enrolledSubjectNames.length > 0
    ? enrolledSubjectNames
    : role === 'tutor' 
      ? ['Combined Mathematics', 'Advanced Physics']
      : ['Combined Mathematics', 'Advanced Physics', 'Chemistry', 'Information Technology'];

  // Theme styling definitions
  const themeStyles: Record<CardTheme, {
    id: CardTheme;
    name: string;
    bgGradient: string;
    accentColor: string;
    accentBg: string;
    accentBorder: string;
    headerBg: string;
    badgeBg: string;
    glow: string;
    watermarkColor: string;
  }> = {
    navy: {
      id: 'navy',
      name: 'Royal Navy & Gold',
      bgGradient: 'from-slate-950 via-slate-900 to-indigo-950',
      accentColor: 'text-amber-400',
      accentBg: 'bg-amber-400/15',
      accentBorder: 'border-amber-400/40',
      headerBg: 'bg-slate-900/90',
      badgeBg: 'bg-amber-400 text-slate-950',
      glow: 'shadow-[0_10px_35px_rgba(30,58,138,0.25)]',
      watermarkColor: 'text-amber-400/10'
    },
    indigo: {
      id: 'indigo',
      name: 'Modern Indigo',
      bgGradient: 'from-indigo-950 via-slate-900 to-violet-950',
      accentColor: 'text-indigo-300',
      accentBg: 'bg-indigo-500/15',
      accentBorder: 'border-indigo-400/40',
      headerBg: 'bg-indigo-950/90',
      badgeBg: 'bg-indigo-500 text-white',
      glow: 'shadow-[0_10px_35px_rgba(79,70,229,0.25)]',
      watermarkColor: 'text-indigo-400/10'
    },
    emerald: {
      id: 'emerald',
      name: 'Faculty Emerald',
      bgGradient: 'from-slate-950 via-emerald-950 to-slate-900',
      accentColor: 'text-emerald-400',
      accentBg: 'bg-emerald-500/15',
      accentBorder: 'border-emerald-400/40',
      headerBg: 'bg-emerald-950/90',
      badgeBg: 'bg-emerald-400 text-slate-950',
      glow: 'shadow-[0_10px_35px_rgba(5,150,105,0.25)]',
      watermarkColor: 'text-emerald-400/10'
    },
    obsidian: {
      id: 'obsidian',
      name: 'Obsidian Platinum',
      bgGradient: 'from-slate-950 via-zinc-900 to-black',
      accentColor: 'text-slate-200',
      accentBg: 'bg-slate-100/10',
      accentBorder: 'border-slate-400/30',
      headerBg: 'bg-zinc-900/90',
      badgeBg: 'bg-slate-200 text-slate-950',
      glow: 'shadow-[0_10px_35px_rgba(0,0,0,0.4)]',
      watermarkColor: 'text-white/10'
    },
    crimson: {
      id: 'crimson',
      name: 'Executive Crimson',
      bgGradient: 'from-rose-950 via-slate-950 to-red-950',
      accentColor: 'text-rose-400',
      accentBg: 'bg-rose-500/15',
      accentBorder: 'border-rose-400/40',
      headerBg: 'bg-rose-950/90',
      badgeBg: 'bg-rose-500 text-white',
      glow: 'shadow-[0_10px_35px_rgba(225,29,72,0.25)]',
      watermarkColor: 'text-rose-400/10'
    }
  };

  const currentTheme = themeStyles[selectedTheme] || themeStyles.navy;

  const handleCopyId = () => {
    navigator.clipboard.writeText(formattedId);
    setCopiedId(true);
    showToast(`ID '${formattedId}' copied to clipboard!`, 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to capture DOM node as image safely with fallbacks
  const captureNode = async (node: HTMLElement): Promise<string> => {
    try {
      return await toPng(node, {
        quality: 0.98,
        pixelRatio: 2,
        cacheBust: true,
        skipAutoScale: true,
        backgroundColor: '#0f172a'
      });
    } catch (err) {
      console.warn('Standard toPng capture failed, trying relaxed config', err);
      return await toPng(node, {
        pixelRatio: 1.5,
        cacheBust: true
      });
    }
  };

  // Download high-resolution PNG front card
  const handleDownloadFront = async () => {
    const targetNode = exportFrontRef.current || frontCardRef.current;
    if (!targetNode) return;
    setIsExporting(true);
    try {
      const dataUrl = await captureNode(targetNode);
      const link = document.createElement('a');
      link.download = `Gurugedara_ID_Front_${formattedId}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Front ID Card downloaded in high resolution!', 'success');
    } catch (err) {
      console.error('Failed to export front card', err);
      showToast('Could not export front card image. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Download high-resolution PNG back card
  const handleDownloadBack = async () => {
    const targetNode = exportBackRef.current || backCardRef.current;
    if (!targetNode) return;
    setIsExporting(true);
    try {
      const dataUrl = await captureNode(targetNode);
      const link = document.createElement('a');
      link.download = `Gurugedara_ID_Back_${formattedId}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Back ID Card downloaded in high resolution!', 'success');
    } catch (err) {
      console.error('Failed to export back card', err);
      showToast('Could not export back card image. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Download entire printable badge sheet PNG
  const handleDownloadSheet = async () => {
    if (!printableSheetRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await captureNode(printableSheetRef.current);
      const link = document.createElement('a');
      link.download = `Gurugedara_ID_Print_Sheet_${formattedId}.png`;
      link.href = dataUrl;
      link.click();
      showToast('Printable badge sheet downloaded in high resolution!', 'success');
    } catch (err) {
      console.error('Failed to export printable sheet', err);
      showToast('Could not export printable sheet.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Download standalone QR code pass
  const handleDownloadQrOnly = () => {
    const canvas = document.getElementById('digital_id_qr_canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Gurugedara_QR_Pass_${formattedId}.png`;
      link.href = url;
      link.click();
      showToast('Attendance verification QR pass downloaded successfully!', 'success');
    } else {
      showToast('QR Canvas not ready. Please try again.', 'error');
    }
  };

  // Implement Download-as-PDF function using jsPDF
  const handleDownloadPdf = async () => {
    const targetFront = exportFrontRef.current || frontCardRef.current;
    const targetBack = exportBackRef.current || backCardRef.current;
    if (!targetFront || !targetBack) return;
    setIsPdfGenerating(true);
    try {
      const frontDataUrl = await captureNode(targetFront);
      const backDataUrl = await captureNode(targetBack);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Header Banner
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 28, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GURUGEDARA HIGHER EDUCATION INSTITUTE', pageWidth / 2, 11, { align: 'center' });

      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(251, 191, 36); // amber-400
      pdf.text(`OFFICIAL ${role.toUpperCase()} IDENTITY CARD • VALID ${validityPeriod}`, pageWidth / 2, 17, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(203, 213, 225); // slate-300
      pdf.text(`Name: ${currentUser.name}  |  ID: ${formattedId}  |  Role: ${role.toUpperCase()}`, pageWidth / 2, 23, { align: 'center' });

      // Verification & Usage Notice
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(14, 33, pageWidth - 28, 22, 2, 2, 'FD');

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('OFFLINE IDENTIFICATION & GATE VERIFICATION NOTICE:', 18, 39);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text('• Present this digital pass on your mobile device or print on cardstock for lecture hall gate verification.', 18, 44);
      pdf.text('• The high-density QR token is cryptographically synced with the Gurugedara attendance logging system.', 18, 48);
      if (role === 'student') {
        pdf.text('• Enrolled Courses: ' + displayCourses.slice(0, 4).join(', '), 18, 52);
      } else if (role === 'tutor') {
        pdf.text(`• Faculty Subjects: ${currentUser.tutorDetails?.subjects?.join(', ') || 'Academic Faculty'}`, 18, 52);
      } else {
        pdf.text('• Authorization: Tier-1 Executive Academy Administration Clearance', 18, 52);
      }

      // Standard scaled card dimensions
      const cardWidth = 135; // mm
      const cardHeight = (cardWidth / 1.58); // ~85.4 mm
      const posX = (pageWidth - cardWidth) / 2;

      // 3. Add Front Card Image
      const frontY = 60;
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`1. FRONT SIDE (${role.toUpperCase()} IDENTITY & CHECK-IN QR)`, posX, frontY - 2);

      pdf.addImage(frontDataUrl, 'PNG', posX, frontY, cardWidth, cardHeight, undefined, 'FAST');

      // 4. Add Back Card Image
      const backY = frontY + cardHeight + 12;
      pdf.text('2. BACK SIDE (CREDENTIALS & EMERGENCY REGISTRY)', posX, backY - 2);

      pdf.addImage(backDataUrl, 'PNG', posX, backY, cardWidth, cardHeight, undefined, 'FAST');

      // 5. Cut & Fold Guide lines
      pdf.setDrawColor(148, 163, 184);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.rect(posX - 2, frontY - 1, cardWidth + 4, cardHeight * 2 + 15, 'D');

      // Footer
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.text('Gurugedara Higher Education Institute • Registrar Office: +94 11 234 5678 • portal: www.gurugedara.edu.lk', pageWidth / 2, pageHeight - 8, { align: 'center' });

      pdf.save(`Gurugedara_ID_${role}_${formattedId}.pdf`);
      showToast('Digital ID Card PDF generated and saved for offline use!', 'success');
    } catch (err) {
      console.error('Failed to generate ID Card PDF', err);
      showToast('Could not generate PDF. Please try again.', 'error');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Avatar Photo fallback URL
  const avatarFallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name || 'User')}`;
  const userPhoto = currentUser.photoURL || avatarFallback;

  // Render Front Side of ID Card
  const renderFrontCard = (forPrint = false) => (
    <div
      ref={frontCardRef}
      id="digital_id_card_front"
      className={`relative w-full max-w-[480px] aspect-[1.58/1] rounded-2xl overflow-hidden text-white border ${
        forPrint ? 'border-slate-800 shadow-none' : `${currentTheme.accentBorder} ${currentTheme.glow}`
      } bg-gradient-to-br ${currentTheme.bgGradient} p-3 sm:p-4 md:p-5 flex flex-col justify-between select-none shadow-xl`}
      style={{
        boxShadow: forPrint ? 'none' : undefined
      }}
    >
      {/* Background Decorative Guilloche & Watermark */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full border-[12px] border-white/10" />
        <div className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full border-[6px] border-white/10" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl sm:text-8xl font-black tracking-widest text-white/5 whitespace-nowrap rotate-[-25deg]">
          GURUGEDARA
        </div>
      </div>

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-1.5 sm:pb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md border border-amber-300 shrink-0">
            {role === 'admin' ? (
              <Crown className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-slate-950" />
            ) : role === 'tutor' ? (
              <Briefcase className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-slate-950" />
            ) : (
              <GraduationCap className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-slate-950" />
            )}
          </div>
          <div>
            <h3 className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-white leading-tight font-sans">
              Gurugedara Higher Education
            </h3>
            <p className={`text-[7.5px] sm:text-[9px] font-mono font-bold tracking-widest uppercase ${currentTheme.accentColor}`}>
              {roleTitle}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] font-mono font-black uppercase tracking-wider bg-white/10 border border-white/20 text-slate-200">
            VALID PASS
          </span>
        </div>
      </div>

      {/* Main Body: Photo, Info, Courses/Faculty & Scannable QR */}
      <div className="relative z-10 grid grid-cols-12 gap-2 sm:gap-3 items-center my-auto py-1">
        {/* Photo Column */}
        <div className="col-span-4 flex flex-col items-center">
          <div className="relative group">
            <div className="w-14 h-18 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-lg bg-slate-800 relative">
              <img
                src={userPhoto}
                alt={currentUser.name}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs py-0.5 text-center">
                <span className="text-[6px] sm:text-[7px] font-mono uppercase text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                  <ShieldCheck className="w-2 sm:w-2.5 h-2 sm:h-2.5 inline" /> Verified
                </span>
              </div>
            </div>
            {/* Holographic Seal Badge */}
            <div className="absolute -bottom-1 -right-1 sm:-bottom-1.5 sm:-right-1.5 w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 rounded-full bg-gradient-to-tr from-amber-300 via-amber-100 to-amber-400 border border-amber-200 shadow-md flex items-center justify-center text-slate-950">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-900" />
            </div>
          </div>
          <span className="text-[7.5px] sm:text-[9px] font-mono font-bold text-slate-300 mt-1 truncate max-w-[100px] sm:max-w-[110px]">
            ID: <span className="text-white font-black">{formattedId}</span>
          </span>
        </div>

        {/* Info Column */}
        <div className="col-span-5 space-y-0.5 sm:space-y-1 text-left">
          <div>
            <span className="text-[6.5px] sm:text-[7.5px] font-mono uppercase text-slate-400 tracking-wider block">
              {role === 'tutor' ? 'Faculty Lecturer' : role === 'admin' ? 'Administrative Staff' : 'Student Name'}
            </span>
            <h4 className="text-[11px] sm:text-xs md:text-sm font-black text-white leading-tight tracking-tight line-clamp-1">
              {currentUser.name}
            </h4>
          </div>

          <div>
            <span className="text-[6.5px] sm:text-[7px] font-mono uppercase text-slate-400 tracking-wider block">
              {role === 'tutor' ? 'Academic Department' : role === 'admin' ? 'Executive Division' : 'Academic Stream'}
            </span>
            <p className="text-[8.5px] sm:text-[10px] font-bold text-slate-200 truncate">
              {role === 'tutor' 
                ? (currentUser.tutorDetails?.qualification || 'Senior Faculty') 
                : role === 'admin' 
                  ? 'Operations & Governance' 
                  : studentGrade}
            </p>
          </div>

          {/* Role-Specific Showcase */}
          {role === 'student' && (
            <div>
              <span className="text-[6.5px] sm:text-[7px] font-mono uppercase text-amber-300 tracking-wider flex items-center gap-1 font-bold">
                <BookOpen className="w-2 sm:w-2.5 h-2 sm:h-2.5" /> Enrolled Courses ({displayCourses.length})
              </span>
              <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-0.5 max-h-7 sm:max-h-9 overflow-hidden">
                {displayCourses.slice(0, 3).map((course, idx) => (
                  <span 
                    key={idx}
                    className="px-1 sm:px-1.5 py-0.2 text-[6.5px] sm:text-[7.5px] font-bold bg-white/10 border border-white/15 rounded text-slate-100 truncate max-w-[90px] sm:max-w-[110px]"
                  >
                    {course}
                  </span>
                ))}
                {displayCourses.length > 3 && (
                  <span className="px-1 py-0.2 text-[6px] sm:text-[6.5px] font-bold bg-amber-400/20 text-amber-300 rounded">
                    +{displayCourses.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {role === 'tutor' && (
            <div>
              <span className="text-[6.5px] sm:text-[7px] font-mono uppercase text-emerald-300 tracking-wider flex items-center gap-1 font-bold">
                <Award className="w-2 sm:w-2.5 h-2 sm:h-2.5" /> Specialization
              </span>
              <p className="text-[7.5px] sm:text-[8.5px] text-slate-200 font-medium truncate">
                {currentUser.tutorDetails?.subjects?.join(', ') || 'Mathematics & Sciences'}
              </p>
            </div>
          )}

          {role === 'admin' && (
            <div>
              <span className="text-[6.5px] sm:text-[7px] font-mono uppercase text-rose-300 tracking-wider flex items-center gap-1 font-bold">
                <ShieldCheck className="w-2 sm:w-2.5 h-2 sm:h-2.5" /> Clearance Level
              </span>
              <p className="text-[7.5px] sm:text-[8.5px] text-slate-200 font-medium">
                Level-1 Full System Authorization
              </p>
            </div>
          )}

          <div className="flex items-center gap-1 pt-0.5">
            <span className={`px-1 sm:px-1.5 py-0.5 rounded text-[6.5px] sm:text-[7px] font-bold font-mono uppercase tracking-wider ${currentTheme.badgeBg}`}>
              {roleBadge}
            </span>
            <span className="text-[6.5px] sm:text-[7px] font-mono text-slate-400">
              Iss: {admissionDateStr}
            </span>
          </div>
        </div>

        {/* QR Code Column */}
        <div className="col-span-3 flex flex-col items-center justify-center text-center">
          <div className="p-1 sm:p-1.5 bg-white rounded-xl shadow-md border border-white/30">
            <QRCodeCanvas
              id="digital_id_qr_canvas"
              value={formattedId}
              size={58}
              level="H"
              includeMargin={false}
            />
          </div>
          <span className="text-[6px] sm:text-[7px] font-mono uppercase tracking-widest text-slate-300 mt-1 font-bold">
            {role === 'admin' ? 'Security Gate' : 'Scan for Entry'}
          </span>
        </div>
      </div>

      {/* Footer Strip with Barcode styling & Microtext */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-1 sm:pt-1.5 text-[6.5px] sm:text-[7.5px] font-mono text-slate-400">
        <div className="flex items-center gap-1">
          <div className="h-3 sm:h-3.5 flex items-center gap-0.5 bg-white/90 px-1 rounded-xs">
            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 3].map((w, i) => (
              <span key={i} className="h-2 sm:h-2.5 bg-slate-950 inline-block" style={{ width: `${w}px` }} />
            ))}
          </div>
          <span className="text-[6px] sm:text-[7px] text-slate-400 tracking-tight hidden sm:inline">
            SECURE VERIFICATION TOKEN
          </span>
        </div>

        <div className="flex items-center gap-1 text-[7px] sm:text-[8px] text-slate-300 font-bold">
          <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-400" />
          <span>GURUGEDARA ACADEMY</span>
        </div>
      </div>
    </div>
  );

  // Render Back Side of ID Card
  const renderBackCard = (forPrint = false) => (
    <div
      ref={backCardRef}
      id="digital_id_card_back"
      className={`relative w-full max-w-[480px] aspect-[1.58/1] rounded-2xl overflow-hidden text-white border ${
        forPrint ? 'border-slate-800 shadow-none' : `${currentTheme.accentBorder} ${currentTheme.glow}`
      } bg-gradient-to-br ${currentTheme.bgGradient} p-3 sm:p-4 md:p-5 flex flex-col justify-between select-none shadow-xl`}
      style={{
        boxShadow: forPrint ? 'none' : undefined
      }}
    >
      {/* Background Decorative */}
      <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden">
        <div className="absolute -left-12 -top-12 w-64 h-64 rounded-full border-[10px] border-white/10" />
        <div className="absolute right-1/4 bottom-1/4 text-6xl sm:text-7xl font-black text-white/5 rotate-[15deg]">
          VERIFIED
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-1 sm:pb-1.5">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <BadgeCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
          <h4 className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider text-white">
            {role === 'tutor' ? 'Faculty Registry & Credentials' : role === 'admin' ? 'Executive Governance Registry' : 'Academic Courses & Emergency Registry'}
          </h4>
        </div>
        <span className="text-[7px] sm:text-[8px] font-mono text-slate-400 font-bold">
          REF #{formattedId}
        </span>
      </div>

      {/* Body */}
      <div className="relative z-10 grid grid-cols-2 gap-2 sm:gap-2.5 my-auto py-1 text-[7.5px] sm:text-[8.5px]">
        {/* Left Column: Contact info */}
        <div className="space-y-1 sm:space-y-1.5 bg-white/5 p-1.5 sm:p-2.5 rounded-xl border border-white/10">
          {role === 'student' ? (
            <>
              <div>
                <span className="text-[6px] sm:text-[7px] font-mono uppercase text-slate-400 block font-bold">Guardian / Emergency Contact</span>
                <p className="text-[8.5px] sm:text-[10px] font-bold text-white leading-tight">
                  {currentUser.guardianName || currentUser.studentDetails?.parentContact || 'Registered Guardian'}
                </p>
                <p className="text-[7.5px] sm:text-[9px] text-slate-300 font-mono flex items-center gap-1 mt-0.5">
                  <Phone className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-amber-400 inline" />
                  {currentUser.guardianPhone || currentUser.phone || '+94 77 123 4567'}
                </p>
              </div>
              <div className="pt-1 border-t border-white/10">
                <span className="text-[6px] sm:text-[7px] font-mono uppercase text-slate-400 block font-bold">Linked Parent Email</span>
                <p className="text-[7.5px] sm:text-[9px] text-slate-200 truncate font-mono">
                  {currentUser.parentEmail || currentUser.email}
                </p>
                {currentUser.isParentEmailLinked && (
                  <span className="text-[6px] sm:text-[7px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
                    <CheckCircle2 className="w-2 h-2 inline" /> Auto-CC Active
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <span className="text-[6px] sm:text-[7px] font-mono uppercase text-slate-400 block font-bold">Official Communications</span>
                <p className="text-[8.5px] sm:text-[10px] font-bold text-white leading-tight truncate">
                  {currentUser.email}
                </p>
                <p className="text-[7.5px] sm:text-[9px] text-slate-300 font-mono flex items-center gap-1 mt-0.5">
                  <Phone className="w-2 sm:w-2.5 h-2 sm:h-2.5 text-amber-400 inline" />
                  {currentUser.phone || '+94 11 234 5678'}
                </p>
              </div>
              <div className="pt-1 border-t border-white/10">
                <span className="text-[6px] sm:text-[7px] font-mono uppercase text-slate-400 block font-bold">Institutional Status</span>
                <span className="text-[7px] sm:text-[7.5px] text-emerald-300 font-mono font-bold flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" /> Authorized Faculty
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Roles & Terms */}
        <div className="space-y-1 bg-white/5 p-1.5 sm:p-2.5 rounded-xl border border-white/10 flex flex-col justify-between">
          <div>
            <span className="text-[6px] sm:text-[7px] font-mono uppercase text-amber-300 block font-bold mb-0.5 sm:mb-1 flex items-center gap-1">
              <BookOpen className="w-2 sm:w-2.5 h-2 sm:h-2.5" /> 
              {role === 'tutor' ? 'Faculty Courses' : role === 'admin' ? 'Supervisory Access' : 'Enrolled Courses'}
            </span>
            <div className="flex flex-col gap-0.5 max-h-14 sm:max-h-16 overflow-y-auto pr-0.5">
              {displayCourses.slice(0, 4).map((sub, i) => (
                <div
                  key={i}
                  className="px-1 sm:px-1.5 py-0.5 rounded bg-white/10 text-white font-medium text-[6.5px] sm:text-[7.5px] flex items-center justify-between"
                >
                  <span className="truncate max-w-[100px] sm:max-w-[120px]">▸ {sub}</span>
                  <span className="text-[6px] sm:text-[6.5px] text-amber-300 font-mono">ACTIVE</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-1 border-t border-white/10 text-[6.5px] sm:text-[7.5px] text-slate-300 flex items-center justify-between">
            <span>Issue: <strong className="font-mono text-white">{admissionDateStr}</strong></span>
            <span className="truncate max-w-[80px]">Colombo, LK</span>
          </div>
        </div>
      </div>

      {/* Card Terms & Authorization Signature */}
      <div className="relative z-10 border-t border-white/15 pt-1 sm:pt-1.5 flex items-center justify-between text-[6px] sm:text-[7px] text-slate-400 font-sans">
        <p className="max-w-[240px] sm:max-w-[270px] leading-tight text-slate-300">
          Official property of Gurugedara Higher Education Institute. Valid for examination entry, lab access, and live QR gate check-in.
        </p>

        <div className="text-center pl-1 sm:pl-2">
          <div className="font-serif italic text-amber-300 text-[8.5px] sm:text-[10px] font-bold leading-none select-none tracking-wider">
            D. Wickramasinghe
          </div>
          <span className="text-[5px] sm:text-[6px] uppercase font-mono tracking-widest text-slate-400 block mt-0.5 border-t border-white/20 pt-0.5">
            Registrar Directorate
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-fade-in font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Modal Header */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                {role === 'admin' ? (
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                ) : role === 'tutor' ? (
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                ) : (
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-tight">
                    {roleHeader}
                  </h3>
                  <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] sm:text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Verified
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  Gurugedara Higher Education Institute • Valid {validityPeriod}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls & Configuration Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs overflow-x-auto">
              <button
                onClick={() => setViewMode('single_flip')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[36px] ${
                  viewMode === 'single_flip'
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                id="btn_id_mode_flip"
              >
                <RotateCw className="w-3.5 h-3.5" /> Interactive 3D
              </button>
              <button
                onClick={() => setViewMode('dual_side')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[36px] ${
                  viewMode === 'dual_side'
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                id="btn_id_mode_dual"
              >
                <Layers className="w-3.5 h-3.5" /> Dual-Sided
              </button>
              <button
                onClick={() => setViewMode('printable_sheet')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[36px] ${
                  viewMode === 'printable_sheet'
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                id="btn_id_mode_sheet"
              >
                <Printer className="w-3.5 h-3.5" /> Print Sheet
              </button>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[11px] font-bold text-slate-500 font-mono hidden sm:inline">Theme:</span>
              {(Object.keys(themeStyles) as CardTheme[]).map((themeKey) => {
                const t = themeStyles[themeKey];
                return (
                  <button
                    key={themeKey}
                    onClick={() => setSelectedTheme(themeKey)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer min-h-[32px] ${
                      selectedTheme === themeKey
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                    title={t.name}
                  >
                    {t.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Main Body */}
          <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-slate-100/50 dark:bg-slate-950/40">
            {/* 1. Interactive 3D Flip View */}
            {viewMode === 'single_flip' && (
              <div className="flex flex-col items-center justify-center py-2 space-y-4">
                <div className="relative group max-w-[480px] w-full px-2 sm:px-0">
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    style={{ transformStyle: 'preserve-3d' }}
                    className="relative w-full aspect-[1.58/1] cursor-pointer"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <div
                      style={{ backfaceVisibility: 'hidden' }}
                      className="absolute inset-0 w-full h-full"
                    >
                      {renderFrontCard()}
                    </div>

                    <div
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                      }}
                      className="absolute inset-0 w-full h-full"
                    >
                      {renderBackCard()}
                    </div>
                  </motion.div>
                </div>

                {/* Flip control prompt */}
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer min-h-[44px]"
                    id="btn_flip_id_card"
                  >
                    <RotateCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Flip to {isFlipped ? 'Front Side' : 'Back Side'}
                  </button>
                  <button
                    onClick={handleCopyId}
                    className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
                    title="Copy Unique ID"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    {formattedId}
                  </button>
                </div>
              </div>
            )}

            {/* 2. Dual Side View (Side by Side) */}
            {viewMode === 'dual_side' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center justify-items-center">
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      <span>Front Side (Identity, Photo & QR)</span>
                      <button
                        onClick={handleDownloadFront}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Save Front PNG
                      </button>
                    </div>
                    {renderFrontCard()}
                  </div>

                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      <span>Back Side (Registry & Emergency Contact)</span>
                      <button
                        onClick={handleDownloadBack}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Save Back PNG
                      </button>
                    </div>
                    {renderBackCard()}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Printable Sheet View */}
            {viewMode === 'printable_sheet' && (
              <div className="space-y-4">
                <div 
                  ref={printableSheetRef} 
                  className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="text-center border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-black uppercase text-slate-900">
                      Gurugedara Higher Education Institute • ID Pass
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Official Institutional Digital Badge • {formattedId}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-items-center">
                    <div className="w-full">
                      <span className="text-xs font-bold text-slate-600 block mb-1">FRONT</span>
                      {renderFrontCard(true)}
                    </div>
                    <div className="w-full">
                      <span className="text-xs font-bold text-slate-600 block mb-1">BACK</span>
                      {renderBackCard(true)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Highlights Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <QrCode className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">QR Code Attendance</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Scan code on card for classroom check-ins</p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">Verified Identity</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Official recognized institutional pass</p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {role === 'tutor' ? 'Faculty Courses' : role === 'admin' ? 'Executive Access' : 'Registered Courses'}
                  </h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{displayCourses.length} active subject pathways</p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="px-4 sm:px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              {onOpenPhotoUpload && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPhotoUpload();
                  }}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[44px] flex items-center"
                >
                  Update Photo
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadQrOnly}
                className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[44px]"
                title="Download QR code only"
              >
                <QrCode className="w-3.5 h-3.5" /> Save QR Only
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* PDF Download Button with jsPDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="px-3.5 sm:px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
                id="btn_download_id_pdf"
              >
                <FileDown className="w-4 h-4" />
                {isPdfGenerating ? 'Generating PDF...' : 'Download PDF'}
              </button>

              <button
                type="button"
                onClick={handleDownloadFront}
                disabled={isExporting}
                className="px-3 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 min-h-[44px]"
                id="btn_download_id_front"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                PNG
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 sm:px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-950 dark:hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer min-h-[44px]"
                id="btn_print_id_card"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                Print ID Card
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Render container for reliable PNG & PDF export */}
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '500px', 
          opacity: 0.01, 
          pointerEvents: 'none', 
          zIndex: -1 
        }} 
        aria-hidden="true"
      >
        <div ref={exportFrontRef} className="w-[500px]">
          {renderFrontCard(false)}
        </div>
        <div ref={exportBackRef} className="w-[500px]">
          {renderBackCard(false)}
        </div>
      </div>

      {/* Hidden Print Container specifically targeted for window.print() */}
      <div id="student_id_print_root" className="hidden print:block print:w-full print:h-auto print:p-6">
        <div className="max-w-[720px] mx-auto text-center space-y-5">
          <div className="border-b-2 border-slate-900 pb-2">
            <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
              GURUGEDARA HIGHER EDUCATION INSTITUTE
            </h1>
            <p className="text-xs font-bold text-slate-700">
              Official {role.toUpperCase()} Identification Pass • Valid {validityPeriod}
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-500 p-5 rounded-3xl space-y-4 bg-slate-50">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 border-b border-slate-300 pb-1.5">
              <span>✂️ CUT ALONG DOTTED BORDER & FOLD IN HALF</span>
              <span>{currentUser.name} ({formattedId})</span>
            </div>

            <div className="flex flex-row items-center justify-center gap-6 py-2">
              <div className="w-[320px]">
                <span className="text-xs font-black text-slate-800 block mb-1.5">FRONT SIDE</span>
                {renderFrontCard(true)}
              </div>
              <div className="w-[320px]">
                <span className="text-xs font-black text-slate-800 block mb-1.5">BACK SIDE</span>
                {renderBackCard(true)}
              </div>
            </div>
          </div>

          <div className="text-[9px] text-slate-600 font-mono text-center pt-2">
            Authorized Digital {role.toUpperCase()} Pass • Contact: +94 11 234 5678 • www.gurugedara.edu.lk
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
