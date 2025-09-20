import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Search, Download, FileText, Filter, Eye, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Result {
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
  processingDetails?: {
    preprocessing?: {
      success: boolean;
      confidence: number;
      adjustments: string[];
    };
    bubbleDetection?: {
      success: boolean;
      confidence: number;
      issues: string[];
      detectedAnswers: any;
    };
    scoring?: {
      answerKey: string;
      correctAnswers: any;
    };
  };
}

interface ResultsViewProps {
  results: Result[];
}

export function ResultsView({ results }: ResultsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [versionFilter, setVersionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('evaluatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort results
  const filteredResults = results
    .filter(result => {
      const matchesSearch = result.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          result.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVersion = versionFilter === 'all' || result.version === versionFilter;
      return matchesSearch && matchesVersion;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'totalScore':
          aValue = a.totalScore;
          bValue = b.totalScore;
          break;
        case 'evaluatedAt':
          aValue = new Date(a.evaluatedAt).getTime();
          bValue = new Date(b.evaluatedAt).getTime();
          break;
        default:
          aValue = a.studentId;
          bValue = b.studentId;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const exportToCSV = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a78a064/export/csv`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omr-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback to client-side CSV generation
        const headers = ['Student ID', 'Name', 'Version', ...Object.keys(results[0]?.subjects || {}), 'Total Score', 'Evaluated At'];
        const csvData = filteredResults.map(result => [
          result.studentId,
          result.name,
          result.version,
          ...Object.values(result.subjects),
          result.totalScore,
          new Date(result.evaluatedAt).toLocaleDateString()
        ]);
        
        const csvContent = [headers, ...csvData]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `omr-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
      // Fallback to client-side CSV generation
      const headers = ['Student ID', 'Name', 'Version', ...Object.keys(results[0]?.subjects || {}), 'Total Score', 'Evaluated At'];
      const csvData = filteredResults.map(result => [
        result.studentId,
        result.name,
        result.version,
        ...Object.values(result.subjects),
        result.totalScore,
        new Date(result.evaluatedAt).toLocaleDateString()
      ]);
      
      const csvContent = [headers, ...csvData]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omr-results-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const getScoreBadgeColor = (score: number, maxScore: number = 20) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (percentage >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getTotalScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 80) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Calculate subject statistics
  const subjectStats = results.length > 0 ? Object.keys(results[0].subjects).map(subject => {
    const scores = results.map(r => r.subjects[subject]);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    return { subject, average, max, min };
  }) : [];

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No results available</h3>
          <p className="text-muted-foreground text-center">
            Upload and process OMR sheets to view evaluation results here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="results" className="space-y-4">
        <TabsList>
          <TabsTrigger value="results">Individual Results</TabsTrigger>
          <TabsTrigger value="summary">Subject Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          {/* Filters and Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Evaluation Results</CardTitle>
                  <CardDescription>
                    {filteredResults.length} of {results.length} results
                  </CardDescription>
                </div>
                <Button onClick={exportToCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={versionFilter} onValueChange={setVersionFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="All Versions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Versions</SelectItem>
                    <SelectItem value="A">Version A</SelectItem>
                    <SelectItem value="B">Version B</SelectItem>
                    <SelectItem value="C">Version C</SelectItem>
                    <SelectItem value="D">Version D</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evaluatedAt">Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="totalScore">Score</SelectItem>
                    <SelectItem value="studentId">Student ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('studentId')}
                      >
                        Student ID {sortBy === 'studentId' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}
                      >
                        Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead>Version</TableHead>
                      {Object.keys(filteredResults[0]?.subjects || {}).map(subject => (
                        <TableHead key={subject} className="text-center min-w-20">
                          {subject.split(' ')[0]}
                        </TableHead>
                      ))}
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 text-center"
                        onClick={() => handleSort('totalScore')}
                      >
                        Total {sortBy === 'totalScore' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('evaluatedAt')}
                      >
                        Evaluated {sortBy === 'evaluatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.studentId}</TableCell>
                        <TableCell>{result.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{result.version}</Badge>
                        </TableCell>
                        {Object.entries(result.subjects).map(([subject, score]) => (
                          <TableCell key={subject} className="text-center">
                            <Badge 
                              variant="outline" 
                              className={getScoreBadgeColor(score)}
                            >
                              {score}/20
                            </Badge>
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className={getTotalScoreBadgeColor(result.totalScore)}
                          >
                            {result.totalScore}/100
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(result.evaluatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="gap-2">
                                <Eye className="h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2">
                                <Download className="h-4 w-4" />
                                Download Report
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {/* Subject Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectStats.map((stat) => (
              <Card key={stat.subject}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{stat.subject}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average</span>
                      <Badge variant="outline">{stat.average.toFixed(1)}/20</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Highest</span>
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                        {stat.max}/20
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Lowest</span>
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                        {stat.min}/20
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {results.filter(r => r.totalScore >= 90).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Excellent (90+)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {results.filter(r => r.totalScore >= 80 && r.totalScore < 90).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Good (80-89)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {results.filter(r => r.totalScore >= 60 && r.totalScore < 80).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Satisfactory (60-79)</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {results.filter(r => r.totalScore < 60).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Needs Improvement ({"<"}60)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}