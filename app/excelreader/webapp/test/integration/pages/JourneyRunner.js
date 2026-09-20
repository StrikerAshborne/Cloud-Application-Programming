sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"ns/excelreader/test/integration/pages/PurchasesList.gen",
	"ns/excelreader/test/integration/pages/PurchasesObjectPage.gen"
], function (JourneyRunner, PurchasesListGenerated, PurchasesObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('ns/excelreader') + '/test/flp.html#app-preview',
        pages: {
			onThePurchasesListGenerated: PurchasesListGenerated,
			onThePurchasesObjectPageGenerated: PurchasesObjectPageGenerated
        },
        async: true
    });

    return runner;
});

