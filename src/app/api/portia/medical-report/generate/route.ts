/**
 * API Route: Portia Medical Report Final Output
 * POST /api/portia/medical-report/generate
 * 
 * This endpoint generates the final output in the requested format (PDF, email, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortiaMedicalReportWorkflow } from '@/ai/portia/medical-report-workflow';
import { formatAnalysisForDisplay } from '@/ai/portia/medical-report-agent';

// In-memory workflow storage (in production, use Redis or database)
const activeWorkflows = global.activeWorkflows || (global.activeWorkflows = new Map());

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId } = body;

    if (!flowId) {
      return NextResponse.json(
        { error: 'Flow ID is required' },
        { status: 400 }
      );
    }

    // Get workflow instance from global storage
    const workflowData = activeWorkflows.get(flowId);
    if (!workflowData) {
      return NextResponse.json(
        { error: 'Workflow not found. Please start a new analysis.' },
        { status: 404 }
      );
    }

    // Create workflow instance and restore data
    const googleApiKey = process.env.GOOGLE_API_KEY || 'AIzaSyD9qs4O_R3CoSOLcbQTAKQXwN8wn1WAmqM';
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const workflow = new PortiaMedicalReportWorkflow(googleApiKey, openaiApiKey);
    workflow.restoreFlow(workflowData);

    const currentFlow = workflow.getCurrentFlow();
    if (!currentFlow?.finalAnalysis) {
      return NextResponse.json(
        { error: 'Analysis not complete. Please answer all clarification questions first.' },
        { status: 400 }
      );
    }

    // Generate final output
    const output = await workflow.generateFinalOutput();
    
    // Format the analysis for display
    const formattedAnalysis = formatAnalysisForDisplay(currentFlow.finalAnalysis);

    const response = {
      success: true,
      flowId,
      analysis: {
        formattedText: formattedAnalysis,
        summary: currentFlow.finalAnalysis.summary,
        patientInfo: currentFlow.finalAnalysis.patientInfo,
        labValues: currentFlow.finalAnalysis.labValues,
        recommendations: currentFlow.finalAnalysis.recommendations,
        disclaimer: currentFlow.finalAnalysis.disclaimer,
        processingSteps: currentFlow.finalAnalysis.processingSteps
      },
      outputGenerated: {
        pdfGenerated: !!output.pdfBuffer,
        emailSent: !!output.emailSent,
        driveFileSaved: !!output.driveFileId
      },
      completedAt: currentFlow.plan.completedAt,
      metadata: {
        totalProcessingSteps: currentFlow.plan.steps.length,
        successfulSteps: currentFlow.plan.steps.filter(s => s.status === 'completed').length,
        clarificationsAnswered: currentFlow.clarifications.filter(q => q.answered).length
      }
    };

    // Clean up the workflow
    setTimeout(() => activeWorkflows.delete(flowId), 300000); // Clean up after 5 minutes

    return NextResponse.json(response);

  } catch (error) {
    console.error('Final output generation error:', error);
    
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

// GET endpoint to check workflow status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const flowId = searchParams.get('flowId');

    if (!flowId) {
      return NextResponse.json(
        { error: 'Flow ID is required' },
        { status: 400 }
      );
    }

    const workflow = activeWorkflows.get(flowId);
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const googleApiKey = process.env.GOOGLE_API_KEY || 'AIzaSyD9qs4O_R3CoSOLcbQTAKQXwN8wn1WAmqM';
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const workflowInstance = new PortiaMedicalReportWorkflow(googleApiKey, openaiApiKey);
    workflowInstance.restoreFlow(workflow);

    const currentFlow = workflowInstance.getCurrentFlow();
    const status = workflowInstance.getWorkflowStatus();

    const response = {
      success: true,
      flowId,
      status,
      plan: currentFlow?.plan,
      clarifications: currentFlow?.clarifications,
      hasAnalysis: !!currentFlow?.finalAnalysis,
      outputOptions: currentFlow?.outputOptions
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Status check error:', error);
    
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
