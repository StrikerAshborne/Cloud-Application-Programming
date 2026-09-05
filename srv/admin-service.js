const cds = require('@sap/cds');
const XLSX = require('xlsx');
const {
    validateHeaders,
    validateRow,
    normalizePostingDate,
    normalizePerformanceMonth,
    normalizePerformanceEndDate,
    validatePerformanceDateRelation
} = require('./validation');

class AdminService extends cds.ApplicationService {

    async init() {

        const { Purchases } = this.entities;

        this.on('uploadExcel', async req => {

            if (!filename) {
                return req.reject(400, 'Filename is required.');
            }

            if (!filename.toLowerCase().endsWith('.xlsx')) {
                return req.reject(400, 'Only .xlsx files are supported.');
            }

            if (!file) {
                return req.reject(400, 'No file was provided.');
            }

            const workbook = XLSX.read(Buffer.from(file), {
                type: 'buffer',
                cellDates: true
            });

            if (!workbook.SheetNames.length) {
                return req.reject(400, 'The Excel file contains no worksheets.');
            }

            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];

            const rows = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: null,
                raw: true
            });

            if (!rows.length) {
                return req.reject(400, 'The Excel worksheet is empty.');
            }

            const Headers = rows[0];

            const headerErrors = validateHeaders(Headers);

            if (headerErrors.length > 0) {

                console.log('Header errors:', headerErrors);

                return req.reject(
                    400,
                    'The Excel headers are invalid.'
                );
            }

            const dataRows = rows.slice(1);

            const validationErrors = [];
            const records = [];

            dataRows.forEach((row, index) => {

                const rowNumber = index + 2;

                const rowErrors = validateRow(
                    row,
                    rowNumber
                );

                validationErrors.push(...rowErrors);

                const postingDate =
                    normalizePostingDate(row[2]);

                const performanceDate =
                    normalizePerformanceMonth(row[6]);

                const performanceEndDate =
                    normalizePerformanceEndDate(row[7]);

                if (
                    performanceDate &&
                    performanceEndDate &&
                    !validatePerformanceDateRelation(
                        performanceDate,
                        performanceEndDate
                    )
                ) {
                    validationErrors.push({
                        row: rowNumber,
                        column: 'PERFORMANCEENDDATE',
                        message:'PERFORMANCEENDDATE must be in the same month as PERFORMANCEDATE.'
                    });
                }

                records.push({
                    ID: cds.utils.uuid(),
                    name: String(row[0] ?? '').trim(),
                    referencePurchaseOrder:String(row[1] ?? '').trim(),
                    postingDate,
                    referencePurchaseOrderItem:Number(row[3]),
                    accountAssignmentCategory:String(row[4] ?? '').trim(),
                    unit:String(row[5] ?? '').trim(),
                    performanceDate,
                    performanceEndDate,
                    netPrice:Number(row[8])
                });
            });

            if (validationErrors.length > 0) {

                console.log('Validation errors:', validationErrors);

                return req.reject(400,`Excel validation failed. ${validationErrors.length} error(s) found.`);
            }

            await DELETE.from(Purchases);

            await INSERT.into(Purchases).entries(records);

            return `Successfully imported ${records.length} record(s).`;
        });

        return super.init();
    }
};

module.exports = AdminService