-- Purpose: connectivity probe retried at the start of the continuation run (same as 02), to see whether the HANA connection had recovered.
-- Result rows: 0 - FAILED. Data asset id: none (preview only).
-- Run via: Context Flow query_preview on integration 6af2dc1871a5bb8b758f2312 at 2026-11-27T12:44:06Z (requestId 3840f8ae-6fd5-4d72-9416-2cdbe1f97e47).
-- Error (verbatim): SAP HANA request failed. Test the connection under Integrations and try again.
SELECT 1 AS X FROM DUMMY
