// ======= BOOKING FORM UI MANAGEMENT =======

// Show booking form modal (new or edit mode)
function showBookingForm(reservationData) {
  const htmlTemplate = HtmlService.createTemplateFromFile('Booking');
  htmlTemplate.data = reservationData || {};
  htmlTemplate.roomList = getRoomsList(
    reservationData?.checkin || null,
    reservationData?.checkout || null,
    reservationData?.bookingGroupId || null
  );
  
  // Determine modal title based on mode
  const mode = reservationData?.mode || 'NEW';
  const modalTitle = mode === 'BOOKING_EDIT' ? 'Booking Form - Edit' : 'Booking Form - New';
  
  const htmlOutput = htmlTemplate.evaluate()
    .setWidth(900)
    .setHeight(650);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, modalTitle);
}

// Show booking form for selected row (triggered from menu)
function showBookingFormForSelected() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservations');
  const range = sheet.getActiveRange();
  if (!range) return;

  const row = range.getRow();
  if (row < 2) {
    // New booking when no row selected or header row
    showBookingForm({ mode: 'NEW' });
    return;
  }

  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const bookingGroupId = rowData[RESERVATION_COLUMNS.BOOKING_GROUP_ID];

  if (!bookingGroupId) {
    // New booking when no booking group ID
    showBookingForm({ mode: 'NEW' });
    return;
  }

  // Edit existing booking - gather all rooms under this bookingGroupId
  const dataAll = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const bookingRows = dataAll.filter(r => r[RESERVATION_COLUMNS.BOOKING_GROUP_ID] === bookingGroupId);

  if (bookingRows.length === 0) {
    showBookingForm({ mode: 'NEW' }); // fallback
    return;
  }

  // Take shared info from first reservation
  const first = bookingRows[0];
  const reservationData = {
    bookingGroupId: bookingGroupId,
    // Main form data (shared/totals)
    guest: first[RESERVATION_COLUMNS.GUEST],
    phone: first[RESERVATION_COLUMNS.PHONE],
    address: first[RESERVATION_COLUMNS.ADDRESS],
    checkin: Utilities.formatDate(new Date(first[RESERVATION_COLUMNS.CHECKIN]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    checkout: Utilities.formatDate(new Date(first[RESERVATION_COLUMNS.CHECKOUT]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    adults: bookingRows.reduce((sum,r)=>sum+r[RESERVATION_COLUMNS.ADULTS],0), // Total adults
    children: bookingRows.reduce((sum,r)=>sum+r[RESERVATION_COLUMNS.CHILDREN],0), // Total children
    plan: first[RESERVATION_COLUMNS.PLAN], // Default plan
    rate: first[RESERVATION_COLUMNS.RATE], // Default rate
    source: first[RESERVATION_COLUMNS.SOURCE],
    status: first[RESERVATION_COLUMNS.STATUS], // Default status
    notes: first[RESERVATION_COLUMNS.NOTES], // Default notes
    mode: 'BOOKING_EDIT',
    // Individual reservation data
    reservations: bookingRows.map(row => ({
      room: row[RESERVATION_COLUMNS.ROOM],
      guest: row[RESERVATION_COLUMNS.GUEST],
      adults: row[RESERVATION_COLUMNS.ADULTS],
      children: row[RESERVATION_COLUMNS.CHILDREN],
      plan: row[RESERVATION_COLUMNS.PLAN],
      status: row[RESERVATION_COLUMNS.STATUS],
      rate: row[RESERVATION_COLUMNS.RATE],
      address: row[RESERVATION_COLUMNS.ADDRESS],
      notes: row[RESERVATION_COLUMNS.NOTES],
      checkin: Utilities.formatDate(new Date(row[RESERVATION_COLUMNS.CHECKIN]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      checkout: Utilities.formatDate(new Date(row[RESERVATION_COLUMNS.CHECKOUT]), Session.getScriptTimeZone(), "yyyy-MM-dd")
    }))
  };

  showBookingForm(reservationData);
}