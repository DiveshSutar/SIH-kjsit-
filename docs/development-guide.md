# Development Guide

## Project Structure

```
hospital-1/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   └── portia/
│   │   │       └── insurance/        # Insurance approval APIs
│   │   ├── insurance-approval/       # Insurance approval page
│   │   └── ...                       # Other pages
│   ├── components/                   # React Components
│   │   ├── portia/                   # Insurance approval components
│   │   ├── medical-reports/          # Medical report components
│   │   └── ...                       # Other components
│   ├── ai/                          # AI and Workflow Logic
│   │   └── portia/                   # Portia framework implementation
│   ├── contexts/                     # React Context Providers
│   ├── hooks/                        # Custom React Hooks
│   ├── lib/                         # Utility Libraries
│   └── types/                        # TypeScript Type Definitions
├── docs/                            # Documentation
├── java/                            # Java Backend Utilities
├── public/                          # Static Assets
└── ...                             # Config files
```

## Getting Started for Developers

### Prerequisites
- Node.js 18+ and npm 9+
- TypeScript knowledge
- React/Next.js experience
- Basic understanding of AI/ML concepts

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/wanidhruva/Portia-hospital.git
   cd Portia-hospital
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env.local
   # Add your API keys and configuration
   ```

3. **Start development servers:**
   ```bash
   # Main development server
   npm run dev

   # AI development server (optional)
   npm run genkit:dev
   ```

### Code Style and Standards

#### TypeScript Configuration
- Strict mode enabled
- Path aliases configured (`@/` maps to `src/`)
- Interface-first approach for type definitions

#### Component Structure
```typescript
// Component template
interface ComponentProps {
  // Props interface first
}

