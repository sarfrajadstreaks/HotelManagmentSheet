//======availability=======
function generateOtaAvailabilityWithSplits() {

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getActiveSheet();
  const tz = ss.getSpreadsheetTimeZone();

  /* ---------------- DATE RANGE ---------------- */
  const startDate = new Date(sheet.getRange("B1").getValue());
  const endDate   = new Date(sheet.getRange("C1").getValue());

  if (isNaN(startDate) || isNaN(endDate)) {
    SpreadsheetApp.getUi().alert("Invalid date range in B1:C1");
    return;
  }

  startDate.setHours(0,0,0,0);
  endDate.setHours(0,0,0,0);

  /* ---------------- ROOMS ---------------- */
  const roomsSheet = ss.getSheetByName("Rooms");
  const roomsData = roomsSheet.getRange(2,1,roomsSheet.getLastRow()-1,2).getValues();

  const categoryTotals = {};
  roomsData.forEach(r => {
    const cat = (r[ROOMS_COLUMNS.CATEGORY] || "").toString().trim();
    if (!cat) return;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + 1;
  });

  const categories = Object.keys(categoryTotals);

  /* ---------------- RESERVATIONS ---------------- */
  const resSheet = ss.getSheetByName("Reservations");
  const bookings = resSheet.getRange(2,1,resSheet.getLastRow()-1,resSheet.getLastColumn()).getValues();

  /* ---------------- DAILY AVAILABILITY ---------------- */
  const daily = {}; // category -> {dateKey: available}

  categories.forEach(cat => daily[cat] = {});

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate()+1)) {
    const day = new Date(d);
    day.setHours(0,0,0,0);
    const key = Utilities.formatDate(day, tz, "yyyy-MM-dd");

    categories.forEach(cat => {
      let booked = 0;

      bookings.forEach(b => {
        if (b[RESERVATION_COLUMNS.STATUS] !== "Confirmed") return;

        const roomText = (b[RESERVATION_COLUMNS.ROOM] || "").toString(); // Room key 
        if (!roomText.includes("—")) return;

        const bookingCat = roomText.split("—")[1].trim();
        if (bookingCat !== cat) return;

        const checkin = new Date(b[RESERVATION_COLUMNS.CHECKIN]);
        const checkout = new Date(b[RESERVATION_COLUMNS.CHECKOUT]);
        checkin.setHours(0,0,0,0);
        checkout.setHours(0,0,0,0);

        if (day >= checkin && day < checkout) booked++;
      });

      daily[cat][key] = Number(categoryTotals[cat] - booked);
    });
  }

  /* ---------------- GLOBAL CHANGE POINTS ---------------- */
  const allDates = Object.keys(daily[categories[0]]);
  const changePoints = [];

  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      changePoints.push(allDates[i]);
      continue;
    }

    let changed = false;
    categories.forEach(cat => {
      if (daily[cat][allDates[i]] !== daily[cat][allDates[i-1]]) {
        changed = true;
      }
    });

    if (changed) changePoints.push(allDates[i]);
  }

  changePoints.push(
    Utilities.formatDate(new Date(endDate.getTime()+86400000), tz, "yyyy-MM-dd")
  );

  /* ---------------- BUILD COLUMNS ---------------- */
  const ranges = [];
  for (let i = 0; i < changePoints.length-1; i++) {
    const from = new Date(changePoints[i]);
    const to   = new Date(new Date(changePoints[i+1]).getTime()-86400000);

    ranges.push(
      Utilities.formatDate(from, tz, "dd-MMM-yy") +
      " → " +
      Utilities.formatDate(to, tz, "dd-MMM-yy")
    );
  }

  /* ---------------- OUTPUT ---------------- */
  sheet.getRange(3,1,sheet.getMaxRows(),sheet.getMaxColumns()).clear();

  sheet.getRange(3,1,1,ranges.length+1)
       .setValues([["Category", ...ranges]]);

  sheet.getRange(3,1,1,ranges.length+1)
       .setFontWeight("bold");

  const output = [];

  categories.forEach(cat => {
    const row = [cat];

    for (let i = 0; i < changePoints.length-1; i++) {
      const val = daily[cat][changePoints[i]];
      row.push(Number(val)); // 🔒 FORCE NUMBER
    }

    output.push(row);
  });

  sheet.getRange(4,1,output.length,output[0].length)
       .setValues(output)
       .setNumberFormat("0"); // 🔒 KILL DATE FORMATTING

  SpreadsheetApp.getUi().alert("Availability matrix generated correctly.");
  runAvailabilityTransformation()
}

