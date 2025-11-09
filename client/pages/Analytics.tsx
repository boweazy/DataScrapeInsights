import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { DataDistributionChart, TrendLineChart, ComparisonBarChart, SentimentPieChart, RealTimeActivityChart } from '../components/advanced-charts';
import { Activity, TrendingUp, Database, Zap, Users, Clock } from 'lucide-react';
import { useWebSocket } from '../lib/socket';
import { useState, useEffect } from 'react';

interface AnalyticsData {
  overview: {
    totalRecords: number;
    todayRecords: number;
    activeScrapers: number;
    queriesRun: number;
    avgResponseTime: number;
    successRate: number;
  };
  trends: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      fill?: boolean;
      color?: string;
    }>;
  };
  distribution: {
    labels: string[];
    values: number[];
  };
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  realtimeActivity: {
    labels: string[];
    values: number[];
  };
  performance: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
    }>;
  };
}

export default function Analytics() {
  const [activityData, setActivityData] = useState<number[]>([]);
  const [activityLabels, setActivityLabels] = useState<string[]>([]);

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Real-time activity updates via WebSocket
  useWebSocket('activity:created', (event: any) => {
    const now = new Date();
    const timeLabel = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    setActivityLabels(prev => {
      const newLabels = [...prev, timeLabel];
      return newLabels.slice(-20); // Keep last 20 data points
    });

    setActivityData(prev => {
      const newData = [...prev, prev.length > 0 ? prev[prev.length - 1] + 1 : 1];
      return newData.slice(-20);
    });
  });

  useWebSocket('stats:updated', () => {
    // Trigger refetch when stats are updated
    // queryClient.invalidateQueries(['/api/analytics']);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gold text-xl">Loading analytics...</div>
      </div>
    );
  }

  const overview = analytics?.overview || {
    totalRecords: 0,
    todayRecords: 0,
    activeScrapers: 0,
    queriesRun: 0,
    avgResponseTime: 0,
    successRate: 0,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gold mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Comprehensive insights into your data operations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Records"
          value={overview.totalRecords.toLocaleString()}
          icon={<Database className="w-5 h-5" />}
          trend={`+${overview.todayRecords} today`}
          trendUp={true}
        />
        <KPICard
          title="Active Scrapers"
          value={overview.activeScrapers}
          icon={<Activity className="w-5 h-5" />}
          trend="Running"
          trendUp={true}
        />
        <KPICard
          title="Queries Run"
          value={overview.queriesRun.toLocaleString()}
          icon={<Zap className="w-5 h-5" />}
          trend="Last 24h"
        />
        <KPICard
          title="Avg Response"
          value={`${overview.avgResponseTime}ms`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="-12% faster"
          trendUp={true}
        />
        <KPICard
          title="Success Rate"
          value={`${overview.successRate}%`}
          icon={<Activity className="w-5 h-5" />}
          trend="+2.3%"
          trendUp={true}
        />
        <KPICard
          title="Active Users"
          value="1"
          icon={<Users className="w-5 h-5" />}
          trend="Online now"
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-800/50 border border-gold/20">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DataDistributionChart
              data={analytics?.distribution || { labels: [], values: [] }}
              title="Data Source Distribution"
              description="Distribution of data across different sources"
            />
            <SentimentPieChart
              data={analytics?.sentiment || { positive: 0, neutral: 0, negative: 0 }}
              title="Overall Sentiment Analysis"
              description="Aggregate sentiment from social media data"
            />
          </div>

          <RealTimeActivityChart
            data={{
              labels: activityLabels.length > 0 ? activityLabels : ['Start'],
              values: activityData.length > 0 ? activityData : [0],
            }}
            title="Real-Time Activity Monitor"
            description="Live activity feed (updates automatically)"
          />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <TrendLineChart
            data={analytics?.trends || { labels: [], datasets: [] }}
            title="Data Collection Trends"
            description="7-day trend analysis of data collection activities"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComparisonBarChart
              data={analytics?.distribution || { labels: [], datasets: [{ label: 'Count', data: [] }] }}
              title="Source Comparison"
              description="Compare data volumes across sources"
            />
            <DataDistributionChart
              data={analytics?.distribution || { labels: [], values: [] }}
              title="Query Type Distribution"
              description="Most common query patterns"
            />
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <TrendLineChart
            data={analytics?.performance || { labels: [], datasets: [] }}
            title="System Performance Metrics"
            description="Response times and throughput over time"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
              <CardHeader>
                <CardTitle className="text-gold">Response Time</CardTitle>
                <CardDescription>Average API response time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">{overview.avgResponseTime}ms</div>
                <p className="text-sm text-green-500 mt-2">↓ 12% improvement</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
              <CardHeader>
                <CardTitle className="text-gold">Throughput</CardTitle>
                <CardDescription>Requests per minute</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">248</div>
                <p className="text-sm text-green-500 mt-2">↑ 18% increase</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
              <CardHeader>
                <CardTitle className="text-gold">Error Rate</CardTitle>
                <CardDescription>Failed requests percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-white">0.8%</div>
                <p className="text-sm text-green-500 mt-2">↓ 0.4% reduction</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sentiment Tab */}
        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SentimentPieChart
              data={analytics?.sentiment || { positive: 0, neutral: 0, negative: 0 }}
              title="Sentiment Distribution"
              description="Overall sentiment breakdown"
            />
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20">
              <CardHeader>
                <CardTitle className="text-gold">Sentiment Insights</CardTitle>
                <CardDescription>Key findings from sentiment analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-400">Positive Sentiment</p>
                    <p className="text-2xl font-bold text-green-500">{analytics?.sentiment?.positive || 0}%</p>
                  </div>
                  <div className="text-green-500 text-4xl">😊</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-400">Neutral Sentiment</p>
                    <p className="text-2xl font-bold text-blue-500">{analytics?.sentiment?.neutral || 0}%</p>
                  </div>
                  <div className="text-blue-500 text-4xl">😐</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-400">Negative Sentiment</p>
                    <p className="text-2xl font-bold text-red-500">{analytics?.sentiment?.negative || 0}%</p>
                  </div>
                  <div className="text-red-500 text-4xl">😞</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gold/20 hover:border-gold/40 transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">{title}</span>
          <div className="text-gold">{icon}</div>
        </div>
        <div className="text-2xl font-bold text-white mb-1">{value}</div>
        {trend && (
          <p className={`text-sm ${trendUp ? 'text-green-500' : 'text-gray-400'}`}>
            {trendUp && '↑ '}{trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
