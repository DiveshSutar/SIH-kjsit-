/**
 * Portia Medical Report Analysis Flow
 * 
 * This file defines the Portia workflow for medical report analysis,
 * implementing a multi-agent system with planning, execution, and clarification steps.
 */

import { PortiaMedicalReportAgent, MedicalReportAnalysis, formatAnalysisForDisplay } from './medical-report-agent';

export interface PortiaWorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
  timestamp?: Date;
}

export interface PortiaWorkflowPlan {
  id: string;
  title: string;
  description: string;
  steps: PortiaWorkflowStep[];
  createdAt: Date;
  completedAt?: Date;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'gender' | 'explanation_level' | 'data_quality' | 'general';
  options?: string[];
  answered?: boolean;
  answer?: string;
}

export interface PortiaMedicalReportFlow {
  plan: PortiaWorkflowPlan;
  clarifications: ClarificationQuestion[];
  finalAnalysis?: MedicalReportAnalysis;
  outputOptions: {
    saveAsPdf?: boolean;
    sendViaEmail?: boolean;
    storeInDrive?: boolean;
    emailAddress?: string;
  };
}

export class PortiaMedicalReportWorkflow {
  private agent: PortiaMedicalReportAgent;
  private currentFlow: PortiaMedicalReportFlow | null = null;

  constructor(apiKey?: string, openaiKey?: string, groqKey?: string) {
    this.agent = new PortiaMedicalReportAgent(apiKey, openaiKey, groqKey);
  }

  /**
   * Step 1: Create workflow plan for medical report analysis
   */
  createWorkflowPlan(reportText: string): PortiaWorkflowPlan {
    const planId = `medical-report-${Date.now()}`;
    
    const steps: PortiaWorkflowStep[] = [
      {
        id: 'parse-report',
        name: 'Parse Medical Report',
        description: 'Extract patient information and lab values from the uploaded report',
        status: 'pending'
      },
      {
        id: 'analyze-values',
        name: 'Analyze Lab Values',
        description: 'Compare lab values against medical reference ranges',
        status: 'pending'
      },
      {
        id: 'identify-abnormal',
        name: 'Identify Abnormal Values',
        description: 'Mark values as Normal, High, or Low based on reference ranges',
        status: 'pending'
      },
      {
        id: 'generate-explanations',
        name: 'Generate Patient-Friendly Explanations',
        description: 'Create simple explanations for each abnormal result',
        status: 'pending'
      },
      {
        id: 'clarification-check',
        name: 'Check for Clarifications',
        description: 'Identify any questions that need patient input',
        status: 'pending'
      },
      {
        id: 'final-summary',
        name: 'Generate Final Summary',
        description: 'Create comprehensive medical report summary with disclaimers',
        status: 'pending'
      }
    ];

    return {
      id: planId,
      title: 'Medical Report Analysis',
      description: 'AI-powered analysis of laboratory test results with patient-friendly explanations',
      steps,
      createdAt: new Date()
    };
  }

