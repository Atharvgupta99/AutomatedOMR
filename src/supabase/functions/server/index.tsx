import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowHeaders: ['*'],
  allowMethods: ['*'],
}));
app.use('*', logger(console.log));

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Initialize storage bucket
const initializeBucket = async () => {
  const bucketName = 'make-8a78a064-omr-sheets';
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false });
      console.log(`Created bucket: ${bucketName}`);
    }
  } catch (error) {
    console.log('Error initializing bucket:', error);
  }
};

// Initialize bucket on startup
initializeBucket();

// OMR Answer Key Configuration
const ANSWER_KEYS = {
  A: {
    'Data Analytics': ['B', 'A', 'C', 'D', 'B', 'A', 'C', 'B', 'D', 'A', 'C', 'B', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C'],
    'Machine Learning': ['A', 'C', 'B', 'D', 'A', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A'],
    'Statistics': ['C', 'B', 'A', 'D', 'C', 'B', 'A', 'C', 'D', 'B', 'A', 'C', 'D', 'B', 'A', 'C', 'D', 'B', 'A', 'C'],
    'Python Programming': ['D', 'A', 'B', 'C', 'D', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D'],
    'SQL & Databases': ['B', 'D', 'C', 'A', 'B', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B']
  },
  B: {
    'Data Analytics': ['A', 'C', 'B', 'D', 'A', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A'],
    'Machine Learning': ['C', 'B', 'A', 'D', 'C', 'B', 'A', 'C', 'D', 'B', 'A', 'C', 'D', 'B', 'A', 'C', 'D', 'B', 'A', 'C'],
    'Statistics': ['D', 'A', 'B', 'C', 'D', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D'],
    'Python Programming': ['B', 'D', 'C', 'A', 'B', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B'],
    'SQL & Databases': ['B', 'A', 'C', 'D', 'B', 'A', 'C', 'B', 'D', 'A', 'C', 'B', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C']
  },
  C: {
    'Data Analytics': ['C', 'B', 'A', 'D', 'C', 'B', 'A', 'C', 'D', 'B', 'A', 'C', 'D', 'B', 'A', 'C', 'D', 'B', 'A', 'C'],
    'Machine Learning': ['D', 'A', 'B', 'C', 'D', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D'],
    'Statistics': ['B', 'D', 'C', 'A', 'B', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B'],
    'Python Programming': ['A', 'C', 'B', 'D', 'A', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A'],
    'SQL & Databases': ['B', 'A', 'C', 'D', 'B', 'A', 'C', 'B', 'D', 'A', 'C', 'B', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C']
  },
  D: {
    'Data Analytics': ['D', 'A', 'B', 'C', 'D', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D', 'C', 'A', 'B', 'D'],
    'Machine Learning': ['B', 'D', 'C', 'A', 'B', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B'],
    'Statistics': ['A', 'C', 'B', 'D', 'A', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B', 'A'],
    'Python Programming': ['C', 'B', 'A', 'D', 'C', 'B', 'A', 'C', 'D', 'B', 'A', 'C', 'D', 'B', 'A', 'C', 'D', 'B', 'A', 'C'],
    'SQL & Databases': ['B', 'A', 'C', 'D', 'B', 'A', 'C', 'B', 'D', 'A', 'C', 'B', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C']
  }
};

// Image validation function
const validateImage = async (file: File): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // File size validation (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    errors.push('File size exceeds 10MB limit');
  }
  
  // File type validation
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    errors.push('Invalid file type. Only JPEG and PNG files are allowed');
  }
  
  // Image dimensions validation (simulated)
  if (file.size < 50 * 1024) {
    warnings.push('Image file size is quite small, may affect processing quality');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

// Image preprocessing simulation
const preprocessImage = async (fileName: string): Promise<{ success: boolean; confidence: number; adjustments: string[] }> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const adjustments: string[] = [];
  let confidence = 0.9;
  
  // Simulate various preprocessing steps
  if (Math.random() > 0.8) {
    adjustments.push('Rotation corrected');
    confidence -= 0.05;
  }
  
  if (Math.random() > 0.7) {
    adjustments.push('Brightness adjusted');
    confidence -= 0.02;
  }
  
  if (Math.random() > 0.6) {
    adjustments.push('Noise reduction applied');
    confidence -= 0.03;
  }
  
  if (Math.random() > 0.9) {
    adjustments.push('Perspective correction applied');
    confidence -= 0.08;
  }
  
  return {
    success: true,
    confidence: Math.max(confidence, 0.75),
    adjustments
  };
};

// Bubble detection simulation
const detectBubbles = async (fileName: string): Promise<{ success: boolean; detectedAnswers: any; confidence: number; issues: string[] }> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const subjects = ['Data Analytics', 'Machine Learning', 'Statistics', 'Python Programming', 'SQL & Databases'];
  const detectedAnswers: any = {};
  const issues: string[] = [];
  let confidence = 0.95;
  
  // Simulate bubble detection for each subject
  subjects.forEach(subject => {
    detectedAnswers[subject] = [];
    
    for (let i = 0; i < 20; i++) {
      const options = ['A', 'B', 'C', 'D'];
      let detectedAnswer = options[Math.floor(Math.random() * options.length)];
      
      // Simulate detection issues
      if (Math.random() > 0.98) {
        issues.push(`Question ${i + 1} in ${subject}: Multiple bubbles detected`);
        confidence -= 0.05;
      } else if (Math.random() > 0.97) {
        issues.push(`Question ${i + 1} in ${subject}: No clear bubble detected`);
        detectedAnswer = ''; // No answer
        confidence -= 0.03;
      } else if (Math.random() > 0.95) {
        issues.push(`Question ${i + 1} in ${subject}: Faint marking detected`);
        confidence -= 0.01;
      }
      
      detectedAnswers[subject].push(detectedAnswer);
    }
  });
  
  return {
    success: issues.length < 5, // Fail if too many issues
    detectedAnswers,
    confidence: Math.max(confidence, 0.7),
    issues
  };
};

// Scoring function
const scoreAnswers = (detectedAnswers: any, examVersion: string): any => {
  const answerKey = ANSWER_KEYS[examVersion as keyof typeof ANSWER_KEYS];
  const results: any = {};
  let totalScore = 0;
  
  Object.keys(answerKey).forEach(subject => {
    const correctAnswers = answerKey[subject];
    const studentAnswers = detectedAnswers[subject];
    let subjectScore = 0;
    
    correctAnswers.forEach((correctAnswer, index) => {
      if (studentAnswers[index] === correctAnswer) {
        subjectScore++;
      }
    });
    
    results[subject] = subjectScore;
    totalScore += subjectScore;
  });
  
  return { subjects: results, totalScore };
};

// Enhanced OMR processing function
const processOMRSheet = async (fileName: string, examVersion: string, jobId: string): Promise<any> => {
  const updateProgress = async (progress: number, step: string) => {
    const currentJob = await kv.get(`processing:${jobId}`);
    if (currentJob) {
      await kv.set(`processing:${jobId}`, {
        ...currentJob,
        progress,
        currentStep: step
      });
    }
  };
  
  try {
    // Step 1: Image preprocessing
    await updateProgress(20, 'Preprocessing image');
    const preprocessResult = await preprocessImage(fileName);
    
    if (!preprocessResult.success) {
      throw new Error('Image preprocessing failed');
    }
    
    // Step 2: Bubble detection
    await updateProgress(50, 'Detecting answer bubbles');
    const bubbleResult = await detectBubbles(fileName);
    
    if (!bubbleResult.success) {
      throw new Error('Bubble detection failed - too many detection issues');
    }
    
    // Step 3: Answer scoring
    await updateProgress(80, 'Scoring answers');
    const scoringResult = scoreAnswers(bubbleResult.detectedAnswers, examVersion);
    
    // Step 4: Generate final result
    await updateProgress(100, 'Finalizing results');
    
    const studentId = `STU${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
    const finalResult = {
      id: studentId,
      fileName,
      studentId,
      name: `Student ${Math.floor(Math.random() * 100) + 1}`,
      version: examVersion,
      subjects: scoringResult.subjects,
      totalScore: scoringResult.totalScore,
      evaluatedAt: new Date().toISOString(),
      status: 'completed',
      processingDetails: {
        preprocessing: {
          success: preprocessResult.success,
          confidence: preprocessResult.confidence,
          adjustments: preprocessResult.adjustments
        },
        bubbleDetection: {
          success: bubbleResult.success,
          confidence: bubbleResult.confidence,
          issues: bubbleResult.issues,
          detectedAnswers: bubbleResult.detectedAnswers
        },
        scoring: {
          answerKey: examVersion,
          correctAnswers: ANSWER_KEYS[examVersion as keyof typeof ANSWER_KEYS]
        }
      },
      overallConfidence: Math.min(preprocessResult.confidence, bubbleResult.confidence),
      qualityMetrics: {
        imageQuality: preprocessResult.confidence,
        detectionAccuracy: bubbleResult.confidence,
        processingTime: Math.floor(Math.random() * 3000) + 2000,
        requiresReview: bubbleResult.issues.length > 2
      }
    };
    
    return finalResult;
    
  } catch (error) {
    await updateProgress(0, 'Processing failed');
    throw error;
  }
};

// Routes
app.get('/make-server-8a78a064/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Upload OMR sheet with validation and compression
app.post('/make-server-8a78a064/upload-sheet', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const examVersion = formData.get('examVersion') as string;
    const examDate = formData.get('examDate') as string;
    
    if (!file || !examVersion || !examDate) {
      return c.json({ 
        error: 'Missing required fields',
        details: 'File, exam version, and exam date are all required'
      }, 400);
    }

    // Validate exam version
    if (!['A', 'B', 'C', 'D'].includes(examVersion)) {
      return c.json({ 
        error: 'Invalid exam version',
        details: 'Exam version must be A, B, C, or D'
      }, 400);
    }

    // Validate image
    const validation = await validateImage(file);
    if (!validation.valid) {
      return c.json({ 
        error: 'Image validation failed',
        details: validation.errors,
        warnings: validation.warnings
      }, 400);
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.name}`;
    const bucketName = 'make-8a78a064-omr-sheets';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file);

    if (uploadError) {
      console.log('Upload error:', uploadError);
      return c.json({ 
        error: 'Failed to upload file to storage',
        details: uploadError.message
      }, 500);
    }

    // Create processing job record
    const jobId = `job-${Date.now()}`;
    await kv.set(`processing:${jobId}`, {
      id: jobId,
      fileName: file.name,
      storedFileName: fileName,
      examVersion,
      examDate,
      status: 'queued',
      progress: 0,
      currentStep: 'Queued for processing',
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      validationWarnings: validation.warnings
    });

    // Start processing (in background)
    processOMRSheet(fileName, examVersion, jobId).then(async (result) => {
      // Update job status
      await kv.set(`processing:${jobId}`, {
        id: jobId,
        fileName: file.name,
        storedFileName: fileName,
        examVersion,
        examDate,
        status: 'completed',
        progress: 100,
        currentStep: 'Processing completed',
        uploadedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        processingTimeMs: result.qualityMetrics?.processingTime || 0
      });

      // Store result
      await kv.set(`result:${result.studentId}`, result);
    }).catch(async (error) => {
      console.log('Processing error:', error);
      await kv.set(`processing:${jobId}`, {
        id: jobId,
        fileName: file.name,
        storedFileName: fileName,
        examVersion,
        examDate,
        status: 'error',
        progress: 0,
        currentStep: 'Processing failed',
        uploadedAt: new Date().toISOString(),
        errorMessage: error.message,
        errorDetails: error.stack
      });
    });

    return c.json({ 
      jobId, 
      message: 'File uploaded and queued for processing',
      warnings: validation.warnings
    });
  } catch (error) {
    console.log('Upload endpoint error:', error);
    return c.json({ 
      error: 'Internal server error during upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Get processing status
app.get('/make-server-8a78a064/processing-status', async (c) => {
  try {
    const jobs = await kv.getByPrefix('processing:');
    return c.json({ jobs });
  } catch (error) {
    console.log('Error fetching processing status:', error);
    return c.json({ error: 'Failed to fetch processing status' }, 500);
  }
});

// Get all results
app.get('/make-server-8a78a064/results', async (c) => {
  try {
    const results = await kv.getByPrefix('result:');
    return c.json({ results });
  } catch (error) {
    console.log('Error fetching results:', error);
    return c.json({ error: 'Failed to fetch results' }, 500);
  }
});

// Get specific result
app.get('/make-server-8a78a064/result/:studentId', async (c) => {
  try {
    const studentId = c.req.param('studentId');
    const result = await kv.get(`result:${studentId}`);
    
    if (!result) {
      return c.json({ error: 'Result not found' }, 404);
    }
    
    return c.json({ result });
  } catch (error) {
    console.log('Error fetching result:', error);
    return c.json({ error: 'Failed to fetch result' }, 500);
  }
});

// Delete result
app.delete('/make-server-8a78a064/result/:studentId', async (c) => {
  try {
    const studentId = c.req.param('studentId');
    await kv.del(`result:${studentId}`);
    return c.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.log('Error deleting result:', error);
    return c.json({ error: 'Failed to delete result' }, 500);
  }
});

// Get OMR sheet image
app.get('/make-server-8a78a064/sheet/:fileName', async (c) => {
  try {
    const fileName = c.req.param('fileName');
    const bucketName = 'make-8a78a064-omr-sheets';
    
    const { data: signedUrlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 3600); // 1 hour expiry
    
    if (!signedUrlData?.signedUrl) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    return c.json({ url: signedUrlData.signedUrl });
  } catch (error) {
    console.log('Error generating signed URL:', error);
    return c.json({ error: 'Failed to get file URL' }, 500);
  }
});

// Get analytics data
app.get('/make-server-8a78a064/analytics', async (c) => {
  try {
    const results = await kv.getByPrefix('result:');
    
    if (results.length === 0) {
      return c.json({ error: 'No results available for analytics' }, 404);
    }

    // Calculate overall statistics
    const totalStudents = results.length;
    const averageScore = results.reduce((sum, r) => sum + r.totalScore, 0) / totalStudents;
    const highestScore = Math.max(...results.map(r => r.totalScore));
    const lowestScore = Math.min(...results.map(r => r.totalScore));
    
    // Score distribution
    const scoreRanges = {
      'Excellent (90-100)': results.filter(r => r.totalScore >= 90).length,
      'Good (80-89)': results.filter(r => r.totalScore >= 80 && r.totalScore < 90).length,
      'Average (70-79)': results.filter(r => r.totalScore >= 70 && r.totalScore < 80).length,
      'Below Average (60-69)': results.filter(r => r.totalScore >= 60 && r.totalScore < 70).length,
      'Poor (<60)': results.filter(r => r.totalScore < 60).length
    };
    
    // Version-wise analysis
    const versionStats = {};
    ['A', 'B', 'C', 'D'].forEach(version => {
      const versionResults = results.filter(r => r.version === version);
      if (versionResults.length > 0) {
        versionStats[version] = {
          count: versionResults.length,
          averageScore: versionResults.reduce((sum, r) => sum + r.totalScore, 0) / versionResults.length,
          highestScore: Math.max(...versionResults.map(r => r.totalScore)),
          lowestScore: Math.min(...versionResults.map(r => r.totalScore))
        };
      }
    });
    
    // Subject-wise performance
    const subjects = Object.keys(results[0].subjects);
    const subjectStats = {};
    subjects.forEach(subject => {
      const scores = results.map(r => r.subjects[subject]);
      subjectStats[subject] = {
        averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        passRate: (scores.filter(score => score >= 12).length / scores.length) * 100 // 60% pass rate
      };
    });
    
    // Quality metrics
    const qualityStats = {
      averageConfidence: results
        .filter(r => r.overallConfidence)
        .reduce((sum, r) => sum + r.overallConfidence, 0) / results.filter(r => r.overallConfidence).length,
      requiresReviewCount: results.filter(r => r.qualityMetrics?.requiresReview).length,
      averageProcessingTime: results
        .filter(r => r.qualityMetrics?.processingTime)
        .reduce((sum, r) => sum + r.qualityMetrics.processingTime, 0) / results.filter(r => r.qualityMetrics?.processingTime).length
    };
    
    // Time-based trends (by day)
    const dailyStats = {};
    results.forEach(result => {
      const date = new Date(result.evaluatedAt).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { count: 0, totalScore: 0 };
      }
      dailyStats[date].count++;
      dailyStats[date].totalScore += result.totalScore;
    });
    
    Object.keys(dailyStats).forEach(date => {
      dailyStats[date].averageScore = dailyStats[date].totalScore / dailyStats[date].count;
    });
    
    return c.json({
      overview: {
        totalStudents,
        averageScore: Math.round(averageScore * 100) / 100,
        highestScore,
        lowestScore,
        passRate: (results.filter(r => r.totalScore >= 60).length / totalStudents) * 100
      },
      scoreDistribution: scoreRanges,
      versionAnalysis: versionStats,
      subjectPerformance: subjectStats,
      qualityMetrics: qualityStats,
      trends: dailyStats
    });
  } catch (error) {
    console.log('Error generating analytics:', error);
    return c.json({ error: 'Failed to generate analytics' }, 500);
  }
});

// Enhanced CSV export with detailed data
app.get('/make-server-8a78a064/export/csv', async (c) => {
  try {
    const format = c.req.query('format') || 'summary';
    const results = await kv.getByPrefix('result:');
    
    if (results.length === 0) {
      return c.json({ error: 'No results to export' }, 404);
    }

    let csvContent = '';
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === 'detailed') {
      // Detailed export with quality metrics
      const headers = [
        'Student ID', 'Name', 'Version', 'Exam Date',
        'Data Analytics', 'Machine Learning', 'Statistics', 'Python Programming', 'SQL & Databases',
        'Total Score', 'Percentage', 'Grade',
        'Overall Confidence', 'Image Quality', 'Detection Accuracy', 'Processing Time (ms)',
        'Requires Review', 'Evaluated At'
      ];
      
      const csvRows = results.map(result => [
        result.studentId,
        result.name,
        result.version,
        result.examDate || 'N/A',
        result.subjects['Data Analytics'],
        result.subjects['Machine Learning'],
        result.subjects['Statistics'],
        result.subjects['Python Programming'],
        result.subjects['SQL & Databases'],
        result.totalScore,
        Math.round((result.totalScore / 100) * 100),
        result.totalScore >= 90 ? 'A' : result.totalScore >= 80 ? 'B' : result.totalScore >= 70 ? 'C' : result.totalScore >= 60 ? 'D' : 'F',
        result.overallConfidence ? Math.round(result.overallConfidence * 100) / 100 : 'N/A',
        result.qualityMetrics?.imageQuality ? Math.round(result.qualityMetrics.imageQuality * 100) / 100 : 'N/A',
        result.qualityMetrics?.detectionAccuracy ? Math.round(result.qualityMetrics.detectionAccuracy * 100) / 100 : 'N/A',
        result.qualityMetrics?.processingTime || 'N/A',
        result.qualityMetrics?.requiresReview ? 'Yes' : 'No',
        new Date(result.evaluatedAt).toLocaleString()
      ]);
      
      csvContent = [headers, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
    } else {
      // Summary export
      const subjects = Object.keys(results[0].subjects);
      const headers = ['Student ID', 'Name', 'Version', ...subjects, 'Total Score', 'Percentage', 'Grade', 'Evaluated At'];
      
      const csvRows = results.map(result => [
        result.studentId,
        result.name,
        result.version,
        ...subjects.map(subject => result.subjects[subject]),
        result.totalScore,
        Math.round((result.totalScore / 100) * 100),
        result.totalScore >= 90 ? 'A' : result.totalScore >= 80 ? 'B' : result.totalScore >= 70 ? 'C' : result.totalScore >= 60 ? 'D' : 'F',
        new Date(result.evaluatedAt).toLocaleDateString()
      ]);
      
      csvContent = [headers, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    }

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="omr-results-${format}-${timestamp}.csv"`
      }
    });
  } catch (error) {
    console.log('Error exporting CSV:', error);
    return c.json({ error: 'Failed to export CSV' }, 500);
  }
});

// Batch processing status
app.get('/make-server-8a78a064/batch-status', async (c) => {
  try {
    const jobs = await kv.getByPrefix('processing:');
    const summary = {
      total: jobs.length,
      queued: jobs.filter(j => j.status === 'queued').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      error: jobs.filter(j => j.status === 'error').length,
      averageProgress: jobs.length > 0 ? jobs.reduce((sum, j) => sum + (j.progress || 0), 0) / jobs.length : 0
    };
    
    return c.json({ jobs, summary });
  } catch (error) {
    console.log('Error fetching batch status:', error);
    return c.json({ error: 'Failed to fetch batch status' }, 500);
  }
});

Deno.serve(app.fetch);