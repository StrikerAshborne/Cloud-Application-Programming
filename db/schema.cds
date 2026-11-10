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

entity TableConfigurations : cuid, managed {

    name : String(255) not null;

    columns : Composition of many TableConfigurationColumns
        on columns.parent = $self;

}

entity TableConfigurationColumns : cuid, managed {

    parent : Association to one TableConfigurations;

    headerName : String(255) not null;

    dataType : ExcelColumnType not null;

    position : Integer not null;

    regexPattern : String(1000);

    regexReplacement : String(1000);
}