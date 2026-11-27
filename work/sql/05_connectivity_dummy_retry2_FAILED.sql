-- Purpose: connectivity probe retried in the third part of the run (same as 02 and 04), after pushing the branch, to see whether HANA had recovered.
-- Result rows: 0 - FAILED. Data asset id: none (preview only).
-- Run via: Context Flow query_preview on integration 6af2dc1871a5bb8b758f2312 at 2026-11-27T12:45:14Z (requestId 2cc9f7f4-559f-407d-a814-b56a4ad18da5).
-- Error (verbatim): SAP HANA request failed. Test the connection under Integrations and try again.
SELECT 1 AS X FROM DUMMY
