using excelreader as db from '../db/schema';

service Adminservice @(path: '/admin'){

    entity Imports as projection on db.ExcelImports;

    entity TableConfigurations as projection on db.TableConfigurations;

    entity TableConfigurationColumns as projection on db.TableConfigurationColumns;
    
    action uploadExcel(
        data: LargeString,
    );

    action loadImportData(
        importID: UUID,
        configurationID: UUID
    ) returns LargeString;

    action loadTableConfiguration(
        configurationID: UUID
    ) returns LargeString;


    action saveTableConfiguration(
        configurationID: UUID,
        name: String(255),
        columns: LargeString
    ) returns LargeString;


    action deleteTableConfiguration(
        configurationID: UUID
    ) returns LargeString;
}