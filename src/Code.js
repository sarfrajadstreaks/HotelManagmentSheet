// ======= MAIN CONTROLLER =======
// This file contains triggers, menus, and main coordination functions

// ======= ON OPEN MENU =======
function onOpen() {
  SpreadsheetApp.getUi()
  .createMenu('Booking')
  .addItem('📋 Add / Edit Booking', 'showBookingFormForSelected')
  .addSeparator()
  .addItem('📘 Add / Edit Invoice', 'showInvoiceFormForSelected')
  .addSeparator()
  .addItem('❌ Delete Selected Reservation', 'deleteSelectedReservation')
  .addToUi();
}

// ======= TRIGGER FUNCTIONS =======
// Triggered when ReservationCalendar!B1 changes or Reservations sheet changes
function onEdit(e) {
  const range = e.range;
  const sheetName = range.getSheet().getName();

  // Refresh calendar if date changes
  if (sheetName === "ReservationCalendar" && range.getA1Notation() === "B1") {
    generateReservationCalendar();
  }
  // Refresh calendar if Reservations sheet changes
  if (sheetName === "Reservations") {
    generateReservationCalendar();
  }
}

// ======= DELETE RESERVATION =======
function deleteSelectedReservation() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservations');
  const activeRange = sheet.getActiveRange();
  
  if (!activeRange) {
    ui.alert('No Selection', 
      'Please select a row in the Reservations sheet to delete.', 
      ui.ButtonSet.OK);
    return;
  }
  
  const row = activeRange.getRow();
  
  // Check if it's the header row
  if (row === 1) {
    ui.alert('Cannot Delete', 
      'Cannot delete the header row. Please select a reservation row.', 
      ui.ButtonSet.OK);
    return;
  }
  
  // Check if there's data in the row
  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const hasData = rowData.some(cell => cell && cell.toString().trim() !== '');
  
  if (!hasData) {
    ui.alert('Empty Row', 
      'This row appears to be empty. Please select a row with reservation data.', 
      ui.ButtonSet.OK);
    return;
  }
  
  // Get guest name and booking group for confirmation
  const guestName = rowData[RESERVATION_COLUMNS.GUEST] || 'Unknown Guest';
  const room = rowData[RESERVATION_COLUMNS.ROOM] || 'Unknown Room';
  const bookingGroupId = rowData[RESERVATION_COLUMNS.BOOKING_GROUP_ID];
  
  // Confirm deletion
  const response = ui.alert('Confirm Deletion', 
    `Delete this reservation?\n\n` +
    `Guest: ${guestName}\n` +
    `Room: ${room}\n` +
    `Row: ${row}\n\n` +
    `This action cannot be undone.`, 
    ui.ButtonSet.YES_NO);
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    // Delete the row
    sheet.deleteRow(row);
    
    // Refresh the calendar
    generateReservationCalendar();
    
    ui.alert('Reservation Deleted', 
      `✅ Reservation deleted successfully!\n\n` +
      `Guest: ${guestName}\n` +
      `Room: ${room}\n\n` +
      `Calendar has been updated.`, 
      ui.ButtonSet.OK);
      
  } catch (error) {
    ui.alert('Deletion Failed', 
      `❌ Error deleting reservation: ${error.message}\n\n` +
      `Please try again or contact the spreadsheet owner.`, 
      ui.ButtonSet.OK);
  }
}

function openRateInputModal() {
  const html = HtmlService
    .createHtmlOutputFromFile("rate_modal")
    .setWidth(400)
    .setHeight(300);

  SpreadsheetApp.getUi().showModalDialog(html, "Update Rates");
}