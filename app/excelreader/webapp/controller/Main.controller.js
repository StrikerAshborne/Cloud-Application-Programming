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
    "xlsx",
    "sap/ui/core/CustomData"
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
    XLSX,
    CustomData
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
                "table");

            // Refresh configurations when returning to main page
            this.getOwnerComponent()
                .getRouter()
                .getRoute("main")
                .attachPatternMatched(
                    this._onMainRouteMatched,
                    this);
        },

        _onMainRouteMatched: function () {

            const oConfigurationSelect =
                this.byId("configurationSelect");

            if (!oConfigurationSelect) {
                return;
            }


            const oBinding =
                oConfigurationSelect.getBinding("items");


            if (oBinding) {
                oBinding.refresh();
            }

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

            const oImportSelect = this.byId("importSelect");

            const oConfigurationSelect =
                this.byId("configurationSelect");

            const oTable = this.byId("importedDataTable");


            const sImportID =
                oImportSelect.getSelectedKey();

            const sConfigurationID =
                oConfigurationSelect.getSelectedKey();


            // 1. Check selections
            if (!sImportID) {

                MessageToast.show(
                    "Please select an Excel import!"
                );

                return;
            }


            if (!sConfigurationID) {

                MessageToast.show(
                    "Please select a table configuration!"
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


                oOperation.setParameter(
                    "configurationID",
                    sConfigurationID
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


                // 4. Parse response
                const oExcelData = JSON.parse(sJsonData);


                // 5. Build table
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

            const oTableModel =
                this.getView().getModel("table");

            const aHeaders = oExcelData.headers;

            const aRows = oExcelData.rows;


            // 1. Validate received structure
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


            // 3. Create dynamic columns with header validation
            aHeaders.forEach((sHeader, index) => {

                const bHeaderValid =
                    Array.isArray(oExcelData.headerValid) &&
                    oExcelData.headerValid[index] === true;

                const oHeaderText = new Text({
                    text: String(sHeader),
                    wrapping: false
                });

                // Add header validation state
                oHeaderText.addCustomData(new CustomData({
                    key: "headerstate",
                    writeToDom: true,
                    value: bHeaderValid ? "valid" : "invalid"
                }));

                oHeaderText.addStyleClass("excelReaderHeader");

                const oColumn = new Column({

                    header: oHeaderText,

                    width: "12rem"

                });

                oTable.addColumn(oColumn);

            });


            // 4. Transform rows for frontend display
            const aDisplayRows = aRows.map(oRow => {

                if (
                    !oRow ||
                    !Array.isArray(oRow.cells)
                ) {
                    throw new Error(
                        "Invalid Excel row structure."
                    );
                }


                return {

                    cells: aHeaders.map((sHeader, index) => {

                        const oCell = oRow.cells[index] || {};

                        const vValue = oCell.value;

                        const bEmpty =
                            vValue === null ||
                            vValue === undefined ||
                            (
                                typeof vValue === "string" &&
                                vValue.trim() === ""
                            );

                        return {

                            value: this._formatCellValue(vValue),

                            valid: oCell.valid === true,

                            cellState:
                                oCell.valid === true && !bEmpty
                                    ? "valid"
                                    : "invalid"

                        };

                    })

                };

            });


            // 5. Update JSONModel
            oTableModel.setData({

                filename: oExcelData.filename,

                totalRows:
                    oExcelData.totalRows ?? aDisplayRows.length,

                rows: aDisplayRows

            });


            // 6. Create dynamic table cells
            const aCells = aHeaders.map((sHeader, index) => {

                const oCell = new Text({
                    wrapping: false
                });

                // Bind cell value
                oCell.bindProperty("text", {
                    path: "table>cells/" + index + "/value"
                });

                // Create CustomData for CSS styling
                const oCellState = new CustomData({
                    key: "cellstate",
                    writeToDom: true
                });

                // Bind validation state
                oCellState.bindProperty("value", {
                    path: "table>cells/" + index + "/cellState"
                });

                oCell.addCustomData(oCellState);

                // Add CSS class
                oCell.addStyleClass("excelReaderCell");

                return oCell;

            });


            // 7. Create row template
            const oRowTemplate = new ColumnListItem({

                cells: aCells

            });


            // 8. Bind JSONModel to table
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

        onNavigateToConfigurations: function () {

            this.getOwnerComponent()
                .getRouter()
                .navTo("configurations");

        },

    });
});
