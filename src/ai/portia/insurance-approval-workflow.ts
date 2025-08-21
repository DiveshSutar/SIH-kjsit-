/**
 * Portia Insurance Approval Workflow
 * 
 * This file defines the Portia workflow for insurance approval processing,
 * implementing a multi-step approval system with documentation requirements.
 */

import { PortiaInsuranceApprovalAgent, InsuranceApprovalAnalysis, formatInsuranceAnalysisForDisplay } from './insurance-approval-agent';

export interface PortiaInsuranceWorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  result?: any;
  error?: string;
  timestamp?: Date;
}

export interface PortiaInsuranceWorkflowPlan {
  id: string;
  title: string;
  description: string;
  steps: PortiaInsuranceWorkflowStep[];
  createdAt: Date;
  completedAt?: Date;
}

export interface InsuranceClarificationQuestion {
  id: string;
  question: string;
  type: 'diagnosis' | 'justification' | 'urgency' | 'documentation' | 'general';
  options?: string[];
  answered?: boolean;
  answer?: string;
}

export interface PortiaInsuranceApprovalFlow {
  plan: PortiaInsuranceWorkflowPlan;
  clarifications: InsuranceClarificationQuestion[];
  finalAnalysis?: InsuranceApprovalAnalysis;
  outputOptions: {
    generateLetter?: boolean;
    sendToProvider?: boolean;
    notifyPatient?: boolean;
    escalateToManager?: boolean;
  };
}

export class PortiaInsuranceApprovalWorkflow {
  private agent: PortiaInsuranceApprovalAgent;
  private currentFlow: PortiaInsuranceApprovalFlow | null = null;

  constructor(apiKey?: string) {
    this.agent = new PortiaInsuranceApprovalAgent(apiKey);
  }

  /**
   * Step 1: Create workflow plan for insurance approval
   */
  createWorkflowPlan(requestText: string): PortiaInsuranceWorkflowPlan {
    const planId = `insurance-approval-${Date.now()}`;
    
    const steps: PortiaInsuranceWorkflowStep[] = [
      {
        id: 'parse-request',
        name: 'Parse Insurance Request',
        description: 'Extract patient information, service details, and clinical justification',
        status: 'pending'
      },
      {
        id: 'verify-coverage',
        name: 'Verify Coverage Eligibility',
        description: 'Check if requested service is covered under patient policy',
        status: 'pending'
      },
      {
        id: 'analyze-criteria',
        name: 'Analyze Medical Criteria',
        description: 'Evaluate if request meets insurance coverage criteria',
        status: 'pending'
      },
      {
        id: 'check-documentation',
        name: 'Check Required Documentation',
        description: 'Verify all necessary documents are provided',
        status: 'pending'
      },
      {
        id: 'generate-decision',
        name: 'Generate Approval Decision',
        description: 'Create approval/denial decision with detailed reasoning',
        status: 'pending'
      },
      {
        id: 'prepare-notification',
        name: 'Prepare Decision Notification',
        description: 'Generate notification letters for patient and provider',
        status: 'pending'
      }
    ];

    return {
      id: planId,
      title: 'Insurance Approval Review',
      description: 'Automated review of medical insurance approval request using AI-driven analysis',
      steps,
      createdAt: new Date()
    };
  }

