import { getStoredCandidateProfile } from "@/src/services/runtime/local-store";

export function getCandidateProfile() {
  return getStoredCandidateProfile();
}
