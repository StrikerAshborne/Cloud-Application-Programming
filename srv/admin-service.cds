using excelreader as db from '../db/schema';

service Adminservice @(path: '/admin'){
    entity Purchases as projection on db.Purchases;

    action uploadExcel(
        file     : LargeBinary,
        filename : String
    ) returns String;
}