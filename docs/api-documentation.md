# API Documentation

## Insurance Approval API

Base URL: `/api/portia/insurance/`

### Authentication
All API endpoints require Firebase authentication. Include the authentication token in the request headers:

```http
Authorization: Bearer <firebase-token>
```

## Endpoints

### 1. Analyze Insurance Request

**POST** `/api/portia/insurance/analyze`

Initiates a new insurance approval workflow by analyzing the submitted request.

#### Request Body
```json
{
  "requestText": "string", // Required: Full insurance request text
  "userPreferences": {     // Optional: User-specific preferences
    "priority": "standard|urgent|emergency",
    "notifications": "boolean"
  }
}
```

#### Response
```json
{
  "success": true,
  "flowId": "insurance-approval-1703123456789",
  "status": "completed|pending|error",
  "plan": {
    "id": "string",
    "title": "Insurance Approval Workflow",
    "steps": [
      {
        "id": "parse-request",
        "name": "Parse Insurance Request",
        "description": "Extract patient information and service details",
        "status": "completed|running|pending|error",
        "timestamp": "2024-08-24T10:30:00Z"
      }
    ]
  },
  "clarifications": [
    {
      "id": "clarification-uuid",
      "question": "Please provide additional clinical justification",
      "type": "justification",
      "answered": false
    }
  ],
  "analysis": {
    "requestInfo": {
      "patientInfo": {
        "name": "John Doe",
        "memberId": "MEM123456789",
        "policyNumber": "POL987654321"
      },
      "serviceRequested": "MRI Brain",
      "diagnosis": "Chronic headaches",
      "physicianInfo": {
        "name": "Dr. Smith",
        "specialty": "Neurology"
      }
    },
    "coverageAnalysis": {
      "isCovered": true,
      "requiresPriorAuth": true,
      "meetsCriteria": true,
      "missingCriteria": []
    },
    "decision": {
      "decision": "approved|denied|pending_info",
      "confidence": 0.95,
      "reasoning": ["Clear medical necessity documented"],
      "requiredDocuments": ["Prior authorization form"],
      "appealRights": "Patient may appeal within 60 days",
      "validityPeriod": "6 months"
    }
  },
  "processingTime": "2.3 seconds",
  "nextSteps": "Review approval decision"
}
```

#### Error Responses
```json
{
  "error": "Missing required requestText parameter",
  "details": "Request body must include requestText field"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (missing or invalid authentication)
- `429` - Rate Limited (too many requests)
- `500` - Internal Server Error

---

### 2. Submit Clarification

**POST** `/api/portia/insurance/clarify`

Submits an answer to a clarification question and continues the workflow.

#### Request Body
```json
{
  "flowId": "insurance-approval-1703123456789", // Required: Workflow ID
  "clarificationId": "clarification-uuid",      // Required: Question ID
  "answer": "Additional clinical details..."     // Required: User's answer
}
```

#### Response
```json
{
  "success": true,
  "flowId": "insurance-approval-1703123456789",
  "status": "completed",
  "clarifications": [
    {
      "id": "clarification-uuid",
      "question": "Please provide additional clinical justification",
      "type": "justification",
      "answered": true,
      "answer": "Additional clinical details..."
    }
  ],
  "analysis": {
    // Updated analysis with clarification incorporated
    "decision": {
      "decision": "approved",
      "confidence": 0.98,
      "reasoning": ["Clear medical necessity with additional justification"]
    }
  }
}
```

#### Error Responses
```json
{
  "error": "Invalid flow ID or workflow not found",
  "details": "The specified flowId does not exist or has expired"
}
```

---

### 3. Generate Documentation

**POST** `/api/portia/insurance/generate`

Generates approval documentation and letters for completed workflows.

#### Request Body
```json
{
  "flowId": "insurance-approval-1703123456789" // Required: Workflow ID
}
```

#### Response
```json
{
  "success": true,
  "documentation": {
    "approvalLetter": "INSURANCE APPROVAL DECISION\n========================\n...",
    "providerNotification": "Dear Dr. Smith,\nThis letter confirms...",
    "patientNotification": "Dear John Doe,\nYour insurance request..."
  },
  "metadata": {
    "generatedAt": "2024-08-24T10:35:00Z",
    "documentFormat": "text/plain",
    "validUntil": "2025-02-24T10:35:00Z"
  }
}
```

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `400` | Bad Request | Check request format and required fields |
| `401` | Unauthorized | Verify Firebase authentication token |
| `404` | Flow Not Found | Ensure flowId is valid and not expired |
| `429` | Rate Limited | Wait and retry (max 10 requests/minute) |
| `500` | Server Error | Contact support if persistent |

### Rate Limiting

- **Limit**: 10 requests per minute per IP address
- **Headers**: Response includes rate limit headers
  ```http
  X-RateLimit-Limit: 10
  X-RateLimit-Remaining: 7
  X-RateLimit-Reset: 1703123520
  ```

## SDK Examples

### JavaScript/TypeScript
```typescript
class InsuranceApprovalAPI {
  constructor(private baseUrl: string, private authToken: string) {}

  async analyzeRequest(requestText: string): Promise<AnalysisResult> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ requestText })
    });
    
    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  async submitClarification(
    flowId: string, 
    clarificationId: string, 
    answer: string
  ): Promise<ClarificationResult> {
    const response = await fetch(`${this.baseUrl}/clarify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ flowId, clarificationId, answer })
    });
    
    return response.json();
  }
}
```

### Python
```python
import requests
from typing import Dict, Any

class InsuranceApprovalAPI:
    def __init__(self, base_url: str, auth_token: str):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {auth_token}'
        }
    
    def analyze_request(self, request_text: str) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/analyze',
            json={'requestText': request_text},
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def submit_clarification(
        self, 
        flow_id: str, 
        clarification_id: str, 
        answer: str
    ) -> Dict[str, Any]:
        response = requests.post(
            f'{self.base_url}/clarify',
            json={
                'flowId': flow_id,
                'clarificationId': clarification_id,
                'answer': answer
            },
            headers=self.headers
        )
        return response.json()
```

## Testing

### Test Environment
Base URL: `http://localhost:9002/api/portia/insurance/`

### Sample Request
```bash
curl -X POST http://localhost:9002/api/portia/insurance/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "requestText": "Patient: John Doe\nService: MRI Brain\nDiagnosis: Chronic headaches\nJustification: Conservative treatment unsuccessful"
  }'
```

### Testing Checklist
- [ ] Valid authentication token
- [ ] Proper request format
- [ ] Rate limiting compliance
- [ ] Error handling
- [ ] Workflow state persistence
- [ ] Documentation generation

## Changelog

### v1.2.0 (2024-08-24)
- Added comprehensive medication coverage database
- Improved clarification handling with individual state management
- Enhanced error handling and debugging
- Added flow persistence across API calls

### v1.1.0 (2024-08-20)
- Initial insurance approval API release
- Basic workflow support
- Firebase authentication integration
- Documentation generation
