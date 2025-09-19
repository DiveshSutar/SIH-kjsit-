/**
 * API Route: Portia Medical Report Analysis
 * POST /api/portia/medical-report/analyze
 * 
 * This endpoint handles the initial analysis request for medical reports using Portia workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import { PortiaMedicalReportWorkflow } from '@/ai/portia/medical-report-workflow';

// Rate limiting setup
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;

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
    const { reportText, userPreferences } = body;

    if (!reportText || typeof reportText !== 'string') {
      return NextResponse.json(
        { error: 'Report text is required and must be a string' },
        { status: 400 }
      );
    }

    if (reportText.length > 50000) {
      return NextResponse.json(
        { error: 'Report text is too long. Maximum 50,000 characters allowed.' },
        { status: 400 }
      );
    }

    // Get API keys from environment
    const googleApiKey = process.env.GOOGLE_API_KEY || 'AIzaSyD9qs4O_R3CoSOLcbQTAKQXwN8wn1WAmqM';
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const groqApiKey = process.env.GROQ_API_KEY || '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';
    
    if (!googleApiKey && !openaiApiKey && !groqApiKey) {
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Initialize Portia workflow with all API keys
    const workflow = new PortiaMedicalReportWorkflow(googleApiKey, openaiApiKey, groqApiKey);
    
    // Execute the workflow
    const startTime = Date.now();
    const flow = await workflow.executeWorkflow(reportText, userPreferences);
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
      processingTime: `${processingTime}ms`,
      finalAnalysis: flow.finalAnalysis ? {
        summary: flow.finalAnalysis.summary,
        patientInfo: flow.finalAnalysis.patientInfo,
        labValuesCount: flow.finalAnalysis.labValues.length,
        recommendationsCount: flow.finalAnalysis.recommendations.length
      } : null
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Portia analysis error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred during analysis',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
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
