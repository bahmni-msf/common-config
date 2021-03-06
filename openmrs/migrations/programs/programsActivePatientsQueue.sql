UPDATE
    global_property
SET property_value = "SELECT DISTINCT
    concat(pn.given_name,' ', pn.family_name)       AS name,
    pi.identifier                                   AS identifier,
    concat('', p.uuid)                              AS uuid
FROM patient_program ppr
    INNER JOIN person_name pn ON ppr.patient_id = pn.person_id AND ppr.voided IS FALSE AND pn.voided IS FALSE
    INNER JOIN person p ON ppr.patient_id = p.person_id AND p.voided IS FALSE
    INNER JOIN patient_identifier pi ON ppr.patient_id = pi.patient_id AND pi.voided IS FALSE
WHERE date_completed IS NULL;"
WHERE property = "emrapi.sqlSearch.activePatients";
