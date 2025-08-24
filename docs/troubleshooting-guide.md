# Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the HealthFirst Connect hospital management system, including the Portia Insurance Approval System.

## General Diagnostics

### System Health Check

#### 1. Quick Health Assessment
```bash
# Check if the application is running
curl -f http://localhost:3000/api/health

# Check process status
ps aux | grep node

# Check port availability
netstat -tulpn | grep :3000
```

#### 2. Environment Validation
```bash
# Verify Node.js version
node --version  # Should be 18.x or higher

# Check npm version
npm --version   # Should be 9.x or higher

# Validate environment variables
node -e "console.log(process.env.GOOGLE_API_KEY ? 'Google API Key: ✓' : 'Google API Key: ✗')"
node -e "console.log(process.env.FIREBASE_API_KEY ? 'Firebase API Key: ✓' : 'Firebase API Key: ✗')"
```

#### 3. Dependency Check
```bash
# Check for npm audit issues
npm audit

# Verify critical dependencies
npm list next react @google/generative-ai firebase
```

## Common Issues and Solutions

### 1. Application Won't Start

#### Symptoms
- Server fails to start
- Port binding errors
- Module not found errors

#### Diagnosis
```bash
# Check for port conflicts
sudo lsof -i :3000

# Verify package installation
ls node_modules/ | wc -l

# Check for build artifacts
ls -la .next/
```

#### Solutions

**Port Already in Use**
```bash
# Find and kill process using port 3000
sudo fuser -k 3000/tcp

# Or use a different port
PORT=3001 npm run dev
```

**Missing Dependencies**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Build Issues**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild application
npm run build
```

### 2. Authentication Problems

#### Symptoms
- Users can't log in
- Firebase authentication errors
- Token validation failures

#### Diagnosis
```bash
# Test Firebase configuration
node -e "
const { initializeApp } = require('firebase/app');
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID
};
try {
  initializeApp(firebaseConfig);
  console.log('Firebase config: ✓');
} catch (error) {
  console.log('Firebase config: ✗', error.message);
}
"
```

#### Solutions

**Invalid Firebase Configuration**
```javascript
// Check .env.local file
FIREBASE_API_KEY=your_actual_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**Authentication Domain Issues**
- Go to Firebase Console → Authentication → Settings
- Add your domain to authorized domains
- Ensure localhost is included for development

**Token Expiration**
```javascript
// Implement token refresh in your auth context
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      // Force token refresh
      user.getIdToken(true);
    }
  });
  return unsubscribe;
}, []);
```

### 3. AI Integration Issues

#### Symptoms
- Gemini API errors
- Empty AI responses
- Rate limit exceeded

#### Diagnosis
```bash
# Test Google AI API
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GOOGLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{"text": "Test message"}]
    }]
  }'
```

#### Solutions

**Invalid API Key**
```bash
# Verify API key format (should start with AIza)
echo $GOOGLE_API_KEY | grep -E "^AIza"

# Test API key validity
node test-gemini-setup.js
```

**Rate Limiting**
```javascript
// Implement exponential backoff
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callGemini(prompt);
    } catch (error) {
      if (error.message.includes('429') && i < maxRetries - 1) {
        await delay(Math.pow(2, i) * 1000); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

**Content Safety Filters**
```javascript
// Configure safety settings
const generationConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    // Add other categories as needed
  ],
};
```

### 4. Insurance Approval Workflow Issues

#### Symptoms
- Workflow gets stuck
- Clarifications not submitting
- Flow persistence errors

#### Diagnosis
```javascript
// Check workflow state
console.log('Current workflow state:', JSON.stringify(flowStore, null, 2));

// Verify clarification handling
console.log('Clarification answers:', clarificationAnswers);
```

#### Solutions

**Flow Persistence Issues**
```javascript
// Enhanced flow storage with error handling
class WorkflowStorage {
  static saveFlow(flowId, flowData) {
    try {
      const serialized = JSON.stringify(flowData);
      flowStore[flowId] = flowData;
      console.log(`Flow ${flowId} saved successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to save flow ${flowId}:`, error);
      return false;
    }
  }
  
  static loadFlow(flowId) {
    try {
      const flowData = flowStore[flowId];
      if (flowData) {
        console.log(`Flow ${flowId} loaded successfully`);
        return flowData;
      } else {
        console.warn(`Flow ${flowId} not found`);
        return null;
      }
    } catch (error) {
      console.error(`Failed to load flow ${flowId}:`, error);
      return null;
    }
  }
}
```

**Clarification Form Issues**
```javascript
// Individual state management for clarifications
const [clarificationAnswers, setClarificationAnswers] = useState({});