  /**
   * Step 2: Execute the insurance approval workflow
   */
  async executeWorkflow(
    requestText: string,
    userPreferences?: any
  ): Promise<PortiaInsuranceApprovalFlow> {
    const plan = this.createWorkflowPlan(requestText);
    const clarifications: InsuranceClarificationQuestion[] = [];
    
    try {
      // Step 1: Parse Request
      await this.updateStepStatus(plan, 'parse-request', 'running');
      const analysis = await this.agent.analyzeInsuranceRequest(requestText);
      await this.updateStepStatus(plan, 'parse-request', 'completed', analysis.requestInfo);

      // Step 2: Verify Coverage
      await this.updateStepStatus(plan, 'verify-coverage', 'running');
      await this.updateStepStatus(plan, 'verify-coverage', 'completed', analysis.coverageAnalysis);

      // Step 3: Analyze Criteria
      await this.updateStepStatus(plan, 'analyze-criteria', 'running');
      
      // Check for missing information and generate clarifications
      if (analysis.coverageAnalysis.missingCriteria.length > 0) {
        clarifications.push({
          id: 'missing-criteria',
          question: `The following information is needed to complete the review: ${analysis.coverageAnalysis.missingCriteria.join(', ')}. Can you provide additional details?`,
          type: 'documentation',
          answered: false
        });
      }

      if (!analysis.requestInfo.diagnosis || analysis.requestInfo.diagnosis === 'null') {
        clarifications.push({
          id: 'diagnosis-clarification',
          question: 'Please provide the specific medical diagnosis or condition that requires this service.',
          type: 'diagnosis',
          answered: false
        });
      }

      if (!analysis.requestInfo.clinicalJustification || analysis.requestInfo.clinicalJustification === 'null') {
        clarifications.push({
          id: 'justification-clarification',
          question: 'Please provide detailed clinical justification for why this service is medically necessary.',
          type: 'justification',
          answered: false
        });
      }

      await this.updateStepStatus(plan, 'analyze-criteria', 'completed');

      // Step 4: Check Documentation
      await this.updateStepStatus(plan, 'check-documentation', 'running');
      await this.updateStepStatus(plan, 'check-documentation', 'completed');

      // Step 5: Generate Decision
      await this.updateStepStatus(plan, 'generate-decision', 'running');
      await this.updateStepStatus(plan, 'generate-decision', 'completed', analysis.decision);

      // Step 6: Prepare Notification
      await this.updateStepStatus(plan, 'prepare-notification', 'running');
      await this.updateStepStatus(plan, 'prepare-notification', 'completed');

      plan.completedAt = new Date();

      this.currentFlow = {
        plan,
        clarifications,
        finalAnalysis: analysis,
        outputOptions: {
          generateLetter: true,
          sendToProvider: true,
          notifyPatient: true,
          escalateToManager: analysis.decision.decision === 'denied'
        }
      };

      return this.currentFlow;

    } catch (error) {
      // Handle workflow errors
      const currentStep = plan.steps.find(step => step.status === 'running');
      if (currentStep) {
        currentStep.status = 'error';
        currentStep.error = error instanceof Error ? error.message : 'Unknown error';
      }

      this.currentFlow = {
        plan,
        clarifications,
        outputOptions: {
          escalateToManager: true
        }
      };

      return this.currentFlow;
    }
  }

  /**
   * Handle clarification responses
   */
  async handleClarification(
    flowId: string,
    clarificationId: string,
    answer: string
  ): Promise<PortiaInsuranceApprovalFlow> {
    if (!this.currentFlow || this.currentFlow.plan.id !== flowId) {
      throw new Error('Invalid flow ID or workflow not found');
    }

    // Update clarification with answer
    const clarification = this.currentFlow.clarifications.find(c => c.id === clarificationId);
    if (clarification) {
      clarification.answered = true;
      clarification.answer = answer;
    }

    // Check if all clarifications are answered
    const allAnswered = this.currentFlow.clarifications.every(c => c.answered);
    
    if (allAnswered && this.currentFlow.finalAnalysis) {
      // Re-run analysis with updated information
      const updatedRequestText = this.reconstructRequestWithClarifications();
      const updatedAnalysis = await this.agent.analyzeInsuranceRequest(updatedRequestText);
      this.currentFlow.finalAnalysis = updatedAnalysis;
    }

    return this.currentFlow;
  }

