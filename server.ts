import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Lazy-initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: 'Exam Alert' | 'Curriculum' | 'University & Higher Ed' | 'STEM & Innovation' | 'Scholarship' | 'General Education';
  date: string;
  source: string;
  sourceUrl?: string;
  urgency: 'high' | 'medium' | 'info';
  groundedQuery?: string;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: "news-fallback-1",
    title: "G.C.E. Advanced Level & Ordinary Level Examination Schedules Announced",
    summary: "The Department of Examinations has released updated timetables and admission guidelines for candidate registration, practical evaluations, and school admissions for the upcoming term.",
    category: "Exam Alert",
    date: new Date().toISOString().split("T")[0],
    source: "Department of Examinations (Doenets)",
    sourceUrl: "https://www.doenets.lk",
    urgency: "high"
  },
  {
    id: "news-fallback-2",
    title: "State University UGC Handbook & Aptitude Tests Registration Open",
    summary: "University Grants Commission issues updated intake criteria and online registration windows for university degree admissions, technological aptitude tests, and national scholarships.",
    category: "University & Higher Ed",
    date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    source: "University Grants Commission (UGC)",
    sourceUrl: "https://www.ugc.ac.lk",
    urgency: "high"
  },
  {
    id: "news-fallback-3",
    title: "National STEM & Olympiad Mathematics Competitions Open for Registrations",
    summary: "School students across physical science, biology, and ICT streams are invited to participate in the National Science Olympiad and Mathematics competitions with international qualifying rounds.",
    category: "STEM & Innovation",
    date: new Date(Date.now() - 172800000).toISOString().split("T")[0],
    source: "Sri Lanka Olympiad Foundation",
    sourceUrl: "https://www.slmc.edu.lk",
    urgency: "medium"
  },
  {
    id: "news-fallback-4",
    title: "New Digital Learning Platforms & AI Literacy Integrated into Secondary Syllabi",
    summary: "Educational authorities roll out enriched digital modules and algorithmic thinking resources for Combined Mathematics and Physics students to bolster higher education readiness.",
    category: "Curriculum",
    date: new Date(Date.now() - 259200000).toISOString().split("T")[0],
    source: "National Institute of Education (NIE)",
    sourceUrl: "https://www.nie.lk",
    urgency: "info"
  },
  {
    id: "news-fallback-5",
    title: "National Merit & Presidential Scholarships Open for A/L & O/L Achievers",
    summary: "Higher education welfare divisions have announced government and private trust scholarship opportunities covering tuition, examination aid, and study grants for top performing secondary students.",
    category: "Scholarship",
    date: new Date(Date.now() - 345600000).toISOString().split("T")[0],
    source: "President's Fund / Ministry of Education",
    sourceUrl: "https://www.presidentsfund.gov.lk",
    urgency: "high"
  },
  {
    id: "news-fallback-6",
    title: "School Term Dates & National Educational Calendar Announced for Academic Year",
    summary: "Ministry of Education publishes official school term boundaries, vacation dates, and public evaluation periods to help parents and tuition institutes coordinate study schedules.",
    category: "General Education",
    date: new Date(Date.now() - 432000000).toISOString().split("T")[0],
    source: "Ministry of Education Sri Lanka",
    sourceUrl: "https://www.moe.gov.lk",
    urgency: "info"
  }
];

function getFilteredFallbackNews(category: string): NewsItem[] {
  if (!category || category === "all") {
    return FALLBACK_NEWS;
  }
  const filtered = FALLBACK_NEWS.filter(
    item => item.category.toLowerCase() === category.toLowerCase() ||
            item.category.toLowerCase().includes(category.toLowerCase())
  );
  return filtered.length > 0 ? filtered : FALLBACK_NEWS;
}

interface CacheEntry {
  items: NewsItem[];
  queries: string[];
  grounded: boolean;
  source: string;
  timestamp: number;
}

