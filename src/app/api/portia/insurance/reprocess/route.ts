/**
 * API Route: Insurance Approval Reprocessing
 * POST /api/portia/insurance/reprocess
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortiaInsuranceApprovalWorkflow } from '@/ai/portia/insurance-approval-workflow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId, additionalDocuments } = body;

    if (!flowId || !additionalDocuments || !Array.isArray(additionalDocuments)) {
      return NextResponse.json(
        { error: 'Flow ID and additional documents are required' },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GOOGLE_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 500 }
      );
    }

    const workflow = new PortiaInsuranceApprovalWorkflow(geminiApiKey);
    
    // Add the additional documents as clarifications and reprocess
    const reprocessedFlow = await workflow.reprocessWithAdditionalDocuments(flowId, additionalDocuments);

    return NextResponse.json({
      success: true,
      flowId: reprocessedFlow.plan.id,
      status: workflow.getWorkflowStatus(),
      clarifications: reprocessedFlow.clarifications,
      analysis: reprocessedFlow.finalAnalysis ? {
        requestInfo: reprocessedFlow.finalAnalysis.requestInfo,
        coverageAnalysis: reprocessedFlow.finalAnalysis.coverageAnalysis,
        decision: reprocessedFlow.finalAnalysis.decision,
        reviewNotes: reprocessedFlow.finalAnalysis.reviewNotes
      } : null
    });

  } catch (error) {
    console.error('Reprocessing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to reprocess with additional documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
