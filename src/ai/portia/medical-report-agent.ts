/**
 * Portia-based Medical Report Analysis Agent
 * 
 * This agent system implements a multi-step medical report analysis workflow:
 * 1. Parse and extract lab values from reports (PDF, CSV, text)
 * 2. Compare values against medical reference ranges
 * 3. Identify Normal/High/Low values
 * 4. Generate patient-friendly explanations
 * 5. Provide structured output with disclaimers
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Groq from 'groq-sdk';

// Initialize AI clients
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Medical reference ranges database
export const MEDICAL_REFERENCE_RANGES = {
  // Complete Blood Count (CBC)
  hemoglobin: {
    male: { min: 13.5, max: 17.5, unit: 'g/dL' },
    female: { min: 12.0, max: 15.5, unit: 'g/dL' }
  },
  hematocrit: {
    male: { min: 41, max: 50, unit: '%' },
    female: { min: 36, max: 44, unit: '%' }
  },
  whiteBloodCells: { min: 4.5, max: 11.0, unit: '×10³/μL' },
  redBloodCells: {
    male: { min: 4.7, max: 6.1, unit: '×10⁶/μL' },
    female: { min: 4.2, max: 5.4, unit: '×10⁶/μL' }
  },
  platelets: { min: 150, max: 450, unit: '×10³/μL' },
  
  // Lipid Panel
  totalCholesterol: { min: 0, max: 200, unit: 'mg/dL' },
  ldlCholesterol: { min: 0, max: 100, unit: 'mg/dL' },
  hdlCholesterol: {
    male: { min: 40, max: 999, unit: 'mg/dL' },
    female: { min: 50, max: 999, unit: 'mg/dL' }
  },
  triglycerides: { min: 0, max: 150, unit: 'mg/dL' },
  
  // Basic Metabolic Panel
  glucose: { min: 70, max: 100, unit: 'mg/dL' },
  sodium: { min: 136, max: 145, unit: 'mEq/L' },
  potassium: { min: 3.5, max: 5.0, unit: 'mEq/L' },
  chloride: { min: 98, max: 107, unit: 'mEq/L' },
  bun: { min: 7, max: 20, unit: 'mg/dL' },
  creatinine: {
    male: { min: 0.7, max: 1.3, unit: 'mg/dL' },
    female: { min: 0.6, max: 1.1, unit: 'mg/dL' }
  },
  
  // Vitamins and Minerals
  vitaminD: { min: 30, max: 100, unit: 'ng/mL' },
  vitaminB12: { min: 300, max: 900, unit: 'pg/mL' },
  folate: { min: 3, max: 17, unit: 'ng/mL' },
  iron: {
    male: { min: 65, max: 176, unit: 'μg/dL' },
    female: { min: 50, max: 170, unit: 'μg/dL' }
  },
  
  // Thyroid Function
  tsh: { min: 0.4, max: 4.0, unit: 'mIU/L' },
  t3: { min: 80, max: 200, unit: 'ng/dL' },
  t4: { min: 5.0, max: 12.0, unit: 'μg/dL' },
  
  // Liver Function
  alt: {
    male: { min: 7, max: 56, unit: 'U/L' },
    female: { min: 7, max: 40, unit: 'U/L' }
  },
  ast: { min: 10, max: 40, unit: 'U/L' },
  bilirubin: { min: 0.3, max: 1.2, unit: 'mg/dL' }
};

export interface LabValue {
  name: string;
  value: number;
  unit: string;
  referenceRange?: {
    min: number;
    max: number;
    unit: string;
  };
  status: 'normal' | 'high' | 'low' | 'unknown';
  explanation?: string;
}

export interface PatientInfo {
  name?: string;
  age?: number;
  gender?: 'male' | 'female';
  testDate?: string;
}

export interface MedicalReportAnalysis {
  patientInfo: PatientInfo;
  labValues: LabValue[];
  summary: {
    totalTests: number;
    normalCount: number;
    highCount: number;
    lowCount: number;
    unknownCount: number;
  };
  recommendations: string[];
  disclaimer: string;
  processingSteps: string[];
}

export class PortiaMedicalReportAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private openai: OpenAI;
  private groq: Groq;
  private useGroq: boolean;
  private useOpenAI: boolean;

  constructor(apiKey?: string, openaiKey?: string, groqKey?: string) {
    // Initialize Google AI (fallback)
    this.genAI = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Initialize OpenAI (secondary)
    this.openai = new OpenAI({
      apiKey: openaiKey || process.env.OPENAI_API_KEY || '',
    });
    
    // Initialize Groq (primary for medical analysis)
    this.groq = new Groq({
      apiKey: groqKey || process.env.GROQ_API_KEY || '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',
    });
    
    // Use Groq as primary, fallback to OpenAI, then Google
    this.useGroq = !!(groqKey || process.env.GROQ_API_KEY || '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');
    this.useOpenAI = !!(openaiKey || process.env.OPENAI_API_KEY);
  }

  /**
   * Step 1: Parse raw medical report and extract structured data
   */
  async parseReportData(reportText: string): Promise<{
    patientInfo: PatientInfo;
    extractedValues: Array<{ name: string; value: string; unit: string }>;
    processingSteps: string[];
  }> {
    const processingSteps = ['Starting report parsing...'];
    
    const parsePrompt = `
    Extract lab values and patient information from this medical report:

    ${reportText}

    Return a JSON object with this exact structure:
    {
      "patientInfo": {
        "name": "patient name if found",
        "age": number_if_found,
        "gender": "male" or "female" if determinable,
        "testDate": "date if found"
      },
      "labValues": [
        {
          "name": "standardized_test_name",
          "value": "numeric_value",
          "unit": "unit_of_measurement"
        }
      ]
    }

    Standardize test names (e.g., "Hgb" -> "hemoglobin", "Chol" -> "totalCholesterol").
    Extract only numeric values and their units.
    `;

    try {
      processingSteps.push('Sending report to AI for parsing...');
      
      let response: string;
      
      if (this.useGroq) {
        processingSteps.push('Using Groq for medical analysis...');
        const completion = await this.groq.chat.completions.create({
          model: "mixtral-8x7b-32768",
          messages: [
            {
              role: "system",
              content: "You are a medical report analysis expert. Extract lab values and patient information from medical reports and return only valid JSON."
            },
            {
              role: "user",
              content: parsePrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });
        
        response = completion.choices[0]?.message?.content || '';
      } else if (this.useOpenAI) {
        processingSteps.push('Using OpenAI GPT-4 for analysis...');
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a medical report analysis expert. Extract lab values and patient information from medical reports and return only valid JSON."
            },
            {
              role: "user",
              content: parsePrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
        });
        
        response = completion.choices[0]?.message?.content || '';
      } else {
        processingSteps.push('Using Google Gemini for analysis...');
        const result = await this.model.generateContent(parsePrompt);
        response = result.response.text();
      }
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from AI response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      processingSteps.push(`Extracted ${parsedData.labValues?.length || 0} lab values`);
      
      return {
        patientInfo: parsedData.patientInfo || {},
        extractedValues: parsedData.labValues || [],
        processingSteps
      };
    } catch (error) {
      processingSteps.push(`Error during parsing: ${error}`);
      throw new Error(`Failed to parse report: ${error}`);
    }
  }

  /**
   * Step 2: Compare values against reference ranges and categorize
   */
  analyzeLabValues(
    extractedValues: Array<{ name: string; value: string; unit: string }>,
    patientGender: 'male' | 'female' = 'male'
  ): LabValue[] {
    return extractedValues.map(extracted => {
      const numericValue = parseFloat(extracted.value);
      if (isNaN(numericValue)) {
        return {
          name: extracted.name,
          value: numericValue,
          unit: extracted.unit,
          status: 'unknown' as const,
          explanation: 'Could not parse numeric value'
        };
      }

      // Find reference range
      const refKey = this.findReferenceKey(extracted.name);
      let referenceRange = null;
      let status: 'normal' | 'high' | 'low' | 'unknown' = 'unknown';

      if (refKey && (MEDICAL_REFERENCE_RANGES as any)[refKey]) {
        const range = (MEDICAL_REFERENCE_RANGES as any)[refKey];
        
        // Handle gender-specific ranges
        if ('male' in range && 'female' in range) {
          referenceRange = range[patientGender];
        } else if ('min' in range && 'max' in range) {
          referenceRange = range;
        }

        if (referenceRange) {
          if (numericValue < referenceRange.min) {
            status = 'low';
          } else if (numericValue > referenceRange.max) {
            status = 'high';
          } else {
            status = 'normal';
          }
        }
      }

      return {
        name: extracted.name,
        value: numericValue,
        unit: extracted.unit,
        referenceRange,
        status,
        explanation: this.generateExplanation(extracted.name, status, numericValue)
      };
    });
  }

  /**
   * Step 3: Generate patient-friendly explanations
   */
  private generateExplanation(testName: string, status: string, value: number): string {
    const explanations = {
      hemoglobin: {
        low: 'Your hemoglobin is below normal range. This may indicate anemia, which means your blood may not be carrying enough oxygen to your body.',
        high: 'Your hemoglobin is above normal range. This could be due to dehydration, smoking, or living at high altitude.',
        normal: 'Your hemoglobin level is within the healthy range, indicating good oxygen-carrying capacity.'
      },
      totalCholesterol: {
        low: 'Your total cholesterol is low, which is generally good for heart health.',
        high: 'Your total cholesterol is elevated. High cholesterol may increase your risk of heart disease.',
        normal: 'Your total cholesterol is within a healthy range.'
      },
      glucose: {
        low: 'Your blood sugar is below normal. This could indicate hypoglycemia - please consult your doctor.',
        high: 'Your blood sugar is elevated. This may indicate diabetes or prediabetes.',
        normal: 'Your blood sugar level is within the normal range.'
      },
      // Add more explanations as needed
    };

    const testExplanations = explanations[testName as keyof typeof explanations];
    if (testExplanations && testExplanations[status as keyof typeof testExplanations]) {
      return testExplanations[status as keyof typeof testExplanations];
    }

    // Generic explanations
    switch (status) {
      case 'low':
        return `Your ${testName} level (${value}) is below the normal range.`;
      case 'high':
        return `Your ${testName} level (${value}) is above the normal range.`;
      case 'normal':
        return `Your ${testName} level (${value}) is within the normal range.`;
      default:
        return `Your ${testName} level is ${value}. Reference range not available for comparison.`;
    }
  }

  /**
   * Helper: Find reference range key for test name
   */
  private findReferenceKey(testName: string): string | null {
    const normalizedName = testName.toLowerCase().replace(/[^a-z]/g, '');
    
    const mappings = {
      'hemoglobin': 'hemoglobin',
      'hgb': 'hemoglobin',
      'hematocrit': 'hematocrit',
      'hct': 'hematocrit',
      'wbc': 'whiteBloodCells',
      'whitebloodcells': 'whiteBloodCells',
      'rbc': 'redBloodCells',
      'redbloodcells': 'redBloodCells',
      'platelets': 'platelets',
      'plt': 'platelets',
      'totalcholesterol': 'totalCholesterol',
      'cholesterol': 'totalCholesterol',
      'ldl': 'ldlCholesterol',
      'ldlcholesterol': 'ldlCholesterol',
      'hdl': 'hdlCholesterol',
      'hdlcholesterol': 'hdlCholesterol',
      'triglycerides': 'triglycerides',
      'glucose': 'glucose',
      'sugar': 'glucose',
      'bloodsugar': 'glucose',
      'sodium': 'sodium',
      'potassium': 'potassium',
      'chloride': 'chloride',
      'bun': 'bun',
      'creatinine': 'creatinine',
      'vitamind': 'vitaminD',
      'vitaminb12': 'vitaminB12',
      'b12': 'vitaminB12',
      'folate': 'folate',
      'iron': 'iron',
      'tsh': 'tsh',
      't3': 't3',
      't4': 't4',
      'alt': 'alt',
      'ast': 'ast',
      'bilirubin': 'bilirubin'
    };

    return (mappings as any)[normalizedName] || null;
  }

  /**
   * Step 4: Ask clarifying questions if needed
   */
  async askClarifyingQuestions(
    analysis: Partial<MedicalReportAnalysis>
  ): Promise<string[]> {
    const questions: string[] = [];

    // Check if patient gender is missing for gender-specific tests
    if (!analysis.patientInfo?.gender) {
      const hasGenderSpecificTests = analysis.labValues?.some(lab => {
        const refKey = this.findReferenceKey(lab.name);
        if (refKey && (MEDICAL_REFERENCE_RANGES as any)[refKey]) {
          const range = (MEDICAL_REFERENCE_RANGES as any)[refKey];
          return 'male' in range && 'female' in range;
        }
        return false;
      });

      if (hasGenderSpecificTests) {
        questions.push("I notice some tests have different reference ranges for males and females. Could you please specify the patient's gender for more accurate analysis?");
      }
    }

    // Check for missing or unclear values
    const unknownValues = analysis.labValues?.filter(lab => lab.status === 'unknown').length || 0;
    if (unknownValues > 0) {
      questions.push(`I found ${unknownValues} test results that I couldn't analyze due to unclear values or missing reference ranges. Would you like me to proceed with the available data?`);
    }

    // Ask about explanation preference
    questions.push("Would you like the results explained in simple terms or with more detailed medical information?");

    return questions;
  }

  /**
   * Step 5: Generate final comprehensive analysis
   */
  async generateFinalAnalysis(
    patientInfo: PatientInfo,
    labValues: LabValue[],
    processingSteps: string[],
    explanationLevel: 'simple' | 'detailed' = 'simple'
  ): Promise<MedicalReportAnalysis> {
    const summary = {
      totalTests: labValues.length,
      normalCount: labValues.filter(l => l.status === 'normal').length,
      highCount: labValues.filter(l => l.status === 'high').length,
      lowCount: labValues.filter(l => l.status === 'low').length,
      unknownCount: labValues.filter(l => l.status === 'unknown').length
    };

    // Generate recommendations using AI
    const recommendationsPrompt = `
    Based on these lab results, provide 3-5 general health recommendations:
    
    Summary: ${summary.normalCount} normal, ${summary.highCount} high, ${summary.lowCount} low values
    Abnormal values: ${labValues.filter(l => l.status !== 'normal').map(l => `${l.name}: ${l.value} ${l.unit} (${l.status})`).join(', ')}
    
    Provide general wellness recommendations (not medical advice) in a bulleted list.
    `;

    let recommendations: string[] = [];
    try {
      let response: string;
      
      if (this.useGroq) {
        const completion = await this.groq.chat.completions.create({
          model: "mixtral-8x7b-32768",
          messages: [
            {
              role: "system",
              content: "You are a health wellness expert. Provide general health recommendations based on lab results. Do not provide medical advice."
            },
            {
              role: "user",
              content: recommendationsPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        });
        
        response = completion.choices[0]?.message?.content || '';
      } else if (this.useOpenAI) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are a health wellness expert. Provide general health recommendations based on lab results. Do not provide medical advice."
            },
            {
              role: "user",
              content: recommendationsPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        });
        
        response = completion.choices[0]?.message?.content || '';
      } else {
        const result = await this.model.generateContent(recommendationsPrompt);
        response = result.response.text();
      }
      
      recommendations = response.split('\n').filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-')).map((line: string) => line.trim().replace(/^[•-]\s*/, ''));
    } catch (error) {
      recommendations = ['Maintain a balanced diet', 'Exercise regularly', 'Stay hydrated', 'Get adequate sleep'];
    }

    const disclaimer = "🔒 IMPORTANT DISCLAIMER: This analysis is for educational purposes only and is not medical advice. Please consult with a qualified healthcare professional for proper diagnosis, treatment, and medical guidance. Do not make any medical decisions based solely on this analysis.";

    return {
      patientInfo,
      labValues,
      summary,
      recommendations,
      disclaimer,
      processingSteps: [...processingSteps, 'Final analysis completed']
    };
  }

  /**
   * Main workflow: Complete medical report analysis
   */
  async analyzeReport(
    reportText: string,
    patientGender?: 'male' | 'female',
    explanationLevel: 'simple' | 'detailed' = 'simple'
  ): Promise<MedicalReportAnalysis> {
    // Step 1: Parse report
    const { patientInfo, extractedValues, processingSteps } = await this.parseReportData(reportText);
    
    // Use provided gender or detected gender
    const gender = patientGender || patientInfo.gender || 'male';
    patientInfo.gender = gender;

    // Step 2: Analyze lab values
    const labValues = this.analyzeLabValues(extractedValues, gender);

    // Step 3: Generate final analysis
    const analysis = await this.generateFinalAnalysis(
      patientInfo,
      labValues,
      processingSteps,
      explanationLevel
    );

    return analysis;
  }
}

