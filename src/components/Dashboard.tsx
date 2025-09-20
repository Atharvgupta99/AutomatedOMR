import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Award, AlertTriangle, FileCheck, Download, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DashboardProps {
  results: Array<{
    id: string;
    studentId: string;
    name: string;
    version: string;
    subjects: Record<string, number>;
    totalScore: number;
    evaluatedAt: string;
    status: string;
    overallConfidence?: number;
    qualityMetrics?: {
      imageQuality: number;
      detectionAccuracy: number;
      processingTime: number;
      requiresReview: boolean;
    };
  }>;
}

export function Dashboard({ results }: DashboardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Load advanced analytics from backend
  const loadAnalytics = async () => {
    if (results.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a78a064/analytics`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.log('Error loading analytics:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [results]);

  // Export functions
  const exportCSV = async (format: 'summary' | 'detailed' = 'summary') => {
    setExporting(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a78a064/export/csv?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `omr-results-${format}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
    setExporting(false);
  };

  // Fallback to local calculations if analytics API fails
  const totalStudents = analytics?.overview?.totalStudents || results.length;
  const averageScore = analytics?.overview?.averageScore || 
    (results.length > 0 ? results.reduce((sum, r) => sum + r.totalScore, 0) / results.length : 0);
  const passRate = analytics?.overview?.passRate || 
    (results.length > 0 ? (results.filter(r => r.totalScore >= 60).length / results.length) * 100 : 0);
  const topPerformer = results.length > 0 
    ? results.reduce((prev, current) => prev.totalScore > current.totalScore ? prev : current)
    : null;

  // Score distribution data
  const scoreRanges = analytics?.scoreDistribution ? 
    Object.keys(analytics.scoreDistribution).map((range, index) => ({
      range,
      count: analytics.scoreDistribution[range],
      color: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#dc2626'][index] || '#8884d8'
    })) :
    [
      { range: '90-100', count: results.filter(r => r.totalScore >= 90).length, color: '#22c55e' },
      { range: '80-89', count: results.filter(r => r.totalScore >= 80 && r.totalScore < 90).length, color: '#3b82f6' },
      { range: '70-79', count: results.filter(r => r.totalScore >= 70 && r.totalScore < 80).length, color: '#f59e0b' },
      { range: '60-69', count: results.filter(r => r.totalScore >= 60 && r.totalScore < 70).length, color: '#ef4444' },
      { range: 'Below 60', count: results.filter(r => r.totalScore < 60).length, color: '#dc2626' }
    ];

  // Version-wise performance
  const versionPerformance = analytics?.versionAnalysis ? 
    Object.keys(analytics.versionAnalysis).map(version => ({
      version: `Version ${version}`,
      students: analytics.versionAnalysis[version].count,
      average: analytics.versionAnalysis[version].averageScore,
      highest: analytics.versionAnalysis[version].highestScore,
      lowest: analytics.versionAnalysis[version].lowestScore
    })) :
    ['A', 'B', 'C', 'D'].map(version => {
      const versionResults = results.filter(r => r.version === version);
      return {
        version: `Version ${version}`,
        students: versionResults.length,
        average: versionResults.length > 0 
          ? versionResults.reduce((sum, r) => sum + r.totalScore, 0) / versionResults.length 
          : 0
      };
    }).filter(v => v.students > 0);

  // Trends data from analytics or generate mock data
  const trendData = analytics?.trends ? 
    Object.keys(analytics.trends)
      .sort()
      .slice(-7) // Last 7 days
      .map(date => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        evaluated: analytics.trends[date].count,
        average: analytics.trends[date].averageScore
      })) :
    [
      { date: 'Today', evaluated: totalStudents, average: averageScore }
    ];

  // Quality metrics calculations
  const averageConfidence = analytics?.qualityMetrics?.averageConfidence || 
    (results.filter(r => r.overallConfidence).length > 0 
      ? results.filter(r => r.overallConfidence).reduce((sum, r) => sum + r.overallConfidence!, 0) / results.filter(r => r.overallConfidence).length 
      : 0);
  
  const requiresReviewCount = analytics?.qualityMetrics?.requiresReviewCount || 
    results.filter(r => r.qualityMetrics?.requiresReview).length;
  
  const averageProcessingTime = analytics?.qualityMetrics?.averageProcessingTime || 
    (results.filter(r => r.qualityMetrics?.processingTime).length > 0
      ? results.filter(r => r.qualityMetrics?.processingTime).reduce((sum, r) => sum + r.qualityMetrics!.processingTime, 0) / results.filter(r => r.qualityMetrics?.processingTime).length
      : 0);

  // Enhanced subject performance data
  const subjectPerformance = analytics?.subjectPerformance ? 
    Object.keys(analytics.subjectPerformance).map(subject => ({
      subject: subject.replace(/ /g, '\n'),
      average: analytics.subjectPerformance[subject].averageScore,
      passRate: analytics.subjectPerformance[subject].passRate,
      fullSubject: subject
    })) :
    (results.length > 0 ? Object.keys(results[0].subjects).map(subject => ({
      subject: subject.replace(/ /g, '\n'),
      average: results.reduce((sum, r) => sum + r.subjects[subject], 0) / results.length,
      passRate: (results.filter(r => r.subjects[subject] >= 12).length / results.length) * 100,
      fullSubject: subject
    })) : []);

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive evaluation insights and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadAnalytics}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={() => exportCSV('summary')}
            disabled={exporting || results.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Summary
          </Button>
          <Button 
            onClick={() => exportCSV('detailed')}
            disabled={exporting || results.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Detailed
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluated</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Students processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Class performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Above 60% threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topPerformer ? `${topPerformer.totalScore}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {topPerformer ? topPerformer.name : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageConfidence ? `${(averageConfidence * 100).toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Processing confidence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Performance</CardTitle>
            <CardDescription>Average scores across all subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={subjectPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="subject" 
                  fontSize={12}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis domain={[0, 20]} />
                <Tooltip 
                  formatter={(value, name) => [`${value.toFixed(1)}/20`, 'Average Score']}
                  labelFormatter={(label) => subjectPerformance.find(s => s.subject === label)?.fullSubject}
                />
                <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Student distribution across score ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scoreRanges}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, count, percent }) => 
                    count > 0 ? `${range}: ${count}` : ''
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {scoreRanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} students`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Version Performance */}
        {versionPerformance.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Version-wise Performance</CardTitle>
              <CardDescription>Average scores by exam version</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={versionPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="version" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'average' ? `${value.toFixed(1)}%` : value,
                      name === 'average' ? 'Average Score' : 'Students'
                    ]}
                  />
                  <Bar dataKey="average" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Performance Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Evaluation progress and score trends over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'evaluated' ? `${value} sheets` : `${value.toFixed(1)}%`,
                    name === 'evaluated' ? 'Evaluated' : 'Avg Score'
                  ]} 
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="evaluated" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="average" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: 'hsl(var(--chart-3))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Insights */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Challenging Subjects</CardTitle>
              <CardDescription>Subjects requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subjectPerformance
                  .sort((a, b) => a.average - b.average)
                  .slice(0, 3)
                  .map((subject, index) => (
                    <div key={subject.fullSubject} className="flex items-center justify-between">
                      <span className="text-sm">{subject.fullSubject}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {subject.average.toFixed(1)}/20
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {subject.passRate?.toFixed(0)}% pass
                        </Badge>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strong Performance</CardTitle>
              <CardDescription>Well-performed subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subjectPerformance
                  .sort((a, b) => b.average - a.average)
                  .slice(0, 3)
                  .map((subject, index) => (
                    <div key={subject.fullSubject} className="flex items-center justify-between">
                      <span className="text-sm">{subject.fullSubject}</span>
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {subject.average.toFixed(1)}/20
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {subject.passRate?.toFixed(0)}% pass
                        </Badge>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quality Metrics</CardTitle>
              <CardDescription>Processing quality indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Confidence</span>
                  <Badge variant="secondary">
                    {averageConfidence ? `${(averageConfidence * 100).toFixed(1)}%` : 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Requires Review</span>
                  <Badge variant={requiresReviewCount > 0 ? "outline" : "secondary"}>
                    {requiresReviewCount} sheets
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Avg Processing</span>
                  <Badge variant="outline">
                    {averageProcessingTime ? `${(averageProcessingTime / 1000).toFixed(1)}s` : 'N/A'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Performance</CardTitle>
              <CardDescription>Overall system metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Success Rate</span>
                  <Badge variant="secondary">
                    {((results.length - requiresReviewCount) / Math.max(results.length, 1) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Error Rate</span>
                  <Badge variant="outline">
                    {(requiresReviewCount / Math.max(results.length, 1) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Processed</span>
                  <Badge variant="outline">{results.length} sheets</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}