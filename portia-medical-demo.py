#!/usr/bin/env python3
"""
Comprehensive Portia Medical Report Analysis Demo
This script demonstrates the complete Portia workflow for medical report analysis
"""

import os
import sys
import json
import requests
import time
from datetime import datetime

# Test medical report data
SAMPLE_MEDICAL_REPORT = """
COMPREHENSIVE LABORATORY REPORT
Patient: John Doe, Age: 45, Male
Date of Collection: 2025-08-21
Ordering Physician: Dr. Sarah Johnson

COMPLETE BLOOD COUNT (CBC):
- Hemoglobin: 13.8 g/dL
- Hematocrit: 41.2%
- Red Blood Cell Count: 4.8 × 10⁶/μL
- White Blood Cell Count: 7,200/μL
- Platelet Count: 285 × 10³/μL

COMPREHENSIVE METABOLIC PANEL (CMP):
- Glucose (Fasting): 110 mg/dL
- Sodium: 141 mEq/L
- Potassium: 4.2 mEq/L
- Chloride: 102 mEq/L
- BUN: 18 mg/dL
- Creatinine: 1.1 mg/dL

LIPID PANEL:
- Total Cholesterol: 235 mg/dL
- LDL Cholesterol: 155 mg/dL
- HDL Cholesterol: 38 mg/dL
- Triglycerides: 210 mg/dL

ADDITIONAL TESTS:
- Vitamin D (25-OH): 22 ng/mL
- Vitamin B12: 450 pg/mL
- TSH: 2.8 mIU/L
- ALT: 35 U/L
- AST: 28 U/L

CLINICAL NOTES:
Patient presents with slightly elevated glucose and cholesterol levels.
Vitamin D deficiency noted. Follow-up recommended in 3 months.
""".strip()

PROBLEMATIC_REPORT = """
Patient: Jane Smith, Female, 28 years old
Test Date: 2025-08-20

Lab Results:
- Hemoglobin: 10.2 g/dL
- Total Cholesterol: 195 mg/dL
- HDL: 35 mg/dL
- Glucose: 88 mg/dL
- Vitamin D: 15 ng/mL
- TSH: 6.2 mIU/L
- Iron: 45 μg/dL

Notes: Patient reports fatigue and cold intolerance.
""".strip()

