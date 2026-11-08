namespace excelreader;

using {
    cuid,
    managed,
} from '@sap/cds/common';


entity ExcelImports:cuid {
        filename  : String(255);
        headers   : LargeString;
        data      : LargeString;
        totalRows : Integer;
        createdAt : Timestamp;
}

type ExcelColumnType : String enum {
    String;
    Integer;
    Decimal;
    Boolean;
    Date;
}

entity ExcelColumnConfigurations : cuid, managed {
    headerName : String(255) not null;
    dataType   : ExcelColumnType not null;
    position   : Integer not null;
}