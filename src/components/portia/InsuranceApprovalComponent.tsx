'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Calendar,
  Stethoscope,
  Shield,
  Download,
  Send,
  Eye
} from 'lucide-react';

interface InsuranceApprovalComponentProps {
  className?: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp?: string;
}

interface ClarificationQuestion {
  id: string;
  question: string;
  type: string;
  answered?: boolean;
  answer?: string;
}

interface ApprovalAnalysis {
  requestInfo: {
    patientInfo: {
      name: string;
      memberId: string;
      policyNumber: string;
    };
    serviceRequested: string;
    diagnosis: string;
    urgency: string;
    physicianInfo: {
      name: string;
      specialty: string;
    };
  };
  coverageAnalysis: {
    isCovered: boolean;
    requiresPriorAuth: boolean;
    meetsCriteria: boolean;
    missingCriteria: string[];
  };
  decision: {
    decision: 'approved' | 'denied' | 'pending_info';
    confidence: number;
    reasoning: string[];
    requiredDocuments: string[];
    conditions?: string[];
    appealRights: string;
    validityPeriod?: string;
  };
  reviewNotes: string[];
}

export default function InsuranceApprovalComponent({ className }: InsuranceApprovalComponentProps) {
  const [requestText, setRequestText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<{[key: string]: string}>({});
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!requestText.trim()) {
      setError('Please enter an insurance request to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/portia/insurance/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestText: requestText.trim(),
          userPreferences: {}
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysisResult(data);
      setClarifications(data.clarifications || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClarification = async (clarificationId: string) => {
    const answer = clarificationAnswers[clarificationId];
    if (!answer?.trim() || !analysisResult) return;

    try {
      const response = await fetch('/api/portia/insurance/clarify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowId: analysisResult.flowId,
          clarificationId,
          answer: answer.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit clarification');
      }

      setClarifications(data.clarifications || []);
      setAnalysisResult(data);
      
      // Clear the specific answer
      setClarificationAnswers(prev => ({
        ...prev,
        [clarificationId]: ''
      }));
      
    } catch (error) {
      console.error('Failed to submit clarification:', error);
      setError(error instanceof Error ? error.message : 'Failed to handle clarification');
    }
  };

  const generateDocumentation = async () => {
    if (!analysisResult) return;

    try {
      const response = await fetch('/api/portia/insurance/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flowId: analysisResult.flowId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate documentation');
      }

      // Create downloadable file
      const blob = new Blob([data.documentation.approvalLetter], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insurance-approval-${analysisResult.flowId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate documentation');
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running': return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">✅ APPROVED</Badge>;
      case 'denied':
        return <Badge className="bg-red-100 text-red-800 border-red-200">❌ DENIED</Badge>;
      case 'pending_info':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⏳ PENDING INFO</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">❓ UNKNOWN</Badge>;
    }
  };

  const sampleRequest = `Patient Information:
Name: Sarah Johnson
Member ID: MEM123456789
Policy Number: POL987654321
DOB: 03/15/1985

Insurance Request:
Service Requested: MRI of Lumbar Spine
Diagnosis: Chronic lower back pain with radiculopathy
Physician: Dr. Michael Chen, Orthopedic Specialist
NPI: 1234567890

Clinical Justification:
Patient has been experiencing chronic lower back pain for 8 weeks. Conservative treatment including physical therapy and NSAIDs has been unsuccessful. Patient reports numbness and tingling in left leg consistent with nerve compression. MRI is medically necessary to rule out disc herniation and plan appropriate treatment.

Urgency: Routine
Previous Treatments: Physical therapy (6 weeks), NSAIDs, muscle relaxants
Current Symptoms: Persistent pain, left leg numbness, limited mobility`;

  return (
    <div className={`max-w-6xl mx-auto p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          Insurance Approval System
        </h1>
        <p className="text-gray-600">
          AI-powered insurance approval analysis using Portia workflow and Gemini AI
        </p>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Insurance Request Details
          </CardTitle>
          <CardDescription>
            Enter the insurance approval request information including patient details, service requested, and clinical justification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Enter insurance request details here...\n\nExample:\n${sampleRequest}`}
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !requestText.trim()}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Request...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Analyze Insurance Request
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setRequestText(sampleRequest)}
              disabled={isAnalyzing}
            >
              Load Sample
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Workflow Progress */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Workflow Progress
              </span>
              <Badge variant="outline">
                Flow ID: {analysisResult.flowId.split('-').pop()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisResult.plan.steps.map((step: WorkflowStep) => (
                <div key={step.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  {getStepIcon(step.status)}
                  <div className="flex-1">
                    <div className="font-medium">{step.name}</div>
                    <div className="text-sm text-gray-600">{step.description}</div>
                  </div>
                  {step.timestamp && (
                    <div className="text-xs text-gray-500">
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clarification Questions */}
      {/*{clarifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Additional Information Required
            </CardTitle>
            <CardDescription>
              Please provide the following information to complete the analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clarifications.map((clarification) => (
              <div key={clarification.id} className="p-4 border rounded-lg">
                <div className="font-medium mb-2">{clarification.question}</div>
                {!clarification.answered ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Enter your response..."
                      value={clarificationAnswers[clarification.id] || ''}
                      onChange={(e) => setClarificationAnswers(prev => ({
                        ...prev,
                        [clarification.id]: e.target.value
                      }))}
                      className="min-h-[80px]" */}
                    {/* />  */}
                    {/* <Button 
                      onClick={() => handleClarification(clarification.id)}
                      disabled={!clarificationAnswers[clarification.id]?.trim()}
                      size="sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Answer
                    </Button>
                  </div>
                ) : (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    <div className="text-sm text-green-800">
                      ✅ Answered: {clarification.answer}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )} */}

      {/* Analysis Results */}
      {analysisResult?.analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient & Request Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Request Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-medium">Patient</div>
                <div className="text-sm text-gray-600">
                  {analysisResult.analysis.requestInfo.patientInfo.name}
                </div>
              </div>
              <div>
                <div className="font-medium">Service Requested</div>
                <div className="text-sm text-gray-600">
                  {analysisResult.analysis.requestInfo.serviceRequested}
                </div>
              </div>
              <div>
                <div className="font-medium">Diagnosis</div>
                <div className="text-sm text-gray-600">
                  {analysisResult.analysis.requestInfo.diagnosis}
                </div>
              </div>
              <div>
                <div className="font-medium">Physician</div>
                <div className="text-sm text-gray-600">
                  {analysisResult.analysis.requestInfo.physicianInfo.name} - {analysisResult.analysis.requestInfo.physicianInfo.specialty}
                </div>
              </div>
              <div>
                <div className="font-medium">Urgency</div>
                <Badge variant={analysisResult.analysis.requestInfo.urgency === 'emergency' ? 'destructive' : 'secondary'}>
                  {(analysisResult.analysis.requestInfo.urgency || 'standard').toUpperCase()}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Coverage Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Coverage Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span>Covered Service</span>
                <Badge variant={analysisResult.analysis.coverageAnalysis.isCovered ? 'default' : 'destructive'}>
                  {analysisResult.analysis.coverageAnalysis.isCovered ? '✅ Yes' : '❌ No'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Prior Authorization Required</span>
                <Badge variant={analysisResult.analysis.coverageAnalysis.requiresPriorAuth ? 'secondary' : 'outline'}>
                  {analysisResult.analysis.coverageAnalysis.requiresPriorAuth ? '✅ Yes' : '❌ No'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Meets Criteria</span>
                <Badge variant={analysisResult.analysis.coverageAnalysis.meetsCriteria ? 'default' : 'destructive'}>
                  {analysisResult.analysis.coverageAnalysis.meetsCriteria ? '✅ Yes' : '❌ No'}
                </Badge>
              </div>
              {analysisResult.analysis.coverageAnalysis.missingCriteria.length > 0 && (
                <div>
                  <div className="font-medium text-sm">Missing Criteria:</div>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {analysisResult.analysis.coverageAnalysis.missingCriteria.map((criteria: string, index: number) => (
                      <li key={index}>{criteria}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval Decision */}
      {analysisResult?.analysis?.decision && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Approval Decision
              </span>
              {getDecisionBadge(analysisResult.analysis.decision.decision)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Confidence Level</span>
                <Badge variant="outline">
                  {Math.round(analysisResult.analysis.decision.confidence * 100)}%
                </Badge>
              </div>
              <Progress 
                value={analysisResult.analysis.decision.confidence * 100} 
                className="h-2"
              />
            </div>

            <div>
              <div className="font-medium mb-2">Reasoning</div>
              <ul className="space-y-1">
                {analysisResult.analysis.decision.reasoning.map((reason: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span>•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-medium mb-2">Required Documentation</div>
              <ul className="space-y-1">
                {analysisResult.analysis.decision.requiredDocuments.map((doc: string, index: number) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                    <span>📄</span>
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {analysisResult.analysis.decision.conditions && (
              <div>
                <div className="font-medium mb-2">Approval Conditions</div>
                <ul className="space-y-1">
                  {analysisResult.analysis.decision.conditions.map((condition: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                      <span>⚠️</span>
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>Appeal Rights:</strong> {analysisResult.analysis.decision.appealRights}
              </div>
              {analysisResult.analysis.decision.validityPeriod && (
                <div className="text-sm text-blue-800 mt-1">
                  <strong>Valid Until:</strong> {analysisResult.analysis.decision.validityPeriod}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={generateDocumentation} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Generate Approval Letter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Info */}
      {/* {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Processing Information</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-gray-500">
            <div>Processing Time: {analysisResult.processingTime}</div>
            <div>Status: {analysisResult.status}</div>
            <div>Next Steps: {analysisResult.nextSteps}</div>
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              🔒 This is an automated preliminary review using AI. Final decisions may require manual review and are subject to complete medical documentation and policy terms.
            </div>
          </CardContent>
        </Card>
      )} */}
    </div>
  );
}
