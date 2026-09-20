sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/ui/unified/FileUploader",
    "sap/m/MessageToast",
    "sap/m/VBox"
], function (
    Dialog,
    Button,
    FileUploader,
    MessageToast,
    VBox
) {
    "use strict";

    return {

        onUploadExcel: function () {

            console.log(">>> onUploadExcel MEGHÍVVA <<<");

            const oModel = this.getView().getModel();

            const oFileUploader = new FileUploader({
                width: "100%",
                fileType: ["xlsx", "xls"],
                placeholder: "Choose an excel file"
            });

            const oDialog = new Dialog({
                title: "Upload excel file",
                contentWidth: "400px",

                content: new VBox({
                    width: "100%",
                    class: "sapUiSmallMargin",
                    items: [
                        oFileUploader
                    ]
                }),

                beginButton: new Button({
                    text: "Upload",
                    type: "Emphasized",

                    press: async function () {

                        const oFile = oFileUploader.getFocusDomRef()?.files?.[0];

                        if (!oFile) {
                            MessageToast.show("Please choose an excel file!");
                            return;
                        }

                        try {

                            MessageToast.show(
                                "Processing file..."
                            );

                            const oArrayBuffer = await oFile.arrayBuffer();


                            const sBase64 = this._arrayBufferToBase64(oArrayBuffer);

                            const oOperation =
                                oModel.bindContext(
                                    "/uploadExcel(...)"
                                );

                            oOperation.setParameter(
                                "file",
                                sBase64
                            );

                            oOperation.setParameter(
                                "filename",
                                oFile.name
                            );

                            await oOperation.execute();

                            MessageToast.show(
                                "The excel file has been succesfully uploaded!"
                            );

                            oDialog.close();

                        } catch (oError) {
                            MessageToast.show(
                                "An "
                            );
                        }
                    }.bind(this)
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
        _arrayBufferToBase64: function (oArrayBuffer) {

            let sBinary = "";

            const aBytes =
                new Uint8Array(oArrayBuffer);

            const iChunkSize = 0x8000;

            for (
                let i = 0;
                i < aBytes.length;
                i += iChunkSize
            ) {

                const aChunk =
                    aBytes.subarray(
                        i,
                        Math.min(
                            i + iChunkSize,
                            aBytes.length
                        )
                    );

                sBinary += String.fromCharCode.apply(
                    null,
                    aChunk
                );
            }

            return btoa(sBinary);
        }

    };
});