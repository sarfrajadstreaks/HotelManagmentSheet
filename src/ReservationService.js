// ======= RESERVATION DATA MANAGEMENT =======

// Save multiple reservations to the spreadsheet
function saveMultipleReservations(reservations) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservations');
  
  if (!reservations || reservations.length === 0) {
    throw new Error('No reservations to save');
  }

  // Get booking group ID from first reservation or generate new one
  const bookingGroupId = reservations[0].bookingGroupId || Utilities.getUuid();
  let insertRow = sheet.getLastRow() + 1; // Default for new bookings
  
  // If editing existing booking, find and remove old reservations
  if (reservations[0].bookingGroupId) {
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    const rowsToDelete = [];
    let firstDeletedRow = null;
    
    data.forEach((row, index) => {
      if (row[RESERVATION_COLUMNS.BOOKING_GROUP_ID] === bookingGroupId) {
        const actualRowNum = index + 2; // +2 because of 0-indexing and header row
        rowsToDelete.push(actualRowNum);
        
        // Remember the position of the first deleted row
        if (firstDeletedRow === null || actualRowNum < firstDeletedRow) {
          firstDeletedRow = actualRowNum;
        }
      }
    });
    
    // Delete rows in reverse order to maintain correct row numbers
    rowsToDelete.reverse().forEach(rowNum => {
      sheet.deleteRow(rowNum);
    });
    
    // Insert new reservations at the position of the first deleted row
    if (firstDeletedRow !== null) {
      insertRow = firstDeletedRow;
    }
  }

  // Prepare new rows
  const rows = reservations.map(reservation => {
    const checkinDate = new Date(reservation.checkin);
    const checkoutDate = new Date(reservation.checkout);
    const nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
    
    const row = new Array(16); // Create array with proper length
    row[RESERVATION_COLUMNS.BOOKING_GROUP_ID] = bookingGroupId;
    row[RESERVATION_COLUMNS.RESERVATION_ID] = Utilities.getUuid();
    row[RESERVATION_COLUMNS.ROOM] = reservation.room;
    row[RESERVATION_COLUMNS.GUEST] = reservation.guest;
    row[RESERVATION_COLUMNS.PHONE] = reservation.phone;
    row[RESERVATION_COLUMNS.ADDRESS] = reservation.address;
    row[RESERVATION_COLUMNS.CHECKIN] = reservation.checkin;
    row[RESERVATION_COLUMNS.CHECKOUT] = reservation.checkout;
    row[RESERVATION_COLUMNS.NIGHTS] = nights;
    row[RESERVATION_COLUMNS.STATUS] = reservation.status;
    row[RESERVATION_COLUMNS.SOURCE] = reservation.source;
    row[RESERVATION_COLUMNS.ADULTS] = reservation.adults;
    row[RESERVATION_COLUMNS.CHILDREN] = reservation.children;
    row[RESERVATION_COLUMNS.PLAN] = reservation.plan;
    row[RESERVATION_COLUMNS.RATE] = reservation.rate;
    row[RESERVATION_COLUMNS.NOTES] = reservation.notes;
    return row;
  });

  // Insert new rows at the determined position
  if (rows.length > 0) {
    // Insert blank rows first if needed
    if (insertRow <= sheet.getLastRow()) {
      sheet.insertRows(insertRow, rows.length);
    }
    
    // Set values for the new rows
    sheet.getRange(insertRow, 1, rows.length, rows[0].length).setValues(rows);
  }

  generateReservationCalendar();
  return true;
}