function readCategoryAvailability() {

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Ota_availability");

  const headerRow = 3;
  const startRow = 4;

  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();

  const dateRanges = sheet
    .getRange(headerRow, 2, 1, lastCol - 1)
    .getValues()[0];

  const categories = sheet
    .getRange(startRow, 1, lastRow - startRow + 1, 1)
    .getValues()
    .flat()
    .filter(Boolean);

  const values = sheet
    .getRange(startRow, 2, categories.length, lastCol - 1)
    .getValues();

  /*
    OUTPUT STRUCTURE:

    {
      dateRanges: [ "30-Dec-25 → 30-Dec-25", ... ],
      matrix: {
        "Standard non view": [3,3,3,3,3],
        ...
      }
    }
  */

  const matrix = {};
  categories.forEach((cat, i) => {
    matrix[cat] = values[i].map(v => Number(v) || 0);
  });

  return {
    dateRanges,
    matrix
  };
}

const MMT_OTA_MAPPING = {
  "Standard": ["Standard non view", "Standard semi view"],
  "Deluxe - Valley View": ["Deluxe with Mountain view"],
  "Deluxe Rooms": ["Deluxe non view"],
  "Deluxe - Twin Bed": ["Deluxe twin bedded with Mountain view"],
  "Executive Room": ["Executive with front view"],
  "Super Deluxe -Valley View": [
    "Super Deluxe with Mountain view",
    "Super Deluxe twin bedded with Mountain view"
  ],
  "Family Room": ["Family room with Mountain view"],
  "Executive - Valley View": ["Executive with Mountain view"]
};

const AGODA_OTA_MAPPING = {
  "Standard": [
    "Standard non view",
    "Standard semi view"
  ],

  "Deluxe": [
    "Deluxe non view"
  ],

  "Deluxe Mountain View": [
    "Deluxe with Mountain view",
    "Deluxe twin bedded with Mountain view"
  ],

  "Super Deluxe -Valley View": [
    "Super Deluxe with Mountain view"
  ],

  "Executive": [
    "Executive with front view"
  ],

  "Executive Mountain View King Room": [
    "Executive with Mountain view"
  ],

  "Family Room": [
    "Family room with Mountain view"
  ]
};

function transformAvailabilityByMapping(availData, mapping) {

  const { dateRanges, matrix } = availData;

  /*
    OUTPUT:

    {
      dateRanges: [...],
      result: {
        "Standard": [4,4,4,4,4],
        ...
      }
    }
  */

  const result = {};

  Object.keys(mapping).forEach(otaName => {

    const cats = mapping[otaName];

    result[otaName] = dateRanges.map((_, colIndex) => {
      let sum = 0;
      cats.forEach(cat => {
        if (matrix[cat]) {
          sum += matrix[cat][colIndex];
        }
      });
      return sum;
    });

  });

  return {
    dateRanges,
    result
  };
}

function runAvailabilityTransformation() {

  const availData = readCategoryAvailability();

  const mmt_transformed = transformAvailabilityByMapping(
    availData,
    MMT_OTA_MAPPING
  );
  const ag_transformed = transformAvailabilityByMapping(
    availData,
    AGODA_OTA_MAPPING
  );

  // Logger.log(transformed);
  writeTransformedAvailabilityFrom(mmt_transformed,17,"MMT-")
  writeTransformedAvailabilityFrom(ag_transformed,28,"Agoda-")
}

function writeTransformedAvailabilityFrom(transformedData, startRowToWrite,otaName) {

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Ota_availability");

  const startRow = startRowToWrite;
  const startCol = 1;

  const { dateRanges, result } = transformedData;

  const headers = [otaName+"Category", ...dateRanges];

  const rows = Object.keys(result).map(category => {
    return [category, ...result[category].map(v => Number(v))];
  });

  const totalRows = rows.length + 1;
  const totalCols = headers.length;

  // Clear old data
  sheet.getRange(startRow, startCol, totalRows, totalCols).clearContent();

  // WRITE HEADER
  sheet.getRange(startRow, startCol, 1, totalCols)
       .setValues([headers])
       .setFontWeight("bold");

  // FORCE NUMBER FORMAT (THIS IS THE KEY)
  sheet.getRange(startRow + 1, startCol + 1, rows.length, totalCols - 1)
       .setNumberFormat("0");

  // WRITE DATA
  sheet.getRange(startRow + 1, startCol, rows.length, totalCols)
       .setValues(rows);
}