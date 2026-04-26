import { getCandidateDocuments } from "@/src/services/profile/get-candidate-documents";
import { getCandidateProfile } from "@/src/services/profile/get-candidate-profile";
import { DocumentUploadForm } from "@/app/profile/document-upload-form";
import { DocumentSkillEditor } from "@/app/profile/document-skill-editor";
import { ManualSkillForm } from "@/app/profile/manual-skill-form";
import { PurgeDocumentDataButton } from "@/app/profile/purge-document-data-button";

export const dynamic = "force-dynamic";

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : false;
}

export default function ProfilePage() {
  const profile = getCandidateProfile();
  const documents = getCandidateDocuments();
  const aggregatedSkills = Array.from(
    new Set(documents.flatMap((document) => readStringArray(document.parsedJson.detected_skills)))
  ).sort();
  const aggregatedRoles = Array.from(
    new Set(documents.flatMap((document) => readStringArray(document.parsedJson.detected_roles)))
  ).sort();
  const aggregatedLocations = Array.from(
    new Set(documents.flatMap((document) => readStringArray(document.parsedJson.detected_locations)))
  ).sort();
  const mentionsTeletravail = documents.some((document) => readBoolean(document.parsedJson.mentions_teletravail));

  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">Import profil</span>
        <h1>Le profil candidat pilote maintenant la zone, le teletravail et l&apos;analyse documentaire.</h1>
        <p>
          Pour la suite du projet, on cible prioritairement Nantes et Saint-Nazaire
          avec teletravail ou mode hybride. Le MVP accepte maintenant un chargement
          fichier pour le CV et la lettre, puis consolide les signaux documentaires
          avant l&apos;etape de matching plus fin.
        </p>
      </section>

      <section className="dashboard-grid">
        <div className="profile-grid">
          <article className="panel section-stack">
            <h2>Profil structure</h2>
            <p>{profile.notes}</p>
            <div className="tag-list">
              {profile.targetRoles.map((role) => (
                <span className="tag" key={role}>
                  {role}
                </span>
              ))}
            </div>
            <div className="tag-list">
              {profile.preferredLocations.map((location) => (
                <span className="tag warm" key={location}>
                  {location}
                </span>
              ))}
              {profile.preferRemoteFriendly ? <span className="tag warm">teletravail souhaite</span> : null}
            </div>
            <div className="tag-list">
              {profile.preferredSkills.map((skill) => (
                <span className="tag warm" key={skill}>
                  {skill}
                </span>
              ))}
            </div>
            <ManualSkillForm />
          </article>

          <article className="panel section-stack">
            <h2>Charger CV ou lettre</h2>
            <p>
              Route utilisee: <span className="mono">POST /api/profile/documents</span>
            </p>
            <p>Formats MVP: CV en PDF/TXT/Markdown, lettre en TXT/Markdown, avec collage manuel en secours.</p>
            <DocumentUploadForm />
            <div className="task-log section-stack">
              <strong>Nettoyage des donnees CV/LM</strong>
              <p className="muted">
                Supprime les documents importes, les analyses agentiques associees et les scores derives. Les competences
                ajoutees manuellement au profil sont conservees.
              </p>
              <PurgeDocumentDataButton />
            </div>
          </article>

          <article className="panel section-stack">
            <h2>Profil extrait des documents</h2>
            <p>
              Cette synthese sert de base au prochain matching plus fin entre offres,
              competences deja prouvees et competences encore manquantes.
            </p>
            {aggregatedSkills.length > 0 ? (
              <div className="tag-list">
                {aggregatedSkills.map((skill) => (
                  <span className="tag" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p>Aucune competence detectee pour l&apos;instant.</p>
            )}
            {aggregatedRoles.length > 0 ? <p>Roles detectes: {aggregatedRoles.join(", ")}</p> : null}
            {aggregatedLocations.length > 0 ? <p>Zones detectees: {aggregatedLocations.join(", ")}</p> : null}
            {mentionsTeletravail ? <span className="tag warm">teletravail ou hybride mentionne</span> : null}
          </article>
        </div>

        <article className="panel section-stack">
          <h2>Documents connus et analyse</h2>
          <ul className="list-reset">
            {documents.map((document) => {
              const detectedSkills = readStringArray(document.parsedJson.detected_skills);
              const detectedRoles = readStringArray(document.parsedJson.detected_roles);
              const detectedLocations = readStringArray(document.parsedJson.detected_locations);
              const extractionStatus =
                typeof document.parsedJson.extraction_status === "string" ? document.parsedJson.extraction_status : null;
              const extractionWarning =
                typeof document.parsedJson.extraction_warning === "string"
                  ? document.parsedJson.extraction_warning
                  : null;
              const summary =
                typeof document.parsedJson.summary === "string" ? document.parsedJson.summary : document.contentText;

              return (
                <li key={document.id}>
                  <strong>{document.sourceFilename}</strong>
                  <p>
                    {document.documentType} - cree le {document.createdAt}
                  </p>
                  {typeof document.parsedJson.analysis_mode === "string" ? (
                    <p>Analyse: {document.parsedJson.analysis_mode}</p>
                  ) : null}
                  {typeof document.parsedJson.extraction_method === "string" ? (
                    <p>Methode d&apos;extraction: {document.parsedJson.extraction_method}</p>
                  ) : null}
                  {extractionStatus === "invalid" && extractionWarning ? (
                    <div className="tag-list">
                      <span className="tag danger">extraction invalide</span>
                    </div>
                  ) : null}
                  <p>{summary}</p>
                  {extractionStatus === "invalid" && extractionWarning ? <p>{extractionWarning}</p> : null}
                  <DocumentSkillEditor documentId={document.id} skills={detectedSkills} />
                  {detectedRoles.length > 0 ? (
                    <p>Roles detectes: {detectedRoles.join(", ")}</p>
                  ) : null}
                  {detectedLocations.length > 0 ? (
                    <p>Zones detectees: {detectedLocations.join(", ")}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </article>
      </section>
    </main>
  );
}
