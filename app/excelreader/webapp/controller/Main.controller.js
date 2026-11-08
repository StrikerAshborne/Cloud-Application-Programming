
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/ui/unified/FileUploader",
    "xlsx"
], function (
    Controller,
    MessageToast,
    MessageBox,
    Dialog,
    Button,
    VBox,
    FileUploader,
    XLSX
) {
    "use strict";

    return Controller.extend("ns.excelreader.controller.Main", {

        onInit: function () {
            console.log("Excel Reader application initialized.");
        },

        onUploadExcel: function () {

            const oModel = this.getView().getModel();

            const oFileUploader = new FileUploader({
                width: "100%",
                fileType: ["xlsx", "xls"],
                placeholder: "Choose an Excel file"
            });

            const oDialog = new Dialog({
                title: "Upload Excel File",
                contentWidth: "400px",

                content: new VBox({
                    width: "100%",
                    class: "sapUiSmallMargin",
                    items: [oFileUploader]
                }),

                beginButton: new Button({
                    text: "Upload",
                    type: "Emphasized",

                    press: async function () {

                        const oFile = oFileUploader
                            .getFocusDomRef()?.files?.[0];

                        if (!oFile) {
                            MessageToast.show(
                                "Please choose an Excel file!"
                            );
                            return;
                        }

                        try {
                            MessageToast.show("Processing file...");

                            const oArrayBuffer =
                                await oFile.arrayBuffer();

                            const oWorkbook = XLSX.read(
                                oArrayBuffer,
                                {
                                    type: "array",
                                    cellDates: true
                                }
                            );

                            const sSheetName =
                                oWorkbook.SheetNames[0];

                            if (!sSheetName) {
                                throw new Error(
                                    "The Excel file contains no worksheets."
                                );
                            }

                            const oWorksheet =
                                oWorkbook.Sheets[sSheetName];

                            const aJsonData =
                                XLSX.utils.sheet_to_json(
                                    oWorksheet,
                                    {
                                        defval: null
                                    }
                                );

                            const oExcelData = {
                                filename: oFile.name,
                                headers: aJsonData.length > 0
                                    ? Object.keys(aJsonData[0])
                                    : [],
                                data: aJsonData,
                                totalRows: aJsonData.length
                            };

                            const oOperation =
                                oModel.bindContext(
                                    "/uploadExcel(...)"
                                );

                            oOperation.setParameter(
                                "data",
                                JSON.stringify(oExcelData)
                            );

                            await oOperation.execute();

                            MessageBox.success(
                                "The Excel file has been successfully processed!",
                                {
                                    onClose: function () {
                                        oDialog.close();
                                    }
                                }
                            );

                        } catch (oError) {

                            console.error(
                                "Excel upload error:",
                                oError
                            );

                            MessageBox.error(
                                oError.message ||
                                "An error has occurred while processing the file."
                            );
                        }
                    }
                }),

                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        oDialog.close();
                    }
                }),

                afterClose: function () {
                    oDialog.destroy();
                }
            });

            oDialog.open();
        }

    });
});
