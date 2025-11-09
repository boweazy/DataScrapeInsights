#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gold: '\x1b[38;5;220m',
};

// Configuration
const CONFIG_FILE = path.join(process.env.HOME || process.env.USERPROFILE, '.dataflow-cli.json');
let config = {
  apiUrl: 'http://localhost:5000',
  apiKey: null,
};

// Load config
try {
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
} catch (error) {
  // Config doesn't exist yet
}

// Save config
function saveConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// HTTP Request helper
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, config.apiUrl);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
      },
    };

    const req = protocol.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Commands
const commands = {
  async help() {
    console.log(`
${colors.gold}${colors.bright}DataFlow CLI${colors.reset} - Command Line Interface for DataFlow Analytics Platform

${colors.cyan}Usage:${colors.reset}
  dataflow <command> [options]

${colors.cyan}Commands:${colors.reset}
  ${colors.green}config${colors.reset}              Configure API endpoint and credentials
  ${colors.green}stats${colors.reset}               Show dashboard statistics
  ${colors.green}scrapers${colors.reset}            List all scrapers
  ${colors.green}scraper <id>${colors.reset}        Show scraper details
  ${colors.green}run <id>${colors.reset}            Run a scraper by ID
  ${colors.green}query <text>${colors.reset}        Convert natural language to SQL
  ${colors.green}execute <id>${colors.reset}        Execute a saved query
  ${colors.green}export <id> <type>${colors.reset}  Export query results (csv, json, excel)
  ${colors.green}activities${colors.reset}          Show recent activities
  ${colors.green}analytics${colors.reset}           Show analytics dashboard data
  ${colors.green}predict${colors.reset}             Get ML predictions
  ${colors.green}recommendations${colors.reset}     Get smart recommendations
  ${colors.green}help${colors.reset}                Show this help message

${colors.cyan}Examples:${colors.reset}
  dataflow config --api-url http://localhost:5000
  dataflow stats
  dataflow query "Show me the top 10 domains"
  dataflow run 1
  dataflow export 5 csv

${colors.dim}For more information, visit: https://github.com/smartflow-systems/DataScrapeInsights${colors.reset}
    `);
  },

  async config(args) {
    if (args.includes('--api-url')) {
      const index = args.indexOf('--api-url');
      config.apiUrl = args[index + 1];
      saveConfig();
      console.log(`${colors.green}✓${colors.reset} API URL set to: ${config.apiUrl}`);
    } else if (args.includes('--api-key')) {
      const index = args.indexOf('--api-key');
      config.apiKey = args[index + 1];
      saveConfig();
      console.log(`${colors.green}✓${colors.reset} API key configured`);
    } else {
      console.log(`${colors.cyan}Current configuration:${colors.reset}`);
      console.log(`  API URL: ${config.apiUrl}`);
      console.log(`  API Key: ${config.apiKey ? '***configured***' : 'not set'}`);
    }
  },

  async stats() {
    console.log(`${colors.cyan}Fetching dashboard statistics...${colors.reset}`);
    const stats = await request('GET', '/api/stats');

    console.log(`
${colors.gold}${colors.bright}Dashboard Statistics${colors.reset}

  ${colors.green}Scrapers:${colors.reset}        ${stats.totalScrapers} (${stats.activeScrapers} active)
  ${colors.green}Scraped Pages:${colors.reset}   ${stats.totalScrapedPages}
  ${colors.green}Queries:${colors.reset}         ${stats.totalQueries}
  ${colors.green}Exports:${colors.reset}         ${stats.totalExports}
  ${colors.green}Activities:${colors.reset}      ${stats.recentActivitiesCount}
    `);
  },

  async scrapers() {
    console.log(`${colors.cyan}Fetching scrapers...${colors.reset}`);
    const scrapers = await request('GET', '/api/scrapers');

    console.log(`\n${colors.gold}${colors.bright}Scrapers (${scrapers.length})${colors.reset}\n`);

    scrapers.forEach(scraper => {
      const status = scraper.isActive
        ? `${colors.green}●${colors.reset} Active`
        : `${colors.red}●${colors.reset} Inactive`;

      console.log(`  ${colors.cyan}[${scraper.id}]${colors.reset} ${scraper.name}`);
      console.log(`    ${status} | ${scraper.url}`);
      console.log(`    Frequency: ${scraper.frequency || 'manual'} | Max Pages: ${scraper.maxPages || 'unlimited'}`);
      console.log('');
    });
  },

  async scraper(args) {
    const id = args[0];
    if (!id) {
      console.log(`${colors.red}Error:${colors.reset} Scraper ID required`);
      return;
    }

    console.log(`${colors.cyan}Fetching scraper ${id}...${colors.reset}`);
    const scraper = await request('GET', `/api/scrapers/${id}`);

    console.log(`
${colors.gold}${colors.bright}Scraper Details${colors.reset}

  ${colors.cyan}ID:${colors.reset}          ${scraper.id}
  ${colors.cyan}Name:${colors.reset}        ${scraper.name}
  ${colors.cyan}URL:${colors.reset}         ${scraper.url}
  ${colors.cyan}Status:${colors.reset}      ${scraper.isActive ? colors.green + 'Active' : colors.red + 'Inactive'}${colors.reset}
  ${colors.cyan}Frequency:${colors.reset}   ${scraper.frequency || 'manual'}
  ${colors.cyan}Max Pages:${colors.reset}   ${scraper.maxPages || 'unlimited'}
  ${colors.cyan}Created:${colors.reset}     ${new Date(scraper.createdAt).toLocaleString()}
  ${colors.cyan}Updated:${colors.reset}     ${new Date(scraper.updatedAt).toLocaleString()}
    `);
  },

  async run(args) {
    const id = args[0];
    if (!id) {
      console.log(`${colors.red}Error:${colors.reset} Scraper ID required`);
      return;
    }

    console.log(`${colors.cyan}Running scraper ${id}...${colors.reset}`);
    const result = await request('POST', `/api/scrapers/${id}/run`);

    if (result.success) {
      console.log(`${colors.green}✓ Scrape completed successfully${colors.reset}`);
      console.log(`  Pages scraped: ${result.pages_scraped}`);
      console.log(`  Items collected: ${result.data?.length || 0}`);
    } else {
      console.log(`${colors.red}✗ Scrape failed${colors.reset}`);
      console.log(`  Error: ${result.error}`);
    }
  },

  async query(args) {
    const queryText = args.join(' ');
    if (!queryText) {
      console.log(`${colors.red}Error:${colors.reset} Query text required`);
      return;
    }

    console.log(`${colors.cyan}Converting to SQL...${colors.reset}`);
    const result = await request('POST', '/api/nl-to-sql', { naturalLanguageQuery: queryText });

    console.log(`
${colors.gold}${colors.bright}Query Result${colors.reset}

  ${colors.cyan}Natural Language:${colors.reset}
    ${queryText}

  ${colors.cyan}Generated SQL:${colors.reset}
    ${colors.green}${result.sql}${colors.reset}

  ${colors.cyan}Explanation:${colors.reset}
    ${result.explanation}

  ${colors.cyan}Query ID:${colors.reset} ${result.queryId}
  ${colors.dim}Use "dataflow execute ${result.queryId}" to run this query${colors.reset}
    `);
  },

  async execute(args) {
    const id = args[0];
    if (!id) {
      console.log(`${colors.red}Error:${colors.reset} Query ID required`);
      return;
    }

    console.log(`${colors.cyan}Executing query ${id}...${colors.reset}`);
    const result = await request('POST', `/api/queries/${id}/execute`);

    console.log(`${colors.green}✓ Query executed successfully${colors.reset}`);
    console.log(`  Rows returned: ${result.results.length}`);

    if (result.results.length > 0 && result.results.length <= 10) {
      console.log(`\n${colors.cyan}Results:${colors.reset}`);
      console.table(result.results);
    } else if (result.results.length > 10) {
      console.log(`\n${colors.cyan}First 10 results:${colors.reset}`);
      console.table(result.results.slice(0, 10));
      console.log(`${colors.dim}... and ${result.results.length - 10} more rows${colors.reset}`);
    }
  },

  async export(args) {
    const [id, type = 'csv'] = args;
    if (!id) {
      console.log(`${colors.red}Error:${colors.reset} Query ID required`);
      return;
    }

    console.log(`${colors.cyan}Creating ${type.toUpperCase()} export...${colors.reset}`);
    const result = await request('POST', '/api/exports/enhanced', {
      name: `Export ${id}`,
      type,
      queryId: parseInt(id)
    });

    console.log(`${colors.green}✓ Export created successfully${colors.reset}`);
    console.log(`  Filename: ${result.filename}`);
    console.log(`  Download: ${config.apiUrl}${result.downloadUrl}`);
  },

  async activities() {
    console.log(`${colors.cyan}Fetching recent activities...${colors.reset}`);
    const activities = await request('GET', '/api/activities?limit=10');

    console.log(`\n${colors.gold}${colors.bright}Recent Activities${colors.reset}\n`);

    activities.forEach(activity => {
      const icon = {
        success: colors.green + '✓',
        error: colors.red + '✗',
        info: colors.blue + 'ℹ',
      }[activity.status] || '';

      const timestamp = new Date(activity.createdAt).toLocaleString();

      console.log(`  ${icon} ${colors.reset}[${colors.dim}${timestamp}${colors.reset}] ${activity.message}`);
    });

    console.log('');
  },

  async analytics() {
    console.log(`${colors.cyan}Fetching analytics...${colors.reset}`);
    const analytics = await request('GET', '/api/analytics');

    console.log(`
${colors.gold}${colors.bright}Analytics Dashboard${colors.reset}

  ${colors.cyan}Overview:${colors.reset}
    Total Records:       ${analytics.overview.totalRecords}
    Today's Records:     ${analytics.overview.todayRecords}
    Active Scrapers:     ${analytics.overview.activeScrapers}
    Queries Run:         ${analytics.overview.queriesRun}
    Avg Response Time:   ${analytics.overview.avgResponseTime}ms
    Success Rate:        ${analytics.overview.successRate}%

  ${colors.cyan}Sentiment Analysis:${colors.reset}
    Positive:  ${analytics.sentiment.positive}%
    Neutral:   ${analytics.sentiment.neutral}%
    Negative:  ${analytics.sentiment.negative}%
    `);
  },

  async predict() {
    console.log(`${colors.cyan}Fetching ML predictions...${colors.reset}`);
    const prediction = await request('GET', '/api/predictions?metric=activity_count&days=7');

    console.log(`
${colors.gold}${colors.bright}ML Prediction${colors.reset}

  ${colors.cyan}Metric:${colors.reset}           ${prediction.metric}
  ${colors.cyan}Current Value:${colors.reset}    ${prediction.currentValue}
  ${colors.cyan}Predicted Value:${colors.reset}  ${prediction.predictedValue} (in 7 days)
  ${colors.cyan}Confidence:${colors.reset}       ${prediction.confidence}%
  ${colors.cyan}Trend:${colors.reset}            ${prediction.trend === 'up' ? colors.green + '↑' : prediction.trend === 'down' ? colors.red + '↓' : colors.yellow + '→'}${colors.reset}

  ${colors.cyan}Insights:${colors.reset}
${prediction.insights.map(i => `    • ${i}`).join('\n')}
    `);
  },

  async recommendations() {
    console.log(`${colors.cyan}Fetching smart recommendations...${colors.reset}`);
    const recs = await request('GET', '/api/recommendations');

    console.log(`\n${colors.gold}${colors.bright}Smart Recommendations (${recs.length})${colors.reset}\n`);

    recs.forEach(rec => {
      const icon = {
        optimization: '⚡',
        insight: '💡',
        action: '🎯',
        warning: '⚠️',
      }[rec.type] || '•';

      const impact = {
        high: colors.red,
        medium: colors.yellow,
        low: colors.green,
      }[rec.impact] || '';

      console.log(`  ${icon} ${colors.bright}${rec.title}${colors.reset}`);
      console.log(`    ${rec.description}`);
      if (rec.action) {
        console.log(`    ${colors.cyan}Action:${colors.reset} ${rec.action}`);
      }
      console.log(`    ${impact}Impact: ${rec.impact}${colors.reset} | Priority: ${rec.priority}`);
      console.log('');
    });
  },
};

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    if (commands[command]) {
      await commands[command](args.slice(1));
    } else {
      console.log(`${colors.red}Unknown command:${colors.reset} ${command}`);
      console.log(`Run ${colors.cyan}dataflow help${colors.reset} for usage`);
    }
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
    process.exit(1);
  }
}

main();