  /**
   * Generate final approval documentation
   */
  async generateApprovalDocumentation(flowId: string): Promise<{
    approvalLetter: string;
    providerNotification: string;
    patientNotification: string;
  }> {
    if (!this.currentFlow || this.currentFlow.plan.id !== flowId || !this.currentFlow.finalAnalysis) {
      throw new Error('Invalid flow ID or analysis not available');
    }

    const analysis = this.currentFlow.finalAnalysis;
    const decision = analysis.decision;
    const requestInfo = analysis.requestInfo;

    const approvalLetter = `
INSURANCE APPROVAL DECISION
===========================

Reference Number: ${flowId}
Date: ${new Date().toLocaleDateString()}

Patient Information:
Name: ${requestInfo.patientInfo.name}
Member ID: ${requestInfo.patientInfo.memberId}
Policy Number: ${requestInfo.patientInfo.policyNumber}

Requested Service: ${requestInfo.serviceRequested}
Diagnosis: ${requestInfo.diagnosis}
Physician: ${requestInfo.physicianInfo.name}

DECISION: ${decision.decision.toUpperCase()}
Confidence Level: ${Math.round(decision.confidence * 100)}%

Reasoning:
${decision.reasoning.map(reason => `• ${reason}`).join('\n')}

${decision.conditions ? `Approval Conditions:\n${decision.conditions.map(condition => `• ${condition}`).join('\n')}\n` : ''}

Required Documentation:
${decision.requiredDocuments.map(doc => `• ${doc}`).join('\n')}

${decision.validityPeriod ? `Valid Until: ${decision.validityPeriod}\n` : ''}

Appeal Rights: ${decision.appealRights}

This decision is based on automated analysis and may be subject to manual review.
    `.trim();

    const providerNotification = `
PROVIDER NOTIFICATION - INSURANCE DECISION
==========================================

Dear ${requestInfo.physicianInfo.name},

Your prior authorization request for ${requestInfo.patientInfo.name} has been ${decision.decision}.

Service: ${requestInfo.serviceRequested}
Decision: ${decision.decision.toUpperCase()}
Reference: ${flowId}

Please contact our office for any questions regarding this decision.
    `.trim();

    const patientNotification = `
INSURANCE COVERAGE DECISION
===========================

Dear ${requestInfo.patientInfo.name},

Your insurance coverage request for ${requestInfo.serviceRequested} has been ${decision.decision}.

${decision.decision === 'approved' ? 
  'Your treatment has been approved. Please coordinate with your healthcare provider.' :
  'If you disagree with this decision, you have the right to appeal within 30 days.'
}

Reference Number: ${flowId}
    `.trim();

    return {
      approvalLetter,
      providerNotification,
      patientNotification
    };
  }

  /**
   * Get current workflow status
   */
  getWorkflowStatus(): string {
    if (!this.currentFlow) return 'not_started';
    
    const plan = this.currentFlow.plan;
    const hasErrors = plan.steps.some(step => step.status === 'error');
    const allCompleted = plan.steps.every(step => step.status === 'completed');
    const hasPending = this.currentFlow.clarifications.some(c => !c.answered);
    
    if (hasErrors) return 'error';
    if (hasPending) return 'pending_clarification';
    if (allCompleted) return 'completed';
    return 'in_progress';
  }

  /**
   * Helper: Update step status
   */
  private async updateStepStatus(
    plan: PortiaInsuranceWorkflowPlan,
    stepId: string,
    status: 'pending' | 'running' | 'completed' | 'error',
    result?: any
  ): Promise<void> {
    const step = plan.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      step.result = result;
      step.timestamp = new Date();
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Helper: Reconstruct request with clarifications
   */
  private reconstructRequestWithClarifications(): string {
    if (!this.currentFlow?.finalAnalysis) return '';
    
    const analysis = this.currentFlow.finalAnalysis;
    const clarifications = this.currentFlow.clarifications;
    
    let reconstructed = `
Patient: ${analysis.requestInfo.patientInfo.name}
Service Requested: ${analysis.requestInfo.serviceRequested}
Diagnosis: ${analysis.requestInfo.diagnosis}
Clinical Justification: ${analysis.requestInfo.clinicalJustification}
    `;
    
    clarifications.forEach(clarification => {
      if (clarification.answered && clarification.answer) {
        reconstructed += `\n${clarification.type}: ${clarification.answer}`;
      }
    });
    
    return reconstructed;
  }
}