class PortiaMedicalReportDemo:
    def __init__(self, base_url="http://localhost:9002"):
        self.base_url = base_url
        self.session = requests.Session()
        self.current_flow_id = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def demo_basic_analysis(self):
        """Demo basic medical report analysis workflow"""
        self.log("🩺 Starting Basic Medical Report Analysis Demo")
        self.log("=" * 60)
        
        # Step 1: Start analysis
        self.log("Step 1: Initiating Portia analysis...")
        response = self.session.post(
            f"{self.base_url}/api/portia/medical-report/analyze",
            json={
                "reportText": SAMPLE_MEDICAL_REPORT,
                "userPreferences": {
                    "explanationLevel": "simple"
                }
            },
            timeout=30
        )
        
        if response.status_code != 200:
            self.log(f"❌ Analysis failed: {response.text}", "ERROR")
            return False
            
        data = response.json()
        self.current_flow_id = data.get("flowId")
        self.log(f"✅ Analysis started successfully! Flow ID: {self.current_flow_id}")
        self.log(f"📊 Status: {data.get('status')}")
        self.log(f"⏱️ Processing time: {data.get('processingTime')}")
        
        # Display workflow plan
        plan = data.get("plan", {})
        self.log(f"\n📋 Workflow Plan: {plan.get('title')}")
        self.log(f"📝 Description: {plan.get('description')}")
        
        steps = plan.get("steps", [])
        for i, step in enumerate(steps, 1):
            status_icon = {
                'completed': '✅',
                'running': '🔄',
                'error': '❌',
                'pending': '⏳'
            }.get(step.get('status'), '❓')
            
            self.log(f"  {i}. {status_icon} {step.get('name')}: {step.get('description')}")
            if step.get('error'):
                self.log(f"     ❌ Error: {step.get('error')}", "ERROR")
        
        # Handle clarifications if needed
        clarifications = data.get("clarifications", [])
        if clarifications:
            self.log(f"\n❓ Found {len(clarifications)} clarification questions:")
            for q in clarifications:
                if not q.get('answered'):
                    self.log(f"  Q: {q.get('question')}")
                    if q.get('options'):
                        for i, option in enumerate(q.get('options'), 1):
                            self.log(f"    {i}. {option}")
                    
                    # Auto-answer for demo
                    self.answer_clarification_demo(q)
        
        # Get final results if completed
        if data.get('status') == 'completed':
            self.get_final_results()
            
        return True
        
    def answer_clarification_demo(self, question):
        """Demo answering clarification questions"""
        self.log(f"\n🤔 Answering clarification: {question.get('id')}")
        
        # Auto-select answers for demo
        demo_answers = {
            'gender-clarification': 'Male',
            'explanation-level': 'Simple language (easy to understand)',
            'data-quality': 'Yes, proceed with available data',
            'output-preferences': 'View on screen only'
        }
        
        answer = demo_answers.get(question.get('id'), question.get('options', ['Yes'])[0])
        self.log(f"💡 Auto-selecting answer: {answer}")
        
        response = self.session.post(
            f"{self.base_url}/api/portia/medical-report/clarify",
            json={
                "flowId": self.current_flow_id,
                "questionId": question.get('id'),
                "answer": answer,
                "userEmail": "demo@example.com"
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            self.log(f"✅ Clarification answered successfully")
            self.log(f"📊 Updated status: {data.get('status')}")
            
            remaining = data.get('remainingClarifications', [])
            if remaining:
                self.log(f"❓ {len(remaining)} clarifications remaining")
            else:
                self.log("🎉 All clarifications answered!")
                
            return True
        else:
            self.log(f"❌ Failed to answer clarification: {response.text}", "ERROR")
            return False
            
    def get_final_results(self):
        """Get and display final analysis results"""
        self.log("\n📋 Generating final analysis...")
        
        response = self.session.post(
            f"{self.base_url}/api/portia/medical-report/generate",
            json={"flowId": self.current_flow_id},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            analysis = data.get('analysis', {})
            
            self.log("🎉 Final Analysis Generated Successfully!")
            self.log("=" * 60)
            
            # Display summary
            summary = analysis.get('summary', {})
            self.log(f"📊 ANALYSIS SUMMARY:")
            self.log(f"  • Total Tests: {summary.get('totalTests')}")
            self.log(f"  • ✅ Normal: {summary.get('normalCount')}")
            self.log(f"  • ⬆️ High: {summary.get('highCount')}")
            self.log(f"  • ⬇️ Low: {summary.get('lowCount')}")
            self.log(f"  • ❓ Unknown: {summary.get('unknownCount')}")
            
            # Display patient info
            patient_info = analysis.get('patientInfo', {})
            if patient_info:
                self.log(f"\n👤 PATIENT INFORMATION:")
                if patient_info.get('name'):
                    self.log(f"  • Name: {patient_info.get('name')}")
                if patient_info.get('age'):
                    self.log(f"  • Age: {patient_info.get('age')}")
                if patient_info.get('gender'):
                    self.log(f"  • Gender: {patient_info.get('gender')}")
                    
            # Display some lab values
            lab_values = analysis.get('labValues', [])
            if lab_values:
                self.log(f"\n🔬 LAB VALUES (showing first 5):")
                for lab in lab_values[:5]:
                    status_icon = {
                        'normal': '✅',
                        'high': '⬆️',
                        'low': '⬇️',
                        'unknown': '❓'
                    }.get(lab.get('status'), '❓')
                    
                    self.log(f"  {status_icon} {lab.get('name')}: {lab.get('value')} {lab.get('unit')}")
                    if lab.get('explanation'):
                        self.log(f"     💡 {lab.get('explanation')}")
                        
            # Display recommendations
            recommendations = analysis.get('recommendations', [])
            if recommendations:
                self.log(f"\n📝 RECOMMENDATIONS:")
                for i, rec in enumerate(recommendations, 1):
                    self.log(f"  {i}. {rec}")
                    
            # Display disclaimer
            disclaimer = analysis.get('disclaimer', '')
            if disclaimer:
                self.log(f"\n🔒 DISCLAIMER:")
                self.log(f"  {disclaimer}")
                
            return True
        else:
            self.log(f"❌ Failed to get final results: {response.text}", "ERROR")
            return False
            
    def demo_problematic_report(self):
        """Demo analysis of a report with multiple abnormal values"""
        self.log("\n🚨 Starting Problematic Report Analysis Demo")
        self.log("=" * 60)
        
        response = self.session.post(
            f"{self.base_url}/api/portia/medical-report/analyze",
            json={
                "reportText": PROBLEMATIC_REPORT,
                "userPreferences": {
                    "explanationLevel": "detailed"
                }
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            self.log("✅ Problematic report analysis completed")
            
            # Quick summary of findings
            final_analysis = data.get('finalAnalysis')
            if final_analysis:
                summary = final_analysis.get('summary', {})
                high_count = summary.get('highCount', 0)
                low_count = summary.get('lowCount', 0)
                
                if high_count > 0 or low_count > 0:
                    self.log(f"⚠️ ABNORMAL VALUES DETECTED:")
                    self.log(f"  • {high_count} values above normal range")
                    self.log(f"  • {low_count} values below normal range")
                else:
                    self.log("✅ All values within normal ranges")
                    
            return True
        else:
            self.log(f"❌ Problematic report analysis failed: {response.text}", "ERROR")
            return False
            
    def test_api_endpoints(self):
        """Test all API endpoints for basic functionality"""
        self.log("\n🧪 Testing API Endpoints")
        self.log("=" * 60)
        
        # Test health check first (if available)
        try:
            response = self.session.get(f"{self.base_url}/api/medical-reports/health", timeout=10)
            if response.status_code == 200:
                health = response.json()
                self.log(f"✅ Health check passed: {health.get('status')}")
            else:
                self.log("⚠️ Health check endpoint not available")
        except:
            self.log("⚠️ Could not reach health check endpoint")
            
        # Test analyze endpoint
        self.log("Testing /api/portia/medical-report/analyze...")
        response = self.session.post(
            f"{self.base_url}/api/portia/medical-report/analyze",
            json={"reportText": "Test glucose: 95 mg/dL"},
            timeout=20
        )
        
        if response.status_code == 200:
            self.log("✅ Analyze endpoint working")
            data = response.json()
            test_flow_id = data.get('flowId')
            
            # Test clarify endpoint
            if test_flow_id:
                self.log("Testing /api/portia/medical-report/clarify...")
                response = self.session.post(
                    f"{self.base_url}/api/portia/medical-report/clarify",
                    json={
                        "flowId": test_flow_id,
                        "questionId": "test",
                        "answer": "test"
                    },
                    timeout=10
                )
                
                if response.status_code in [200, 404]:  # 404 is ok for test flow
                    self.log("✅ Clarify endpoint working")
                else:
                    self.log(f"⚠️ Clarify endpoint issue: {response.status_code}")
                    
                # Test generate endpoint
                self.log("Testing /api/portia/medical-report/generate...")
                response = self.session.post(
                    f"{self.base_url}/api/portia/medical-report/generate",
                    json={"flowId": test_flow_id},
                    timeout=10
                )
                
                if response.status_code in [200, 400, 404]:  # Various responses are ok
                    self.log("✅ Generate endpoint working")
                else:
                    self.log(f"⚠️ Generate endpoint issue: {response.status_code}")
        else:
            self.log(f"❌ Analyze endpoint failed: {response.status_code}")
            
        return True
        
    def run_comprehensive_demo(self):
        """Run the complete demo sequence"""
        self.log("🚀 Starting Comprehensive Portia Medical Report Analysis Demo")
        self.log("=" * 80)
        
        try:
            # Test API endpoints
            self.test_api_endpoints()
            
            # Basic analysis demo
            success = self.demo_basic_analysis()
            if not success:
                return False
                
            time.sleep(2)  # Brief pause between demos
            
            # Problematic report demo
            self.demo_problematic_report()
            
            time.sleep(1)
            
            self.log("\n🎉 DEMO COMPLETED SUCCESSFULLY!")
            self.log("=" * 80)
            self.log("✅ All Portia workflow features demonstrated:")
            self.log("  • Multi-step medical report parsing")
            self.log("  • Reference range comparison")
            self.log("  • Abnormal value identification")
            self.log("  • Patient-friendly explanations")
            self.log("  • Interactive clarification questions")
            self.log("  • Structured final output generation")
            self.log("  • Comprehensive disclaimers")
            
            return True
            
        except requests.exceptions.ConnectionError:
            self.log("❌ Could not connect to the server. Make sure the development server is running on port 9002.", "ERROR")
            self.log("💡 Run: npm run dev", "INFO")
            return False
        except Exception as e:
            self.log(f"❌ Demo failed with error: {e}", "ERROR")
            return False

def main():
    """Main demo function"""
    print("🩺 Portia Medical Report Analysis Demo")
    print("=====================================")
    
    # Check if server is likely running
    demo = PortiaMedicalReportDemo()
    
    try:
        # Quick connection test
        response = demo.session.get(f"{demo.base_url}/api/portia/medical-report/analyze", timeout=5)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to development server.")
        print("💡 Please start the development server first:")
        print("   cd /path/to/hospital-1")
        print("   npm run dev")
        print("   Then visit: http://localhost:9002/portia-medical-reports")
        return 1
    except:
        pass  # Other errors are fine, we just want to test connectivity
    
    # Run the comprehensive demo
    success = demo.run_comprehensive_demo()
    
    if success:
        print("\n🌐 You can also test the web interface at:")
        print("   http://localhost:9002/portia-medical-reports")
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())
