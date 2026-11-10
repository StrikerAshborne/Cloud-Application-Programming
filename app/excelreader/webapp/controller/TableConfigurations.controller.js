sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox
) {

    "use strict";

    return Controller.extend(
        "ns.excelreader.controller.TableConfigurations",
        {


            // INITIALIZATION
            onInit: function () {

                const oConfigModel = new JSONModel({

                    ID: "",

                    name: "",

                    columns: []

                });


                this.getView().setModel(
                    oConfigModel,
                    "config"
                );

            },

            // ACTION RESULT HELPER
            _getActionResult: function (oOperation) {

                const oResult = oOperation
                    .getBoundContext()
                    .getObject();


                if (typeof oResult === "string") {
                    return oResult;
                }


                if (typeof oResult?.value === "string") {
                    return oResult.value;
                }


                throw new Error(
                    "Invalid response received from backend."
                );

            },


            // LOAD CONFIGURATION
            onSelectConfiguration: async function (oEvent) {

                const sConfigurationID =
                    oEvent.getSource().getSelectedKey();


                if (!sConfigurationID) {
                    return;
                }


                try {

                    const oModel =
                        this.getView().getModel();


                    const oOperation = oModel.bindContext(
                        "/loadTableConfiguration(...)"
                    );


                    oOperation.setParameter(
                        "configurationID",
                        sConfigurationID
                    );


                    await oOperation.execute();


                    const sJsonData =
                        this._getActionResult(oOperation);


                    const oConfiguration =
                        JSON.parse(sJsonData);


                    this.getView()
                        .getModel("config")
                        .setData(oConfiguration);


                } catch (oError) {

                    console.error(
                        "Configuration loading error:",
                        oError
                    );

                    MessageBox.error(
                        oError.message ||
                        "Failed to load configuration."
                    );

                }

            },


            // CREATE NEW CONFIGURATION
            onNewConfiguration: function () {

                const oModel =
                    this.getView().getModel("config");


                const oSelect = this.byId(
                    "tableConfigurationSelect"
                );


                oSelect.setSelectedKey("");


                oModel.setData({

                    ID: "",

                    name: "",

                    columns: [

                        {
                            headerName: "",
                            dataType: "String",
                            position: 1,
                            regexPattern: "",
                            regexReplacement: "$&"
                        }

                    ]

                });

            },

            // ADD COLUMN
            onAddColumn: function () {

                const oModel =
                    this.getView().getModel("config");


                const oData = oModel.getData();


                const newColumn = {

                    headerName: "",

                    dataType: "String",

                    position: oData.columns.length + 1,

                    regexPattern: "",

                    regexReplacement: "$&"

                };


                oData.columns.push(newColumn);


                oModel.setData(oData);

            },

            // REMOVE COLUMN
            onRemoveColumn: function (oEvent) {

                const oContext = oEvent.getSource()
                    .getBindingContext("config");


                if (!oContext) {
                    return;
                }


                const sPath = oContext.getPath();

                const iIndex = Number(
                    sPath.split("/").pop()
                );


                const oModel =
                    this.getView().getModel("config");


                const oData = oModel.getData();


                oData.columns.splice(iIndex, 1);


                // Recalculate positions
                oData.columns.forEach((column, index) => {

                    column.position = index + 1;

                });


                oModel.setData(oData);

            },


            // SAVE CONFIGURATION
            onSaveConfiguration: async function () {

                const oModel =
                    this.getView().getModel();


                const oConfigModel =
                    this.getView().getModel("config");


                const oData = oConfigModel.getData();


                // 1. Basic frontend validation
                if (
                    typeof oData.name !== "string" ||
                    !oData.name.trim()
                ) {

                    MessageToast.show(
                        "Please enter a configuration name."
                    );

                    return;
                }


                if (
                    !Array.isArray(oData.columns) ||
                    oData.columns.length === 0
                ) {

                    MessageToast.show(
                        "Please add at least one column."
                    );

                    return;
                }


                try {

                    // 2. Prepare column data
                    const aColumns = oData.columns.map(
                        column => ({

                            headerName: column.headerName,

                            dataType: column.dataType,

                            position: Number(column.position),

                            regexPattern: column.regexPattern ?? "",

                            regexReplacement: column.regexReplacement ?? "$&"

                        })
                    );

                    // 3. Call backend
                    const oOperation = oModel.bindContext(
                        "/saveTableConfiguration(...)"
                    );


                    oOperation.setParameter(
                        "configurationID",
                        oData.ID || null
                    );


                    oOperation.setParameter(
                        "name",
                        oData.name.trim()
                    );


                    oOperation.setParameter(
                        "columns",
                        JSON.stringify(aColumns)
                    );


                    await oOperation.execute();


                    // 4. Get saved configuration
                    const sJsonData =
                        this._getActionResult(oOperation);


                    const oSavedConfiguration =
                        JSON.parse(sJsonData);


                    // 5. Update frontend model
                    oConfigModel.setData(
                        oSavedConfiguration
                    );


                    // 6. Refresh configuration selector
                    const oSelect = this.byId(
                        "tableConfigurationSelect"
                    );


                    const oBinding =
                        oSelect.getBinding("items");


                    if (oBinding) {
                        oBinding.refresh();
                    }


                    oSelect.setSelectedKey(
                        oSavedConfiguration.ID
                    );


                    MessageToast.show(
                        "Configuration successfully saved!"
                    );


                } catch (oError) {

                    console.error(
                        "Configuration saving error:",
                        oError
                    );

                    MessageBox.error(
                        oError.message ||
                        "Failed to save configuration."
                    );

                }

            },

            // DELETE CONFIGURATION
            onDeleteConfiguration: function () {

                const oConfigModel =
                    this.getView().getModel("config");


                const oData = oConfigModel.getData();


                if (!oData.ID) {

                    MessageToast.show(
                        "Please select a configuration first."
                    );

                    return;
                }


                MessageBox.confirm(
                    "Are you sure you want to delete this configuration?",
                    {

                        title: "Delete Configuration",

                        actions: [
                            MessageBox.Action.OK,
                            MessageBox.Action.CANCEL
                        ],

                        onClose: async (sAction) => {

                            if (sAction !== MessageBox.Action.OK) {
                                return;
                            }


                            try {

                                const oModel =
                                    this.getView().getModel();


                                const oOperation = oModel.bindContext(
                                    "/deleteTableConfiguration(...)"
                                );


                                oOperation.setParameter(
                                    "configurationID",
                                    oData.ID
                                );


                                await oOperation.execute();


                                // Reset configuration model
                                oConfigModel.setData({

                                    ID: "",

                                    name: "",

                                    columns: []

                                });


                                // Refresh selector
                                const oSelect = this.byId(
                                    "tableConfigurationSelect"
                                );


                                oSelect.setSelectedKey("");


                                const oBinding =
                                    oSelect.getBinding("items");


                                if (oBinding) {
                                    oBinding.refresh();
                                }


                                MessageToast.show(
                                    "Configuration successfully deleted!"
                                );


                            } catch (oError) {

                                console.error(
                                    "Configuration deletion error:",
                                    oError
                                );

                                MessageBox.error(
                                    oError.message ||
                                    "Failed to delete configuration."
                                );

                            }

                        }

                    }
                );

            },

            // BACK TO MAIN PAGE
            onBackToMain: function () {

                this.getOwnerComponent()
                    .getRouter()
                    .navTo("main");

            }

        }
    );

});