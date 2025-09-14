import { VideoConsultationClient } from "@/components/video-consultation/VideoConsultationClient";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Consultation",
  description: "Schedule and join video consultations with your doctor using secure video conferencing.",
};

export default function VideoConsultationPage() {
  return (
    <ProtectedRoute>
      <VideoConsultationClient />
    </ProtectedRoute>
  );
}