export default function Component({ prop }: ComponentProps) {
  // State and hooks
  const [state, setState] = useState();
  
  // Event handlers
  const handleEvent = () => {
    // Implementation
  };
  
  // Render helpers
  const renderHelper = () => {
    // Helper functions
  };
  
  // Main render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

#### API Route Structure
```typescript
// API route template
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Input validation
    const body = await request.json();
    
    // Business logic
    const result = await processRequest(body);
    
    // Success response
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    // Error handling
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

## Key Technologies

### Frontend Stack
- **Next.js 15**: App Router, API routes, TypeScript support
- **React 18**: Hooks, Context API, Suspense
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

### AI Integration
- **Google Gemini API**: Primary AI model
- **Portia Framework**: Custom workflow engine
- **LangChain**: Document processing (medical reports)
- **Qdrant**: Vector database for semantic search

### State Management
- React Context for global state
- Local component state with useState
- Custom hooks for complex state logic

## Core Features Development

### 1. Insurance Approval System

#### Workflow Engine (`src/ai/portia/`)

**Key Files:**
- `insurance-approval-workflow.ts` - Main workflow orchestrator
- `insurance-approval-agent.ts` - AI agent and analysis logic

**Architecture:**
```typescript
// Workflow steps
const steps = [
  'parse-request',     // Extract information
  'verify-coverage',   // Check insurance coverage
  'analyze-criteria',  // Medical necessity
  'check-documentation', // Required docs
  'generate-decision', // Approval/denial
  'prepare-notification' // Documentation
];
```

**State Management:**
- Static flow store for persistence
- Individual clarification tracking
- Error recovery mechanisms

#### UI Components (`src/components/portia/`)

**Main Component:** `InsuranceApprovalComponent.tsx`
- Form handling with individual state management
- Real-time workflow progress display
- Dynamic clarification system
- Document generation and download

### 2. Medical Report Analysis

#### Implementation (`src/components/medical-reports/`)
- PDF upload and processing
- LangChain integration for document analysis
- Qdrant vector database for semantic search
- Natural language querying interface

### 3. Appointment System

#### Features
- Interactive calendar component
- AI-powered scheduling suggestions
- Patient management integration
- Email notifications via SendGrid

## AI Integration Patterns

### 1. Prompt Engineering
```typescript
// Example prompt structure
const analysisPrompt = `
You are an expert insurance analyst. Analyze this request:

REQUEST:
${requestText}

CRITERIA:
- Medical necessity
- Coverage verification
- Documentation requirements

RESPONSE FORMAT:
{
  "decision": "approved|denied|pending_info",
  "confidence": 0.0-1.0,
  "reasoning": ["reason1", "reason2"],
  "requiredDocuments": ["doc1", "doc2"]
}
`;
```

### 2. Response Parsing
```typescript
// Robust JSON parsing with fallbacks
function parseAIResponse(response: string) {
  try {
    // Try direct JSON parse
    return JSON.parse(response);
  } catch {
    // Extract JSON from markdown
    const jsonMatch = response.match(/```json\n(.*?)\n```/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('Unable to parse AI response');
  }
}
```

### 3. Error Handling
```typescript
// Comprehensive error handling
async function callAI(prompt: string) {
  try {
    const response = await ai.generateContent(prompt);
    return parseAIResponse(response.text);
  } catch (error) {
    if (error.code === 'QUOTA_EXCEEDED') {
      throw new Error('AI service temporarily unavailable');
    }
    throw error;
  }
}
```

## Testing Strategy

### Unit Testing
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import InsuranceApprovalComponent from './InsuranceApprovalComponent';

describe('InsuranceApprovalComponent', () => {
  test('renders form correctly', () => {
    render(<InsuranceApprovalComponent />);
    expect(screen.getByText('Insurance Request Details')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    render(<InsuranceApprovalComponent />);
    // Test implementation
  });
});
```

### API Testing
```typescript
// API route testing
import { POST } from '../app/api/portia/insurance/analyze/route';

describe('/api/portia/insurance/analyze', () => {
  test('analyzes valid request', async () => {
    const request = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ requestText: 'valid request' })
    });
    
    const response = await POST(request);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
```

### Integration Testing
- End-to-end workflow testing
- AI integration testing with mock responses
- Database integration testing (when applicable)

## Performance Optimization

### Frontend Optimization
- Next.js automatic optimizations (bundling, code splitting)
- Image optimization with Next.js Image component
- Lazy loading for heavy components
- Proper React memoization

### AI Optimization
- Request batching for multiple clarifications
- Response caching for similar requests
- Timeout management and retry logic
- Streaming responses for long operations

### Database Optimization
- Efficient queries for workflow state
- Proper indexing for search operations
- Connection pooling and caching

## Security Considerations

### Authentication
- Firebase Authentication integration
- JWT token validation
- Role-based access control (when applicable)

### Data Protection
- No persistent storage of sensitive medical data
- Secure API key management
- Input sanitization and validation
- Rate limiting on API endpoints

### HIPAA Compliance
- Audit logging for all operations
- Data encryption in transit
- Secure data handling practices
- Privacy-first design

## Deployment

### Development
```bash
npm run dev  # Starts on http://localhost:9002
```

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
```env
# Required
GOOGLE_API_KEY=your_gemini_api_key
FIREBASE_API_KEY=your_firebase_key

# Optional
OPENAI_API_KEY=your_openai_key  # For medical reports
QDRANT_URL=http://localhost:6333  # Vector database
SENDGRID_API_KEY=your_sendgrid_key  # Email notifications
```

### Docker Deployment
```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing Guidelines

### Code Review Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Run linting and type checking
4. Submit pull request with clear description
5. Address review feedback
6. Merge after approval

### Commit Message Format
```
feat: add insurance approval clarification system
fix: resolve input synchronization issue in forms
docs: update API documentation for new endpoints
test: add unit tests for workflow engine
```

### Issue Reporting
- Use GitHub issue templates
- Provide reproduction steps
- Include environment information
- Add relevant labels

## Troubleshooting

### Common Development Issues

1. **TypeScript Errors**
   ```bash
   npm run typecheck  # Check for type errors
   ```

2. **Build Failures**
   ```bash
   rm -rf .next  # Clear Next.js cache
   npm run build
   ```

3. **AI API Issues**
   - Verify API keys in environment
   - Check quota limits
   - Review request format

4. **Firebase Authentication**
   - Verify Firebase configuration
   - Check authentication token validity
   - Review security rules

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Specific debug categories
DEBUG=portia:* npm run dev
```

## Architecture Decisions

### Why Portia Framework?
- Multi-agent approach for complex workflows
- Transparent and auditable decision processes
- Easy extension for new workflow types
- Built-in state management and persistence

### Why Google Gemini?
- High-quality reasoning for medical decisions
- Good JSON response formatting
- Reasonable pricing and quota limits
- Strong performance on healthcare use cases

### Why In-Memory Storage?
- Simplicity for MVP development
- Fast access to workflow state
- Easy to replace with database later
- Suitable for demo and development

## Future Roadmap

### Short Term (1-2 months)
- Database integration for production deployment
- Enhanced error handling and recovery
- Performance monitoring and analytics
- Additional test coverage

### Medium Term (3-6 months)
- Multi-tenant support
- Advanced workflow customization
- Integration with EMR systems
- Mobile application support

### Long Term (6+ months)
- Machine learning model training
- Advanced analytics and reporting
- International deployment
- Enterprise features and support

This development guide provides a comprehensive overview of the project structure, development practices, and key architectural decisions. For specific questions or additional guidance, refer to the other documentation files or contact the development team.
