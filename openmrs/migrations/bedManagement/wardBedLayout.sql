DROP PROCEDURE IF EXISTS addWardBed;
DELIMITER //
CREATE PROCEDURE addWardBed
   (
      IN bedNumber nvarchar(30),
      IN locationName nvarchar(30),
      IN rowNumber nvarchar(20),
      IN columnNumber nvarchar(20)
   )
BEGIN
    SELECT location_id INTO @locationId FROM location WHERE location.name=locationName;
    INSERT INTO bed (bed_number, bed_type_id, uuid, creator, date_created, voided) VALUES (bedNumber, 1, uuid(), 1, NOW(), FALSE);
    SELECT bed.bed_id INTO @bedId FROM bed LEFT OUTER JOIN bed_location_map ON bed_location_map.bed_id = bed.bed_id WHERE bed.bed_number=bedNumber AND bed_location_map.location_id IS NULL;
    INSERT INTO bed_location_map(location_id, row_number, column_number, bed_id) VALUES (@locationId, rowNumber, columnNumber, @bedId);
END//
DELIMITER ;
CALL insertBedIntoLocation('200', 'Ward (2nd floor)',1,1);
CALL insertBedIntoLocation('202', 'Ward (2nd floor)',1,2);
CALL insertBedIntoLocation('203', 'Ward (2nd floor)',1,3);
CALL insertBedIntoLocation('204', 'Ward (2nd floor)',1,4)
CALL insertBedIntoLocation('205', 'Ward (2nd floor)',1,5);
CALL insertBedIntoLocation('212/1', 'Ward (2nd floor)',1,6);
CALL insertBedIntoLocation('212/2', 'Ward (2nd floor)',1,7);
CALL insertBedIntoLocation('207/1', 'Ward (2nd floor)',2,1);
CALL insertBedIntoLocation('208/1', 'Ward (2nd floor)',2,2);
CALL insertBedIntoLocation('209/1', 'Ward (2nd floor)',2,3);
CALL insertBedIntoLocation('210/1', 'Ward (2nd floor)',2,4);
CALL insertBedIntoLocation('211/1', 'Ward (2nd floor)',2,5);
CALL insertBedIntoLocation('213/1', 'Ward (2nd floor)',2,6);
CALL insertBedIntoLocation('213/2', 'Ward (2nd floor)',2,7);
CALL insertBedIntoLocation('207/2', 'Ward (2nd floor)',3,1);
CALL insertBedIntoLocation('208/2', 'Ward (2nd floor)',3,2);
CALL insertBedIntoLocation('209/2', 'Ward (2nd floor)',3,3);
CALL insertBedIntoLocation('210/2', 'Ward (2nd floor)',3,4);
CALL insertBedIntoLocation('211/2', 'Ward (2nd floor)',3,5);
CALL insertBedIntoLocation('213/3', 'Ward (2nd floor)',3,6);
CALL insertBedIntoLocation('213/4', 'Ward (2nd floor)',3,7);
CALL insertBedIntoLocation('214/1', 'Ward (2nd floor)',4,6);
CALL insertBedIntoLocation('214/2', 'Ward (2nd floor)',4,7);
CALL insertBedIntoLocation('214/3', 'Ward (2nd floor)',5,6);
CALL insertBedIntoLocation('214/4', 'Ward (2nd floor)',5,7);
CALL insertBedIntoLocation('214/5', 'Ward (2nd floor)',6,6);
CALL insertBedIntoLocation('215/1', 'Ward (2nd floor)',6,7);
CALL insertBedIntoLocation('215/2', 'Ward (2nd floor)',7,6);
CALL insertBedIntoLocation('216', 'Ward (2nd floor)',7,7);
CALL insertBedIntoLocation('217/1', 'Ward (2nd floor)',8,6);
CALL insertBedIntoLocation('217/2', 'Ward (2nd floor)',8,7);
CALL insertBedIntoLocation('217/3', 'Ward (2nd floor)',9,6);
CALL insertBedIntoLocation('218/1', 'Ward (2nd floor)',9,7);
CALL insertBedIntoLocation('218/2', 'Ward (2nd floor)',10,6);
CALL insertBedIntoLocation('218/3', 'Ward (2nd floor)',10,7);
CALL insertBedIntoLocation('218/4', 'Ward (2nd floor)',11,6);


CALL insertBedIntoLocation('305', 'Ward (3rd floor)',1,1);
CALL insertBedIntoLocation('304', 'Ward (3rd floor)',1,2);
CALL insertBedIntoLocation('303', 'Ward (3rd floor)',1,3);
CALL insertBedIntoLocation('302', 'Ward (3rd floor)',1,4)
CALL insertBedIntoLocation('300', 'Ward (3rd floor)',1,5);
CALL insertBedIntoLocation('312/1', 'Ward (3rd floor)',1,6);
CALL insertBedIntoLocation('312/2', 'Ward (3rd floor)',1,7);
CALL insertBedIntoLocation('307/1', 'Ward (3rd floor)',2,1);
CALL insertBedIntoLocation('308/1', 'Ward (3rd floor)',2,2);
CALL insertBedIntoLocation('309/1', 'Ward (3rd floor)',2,3);
CALL insertBedIntoLocation('310/1', 'Ward (3rd floor)',2,4);
CALL insertBedIntoLocation('311/1', 'Ward (3rd floor)',2,5);
CALL insertBedIntoLocation('313/1', 'Ward (3rd floor)',2,6);
CALL insertBedIntoLocation('313/2', 'Ward (3rd floor)',2,7);
CALL insertBedIntoLocation('307/2', 'Ward (3rd floor)',3,1);
CALL insertBedIntoLocation('308/2', 'Ward (3rd floor)',3,2);
CALL insertBedIntoLocation('309/2', 'Ward (3rd floor)',3,3);
CALL insertBedIntoLocation('310/2', 'Ward (3rd floor)',3,4);
CALL insertBedIntoLocation('311/2', 'Ward (3rd floor)',3,5);
CALL insertBedIntoLocation('313/3', 'Ward (3rd floor)',3,6);
CALL insertBedIntoLocation('313/4', 'Ward (3rd floor)',3,7);
CALL insertBedIntoLocation('314/1', 'Ward (3rd floor)',4,6);
CALL insertBedIntoLocation('314/2', 'Ward (3rd floor)',4,7);
CALL insertBedIntoLocation('314/3', 'Ward (3rd floor)',5,6);
CALL insertBedIntoLocation('314/4', 'Ward (3rd floor)',5,7);
CALL insertBedIntoLocation('314/5', 'Ward (3rd floor)',6,6);
CALL insertBedIntoLocation('315/1', 'Ward (3rd floor)',6,7);
CALL insertBedIntoLocation('315/2', 'Ward (3rd floor)',7,6);
CALL insertBedIntoLocation('316', 'Ward (3rd floor)',7,7);
CALL insertBedIntoLocation('317/1', 'Ward (3rd floor)',8,6);
CALL insertBedIntoLocation('317/2', 'Ward (3rd floor)',8,7);
CALL insertBedIntoLocation('317/3', 'Ward (3rd floor)',9,6);
CALL insertBedIntoLocation('318/1', 'Ward (3rd floor)',9,7);
CALL insertBedIntoLocation('318/2', 'Ward (3rd floor)',10,6);
CALL insertBedIntoLocation('318/3', 'Ward (3rd floor)',10,7);
CALL insertBedIntoLocation('318/4', 'Ward (3rd floor)',11,6);



