/**
 * Portia Medical Reports Page
 * 
 * This page showcases the Portia-based medical report analysis system
 */

import { PortiaMedicalReportsClient } from '@/components/portia/PortiaMedicalReportsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portia Medical Report Analysis - Hospital Dashboard',
  description: 'AI-powered medical report analysis using Portia workflow system with step-by-step processing and patient-friendly explanations.',
  keywords: 'medical reports, AI analysis, Portia, lab results, health analysis, medical AI'
};

export default function PortiaMedicalReportsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <PortiaMedicalReportsClient />
    </div>
  );
}
