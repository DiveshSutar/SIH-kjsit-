# Portia Medical Report Analysis System 🩺🤖

## Overview

This project implements a comprehensive AI-powered medical report analysis system using **Portia** - an AI agent framework designed for complex, multi-step workflows. The system takes raw medical lab reports (PDF, CSV, or text) and generates clear, patient-friendly summaries while maintaining safety and accuracy.

## 🌟 Key Features

### 🔬 Medical Analysis Capabilities
- **Lab Value Parsing**: Extracts numerical values and units from medical reports
- **Reference Range Comparison**: Compares results against standard medical ranges
- **Status Classification**: Marks values as Normal ✅, High ⬆️, or Low ⬇️
- **Patient-Friendly Explanations**: Simple, understandable explanations for abnormal results
- **Comprehensive Coverage**: Supports CBC, metabolic panels, lipid panels, vitamins, hormones, and more

### 🤖 Portia Workflow Engine
- **Multi-Agent Planning**: Step-by-step workflow with transparent execution
- **Interactive Clarifications**: Asks relevant questions when information is ambiguous
- **Error Handling**: Robust error recovery and user feedback
- **Progress Tracking**: Real-time workflow progress visualization

### 🛡️ Safety & Compliance
- **Medical Disclaimers**: Clear warnings that this is not medical advice
- **Professional Consultation**: Encourages users to consult healthcare professionals
- **Data Privacy**: Secure handling of sensitive medical information
- **Rate Limiting**: Production-ready API protection

### 📊 Output Options
- **Structured Summary**: Easy-to-read lab report analysis
- **PDF Generation**: Save reports in portable format
- **Email Delivery**: Send results via email (Google Mail integration)
- **Cloud Storage**: Store in Google Drive for easy access

## 🏗️ Architecture

### Core Components

```
src/ai/portia/
├── medical-report-agent.ts      # Main Portia agent with medical logic
├── medical-report-workflow.ts   # Workflow orchestration and planning
└── reference-ranges.ts          # Medical reference range database

src/app/api/portia/medical-report/
├── analyze/route.ts            # Initial analysis endpoint
├── clarify/route.ts           # Clarification questions handler
└── generate/route.ts          # Final output generation

src/components/portia/
└── PortiaMedicalReportsClient.tsx  # React UI component

src/app/portia-medical-reports/
└── page.tsx                   # Main Portia demo page
```

### Workflow Steps

1. **📋 Planning Phase**
   - Create workflow plan with 6 defined steps
   - Initialize tracking and progress monitoring

2. **🔍 Parse Report** 
   - Extract patient information (name, age, gender, test date)
   - Identify and parse lab values with units

3. **📊 Analyze Values**
   - Compare against medical reference ranges
   - Account for gender-specific and age-specific ranges
   - Classify each value as normal, high, or low

4. **⚠️ Identify Abnormal Values**
   - Flag values outside normal ranges
   - Prioritize by clinical significance

5. **💡 Generate Explanations**
   - Create patient-friendly explanations for abnormal values
   - Provide context for what each test measures

6. **❓ Clarification Check**
   - Ask for missing patient information (gender for gender-specific tests)
   - Confirm explanation level preference (simple vs. detailed)
   - Handle unclear or missing data

7. **📄 Final Summary Generation**
   - Compile comprehensive report
   - Include disclaimers and recommendations
   - Format for multiple output options

## 🚀 Quick Start

### 1. Start the Development Server

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The server will run on `http://localhost:9002`

### 2. Access the Portia Interface

Visit: `http://localhost:9002/portia-medical-reports`

### 3. Test with Sample Data

Use the "Load Sample Report for Demo" button to try the system with realistic medical data.

### 4. Run the Demo Script

```bash
# Run comprehensive demo
python portia-medical-demo.py
```

## 📊 Sample Medical Report Analysis

### Input Example
```
LABORATORY REPORT
Patient: John Doe, Age: 45, Male
Test Date: 2025-08-21

RESULTS:
- Hemoglobin: 13.8 g/dL
- Total Cholesterol: 235 mg/dL
- LDL Cholesterol: 155 mg/dL
- HDL Cholesterol: 38 mg/dL
- Glucose (Fasting): 110 mg/dL
- Vitamin D: 22 ng/mL
```

