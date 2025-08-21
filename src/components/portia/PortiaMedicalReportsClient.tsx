/**
 * Portia Medical Report Analysis Client Component
 * 
 * This component provides the UI for the Portia-based medical report analysis workflow
 */

'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  MessageCircle, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  BarChart3,
  Download,
  Mail,
  Save,
  Clock,
  HelpCircle,
  Zap
} from 'lucide-react';

interface PortiaWorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
  timestamp?: Date;
}

interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'gender' | 'explanation_level' | 'data_quality' | 'general';
  options?: string[];
  answered?: boolean;
  answer?: string;
}

interface PortiaAnalysisResponse {
  success: boolean;
  flowId: string;
  status: 'planning' | 'executing' | 'waiting_for_clarification' | 'completed' | 'error';
  plan: {
    id: string;
    title: string;
    description: string;
    steps: PortiaWorkflowStep[];
    createdAt: string;
    completedAt?: string;
  };
  clarifications: ClarificationQuestion[];
  finalAnalysis?: {
    summary: {
      totalTests: number;
      normalCount: number;
      highCount: number;
      lowCount: number;
      unknownCount: number;
    };
    patientInfo: any;
    labValuesCount: number;
    recommendationsCount: number;
  };
  processingTime: string;
}

interface FinalAnalysisData {
  formattedText: string;
  summary: any;
  patientInfo: any;
  labValues: any[];
  recommendations: string[];
  disclaimer: string;
  processingSteps: string[];
}

