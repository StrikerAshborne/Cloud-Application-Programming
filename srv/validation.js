
const ALLOWED_DATA_TYPES = [
    'String',
    'Integer',
    'Decimal',
    'Boolean',
    'Date'
];


/**
 * Validates the column configuration.
 */
function validateConfiguration(configuration) {

    const errors = [];

    if (!Array.isArray(configuration) || configuration.length === 0) {
        return [{
            message: 'No column configuration was found.'
        }];
    }

    const seenHeaders = new Set();

    configuration.forEach((column, index) => {

        if (
            typeof column.headerName !== 'string' ||
            !column.headerName.trim()
        ) {
            errors.push({
                column: index + 1,
                message: 'Header name cannot be empty.'
            });

            return;
        }

        const normalizedHeader = column.headerName.trim().toLowerCase();

        if (seenHeaders.has(normalizedHeader)) {
            errors.push({
                column: column.headerName,
                message: 'Duplicate configured header.'
            });
        }

        seenHeaders.add(normalizedHeader);

        if (!ALLOWED_DATA_TYPES.includes(column.dataType)) {
            errors.push({
                column: column.headerName,
                message: `Unsupported data type: ${column.dataType}.`
            });
        }

    });

    return errors;
}


/**
 * Validates Excel headers against configuration.
 *
 * Missing configured headers are allowed.
 * Unknown Excel headers are not allowed.
 */
function validateHeaders(headers, configuration) {

    const errors = [];

    if (!Array.isArray(headers) || headers.length === 0) {
        return [{
            message: 'No headers were provided.'
        }];
    }

    const normalizedHeaders = headers.map(header =>
        typeof header === 'string'
            ? header.trim().toLowerCase()
            : ''
    );

    // Check empty headers
    headers.forEach((header, index) => {

        if (
            typeof header !== 'string' ||
            !header.trim()
        ) {
            errors.push({
                column: index + 1,
                message: 'Header cannot be empty.'
            });
        }

    });

    // Check duplicate Excel headers
    const seenHeaders = new Set();

    normalizedHeaders.forEach((header, index) => {

        if (!header) {
            return;
        }

        if (seenHeaders.has(header)) {
            errors.push({
                column: index + 1,
                header: headers[index],
                message: 'Duplicate Excel header.'
            });
        }

        seenHeaders.add(header);

    });

    // Check unknown Excel headers
    const configuredHeaders = new Set(
        configuration.map(column =>
            column.headerName.trim().toLowerCase()
        )
    );

    headers.forEach((header, index) => {

        if (
            typeof header === 'string' &&
            header.trim() &&
            !configuredHeaders.has(header.trim().toLowerCase())
        ) {
            errors.push({
                column: index + 1,
                header,
                message: 'Unknown column header.'
            });
        }

    });

    return errors;
}


/**
 * Validates a value against a configured data type.
 */
function validateDataType(value, dataType) {

    switch (dataType) {

        case 'String':
            return typeof value === 'string';

        case 'Integer':
            return (
                typeof value === 'number' &&
                Number.isInteger(value)
            );

        case 'Decimal':
            return (
                typeof value === 'number' &&
                Number.isFinite(value)
            );

        case 'Boolean':
            return typeof value === 'boolean';

        case 'Date': {

            if (typeof value !== 'string') {
                return false;
            }

            if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
                return false;
            }

            const [year, month, day] = value
                .slice(0, 10)
                .split('-')
                .map(Number);

            const date = new Date(Date.UTC(year, month - 1, day));

            return (
                date.getUTCFullYear() === year &&
                date.getUTCMonth() === month - 1 &&
                date.getUTCDate() === day &&
                !isNaN(Date.parse(value))
            );
        }

        default:
            return false;
    }
}


/**
 * Validates a single Excel row.
 */
function validateRow(row, rowNumber, configuration, headers) {

    const errors = [];

    if (
        typeof row !== 'object' ||
        row === null ||
        Array.isArray(row)
    ) {
        return [{
            row: rowNumber,
            message: 'Invalid row format.'
        }];
    }

    // Check whether all uploaded headers exist in the row
    headers.forEach(header => {

        if (!Object.prototype.hasOwnProperty.call(row, header)) {

            errors.push({
                row: rowNumber,
                column: header,
                message: 'Missing column value.'
            });

        }

    });

    // Validate configured data types
    configuration.forEach(column => {

        const normalizedColumnName =
            column.headerName.trim().toLowerCase();

        const matchingKey = Object.keys(row).find(key =>
            key.trim().toLowerCase() === normalizedColumnName
        );

        // Missing configured columns are allowed
        if (matchingKey === undefined) {
            return;
        }

        const value = row[matchingKey];

        // Empty values are allowed for now
        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return;
        }

        if (!validateDataType(value, column.dataType)) {

            errors.push({
                row: rowNumber,
                column: column.headerName,
                value,
                message: `Invalid data type. Expected ${column.dataType}.`
            });

        }

    });

    return errors;
}



/**
 * Normalizes Excel rows according to configuration.
 *
 * Missing configured columns are added with null values.
 * Header names are replaced with their configured names.
 */
function normalizeRows(rows, configuration) {

    return rows.map(row => {

        const normalizedRow = {};

        configuration.forEach(column => {

            const normalizedColumnName =
                column.headerName.trim().toLowerCase();

            const matchingKey = Object.keys(row).find(key =>
                key.trim().toLowerCase() === normalizedColumnName
            );

            normalizedRow[column.headerName] =
                matchingKey !== undefined
                    ? row[matchingKey]
                    : null;

        });

        return normalizedRow;
    });
}


module.exports = {
    validateConfiguration,
    validateHeaders,
    validateRow,
    validateDataType,
    normalizeRows
};