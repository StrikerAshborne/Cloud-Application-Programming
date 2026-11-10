const ALLOWED_DATA_TYPES = [
    'String',
    'Integer',
    'Decimal',
    'Boolean',
    'Date'
];


/**
 * Validates a table configuration.
 */
function validateConfiguration(configuration) {

    const errors = [];

    if (
        !Array.isArray(configuration) ||
        configuration.length === 0
    ) {
        return [{
            message: 'At least one column configuration is required.'
        }];
    }

    const seenHeaders = new Set();
    const seenPositions = new Set();

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

        const normalizedHeader =
            column.headerName.trim().toLowerCase();

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

        if (
            column.regexPattern !== undefined &&
            column.regexPattern !== null &&
            typeof column.regexPattern !== 'string'
        ) {
            errors.push({
                column: column.headerName,
                message: 'Regex pattern must be a string.'
            });
        }

        if (
            column.regexReplacement !== undefined &&
            column.regexReplacement !== null &&
            typeof column.regexReplacement !== 'string'
        ) {
            errors.push({
                column: column.headerName,
                message: 'Regex replacement must be a string.'
            });
        }


        const position = Number(column.position);

        if (
            !Number.isInteger(position) ||
            position <= 0
        ) {
            errors.push({
                column: column.headerName,
                message: 'Position must be a positive integer.'
            });

        } else {

            if (seenPositions.has(position)) {
                errors.push({
                    column: column.headerName,
                    message: 'Duplicate column position.'
                });
            }

            seenPositions.add(position);

        }

    });

    return errors;
}


/**
 * Checks whether a value is empty.
 */
function isEmptyValue(value) {

    return (
        value === null ||
        value === undefined ||
        value === ''
    );
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

            const date = new Date(
                Date.UTC(year, month - 1, day)
            );

            return (
                date.getUTCFullYear() === year &&
                date.getUTCMonth() === month - 1 &&
                date.getUTCDate() === day &&
                !Number.isNaN(Date.parse(value))
            );
        }


        default:
            return false;
    }
}

/**
 * Applies regex formatting to a cell value.
 *
 * If the pattern is missing or invalid,
 * the original value is returned.
 */
function applyRegexFormatting(
    value,
    regexPattern,
    regexReplacement
) {

    // Empty values should remain unchanged
    if (value === null || value === undefined) {
        return {
            value,
            changed: false
        };
    }

    // No regex provided
    if (
        typeof regexPattern !== 'string' ||
        regexPattern.length === 0
    ) {
        return {
            value,
            changed: false
        };
    }

    try {

        // Apply globally to every match
        const regex = new RegExp(regexPattern, 'g');

        // Convert the original value to a string
        const originalText = String(value);

        // Default replacement: preserve the matched text
        const replacement =
            typeof regexReplacement === 'string'
                ? regexReplacement
                : '$&';

        // Format the value
        const formattedText = originalText.replace(
            regex,
            replacement
        );

        return {
            value: formattedText,
            changed: formattedText !== originalText
        };

    } catch (error) {

        // Invalid regex: keep the original value
        return {
            value,
            changed: false
        };

    }
}

/**
 * Normalizes Excel rows without validating their values.
 *
 * Missing headers are filled with null.
 */
function normalizeRows(rows, headers) {

    return rows.map(row => {

        const normalizedRow = {};

        headers.forEach(header => {

            normalizedRow[header] =
                Object.prototype.hasOwnProperty.call(row, header)
                    ? row[header]
                    : null;

        });

        return normalizedRow;

    });
}


module.exports = {
    validateConfiguration,
    validateDataType,
    isEmptyValue,
    normalizeRows,
    applyRegexFormatting
};