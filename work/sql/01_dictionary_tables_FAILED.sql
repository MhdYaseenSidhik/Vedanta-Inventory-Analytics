-- Purpose: list the tables documented in the data dictionary (first step of reading it).
-- Result rows: 0 - FAILED. Data asset id: none (preview only).
-- Run via: Context Flow query_preview on integration 6af2dc1871a5bb8b758f2312 (SAP HANA Cloud), attempted twice
--   (2026-11-27T12:41:43Z and 2026-11-27T12:42:41Z, the second after a 45 s wait).
-- Error (verbatim): SAP HANA request failed. Test the connection under Integrations and try again.
SELECT DISTINCT TABLE_NAME FROM VEDANTA_POC.DATA_DICTIONARY ORDER BY TABLE_NAME
