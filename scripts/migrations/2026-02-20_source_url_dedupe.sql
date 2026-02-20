BEGIN;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- normaliza valores vazios para NULL
UPDATE posts
SET source_url = NULL
WHERE source_url IS NOT NULL AND btrim(source_url) = '';

-- remove duplicados mantendo o mais recente (created_at, id)
WITH ranked AS (
  SELECT
    id,
    source_url,
    ROW_NUMBER() OVER (
      PARTITION BY source_url
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM posts
  WHERE source_url IS NOT NULL
)
UPDATE posts p
SET source_url = NULL
FROM ranked r
WHERE p.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS posts_source_url_unique
  ON posts (source_url)
  WHERE source_url IS NOT NULL;

COMMIT;
