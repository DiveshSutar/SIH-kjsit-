#!/bin/bash

# Portia Medical Analysis System - OpenAI Configuration Script
# This script helps configure the OpenAI API key for the Portia medical report analysis system

echo "🏥 Portia Medical Analysis - OpenAI Setup"
echo "========================================"
echo ""

echo "📋 Current Configuration:"
echo "OpenAI API Key: ${OPENAI_API_KEY:0:7}..." 
echo "Google Gemini Key: ${GOOGLE_API_KEY:0:7}..."
echo ""

echo "🔧 To configure your OpenAI API key:"
echo "1. Get your API key from: https://platform.openai.com/api-keys"
echo "2. Replace the placeholder key with your real key:"
echo ""
echo "   Windows PowerShell:"
echo "   \$env:OPENAI_API_KEY=\"sk-your-actual-openai-key-here\""
echo ""
echo "   Linux/Mac:"
echo "   export OPENAI_API_KEY=\"sk-your-actual-openai-key-here\""
echo ""

echo "🎯 Your current placeholder key:"
echo "   sk-1234abcd1234abcd1234abcd1234abcd1234abcd"
echo ""
echo "   This needs to be replaced with your real OpenAI API key!"
echo ""

echo "✅ After setting your real API key:"
echo "1. Restart the development server: npm run dev"
echo "2. Test the integration: node test-openai-integration.js"
echo "3. Visit: http://localhost:3000/portia-medical-reports"
echo ""

echo "🎪 Demo the system:"
echo "node portia-demo-complete.js"
echo ""

echo "📚 Full documentation:"
echo "See PORTIA_OPENAI_README.md for complete setup instructions"
