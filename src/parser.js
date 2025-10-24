// Split a CSV line into fields handling quotes and escaped quotes ("" -> ").
// Note: does not handle newlines inside quoted fields.
function splitCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // escaped quote
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);
  return fields;
}

// set nested value for dotted keys (mutates target)
function setNested(target, dottedKey, value) {
  if (!dottedKey) return;
  const parts = dottedKey.split('.');
  let cur = target;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i === parts.length - 1) {
      cur[p] = value;
    } else {
      if (!Object.prototype.hasOwnProperty.call(cur, p) || typeof cur[p] !== 'object') {
        cur[p] = {};
      }
      cur = cur[p];
    }
  }
}

function rowToNestedObject(headers, fields) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i].trim();
    const raw = (fields[i] !== undefined) ? fields[i].trim() : '';
    // Treat empty strings as null? We'll keep as empty string to preserve shape.
    setNested(obj, key, raw);
  }
  return obj;
}

// Map nested object into DB-required row
function mapToDbRow(nestedObj) {
  const first = nestedObj.name?.firstName || '';
  const last = nestedObj.name?.lastName || '';
  let ageRaw = nestedObj.age;
  // If age nested deeper (e.g., 'personal.age'), the assignment won't pick it — challenge defined age as top-level key
  const age = ageRaw !== undefined && ageRaw !== '' ? parseInt(ageRaw, 10) : null;
  const address = nestedObj.address && Object.keys(nestedObj.address).length ? nestedObj.address : null;

  // Build additional_info: everything except name, age, address
  const additional = JSON.parse(JSON.stringify(nestedObj)); // deep-ish copy
  delete additional.name;
  delete additional.age;
  delete additional.address;

  // remove empty strings in additional (optional)
  const cleanedAdditional = Object.keys(additional).length ? additional : null;

  return {
    name: `${first} ${last}`.trim() || null,
    age: age,
    address: address,
    additional_info: cleanedAdditional
  };
}

module.exports = {
  splitCsvLine,
  rowToNestedObject,
  mapToDbRow
};