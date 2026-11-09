const cds = require('@sap/cds');

const { SELECT, INSERT, UPDATE, DELETE } = cds.ql;

const {
    validateConfiguration,
    validateDataType,
    isEmptyValue,
    normalizeRows
} = require('./validation');

class AdminService extends cds.ApplicationService {

    async init() {

        const {
            Imports,
            TableConfigurations,
            TableConfigurationColumns
        } = this.entities;

        this.on('uploadExcel', async (req) => {

            const { data } = req.data;

            // 1. Check input
            if (!data) {
                return req.reject(400, 'No Excel data was provided.');
            }

            let oExcelData;

            try {
                oExcelData = JSON.parse(data);
            } catch (error) {
                return req.reject(400, 'Invalid JSON format.');
            }


            const {
                filename,
                headers,
                data: rows
            } = oExcelData;


            // 2. Basic structure checks
            if (
                typeof filename !== 'string' ||
                !filename.trim()
            ) {
                return req.reject(400, 'Filename is required.');
            }


            if (
                !Array.isArray(headers) ||
                headers.length === 0 ||
                headers.some(header =>
                    typeof header !== 'string' || !header.trim()
                )
            ) {
                return req.reject(400, 'Invalid Excel headers.');
            }


            if (!Array.isArray(rows) || rows.length === 0) {
                return req.reject(400, 'The Excel file contains no data.');
            }


            // 3. Check row structures
            const invalidRow = rows.some(row =>
                typeof row !== 'object' ||
                row === null ||
                Array.isArray(row)
            );

            if (invalidRow) {
                return req.reject(400, 'Invalid Excel row structure.');
            }


            // 4. Normalize Excel rows
            const normalizedRows = normalizeRows(
                rows,
                headers
            );


            // 5. Prepare import data
            const oImport = {

                ID: cds.utils.uuid(),

                filename,

                headers: JSON.stringify(headers),

                data: JSON.stringify(normalizedRows),

                totalRows: normalizedRows.length,

                createdAt: new Date()

            };


            // 6. Save import
            await INSERT.into(Imports).entries(oImport);

            return `Successfully imported ${normalizedRows.length} record(s).`;

        });

        this.on('loadImportData', async (req) => {

            const {
                importID,
                configurationID
            } = req.data;


            // 1. Check IDs
            if (!importID) {
                return req.reject(400, 'Import ID is required.');
            }

            if (!configurationID) {
                return req.reject(400, 'Table configuration ID is required.');
            }


            // 2. Load selected import
            const oImport = await SELECT.one
                .from(Imports)
                .where({ ID: importID });


            if (!oImport) {
                return req.reject(404, 'The selected import was not found.');
            }


            // 3. Load selected table configuration
            const oConfiguration = await SELECT.one
                .from(TableConfigurations)
                .where({ ID: configurationID });


            if (!oConfiguration) {
                return req.reject(
                    404,
                    'The selected table configuration was not found.'
                );
            }


            // 4. Load configuration columns
            const aConfigurationColumns = await SELECT
                .from(TableConfigurationColumns)
                .where({
                    parent_ID: configurationID
                })
                .orderBy('position');


            // 5. Validate configuration
            const configurationErrors =
                validateConfiguration(aConfigurationColumns);

            if (configurationErrors.length > 0) {

                console.error(
                    'Table configuration errors:',
                    configurationErrors
                );

                return req.reject(
                    400,
                    'The selected table configuration is invalid.'
                );
            }


            // 6. Parse stored Excel data
            let aHeaders;
            let aRows;

            try {

                aHeaders = JSON.parse(oImport.headers);
                aRows = JSON.parse(oImport.data);

            } catch (error) {

                console.error('Import data parsing error:', error);

                return req.reject(
                    500,
                    'The stored Excel data could not be parsed.'
                );

            }


            if (
                !Array.isArray(aHeaders) ||
                !Array.isArray(aRows)
            ) {
                return req.reject(
                    500,
                    'The stored Excel data has an invalid structure.'
                );
            }


            // 7. Create normalized header maps
            const normalizeHeader = header =>
                header.trim().toLowerCase();


            const configurationMap = new Map(
                aConfigurationColumns.map(column => [
                    normalizeHeader(column.headerName),
                    column
                ])
            );


            const uploadedHeaderMap = new Map(
                aHeaders.map(header => [
                    normalizeHeader(header),
                    header
                ])
            );


            // 8. Create table headers
            // Configuration columns come first, ordered by position.
            // Unknown Excel headers are appended afterwards.

            const aTableHeaders = [
                ...aConfigurationColumns.map(column =>
                    column.headerName
                ),

                ...aHeaders.filter(header =>
                    !configurationMap.has(
                        normalizeHeader(header)
                    )
                )
            ];

            // Validate table headers
            const aHeaderValid = aTableHeaders.map(sHeader => {

                const normalizedHeader = normalizeHeader(sHeader);

                return (
                    configurationMap.has(normalizedHeader) &&
                    uploadedHeaderMap.has(normalizedHeader)
                );

            });


            // 9. Transform and validate every cell
            const aTableRows = aRows.map(oRow => {

                const aCells = aTableHeaders.map(sHeader => {

                    const normalizedHeader =
                        normalizeHeader(sHeader);


                    // Find matching uploaded header
                    const originalHeader =
                        uploadedHeaderMap.get(normalizedHeader);


                    // Find matching configuration
                    const oColumnConfiguration =
                        configurationMap.get(normalizedHeader);


                    // Get cell value
                    const value = originalHeader !== undefined
                        ? oRow[originalHeader] ?? null
                        : null;


                    // Validate cell
                    let valid = false;

                    if (oColumnConfiguration) {

                        valid = isEmptyValue(value) ||
                            validateDataType(
                                value,
                                oColumnConfiguration.dataType
                            );

                    }


                    return {
                        value,
                        valid
                    };

                });


                return {
                    cells: aCells
                };

            });


            // 10. Prepare response
            const oTableData = {

                filename: oImport.filename,

                configurationName: oConfiguration.name,

                headers: aTableHeaders,

                headerValid: aHeaderValid,

                rows: aTableRows,

                totalRows: oImport.totalRows

            };


            // 11. Return JSON
            return JSON.stringify(oTableData);

        });

        this.on('loadTableConfiguration', async (req) => {

            const { configurationID } = req.data;

            if (!configurationID) {
                return req.reject(400, 'Configuration ID is required.');
            }

            const oConfiguration = await SELECT.one
                .from(TableConfigurations)
                .where({ ID: configurationID });

            if (!oConfiguration) {
                return req.reject(404, 'Configuration not found.');
            }

            const aColumns = await SELECT
                .from(TableConfigurationColumns)
                .where({ parent_ID: configurationID })
                .orderBy('position');

            return JSON.stringify({
                ID: oConfiguration.ID,
                name: oConfiguration.name,
                columns: aColumns.map(column => ({
                    ID: column.ID,
                    headerName: column.headerName,
                    dataType: column.dataType,
                    position: column.position
                }))
            });

        });

        this.on('saveTableConfiguration', async (req) => {

            const {
                configurationID,
                name,
                columns
            } = req.data;


            if (typeof name !== 'string' || !name.trim()) {
                return req.reject(400, 'Configuration name is required.');
            }


            let aColumns;

            try {
                aColumns = JSON.parse(columns);
            } catch (error) {
                return req.reject(400, 'Invalid column configuration JSON.');
            }


            // Validate column configuration
            const errors = validateConfiguration(aColumns);

            if (errors.length > 0) {
                return req.reject(400, 'Invalid column configuration.');
            }


            let sConfigurationID = configurationID;


            // Update existing configuration
            if (sConfigurationID) {

                const oExisting = await SELECT.one
                    .from(TableConfigurations)
                    .where({ ID: sConfigurationID });

                if (!oExisting) {
                    return req.reject(404, 'Configuration not found.');
                }

                await UPDATE(TableConfigurations)
                    .set({
                        name: name.trim()
                    })
                    .where({
                        ID: sConfigurationID
                    });


                // Replace existing columns
                await DELETE.from(TableConfigurationColumns)
                    .where({
                        parent_ID: sConfigurationID
                    });

            } else {

                // Create new configuration
                sConfigurationID = cds.utils.uuid();

                await INSERT.into(TableConfigurations).entries({
                    ID: sConfigurationID,
                    name: name.trim()
                });

            }


            // Save all column configurations
            const aNewColumns = aColumns.map(column => ({

                ID: cds.utils.uuid(),

                parent_ID: sConfigurationID,

                headerName: column.headerName.trim(),

                dataType: column.dataType,

                position: Number(column.position)

            }));


            await INSERT.into(TableConfigurationColumns)
                .entries(aNewColumns);


            return JSON.stringify({

                ID: sConfigurationID,

                name: name.trim(),

                columns: aNewColumns

            });

        });

        this.on('deleteTableConfiguration', async (req) => {

            const { configurationID } = req.data;

            if (!configurationID) {
                return req.reject(400, 'Configuration ID is required.');
            }


            const oConfiguration = await SELECT.one
                .from(TableConfigurations)
                .where({ ID: configurationID });

            if (!oConfiguration) {
                return req.reject(404, 'Configuration not found.');
            }


            await DELETE.from(TableConfigurationColumns)
                .where({
                    parent_ID: configurationID
                });


            await DELETE.from(TableConfigurations)
                .where({
                    ID: configurationID
                });


            return 'Configuration successfully deleted.';

        });

        return super.init();
    }
}

module.exports = AdminService;