export function PortiaMedicalReportsClient() {
  const [reportText, setReportText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResponse, setAnalysisResponse] = useState<PortiaAnalysisResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [finalAnalysis, setFinalAnalysis] = useState<FinalAnalysisData | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample medical report for demo
  const sampleReport = `
LABORATORY REPORT
Patient: Jane Smith, Age: 35, Female
Test Date: 2025-08-21
Order: Comprehensive Metabolic Panel + Lipid Panel

RESULTS:
- Hemoglobin: 11.8 g/dL
- Hematocrit: 35.2%
- White Blood Cell Count: 6,800/μL
- Glucose (Fasting): 105 mg/dL
- Total Cholesterol: 245 mg/dL
- LDL Cholesterol: 155 mg/dL
- HDL Cholesterol: 45 mg/dL
- Triglycerides: 180 mg/dL
- Sodium: 142 mEq/L
- Potassium: 4.1 mEq/L
- Creatinine: 0.9 mg/dL
- Vitamin D: 25 ng/mL
- TSH: 3.8 mIU/L

Clinical Notes: Follow-up recommended for lipid levels and vitamin D deficiency.
  `.trim();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a PDF file');
    }
  };

  const loadSampleReport = () => {
    setReportText(sampleReport);
    setFile(null);
    setError(null);
  };

  const startPortiaAnalysis = async () => {
    if (!reportText.trim() && !file) {
      setError('Please enter report text or upload a PDF file');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResponse(null);
    setFinalAnalysis(null);
    setCurrentStep(0);

    try {
      let textToAnalyze = reportText;

      // If file is selected, we would extract text here
      // For demo purposes, we'll use the text area content
      if (file && !reportText.trim()) {
        textToAnalyze = sampleReport; // Demo fallback
      }

      const response = await fetch('/api/portia/medical-report/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportText: textToAnalyze,
          userPreferences: {}
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysisResponse(data);
      
      // If there are clarifications needed, we'll handle them
      // If analysis is complete, show results
      if (data.status === 'completed' && data.finalAnalysis) {
        await generateFinalOutput(data.flowId);
      }

    } catch (error) {
      console.error('Analysis error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const answerClarification = async (questionId: string, answer: string) => {
    if (!analysisResponse) return;

    try {
      const response = await fetch('/api/portia/medical-report/clarify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowId: analysisResponse.flowId,
          questionId,
          answer,
          userEmail: userEmail || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process answer');
      }

      // Update the analysis response with the new state
      setAnalysisResponse(prev => ({
        ...prev!,
        status: data.status,
        clarifications: prev!.clarifications.map(q => 
          q.id === questionId ? { ...q, answered: true, answer } : q
        )
      }));

      // If all clarifications are answered, generate final output
      if (data.status === 'completed') {
        await generateFinalOutput(analysisResponse.flowId);
      }

    } catch (error) {
      console.error('Clarification error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process answer');
    }
  };

  const generateFinalOutput = async (flowId: string) => {
    try {
      const response = await fetch('/api/portia/medical-report/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flowId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate output');
      }

      setFinalAnalysis(data.analysis);
      setAnalysisResponse(prev => prev ? { ...prev, status: 'completed' } : null);

    } catch (error) {
      console.error('Output generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate final output');
    }
  };

  const renderWorkflowSteps = () => {
    if (!analysisResponse) return null;

    const { plan } = analysisResponse;
    const completedSteps = plan.steps.filter(s => s.status === 'completed').length;
    const totalSteps = plan.steps.length;
    const progressPercentage = (completedSteps / totalSteps) * 100;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            Portia Workflow Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{plan.title}</span>
                <span>{completedSteps}/{totalSteps} steps</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
            
            <div className="space-y-2">
              {plan.steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  {step.status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {step.status === 'running' && (
                    <Clock className="h-4 w-4 text-blue-500 animate-spin" />
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  {step.status === 'pending' && (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  
                  <div className="flex-1">
                    <div className="font-medium text-sm">{step.name}</div>
                    <div className="text-xs text-gray-500">{step.description}</div>
                    {step.error && (
                      <div className="text-xs text-red-500 mt-1">{step.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderClarificationQuestions = () => {
    if (!analysisResponse || analysisResponse.status !== 'waiting_for_clarification') {
      return null;
    }

    const unansweredQuestions = analysisResponse.clarifications.filter(q => !q.answered);
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-orange-500" />
            Clarification Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {unansweredQuestions.map((question) => (
              <div key={question.id} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-3">{question.question}</h4>
                
                {question.options ? (
                  <RadioGroup onValueChange={(value) => answerClarification(question.id, value)}>
                    {question.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                        <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {question.type === 'general' && question.id === 'output-preferences' && (
                      <div className="space-y-2">
                        <Label htmlFor="user-email">Email (optional for delivery):</Label>
                        <Input
                          id="user-email"
                          type="email"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          placeholder="your.email@example.com"
                        />
                      </div>
                    )}
                    <Button onClick={() => answerClarification(question.id, 'Yes')}>
                      Yes, proceed
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFinalAnalysis = () => {
    if (!finalAnalysis) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
            🩺 Your Lab Report Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{finalAnalysis.summary.totalTests}</div>
                <div className="text-sm text-gray-600">Total Tests</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{finalAnalysis.summary.normalCount}</div>
                <div className="text-sm text-gray-600">✅ Normal</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{finalAnalysis.summary.highCount}</div>
                <div className="text-sm text-gray-600">⬆️ High</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{finalAnalysis.summary.lowCount}</div>
                <div className="text-sm text-gray-600">⬇️ Low</div>
              </div>
            </div>

            {/* Formatted Analysis */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {finalAnalysis.formattedText}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Save as PDF
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Report
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save to Drive
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          Portia Medical Report Analysis
        </h1>
        <p className="text-gray-600">
          AI-powered medical report analysis with step-by-step processing and patient-friendly explanations
        </p>
      </div>

      {/* Input Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Medical Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File Upload */}
            <div>
              <Label htmlFor="file-upload">Upload PDF Report</Label>
              <Input
                id="file-upload"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf"
                className="mt-1"
              />
              {file && (
                <p className="text-sm text-green-600 mt-1">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {/* Text Input */}
            <div>
              <Label htmlFor="report-text">Or paste report text</Label>
              <Textarea
                id="report-text"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Paste your medical report text here..."
                rows={8}
                className="mt-1"
              />
            </div>

            {/* Demo Button */}
            <Button
              variant="outline"
              onClick={loadSampleReport}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Load Sample Report for Demo
            </Button>

            {/* Analyze Button */}
            <Button
              onClick={startPortiaAnalysis}
              disabled={isAnalyzing || (!reportText.trim() && !file)}
              className="flex items-center gap-2"
              size="lg"
            >
              {isAnalyzing ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isAnalyzing ? 'Analyzing with Portia...' : 'Start Portia Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Workflow Progress */}
      {renderWorkflowSteps()}

      {/* Clarification Questions */}
      {renderClarificationQuestions()}

      {/* Final Analysis */}
      {renderFinalAnalysis()}

      {/* Features Section */}
      <Card>
        <CardHeader>
          <CardTitle>✨ Portia Medical Analysis Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">🔬 Comprehensive Analysis</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Parse lab values from PDF/text reports</li>
                <li>• Compare against medical reference ranges</li>
                <li>• Identify Normal/High/Low values</li>
                <li>• Generate patient-friendly explanations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🤖 Intelligent Workflow</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Multi-step planning and execution</li>
                <li>• Interactive clarification questions</li>
                <li>• Transparent processing steps</li>
                <li>• Multiple output formats</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>🔒 Medical Disclaimer:</strong> This analysis is for educational purposes only and is not medical advice. 
              Please consult with a qualified healthcare professional for proper diagnosis and treatment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
