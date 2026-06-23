import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Lock, 
  Sparkles, 
  BookOpen, 
  Compass, 
  ChevronRight, 
  HelpCircle, 
  Award, 
  Clock, 
  BookOpenCheck,
  PlayCircle,
  FileText,
  RefreshCw,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { Booking, ClassItem, UserProfile } from '../types';

interface StudentModuleRoadmapProps {
  currentUser: UserProfile;
  userBookings: Booking[];
  classes: ClassItem[];
}

interface SyllabusModule {
  id: string;
  sequence: number; // e.g. 1, 2, 3...
  title: string;
  status: 'completed' | 'current' | 'upcoming';
  description: string;
  duration: string;
  topics: string[];
  learningObjectives: string[];
  resources: { name: string; url: string; type: 'pdf' | 'video' | 'link' }[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

// Highly realistic curriculums mapped to standard subjects
const SUBJECT_ROADMAPS: Record<string, Omit<SyllabusModule, 'status'>[]> = {
  'Mathematics': [
    {
      id: 'math_m1',
      sequence: 1,
      title: 'Limits & Ultimate Continuity',
      description: 'Understanding the behavior of equations near infinitely close indexes, computing standard asymptotes, and defining formal epsilon-delta continuity boundaries.',
      duration: 'Week 1-2',
      topics: ['One-sided and Two-sided Limits', 'Squeeze Theorem', 'Infinite Discontinuity', 'Intermediate Value Theorem'],
      learningObjectives: ['Define mathematically rigorous limits', 'Determine function asymptotes', 'Apply intermediate value rules to critical root domains'],
      resources: [
        { name: 'Core Limits Handouts.pdf', url: '#', type: 'pdf' },
        { name: 'Computing Indeterminate Forms Video', url: '#', type: 'video' },
        { name: 'Interactive Graphing Tool', url: '#', type: 'link' }
      ],
      quiz: {
        question: 'Which theorem states that if a continuous function has opposite signs on an interval, it must have a root in that interval?',
        options: ['Squeeze Theorem', 'Intermediate Value Theorem', 'Mean Value Theorem', 'Rolle\'s Theorem'],
        correctIndex: 1,
        explanation: 'The Intermediate Value Theorem (IVT) states that for any continuous function f on [a, b], if u is between f(a) and f(b), there is a c in [a, b] such that f(c) = u. When signs differ, f(c) = 0 is guaranteed.'
      }
    },
    {
      id: 'math_m2',
      sequence: 2,
      title: 'The Power of Derivatives & Tangents',
      description: 'Mastering the fundamental rate of change. Explores limits of difference quotients, tangent lines, and derivative differentiation shortcuts.',
      duration: 'Week 3-4',
      topics: ['Difference Quotient Limits', 'Power, Product, and Quotient Rules', 'Trigonometric Derivatives', 'Chain Rule & General Power Rule'],
      learningObjectives: ['Express instantaneous rate of change as a limit', 'Synthesize Chain Rule on nested compositions', 'Calculate exact equations of tangent lines'],
      resources: [
        { name: 'Tangents & Secants Interactive Guide', url: '#', type: 'link' },
        { name: 'Derivative Formula Formulae sheet.pdf', url: '#', type: 'pdf' }
      ],
      quiz: {
        question: 'What is the derivative of f(x) = sin(x²)?',
        options: ['cos(x²)', '2x * cos(x²)', '2 * sin(x)', '-2x * cos(x²)'],
        correctIndex: 1,
        explanation: 'Applying the Chain Rule: d/dx[sin(u)] = cos(u) * du. Here, u = x², so du = 2x. Thus f\'(x) = cos(x²) * 2x = 2x * cos(x²).'
      }
    },
    {
      id: 'math_m3',
      sequence: 3,
      title: 'State Optimization & Curve Sketching',
      description: 'Leveraging differentials to calculate global maximums and minimums, critical point geometry, concavity behaviors, and engineering derivative models.',
      duration: 'Week 5-6',
      topics: ['Extreme Value Theorem', 'Mean Value Theorem', 'First & Second Derivative Tests', 'Optimization Real-World Applications'],
      learningObjectives: ['Locate local and global extrema points', 'Evaluate function concavity points of inflection', 'Formulate equations to model optimal volume or minimum cost'],
      resources: [
        { name: 'Applied Optimization Problems.pdf', url: '#', type: 'pdf' },
        { name: 'Curve Sketching Sandbox', url: '#', type: 'link' }
      ],
      quiz: {
        question: 'If f\'\'(c) > 0 at a critical point where f\'(c) = 0, what does the second derivative test conclude?',
        options: ['f has a local maximum at c', 'f has a local minimum at c', 'The point c is an inflection point', 'The test is inconclusive'],
        correctIndex: 1,
        explanation: 'If f\'(c) = 0, the curve is horizontal. If f\'\'(c) > 0, the curve is concave up (holding water), which means the critical point c is a local minimum.'
      }
    },
    {
      id: 'math_m4',
      sequence: 4,
      title: 'Antiderivatives & The Riemann Sums',
      description: 'Inverting derivative operators, partition grids, constructing rectangular Riemann areas, and formulating indefinite integration constants.',
      duration: 'Week 7-8',
      topics: ['Left and Right Endpoint Approximations', 'Definite Integral Definition', 'Antiderivatives and General Solutions', 'Fundamental Theorem of Calculus'],
      learningObjectives: ['Construct Riemann Sum expressions', 'Integrate algebraic and basic transcendental terms', 'State and invoke the dry-run Fundamental Theorem of Calculus'],
      resources: [
        { name: 'Riemann Integral Visualizer', url: '#', type: 'link' },
        { name: 'Antiderivatives Cheat Codebook', url: '#', type: 'pdf' }
      ],
      quiz: {
        question: 'According to the Fundamental Theorem of Calculus, what is d/dx [ ∫ from a to x of f(t) dt ]?',
        options: ['f(x)', 'f(x) - f(a)', 'F(x)', 'f\'(x)'],
        correctIndex: 0,
        explanation: 'The first part of the Fundamental Theorem of Calculus states that the derivative of a definite integral with respect to its variable upper bound is simply the integrand function evaluated at that upper bound, i.e., f(x).'
      }
    },
    {
      id: 'math_m5',
      sequence: 5,
      title: 'Integration Mastery & U-Substitution',
      description: 'Mastering techniques of integration, applying algebraic variable adjustments, finding area integrals between complex non-linear boundary curves.',
      duration: 'Week 9-10',
      topics: ['Integration by Substitution (U-Sub)', 'Area Between Two Curves', 'Volume by Disc and Shell Methods', 'Average Value of Functions'],
      learningObjectives: ['Apply substitution changes of variables smoothly', 'Calculate bounded areas between intersecting curves', 'Develop volumes of rotational 3D solids'],
      resources: [
        { name: 'Solids of Revolution 3D Modeling.pdf', url: '#', type: 'pdf' },
        { name: 'U-Substitution Video Walkthrough', url: '#', type: 'video' }
      ],
      quiz: {
        question: 'What is the appropriate U-substitution to compute ∫ x * e^(x²) dx?',
        options: ['u = x', 'u = e^x', 'u = x²', 'u = x * e^(x²)'],
        correctIndex: 2,
        explanation: 'Letting u = x² means du = 2x dx, which yields x dx = du/2. This simplifies the integral dramatically to ∫ (1/2) * e^u du, which is readily solvable.'
      }
    }
  ],
  'Coding': [
    {
      id: 'code_m1',
      sequence: 1,
      title: 'Semantic HTML5 & Master Grid Structures',
      description: 'The bones of professional client apps. Authoring semantic trees, web accessibility patterns, and structural styling using Tailwind Flex & CSS Grid layout grids.',
      duration: 'Week 1-2',
      topics: ['Semantic markup & SEO indexes', 'CSS Box Model and Positions', 'Tailwind Responsive breakpoint system', 'Flexbox and Grid nested layout paradigms'],
      learningObjectives: ['Draft semantic accessible HTML templates', 'Configure fluid layout matrices with zero overflows', 'Design complete mobile-to-desktop responsive interfaces'],
      resources: [
        { name: 'Syllabus HTML Cheat Sheet', url: '#', type: 'link' },
        { name: 'Grid Visual Sandbox Game', url: '#', type: 'link' }
      ],
      quiz: {
        question: 'Which Tailwind CSS class is used to align flex-container items along the cross axis (vertically in a row)?',
        options: ['justify-center', 'items-center', 'content-center', 'self-end'],
        correctIndex: 1,
        explanation: 'In flex containers, "items-center" controls the cross-axis alignment, mapping to the CSS property "align-items: center".'
      }
    },
    {
      id: 'code_m2',
      sequence: 2,
      title: 'Modern JS Engines & Async Promise Pipelines',
      description: 'Supercharging interaction. Explores array transformations, lexical closures, promise mechanics, and safe web API fetching configurations.',
      duration: 'Week 3-4',
      topics: ['ES6 Array Mechanics (Map, Filter, Reduce)', 'Closures and Lexical Scope', 'Promises and Async/Await pipelines', 'Fetch API and Axios interceptors'],
      learningObjectives: ['Perform operations on datasets with zero native loops', 'Process asynchronous API payloads cleanly', 'Resolve multi-level nested promise errors gracefully'],
      resources: [
        { name: 'Asynchronous Promise Mechanics Guide.pdf', url: '#', type: 'pdf' },
        { name: 'Interactive Event Loop Sandbox', url: '#', type: 'link' }
      ],
      quiz: {
        question: 'What output is produced by applying the .filter() method to an empty JavaScript array?',
        options: ['undefined', 'null', 'An empty array []', 'An error thrown in runtime'],
        correctIndex: 2,
        explanation: 'Array methods like .filter(), .map(), and .reduce() execute safely without errors on empty arrays, with filter and map returning a fresh, empty array [].'
      }
    },
    {
      id: 'code_m3',
      sequence: 3,
      title: 'React Hooks, Props & Virtual State Controls',
      description: 'Component architecture foundations. Virtual DOM structures, component lifecycles, and managing states with useState, useEffect, and useRef hooks.',
      duration: 'Week 5-6',
      topics: ['Functional Components and JSX', 'Props and Destructuring patterns', 'useState & useEffect lifecycles', 'Immutable State Update guidelines'],
      learningObjectives: ['Incorporate structural component hierarchies', 'Stabilize side-effects without infinite re-renders', 'Manage persistent cursor states via useRef refs'],
      resources: [
        { name: 'React Hooks Mastery Rules.pdf', url: '#', type: 'pdf' },
        { name: 'Virtual DOM Explained Interactive', url: '#', type: 'video' }
      ],
      quiz: {
        question: 'What happens if you update state directly (e.g., state.count = 5) instead of utilizing the setState hook setter?',
        options: ['React throws a compilation error', 'The component re-renders but value remains same', 'The state value shifts, but React fails to identify it and triggers no re-render', 'React automatically rolls back the mutation'],
        correctIndex: 2,
        explanation: 'Direct mutations bypass React\'s internal reconciliation loop. While the memory variable changes, React won\'t know to re-render the component representation in the browser.'
      }
    },
    {
      id: 'code_m4',
      sequence: 4,
      title: 'State Managers & Complex Hook Synchronization',
      description: 'Scaling react apps. Advanced state patterns, Context API structures, customized hook hooks, and optimizing rendering indexes.',
      duration: 'Week 7-8',
      topics: ['Context API Providers', 'useReducer Complex State Machines', 'Creating Custom Reusable Hooks', 'React.memo & Memoization Optimization'],
      learningObjectives: ['Abstract global variables using Context Providers', 'Implement clean standard reducer action pipelines', 'Construct custom hooks to hook data logic cleanly'],
      resources: [
        { name: 'Global State Architectures.pdf', url: '#', type: 'pdf' },
        { name: 'Custom hooks source files', url: '#', type: 'link' }
      ],
      quiz: {
        question: 'Which React hook is designed specifically to memoize complex computational values so they don\'t recalculate on every render?',
        options: ['useEffect', 'useCallback', 'useMemo', 'useRef'],
        correctIndex: 2,
        explanation: 'useMemo returns a memoized value of a function result, recalculating only when dependencies listed in its dependency array modify.'
      }
    },
    {
      id: 'code_m5',
      sequence: 5,
      title: 'Full-Stack Integration & Production Deployment',
      description: 'Deploying robust apps. Connecting React with RESTful API routes, and launching into cloud Docker or Static web hosting infrastructures.',
      duration: 'Week 9-10',
      topics: ['API Integration & CORS boundaries', 'Environment Configuration secure guidelines', 'Static Hosting (Vercel, Netlify)', 'Continuous Deployment pipeline triggers'],
      learningObjectives: ['Hook frontends to backends with security headers', 'Conceal API keys inside environmental variables', 'Push automated builds into live cloud deployment servers'],
      resources: [
        { name: 'Full-stack Deployment Roadmap', url: '#', type: 'pdf' },
        { name: 'Production Build Checklist.pdf', url: '#', type: 'pdf' }
      ],
      quiz: {
        question: 'What is the primary role of a CORS (Cross-Origin Resource Sharing) browser security policy?',
        options: ['To encrypt browser databases', 'To control which external domain locations are authorized to request data from your API', 'To optimize client-side bundle performance', 'To secure user password hashing'],
        correctIndex: 1,
        explanation: 'CORS is a security mechanism implemented by browsers that permits or denies access to Web resources at URLs different from the active site origin.'
      }
    }
  ],
  'Physics': [
    {
      id: 'phys_m1',
      sequence: 1,
      title: 'Kinematics & Projectile Orbits',
      description: 'Charting particles of motion. Analyzes vector projections, displacement, velocity profiles, and ballistic trajectory accelerations under regular gravity vectors.',
      duration: 'Week 1-2',
      topics: ['1D Position and Instantaneous Acceleration', 'Vector Components & Dot Products', 'Projectile Parabolic Vectors', 'Relative Frame Observers'],
      learningObjectives: ['State and use core kinematic formulas', 'Model projectile distances and altitudes', 'Translate mechanical vectors between moving systems'],
      resources: [
        { name: 'Vector Sandbox Playground', url: '#', type: 'link' },
        { name: 'Kinematic Solver Pack.pdf', url: '#', type: 'pdf' }
      ],
      quiz: {
        question: 'At the maximum height of a projectile\'s parabolic path, which of the following is true regarding its velocities?',
        options: ['Both vertical and horizontal velocities are zero', 'The horizontal velocity is zero, vertical is maximum', 'The vertical velocity is zero, horizontal is non-zero', 'Both velocities are at their maximum'],
        correctIndex: 2,
        explanation: 'At absolute peak altitude, the vertical velocity component (Vy) drops to exactly zero before reversing direction. The horizontal velocity (Vx) remains constant throughout (neglecting air resistance).'
      }
    },
    {
      id: 'phys_m2',
      sequence: 2,
      title: 'Newton\'s Mechanical Laws & Friction Matrices',
      description: 'Understanding why things move. Explores force balances, normal vectors, stationary and active friction, sliding wedge pulley blocks, and equilibrium math.',
      duration: 'Week 3-4',
      topics: ['Inertia, Action/Reaction', 'Free-Body Analysis & Force Diagrams', 'Static and Kinetic friction index coefficients', 'Atwood Pulley balancing systems'],
      learningObjectives: ['Draft clean complete free-body force diagrams', 'Calculate exact accelerations of inclined mass networks', 'Incorporate friction thresholds on mechanical objects'],
      resources: [
        { name: 'Free-Body Diagram Tutor.pdf', url: '#', type: 'pdf' },
        { name: 'Sliding Block Virtual Lab', url: '#', type: 'link' }
      ],
      quiz: {
        question: 'An object remains resting on an inclined plane. What friction force is active, and is it greater than or equal to kinetic friction?',
        options: ['Kinetic friction; greater', 'Static friction; typically greater', 'Air drag resistance; equal', 'Static friction; always less than'],
        correctIndex: 1,
        explanation: 'Since the object is stationary, static friction is balancing gravity. The maximum coefficient of static friction is typically greater than that of kinetic friction, making initial slipping harder than sliding.'
      }
    },
    {
      id: 'phys_m3',
      sequence: 3,
      title: 'Energy Conservation & Work Boundaries',
      description: 'Translating forces into scalar power. Conservative systems, kinetic and potential energy conversions, spring constants, and mechanical work systems.',
      duration: 'Week 5-6',
      topics: ['Definition of Dot Product Work', 'Conservative vs. Dissipative Forces', 'Gravitational and Hooke Hook Potential Energy', 'Mechanical Efficiency and Joules'],
      learningObjectives: ['Model mechanical systems with scalar work-energy steps', 'Design system mechanical curves using Hooke springs', 'Define power indexes of real motors'],
      resources: [
        { name: 'Spring Systems Oscillation Guide', url: '#', type: 'link' },
        { name: 'Conservative Energy Exercises.pdf', url: '#', type: 'pdf' }
      ],
      quiz: {
        question: 'If a spring with spring constant k is compressed by double the distance (2x), how does its elastic potential energy change?',
        options: ['It remains identical', 'It doubles (2x)', 'It triples (3x)', 'It quadruples (4x)'],
        correctIndex: 3,
        explanation: 'Elastic potential energy is calculated via U = (1/2) * k * x². Because of the squared dependency, doubling x yields (2)² = 4 times the original potential energy.'
      }
    },
    {
      id: 'phys_m4',
      sequence: 4,
      title: 'Momentum Impulse & Elastic Collisions',
      description: 'Momentum vectors and collision math. Explores center-of-mass orbits, impulsive loads, kinetic energy retention in elastic/inelastic collisions.',
      duration: 'Week 7-8',
      topics: ['Momentum conservation vector rules', 'Elastic, Inelastic and Explosive Collisions', 'Impulse integration forces', 'Center of Mass systems calculation'],
      learningObjectives: ['Solve multi-dimensional vector outcomes of fast collisions', 'Determine kinetic energy dissipation index values', 'Locate center of mass points on complex solid constructs'],
      resources: [
        { name: '2D Particle Collision Simulator', url: '#', type: 'link' },
        { name: 'Momentum Practice Key.pdf', url: '#', type: 'pdf' }
      ],
      quiz: {
        question: 'In a perfectly inelastic collision between two moving bodies, which of the following statements holds true?',
        options: ['Both kinetic energy and momentum are conserved', 'Only kinetic energy is conserved', 'Only momentum is conserved, and the objects stick together', 'The lighter mass retains all energy'],
        correctIndex: 2,
        explanation: 'In inelastic collisions, mechanical energy is lost to heat/distortion, so kinetic energy is NOT conserved. However, the conservation of linear momentum holds true in any isolated collision system.'
      }
    }
  ],
  'English': [
    {
      id: 'eng_m1',
      sequence: 1,
      title: 'Thesis Statements & Framing Paragraphs',
      description: 'Crafting persuasive hooks. Structuring introduction frameworks, formulating arguable clear thesis positions, and compiling initial thematic outlines.',
      duration: 'Week 1-2',
      topics: ['Anatomy of an Essay introduction', 'Drafting clear argrumentative Thesis structures', 'Building hook strategies', 'Designing peer outlines'],
      learningObjectives: ['Construct concise argrumentative thesis points', 'Engage audience reading styles from first sentence lines', 'Blueprint clear logical structural tracks'],
      resources: [
        { name: 'High-Impact Hooks Handlist.docx', url: '#', type: 'pdf' },
        { name: 'Arguable Thesis Outline Builder', url: '#', type: 'link' }
      ],
      quiz: {
        question: 'Which element is considered essential for a strong argumentative thesis statement?',
        options: ['A summary of all opposing opinions', 'A broad statement of general consensus fact', 'A clear, debatable claim backed by sub-arguments', 'A quote from a major historical figure'],
        correctIndex: 2,
        explanation: 'A thesis must be a claim people can reasonably debate, presenting a clear thesis stance with structural sub-argument mapping to follow.'
      }
    },
    {
      id: 'eng_m2',
      sequence: 2,
      title: 'The Paragraph transition Index & Evidence',
      description: 'Developing heavy bodies of evidence. Outlining PEAL (Point, Evidence, Analysis, Link) paragraph rules, weaving quotations cleanly, and transitional flow.',
      duration: 'Week 3-4',
      topics: ['PEAL paragraphs outline structures', 'Embedding source quotes with active analysis', 'Using advanced transitional phrases', 'Synthesizing conflicting sources'],
      learningObjectives: ['Weave third-party evidence into text seamlessly', 'Write comprehensive micro-analyses of citation concepts', 'Generate logical transitions between text cells'],
      resources: [
        { name: 'Advanced Transitions Mastery List.pdf', url: '#', type: 'pdf' },
        { name: 'Interactive Citation Sandbox', url: '#', type: 'link' }
      ],
      quiz: {
        question: 'What is the primary function of the "Link" segment within a PEAL paragraph structure?',
        options: ['To add a hyperlink to a website source', 'To tie the paragraph\'s specific analysis back to the overall thesis statement', 'To introduce a brand new unrelated sub-argument topic', 'To list the dictionary definitions of complex terms'],
        correctIndex: 1,
        explanation: 'The Link connects the localized paragraph point and analysis back to the main thesis argument, closing the loop and sustaining logical unity.'
      }
    },
    {
      id: 'eng_m3',
      sequence: 3,
      title: 'Rhetorical Devices & Analytical Writing',
      description: 'Decoding author styles. Inspecting rhetorical appeals (ethos, pathos, logos), figurative tools, metaphors, syntax layouts, and critical analytical essays.',
      duration: 'Week 5-6',
      topics: ['Rhetorical appeals details (Ethos, Pathos, Logos)', 'Tone, Syntax and Diction inspections', 'Anatomy of Metaphors and Allusions', 'Authorial intentionality research'],
      learningObjectives: ['Distinguish subtle logical, moral or sensory appeals in speeches', 'Evaluate the impact of deliberate syntax constructions', 'Compose an eloquent, critically rigorous analytical paper'],
      resources: [
        { name: 'Rhetorical Devices Dictionary.pdf', url: '#', type: 'pdf' },
        { name: 'Famous Speech Audio Analyzers', url: '#', type: 'video' }
      ],
      quiz: {
        question: 'Which of the following describes an appeal relying on the author\'s credibility, expertise, or professional standing?',
        options: ['Pathos', 'Logos', 'Kairos', 'Ethos'],
        correctIndex: 3,
        explanation: 'Ethos focuses on establishing authority, credibility, ethical character, or expertise of the speaker to build reader confidence.'
      }
    }
  ]
};

// Default generic roadmap if matching subject is empty
const DEFAULT_ROADMAP: Omit<SyllabusModule, 'status'>[] = [
  {
    id: 'gen_m1',
    sequence: 1,
    title: 'Introductory Core Concepts',
    description: 'Developing primary baseline ideas, laying foundation definitions, and acquiring study guide checklists.',
    duration: 'Week 1-2',
    topics: ['Class Syllabus Reading', 'Baseline terminology definitions', 'Foundational workflows'],
    learningObjectives: ['Locate necessary course lecture notes', 'Explain fundamentals without referencing materials'],
    resources: [{ name: 'Prerequisites Guide.pdf', url: '#', type: 'pdf' }],
    quiz: {
      question: 'What is the most effective proactive way to utilize class syllabus roadmaps?',
      options: ['Review material ahead of schedules', 'Ignore it until exam prep', 'Read only when grades are released', 'Wait for specific advisor slides'],
      correctIndex: 0,
      explanation: 'Reviewing milestones beforehand lets your mind construct contextual hooks, optimizing lesson assimilation during live lectures.'
    }
  },
  {
    id: 'gen_m2',
    sequence: 2,
    title: 'Intermediate Worksheets & Quizzes',
    description: 'Transitioning conceptual tools into operational expertise. Explores practical workflows, problem solving lists, and quiz formats.',
    duration: 'Week 3-4',
    topics: ['Worksheet walkthrough rules', 'Quiz patterns analysis', 'Peer collaboration setups'],
    learningObjectives: ['Complete worksheets inside scheduled margins', 'Identify common errors before submitting units'],
    resources: [{ name: 'Quiz Prep Resources pack.pdf', url: '#', type: 'pdf' }],
    quiz: {
      question: 'How do peer learning structures enhance core concepts mastery?',
      options: ['They replace standard exam rubrics', 'Explaining materials to peers establishes deeper cognitive pathways', 'They minimize individual study times', 'They avoid direct research duties'],
      correctIndex: 1,
      explanation: 'Teaching and articulating ideas in your own words forces neural re-indexing of rules, revealing subtle gaps in personal understanding.'
    }
  },
  {
    id: 'gen_m3',
    sequence: 3,
    title: 'Advanced Applied Systems & Thesis',
    description: 'Aggregating separate subcomponents of study into comprehensive master structures or real-world frameworks.',
    duration: 'Week 5-6',
    topics: ['Structuring large project modules', 'Integrating references guidelines', 'Drafting master slide decks'],
    learningObjectives: ['Design high-fidelity applied systems', 'Defend choices rationally to reviewers'],
    resources: [{ name: 'Syllabus Thesis Checklist.pdf', url: '#', type: 'pdf' }],
    quiz: {
      question: 'According to learning science, what active recall method secures maximum retrieval strength?',
      options: ['Repetitive passive reviewing of highlights', 'Self-generated testing without referencing course notes', 'Listening to lecture recordings at high speed', 'Copying notes line-by-line'],
      correctIndex: 1,
      explanation: 'Active retrieval (testing yourself blindly) stimulates brain retrieval pathways, creating durable, long-term memory retrieval markers.'
    }
  }
];

export const StudentModuleRoadmap: React.FC<StudentModuleRoadmapProps> = ({ currentUser, userBookings, classes }) => {
  const [selectedClassId, setSelectedClassId] = useState<string>("default");
  const [filter, setFilter] = useState<'all' | 'completed' | 'ongoing'>('all');
  const [activeStepId, setActiveStepId] = useState<string>('');
  
  // Quiz and interactive states
  const [quizAnswerIndex, setQuizAnswerIndex] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizSuccess, setQuizSuccess] = useState<boolean | null>(null);
  
  // In-memory completion states so students can interactively mark lessons finished!
  const [completedModulesState, setCompletedModulesState] = useState<Record<string, boolean>>(() => {
    // Math 1 & 2 pre-completed, Coding 1 & 2 pre-completed etc. to make it highly realistic
    return {
      'math_m1': true,
      'math_m2': true,
      'code_m1': true,
      'code_m2': true,
      'phys_m1': true,
      'phys_m2': true,
      'eng_m1': true,
      'eng_m2': true,
      'gen_m1': true
    };
  });

  // Calculate user classes list for dropdown
  const activeBookings = useMemo(() => {
    const seen = new Set<string>();
    return userBookings.filter(b => {
      if (b.status !== 'active') return false;
      if (seen.has(b.classId)) return false;
      seen.add(b.classId);
      return true;
    });
  }, [userBookings]);

  const coursesList = useMemo(() => {
    if (activeBookings.length === 0) {
      return [
        { id: "demo_math", title: "AP Calculus AB: Mastering the Core", subject: "Mathematics" },
        { id: "demo_coding", title: "Web Development Essentials: HTML, CSS, JS", subject: "Coding" },
        { id: "demo_physics", title: "Newtonian Physics & Classical Mechanics", subject: "Physics" },
        { id: "demo_english", title: "Critical Essay Writing & IELTS Prep", subject: "English" }
      ];
    }
    return activeBookings.map(b => {
      const match = classes.find(c => c.id === b.classId);
      return {
        id: b.classId,
        title: b.classTitle,
        subject: match?.subject || "Mathematics"
      };
    });
  }, [activeBookings, classes]);

  // Set default class on load
  React.useEffect(() => {
    if (coursesList.length > 0 && selectedClassId === "default") {
      setSelectedClassId(coursesList[0].id);
    }
  }, [coursesList, selectedClassId]);

  // Selected subject profile
  const activeClassProfile = useMemo(() => {
    return coursesList.find(c => c.id === selectedClassId) || { id: 'default', title: 'Calculus', subject: 'Mathematics' };
  }, [coursesList, selectedClassId]);

  // Generate modules on selection
  const syllabusModules = useMemo(() => {
    const rawModules = SUBJECT_ROADMAPS[activeClassProfile.subject] || DEFAULT_ROADMAP;
    
    // Determine status of each module dynamically
    // Sequence 1 and 2 are usually completed. Sequence 3 is current. Sequence 4+ are upcoming.
    return rawModules.map(m => {
      const isCompleted = completedModulesState[m.id] === true;
      let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
      
      if (isCompleted) {
        status = 'completed';
      } else {
        // If it isn't completed, is it the first uncompleted one? That's current!
        const prevUncompleted = rawModules.some(p => p.sequence < m.sequence && !completedModulesState[p.id]);
        if (!prevUncompleted) {
          status = 'current';
        } else {
          status = 'upcoming';
        }
      }

      return {
        ...m,
        status
      } as SyllabusModule;
    });
  }, [activeClassProfile, completedModulesState]);

  // Set default active step ID when syllabusModules or class changes
  React.useEffect(() => {
    if (syllabusModules.length > 0) {
      // Prioritize setting 'current' module as active to inspect first
      const currentMod = syllabusModules.find(m => m.status === 'current') || syllabusModules[0];
      setActiveStepId(currentMod.id);
      
      // Reset quiz states when class switches
      setQuizAnswerIndex(null);
      setQuizSubmitted(false);
      setQuizSuccess(null);
    }
  }, [selectedClassId, syllabusModules]);

  // Selected active step information
  const activeStepModule = useMemo(() => {
    return syllabusModules.find(m => m.id === activeStepId) || syllabusModules[0];
  }, [syllabusModules, activeStepId]);

  // Filter modules lists
  const filteredModules = useMemo(() => {
    return syllabusModules.filter(m => {
      if (filter === 'completed') return m.status === 'completed';
      if (filter === 'ongoing') return m.status === 'current' || m.status === 'upcoming';
      return true;
    });
  }, [syllabusModules, filter]);

  // Progress metrics calculation
  const metrics = useMemo(() => {
    const total = syllabusModules.length;
    const completed = syllabusModules.filter(m => m.status === 'completed').length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [syllabusModules]);

  // Handle Mark complete action
  const handleToggleComplete = (moduleId: string) => {
    const currentlyComplete = completedModulesState[moduleId] === true;
    setCompletedModulesState(prev => ({
      ...prev,
      [moduleId]: !currentlyComplete
    }));
    
    // Clear quiz states when toggle completes
    setQuizAnswerIndex(null);
    setQuizSubmitted(false);
    setQuizSuccess(null);
  };

  // Submit assessment quiz
  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStepModule || quizAnswerIndex === null) return;

    const isCorrect = quizAnswerIndex === activeStepModule.quiz.correctIndex;
    setQuizSubmitted(true);
    setQuizSuccess(isCorrect);

    if (isCorrect && activeStepModule.status !== 'completed') {
      // Auto-complete the module as a fun interactive reward!
      setCompletedModulesState(prev => ({
        ...prev,
        [activeStepModule.id]: true
      }));
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl space-y-6" id="digital_syllabus_roadmap_panel">
      
      {/* Top Banner Control Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-black text-slate-900 tracking-tight">Interactive Course Learning Roadmap</h3>
          </div>
          <p className="text-xs text-slate-450 leading-relaxed max-w-xl">
            Track syllabus progress milestones step-by-step. Toggle subjects, download learning resources, and participate in interactive checks to unlock advance grades.
          </p>
        </div>

        {/* Dynamic Class selection dropdown */}
        <div className="flex-shrink-0">
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Select Course Syllabus:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs font-black px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-slate-800 outline-none w-full md:w-68 transition-all"
          >
            {coursesList.map(c => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.subject})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Progress Meter Row */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        
        {/* Progress Percentage Circle/Pill */}
        <div className="md:col-span-3 flex items-center gap-4 border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-4">
          <div className="h-14 w-14 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-center flex-shrink-0">
            <span className="text-lg font-black text-indigo-700 tracking-tight font-mono">{metrics.percentage}%</span>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Syllabus Completion</span>
            <span className="text-xs font-black text-slate-800 font-sans block">{metrics.completed} of {metrics.total} Modules Completed</span>
          </div>
        </div>

        {/* Graphical Progress Timeline bar */}
        <div className="md:col-span-6 space-y-2">
          <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-1">
            <span>Syllabus Covered</span>
            <span>Final exam countdown</span>
          </div>
          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-100">
            <motion.div 
              className="bg-gradient-to-r from-indigo-500 to-blue-600 h-2.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${metrics.percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>Term Start</span>
            <span className="text-indigo-650 font-bold">50% Midterm point passed</span>
            <span>Course End</span>
          </div>
        </div>

        {/* Quick Filter Menu */}
        <div className="md:col-span-3 flex justify-start md:justify-end gap-1.5 pt-2 md:pt-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${filter === 'all' ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm' : 'bg-slate-50 text-slate-650 hover:bg-slate-100 border-slate-150'}`}
          >
            All Steps
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${filter === 'completed' ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm' : 'bg-slate-50 text-slate-650 hover:bg-slate-100 border-slate-150'}`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('ongoing')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${filter === 'ongoing' ? 'bg-indigo-600 text-white border-indigo-650 shadow-sm' : 'bg-slate-50 text-slate-650 hover:bg-slate-100 border-slate-150'}`}
          >
            Ongoing
          </button>
        </div>

      </div>

      {/* Main Interactive Roadmap Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left/Center Column: Step-Based interactive vertical timeline */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-5">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Course Syllabus Milestones Timeline</h4>
            <span className="text-[10px] text-slate-400 italic">Tap any milestone to select</span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-150">
            {filteredModules.map((m, idx) => {
              const isSelected = activeStepId === m.id;
              
              let bubbleStyle = "bg-white border-slate-350 text-slate-400";
              let cardStyle = "border-slate-100 bg-slate-50/20";
              
              if (m.status === 'completed') {
                bubbleStyle = "bg-emerald-100 border-emerald-500 text-emerald-700 font-extrabold";
                cardStyle = "border-emerald-100/50 bg-emerald-50/10 hover:border-emerald-200";
              } else if (m.status === 'current') {
                bubbleStyle = "bg-indigo-100 border-indigo-600 text-indigo-700 ring-4 ring-indigo-50 animate-pulse";
                cardStyle = "border-indigo-200 bg-indigo-50/20 hover:border-indigo-300 shadow-[0_4px_12px_rgba(79,70,229,0.06)]";
              } else {
                cardStyle = "border-slate-100 bg-white hover:border-slate-200 opacity-75";
              }

              if (isSelected) {
                cardStyle += " border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/10 scale-[1.01]";
              }

              return (
                <motion.div 
                  key={m.id}
                  onClick={() => setActiveStepId(m.id)}
                  className="relative group cursor-pointer transition-all"
                  whileHover={{ x: 2 }}
                >
                  
                  {/* Circle Step timeline indicator node */}
                  <div className={`absolute -left-[23px] top-4 h-6 w-6 rounded-full border-2 flex items-center justify-center text-[10px] transition-all z-10 ${bubbleStyle}`}>
                    {m.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : m.status === 'upcoming' ? (
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                    ) : (
                      <span className="font-mono text-[9px] font-black">{m.sequence}</span>
                    )}
                  </div>

                  {/* Detail Row Content Block */}
                  <div className={`border p-4 rounded-xl transition-all space-y-1.5 ${cardStyle}`}>
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">STEP 0{m.sequence}</span>
                        <span className="text-xs text-slate-500 font-medium font-mono">({m.duration})</span>
                      </div>
                      
                      {m.status === 'current' && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-indigo-600 text-white tracking-widest animate-pulse">
                          Active In Class
                        </span>
                      )}
                      {m.status === 'completed' && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Done
                        </span>
                      )}
                    </div>

                    <h5 className="text-xs font-extrabold text-slate-850 leading-tight group-hover:text-indigo-650 transition-colors">
                      {m.title}
                    </h5>

                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                      {m.description}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.topics.slice(0, 2).map((top, tIdx) => (
                        <span key={tIdx} className="px-1.5 py-0.5 bg-slate-100 text-slate-650 rounded text-[9px] font-medium">
                          {top}
                        </span>
                      ))}
                      {m.topics.length > 2 && (
                        <span className="text-[9px] text-slate-400 font-semibold self-center">+{m.topics.length - 2} more</span>
                      )}
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Step detail info sheet & Interactive Quiz/Download Action Center */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Active step detailed view */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStepModule.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5"
            >
              
              {/* Header card info */}
              <div className="flex justify-between items-start border-b border-slate-50 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Milestone Step 0{activeStepModule.sequence}</span>
                  <h4 className="text-sm font-black text-slate-900 leading-snug">{activeStepModule.title}</h4>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-500" /> {activeStepModule.duration}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-indigo-500" /> {activeStepModule.topics.length} core focus topics</span>
                  </div>
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  <button
                    onClick={() => handleToggleComplete(activeStepModule.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5 cursor-pointer ${activeStepModule.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {activeStepModule.status === 'completed' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Completed
                      </>
                    ) : (
                      "Mark Complete"
                    )}
                  </button>
                </div>
              </div>

              {/* Syllabus Description */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Overview Description</span>
                <p className="text-xs text-slate-650 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100/50">
                  {activeStepModule.description}
                </p>
              </div>

              {/* Core Learning Topics & Key objectives checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Weekly Topics Focus</span>
                  <ul className="space-y-1.5">
                    {activeStepModule.topics.map((top, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-650">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span className="truncate" title={top}>{top}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Expected Outcomes</span>
                  <ul className="space-y-1.5">
                    {activeStepModule.learningObjectives.map((obj, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-650">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <span className="leading-tight text-slate-600">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Learning Resource Downloads */}
              <div className="border-t border-slate-50 pt-4 space-y-2.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">Attached Syllabus Material Resources</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {activeStepModule.resources.map((res, rIdx) => (
                    <a 
                      key={rIdx} 
                      href={res.url} 
                      onClick={(e) => { e.preventDefault(); alert(`Successfully synchronized resource folder for '${res.name}'! Study guides are fully configured.`); }}
                      className="p-2.5 border border-slate-100 hover:border-indigo-150 bg-slate-50/50 hover:bg-slate-50 rounded-xl flex items-center justify-between text-xs text-slate-700 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {res.type === 'pdf' ? (
                          <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                        ) : res.type === 'video' ? (
                          <PlayCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Compass className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold truncate">{res.name}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-650 transition-colors" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Interactive Self-Assessment Quiz box block */}
              <div className="border-t border-slate-100 pt-4 space-y-4 bg-slate-50/30 p-4 rounded-xl border border-dashed">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-4.5 h-4.5 text-indigo-550" />
                  <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider font-mono">Interactive Self-Assessment Check</span>
                </div>

                <form onSubmit={handleQuizSubmit} className="space-y-3">
                  <span className="text-xs font-extrabold text-slate-800 leading-snug block">
                    {activeStepModule.quiz.question}
                  </span>

                  <div className="space-y-1.5">
                    {activeStepModule.quiz.options.map((opt, oIdx) => {
                      const isSelected = quizAnswerIndex === oIdx;
                      let optionStyle = "border-slate-150 bg-white hover:bg-slate-50/55";
                      if (isSelected) optionStyle = "border-indigo-550 bg-indigo-50/50 ring-1 ring-indigo-500 text-indigo-900";
                      
                      if (quizSubmitted) {
                        const isCorrectOption = oIdx === activeStepModule.quiz.correctIndex;
                        if (isCorrectOption) {
                          optionStyle = "border-emerald-550 bg-emerald-50/50 text-emerald-900 font-bold";
                        } else if (isSelected) {
                          optionStyle = "border-rose-550 bg-rose-50/50 text-rose-950 line-through";
                        }
                      }

                      return (
                        <label 
                          key={oIdx} 
                          className={`p-2.5 rounded-xl border text-xs leading-snug cursor-pointer flex items-center gap-2.5 transition-all ${optionStyle}`}
                        >
                          <input 
                            type="radio" 
                            name="quizOption" 
                            value={oIdx} 
                            disabled={quizSubmitted}
                            checked={isSelected}
                            onChange={() => setQuizAnswerIndex(oIdx)}
                            className="text-indigo-600 focus:ring-indigo-500 accent-indigo-600 flex-shrink-0"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>

                  {!quizSubmitted ? (
                    <button
                      type="submit"
                      disabled={quizAnswerIndex === null}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer w-full"
                    >
                      <span>Submit Diagnostic Check</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-100" />
                    </button>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <div className={`p-3.5 rounded-xl text-xs flex gap-2.5 ${quizSuccess ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-rose-50 border border-rose-100 text-rose-800'}`}>
                        <div className="flex-shrink-0 font-bold text-base leading-none">
                          {quizSuccess ? "🎉" : "❌"}
                        </div>
                        <div className="space-y-1">
                          <h6 className="font-black">{quizSuccess ? "Mastery Quiz Succeeded!" : "Revision Recommended"}</h6>
                          <p className="text-[11px] leading-relaxed text-slate-650">
                            {activeStepModule.quiz.explanation}
                          </p>
                          {quizSuccess && activeStepModule.status !== 'completed' && (
                            <p className="text-[10px] text-emerald-700 font-bold font-mono pt-1">
                              ✨ Fun milestone reward: This module was marked complete automatically!
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setQuizAnswerIndex(null);
                          setQuizSubmitted(false);
                          setQuizSuccess(null);
                        }}
                        className="text-[11px] font-bold text-indigo-650 hover:text-indigo-850 flex items-center gap-1 font-mono cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-indigo-500" /> Take self-assessment quiz again
                      </button>
                    </div>
                  )}

                </form>
              </div>

            </motion.div>
          </AnimatePresence>

          {/* Gamification Rewards box card */}
          <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-28 w-28 bg-white/5 rounded-full blur-xl transform translate-x-8 -translate-y-8" />
            <div className="absolute bottom-0 left-0 h-24 w-24 bg-white/5 rounded-full blur-xl transform -translate-x-[20px] translate-y-12" />
            
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold text-indigo-300 uppercase tracking-widest block">Syllabus Champion Achievements</span>
                <h4 className="text-sm font-extrabold tracking-tight">Active Scholar Badges Inventory</h4>
              </div>
              <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
            </div>

            <p className="text-[11px] text-indigo-200 leading-relaxed">
              Completing diagnostic self-assessment quizzes and marking syllabus blocks complete boosts your learning momentum score. Maintain a 3-week streak to unlock premium homework tutoring options!
            </p>

            <div className="flex items-center gap-3 pt-1 border-t border-indigo-800/40">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full bg-indigo-700 border-2 border-slate-900 flex items-center justify-center text-xs" title="Limits Champion">📐</div>
                <div className="h-8 w-8 rounded-full bg-indigo-700 border-2 border-slate-900 flex items-center justify-center text-xs" title="React Novice">⚛️</div>
                <div className="h-8 w-8 rounded-full bg-indigo-705 border-2 border-slate-900 flex items-center justify-center text-xs text-indigo-300 font-extrabold" title="Ongoing Streaks">🔥</div>
              </div>
              <span className="text-[10px] text-indigo-300 font-mono">Current Learning Streak: <b className="text-white font-bold font-sans">8 Days Streak</b></span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
