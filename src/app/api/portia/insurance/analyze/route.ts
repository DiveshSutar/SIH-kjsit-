/**
 * API Route: Portia Insurance Approval Analysis
 * POST /api/portia/insurance/analyze
 * 
 * This endpoint handles insurance approval requests using Portia workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortiaInsuranceApprovalWorkflow } from '@/ai/portia/insurance-approval-workflow';

// Rate limiting setup
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(ip);

  if (!userRequests || now > userRequests.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userRequests.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userRequests.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { requestText, userPreferences } = body;

    if (!requestText || typeof requestText !== 'string') {
      return NextResponse.json(
        { error: 'Insurance request text is required and must be a string' },
        { status: 400 }
      );
    }

    if (requestText.length > 10000) {
      return NextResponse.json(
        { error: 'Request text is too long. Maximum 10,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Get API key from environment
    const geminiApiKey = process.env.GOOGLE_API_KEY;
    
    console.log('Insurance API - Environment check:');
    console.log('GOOGLE_API_KEY exists:', !!geminiApiKey);
    console.log('GOOGLE_API_KEY length:', geminiApiKey?.length || 0);
    console.log('GOOGLE_API_KEY starts with AIza:', geminiApiKey?.startsWith('AIza') || false);
    
    if (!geminiApiKey) {
      console.error('Insurance approval API: GOOGLE_API_KEY not found in environment');
      return NextResponse.json(
        { error: 'Insurance approval service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Initialize Portia workflow
    const workflow = new PortiaInsuranceApprovalWorkflow(geminiApiKey);
    
    // Execute the workflow
    const startTime = Date.now();
    const flow = await workflow.executeWorkflow(requestText, userPreferences);
    const processingTime = Date.now() - startTime;

    // Prepare response
    const response = {
      success: true,
      flowId: flow.plan.id,
      status: workflow.getWorkflowStatus(),
      plan: {
        id: flow.plan.id,
        title: flow.plan.title,
        description: flow.plan.description,
        steps: flow.plan.steps.map(step => ({
          id: step.id,
          name: step.name,
          description: step.description,
          status: step.status,
          error: step.error,
          timestamp: step.timestamp
        })),
        createdAt: flow.plan.createdAt,
        completedAt: flow.plan.completedAt
      },
      clarifications: flow.clarifications,
      analysis: flow.finalAnalysis ? {
        requestInfo: flow.finalAnalysis.requestInfo,
        coverageAnalysis: flow.finalAnalysis.coverageAnalysis,
        decision: flow.finalAnalysis.decision,
        reviewNotes: flow.finalAnalysis.reviewNotes
      } : null,
      processingTime: `${processingTime}ms`,
      nextSteps: flow.clarifications.length > 0 ? 
        'Please answer clarification questions to proceed' : 
        'Review complete - approval decision available'
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Insurance approval analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process insurance approval request',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Portia Insurance Approval API',
    status: 'active',
    endpoints: {
      analyze: 'POST /api/portia/insurance/analyze',
      clarify: 'POST /api/portia/insurance/clarify',
      generate: 'POST /api/portia/insurance/generate'
    },
    rateLimit: `${RATE_LIMIT_MAX_REQUESTS} requests per minute`,
    maxRequestSize: '10,000 characters'
  });
}
