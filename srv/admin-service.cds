using excelreader as db from '../db/schema';

service Adminservice @(path: '/admin'){

    entity Imports as projection on db.ExcelImports;

    entity ColumnConfigurations as projection on db.ExcelColumnConfigurations;
    
    action uploadExcel(
        data: LargeString,
    );

    action loadImportData(
        importID: UUID
    ) returns LargeString;
}