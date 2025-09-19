# OpenRouter Integration for Medical Report Analysis

## Overview

The HealthFirst Connect medical report analysis system now supports **OpenRouter** as the primary AI provider for medical report analysis. OpenRouter provides access to multiple LLM providers through a single API, offering better model selection and often more cost-effective usage.

## Configuration

### OpenRouter API Key Setup

1. **Get your OpenRouter API Key:**
   - Visit: https://openrouter.ai/keys
   - Create an account and generate an API key
   - Your key will start with `sk-or-v1-`

2. **Set the environment variable:**
   ```bash
   # Windows PowerShell
   $env:OPENROUTER_API_KEY="sk-or-v1-your-actual-openrouter-key-here"
   
   # Linux/Mac
   export OPENROUTER_API_KEY="sk-or-v1-your-actual-openrouter-key-here"
   ```

3. **Update your `.env` or `process.env` file:**
   ```env
   OPENROUTER_API_KEY=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
   ```

## Priority Order

The medical report analysis system uses the following priority order for AI providers:

1. **OpenRouter** (highest priority) - Uses Claude 3.5 Sonnet for medical analysis
2. **OpenAI** (fallback) - Uses GPT-4 for analysis
3. **Google Gemini** (final fallback) - Uses Gemini 1.5 Flash

## Benefits of OpenRouter

- **Multiple Model Access**: Access to Anthropic Claude, OpenAI GPT, Google Gemini, and many other models
- **Cost Effective**: Often more competitive pricing than direct provider APIs
- **Better Model Selection**: Claude 3.5 Sonnet is particularly good at medical text analysis
- **Reliability**: Automatic failover between providers
- **Rate Limiting**: Built-in rate limiting and quota management

## Implementation Details

### Model Selection

When using OpenRouter, the system uses:
- **Primary Model**: `anthropic/claude-3.5-sonnet`
- **Use Case**: Medical report parsing, lab value analysis, and patient-friendly explanations

### Configuration in Code

The system automatically detects and uses OpenRouter when the API key is available:

```typescript
// Priority: OpenRouter > OpenAI > Google Gemini
const routerKey = process.env.OPENROUTER_API_KEY;
const aiKey = process.env.OPENAI_API_KEY;
const googleKey = process.env.GOOGLE_API_KEY;

if (routerKey) {
  // Use OpenRouter with Claude 3.5 Sonnet
} else if (aiKey) {
  // Fallback to OpenAI GPT-4
} else {
  // Final fallback to Google Gemini
}
```

## Testing the Integration

1. **Run the demo script:**
   ```bash
   OPENROUTER_API_KEY=your-key-here node portia-demo-complete.js
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Visit the medical reports page:**
   ```
   http://localhost:3000/portia-medical-reports
   ```

4. **Test with sample medical report:**
   - Click "Load Sample Report for Demo"
   - Click "Start Portia Analysis"
   - Verify that the system shows "OpenRouter (Claude 3.5 Sonnet)" in the processing steps

## API Integration

### Headers Required

When using OpenRouter, the system automatically sets:
- `HTTP-Referer`: Your site URL (for OpenRouter analytics)
- `X-Title`: "HealthFirst Connect Medical Analysis" (for OpenRouter dashboard)

### Error Handling

The system includes comprehensive error handling:
- Invalid API key detection
- Rate limiting responses
- Automatic fallback to secondary providers
- Detailed error messages for debugging

## Monitoring and Analytics

OpenRouter provides detailed analytics through their dashboard:
- Request volume and costs
- Model performance metrics
- Rate limiting statistics
- Error rate monitoring

Access your analytics at: https://openrouter.ai/activity

## Troubleshooting

### Common Issues

1. **"AI service is not configured" error:**
   - Verify the OPENROUTER_API_KEY environment variable is set
   - Check that the key starts with `sk-or-v1-`
   - Ensure the key is valid and has credits

2. **Rate limiting errors:**
   - OpenRouter has built-in rate limiting
   - Check your usage at https://openrouter.ai/activity
   - Consider upgrading your OpenRouter plan for higher limits

3. **Model not available errors:**
   - Ensure Claude 3.5 Sonnet is available in your OpenRouter plan
   - The system will automatically fallback to OpenAI/Gemini if needed

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=portia:medical-analysis
```

## Cost Optimization

OpenRouter often provides better pricing than direct API access:
- **Claude 3.5 Sonnet**: ~$3/million tokens (input), ~$15/million tokens (output)
- **Automatic model routing**: Routes to most cost-effective available model
- **Usage tracking**: Detailed cost breakdown in dashboard

## Security Considerations

- API keys are processed server-side only
- No medical data is stored permanently
- HIPAA-compliant processing
- Automatic key rotation support
- Rate limiting prevents abuse

## Migration from OpenAI

If you're currently using OpenAI and want to migrate to OpenRouter:

1. Keep your existing OpenAI key as fallback
2. Add the OpenRouter key - it will take priority automatically
3. Test thoroughly with sample reports
4. Monitor costs and performance through OpenRouter dashboard
5. Optionally remove OpenAI key once satisfied with OpenRouter performance

## Support

For issues with OpenRouter integration:
1. Check the [OpenRouter documentation](https://openrouter.ai/docs)
2. Review error messages in browser console
3. Check server logs for detailed error information
4. Verify API key validity at https://openrouter.ai/keys

The integration is designed to be seamless and should work immediately once the API key is configured.