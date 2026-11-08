const cds = require('@sap/cds');

const { SELECT, INSERT } = cds.ql;

const {
    validateConfiguration,
    validateHeaders,
    validateRow,
    normalizeRows
} = require('./validation');

class AdminService extends cds.ApplicationService {

    async init() {

        const {
            Imports,
            ColumnConfigurations
        } = this.entities;

        this.on('uploadExcel', async (req) => {

            const { data } = req.data;

            // 1. Input validation
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

            // 2. Basic structure validation
            if (
                typeof filename !== 'string' ||
                !filename.trim()
            ) {
                return req.reject(400, 'Filename is required.');
            }

            if (!Array.isArray(headers) || headers.length === 0) {
                return req.reject(400, 'No headers were provided.');
            }

            if (!Array.isArray(rows) || rows.length === 0) {
                return req.reject(400, 'The Excel file contains no data.');
            }

            // 3. Load column configuration
            const configuration = await SELECT
                .from(ColumnConfigurations)
                .orderBy('position');

            if (!configuration.length) {
                return req.reject(
                    400,
                    'No Excel column configuration was found.'
                );
            }

            // 4. Validate configuration
            const configurationErrors =
                validateConfiguration(configuration);

            if (configurationErrors.length > 0) {

                console.log(
                    'Configuration errors:',
                    configurationErrors
                );

                return req.reject(
                    400,
                    'Invalid Excel column configuration.'
                );
            }

            // 5. Validate Excel headers
            const headerErrors = validateHeaders(
                headers,
                configuration
            );

            if (headerErrors.length > 0) {

                console.log('Header errors:', headerErrors);

                return req.reject(
                    400,
                    `Excel header validation failed. ${headerErrors.length} error(s) found.`
                );
            }

            // 6. Validate rows and data types
            const validationErrors = [];

            rows.forEach((row, index) => {

                const rowNumber = index + 2;

                const rowErrors = validateRow(
                    row,
                    rowNumber,
                    configuration,
                    headers
                );

                validationErrors.push(...rowErrors);

            });

            if (validationErrors.length > 0) {

                console.log(
                    'Validation errors:',
                    validationErrors
                );

                return req.reject(
                    400,
                    `Excel validation failed. ${validationErrors.length} error(s) found.`
                );
            }

            // 7. Normalize rows according to configuration
            const normalizedRows = normalizeRows(
                rows,
                configuration
            );

            const normalizedHeaders = configuration.map(
                column => column.headerName
            );

            // 8. Save import
            const oImport = {
                ID: cds.utils.uuid(),
                filename,
                headers: JSON.stringify(normalizedHeaders),
                data: JSON.stringify(normalizedRows),
                totalRows: normalizedRows.length,
                createdAt: new Date()
            };

            await INSERT.into(Imports).entries(oImport);

            return `Successfully imported ${normalizedRows.length} record(s).`;
        });

        return super.init();
    }
}

module.exports = AdminService;
