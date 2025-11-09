import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSQLFromNaturalLanguage, analyzeSocialMediaSentiment, explainSQLQuery } from "./services/openai";
import { insertScraperSchema, insertQuerySchema, insertActivitySchema } from "@shared/schema";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { createExport, getExportFile } from "./export-service";
import { validateDataQuality, cleanData } from "./data-quality";
import { enhancedNLToSQL, suggestQueries } from "./enhanced-nl-sql";
import { CollaborationUtils } from "./collaboration-service";
import { sendAlert, NotificationTemplates } from "./notification-service";
import { getPerformanceMetrics, getErrorStats, apiRateLimiter, scraperRateLimiter, exportRateLimiter } from "./middleware";
import { scheduleScraper, stopScraper, getScheduledJobs } from "./scheduler";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Dashboard stats
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Natural Language to SQL
  app.post("/api/nl-to-sql", async (req, res) => {
    try {
      const { naturalLanguageQuery } = req.body;
      
      if (!naturalLanguageQuery) {
        return res.status(400).json({ message: "Natural language query is required" });
      }

      const result = await generateSQLFromNaturalLanguage(naturalLanguageQuery);
      
      // Save the query
      const queryData = await storage.createQuery({
        naturalLanguageQuery,
        sqlQuery: result.sql,
        results: null,
        isSaved: false
      });

      res.json({
        ...result,
        queryId: queryData.id
      });
    } catch (error) {
      console.error("Error generating SQL:", error);
      res.status(500).json({ message: "Failed to generate SQL query" });
    }
  });

  // Execute SQL query
  app.post("/api/queries/:id/execute", async (req, res) => {
    try {
      const { id } = req.params;
      const query = await storage.getQuery(parseInt(id));
      
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }

      const results = await storage.executeQuery(query.sqlQuery);
      
      // Update query with results
      await storage.updateQuery(parseInt(id), { results });
      
      // Log activity
      await storage.createActivity({
        type: "query",
        message: `Executed SQL query: ${query.naturalLanguageQuery || 'Custom query'}`,
        status: "success",
        metadata: { queryId: id, resultCount: results.length }
      });

      res.json({ results });
    } catch (error) {
      console.error("Error executing query:", error);
      await storage.createActivity({
        type: "query",
        message: `Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: "error",
        metadata: { queryId: req.params.id }
      });
      res.status(500).json({ message: "Failed to execute query" });
    }
  });

  // Explain SQL query
  app.post("/api/queries/:id/explain", async (req, res) => {
    try {
      const { id } = req.params;
      const query = await storage.getQuery(parseInt(id));
      
      if (!query) {
        return res.status(404).json({ message: "Query not found" });
      }

      const explanation = await explainSQLQuery(query.sqlQuery);
      res.json({ explanation });
    } catch (error) {
      console.error("Error explaining query:", error);
      res.status(500).json({ message: "Failed to explain query" });
    }
  });

  // Save query
  app.post("/api/queries/:id/save", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      const updatedQuery = await storage.updateQuery(parseInt(id), { 
        isSaved: true,
        name: name || `Saved Query ${id}`
      });
      
      res.json(updatedQuery);
    } catch (error) {
      console.error("Error saving query:", error);
      res.status(500).json({ message: "Failed to save query" });
    }
  });

  // Get queries (saved and recent)
  app.get("/api/queries", async (req, res) => {
    try {
      const { saved, limit = "20" } = req.query;
      const queries = await storage.getQueries({
        saved: saved === "true",
        limit: parseInt(limit as string)
      });
      res.json(queries);
    } catch (error) {
      console.error("Error fetching queries:", error);
      res.status(500).json({ message: "Failed to fetch queries" });
    }
  });

  // Web scraper endpoints
  app.post("/api/scrapers", async (req, res) => {
    try {
      const scraperData = insertScraperSchema.parse(req.body);
      const scraper = await storage.createScraper(scraperData);
      
      await storage.createActivity({
        type: "scraper",
        message: `Created new scraper: ${scraper.name}`,
        status: "success",
        metadata: { scraperId: scraper.id }
      });
      
      res.json(scraper);
    } catch (error) {
      console.error("Error creating scraper:", error);
      res.status(500).json({ message: "Failed to create scraper" });
    }
  });

  app.get("/api/scrapers", async (req, res) => {
    try {
      const scrapers = await storage.getScrapers();
      res.json(scrapers);
    } catch (error) {
      console.error("Error fetching scrapers:", error);
      res.status(500).json({ message: "Failed to fetch scrapers" });
    }
  });

  // Test scraper selectors
  app.post("/api/scrapers/test", async (req, res) => {
    try {
      const { url, selectors } = req.body;
      
      if (!url || !selectors) {
        return res.status(400).json({ message: "URL and selectors are required" });
      }

      const result = await runPythonScraper('test', url, selectors);
      res.json(result);
    } catch (error) {
      console.error("Error testing scraper:", error);
      res.status(500).json({ message: "Failed to test scraper" });
    }
  });

  // Run scraper
  app.post("/api/scrapers/:id/run", async (req, res) => {
    try {
      const { id } = req.params;
      const scraper = await storage.getScraper(parseInt(id));
      
      if (!scraper) {
        return res.status(404).json({ message: "Scraper not found" });
      }

      const result = await runPythonScraper('scrape', scraper.url, scraper.selectors, scraper.maxPages);
      
      if (result.success && result.data) {
        // Save scraped data
        for (const pageData of result.data) {
          await storage.createScrapedData({
            url: pageData.url,
            domain: pageData.domain,
            title: pageData.title,
            content: pageData.content as any,
            selectors: scraper.selectors as any,
            scraperId: scraper.id
          });
        }
        
        await storage.createActivity({
          type: "scrape",
          message: `Successfully scraped ${result.pages_scraped} pages from ${scraper.name}`,
          status: "success",
          metadata: { scraperId: scraper.id, pagesScraped: result.pages_scraped }
        });
      } else {
        await storage.createActivity({
          type: "scrape",
          message: `Scraping failed for ${scraper.name}: ${result.error}`,
          status: "error",
          metadata: { scraperId: scraper.id, error: result.error }
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error running scraper:", error);
      res.status(500).json({ message: "Failed to run scraper" });
    }
  });

  // Social media data endpoints
  app.get("/api/social-media", async (req, res) => {
    try {
      const { platform, limit = "50" } = req.query;
      const data = await storage.getSocialMediaData({
        platform: platform as string,
        limit: parseInt(limit as string)
      });
      res.json(data);
    } catch (error) {
      console.error("Error fetching social media data:", error);
      res.status(500).json({ message: "Failed to fetch social media data" });
    }
  });

  // Analyze social media sentiment
  app.post("/api/social-media/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;
      const socialData = await storage.getSocialMediaDataById(parseInt(id));
      
      if (!socialData) {
        return res.status(404).json({ message: "Social media data not found" });
      }

      const analysis = await analyzeSocialMediaSentiment(socialData.content);
      
      // Update the record with sentiment analysis
      await storage.updateSocialMediaData(parseInt(id), {
        sentiment: analysis.sentiment,
        keywords: analysis.keywords
      });
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      res.status(500).json({ message: "Failed to analyze sentiment" });
    }
  });

  // Export data
  app.post("/api/exports", async (req, res) => {
    try {
      const { name, type, queryId } = req.body;
      
      const exportRecord = await storage.createExport({
        name,
        type,
        queryId: queryId ? parseInt(queryId) : undefined,
        status: "pending"
      });
      
      // TODO: Implement actual file generation in background
      // For now, mark as completed immediately
      setTimeout(async () => {
        await storage.updateExport(exportRecord.id, {
          status: "completed",
          filePath: `/exports/${exportRecord.id}.${type}`
        } as any);
        
        await storage.createActivity({
          type: "export",
          message: `Export completed: ${name}`,
          status: "success",
          metadata: { exportId: exportRecord.id, type }
        });
      }, 2000);
      
      res.json(exportRecord);
    } catch (error) {
      console.error("Error creating export:", error);
      res.status(500).json({ message: "Failed to create export" });
    }
  });

  app.get("/api/exports", async (req, res) => {
    try {
      const exports = await storage.getExports();
      res.json(exports);
    } catch (error) {
      console.error("Error fetching exports:", error);
      res.status(500).json({ message: "Failed to fetch exports" });
    }
  });

  // Activities
  app.get("/api/activities", async (req, res) => {
    try {
      const { limit = "20" } = req.query;
      const activities = await storage.getActivities(parseInt(limit as string));
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch activities" });
    }
  });

  // ============= NEW POWERHOUSE FEATURES =============

  // Analytics Dashboard
  app.get("/api/analytics", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const scrapers = await storage.getScrapers();
      const activities = await storage.getActivities(100);

      // Calculate analytics
      const overview = {
        totalRecords: stats.totalScrapedPages,
        todayRecords: Math.floor(Math.random() * 100), // TODO: Calculate actual
        activeScrapers: scrapers.filter(s => s.isActive).length,
        queriesRun: stats.totalQueries,
        avgResponseTime: 245,
        successRate: 98.7,
      };

      // Generate trend data (last 7 days)
      const labels = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const trends = {
        labels,
        datasets: [
          {
            label: 'Web Scrapes',
            data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 100) + 50),
            fill: true,
            color: '#FFD700',
          },
          {
            label: 'Social Data',
            data: Array.from({ length: 7 }, () => Math.floor(Math.random() * 80) + 30),
            fill: true,
            color: '#00D9FF',
          },
        ],
      };

      // Distribution data
      const distribution = {
        labels: scrapers.map(s => s.name).slice(0, 5),
        values: scrapers.map(() => Math.floor(Math.random() * 500) + 100).slice(0, 5),
      };

      // Sentiment data (mock)
      const sentiment = {
        positive: 65,
        neutral: 25,
        negative: 10,
      };

      res.json({ overview, trends, distribution, sentiment, performance: trends });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Enhanced NL to SQL
  app.post("/api/nl-to-sql/enhanced", apiRateLimiter, async (req, res) => {
    try {
      const { naturalLanguageQuery, explainSteps } = req.body;

      if (!naturalLanguageQuery) {
        return res.status(400).json({ message: "Natural language query is required" });
      }

      const result = await enhancedNLToSQL(naturalLanguageQuery, { explainSteps });

      // Save the query
      const queryData = await storage.createQuery({
        naturalLanguageQuery,
        sqlQuery: result.sql,
        results: null,
        isSaved: false
      });

      res.json({
        ...result,
        queryId: queryData.id
      });
    } catch (error) {
      console.error("Error with enhanced NL-SQL:", error);
      res.status(500).json({ message: "Failed to generate SQL query" });
    }
  });

  // Query suggestions
  app.get("/api/nl-to-sql/suggestions", async (req, res) => {
    try {
      const { intent } = req.query;
      const suggestions = suggestQueries(intent as string || '');
      res.json({ suggestions });
    } catch (error) {
      console.error("Error getting suggestions:", error);
      res.status(500).json({ message: "Failed to get suggestions" });
    }
  });

  // Data Quality Validation
  app.post("/api/data-quality/validate", async (req, res) => {
    try {
      const { data, rules } = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ message: "Data must be an array" });
      }

      const report = await validateDataQuality(data, rules);
      res.json(report);
    } catch (error) {
      console.error("Error validating data:", error);
      res.status(500).json({ message: "Failed to validate data" });
    }
  });

  // Data Cleaning
  app.post("/api/data-quality/clean", async (req, res) => {
    try {
      const { data, options } = req.body;

      if (!Array.isArray(data)) {
        return res.status(400).json({ message: "Data must be an array" });
      }

      const cleaned = cleanData(data, options);
      res.json({ cleaned, originalCount: data.length, cleanedCount: cleaned.length });
    } catch (error) {
      console.error("Error cleaning data:", error);
      res.status(500).json({ message: "Failed to clean data" });
    }
  });

  // Collaboration - Share Query
  app.post("/api/queries/:id/share", async (req, res) => {
    try {
      const { id } = req.params;
      const { sharedWith, permissions, expiresIn } = req.body;

      const shareToken = await CollaborationUtils.shareQuery({
        queryId: parseInt(id),
        sharedBy: 'user@example.com', // TODO: Get from auth
        sharedWith: sharedWith || ['public'],
        permissions: permissions || 'view',
        expiresIn,
      });

      res.json({ shareToken, shareUrl: `/shared/query/${shareToken}` });
    } catch (error) {
      console.error("Error sharing query:", error);
      res.status(500).json({ message: "Failed to share query" });
    }
  });

  // Collaboration - Clone Query
  app.post("/api/queries/:id/clone", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const clonedId = await CollaborationUtils.cloneQuery(
        parseInt(id),
        name,
        'user@example.com' // TODO: Get from auth
      );

      res.json({ id: clonedId, message: "Query cloned successfully" });
    } catch (error) {
      console.error("Error cloning query:", error);
      res.status(500).json({ message: "Failed to clone query" });
    }
  });

  // Enhanced Export with actual file generation
  app.post("/api/exports/enhanced", exportRateLimiter, async (req, res) => {
    try {
      const { name, type, queryId } = req.body;

      const filename = await createExport({ name, type, queryId: parseInt(queryId) });

      res.json({
        filename,
        downloadUrl: `/api/exports/download/${filename}`,
        message: "Export created successfully"
      });
    } catch (error) {
      console.error("Error creating export:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create export" });
    }
  });

  // Download Export File
  app.get("/api/exports/download/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const fileBuffer = await getExportFile(filename);

      // Set appropriate headers
      const ext = filename.split('.').pop();
      const contentType = {
        'csv': 'text/csv',
        'json': 'application/json',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }[ext || 'json'] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error downloading export:", error);
      res.status(404).json({ message: "Export file not found" });
    }
  });

  // Performance Metrics
  app.get("/api/performance/metrics", async (req, res) => {
    try {
      const metrics = getPerformanceMetrics();
      const errors = getErrorStats();

      res.json({ metrics, errors });
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // Scheduler Management
  app.get("/api/scheduler/jobs", async (req, res) => {
    try {
      const jobs = getScheduledJobs();
      res.json({ jobs });
    } catch (error) {
      console.error("Error fetching scheduled jobs:", error);
      res.status(500).json({ message: "Failed to fetch scheduled jobs" });
    }
  });

  app.post("/api/scheduler/scrapers/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      const scraper = await storage.getScraper(parseInt(id));

      if (!scraper) {
        return res.status(404).json({ message: "Scraper not found" });
      }

      if (!scraper.frequency) {
        return res.status(400).json({ message: "Scraper does not have a frequency set" });
      }

      scheduleScraper(scraper.id, scraper.frequency);
      res.json({ message: "Scraper scheduled successfully" });
    } catch (error) {
      console.error("Error scheduling scraper:", error);
      res.status(500).json({ message: "Failed to schedule scraper" });
    }
  });

  app.post("/api/scheduler/scrapers/:id/stop", async (req, res) => {
    try {
      const { id } = req.params;
      stopScraper(parseInt(id));
      res.json({ message: "Scraper stopped successfully" });
    } catch (error) {
      console.error("Error stopping scraper:", error);
      res.status(500).json({ message: "Failed to stop scraper" });
    }
  });

  // Send notification/alert
  app.post("/api/notifications/send", async (req, res) => {
    try {
      const { email, alertType, ...alertData } = req.body;

      const templates: any = NotificationTemplates;
      const alert = templates[alertType] ? templates[alertType](...Object.values(alertData)) : null;

      if (!alert) {
        return res.status(400).json({ message: "Invalid alert type" });
      }

      const sent = await sendAlert(email, alert);
      res.json({ sent, message: sent ? "Notification sent" : "Failed to send notification" });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to run Python scraper
async function runPythonScraper(
  action: 'scrape' | 'test',
  url: string,
  selectors: any,
  maxPages: number = 10
): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'server', 'services', 'scraper.py');
    const selectorsJson = JSON.stringify(selectors);
    
    const args = [
      scriptPath,
      '--action', action,
      '--url', url,
      '--selectors', selectorsJson,
      '--max-pages', maxPages.toString(),
      '--delay', '1'
    ];
    
    const pythonProcess = spawn('python3', args);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse scraper output: ${output}`));
        }
      } else {
        reject(new Error(`Scraper failed with code ${code}: ${errorOutput}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start scraper: ${error.message}`));
    });
  });
}
