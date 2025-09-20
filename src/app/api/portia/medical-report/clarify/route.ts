/**
 * API Route: Portia Medical Report Clarifications
 * POST /api/portia/medical-report/clarify
 * 
 * This endpoint handles answering clarification questions during the Portia workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortiaMedicalReportWorkflow } from '@/ai/portia/medical-report-workflow';

// In-memory workflow storage (in production, use Redis or database)
const activeWorkflows = new Map<string, any>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId, questionId, answer, userEmail } = body;

    if (!flowId || !questionId || !answer) {
      return NextResponse.json(
        { error: 'Flow ID, question ID, and answer are required' },
        { status: 400 }
      );
    }

    // Get API keys from environment
    const googleApiKey = process.env.GOOGLE_API_KEY || 'AIzaSyD9qs4O_R3CoSOLcbQTAKQXwN8wn1WAmqM';
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!googleApiKey) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 500 }
      );
    }

    // Get workflow instance from global storage
    const activeWorkflows = global.activeWorkflows || new Map();
    let workflowData = activeWorkflows.get(flowId);
    if (!workflowData) {
      return NextResponse.json(
        { error: 'Workflow not found. Please start a new analysis.' },
        { status: 404 }
      );
    }

    // Create new workflow instance with stored data
    const workflow = new PortiaMedicalReportWorkflow(googleApiKey, openaiApiKey);
    workflow.restoreFlow(workflowData);

    // Answer the clarification question
    const updatedFlow = await workflow.answerClarification(questionId, answer, userEmail);
    
    // Store updated workflow
    activeWorkflows.set(flowId, updatedFlow);

    // Check if workflow is complete
    const status = workflow.getWorkflowStatus();
    
    const response = {
      success: true,
      flowId: updatedFlow.plan.id,
      status,
      questionAnswered: questionId,
      answer,
      remainingClarifications: updatedFlow.clarifications.filter(q => !q.answered),
      finalAnalysis: updatedFlow.finalAnalysis ? {
        summary: updatedFlow.finalAnalysis.summary,
        hasRecommendations: updatedFlow.finalAnalysis.recommendations.length > 0,
        disclaimer: updatedFlow.finalAnalysis.disclaimer
      } : null,
      outputOptions: updatedFlow.outputOptions
    };

    // Clean up completed workflows
    if (status === 'completed') {
      setTimeout(() => activeWorkflows.delete(flowId), 300000); // Clean up after 5 minutes
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Clarification handling error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
