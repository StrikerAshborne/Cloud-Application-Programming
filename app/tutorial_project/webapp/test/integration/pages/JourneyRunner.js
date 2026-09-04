sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/myproject/books/tutorialproject/test/integration/pages/BooksList.gen",
	"com/myproject/books/tutorialproject/test/integration/pages/BooksObjectPage.gen"
], function (JourneyRunner, BooksListGenerated, BooksObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/myproject/books/tutorialproject') + '/test/flp.html#app-preview',
        pages: {
			onTheBooksListGenerated: BooksListGenerated,
			onTheBooksObjectPageGenerated: BooksObjectPageGenerated
        },
        async: true
    });

    return runner;
});