  /**
   * Step 2: Execute the workflow plan
   */
  async executeWorkflow(
    reportText: string,
    userPreferences?: {
      gender?: 'male' | 'female';
      explanationLevel?: 'simple' | 'detailed';
    }
  ): Promise<PortiaMedicalReportFlow> {
    const plan = this.createWorkflowPlan(reportText);
    const clarifications: ClarificationQuestion[] = [];
    
    this.currentFlow = {
      plan,
      clarifications,
      outputOptions: {}
    };

    try {
      // Step 1: Parse Report
      await this.executeStep('parse-report', async () => {
        const parseResult = await this.agent.parseReportData(reportText);
        return parseResult;
      });

      const parseResult = this.getStepResult('parse-report');
      
      // Step 2: Analyze Values
      await this.executeStep('analyze-values', async () => {
        const gender = userPreferences?.gender || parseResult.patientInfo.gender || 'male';
        const labValues = this.agent.analyzeLabValues(parseResult.extractedValues, gender);
        return { labValues, gender };
      });

      // Step 3: Identify Abnormal Values
      await this.executeStep('identify-abnormal', async () => {
        const { labValues } = this.getStepResult('analyze-values');
        const abnormalValues = labValues.filter((lab: any) => lab.status !== 'normal');
        return { abnormalValues, totalValues: labValues.length };
      });

      // Step 4: Generate Explanations
      await this.executeStep('generate-explanations', async () => {
        const { labValues } = this.getStepResult('analyze-values');
        // Explanations are already generated in the analyze step
        return { explanationsGenerated: true };
      });

      // Step 5: Check for Clarifications
      await this.executeStep('clarification-check', async () => {
        const questions = await this.generateClarificationQuestions();
        this.currentFlow!.clarifications = questions;
        return { questionsGenerated: questions.length };
      });

      // Step 6: Generate Final Summary (only if no pending clarifications)
      if (this.currentFlow.clarifications.filter(q => !q.answered).length === 0) {
        await this.executeStep('final-summary', async () => {
          const parseResult = this.getStepResult('parse-report');
          const { labValues, gender } = this.getStepResult('analyze-values');
          
          const analysis = await this.agent.generateFinalAnalysis(
            { ...parseResult.patientInfo, gender },
            labValues,
            parseResult.processingSteps,
            userPreferences?.explanationLevel || 'simple'
          );
          
          this.currentFlow!.finalAnalysis = analysis;
          this.currentFlow!.plan.completedAt = new Date();
          
          return analysis;
        });
      }

    } catch (error) {
      this.markStepError(this.getCurrentStep()?.id || 'unknown', error);
    }

    return this.currentFlow;
  }

  /**
   * Generate clarification questions based on current analysis
   */
  private async generateClarificationQuestions(): Promise<ClarificationQuestion[]> {
    const questions: ClarificationQuestion[] = [];
    const parseResult = this.getStepResult('parse-report');
    const { labValues } = this.getStepResult('analyze-values');

    // Check for missing gender information
    if (!parseResult.patientInfo.gender) {
      const hasGenderSpecificTests = labValues.some((lab: any) => {
        // Check if any lab values have gender-specific reference ranges
        return ['hemoglobin', 'hematocrit', 'redBloodCells', 'hdlCholesterol', 'creatinine', 'alt', 'iron'].includes(lab.name);
      });

      if (hasGenderSpecificTests) {
        questions.push({
          id: 'gender-clarification',
          question: 'Some of your lab tests have different reference ranges for males and females. Could you please specify the patient\'s gender for more accurate analysis?',
          type: 'gender',
          options: ['Male', 'Female'],
          answered: false
        });
      }
    }

    // Check for explanation level preference
    questions.push({
      id: 'explanation-level',
      question: 'How would you like the results explained?',
      type: 'explanation_level',
      options: ['Simple language (easy to understand)', 'Detailed medical terms'],
      answered: false
    });

    // Check for data quality issues
    const unknownValues = labValues.filter((lab: any) => lab.status === 'unknown');
    if (unknownValues.length > 0) {
      questions.push({
        id: 'data-quality',
        question: `I found ${unknownValues.length} test result(s) that I couldn't analyze due to unclear values or missing reference ranges. Would you like me to proceed with the available data?`,
        type: 'data_quality',
        options: ['Yes, proceed with available data', 'No, let me provide more information'],
        answered: false
      });
    }

    // Ask about output preferences
    questions.push({
      id: 'output-preferences',
      question: 'How would you like to receive your analysis results?',
      type: 'general',
      options: ['View on screen only', 'Save as PDF', 'Email to me', 'Save to Google Drive'],
      answered: false
    });

    return questions;
  }

