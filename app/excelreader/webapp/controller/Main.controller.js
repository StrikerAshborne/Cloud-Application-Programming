sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/ui/unified/FileUploader",
    "sap/ui/model/json/JSONModel",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "xlsx"
], function (
    Controller,
    MessageToast,
    MessageBox,
    Dialog,
    Button,
    VBox,
    FileUploader,
    JSONModel,
    Column,
    ColumnListItem,
    Text,
    XLSX
) {
    "use strict";

    return Controller.extend("ns.excelreader.controller.Main", {

        onInit: function () {
            console.log("Excel Reader application initialized.");

            // Create a separate model for the dynamic table
            const oTableModel = new JSONModel({
                filename: "",
                totalRows: 0,
                rows: []
            });

            this.getView().setModel(
                oTableModel,
                "table"
            );
        },

        onUploadExcel: function () {

            const oModel = this.getView().getModel();
            const oController = this;

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

                            // Refresh imported Excel list
                            const oImportBinding = oController.byId("importSelect")
                                .getBinding("items");

                            if (oImportBinding) {
                                oImportBinding.refresh();
                            }

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
        },

        onLoadData: async function () {

        const oModel = this.getView().getModel();

        const oSelect = this.byId("importSelect");

        const oTable = this.byId("importedDataTable");

        const sImportID = oSelect.getSelectedKey();

        // 1. Check selected import
        if (!sImportID) {

            MessageToast.show(
                "Please select an Excel import!"
            );

            return;
        }

        try {

            oTable.setBusy(true);

            // 2. Call backend action
            const oOperation = oModel.bindContext(
                "/loadImportData(...)"
            );

            oOperation.setParameter(
                "importID",
                sImportID
            );

            await oOperation.execute();

            // 3. Get backend response
            const oResult = oOperation
                .getBoundContext()
                .getObject();

            const sJsonData = typeof oResult === "string"
                ? oResult
                : oResult?.value;

            if (typeof sJsonData !== "string") {
                throw new Error(
                    "Invalid response received from backend."
                );
            }

            // 4. Parse JSON response
            const oExcelData = JSON.parse(sJsonData);

            // 5. Create dynamic table
            this._buildDynamicTable(oExcelData);

            MessageToast.show(
                "Excel data successfully loaded!"
            );

        } catch (oError) {

            console.error(
                "Excel loading error:",
                oError
            );

            MessageBox.error(
                oError.message ||
                "An error occurred while loading Excel data."
            );

        } finally {

            oTable.setBusy(false);

        }

    },

    _buildDynamicTable: function (oExcelData) {

        const oTable = this.byId("importedDataTable");

        const oTableModel = this.getView().getModel("table");

        const aHeaders = oExcelData.headers;

        const aRows = oExcelData.rows;

        // 1. Validate received data
        if (
            !Array.isArray(aHeaders) ||
            !Array.isArray(aRows)
        ) {
            throw new Error(
                "Invalid Excel table structure."
            );
        }

        // 2. Remove previous table content
        oTable.unbindItems();

        oTable.destroyItems();

        oTable.destroyColumns();

        // 3. Create dynamic columns
        aHeaders.forEach(sHeader => {

            const oColumn = new Column({
                header: new Text({
                    text: String(sHeader)
                }),
                width: "12rem"
            });

            oTable.addColumn(oColumn);

        });

        // 4. Transform rows for frontend display
        const aDisplayRows = aRows.map(aRow => {

            if (!Array.isArray(aRow)) {
                throw new Error(
                    "Invalid Excel row structure."
                );
            }

            return {
                cells: aHeaders.map((sHeader, i) =>
                    this._formatCellValue(aRow[i])
                )
            };

        });

        // 5. Update JSONModel
        oTableModel.setData({

            filename: oExcelData.filename,

            totalRows: oExcelData.totalRows ?? aDisplayRows.length,

            rows: aDisplayRows

        });

        // 6. Create dynamic table cells
        const aCells = aHeaders.map((sHeader, i) => {

            const oCell = new Text({
                wrapping: false
            });

            oCell.bindProperty("text", {
                path: "table>cells/" + i
            });

            return oCell;

        });

        // 7. Create row template
        const oRowTemplate = new ColumnListItem({
            cells: aCells
        });

        // 8. Bind JSONModel data to table
        oTable.bindItems({

            path: "table>/rows",

            template: oRowTemplate,

            templateShareable: false

        });

    },

    _formatCellValue: function (vValue) {

        // Handle empty values
        if (
            vValue === null ||
            vValue === undefined
        ) {
            return "";
        }

        // Handle Boolean values
        if (typeof vValue === "boolean") {
            return vValue ? "true" : "false";
        }

        // Format ISO date values
        if (
            typeof vValue === "string" &&
            /^\d{4}-\d{2}-\d{2}T/.test(vValue)
        ) {

            const oDate = new Date(vValue);

            if (!Number.isNaN(oDate.getTime())) {
                return oDate.toLocaleDateString();
            }

        }

        // Convert all other values to strings
        return String(vValue);

    },



    });
});
