import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  Award, 
  FileQuestion, 
  Check, 
  Save, 
  BookOpen 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Quiz, QuizQuestion, QuestionType, ClassItem, UserProfile, QuizDifficulty } from '../types';
import { DifficultyBadge } from './DifficultyBadge';

interface QuizBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quizData: Partial<Quiz>) => Promise<void>;
  initialQuiz?: Quiz | null;
  availableClasses: ClassItem[];
  currentUser?: UserProfile | null;
  defaultClassId?: string;
}

export const QuizBuilderModal: React.FC<QuizBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuiz,
  availableClasses,
  currentUser,
  defaultClassId
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialQuiz?.classId || defaultClassId || (availableClasses[0]?.id || '')
  );
  const [title, setTitle] = useState<string>(initialQuiz?.title || '');
  const [description, setDescription] = useState<string>(initialQuiz?.description || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialQuiz?.durationMinutes !== undefined ? initialQuiz.durationMinutes : 15
  );
  const [passingScorePercentage, setPassingScorePercentage] = useState<number>(
    initialQuiz?.passingScorePercentage !== undefined ? initialQuiz.passingScorePercentage : 60
  );
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(
    initialQuiz?.difficulty || 'intermediate'
  );
  const [status, setStatus] = useState<'published' | 'draft'>(initialQuiz?.status || 'published');

  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initialQuiz?.questions && initialQuiz.questions.length > 0
      ? initialQuiz.questions
      : [
          {
            id: 'q_' + Math.random().toString(36).substr(2, 8),
            question: '',
            type: 'multiple_choice',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: 'Option A',
            points: 1,
            explanation: ''
          }
        ]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetClass = availableClasses.find(c => c.id === selectedClassId);

  // Question Management
  const handleAddQuestion = (type: QuestionType) => {
    const newQ: QuizQuestion = {
      id: 'q_' + Math.random().toString(36).substr(2, 8),
      question: '',
      type,
      options: type === 'true_false' ? ['True', 'False'] : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: type === 'true_false' ? 'True' : 'Option A',
      points: 1,
      explanation: ''
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      setErrorMessage('A quiz must contain at least one question.');
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleQuestionTypeChange = (index: number, newType: QuestionType) => {
    const updated = [...questions];
    if (newType === 'true_false') {
      updated[index] = {
        ...updated[index],
        type: newType,
        options: ['True', 'False'],
        correctAnswer: 'True'
      };
    } else {
      updated[index] = {
        ...updated[index],
        type: newType,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A'
      };
    }
    setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length >= 6) return;
    const nextOption = `Option ${String.fromCharCode(65 + q.options.length)}`;
    handleUpdateQuestion(qIndex, {
      options: [...q.options, nextOption]
    });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    if (q.options.length <= 2) {
      setErrorMessage('Multiple choice questions require at least two answer options.');
      return;
    }
    const removedOption = q.options[optIndex];
    const newOptions = q.options.filter((_, i) => i !== optIndex);
    let newCorrect = q.correctAnswer;
    if (newCorrect === removedOption) {
      newCorrect = newOptions[0];
    }
    handleUpdateQuestion(qIndex, {
      options: newOptions,
      correctAnswer: newCorrect
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, newValue: string) => {
    const q = questions[qIndex];
    const prevValue = q.options[optIndex];
    const newOptions = [...q.options];
    newOptions[optIndex] = newValue;

    const updates: Partial<QuizQuestion> = { options: newOptions };
    if (q.correctAnswer === prevValue) {
      updates.correctAnswer = newValue;
    }
    handleUpdateQuestion(qIndex, updates);
  };

  const handleSubmit = async (submitStatus: 'published' | 'draft') => {
    setErrorMessage(null);

    if (!selectedClassId) {
      setErrorMessage('Please choose a class for this test.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please provide a title for the quiz.');
      return;
    }
    if (questions.length === 0) {
      setErrorMessage('Please add at least one question.');
      return;
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMessage(`Question ${i + 1} cannot have empty prompt text.`);
        return;
      }
      if (q.type === 'multiple_choice') {
        if (q.options.some(opt => !opt.trim())) {
          setErrorMessage(`Question ${i + 1} has an empty option. Please fill in all options.`);
          return;
        }
        if (!q.options.includes(q.correctAnswer)) {
          setErrorMessage(`Question ${i + 1} has an invalid correct answer selection.`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        id: initialQuiz?.id,
        classId: selectedClassId,
        classTitle: targetClass?.title || initialQuiz?.classTitle || 'Tuition Class',
        tutorId: currentUser?.uid || initialQuiz?.tutorId || 'faculty_tutor',
        tutorName: currentUser?.name || currentUser?.displayName || initialQuiz?.tutorName || 'Faculty Instructor',
        title: title.trim(),
        description: description.trim(),
        durationMinutes: Math.max(0, durationMinutes),
        passingScorePercentage: Math.min(100, Math.max(10, passingScorePercentage)),
        status: submitStatus,
        difficulty,
        questions,
        totalPoints: questions.reduce((sum, q) => sum + (q.points || 1), 0),
        createdAt: initialQuiz?.createdAt
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save quiz.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <FileQuestion className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-blue-200 font-bold block">
                {initialQuiz ? 'Edit Assessment' : 'New Assessment Builder'}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                {initialQuiz ? initialQuiz.title : 'Define Quiz & Mark Answers'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-grow">
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs font-semibold text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Basic Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Class */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Target Tuition Class *
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white"
              >
                {availableClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.schedule || c.dayOfWeek || 'Scheduled'})
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Quiz / Test Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 4: Integration by Parts Checkpoint"
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Test Description & Instructions (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Instructions for students (e.g. Choose the single best answer for each question. No calculators permitted.)"
              className="w-full text-xs font-normal px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white resize-none"
            />
          </div>

          {/* Assessment Parameters: Duration, Passing Score & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> Time Limit (Minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-24 text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white"
                />
                <span className="text-[11px] text-slate-500 font-medium">
                  {durationMinutes === 0 ? 'Unlimited' : 'mins'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" /> Passing Score (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={passingScorePercentage}
                  onChange={(e) => setPassingScorePercentage(Number(e.target.value))}
                  className="w-24 text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white"
                />
                <span className="text-[11px] text-slate-500 font-medium">
                  Pass mark
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <span>Difficulty Level</span>
                <DifficultyBadge difficulty={difficulty} size="xs" />
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
                className="w-full text-xs font-bold px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white"
                id="quiz_difficulty_select"
              >
                <option value="beginner">Beginner (Foundational)</option>
                <option value="intermediate">Intermediate (Standard)</option>
                <option value="advanced">Advanced (Mastery)</option>
              </select>
            </div>
          </div>

          {/* Question List Header */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Questions & Answer Keys</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-mono font-bold">
                    {questions.length} {questions.length === 1 ? 'Question' : 'Questions'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define multiple choice or true/false questions and select the correct answer.
                </p>
              </div>

              {/* Add Question Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('multiple_choice')}
                  className="px-3 py-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Multi-Choice
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion('true_false')}
                  className="px-3 py-2 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-purple-200 dark:border-purple-800"
                >
                  <Plus className="w-3.5 h-3.5" /> True / False
                </button>
              </div>
            </div>

            {/* Questions Cards */}
            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id || qIndex}
                  className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4"
                >
                  {/* Question header row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono text-xs font-black flex items-center justify-center">
                        {qIndex + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Question {qIndex + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Question Type Switcher */}
                      <div className="flex items-center rounded-xl bg-white dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => handleQuestionTypeChange(qIndex, 'multiple_choice')}
                          className={`px-2.5 py-1 rounded-lg transition-all ${
                            q.type === 'multiple_choice'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          Multiple Choice
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuestionTypeChange(qIndex, 'true_false')}
                          className={`px-2.5 py-1 rounded-lg transition-all ${
                            q.type === 'true_false'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          True / False
                        </button>
                      </div>

                      {/* Points */}
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        <span>Pts:</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={q.points || 1}
                          onChange={(e) => handleUpdateQuestion(qIndex, { points: Number(e.target.value) || 1 })}
                          className="w-12 text-center text-xs font-bold py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"
                        />
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(qIndex)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Textarea */}
                  <div>
                    <textarea
                      rows={2}
                      value={q.question}
                      onChange={(e) => handleUpdateQuestion(qIndex, { question: e.target.value })}
                      placeholder={`Enter question ${qIndex + 1} prompt or scenario...`}
                      className="w-full text-xs font-medium px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white resize-none"
                    />
                  </div>

                  {/* Options Management */}
                  {q.type === 'multiple_choice' ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                          Answer Options (Click green checkmark to set correct answer)
                        </span>
                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIndex)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Option
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {q.options.map((opt, optIndex) => {
                          const isCorrect = q.correctAnswer === opt;
                          return (
                            <div
                              key={optIndex}
                              className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700/80 ring-1 ring-emerald-400/50'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateQuestion(qIndex, { correctAnswer: opt })}
                                title={isCorrect ? 'Marked as Correct Answer' : 'Click to set as Correct Answer'}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                {isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : <span className="text-[10px] font-mono font-bold">{String.fromCharCode(65 + optIndex)}</span>}
                              </button>

                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                className="flex-grow text-xs font-semibold bg-transparent outline-none text-slate-800 dark:text-slate-100"
                              />

                              {isCorrect && (
                                <span className="text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-md shrink-0">
                                  Correct
                                </span>
                              )}

                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(qIndex, optIndex)}
                                  className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                                  title="Remove option"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* True / False Options */
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
                        Select Correct Statement Truth Value:
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        {['True', 'False'].map((tfValue) => {
                          const isCorrect = q.correctAnswer === tfValue;
                          return (
                            <button
                              key={tfValue}
                              type="button"
                              onClick={() => handleUpdateQuestion(qIndex, { correctAnswer: tfValue })}
                              className={`p-3 rounded-xl border flex items-center justify-between font-bold text-xs transition-all cursor-pointer ${
                                isCorrect
                                  ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 text-purple-800 dark:text-purple-200 ring-2 ring-purple-400/40'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                            >
                              <span className="font-extrabold text-sm">{tfValue}</span>
                              {isCorrect ? (
                                <span className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-2 py-0.5 rounded-md font-mono">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Correct Answer
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">Click to select</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Teacher's Explanation / Review Note */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-blue-500" /> Explanation / Answer Justification (Shown to students after completing test)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ''}
                      onChange={(e) => handleUpdateQuestion(qIndex, { explanation: e.target.value })}
                      placeholder="e.g., By Newton's 2nd Law (F = ma), acceleration directly scales with net force."
                      className="w-full text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-600 dark:text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Total Marks:{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
              {questions.reduce((sum, q) => sum + (q.points || 1), 0)} Points
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSubmit('published')}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Publish Assessment'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
