# Insurance Approval System Documentation

## Overview

The Portia Insurance Approval System is an AI-powered workflow engine designed to automate and streamline insurance approval processes in healthcare settings. It uses Google Gemini AI and a multi-agent framework to analyze insurance requests, handle clarifications, and generate approval documentation.

## System Architecture

### Core Components

1. **Portia Workflow Engine** (`src/ai/portia/`)
   - `insurance-approval-workflow.ts` - Main workflow orchestrator
   - `insurance-approval-agent.ts` - AI agent for analysis and decision making

2. **UI Components** (`src/components/portia/`)
   - `InsuranceApprovalComponent.tsx` - Main React component
   - Individual form components and UI elements

3. **API Routes** (`src/app/api/portia/insurance/`)
   - `analyze/route.ts` - Initial request analysis
   - `clarify/route.ts` - Clarification handling
   - `generate/route.ts` - Document generation

### Workflow Process

```
Request Submission → AI Analysis → Clarifications (if needed) → Decision → Documentation
```

## Key Features

### 1. Multi-Step Workflow Analysis
- **Parse Request**: Extract patient info, service details, clinical justification
- **Verify Coverage**: Check service coverage under patient policy
- **Analyze Criteria**: Evaluate medical necessity and coverage criteria
- **Check Documentation**: Verify required documents are provided
- **Generate Decision**: Create approval/denial with detailed reasoning
- **Prepare Notification**: Generate letters for patient and provider

### 2. Comprehensive Medication Coverage
The system includes an extensive medication database with 50+ medications:

**Categories Covered:**
- Cardiovascular medications (Statins, ACE inhibitors, Beta-blockers)
- Diabetes management (Metformin, Insulin, GLP-1 agonists)
- Pain management (NSAIDs, Opioids, Muscle relaxants)
- Mental health (Antidepressants, Antipsychotics, Anxiolytics)
- Respiratory (Inhalers, Bronchodilators, Corticosteroids)
- Oncology treatments and specialty medications
- Preventive medications and vaccines

### 3. Intelligent Decision Making
- **Generous Approval Policies**: Designed to maximize patient access to care
- **Evidence-Based Criteria**: Uses current medical guidelines
- **Transparent Reasoning**: Provides detailed explanations for all decisions
- **Confidence Scoring**: AI confidence levels help guide manual review needs

### 4. State Persistence
- **Flow Storage**: Maintains workflow state across API calls
- **Session Management**: Supports multiple concurrent workflows
- **Error Recovery**: Robust error handling and recovery mechanisms

## Usage Guide

### For Healthcare Providers

1. **Submitting Requests**
   ```typescript
   // Request format
   const insuranceRequest = {
     patientInfo: {
       name: "John Doe",
       memberId: "MEM123456789",
       policyNumber: "POL987654321"
     },
     serviceRequested: "MRI Brain",
     diagnosis: "Chronic headaches",
     clinicalJustification: "Conservative treatment unsuccessful...",
     physicianInfo: {
       name: "Dr. Smith",
       specialty: "Neurology"
     }
   };
   ```

2. **Monitoring Progress**
   - Real-time workflow step updates
   - Visual progress indicators
   - Estimated completion times

3. **Handling Clarifications**
   - Individual input fields for each question
   - No shared state between clarifications
   - Immediate workflow continuation upon submission

### For Developers

#### API Integration

```typescript
// Analyze insurance request
const response = await fetch('/api/portia/insurance/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requestText: insuranceRequestText,
    userPreferences: {}
  })
});

// Handle clarifications
const clarificationResponse = await fetch('/api/portia/insurance/clarify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    flowId: workflowId,
    clarificationId: questionId,
    answer: userAnswer
  })
});
```

#### Custom Configuration

```typescript
// Customize approval criteria
const customCriteria = {
  medicationCoverage: ['custom-medication'],
  priorAuthRequired: false,
  autoApproveThreshold: 0.8
};
```

## Technical Implementation

### AI Integration
- **Model**: Google Gemini 1.5 Flash
- **Context Window**: Optimized for complex medical requests
- **Prompt Engineering**: Structured prompts for consistent analysis
- **Response Parsing**: Robust JSON parsing with fallbacks

### Error Handling
- **API Rate Limiting**: Built-in rate limiting (10 requests/minute)
- **Timeout Management**: Request timeouts with retry logic
- **Data Validation**: Input validation at multiple levels
- **Graceful Degradation**: Fallback modes for API failures

### Security Considerations
- **Data Privacy**: No persistent storage of medical data
- **Authentication**: Firebase integration for secure access
- **Audit Trail**: Logging of all workflow actions
- **HIPAA Considerations**: Designed with healthcare privacy in mind

## Configuration

### Environment Variables
```env
GOOGLE_API_KEY=your_gemini_api_key
FIREBASE_API_KEY=your_firebase_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
```

### Workflow Customization
- Modify `INSURANCE_COVERAGE_CRITERIA` in `insurance-approval-agent.ts`
- Adjust approval thresholds and medication lists
- Customize workflow steps in `insurance-approval-workflow.ts`

## Troubleshooting

### Common Issues

1. **Flow Not Found Errors**
   - Ensure workflow persistence is properly configured
   - Check that flowId is correctly passed between API calls

2. **AI Analysis Failures**
   - Verify Google API key is valid and has sufficient quota
   - Check request format matches expected schema

3. **Clarification Sync Issues**
   - Ensure individual state management for each clarification
   - Verify clarificationAnswers object structure

### Debug Mode
Enable detailed logging by setting:
```env
NODE_ENV=development
DEBUG_WORKFLOWS=true
```

## Future Enhancements

- **Database Integration**: Replace in-memory storage with persistent database
- **Advanced Analytics**: Workflow performance metrics and insights
- **Integration APIs**: Connect with existing EMR and insurance systems
- **Machine Learning**: Continuous improvement of approval accuracy
- **Multi-Language Support**: International deployment capabilities

## Support

For technical support or questions:
- Check the troubleshooting section above
- Review API documentation
- Submit issues on GitHub
- Contact the development team for enterprise support
