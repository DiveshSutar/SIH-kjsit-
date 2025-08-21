/**
 * Portia Medical Insurance Approval Agent
 * 
 * This agent system implements a multi-step insurance approval workflow:
 * 1. Parse medical documentation and insurance request
 * 2. Analyze medical necessity and coverage criteria
 * 3. Check against insurance policy guidelines
 * 4. Generate approval/denial recommendation with reasoning
 * 5. Provide required documentation checklist
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

// Insurance coverage criteria database
export const INSURANCE_COVERAGE_CRITERIA = {
  // Diagnostic Procedures
  mri: {
    name: 'MRI Scan',
    requiresPriorAuth: true,
    criteria: [
      'Failed conservative treatment for 6+ weeks',
      'Clear clinical indication from physician',
      'Symptoms consistent with need for imaging'
    ],
    excludions: ['Routine screening', 'Patient preference only']
  },
  ct: {
    name: 'CT Scan',
    requiresPriorAuth: true,
    criteria: [
      'Emergency medical situation',
      'Cancer staging or monitoring',
      'Failed less invasive imaging'
    ],
    excludions: ['Routine screening without symptoms']
  },
  
  // Medications
  specialtyDrugs: {
    name: 'Specialty Medications',
    requiresPriorAuth: true,
    criteria: [
      'Failed standard treatments',
      'Diagnosis matches FDA-approved indications',
      'Prescribing physician is specialist'
    ],
    excludions: ['Off-label use without justification']
  },
  
  // Procedures
  surgery: {
    name: 'Surgical Procedures',
    requiresPriorAuth: true,
    criteria: [
      'Conservative treatment failure',
      'Clear medical necessity',
      'Surgeon board certification'
    ],
    excludions: ['Cosmetic procedures', 'Experimental treatments']
  },
  
  // Therapy Services
  physicalTherapy: {
    name: 'Physical Therapy',
    requiresPriorAuth: false,
    criteria: [
      'Physician referral',
      'Functional improvement potential',
      'Specific treatment goals'
    ],
    excludions: ['Maintenance therapy only']
  }
};

export interface InsuranceRequest {
  patientInfo: {
    name: string;
    memberId: string;
    dob: string;
    policyNumber: string;
  };
  requestType: 'procedure' | 'medication' | 'diagnostic' | 'therapy';
  serviceRequested: string;
  diagnosis: string;
  physicianInfo: {
    name: string;
    npi: string;
    specialty: string;
  };
  clinicalJustification: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  estimatedCost?: number;
}

export interface ApprovalDecision {
  decision: 'approved' | 'denied' | 'pending_info';
  confidence: number;
  reasoning: string[];
  requiredDocuments: string[];
  conditions?: string[];
  appealRights?: string;
  validityPeriod?: string;
}

export interface InsuranceApprovalAnalysis {
  requestInfo: InsuranceRequest;
  coverageAnalysis: {
    isCovered: boolean;
    requiresPriorAuth: boolean;
    meetsCriteria: boolean;
    missingCriteria: string[];
  };
  decision: ApprovalDecision;
  processingSteps: string[];
  reviewNotes: string[];
}

export class PortiaInsuranceApprovalAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Step 1: Parse insurance request and extract structured data
   */
  private createFallbackRequest(requestText: string): any {
    return {
      patientInformation: {
        name: 'Patient',
        age: 'Not specified',
        medicalRecordNumber: 'Not provided',
        diagnosis: 'See request details'
      },
      serviceRequested: 'Medical Service',
      clinicalJustification: requestText.substring(0, 200) + '...',
      requestDetails: requestText,
      priorAuthorization: 'Required',
      dateOfService: new Date().toISOString().split('T')[0]
    };
  }

  async parseInsuranceRequest(requestText: string): Promise<{
    requestInfo: InsuranceRequest;
    processingSteps: string[];
  }> {
    const processingSteps = ['Starting insurance request parsing...'];
    
    const parsePrompt = `
    Extract insurance approval request information from this text:

    ${requestText}

    Return a JSON object with this exact structure:
    {
      "patientInfo": {
        "name": "patient name",
        "memberId": "member ID if found",
        "dob": "date of birth if found",
        "policyNumber": "policy number if found"
      },
      "requestType": "procedure|medication|diagnostic|therapy",
      "serviceRequested": "specific service/treatment requested",
      "diagnosis": "medical diagnosis or condition",
      "physicianInfo": {
        "name": "doctor name",
        "npi": "NPI number if found",
        "specialty": "medical specialty"
      },
      "clinicalJustification": "medical justification provided",
      "urgency": "routine|urgent|emergency",
      "estimatedCost": number_if_provided
    }

    Extract all available information and use null for missing fields.
    `;

    try {
      processingSteps.push('Sending request to Gemini for parsing...');
      
      // Validate model is initialized
      if (!this.model) {
        throw new Error('Gemini model not initialized');
      }
      
      const result = await this.model.generateContent(parsePrompt);
      const response = result.response.text();
      
      processingSteps.push('Received response from Gemini...');
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        processingSteps.push('No JSON found in response, using fallback parsing');
        // Fallback: create basic structure from text analysis
        return {
          requestInfo: this.createFallbackRequest(requestText),
          processingSteps
        };
      }

      let parsedData;
      try {
        parsedData = JSON.parse(jsonMatch[0]);
        processingSteps.push(`Successfully parsed JSON response`);
      } catch (parseError) {
        processingSteps.push(`JSON parsing failed: ${parseError}, using fallback`);
        return {
          requestInfo: this.createFallbackRequest(requestText),
          processingSteps
        };
      }

      // Validate required fields
      if (!parsedData.serviceRequested) {
        parsedData.serviceRequested = 'Service not specified';
      }
      
      processingSteps.push(`Extracted insurance request for ${parsedData.serviceRequested}`);
      
      return {
        requestInfo: parsedData,
        processingSteps
      };
    } catch (error) {
      processingSteps.push(`Error during parsing: ${error}`);
      
      // Instead of throwing, return fallback data
      return {
        requestInfo: this.createFallbackRequest(requestText),
        processingSteps
      };
    }
  }

  /**
   * Step 2: Analyze coverage and criteria matching
   */
  analyzeCoverage(request: InsuranceRequest): {
    isCovered: boolean;
    requiresPriorAuth: boolean;
    meetsCriteria: boolean;
    missingCriteria: string[];
  } {
    const serviceKey = this.mapServiceToCriteria(request.serviceRequested);
    const criteria = INSURANCE_COVERAGE_CRITERIA[serviceKey as keyof typeof INSURANCE_COVERAGE_CRITERIA];
    
    if (!criteria) {
      return {
        isCovered: false,
        requiresPriorAuth: true,
        meetsCriteria: false,
        missingCriteria: ['Service not in coverage database']
      };
    }

    // Simple criteria matching logic (in real implementation, this would be more sophisticated)
    const missingCriteria: string[] = [];
    
    // Check for basic requirements
    if (!request.diagnosis) {
      missingCriteria.push('Medical diagnosis required');
    }
    
    if (!request.clinicalJustification) {
      missingCriteria.push('Clinical justification required');
    }
    
    if (!request.physicianInfo.name) {
      missingCriteria.push('Physician information required');
    }

    return {
      isCovered: true,
      requiresPriorAuth: criteria.requiresPriorAuth,
      meetsCriteria: missingCriteria.length === 0,
      missingCriteria
    };
  }

  /**
   * Step 3: Generate approval decision using AI
   */
  async generateApprovalDecision(
    request: InsuranceRequest,
    coverageAnalysis: any
  ): Promise<ApprovalDecision> {
    const decisionPrompt = `
    As a medical insurance reviewer, analyze this request and provide an approval decision:

    Service Requested: ${request.serviceRequested}
    Diagnosis: ${request.diagnosis}
    Clinical Justification: ${request.clinicalJustification}
    Urgency: ${request.urgency}
    Coverage Analysis: ${JSON.stringify(coverageAnalysis)}

    Provide a decision with reasoning. Consider:
    - Medical necessity
    - Coverage criteria compliance
    - Documentation completeness
    - Cost-effectiveness
    - Clinical guidelines

    Return your assessment focusing on patient care and policy compliance.
    `;

    try {
      const result = await this.model.generateContent(decisionPrompt);
      const response = result.response.text();

      // Parse the AI response to extract decision components
      const decision = this.parseDecisionResponse(response, coverageAnalysis);
      
      return decision;
    } catch (error) {
      // Fallback decision if AI fails
      return {
        decision: 'pending_info',
        confidence: 0.5,
        reasoning: ['Unable to complete automated review', 'Manual review required'],
        requiredDocuments: ['Complete medical records', 'Physician notes'],
        appealRights: 'Patient has right to appeal within 30 days'
      };
    }
  }

  /**
   * Step 4: Complete insurance approval analysis
   */
  async analyzeInsuranceRequest(requestText: string): Promise<InsuranceApprovalAnalysis> {
    const processingSteps: string[] = [];
    
    try {
      // Step 1: Parse request
      processingSteps.push('Step 1: Parsing insurance request...');
      const { requestInfo } = await this.parseInsuranceRequest(requestText);
      
      // Step 2: Analyze coverage
      processingSteps.push('Step 2: Analyzing coverage criteria...');
      const coverageAnalysis = this.analyzeCoverage(requestInfo);
      
      // Step 3: Generate decision
      processingSteps.push('Step 3: Generating approval decision...');
      const decision = await this.generateApprovalDecision(requestInfo, coverageAnalysis);
      
      processingSteps.push('Step 4: Finalizing approval analysis...');
      
      const reviewNotes = [
        `Request type: ${requestInfo.requestType}`,
        `Service: ${requestInfo.serviceRequested}`,
        `Diagnosis: ${requestInfo.diagnosis}`,
        `Urgency: ${requestInfo.urgency}`,
        `Prior authorization required: ${coverageAnalysis.requiresPriorAuth ? 'Yes' : 'No'}`,
        `Decision: ${decision.decision.toUpperCase()}`
      ];

      return {
        requestInfo,
        coverageAnalysis,
        decision,
        processingSteps,
        reviewNotes
      };
      
    } catch (error) {
      processingSteps.push(`Error: ${error}`);
      throw new Error(`Insurance approval analysis failed: ${error}`);
    }
  }

  /**
   * Helper: Map service request to coverage criteria
   */
  private mapServiceToCriteria(service: string): string {
    const serviceLower = service.toLowerCase();
    
    if (serviceLower.includes('mri')) return 'mri';
    if (serviceLower.includes('ct') || serviceLower.includes('scan')) return 'ct';
    if (serviceLower.includes('surgery') || serviceLower.includes('operation')) return 'surgery';
    if (serviceLower.includes('therapy') || serviceLower.includes('rehabilitation')) return 'physicalTherapy';
    if (serviceLower.includes('medication') || serviceLower.includes('drug')) return 'specialtyDrugs';
    
    return 'unknown';
  }

  /**
   * Helper: Parse AI decision response
   */
  private parseDecisionResponse(response: string, coverageAnalysis: any): ApprovalDecision {
    const responseLower = response.toLowerCase();
    
    let decision: 'approved' | 'denied' | 'pending_info' = 'pending_info';
    let confidence = 0.7;
    
    if (responseLower.includes('approve') && !responseLower.includes('not approve')) {
      decision = 'approved';
      confidence = 0.85;
    } else if (responseLower.includes('deny') || responseLower.includes('denied')) {
      decision = 'denied';
      confidence = 0.8;
    }

    // Extract reasoning points
    const reasoning: string[] = [];
    const lines = response.split('\n');
    lines.forEach(line => {
      if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('*')) {
        reasoning.push(line.trim().replace(/^[•\-*]\s*/, ''));
      }
    });

    if (reasoning.length === 0) {
      reasoning.push('Automated review completed based on coverage criteria');
    }

    const requiredDocuments = [
      'Complete medical records',
      'Physician treatment notes',
      'Insurance coverage verification'
    ];

    if (coverageAnalysis.missingCriteria.length > 0) {
      requiredDocuments.push(...coverageAnalysis.missingCriteria);
    }

    return {
      decision,
      confidence,
      reasoning,
      requiredDocuments,
      conditions: decision === 'approved' ? ['Subject to network provider', 'Valid for 90 days'] : undefined,
      appealRights: 'Patient has right to appeal within 30 days of decision',
      validityPeriod: decision === 'approved' ? '90 days from approval date' : undefined
    };
  }
}

