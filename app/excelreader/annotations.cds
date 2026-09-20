using Adminservice as service from '../../srv/admin-service';
annotate service.Purchases with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'name',
                Value : name,
            },
            {
                $Type : 'UI.DataField',
                Label : 'referencepurchaseorder',
                Value : referencepurchaseorder,
            },
            {
                $Type : 'UI.DataField',
                Label : 'postingdate',
                Value : postingdate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'referencepurchaseorederitem',
                Value : referencepurchaseorederitem,
            },
            {
                $Type : 'UI.DataField',
                Label : 'accountasignmentcategory',
                Value : accountasignmentcategory,
            },
            {
                $Type : 'UI.DataField',
                Label : 'unit',
                Value : unit,
            },
            {
                $Type : 'UI.DataField',
                Label : 'preformancedate',
                Value : preformancedate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'preformanceenddate',
                Value : preformanceenddate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'netprice',
                Value : netprice,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'name',
            Value : name,
        },
        {
            $Type : 'UI.DataField',
            Label : 'referencepurchaseorder',
            Value : referencepurchaseorder,
        },
        {
            $Type : 'UI.DataField',
            Label : 'postingdate',
            Value : postingdate,
        },
        {
            $Type : 'UI.DataField',
            Label : 'referencepurchaseorederitem',
            Value : referencepurchaseorederitem,
        },
        {
            $Type : 'UI.DataField',
            Label : 'accountasignmentcategory',
            Value : accountasignmentcategory,
        },
    ],
);