const handleClarificationChange = (questionId, value) => {
  setClarificationAnswers(prev => ({
    ...prev,
    [questionId]: value
  }));
};

// Proper form submission
const handleClarificationSubmit = async () => {
  try {
    // Validate all required fields
    const unanswered = clarifications.filter(q => 
      !clarificationAnswers[q.id] || clarificationAnswers[q.id].trim() === ''
    );
    
    if (unanswered.length > 0) {
      setError(`Please answer all clarification questions`);
      return;
    }
    
    // Submit clarifications
    await submitClarifications(clarificationAnswers);
  } catch (error) {
    console.error('Clarification submission failed:', error);
    setError('Failed to submit clarifications');
  }
};
```

**Workflow State Recovery**
```javascript
// Implement workflow recovery
const recoverWorkflow = async (userId) => {
  try {
    // Attempt to load existing flow
    const existingFlow = WorkflowStorage.loadFlow(userId);
    
    if (existingFlow && existingFlow.status !== 'completed') {
      console.log('Recovering existing workflow:', existingFlow);
      return existingFlow;
    }
    
    // Create new workflow if none exists
    return createNewWorkflow(userId);
  } catch (error) {
    console.error('Workflow recovery failed:', error);
    return createNewWorkflow(userId);
  }
};
```

### 5. Medical Reports Issues

#### Symptoms
- File upload failures
- PDF processing errors
- Analysis incomplete

#### Diagnosis
```bash
# Check file upload limits
grep -r "maxFileSize\|bodyParser" next.config.*

# Verify file permissions
ls -la public/uploads/

# Test PDF processing
node -e "
const fs = require('fs');
const path = require('path');
console.log('PDF.js available:', !!require('pdfjs-dist'));
"
```

#### Solutions

**File Upload Limits**
```javascript
// next.config.ts
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  // Increase file upload limits
  serverRuntimeConfig: {
    maxFileSize: '10mb',
  },
  publicRuntimeConfig: {
    maxFileSize: '10mb',
  },
};
```

**PDF Processing Issues**
```javascript
// Enhanced PDF text extraction
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.entry';