// Helper function to format analysis for display
export function formatInsuranceAnalysisForDisplay(analysis: InsuranceApprovalAnalysis): string {
  const { requestInfo, coverageAnalysis, decision, reviewNotes } = analysis;
  
  const decisionIcon = decision.decision === 'approved' ? '✅' : 
                      decision.decision === 'denied' ? '❌' : '⏳';
  
  return `
🏥 Insurance Approval Analysis
===============================

📋 Request Summary:
Patient: ${requestInfo.patientInfo.name}
Service: ${requestInfo.serviceRequested}
Diagnosis: ${requestInfo.diagnosis}
Urgency: ${requestInfo.urgency.toUpperCase()}

📊 Coverage Analysis:
Covered Service: ${coverageAnalysis.isCovered ? '✅ Yes' : '❌ No'}
Prior Auth Required: ${coverageAnalysis.requiresPriorAuth ? '✅ Yes' : '❌ No'}
Meets Criteria: ${coverageAnalysis.meetsCriteria ? '✅ Yes' : '❌ No'}

${decisionIcon} DECISION: ${decision.decision.toUpperCase()}
Confidence: ${Math.round(decision.confidence * 100)}%

📝 Reasoning:
${decision.reasoning.map(reason => `• ${reason}`).join('\n')}

📄 Required Documents:
${decision.requiredDocuments.map(doc => `• ${doc}`).join('\n')}

${decision.conditions ? `📋 Approval Conditions:\n${decision.conditions.map(condition => `• ${condition}`).join('\n')}` : ''}

ℹ️ Appeal Rights: ${decision.appealRights}
${decision.validityPeriod ? `⏰ Valid Until: ${decision.validityPeriod}` : ''}

🔒 Disclaimer: This is an automated preliminary review. Final decisions are subject to manual review and may vary based on complete medical documentation.
  `.trim();
}
