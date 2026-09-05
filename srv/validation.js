const EXPECTED_HEADERS = [
                'NAME',
                'REFERENCEPURCHASEORDER',
                'POSTINGDATE',
                'REFERENCEPURCHASEORDERITEM',
                'ACCOUNTASSIGNMENTCATEGORY',
                'UNIT',
                'PERFORMANCEDATE',
                'PERFORMANCEENDDATE',
                'NETPRICE'
            ];


const MONTHS = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12'
};


function validateHeaders(actualHeaders) {

    const errors = [];

    const maxColumns = Math.max(
        EXPECTED_HEADERS.length,
        actualHeaders.length
    );

    for (let index = 0; index < maxColumns; index++) {

        const expected = EXPECTED_HEADERS[index];
        const actual = actualHeaders[index] ?? null;

        if (expected !== actual) {
            errors.push({
                column: index + 1,
                expected,
                actual
            });
        }
    }

    return errors;
}

function validateRow(row, rowNumber) {

    const errors = [];

    const name = row[0];
    const purchaseOrder = row[1];
    const postingDate = row[2];
    const item = row[3];
    const category = row[4];
    const unit = row[5];
    const performanceMonth = row[6];
    const performanceEndDate = row[7];
    const netPrice = row[8];

    if (typeof name !== 'string' ||
        !/^[A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű _-]+$/.test(name.trim())) {
        errors.push({
            row: rowNumber,
            column: 'NAME',
            message: 'NAME contains invalid characters.'
        });
    }

    if (!/^\d{10}$/.test(String(purchaseOrder ?? '').trim())) {
        errors.push({
            row: rowNumber,
            column: 'REFERENCEPURCHASEORDER',
            message: 'REFERENCEPURCHASEORDER must contain exactly 10 digits.'
        });
    }

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(
            String(postingDate ?? '').trim())) {
        errors.push({
            row: rowNumber,
            column: 'POSTINGDATE',
            message: 'POSTINGDATE must be in MM/DD/YYYY format.'
        });
    }

    if (!Number.isInteger(Number(item))) {
        errors.push({
            row: rowNumber,
            column: 'REFERENCEPURCHASEORDERITEM',
            message: 'REFERENCEPURCHASEORDERITEM must be an integer.'
        });
    }

    if (!['A', 'B', 'C'].includes(
        String(category ?? '').trim())) {
        errors.push({
            row: rowNumber,
            column: 'ACCOUNTASSIGNMENTCATEGORY',
            message: 'ACCOUNTASSIGNMENTCATEGORY must be A, B or C.'
        });
    }

    if (!['ÓRA', 'NAP'].includes(
        String(unit ?? '').trim())) {
        errors.push({
            row: rowNumber,
            column: 'UNIT',
            message: 'UNIT must be ÓRA or NAP.'
        });
    }

    if (!/^\d{4}\s+[A-Za-z]+$/.test(
        String(performanceMonth ?? '').trim())) {
        errors.push({
            row: rowNumber,
            column: 'PERFORMANCEDATE',
            message: 'PERFORMANCEDATE must contain a year and month.'
        });
    }

    if (!/^\d{4}[./-]\w+[ .-]+\d{1,2}$/.test(
        String(performanceEndDate ?? '').trim())) {
        errors.push({
            row: rowNumber,
            column: 'PERFORMANCEENDDATE',
            message: 'PERFORMANCEENDDATE is invalid.'
        });
    }

    if (!Number.isInteger(Number(netPrice))) {
        errors.push({
            row: rowNumber,
            column: 'NETPRICE',
            message: 'NETPRICE must be an integer.'
        });
    }

    return errors;
}

function normalizePostingDate(value) {

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const match = value.trim().match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (!match) {
        return null;
    }

    const [, month, day, year] = match;

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    if (
        date.getFullYear() !== Number(year) ||
        date.getMonth() !== Number(month) - 1 ||
        date.getDate() !== Number(day)
    ) {
        return null;
    }

    return date;
}


function normalizePerformanceMonth(value) {

    if (typeof value !== 'string') {
        return null;
    }

    const match = value
        .trim()
        .toLowerCase()
        .match(/^(\d{4})\s+([a-z]+)$/);

    if (!match) {
        return null;
    }

    const [, year, monthName] = match;

    const month = MONTHS[monthName];

    if (!month) {
        return null;
    }

    return `${year}-${month}`;
}

function normalizePerformanceEndDate(value) {

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const match = value
        .trim()
        .toLowerCase()
        .match(
            /^(\d{4})[.\s-]+([a-z]+)[.\s-]+(\d{1,2})$/
        );

    if (!match) {
        return null;
    }

    const [, year, monthName, day] = match;

    const month = MONTHS[monthName];

    if (!month) {
        return null;
    }

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

function validatePerformanceDateRelation(performanceDate,performanceEndDate) {

    if (!performanceDate || !performanceEndDate) {
        return false;
    }

    const year = performanceEndDate.getFullYear();
    const month = String(
        performanceEndDate.getMonth() + 1
    ).padStart(2, '0');

    return `${year}-${month}` === performanceDate;
}

module.exports = {
    EXPECTED_HEADERS,
    validateHeaders,
    validateRow,
    normalizePostingDate,
    normalizePerformanceMonth,
    normalizePerformanceEndDate,
    validatePerformanceDateRelation
};