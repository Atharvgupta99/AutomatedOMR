import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Separator } from './ui/separator';
import { Clock, CheckCircle, AlertCircle, FileImage, RotateCcw, ChevronDown, Info, Eye, AlertTriangle, Timer } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ProcessingItem {
  id: string;
  fileName: string;
  storedFileName?: string;
  examVersion?: string;
  examDate?: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  currentStep?: string;
  uploadedAt: string;
  completedAt?: string;
  errorMessage?: string;
  errorDetails?: string;
  fileSize?: number;
  validationWarnings?: string[];
  processingTimeMs?: number;
}

interface ProcessingQueueProps {
  queue: ProcessingItem[];
}

export function ProcessingQueue({ queue }: ProcessingQueueProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [retryingItems, setRetryingItems] = useState<Set<string>>(new Set());

  const queuedItems = queue.filter(item => item.status === 'queued');
  const processingItems = queue.filter(item => item.status === 'processing');
  const completedItems = queue.filter(item => item.status === 'completed');
  const errorItems = queue.filter(item => item.status === 'error');

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const retryProcessing = async (item: ProcessingItem) => {
    if (!item.storedFileName || !item.examVersion || !item.examDate) return;
    
    setRetryingItems(prev => new Set([...prev, item.id]));
    
    try {
      // Here you would typically call the retry endpoint
      // For now, we'll just simulate a retry
      console.log('Retrying processing for:', item.fileName);
      
      // In a real implementation, you would call:
      // await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-8a78a064/retry-processing`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ jobId: item.id, fileName: item.storedFileName, examVersion: item.examVersion, examDate: item.examDate })
      // });
      
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setRetryingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing':
        return <RotateCcw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'queued':
        return <Badge variant="outline">Queued</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getProcessingStageText = (progress: number, currentStep?: string) => {
    if (currentStep) return currentStep;
    
    if (progress < 20) return 'Queued for processing';
    if (progress < 50) return 'Preprocessing image';
    if (progress < 80) return 'Detecting answer bubbles';
    if (progress < 100) return 'Scoring answers';
    return 'Processing completed';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (queue.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No items in processing queue</h3>
          <p className="text-muted-foreground text-center">
            Upload OMR sheets to start the automated evaluation process.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queuedItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processingItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedItems.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorItems.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
          <CardDescription>
            Real-time status of OMR sheet evaluation process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {queue.map((item) => (
              <Collapsible key={item.id} open={expandedItems.has(item.id)} onOpenChange={() => toggleExpanded(item.id)}>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.fileName}</p>
                          {item.validationWarnings && item.validationWarnings.length > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              {item.validationWarnings.length} warning{item.validationWarnings.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Uploaded at {formatTime(item.uploadedAt)}
                          {item.examVersion && ` • Version ${item.examVersion}`}
                          {item.fileSize && ` • ${formatFileSize(item.fileSize)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(item.status)}
                      {item.status === 'error' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => retryProcessing(item)}
                          disabled={retryingItems.has(item.id)}
                          className="gap-1"
                        >
                          <RotateCcw className={`h-3 w-3 ${retryingItems.has(item.id) ? 'animate-spin' : ''}`} />
                          {retryingItems.has(item.id) ? 'Retrying...' : 'Retry'}
                        </Button>
                      )}
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye className="h-3 w-3" />
                          Details
                          <ChevronDown className={`h-3 w-3 transition-transform ${expandedItems.has(item.id) ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  {/* Progress for processing items */}
                  {item.status === 'processing' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {getProcessingStageText(item.progress, item.currentStep)}
                        </span>
                        <span className="font-medium">{item.progress}%</span>
                      </div>
                      <Progress value={item.progress} className="h-2" />
                    </div>
                  )}

                  {/* Success message for completed items */}
                  {item.status === 'completed' && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Successfully processed and scored</span>
                      </div>
                      {item.processingTimeMs && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Timer className="h-3 w-3" />
                          <span>{formatDuration(item.processingTimeMs)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error message for failed items */}
                  {item.status === 'error' && item.errorMessage && (
                    <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Processing Error</p>
                        <p>{item.errorMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* Validation warnings */}
                  {item.validationWarnings && item.validationWarnings.length > 0 && (
                    <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Validation Warnings</p>
                        <ul className="list-disc list-inside mt-1">
                          {item.validationWarnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Expandable details */}
                  <CollapsibleContent className="space-y-3">
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-1">
                          <Info className="h-3 w-3" />
                          File Information
                        </h4>
                        <div className="space-y-1 text-muted-foreground">
                          <p>Original Name: {item.fileName}</p>
                          <p>Upload Time: {new Date(item.uploadedAt).toLocaleString()}</p>
                          {item.completedAt && (
                            <p>Completed: {new Date(item.completedAt).toLocaleString()}</p>
                          )}
                          <p>File Size: {formatFileSize(item.fileSize)}</p>
                          {item.examVersion && <p>Exam Version: {item.examVersion}</p>}
                          {item.examDate && <p>Exam Date: {item.examDate}</p>}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Processing Status
                        </h4>
                        <div className="space-y-1 text-muted-foreground">
                          <p>Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}</p>
                          <p>Progress: {item.progress}%</p>
                          {item.currentStep && <p>Current Step: {item.currentStep}</p>}
                          {item.processingTimeMs && (
                            <p>Processing Time: {formatDuration(item.processingTimeMs)}</p>
                          )}
                        </div>
                      </div>

                      {item.status === 'error' && item.errorDetails && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Error Details
                          </h4>
                          <div className="text-muted-foreground">
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                              {item.errorDetails}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Processing Pipeline Info */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Pipeline</CardTitle>
          <CardDescription>
            Understanding the automated evaluation process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-sm font-medium">
                1
              </div>
              <h4 className="font-medium text-sm">Image Upload</h4>
              <p className="text-xs text-muted-foreground">Receive and validate image files</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-sm font-medium">
                2
              </div>
              <h4 className="font-medium text-sm">Preprocessing</h4>
              <p className="text-xs text-muted-foreground">Correct orientation, skew, and lighting</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-sm font-medium">
                3
              </div>
              <h4 className="font-medium text-sm">Bubble Detection</h4>
              <p className="text-xs text-muted-foreground">Identify and classify marked bubbles</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-sm font-medium">
                4
              </div>
              <h4 className="font-medium text-sm">Answer Matching</h4>
              <p className="text-xs text-muted-foreground">Compare with answer key</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-sm font-medium">
                5
              </div>
              <h4 className="font-medium text-sm">Score Calculation</h4>
              <p className="text-xs text-muted-foreground">Generate subject-wise results</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}