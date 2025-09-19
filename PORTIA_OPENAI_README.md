# 🏥 Portia Medical Report Analysis System

A sophisticated AI-powered medical report analysis system built with Portia framework, offering patient-friendly interpretations of lab results with multi-agent workflow capabilities.

## 🎯 Features

- **Multi-Agent AI System**: Uses Portia framework for structured medical analysis
- **Dual AI Support**: Primary OpenAI GPT-4 with Google Gemini fallback
- **Comprehensive Analysis**: Parses lab values and compares against medical reference ranges
- **Patient-Friendly Explanations**: Converts medical jargon into simple, understandable language
- **Smart Clarifications**: Asks relevant questions for better accuracy
- **Multiple Output Formats**: PDF, email, Google Drive integration
- **HIPAA-Friendly**: No data storage, secure processing

## 🚀 Quick Start

### 1. Configure OpenAI API Key (Recommended)

```bash
# Get your API key from https://platform.openai.com/api-keys
$env:OPENAI_API_KEY="your-actual-openai-api-key-here"
```

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Access the Medical Reports Interface

- **Main Interface**: http://localhost:3000/medical-reports
- **Portia Interface**: http://localhost:3000/portia-medical-reports

## 🔧 API Configuration

### OpenAI (Primary - Recommended)
```bash
$env:OPENAI_API_KEY="sk-your-openai-api-key"
```

### Google Gemini (Fallback - Integrated from Reference Repository)
```bash
$env:GOOGLE_API_KEY="your-google-gemini-api-key"
```

**✅ Reference Repository API Key**: The system includes a fallback Google Gemini API key (`AIzaSyD9qs4O_R3CoSOLcbQTAKQXwN8wn1WAmqM`) integrated from the reference repository, ensuring the medical analysis functionality works even in environments with network restrictions.

The system automatically uses OpenAI if available, otherwise falls back to Google Gemini, and provides demo functionality in restricted environments.

## 📊 Supported Medical Tests

### Complete Blood Count (CBC)
- Hemoglobin, Hematocrit
- White Blood Cells, Red Blood Cells
- Platelet Count

### Lipid Panel
- Total Cholesterol, LDL, HDL
- Triglycerides

### Basic Metabolic Panel
- Glucose, Sodium, Potassium
- BUN, Creatinine

### Vitamins & Minerals
- Vitamin D, B12, Folate
- Iron levels

### Thyroid Function
- TSH, T3, T4

### Liver Function
- ALT, AST, Bilirubin

## 🤖 Portia Workflow Steps

1. **Parse Report**: Extract patient info and lab values
2. **Analyze Values**: Compare against medical reference ranges
3. **Identify Abnormal**: Mark values as Normal/High/Low
4. **Generate Explanations**: Create patient-friendly descriptions
5. **Clarification Check**: Ask questions if needed
6. **Final Summary**: Comprehensive report with disclaimers

## 💡 Example Usage

### Input Medical Report:
```
PATIENT: John Doe
Test Date: 2024-08-20

Lab Results:
- Hemoglobin: 11.2 g/dL
- Total Cholesterol: 240 mg/dL
- Vitamin D: 35 ng/mL
```

### Portia Analysis Output:
```
🩺 Medical Report Summary for John Doe

📊 Test Results:
🔻 Hemoglobin: 11.2 g/dL (Low)
   Simple explanation: This measures oxygen-carrying cells. 
   Your level is slightly low, which might indicate mild anemia.

🔺 Total Cholesterol: 240 mg/dL (High)
   Simple explanation: High cholesterol may increase heart disease risk.
   Consider a heart-healthy diet and exercise.

✅ Vitamin D: 35 ng/mL (Normal)
   Good levels for bone health!

🔒 Disclaimer: This is educational information only. 
   Please consult your healthcare provider.
```

## 🛠️ Technical Architecture

### AI Models
- **Primary**: OpenAI GPT-4 (more accurate medical analysis)
- **Fallback**: Google Gemini 1.5 Flash

### Framework
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Node.js API routes
- **AI Framework**: Portia (multi-agent workflows)
- **Database**: Medical reference ranges (in-memory)

### Security
- Rate limiting (5 requests/minute)
- Input validation and sanitization
- No persistent data storage
- Environment variable configuration

## 📁 Project Structure

```
src/
├── ai/portia/
│   ├── medical-report-agent.ts      # Main Portia agent
│   ├── medical-report-workflow.ts   # Workflow orchestration
│   └── medical-report-config.ts     # Configuration
├── app/
│   ├── portia-medical-reports/      # Portia interface
│   └── api/portia/                  # API endpoints
└── components/portia/               # React components
```

## 🔄 API Endpoints

### POST `/api/portia/medical-report/analyze`
- Analyzes medical report text
- Returns workflow plan and initial analysis

### POST `/api/portia/medical-report/clarify`
- Handles clarification questions
- Updates workflow with user responses

### POST `/api/portia/medical-report/generate`
- Generates final report
- Provides output options (PDF, email, etc.)

## 🧪 Testing

### Run OpenAI Integration Test:
```bash
node test-openai-integration.js
```

### Run Complete Demo:
```bash
node portia-demo-complete.js
```

### Expected Output:
```
🏥 Portia Medical Report Analysis System Demo
✅ OpenAI API Key: Configured
🎯 Primary AI: OpenAI GPT-4
🔄 Workflow completed successfully!
```

## ⚠️ Important Notes

### Medical Disclaimer
This system is for educational purposes only and does not provide medical advice. Always consult healthcare professionals for medical decisions.

### API Key Security
- Never commit API keys to version control
- Use environment variables only
- Rotate keys regularly

### Rate Limits
- OpenAI: Varies by plan
- Google Gemini: 15 requests/minute (free tier)
- Built-in rate limiting: 5 requests/minute

## 🎪 Demo Features

### Simulated Medical Report Analysis
The demo includes a complete workflow simulation showing:
- Patient information extraction
- Lab value analysis with reference ranges
- Status classification (Normal/High/Low)
- Patient-friendly explanations
- Medical recommendations
- Professional disclaimers

### Interactive Clarifications
- Gender-specific reference ranges
- Explanation detail level preferences
- Data quality confirmations

### Output Options
- PDF report generation
- Email integration (Gmail)
- Google Drive storage
- Mobile-responsive dashboard

## 🔮 Future Enhancements

- [ ] PDF report generation
- [ ] Email integration
- [ ] Google Drive storage
- [ ] Multi-language support
- [ ] Voice interface
- [ ] Mobile app
- [ ] Doctor dashboard
- [ ] Historical tracking

## 📞 Support

For technical support or questions about the Portia medical analysis system:
1. Check the demo output for configuration status
2. Verify API key setup
3. Review the medical reference ranges
4. Test with sample medical reports

---

Built with ❤️ using Portia AI Framework for accurate, patient-friendly medical report analysis.
