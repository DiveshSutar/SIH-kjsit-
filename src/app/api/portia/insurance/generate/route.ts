/**
 * API Route: Generate Insurance Approval Documentation
 * POST /api/portia/insurance/generate
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
    const { flowId } = body;

    if (!flowId) {
      return NextResponse.json(
        { error: 'Flow ID is required' },
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
    const documentation = await workflow.generateApprovalDocumentation(flowId);

    return NextResponse.json({
      success: true,
      flowId,
      documentation: {
        approvalLetter: documentation.approvalLetter,
        providerNotification: documentation.providerNotification,
        patientNotification: documentation.patientNotification
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Documentation generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate documentation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
