-- Purpose: same dictionary table list as 01, run as a sync (name s5-connectivity-check-20261127-1813)
--   to see whether the sync path works when query_preview does not.
-- Result rows: 0 - FAILED. Data asset id: none (syncId 6a7845be-b4cf-40d9-aaf2-a85b62f96e0c, status failed).
-- Error (verbatim): SAP HANA request failed. Test the connection under Integrations and try again.
SELECT DISTINCT TABLE_NAME FROM VEDANTA_POC.DATA_DICTIONARY ORDER BY TABLE_NAME
