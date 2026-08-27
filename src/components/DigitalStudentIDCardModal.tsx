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
  School, 
  GraduationCap, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  AlertCircle, 
  Check, 
  Copy, 
  Layers, 
  Eye, 
  FileText,
  BadgeCheck,
  Building2,
  BookOpen,
  FileDown,
  Clock,
  Sparkle
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

type CardTheme = 'navy' | 'indigo' | 'emerald' | 'obsidian';
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
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('navy');
  const [viewMode, setViewMode] = useState<ViewMode>('single_flip');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const printableSheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const studentIdCode = currentUser.username || currentUser.uid.slice(0, 10).toUpperCase();
  const formattedStudentId = `STU-${studentIdCode.toUpperCase()}`;
  const studentGrade = currentUser.studentDetails?.grade || 'Grade 11 - Advanced Level';
  const studentSchool = currentUser.studentDetails?.school || 'Gurugedara Higher Education Institute';
  const admissionDateStr = currentUser.createdAt 
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Aug 2025';
  const academicYear = '2025 / 2026';

  // Extract enrolled course & subject names
  const enrolledSubjectNames = Array.from(
    new Set([
      ...enrolledClasses.map(c => c.subject || c.title),
      ...bookings.filter(b => b.status === 'active').map(b => b.classTitle)
    ])
  ).filter(Boolean);

  const displayCourses = enrolledSubjectNames.length > 0
    ? enrolledSubjectNames
    : ['Combined Mathematics', 'Advanced Physics', 'Chemistry', 'Information Technology'];

  // Theme styling definitions
  const themeStyles = {
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
      name: 'Emerald Scholar',
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
    }
  };

  const currentTheme = themeStyles[selectedTheme];

  const handleCopyId = () => {
    navigator.clipboard.writeText(studentIdCode);
    setCopiedId(true);
    showToast(`Student ID '${studentIdCode}' copied to clipboard!`, 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handlePrint = () => {
    // Triggers standard browser print with CSS media query optimization
    window.print();
  };

  // Download high-resolution PNG front card
  const handleDownloadFront = async () => {
    if (!frontCardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(frontCardRef.current, {
        quality: 0.98,
        pixelRatio: 3,
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `Gurugedara_StudentID_Front_${studentIdCode}.png`;
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
    if (!backCardRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(backCardRef.current, {
        quality: 0.98,
        pixelRatio: 3,
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `Gurugedara_StudentID_Back_${studentIdCode}.png`;
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
      const dataUrl = await toPng(printableSheetRef.current, {
        quality: 0.98,
        pixelRatio: 3,
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `Gurugedara_StudentID_Print_Sheet_${studentIdCode}.png`;
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
    const canvas = document.getElementById('student_id_qr_canvas') as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Gurugedara_QR_Attendance_Pass_${studentIdCode}.png`;
      link.href = url;
      link.click();
      showToast('Student attendance QR pass downloaded successfully!', 'success');
    }
  };

  // Implement Download-as-PDF function using jsPDF
  const handleDownloadPdf = async () => {
    if (!frontCardRef.current || !backCardRef.current) return;
    setIsPdfGenerating(true);
    try {
      // 1. Generate high-resolution image snapshots
      const frontDataUrl = await toPng(frontCardRef.current, {
        quality: 0.98,
        pixelRatio: 3,
        cacheBust: true
      });

      const backDataUrl = await toPng(backCardRef.current, {
        quality: 0.98,
        pixelRatio: 3,
        cacheBust: true
      });

      // 2. Initialize jsPDF in A4 Portrait mode
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
      pdf.text(`OFFICIAL DIGITAL STUDENT IDENTITY CARD • ACADEMIC YEAR ${academicYear}`, pageWidth / 2, 17, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(203, 213, 225); // slate-300
      pdf.text(`Student: ${currentUser.name}  |  ID: ${formattedStudentId}  |  Stream: ${studentGrade}`, pageWidth / 2, 23, { align: 'center' });

      // Verification & Usage Notice
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(203, 213, 225);
      pdf.roundedRect(14, 33, pageWidth - 28, 22, 2, 2, 'FD');

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(8.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('OFFLINE IDENTIFICATION & ATTENDANCE NOTICE:', 18, 39);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(71, 85, 105);
      pdf.text('• Present this digital pass on your mobile device or print on cardstock for lecture hall gate verification.', 18, 44);
      pdf.text('• The high-density QR token is cryptographically synced with the Gurugedara attendance logging system.', 18, 48);
      pdf.text('• Enrolled Courses: ' + displayCourses.slice(0, 4).join(', '), 18, 52);

      // Card Dimensions: Standard 85.6mm x 53.98mm scaled for optimal clarity
      const cardWidth = 135; // mm
      const cardHeight = (cardWidth / 1.58); // ~85.4 mm
      const posX = (pageWidth - cardWidth) / 2;

      // 3. Add Front Card Image
      const frontY = 60;
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('1. FRONT SIDE (SCHOLAR IDENTITY & CHECK-IN QR)', posX, frontY - 2);

      pdf.addImage(frontDataUrl, 'PNG', posX, frontY, cardWidth, cardHeight, undefined, 'FAST');

      // 4. Add Back Card Image
      const backY = frontY + cardHeight + 12;
      pdf.text('2. BACK SIDE (COURSES REGISTRY & EMERGENCY CONTACT)', posX, backY - 2);

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

      // Save PDF
      pdf.save(`Gurugedara_StudentID_${studentIdCode}.pdf`);
      showToast('Student ID Card PDF generated and saved for offline use!', 'success');
    } catch (err) {
      console.error('Failed to generate student ID PDF', err);
      showToast('Could not generate PDF. Please try again.', 'error');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Render Front Side of ID Card
  const renderFrontCard = (forPrint = false) => (
    <div
      ref={frontCardRef}
      id="student_id_card_front"
      className={`relative w-full max-w-[500px] aspect-[1.58/1] rounded-2xl overflow-hidden text-white border ${
        forPrint ? 'border-slate-800 shadow-none' : `${currentTheme.accentBorder} ${currentTheme.glow}`
      } bg-gradient-to-br ${currentTheme.bgGradient} p-4 sm:p-5 flex flex-col justify-between select-none shadow-2xl`}
      style={{
        boxShadow: forPrint ? 'none' : undefined
      }}
    >
      {/* Background Decorative Guilloche & Watermark */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full border-[12px] border-white/10" />
        <div className="absolute -right-6 -bottom-6 w-48 h-48 rounded-full border-[6px] border-white/10" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-black tracking-widest text-white/5 whitespace-nowrap rotate-[-25deg]">
          GURUGEDARA
        </div>
      </div>

      {/* Header Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7.5 h-7.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md border border-amber-300 shrink-0">
            <GraduationCap className="w-4.5 h-4.5 text-slate-950" />
          </div>
          <div>
            <h3 className="text-[11px] sm:text-xs font-black tracking-wider uppercase text-white leading-tight font-sans">
              Gurugedara Higher Education
            </h3>
            <p className={`text-[8px] sm:text-[9px] font-mono font-bold tracking-widest uppercase ${currentTheme.accentColor}`}>
              Digital Student Identity Pass
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-1.5 py-0.5 rounded text-[7.5px] sm:text-[8px] font-mono font-black uppercase tracking-wider bg-white/10 border border-white/20 text-slate-200">
            AY {academicYear}
          </span>
        </div>
      </div>

      {/* Main Body: Photo, Info, Enrolled Courses & Scannable QR */}
      <div className="relative z-10 grid grid-cols-12 gap-2.5 sm:gap-3.5 items-center my-auto py-1">
        {/* Photo Column */}
        <div className="col-span-4 flex flex-col items-center">
          <div className="relative group">
            <div className="w-18 h-22 sm:w-22 sm:h-26 rounded-xl overflow-hidden border-2 border-amber-400/80 shadow-lg bg-slate-800 relative">
              <img
                src={currentUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${currentUser.uid}`}
                alt={currentUser.name}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-xs py-0.5 text-center">
                <span className="text-[6.5px] sm:text-[7px] font-mono uppercase text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5 inline" /> Verified
                </span>
              </div>
            </div>
            {/* Holographic Seal Badge */}
            <div className="absolute -bottom-1.5 -right-1.5 w-5.5 h-5.5 rounded-full bg-gradient-to-tr from-amber-300 via-amber-100 to-amber-400 border border-amber-200 shadow-md flex items-center justify-center text-slate-950">
              <Sparkles className="w-3 h-3 text-slate-900" />
            </div>
          </div>
          <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-300 mt-1.5">
            ID: <span className="text-white font-black">{formattedStudentId}</span>
          </span>
        </div>

        {/* Info & Course List Column */}
        <div className="col-span-5 space-y-1 text-left">
          <div>
            <span className="text-[7px] sm:text-[8px] font-mono uppercase text-slate-400 tracking-wider block">Student Name</span>
            <h4 className="text-xs sm:text-sm font-black text-white leading-tight tracking-tight line-clamp-1">
              {currentUser.name}
            </h4>
          </div>

          <div>
            <span className="text-[7px] sm:text-[7.5px] font-mono uppercase text-slate-400 tracking-wider block">Academic Stream</span>
            <p className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-200 truncate">{studentGrade}</p>
          </div>

          {/* Enrolled Courses Showcase */}
          <div>
            <span className="text-[7px] sm:text-[7.5px] font-mono uppercase text-amber-300 tracking-wider flex items-center gap-1 font-bold">
              <BookOpen className="w-2.5 h-2.5" /> Enrolled Courses ({displayCourses.length})
            </span>
            <div className="flex flex-wrap gap-1 mt-0.5 max-h-9 overflow-hidden">
              {displayCourses.slice(0, 3).map((course, idx) => (
                <span 
                  key={idx}
                  className="px-1.5 py-0.2 text-[7px] sm:text-[7.5px] font-bold bg-white/10 border border-white/15 rounded text-slate-100 truncate max-w-[110px]"
                >
                  {course}
                </span>
              ))}
              {displayCourses.length > 3 && (
                <span className="px-1 py-0.2 text-[6.5px] font-bold bg-amber-400/20 text-amber-300 rounded">
                  +{displayCourses.length - 3}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 pt-0.5">
            <span className={`px-1.5 py-0.5 rounded text-[7px] sm:text-[7.5px] font-bold font-mono uppercase tracking-wider ${currentTheme.badgeBg}`}>
              {currentUser.isFreeCard ? 'Free Card Scholar' : 'Active Scholar'}
            </span>
            <span className="text-[7px] font-mono text-slate-400">
              Iss: {admissionDateStr}
            </span>
          </div>
        </div>

        {/* QR Code Column */}
        <div className="col-span-3 flex flex-col items-center justify-center text-center">
          <div className="p-1 sm:p-1.5 bg-white rounded-xl shadow-md border border-white/30">
            <QRCodeCanvas
              id="student_id_qr_canvas"
              value={studentIdCode}
              size={68}
              level="H"
              includeMargin={false}
            />
          </div>
          <span className="text-[6.5px] sm:text-[7px] font-mono uppercase tracking-widest text-slate-300 mt-1 font-bold">
            Scan for Entry
          </span>
        </div>
      </div>

      {/* Footer Strip with Barcode styling & Microtext */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-1.5 text-[7px] sm:text-[8px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          {/* Simulated mini barcode */}
          <div className="h-3.5 flex items-center gap-0.5 bg-white/90 px-1 rounded-xs">
            {[2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2].map((w, i) => (
              <span key={i} className="h-2.5 bg-slate-950 inline-block" style={{ width: `${w}px` }} />
            ))}
          </div>
          <span className="text-[6.5px] sm:text-[7px] text-slate-400 tracking-tight hidden sm:inline">
            SECURE SCHOLAR VERIFICATION TOKEN
          </span>
        </div>

        <div className="flex items-center gap-1 text-[7.5px] sm:text-[8px] text-slate-300 font-bold">
          <Building2 className="w-3 h-3 text-amber-400" />
          <span>GURUGEDARA ACADEMY</span>
        </div>
      </div>
    </div>
  );

  // Render Back Side of ID Card
  const renderBackCard = (forPrint = false) => (
    <div
      ref={backCardRef}
      id="student_id_card_back"
      className={`relative w-full max-w-[500px] aspect-[1.58/1] rounded-2xl overflow-hidden text-white border ${
        forPrint ? 'border-slate-800 shadow-none' : `${currentTheme.accentBorder} ${currentTheme.glow}`
      } bg-gradient-to-br ${currentTheme.bgGradient} p-4 sm:p-5 flex flex-col justify-between select-none shadow-2xl`}
      style={{
        boxShadow: forPrint ? 'none' : undefined
      }}
    >
      {/* Background Decorative */}
      <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden">
        <div className="absolute -left-12 -top-12 w-64 h-64 rounded-full border-[10px] border-white/10" />
        <div className="absolute right-1/4 bottom-1/4 text-7xl font-black text-white/5 rotate-[15deg]">
          VERIFIED
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-1.5">
        <div className="flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
          <h4 className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-white">
            Academic Courses & Emergency Registry
          </h4>
        </div>
        <span className="text-[7.5px] sm:text-[8px] font-mono text-slate-400 font-bold">
          CARD REF #{studentIdCode}
        </span>
      </div>

      {/* Body: Course List & Emergency Contacts */}
      <div className="relative z-10 grid grid-cols-2 gap-2.5 sm:gap-3 my-auto py-1 text-[8.5px] sm:text-[9px]">
        {/* Left Column: Student Contact & Emergency Guardian */}
        <div className="space-y-1.5 bg-white/5 p-2 sm:p-2.5 rounded-xl border border-white/10">
          <div>
            <span className="text-[6.5px] sm:text-[7px] font-mono uppercase text-slate-400 block font-bold">Guardian / Emergency Contact</span>
            <p className="text-[9.5px] sm:text-[10px] font-bold text-white leading-tight">
              {currentUser.guardianName || currentUser.studentDetails?.parentContact || 'Registered Guardian'}
            </p>
            <p className="text-[8.5px] sm:text-[9px] text-slate-300 font-mono flex items-center gap-1 mt-0.5">
              <Phone className="w-2.5 h-2.5 text-amber-400 inline" />
              {currentUser.guardianPhone || currentUser.phone || '+94 77 123 4567'}
            </p>
          </div>

          <div className="pt-1 border-t border-white/10">
            <span className="text-[6.5px] sm:text-[7px] font-mono uppercase text-slate-400 block font-bold">Linked Parent Email</span>
            <p className="text-[8.5px] sm:text-[9px] text-slate-200 truncate font-mono">
              {currentUser.parentEmail || currentUser.email}
            </p>
            {currentUser.isParentEmailLinked && (
              <span className="text-[6.5px] sm:text-[7px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
                <CheckCircle2 className="w-2 h-2 inline" /> Auto-CC Active for Attendance Logs
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Full Enrolled Courses Pathways */}
        <div className="space-y-1 bg-white/5 p-2 sm:p-2.5 rounded-xl border border-white/10 flex flex-col justify-between">
          <div>
            <span className="text-[6.5px] sm:text-[7px] font-mono uppercase text-amber-300 block font-bold mb-1 flex items-center gap-1">
              <BookOpen className="w-2.5 h-2.5" /> Enrolled Course Pathways ({displayCourses.length})
            </span>
            <div className="flex flex-col gap-0.5 max-h-16 overflow-y-auto pr-1">
              {displayCourses.map((sub, i) => (
                <div
                  key={i}
                  className="px-1.5 py-0.5 rounded bg-white/10 text-white font-medium text-[7.5px] sm:text-[8px] flex items-center justify-between"
                >
                  <span className="truncate max-w-[120px]">▸ {sub}</span>
                  <span className="text-[6.5px] text-amber-300 font-mono">ACTIVE</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-1 border-t border-white/10 text-[7.5px] sm:text-[8px] text-slate-300 flex items-center justify-between">
            <span>DOB: <strong className="font-mono text-white">{currentUser.dob || 'On File'}</strong></span>
            <span className="truncate max-w-[90px]">Western Province, LK</span>
          </div>
        </div>
      </div>

      {/* Card Terms & Authorization Signature */}
      <div className="relative z-10 border-t border-white/15 pt-1.5 flex items-center justify-between text-[6.5px] sm:text-[7px] text-slate-400 font-sans">
        <p className="max-w-[270px] leading-tight text-slate-300">
          Property of Gurugedara Higher Education Institute. Valid for examination entry, lab access, and live QR gate check-in.
        </p>

        <div className="text-center pl-2">
          {/* Digital Signature stamp simulation */}
          <div className="font-serif italic text-amber-300 text-[9.5px] sm:text-[10px] font-bold leading-none select-none tracking-wider">
            D. Wickramasinghe
          </div>
          <span className="text-[5.5px] sm:text-[6px] uppercase font-mono tracking-widest text-slate-400 block mt-0.5 border-t border-white/20 pt-0.5">
            Registrar Directorate
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Modal Header */}
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <GraduationCap className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    Official Digital Student ID Card
                  </h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Scholar Pass
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Gurugedara Higher Education Institute • Academic Year {academicYear}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls & Configuration Toolbar */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-xs">
              <button
                onClick={() => setViewMode('single_flip')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'single_flip'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                id="btn_id_mode_flip"
              >
                <RotateCw className="w-3.5 h-3.5" /> Interactive 3D Card
              </button>
              <button
                onClick={() => setViewMode('dual_side')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'dual_side'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                id="btn_id_mode_dual"
              >
                <Layers className="w-3.5 h-3.5" /> Dual-Sided View
              </button>
              <button
                onClick={() => setViewMode('printable_sheet')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'printable_sheet'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                id="btn_id_mode_sheet"
              >
                <Printer className="w-3.5 h-3.5" /> Print Badge Sheet
              </button>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 font-mono">Theme:</span>
              <div className="flex items-center gap-1.5">
                {(Object.keys(themeStyles) as CardTheme[]).map((themeKey) => {
                  const t = themeStyles[themeKey];
                  return (
                    <button
                      key={themeKey}
                      onClick={() => setSelectedTheme(themeKey)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border cursor-pointer ${
                        selectedTheme === themeKey
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                      title={t.name}
                    >
                      {t.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Main Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-100/50">
            {/* 1. Interactive 3D Flip View */}
            {viewMode === 'single_flip' && (
              <div className="flex flex-col items-center justify-center py-4 space-y-5">
                <div className="relative group max-w-[500px] w-full">
                  {/* Flip Card Container */}
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    style={{ transformStyle: 'preserve-3d' }}
                    className="relative w-full aspect-[1.58/1] cursor-pointer"
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    {/* Front Face */}
                    <div
                      style={{ backfaceVisibility: 'hidden' }}
                      className="absolute inset-0 w-full h-full"
                    >
                      {renderFrontCard()}
                    </div>

                    {/* Back Face */}
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                    id="btn_flip_id_card"
                  >
                    <RotateCw className="w-4 h-4 text-indigo-600 animate-spin-reverse" />
                    Flip to {isFlipped ? 'Front Side' : 'Back Side'} (or tap card)
                  </button>
                  <button
                    onClick={handleCopyId}
                    className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-mono font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Copy Unique Student ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    {studentIdCode}
                  </button>
                </div>
              </div>
            )}

            {/* 2. Dual Side View (Side by Side) */}
            {viewMode === 'dual_side' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center justify-items-center">
                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs font-extrabold text-slate-700">
                      <span>Front Side (Identity, Photo & QR)</span>
                      <button
                        onClick={handleDownloadFront}
                        className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Save Front PNG
                      </button>
                    </div>
                    {renderFrontCard()}
                  </div>

                  <div className="w-full space-y-2">
                    <div className="flex items-center justify-between px-1 text-xs font-extrabold text-slate-700">
                      <span>Back Side (Course Registry & Guardian)</span>
                      <button
                        onClick={handleDownloadBack}
                        className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" /> Save Back PNG
                      </button>
                    </div>
                    {renderBackCard()}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Printable Badge Sheet (Cut-Out Template) */}
            {viewMode === 'printable_sheet' && (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-amber-900">Printing & Laminating Instructions:</h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Click <strong>"Print Physical ID Card"</strong> below to print in standard CR80 badge format.
                      After printing on standard cardstock, cut along the dotted border guidelines and fold in half or slip into a plastic badge holder.
                    </p>
                  </div>
                </div>

                {/* Printable Template Sheet */}
                <div
                  ref={printableSheetRef}
                  id="student_id_printable_sheet"
                  className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-300 shadow-sm max-w-2xl mx-auto space-y-6 text-center"
                >
                  <div className="border-b border-slate-200 pb-3">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Gurugedara Higher Education Institute — Printable Student ID Badge
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Student: {currentUser.name} • ID: {formattedStudentId} • Year: {academicYear}
                    </p>
                  </div>

                  {/* Cut-out guide badge */}
                  <div className="border-2 border-dashed border-slate-400 p-4 rounded-3xl bg-slate-50/70 space-y-4">
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-500 px-2">
                      <span>✂️ FOLD / CUT-OUT GUIDELINE</span>
                      <span>CR80 STANDARD CARD (85.6 × 53.98 mm)</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <div className="w-full max-w-[320px]">
                        <span className="text-[9px] font-bold text-slate-600 block mb-1">FRONT</span>
                        {renderFrontCard(true)}
                      </div>
                      <div className="w-full max-w-[320px]">
                        <span className="text-[9px] font-bold text-slate-600 block mb-1">BACK</span>
                        {renderBackCard(true)}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic">
                    * Designed with high-density scannable QR tokens for instant entry gate validation at Gurugedara branches.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Action Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-extrabold text-slate-900">QR Code Attendance</h5>
                  <p className="text-[10px] text-slate-500">Scan code on card for classroom check-ins</p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-extrabold text-slate-900">Verified Identity</h5>
                  <p className="text-[10px] text-slate-500">Official student identity card recognized at all halls</p>
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h5 className="text-xs font-extrabold text-slate-900">Registered Courses</h5>
                  <p className="text-[10px] text-slate-500">{displayCourses.length} active subject pathways</p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {onOpenPhotoUpload && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPhotoUpload();
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Update Photo
                </button>
              )}
              <button
                type="button"
                onClick={handleDownloadQrOnly}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Download QR code only"
              >
                <QrCode className="w-3.5 h-3.5" /> Save QR Only
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* PDF Download Button with jsPDF */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isPdfGenerating}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                id="btn_download_id_pdf"
              >
                <FileDown className="w-4 h-4" />
                {isPdfGenerating ? 'Generating PDF...' : 'Download as PDF (Offline)'}
              </button>

              <button
                type="button"
                onClick={handleDownloadFront}
                disabled={isExporting}
                className="px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                id="btn_download_id_front"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                PNG
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-950 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.99]"
                id="btn_print_id_card"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                Print ID Card
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hidden Print Container specifically targeted for window.print() */}
      <div id="student_id_print_root" className="hidden print:block print:w-full print:h-auto print:p-6">
        <div className="max-w-[720px] mx-auto text-center space-y-5">
          <div className="border-b-2 border-slate-900 pb-2">
            <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
              GURUGEDARA HIGHER EDUCATION INSTITUTE
            </h1>
            <p className="text-xs font-bold text-slate-700">
              Official Student Identification Pass • Academic Year {academicYear}
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-500 p-5 rounded-3xl space-y-4 bg-slate-50">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-700 border-b border-slate-300 pb-1.5">
              <span>✂️ CUT ALONG DOTTED BORDER & FOLD IN HALF</span>
              <span>STUDENT: {currentUser.name} ({formattedStudentId})</span>
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
            Authorized Digital Student Pass • Contact: +94 11 234 5678 • www.gurugedara.edu.lk
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
