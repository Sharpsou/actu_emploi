import type { JobSource } from "@/src/domain/types";

type JobDetailUrlInput = {
  source: JobSource;
  sourceJobId: string;
  detailUrl?: string | null;
};

const franceTravailIdPattern = /^[A-Z0-9]{6,}$/i;

export function getJobDetailUrl({ source, sourceJobId, detailUrl }: JobDetailUrlInput) {
  if (typeof detailUrl === "string" && detailUrl.trim().length > 0) {
    return detailUrl;
  }

  if (source === "France Travail" && franceTravailIdPattern.test(sourceJobId)) {
    return `https://candidat.francetravail.fr/offres/recherche/detail/${sourceJobId}`;
  }

  return undefined;
}