const extractTextFromPDF = async (buffer) => {
  try {
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      text += pageText + '\n';
    }
    
    return text;
  } catch (error) {
    console.error('PDF extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};
```

### 6. Database Connection Issues

#### Symptoms
- Qdrant connection failures
- Vector search errors
- Collection not found

#### Diagnosis
```bash
# Check Qdrant status
curl http://localhost:6333/health

# Test collection existence
curl http://localhost:6333/collections/medical_reports

# Verify Docker container
docker ps | grep qdrant
```

#### Solutions

**Qdrant Not Running**
```bash
# Start Qdrant with Docker
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest

# Or with docker-compose
docker-compose up -d qdrant
```

**Collection Setup**
```javascript
// Initialize Qdrant collection
const initializeQdrant = async () => {
  try {
    const response = await fetch('http://localhost:6333/collections/medical_reports', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create collection: ${response.statusText}`);
    }
    
    console.log('Qdrant collection initialized successfully');
  } catch (error) {
    console.error('Qdrant initialization failed:', error);
  }
};
```

### 7. Performance Issues

#### Symptoms
- Slow page loads
- High memory usage
- API timeouts

#### Diagnosis
```bash
# Monitor memory usage
ps aux | grep node | awk '{print $4}' # Memory percentage

# Check for memory leaks
node --inspect app.js
# Then use Chrome DevTools

# Profile API performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/insurance-approval
```

#### Solutions

**Memory Optimization**
```javascript
// Optimize bundle size
const nextConfig = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@google/generative-ai'],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all';
    }
    return config;
  },
};
```

**API Optimization**
```javascript
// Add request timeout and caching
const apiHandler = async (req, res) => {
  const timeout = setTimeout(() => {
    res.status(408).json({ error: 'Request timeout' });
  }, 30000); // 30 second timeout
  
  try {
    // Add response caching for appropriate endpoints
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    
    const result = await processRequest(req);
    clearTimeout(timeout);
    res.json(result);
  } catch (error) {
    clearTimeout(timeout);
    res.status(500).json({ error: error.message });
  }
};
```

**Database Query Optimization**
```javascript
// Optimize vector searches
const searchMedicalReports = async (query, limit = 10) => {
  try {
    const response = await fetch('http://localhost:6333/collections/medical_reports/points/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vector: await generateEmbedding(query),
        limit,
        with_payload: true,
        score_threshold: 0.7 // Filter low-quality matches
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Vector search failed:', error);
    return { result: [] };
  }
};
```

## Logging and Monitoring

### 1. Enable Debug Logging

```javascript
// Add to .env.local for development
DEBUG=true
LOG_LEVEL=debug

// Add to your application
const log = (level, message, data = null) => {
  if (process.env.DEBUG === 'true') {
    console.log(`[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
};
```

### 2. Application Monitoring

```javascript
// Health check endpoint
// pages/api/health.ts
export default async function handler(req, res) {
  const checks = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {}
  };
  
  // Check Google AI API
  try {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash?key=${process.env.GOOGLE_API_KEY}`);
    checks.services.gemini = 'healthy';
  } catch (error) {
    checks.services.gemini = 'unhealthy';
  }
  
  // Check Qdrant
  try {
    await fetch('http://localhost:6333/health');
    checks.services.qdrant = 'healthy';
  } catch (error) {
    checks.services.qdrant = 'unhealthy';
  }
  
  const isHealthy = Object.values(checks.services).every(status => status === 'healthy');
  res.status(isHealthy ? 200 : 503).json(checks);
}
```

### 3. Error Tracking

```javascript
// Global error handler
const errorHandler = (error, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });
  
  // Send error to monitoring service (e.g., Sentry)
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(error);
  }
  
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message
  });
};
```

## Recovery Procedures

### 1. Service Recovery

```bash
#!/bin/bash
# recovery-script.sh

echo "Starting HealthFirst Connect recovery..."

# Stop services
pm2 stop healthfirst-connect
docker-compose down

# Backup current state
mkdir -p /backup/$(date +%Y%m%d_%H%M%S)
cp -r /var/www/healthfirst-connect /backup/$(date +%Y%m%d_%H%M%S)/

# Pull latest code
cd /var/www/healthfirst-connect
git pull origin main

# Reinstall dependencies
npm ci --only=production

# Rebuild application
npm run build

# Restart services
docker-compose up -d
pm2 start ecosystem.config.js

echo "Recovery completed. Checking health..."
sleep 10
curl -f http://localhost:3000/api/health
```

### 2. Database Recovery

```bash
#!/bin/bash
# qdrant-recovery.sh

echo "Recovering Qdrant database..."

# Stop Qdrant
docker stop qdrant

# Restore from backup
if [ -f "/backup/qdrant/latest.tar.gz" ]; then
  cd /var/lib/docker/volumes/qdrant_data/_data
  tar -xzf /backup/qdrant/latest.tar.gz
fi

# Restart Qdrant
docker start qdrant

# Wait for startup
sleep 15

# Verify collections
curl http://localhost:6333/collections
```

### 3. Configuration Recovery

```bash
#!/bin/bash
# config-recovery.sh

echo "Recovering configuration..."

# Restore environment variables
if [ -f "/backup/config/.env.local.backup" ]; then
  cp /backup/config/.env.local.backup /var/www/healthfirst-connect/.env.local
fi

# Restore Firebase config
if [ -f "/backup/config/firebase-config.json" ]; then
  cp /backup/config/firebase-config.json /var/www/healthfirst-connect/
fi

echo "Configuration restored."
```

## Emergency Contacts and Escalation

### 1. Support Escalation Matrix

| Issue Level | Contact | Response Time |
|------------|---------|---------------|
| Critical (Service Down) | On-call Engineer | 15 minutes |
| High (Feature Broken) | Development Team | 2 hours |
| Medium (Performance) | DevOps Team | 4 hours |
| Low (Enhancement) | Product Team | 24 hours |

### 2. Emergency Procedures

```bash
# Emergency shutdown
pm2 stop all
docker-compose down

# Emergency restore
./recovery-script.sh

# Emergency contact script
#!/bin/bash
ISSUE_LEVEL=$1
MESSAGE=$2

case $ISSUE_LEVEL in
  "critical")
    # Send SMS and email alerts
    echo "$MESSAGE" | mail -s "CRITICAL: HealthFirst Connect" admin@hospital.com
    ;;
  "high")
    echo "$MESSAGE" | mail -s "HIGH: HealthFirst Connect" dev-team@hospital.com
    ;;
esac
```

This troubleshooting guide provides comprehensive solutions for common issues. For persistent problems, consider reaching out to the development team with specific error logs and system information.
