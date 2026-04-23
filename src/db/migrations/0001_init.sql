create table if not exists jobs_raw (
  id text primary key,
  source text not null,
  source_job_id text not null,
  fetched_at timestamptz not null,
  payload_json jsonb not null,
  checksum text not null
);

create unique index if not exists jobs_raw_source_job_checksum_idx
  on jobs_raw (source, source_job_id, checksum);

create table if not exists jobs_normalized (
  id text primary key,
  raw_job_id text not null references jobs_raw (id),
  canonical_job_key text not null,
  title text not null,
  company_name text,
  location_text text,
  remote_mode text,
  contract_type text,
  seniority_text text,
  description_text text not null,
  skills_detected_json jsonb not null default '[]'::jsonb,
  published_at timestamptz,
  normalized_at timestamptz not null
);

create index if not exists jobs_normalized_canonical_job_key_idx
  on jobs_normalized (canonical_job_key);

create index if not exists jobs_normalized_published_at_idx
  on jobs_normalized (published_at desc);

create table if not exists candidate_profile (
  id text primary key,
  target_roles_json jsonb not null default '[]'::jsonb,
  preferred_skills_json jsonb not null default '[]'::jsonb,
  excluded_keywords_json jsonb not null default '[]'::jsonb,
  preferred_locations_json jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null
);

create table if not exists candidate_documents (
  id text primary key,
  document_type text not null,
  source_filename text,
  content_text text not null,
  parsed_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);

create table if not exists skills_catalog (
  id text primary key,
  skill_name text not null,
  skill_category text not null,
  aliases_json jsonb not null default '[]'::jsonb,
  is_active boolean not null default true
);

create table if not exists job_matches (
  id text primary key,
  job_id text not null references jobs_normalized (id),
  candidate_profile_id text not null references candidate_profile (id),
  score_global numeric(5,2) not null,
  score_role numeric(5,2) not null,
  score_skills_match numeric(5,2) not null,
  score_stack_fit numeric(5,2) not null,
  score_seniority numeric(5,2) not null,
  score_penalties numeric(5,2) not null,
  score_preference numeric(5,2) not null,
  explanation_json jsonb not null default '{}'::jsonb,
  matched_skills_json jsonb not null default '[]'::jsonb,
  missing_skills_json jsonb not null default '[]'::jsonb,
  computed_at timestamptz not null
);

create index if not exists job_matches_job_id_idx
  on job_matches (job_id);

create index if not exists job_matches_score_global_idx
  on job_matches (score_global desc);

create table if not exists skill_gaps (
  id text primary key,
  job_match_id text not null references job_matches (id),
  skill_name text not null,
  gap_type text not null,
  importance_score numeric(5,2) not null,
  rationale_text text not null,
  suggested_action_json jsonb not null default '{}'::jsonb
);

create table if not exists daily_feed_items (
  id text primary key,
  feed_date date not null,
  item_kind text not null,
  related_job_id text,
  related_job_match_id text,
  title text not null,
  summary text not null,
  score numeric(5,2) not null,
  payload_json jsonb not null default '{}'::jsonb,
  rank integer not null,
  created_at timestamptz not null
);
