import { useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Upload, FileImage, X, AlertCircle, CheckCircle, AlertTriangle, Zap, Shield, Eye } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface FileValidationResult {
  file: File;
  valid: boolean;
  errors: string[];
  warnings: string[];
  size: number;
  resolution?: string;
}

interface UploadInterfaceProps {
  onFileUpload: (files: File[], examVersion: string, examDate: string) => void;
}



export function UploadInterface({ onFileUpload }: UploadInterfaceProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileValidationResult[]>([]);
  const [examVersion, setExamVersion] = useState('');
  const [examDate, setExamDate] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validating, setValidating] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Comprehensive file validation
  const validateFile = async (file: File): Promise<FileValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // File size validation (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size exceeds 10MB limit');
    }
    
    // File type validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      errors.push('Invalid file type. Only JPEG, PNG, and HEIC files are allowed');
    }
    
    // Size warnings
    if (file.size < 100 * 1024) {
      warnings.push('File size is quite small - may affect processing quality');
    }
    
    if (file.size > 5 * 1024 * 1024) {
      warnings.push('Large file - processing may take longer');
    }
    
    // Try to get image dimensions
    let resolution: string | undefined;
    try {
      const dimensions = await getImageDimensions(file);
      resolution = `${dimensions.width}×${dimensions.height}`;
      
      if (dimensions.width < 800 || dimensions.height < 600) {
        warnings.push('Low resolution image - may affect bubble detection accuracy');
      }
    } catch (error) {
      warnings.push('Could not determine image dimensions');
    }
    
    return {
      file,
      valid: errors.length === 0,
      errors,
      warnings,
      size: file.size,
      resolution
    };
  };

  // Get image dimensions helper
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const validateFiles = async (files: File[]) => {
    setValidating(true);
    const validationResults: FileValidationResult[] = [];
    
    for (const file of files) {
      const result = await validateFile(file);
      validationResults.push(result);
    }
    
    setSelectedFiles(prev => [...prev, ...validationResults]);
    setValidating(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).filter(file => 
        file.type.startsWith('image/')
      );
      validateFiles(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/')
      );
      validateFiles(files);
      // Reset input
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    const validFiles = selectedFiles.filter(f => f.valid);
    if (validFiles.length > 0 && examVersion && examDate && !uploading) {
      setUploading(true);
      setUploadProgress(0);
      
      try {
        // Simulate progress for batch upload
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);
        
        await onFileUpload(validFiles.map(f => f.file), examVersion, examDate);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Reset form after successful upload
        setTimeout(() => {
          setSelectedFiles([]);
          setExamVersion('');
          setExamDate('');
          setUploading(false);
          setUploadProgress(0);
        }, 1000);
        
      } catch (error) {
        console.error('Upload failed:', error);
        setUploading(false);
        setUploadProgress(0);
      }
    }
  };

  // Calculate statistics
  const totalFiles = selectedFiles.length;
  const validFiles = selectedFiles.filter(f => f.valid).length;
  const filesWithErrors = selectedFiles.filter(f => !f.valid).length;
  const filesWithWarnings = selectedFiles.filter(f => f.warnings.length > 0).length;
  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Exam Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam-version">Exam Version *</Label>
              <Select value={examVersion} onValueChange={setExamVersion} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Version A</SelectItem>
                  <SelectItem value="B">Version B</SelectItem>
                  <SelectItem value="C">Version C</SelectItem>
                  <SelectItem value="D">Version D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-date">Exam Date *</Label>
              <Input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                disabled={uploading}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload OMR Sheets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : uploading 
                ? 'border-muted bg-muted/20 cursor-not-allowed'
                : 'border-border hover:border-primary/50'
            }`}
            onDragEnter={!uploading ? handleDrag : undefined}
            onDragLeave={!uploading ? handleDrag : undefined}
            onDragOver={!uploading ? handleDrag : undefined}
            onDrop={!uploading ? handleDrop : undefined}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading || validating}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="space-y-4">
              <div className={`mx-auto w-12 h-12 rounded-lg flex items-center justify-center ${
                uploading ? 'bg-muted' : 'bg-primary/10'
              }`}>
                {validating ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                ) : (
                  <Upload className={`h-6 w-6 ${uploading ? 'text-muted-foreground' : 'text-primary'}`} />
                )}
              </div>
              <div>
                <p className={`text-lg font-medium ${uploading ? 'text-muted-foreground' : ''}`}>
                  {validating ? 'Validating files...' : 
                   uploading ? 'Uploading in progress' : 'Drop OMR sheets here'}
                </p>
                <p className="text-muted-foreground">
                  {uploading ? 'Please wait while files are being processed' : 'or click to browse files'}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>✓ Supported: JPG, PNG, HEIC • Max 10MB per file</p>
                <p>✓ Auto-validation • Quality checks • Batch processing</p>
              </div>
            </div>
          </div>
          
          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading files...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Summary */}
      {selectedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                File Review ({totalFiles})
              </div>
              <div className="flex gap-2">
                {validFiles > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {validFiles} valid
                  </Badge>
                )}
                {filesWithErrors > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {filesWithErrors} errors
                  </Badge>
                )}
                {filesWithWarnings > 0 && (
                  <Badge variant="outline" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {filesWithWarnings} warnings
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total size: {formatFileSize(totalSize)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFiles([])}
                  disabled={uploading}
                >
                  Clear All
                </Button>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedFiles.map((fileResult, index) => (
                  <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    fileResult.valid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex-shrink-0 mt-1">
                      {fileResult.valid ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{fileResult.file.name}</p>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {formatFileSize(fileResult.size)}
                          </Badge>
                          {fileResult.resolution && (
                            <Badge variant="outline" className="text-xs">
                              {fileResult.resolution}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Errors */}
                      {fileResult.errors.length > 0 && (
                        <div className="space-y-1">
                          {fileResult.errors.map((error, errorIndex) => (
                            <p key={errorIndex} className="text-sm text-red-700 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {error}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      {/* Warnings */}
                      {fileResult.warnings.length > 0 && (
                        <div className="space-y-1">
                          {fileResult.warnings.map((warning, warningIndex) => (
                            <p key={warningIndex} className="text-sm text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Status and Actions */}
      <div className="space-y-4">
        {/* Validation Messages */}
        {(!examVersion || !examDate) && selectedFiles.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select exam version and date before uploading.
            </AlertDescription>
          </Alert>
        )}
        
        {filesWithErrors > 0 && validFiles > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {filesWithErrors} file(s) have errors and will be skipped. Only {validFiles} valid file(s) will be processed.
            </AlertDescription>
          </Alert>
        )}
        
        {filesWithErrors > 0 && validFiles === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              All selected files have errors. Please fix the issues or select different files.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Processing Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <FileImage className="h-4 w-4" />
                    {validFiles} files ready
                  </span>
                  {examVersion && (
                    <span className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      Version {examVersion}
                    </span>
                  )}
                  {examDate && (
                    <span className="text-muted-foreground">
                      {new Date(examDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {validFiles > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Estimated processing time: {Math.ceil(validFiles * 2.5)} - {Math.ceil(validFiles * 4)} seconds
                  </p>
                )}
              </div>
              
              <Button
                onClick={handleUpload}
                disabled={validFiles === 0 || !examVersion || !examDate || uploading}
                className="gap-2"
                size="lg"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Start Processing ({validFiles})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}