  /**
   * Answer a clarification question and continue workflow if ready
   */
  async answerClarification(
    questionId: string, 
    answer: string,
    userEmail?: string
  ): Promise<PortiaMedicalReportFlow> {
    if (!this.currentFlow) {
      throw new Error('No active workflow to update');
    }

    // Find and update the question
    const question = this.currentFlow.clarifications.find(q => q.id === questionId);
    if (question) {
      question.answered = true;
      question.answer = answer;

      // Handle specific question types
      if (questionId === 'gender-clarification') {
        // Re-analyze with correct gender
        const parseResult = this.getStepResult('parse-report');
        const gender = answer.toLowerCase() as 'male' | 'female';
        const labValues = this.agent.analyzeLabValues(parseResult.extractedValues, gender);
        this.updateStepResult('analyze-values', { labValues, gender });
      }

      if (questionId === 'output-preferences') {
        this.currentFlow.outputOptions = {
          saveAsPdf: answer.includes('PDF'),
          sendViaEmail: answer.includes('Email'),
          storeInDrive: answer.includes('Drive'),
          emailAddress: userEmail
        };
      }
    }

    // Check if all questions are answered
    const unansweredQuestions = this.currentFlow.clarifications.filter(q => !q.answered);
    if (unansweredQuestions.length === 0) {
      // Generate final summary
      await this.executeStep('final-summary', async () => {
        const parseResult = this.getStepResult('parse-report');
        const { labValues, gender } = this.getStepResult('analyze-values');
        const explanationLevel = this.currentFlow!.clarifications
          .find(q => q.id === 'explanation-level')?.answer?.includes('Simple') ? 'simple' : 'detailed';
        
        const analysis = await this.agent.generateFinalAnalysis(
          { ...parseResult.patientInfo, gender },
          labValues,
          parseResult.processingSteps,
          explanationLevel
        );
        
        this.currentFlow!.finalAnalysis = analysis;
        this.currentFlow!.plan.completedAt = new Date();
        
        return analysis;
      });
    }

    return this.currentFlow;
  }

  /**
   * Generate final output with selected format options
   */
  async generateFinalOutput(): Promise<{
    formattedText: string;
    pdfBuffer?: Buffer;
    emailSent?: boolean;
    driveFileId?: string;
  }> {
    if (!this.currentFlow?.finalAnalysis) {
      throw new Error('No final analysis available');
    }

    const formattedText = formatAnalysisForDisplay(this.currentFlow.finalAnalysis);
    const result: any = { formattedText };

    // Handle PDF generation
    if (this.currentFlow.outputOptions.saveAsPdf) {
      // Note: PDF generation would require additional libraries like puppeteer or jsPDF
      // This is a placeholder for the implementation
      result.pdfBuffer = Buffer.from(formattedText, 'utf-8'); // Placeholder
    }

    // Handle email sending
    if (this.currentFlow.outputOptions.sendViaEmail && this.currentFlow.outputOptions.emailAddress) {
      // Note: Email sending would require integration with email service
      // This is a placeholder for the implementation
      result.emailSent = true; // Placeholder
    }

    // Handle Google Drive storage
    if (this.currentFlow.outputOptions.storeInDrive) {
      // Note: Google Drive integration would require Google Drive API
      // This is a placeholder for the implementation
      result.driveFileId = 'placeholder-file-id'; // Placeholder
    }

    return result;
  }

  // Helper methods for workflow execution
  private async executeStep(stepId: string, execution: () => Promise<any>): Promise<void> {
    const step = this.currentFlow?.plan.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'running';
    step.timestamp = new Date();

    try {
      const result = await execution();
      step.result = result;
      step.status = 'completed';
    } catch (error) {
      step.error = error instanceof Error ? error.message : String(error);
      step.status = 'error';
      throw error;
    }
  }

  private getStepResult(stepId: string): any {
    return this.currentFlow?.plan.steps.find(s => s.id === stepId)?.result;
  }

  private updateStepResult(stepId: string, result: any): void {
    const step = this.currentFlow?.plan.steps.find(s => s.id === stepId);
    if (step) {
      step.result = result;
    }
  }

  private getCurrentStep(): PortiaWorkflowStep | undefined {
    return this.currentFlow?.plan.steps.find(s => s.status === 'running');
  }

  private markStepError(stepId: string, error: any): void {
    const step = this.currentFlow?.plan.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'error';
      step.error = error instanceof Error ? error.message : String(error);
    }
  }

  // Public getters
  getCurrentFlow(): PortiaMedicalReportFlow | null {
    return this.currentFlow;
  }

  getWorkflowStatus(): 'planning' | 'executing' | 'waiting_for_clarification' | 'completed' | 'error' {
    if (!this.currentFlow) return 'planning';
    
    const hasErrors = this.currentFlow.plan.steps.some(s => s.status === 'error');
    if (hasErrors) return 'error';
    
    const unansweredQuestions = this.currentFlow.clarifications.filter(q => !q.answered);
    if (unansweredQuestions.length > 0) return 'waiting_for_clarification';
    
    if (this.currentFlow.plan.completedAt) return 'completed';
    
    return 'executing';
  }
}
