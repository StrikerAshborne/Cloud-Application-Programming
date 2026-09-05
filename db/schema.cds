namespace excelreader;

using {
    cuid,
} from '@sap/cds/common';


entity Purchases:cuid{
    name:String(225);
    referencepurchaseorder:String(10);
    postingdate:Date;
    referencepurchaseorederitem:Integer;
    accountasignmentcategory: AsignmentCategory;
    unit:Unit;
    preformancedate:String(7);
    preformanceenddate:Date;
    netprice:Integer;
}

type AsignmentCategory : String enum{
    A='A';
    B='B';
    C='C';
}

type Unit : String enum{
    ORA='ÓRA';
    NAP='NAP';
}