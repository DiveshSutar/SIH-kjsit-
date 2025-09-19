/**
 * API Route: Insurance Approval Clarifications
 * POST /api/portia/insurance/clarify
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortiaInsuranceApprovalWorkflow } from '@/ai/portia/insurance-approval-workflow';

// Load environment variables from process.env file for insurance services
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), 'process.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line: string) => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId, clarificationId, answer } = body;

    if (!flowId || !clarificationId || !answer) {
      return NextResponse.json(
        { error: 'Flow ID, clarification ID, and answer are required' },
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
    const updatedFlow = await workflow.handleClarification(flowId, clarificationId, answer);

    return NextResponse.json({
      success: true,
      flowId: updatedFlow.plan.id,
      status: workflow.getWorkflowStatus(),
      clarifications: updatedFlow.clarifications,
      analysis: updatedFlow.finalAnalysis ? {
        requestInfo: updatedFlow.finalAnalysis.requestInfo,
        coverageAnalysis: updatedFlow.finalAnalysis.coverageAnalysis,
        decision: updatedFlow.finalAnalysis.decision,
        reviewNotes: updatedFlow.finalAnalysis.reviewNotes
      } : null
    });

  } catch (error) {
    console.error('Clarification handling error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to handle clarification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
