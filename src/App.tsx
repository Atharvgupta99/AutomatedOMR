import { useState, useEffect } from 'react';
import { UploadInterface } from './components/UploadInterface';
import { Dashboard } from './components/Dashboard';
import { ResultsView } from './components/ResultsView';
import { ProcessingQueue } from './components/ProcessingQueue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { FileText, BarChart3, Upload, Clock } from 'lucide-react';
import { projectId, publicAnonKey } from './utils/supabase/info';

// Mock data for demonstration
const mockResults = [
  {
    id: 'STU001',
    studentId: 'STU001',
    name: 'John Doe',
    version: 'A',
    subjects: {
      'Data Analytics': 18,
      'Machine Learning': 16,
      'Statistics': 19,
      'Python Programming': 17,
      'SQL & Databases': 15
    },
    totalScore: 85,
    evaluatedAt: '2024-01-15T10:30:00Z',
    status: 'completed'
  },
  {
    id: 'STU002',
    studentId: 'STU002',
    name: 'Jane Smith',
    version: 'B',
    subjects: {
      'Data Analytics': 19,
      'Machine Learning': 18,
      'Statistics': 17,
      'Python Programming': 19,
      'SQL & Databases': 18
    },
    totalScore: 91,
    evaluatedAt: '2024-01-15T10:35:00Z',
    status: 'completed'
  },
  {
    id: 'STU003',
    studentId: 'STU003',
    name: 'Mike Johnson',
    version: 'A',
    subjects: {
      'Data Analytics': 15,
      'Machine Learning': 14,
      'Statistics': 16,
      'Python Programming': 13,
      'SQL & Databases': 14
    },
    totalScore: 72,
    evaluatedAt: '2024-01-15T10:40:00Z',
    status: 'completed'
  }
];

export default function App() {
  const [results, setResults] = useState(mockResults);
  const [processingQueue, setProcessingQueue] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load results from backend on mount
  useEffect(() => {
    loadResults();
    loadProcessingStatus();
  }, []);

  const loadResults = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a78a064/results`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setResults(data.results);
        }
      }
    } catch (error) {
      console.log('Error loading results:', error);
    }
  };

  const loadProcessingStatus = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a78a064/processing-status`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.jobs) {
          setProcessingQueue(data.jobs);
        }
      }
    } catch (error) {
      console.log('Error loading processing status:', error);
    }
  };

  const handleFileUpload = async (files, examVersion, examDate) => {
    setActiveTab('processing');
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('examVersion', examVersion);
        formData.append('examDate', examDate);

        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a78a064/upload-sheet`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Upload successful:', data);
        } else {
          console.error('Upload failed:', await response.text());
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    // Refresh processing status and results
    setTimeout(() => {
      loadProcessingStatus();
      loadResults();
    }, 1000);

    // Poll for updates
    const pollInterval = setInterval(() => {
      loadProcessingStatus();
      loadResults();
    }, 3000);

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 120000);
  };



  const completedResults = results.filter(r => r.status === 'completed');
  const averageScore = completedResults.length > 0 
    ? completedResults.reduce((sum, r) => sum + r.totalScore, 0) / completedResults.length 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">OMR Evaluation System</h1>
              <p className="text-muted-foreground">Innomatics Research Labs - Automated Scoring Platform</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="gap-1">
                <FileText className="h-3 w-3" />
                {completedResults.length} Evaluated
              </Badge>
              <Badge variant="outline" className="gap-1">
                <BarChart3 className="h-3 w-3" />
                Avg: {averageScore.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Sheets
            </TabsTrigger>
            <TabsTrigger value="processing" className="gap-2">
              <Clock className="h-4 w-4" />
              Processing
              {processingQueue.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {processingQueue.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <FileText className="h-4 w-4" />
              Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard results={completedResults} />
          </TabsContent>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle>Upload OMR Sheets</CardTitle>
                <CardDescription>
                  Upload OMR sheets captured via mobile camera. Supports multiple sheet versions (A, B, C, D).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadInterface onFileUpload={handleFileUpload} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processing">
            <ProcessingQueue queue={processingQueue} />
          </TabsContent>

          <TabsContent value="results">
            <ResultsView results={completedResults} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}