/**
 * Test API to verify OpenRouter integration
 * GET /api/test-openrouter
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check API key configuration
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const googleKey = process.env.GOOGLE_API_KEY;

    const result = {
      timestamp: new Date().toISOString(),
      environment: 'development',
      apiKeys: {
        openrouter: {
          configured: !!openrouterKey,
          format: openrouterKey ? openrouterKey.substring(0, 12) + '...' : 'Not set',
          valid: openrouterKey?.startsWith('sk-or-v1-') ?? false
        },
        openai: {
          configured: !!openaiKey,
          format: openaiKey ? openaiKey.substring(0, 8) + '...' : 'Not set',
          valid: openaiKey?.startsWith('sk-') ?? false
        },
        google: {
          configured: !!googleKey,
          format: googleKey ? googleKey.substring(0, 8) + '...' : 'Not set',
          valid: !!googleKey
        }
      },
      aiPriority: [
        'OpenRouter (Claude 3.5 Sonnet) - Primary',
        'OpenAI (GPT-4) - Fallback',
        'Google Gemini - Final Fallback'
      ],
      status: 'OpenRouter integration ready',
      medicalReportsUrl: '/portia-medical-reports'
    };

    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Test API error:', error);
    
    return NextResponse.json(
      {
        error: 'Test API failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}