### Output Example
```
🩺 **Your Lab Report Summary**

**Summary:**
• Total Tests: 6
• ✅ Normal: 2
• ⬆️ High: 3
• ⬇️ Low: 1

**Detailed Results:**
✅ **Hemoglobin**: 13.8 g/dL (Normal: 13.5-17.5 g/dL)
   Your hemoglobin level is within the healthy range.

⬆️ **Total Cholesterol**: 235 mg/dL (Normal: <200 mg/dL)
   Your total cholesterol is elevated. High cholesterol may increase your risk of heart disease.

⬆️ **LDL Cholesterol**: 155 mg/dL (Normal: <100 mg/dL)
   Your LDL cholesterol is above normal range.

⬇️ **HDL Cholesterol**: 38 mg/dL (Normal: >40 mg/dL for men)
   Your HDL cholesterol is below normal range.

⬆️ **Glucose**: 110 mg/dL (Normal: 70-100 mg/dL)
   Your blood sugar is elevated. This may indicate diabetes or prediabetes.

⬇️ **Vitamin D**: 22 ng/mL (Normal: 30-100 ng/mL)
   Your vitamin D level is below normal range.

**General Recommendations:**
• Maintain a balanced diet
• Exercise regularly
• Consider consulting with a nutritionist
• Schedule follow-up testing in 3 months

🔒 **IMPORTANT DISCLAIMER:** This analysis is for educational purposes only and is not medical advice. Please consult with a qualified healthcare professional for proper diagnosis, treatment, and medical guidance.
```

## 🔧 Configuration

### Environment Variables

```bash
# Required - Google Gemini AI API Key
GOOGLE_API_KEY=your_gemini_api_key_here

# Optional - Customization
MAX_PDF_SIZE=10485760                    # 10MB default
MAX_CHUNKS_PER_DOCUMENT=500
RATE_LIMIT_REQUESTS_PER_MINUTE=10
```

### Medical Reference Ranges

The system includes comprehensive reference ranges for:

- **Complete Blood Count (CBC)**: Hemoglobin, Hematocrit, WBC, RBC, Platelets
- **Basic/Comprehensive Metabolic Panel**: Glucose, Electrolytes, Kidney function
- **Lipid Panel**: Total, LDL, HDL Cholesterol, Triglycerides
- **Vitamins & Minerals**: Vitamin D, B12, Folate, Iron
- **Thyroid Function**: TSH, T3, T4
- **Liver Function**: ALT, AST, Bilirubin

Gender-specific and age-specific ranges are automatically applied when patient information is available.

## 🧪 Testing & Development

### Run Demo Tests

```bash
# Basic functionality test
python portia-medical-demo.py

# Test with problematic values
# (automatically included in demo script)
```

### API Testing

```bash
# Test analyze endpoint
curl -X POST http://localhost:9002/api/portia/medical-report/analyze \
  -H "Content-Type: application/json" \
  -d '{"reportText": "Glucose: 95 mg/dL"}'

# Test clarification endpoint
curl -X POST http://localhost:9002/api/portia/medical-report/clarify \
  -H "Content-Type: application/json" \
  -d '{"flowId": "flow-id", "questionId": "test", "answer": "Yes"}'
```

### Web Interface Testing

1. Visit `http://localhost:9002/portia-medical-reports`
2. Click "Load Sample Report for Demo"
3. Click "Start Portia Analysis"
4. Answer clarification questions
5. Review generated analysis

## 🏥 Medical Use Cases

### ✅ Supported Scenarios
- **Routine Lab Work**: Annual physicals, health checkups
- **Preventive Screening**: Cholesterol, diabetes screening
- **Nutritional Assessment**: Vitamin and mineral levels
- **Chronic Disease Monitoring**: Diabetes, thyroid conditions
- **Pre-operative Testing**: Basic metabolic panels

### ⚠️ Important Limitations
- **Not for Emergencies**: This tool is not for urgent medical situations
- **Not Diagnostic**: Cannot diagnose diseases or conditions
- **Not Treatment Advice**: Does not provide treatment recommendations
- **Professional Consultation Required**: Always consult healthcare providers

## 🔮 Future Enhancements

### Planned Features
- **PDF Processing**: Direct PDF upload and text extraction
- **Multi-language Support**: Translations for global accessibility
- **Historical Tracking**: Track lab values over time
- **AI Insights**: Trend analysis and personalized recommendations
- **Doctor Portal**: Professional interface with detailed analysis

### Portia Workflow Extensions
- **Multi-Agent Collaboration**: Specialized agents for different test types
- **Decision Trees**: Complex logic for interpretation
- **Quality Assurance**: Double-checking of critical values
- **Continuous Learning**: Improvement based on usage patterns

## 📝 Contributing

### Development Setup

1. **Clone & Install**
   ```bash
   git clone <repository>
   cd hospital-1
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Add your Google API key
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Test Changes**
   ```bash
   python portia-medical-demo.py
   ```

### Code Structure Guidelines

- **Medical Logic**: Keep in `src/ai/portia/medical-report-agent.ts`
- **Workflow Orchestration**: Manage in `src/ai/portia/medical-report-workflow.ts`
- **API Endpoints**: Organize in `src/app/api/portia/medical-report/`
- **UI Components**: Place in `src/components/portia/`

## 📞 Support

### Getting Help
- **Demo Issues**: Run `python portia-medical-demo.py` to test core functionality
- **API Problems**: Check server logs and API endpoint responses
- **UI Bugs**: Test with browser developer tools

### Medical Disclaimer
This software is provided for educational and informational purposes only. It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of qualified healthcare providers with any questions regarding medical conditions or test results.

---

**Built with ❤️ using Portia AI Framework, Next.js, and Google Gemini**
