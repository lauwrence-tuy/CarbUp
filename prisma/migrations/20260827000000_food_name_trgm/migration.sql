-- Trigram fuzzy matching for food search (typo tolerance + better ranking).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index backs word_similarity() / ILIKE '%...%' on Food.name.
CREATE INDEX "Food_name_trgm_idx" ON "Food" USING gin ("name" gin_trgm_ops);
