-- Purpose: part 4 retry of the data-dictionary table list via query_preview (limit 100), 2026-11-27T12:45Z.
-- Result rows: 0 (FAILED). Data asset id: none (preview only).
-- Error (verbatim): SAP HANA request failed. Test the connection under Integrations and try again.
-- Integration 6af2dc1871a5bb8b758f2312 (SAP HANA Cloud) reports status "error".
SELECT DISTINCT TABLE_NAME FROM VEDANTA_POC.DATA_DICTIONARY ORDER BY TABLE_NAME