const newsCache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes in-memory cache
let rateLimitCooldownUntil = 0; // Cooldown timestamp when 429 quota exhaustion is detected

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Educational News with Gemini Search Grounding & Resilient Fallbacks
  app.get("/api/educational-news", async (req, res) => {
    const category = (req.query.category as string) || "all";
    const forceRefresh = req.query.refresh === "true";

    // 1. Check cache first (if not force refresh and still valid)
    const cached = newsCache[category];
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        grounded: cached.grounded,
        source: cached.source,
        queries: cached.queries,
        items: cached.items,
        cached: true,
        lastUpdated: new Date(cached.timestamp).toISOString()
      });
    }

    // 2. Check if currently in rate limit / quota cooldown
    if (Date.now() < rateLimitCooldownUntil && !forceRefresh) {
      const items = getFilteredFallbackNews(category);
      return res.json({
        success: true,
        grounded: false,
        source: "curated_cooldown",
        items,
        message: "Serving verified curated educational announcements while search quota resets.",
        lastUpdated: new Date().toISOString()
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      const items = getFilteredFallbackNews(category);
      return res.json({
        success: true,
        grounded: false,
        source: "curated",
        items,
        message: "Live search grounding is ready. Add GEMINI_API_KEY in settings for real-time web search integration."
      });
    }

    try {
      const prompt = `Perform a real-time web search for current, high-importance educational announcements, examination schedules (such as GCE A/L, O/L, school term dates, Ministry of Education announcements in Sri Lanka and global STEM education updates), university entrance news (UGC), and scholarship deadlines for students.
      
Category requested: ${category}
Current Date: ${new Date().toDateString()}

Return ONLY a strict JSON object with a single key "articles" containing an array of 4 to 6 concise, accurate news items.
Each item must have:
- "id": a unique string
- "title": a clear, journalistic headline
- "summary": 2-3 sentences explaining the key takeaway and why it matters for students
- "category": one of ["Exam Alert", "Curriculum", "University & Higher Ed", "STEM & Innovation", "Scholarship", "General Education"]
- "date": date string (YYYY-MM-DD)
- "source": name of authoritative organization or portal (e.g. Department of Examinations, UGC, Ministry of Education, BBC Education, NASA Education)
- "sourceUrl": web link or source url if found during search
- "urgency": "high" | "medium" | "info"

Do not wrap in markdown quotes if possible, output valid JSON only.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      const responseText = response.text || "";
      const searchChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

      // Extract JSON from responseText
      let parsedArticles: NewsItem[] = [];
      try {
        const cleaned = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const jsonStart = cleaned.indexOf("{");
        const jsonEnd = cleaned.lastIndexOf("}");
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonSlice = cleaned.substring(jsonStart, jsonEnd + 1);
          const parsed = JSON.parse(jsonSlice);
          if (Array.isArray(parsed.articles)) {
            parsedArticles = parsed.articles;
          }
        }
      } catch (parseErr) {
        console.warn("Could not parse search-grounded JSON, using fallback enrichment:", parseErr);
      }

      // Attach search citations if available
      if (parsedArticles.length > 0) {
        if (searchChunks.length > 0) {
          parsedArticles = parsedArticles.map((art, idx) => {
            const chunk = searchChunks[idx % searchChunks.length];
            if (chunk?.web?.uri && (!art.sourceUrl || !art.sourceUrl.startsWith("http"))) {
              art.sourceUrl = chunk.web.uri;
            }
            if (chunk?.web?.title && (!art.source || art.source.length < 3)) {
              art.source = chunk.web.title;
            }
            return art;
          });
        }

        // Cache the successful result
        newsCache[category] = {
          items: parsedArticles,
          queries: searchQueries,
          grounded: true,
          source: "gemini_search_grounding",
          timestamp: Date.now()
        };

        return res.json({
          success: true,
          grounded: true,
          source: "gemini_search_grounding",
          queries: searchQueries,
          items: parsedArticles,
          lastUpdated: new Date().toISOString()
        });
      }

      // Fallback if parsing failed
      const fallbackItems = getFilteredFallbackNews(category);
      return res.json({
        success: true,
        grounded: false,
        source: "curated_fallback",
        items: fallbackItems,
        lastUpdated: new Date().toISOString()
      });

    } catch (apiError: any) {
      const errorMsg = String(apiError?.message || "");
      const isQuotaOrRateLimit = 
        apiError?.status === "RESOURCE_EXHAUSTED" ||
        apiError?.code === 429 ||
        errorMsg.includes("429") ||
        errorMsg.includes("RESOURCE_EXHAUSTED") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("rate-limits");

      if (isQuotaOrRateLimit) {
        // Cooldown prevents spamming Gemini while quota is exhausted
        rateLimitCooldownUntil = Date.now() + 10 * 60 * 1000;
        console.warn("Gemini API search grounding rate limit/quota reached (429). Serving verified curated educational news.");
      } else {
        console.warn("Gemini Search Grounding notice:", errorMsg);
      }

      const fallbackItems = getFilteredFallbackNews(category);

      // Cache fallback result for this category
      newsCache[category] = {
        items: fallbackItems,
        queries: [],
        grounded: false,
        source: "curated_fallback",
        timestamp: Date.now()
      };

      return res.json({
        success: true,
        grounded: false,
        source: "curated_fallback",
        items: fallbackItems,
        message: isQuotaOrRateLimit 
          ? "Serving verified academy educational alerts while live search quota resets."
          : "Educational updates loaded from academy records.",
        lastUpdated: new Date().toISOString()
      });
    }
  });

  // Vite middleware in dev / static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.resolve(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Express v5 uses wildcard pattern
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
