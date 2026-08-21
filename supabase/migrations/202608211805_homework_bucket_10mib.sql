-- Keep the private homework bucket aligned with the application contract.
-- Homework attachments are capped at exactly 10 MiB (10 * 1024 * 1024 bytes).
UPDATE storage.buckets
SET file_size_limit = 10 * 1024 * 1024
WHERE id = 'homework';
