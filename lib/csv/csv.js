const fs = require('fs');
const fastCsv = require('fast-csv');
const dayjs = require('dayjs');
const StreamBuf = require('../utils/stream-buf');

const {fs: {exists}} = require('../utils/utils');

/* eslint-disable quote-props */
const SpecialValues = {
  true: true,
  false: false,
  '#N/A': {error: '#N/A'},
  '#REF!': {error: '#REF!'},
  '#NAME?': {error: '#NAME?'},
  '#DIV/0!': {error: '#DIV/0!'},
  '#NULL!': {error: '#NULL!'},
  '#VALUE!': {error: '#VALUE!'},
  '#NUM!': {error: '#NUM!'},
};
/* eslint-ensable quote-props */

class CSV {
  constructor(workbook) {
    this.workbook = workbook;
    this.worksheet = null;
  }

  async readFile(filename, options) {
    options = options || {};
    if (!(await exists(filename))) {
      throw new Error(`File not found: ${filename}`);
    }
    const stream = fs.createReadStream(filename);
    const worksheet = await this.read(stream, options);
    stream.close();
    return worksheet;
  }

  read(stream, options) {
    options = options || {};
    return new Promise((resolve, reject) => {
      const csvStream = this.createInputStream(options)
        .on('worksheet', resolve)
        .on('error', reject);

      stream.pipe(csvStream);
    });
  }

  createInputStream(options) {
    options = options || {};
    const worksheet = this.workbook.addWorksheet(options.sheetName);

    const dateFormats = options.dateFormats || [dayjs.ISO_8601, 'MM-DD-YYYY', 'YYYY-MM-DD'];
    const map =
      options.map ||
      function(datum) {
        if (datum === '') {
          return null;
        }
        const datumNumber = Number(datum);
        if (!Number.isNaN(datumNumber) && datumNumber !== Infinity) {
          return datumNumber;
        }
        const dt = dayjs(datum, dateFormats, true);
        if (dt.isValid()) {
          return new Date(dt.valueOf());
        }
        const special = SpecialValues[datum];
        if (special !== undefined) {
          return special;
        }
        return datum;
      };

    const csvStream = fastCsv.parse(options)
      .on('data', data => {
        worksheet.addRow(data.map(map));
      })
      .on('end', () => {
        csvStream.emit('worksheet', worksheet);
      });
    return csvStream;
  }

  write(stream, options) {
    return new Promise((resolve, reject) => {
      options = options || {};
      // const encoding = options.encoding || 'utf8';
      // const separator = options.separator || ',';
      // const quoteChar = options.quoteChar || '\'';

      const worksheet = this.workbook.getWorksheet(options.sheetName || options.sheetId);

      const csvStream = fastCsv.format(options);
      stream.on('finish', () => {
        resolve();
      });
      csvStream.on('error', reject);
      csvStream.pipe(stream);

      const {dateFormat, dateUTC} = options;
      const map =
        options.map ||
        (value => {
          if (value) {
            if (value.text || value.hyperlink) {
              return value.hyperlink || value.text || '';
            }
            if (value.formula || value.result) {
              return value.result || '';
            }
            if (value instanceof Date) {
              if (dateFormat) {
                return dateUTC ? dayjs.utc(value).format(dateFormat) : dayjs(value).format(dateFormat);
              }
              return dateUTC ? dayjs.utc(value).format() : dayjs(value).format();
            }
            if (value.error) {
              return value.error;
            }
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
          }
          return value;
        });

      const includeEmptyRows = options.includeEmptyRows === undefined || options.includeEmptyRows;
      let lastRow = 1;
      if (worksheet) {
        worksheet.eachRow((row, rowNumber) => {
          if (includeEmptyRows) {
            while (lastRow++ < rowNumber - 1) {
              csvStream.write([]);
            }
          }
          const {values} = row;
          values.shift();
          csvStream.write(values.map(map));
          lastRow = rowNumber;
        });
      }
      csvStream.end();
    });
  }

  writeFile(filename, options) {
    options = options || {};

    const streamOptions = {
      encoding: options.encoding || 'utf8',
    };
    const stream = fs.createWriteStream(filename, streamOptions);

    return this.write(stream, options);
  }

  async writeBuffer(options) {
    const stream = new StreamBuf();
    await this.write(stream, options);
    return stream.read();
  }
}

module.exports = CSV;