/**
 * Utility function to format analysis for display
 */
export function formatAnalysisForDisplay(analysis: MedicalReportAnalysis): string {
  const { patientInfo, labValues, summary, recommendations, disclaimer } = analysis;

  let output = "🩺 **Your Lab Report Summary**\n\n";

  // Patient info
  if (patientInfo.name || patientInfo.age || patientInfo.testDate) {
    output += "**Patient Information:**\n";
    if (patientInfo.name) output += `• Name: ${patientInfo.name}\n`;
    if (patientInfo.age) output += `• Age: ${patientInfo.age}\n`;
    if (patientInfo.gender) output += `• Gender: ${patientInfo.gender}\n`;
    if (patientInfo.testDate) output += `• Test Date: ${patientInfo.testDate}\n`;
    output += "\n";
  }

  // Summary statistics
  output += "**Summary:**\n";
  output += `• Total Tests: ${summary.totalTests}\n`;
  output += `• ✅ Normal: ${summary.normalCount}\n`;
  output += `• ⬆️ High: ${summary.highCount}\n`;
  output += `• ⬇️ Low: ${summary.lowCount}\n`;
  if (summary.unknownCount > 0) {
    output += `• ❓ Unknown: ${summary.unknownCount}\n`;
  }
  output += "\n";

  // Detailed results
  output += "**Detailed Results:**\n";
  labValues.forEach(lab => {
    const statusIcon = {
      normal: '✅',
      high: '⬆️',
      low: '⬇️',
      unknown: '❓'
    }[lab.status];

    const rangeInfo = lab.referenceRange 
      ? ` (Normal: ${lab.referenceRange.min}-${lab.referenceRange.max} ${lab.referenceRange.unit})`
      : '';

    output += `${statusIcon} **${lab.name}**: ${lab.value} ${lab.unit}${rangeInfo}\n`;
    if (lab.explanation) {
      output += `   ${lab.explanation}\n`;
    }
    output += "\n";
  });

  // Recommendations
  if (recommendations.length > 0) {
    output += "**General Recommendations:**\n";
    recommendations.forEach(rec => {
      output += `• ${rec}\n`;
    });
    output += "\n";
  }

  // Disclaimer
  output += disclaimer;

  return output;
}
