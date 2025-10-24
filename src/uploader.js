const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { splitCsvLine, rowToNestedObject, mapToDbRow } = require('./parser');
const { insertUsersBatch } = require('./db');

async function processCsvFile(filePath, options = {}) {
  const batchSize = options.batchSize || parseInt(process.env.BATCH_SIZE || '500', 10);

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  let lineNo = 0;
  let batch = [];
  let totalProcessed = 0;

  for await (const rawLine of rl) {
    const line = rawLine.replace(/\r$/, '');
    lineNo++;
    if (lineNo === 1) {
      headers = splitCsvLine(line).map(h => h.trim());
      continue;
    }
    if (!headers) throw new Error('CSV header not found');

    const fields = splitCsvLine(line);
    const nested = rowToNestedObject(headers, fields);
    const dbRow = mapToDbRow(nested);

    if (!dbRow.name || dbRow.age === null || Number.isNaN(dbRow.age)) {
      console.warn(`Skipping row ${lineNo}: missing mandatory field(s). name="${dbRow.name}", age="${dbRow.age}"`);
      continue;
    }

    batch.push(dbRow);
    if (batch.length >= batchSize) {
      await insertUsersBatch(batch);
      totalProcessed += batch.length;
      console.log(`Inserted batch. Total processed: ${totalProcessed}`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await insertUsersBatch(batch);
    totalProcessed += batch.length;
    console.log(`Inserted final batch. Total processed: ${totalProcessed}`);
    batch = [];
  }

  return { totalProcessed };
}

module.exports = {
  processCsvFile
};