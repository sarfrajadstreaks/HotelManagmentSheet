// ======= INVOICE MANAGEMENT =======
// This file contains all invoice-related functionality

// ======= INVOICE COLUMNS CONSTANTS =======
const INVOICE_COLUMNS = {
  BOOKING_GROUP_ID: 0,     // Column A
  INVOICE_ID: 1,           // Column B
  INVOICE_NUMBER: 2,       // Column C
  GUEST_NAME: 3,           // Column D
  ROOM_NUMBERS: 4,         // Column E
  INVOICE_DATE: 5,         // Column F
  SUBTOTAL: 6,             // Column G
  TAX_AMOUNT: 7,           // Column H
  DISCOUNT: 8,             // Column I
  GRAND_TOTAL: 9,          // Column J
  PAID_AMOUNT: 10,         // Column K
  BALANCE_DUE: 11,         // Column L
  PAYMENT_METHOD: 12,      // Column M
  PAYMENT_STATUS: 13,      // Column N
  PAYMENT_NOTES: 14,       // Column O
  CREATED_DATE: 15         // Column P
};

const INVOICE_ITEMS_COLUMNS = {
  INVOICE_ID: 0,           // Column A
  ITEM_ID: 1,              // Column B
  SERVICE_ITEM: 2,         // Column C
  CATEGORY: 3,             // Column D
  ROOM_NUMBER: 4,          // Column E
  QUANTITY: 5,             // Column F
  UNIT_PRICE: 6,           // Column G
  TOTAL_PRICE: 7,          // Column H
  ITEM_DATE: 8,            // Column I
  STATUS: 9                // Column J
};

// ======= SHOW INVOICE FORM =======
function showInvoiceFormForSelected() {
  console.log('🔧 showInvoiceFormForSelected() started');
  
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activeSheet = ss.getActiveSheet();
  const activeRange = activeSheet.getActiveRange();
  
  console.log('📊 Active sheet:', activeSheet.getName());
  console.log('📊 Active range:', activeRange ? activeRange.getA1Notation() : 'null');
  
  if (!activeRange) {
    console.error('❌ No active range found');
    ui.alert('No Selection', 
      'Please select a row in the Reservations or Invoices sheet.', 
      ui.ButtonSet.OK);
    return;
  }
  
  const row = activeRange.getRow();
  const sheetName = activeSheet.getName();
  
  console.log('📊 Selected row:', row);
  console.log('📊 Sheet name:', sheetName);
  
  // Check if it's the header row
  if (row === 1) {
    console.error('❌ Header row selected');
    ui.alert('Invalid Selection', 
      'Cannot create invoice from header row. Please select a data row.', 
      ui.ButtonSet.OK);
    return;
  }
  
  let bookingGroupId = null;
  let invoiceData = null;
  
  // Determine which sheet we're on and get booking group ID
  if (sheetName === 'Reservations') {
    console.log('✅ Working with Reservations sheet');
    
    // Get booking group ID from Reservations sheet
    const rowData = activeSheet.getRange(row, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    bookingGroupId = rowData[RESERVATION_COLUMNS.BOOKING_GROUP_ID];
    
    console.log('📊 Raw row data:', rowData);
    console.log('📊 Extracted booking group ID:', bookingGroupId);
    
    if (!bookingGroupId) {
      console.error('❌ No booking group ID found in row data');
      ui.alert('No Booking Group', 
        'This reservation does not have a booking group ID. Please select a valid reservation.', 
        ui.ButtonSet.OK);
      return;
    }
    
    // Check if invoice already exists for this booking
    console.log('🔍 Checking for existing invoice...');
    invoiceData = getExistingInvoice(bookingGroupId);
    console.log('📊 Existing invoice data:', invoiceData);
    
  } else if (sheetName === 'Invoices') {
    console.log('✅ Working with Invoices sheet');
    
    // Get booking group ID from Invoices sheet
    const rowData = activeSheet.getRange(row, 1, 1, activeSheet.getLastColumn()).getValues()[0];
    bookingGroupId = rowData[INVOICE_COLUMNS.BOOKING_GROUP_ID];
    
    console.log('📊 Raw invoice row data:', rowData);
    console.log('📊 Extracted booking group ID:', bookingGroupId);
    
    if (!bookingGroupId) {
      console.error('❌ No booking group ID found in invoice row');
      ui.alert('No Booking Group', 
        'This invoice row does not have a booking group ID.', 
        ui.ButtonSet.OK);
      return;
    }
    
    // Load existing invoice data (only when selecting from Invoices sheet)
    console.log('🔍 Loading existing invoice data...');
    invoiceData = loadInvoiceData(bookingGroupId);
    console.log('📊 Loaded invoice data:', invoiceData);
    
    if (!invoiceData) {
      console.error('❌ Failed to load invoice data');
      ui.alert('Invoice Data Error', 
        'Could not load invoice data from this row.', 
        ui.ButtonSet.OK);
      return;
    }
    
  } else {
    console.error('❌ Wrong sheet selected:', sheetName);
    ui.alert('Wrong Sheet', 
      'Please select a row from either the "Reservations" or "Invoices" sheet.', 
      ui.ButtonSet.OK);
    return;
  }
  
  // Get booking details
  console.log('🔍 Getting booking data for group ID:', bookingGroupId);
  const bookingData = getBookingData(bookingGroupId);
  console.log('📊 Retrieved booking data:', bookingData);
  
  if (!bookingData) {
    console.error('❌ No booking data found for group ID:', bookingGroupId);
    ui.alert('Booking Not Found', 
      'Could not find booking details for this booking group ID.', 
      ui.ButtonSet.OK);
    return;
  }
  
  // Show invoice form
  console.log('🚀 Calling showInvoiceModal with data...');
  console.log('📊 Final bookingData to be passed:', JSON.stringify(bookingData));
  console.log('📊 Final invoiceData to be passed:', JSON.stringify(invoiceData));
  
  showInvoiceModal(bookingData, invoiceData);
}

// ======= GET BOOKING DATA =======
function getBookingData(bookingGroupId) {
  console.log('🔍 getBookingData() started for group ID:', bookingGroupId);
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reservationsSheet = ss.getSheetByName('Reservations');
  
  if (!reservationsSheet) {
    console.error('❌ Reservations sheet not found');
    return null;
  }
  
  console.log('✅ Reservations sheet found');
  
  const lastRow = reservationsSheet.getLastRow();
  console.log('📊 Last row in Reservations sheet:', lastRow);
  
  if (lastRow <= 1) {
    console.error('❌ No data in Reservations sheet (only header or empty)');
    return null; // Only header or empty sheet
  }
  
  const data = reservationsSheet.getRange(2, 1, lastRow - 1, reservationsSheet.getLastColumn()).getValues();
  console.log('📊 Retrieved', data.length, 'rows of data from Reservations sheet');
  console.log('📊 Sample row data:', data.length > 0 ? data[0] : 'No data');
  
  const bookingRows = data.filter(row => row[RESERVATION_COLUMNS.BOOKING_GROUP_ID] === bookingGroupId);
  console.log('📊 Found', bookingRows.length, 'matching rows for booking group ID:', bookingGroupId);
  
  if (bookingRows.length === 0) {
    console.error('❌ No rows found matching booking group ID:', bookingGroupId);
    console.log('📊 Available booking group IDs in data:', data.map(row => row[RESERVATION_COLUMNS.BOOKING_GROUP_ID]).filter(id => id));
    return null;
  }
  
  // Take main info from first reservation
  const first = bookingRows[0];
  console.log('📊 First matching row data:', first);
  
  // Collect all rooms
  const rooms = bookingRows.map(row => row[RESERVATION_COLUMNS.ROOM]);
  console.log('📊 Extracted rooms:', rooms);
  
  const bookingData = {
    bookingGroupId: bookingGroupId,
    guestName: first[RESERVATION_COLUMNS.GUEST],
    phone: first[RESERVATION_COLUMNS.PHONE],
    address: first[RESERVATION_COLUMNS.ADDRESS],
    checkin: Utilities.formatDate(new Date(first[RESERVATION_COLUMNS.CHECKIN]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    checkout: Utilities.formatDate(new Date(first[RESERVATION_COLUMNS.CHECKOUT]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    rooms: rooms,
    totalAdults: bookingRows.reduce((sum, row) => sum + row[RESERVATION_COLUMNS.ADULTS], 0),
    totalChildren: bookingRows.reduce((sum, row) => sum + row[RESERVATION_COLUMNS.CHILDREN], 0),
    status: first[RESERVATION_COLUMNS.STATUS],
    source: first[RESERVATION_COLUMNS.SOURCE]
  };
  
  console.log('✅ Final booking data created:', JSON.stringify(bookingData));
  return bookingData;
}

// ======= CHECK FOR EXISTING INVOICE =======
function getExistingInvoice(bookingGroupId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let invoicesSheet = ss.getSheetByName('Invoices');
  
  if (!invoicesSheet) {
    // Create Invoices sheet if it doesn't exist
    createInvoicesSheet();
    return null;
  }
  
  // Check if sheet has data beyond header
  const lastRow = invoicesSheet.getLastRow();
  
  if (lastRow <= 1) {
    return null; // Only header row or empty sheet
  }
  
  const data = invoicesSheet.getRange(2, 1, lastRow - 1, invoicesSheet.getLastColumn()).getValues();
  const existingInvoice = data.find(row => row[INVOICE_COLUMNS.BOOKING_GROUP_ID] === bookingGroupId);
  
  if (existingInvoice) {
    return loadInvoiceData(bookingGroupId);
  }
  
  return null;
}

// ======= LOAD INVOICE DATA =======
function loadInvoiceData(bookingGroupId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const invoicesSheet = ss.getSheetByName('Invoices');
  const itemsSheet = ss.getSheetByName('InvoiceItems');
  
  if (!invoicesSheet || !itemsSheet) return null;
  
  // Check if invoices sheet has data
  const invoicesLastRow = invoicesSheet.getLastRow();
  if (invoicesLastRow <= 1) return null;
  
  // Get invoice header
  const invoiceData = invoicesSheet.getRange(2, 1, invoicesLastRow - 1, invoicesSheet.getLastColumn()).getValues();
  const invoiceRow = invoiceData.find(row => row[INVOICE_COLUMNS.BOOKING_GROUP_ID] === bookingGroupId);
  
  if (!invoiceRow) return null;
  
  const invoiceId = invoiceRow[INVOICE_COLUMNS.INVOICE_ID];
  
  // Get invoice items (handle empty items sheet)
  const itemsLastRow = itemsSheet.getLastRow();
  let items = [];
  if (itemsLastRow > 1) {
    const itemsData = itemsSheet.getRange(2, 1, itemsLastRow - 1, itemsSheet.getLastColumn()).getValues();
    items = itemsData.filter(row => row[INVOICE_ITEMS_COLUMNS.INVOICE_ID] === invoiceId);
  }
  
  return {
    invoiceId: invoiceId,
    invoiceNumber: invoiceRow[INVOICE_COLUMNS.INVOICE_NUMBER],
    invoiceDate: Utilities.formatDate(new Date(invoiceRow[INVOICE_COLUMNS.INVOICE_DATE]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
    subtotal: invoiceRow[INVOICE_COLUMNS.SUBTOTAL],
    taxAmount: invoiceRow[INVOICE_COLUMNS.TAX_AMOUNT],
    discount: invoiceRow[INVOICE_COLUMNS.DISCOUNT],
    grandTotal: invoiceRow[INVOICE_COLUMNS.GRAND_TOTAL],
    paidAmount: invoiceRow[INVOICE_COLUMNS.PAID_AMOUNT],
    balanceDue: invoiceRow[INVOICE_COLUMNS.BALANCE_DUE],
    paymentMethod: invoiceRow[INVOICE_COLUMNS.PAYMENT_METHOD],
    paymentStatus: invoiceRow[INVOICE_COLUMNS.PAYMENT_STATUS],
    paymentNotes: invoiceRow[INVOICE_COLUMNS.PAYMENT_NOTES],
    items: items.map(item => ({
      service: item[INVOICE_ITEMS_COLUMNS.SERVICE_ITEM],
      category: item[INVOICE_ITEMS_COLUMNS.CATEGORY],
      room: item[INVOICE_ITEMS_COLUMNS.ROOM_NUMBER],
      quantity: item[INVOICE_ITEMS_COLUMNS.QUANTITY],
      unitPrice: item[INVOICE_ITEMS_COLUMNS.UNIT_PRICE],
      total: item[INVOICE_ITEMS_COLUMNS.TOTAL_PRICE],
      status: item[INVOICE_ITEMS_COLUMNS.STATUS] || 'Pending'
    })),
    mode: 'EDIT'
  };
}

// ======= SHOW INVOICE MODAL =======
function showInvoiceModal(bookingData, invoiceData) {
  console.log('🚀 showInvoiceModal() started');
  console.log('📊 Received bookingData:', JSON.stringify(bookingData));
  console.log('📊 Received invoiceData:', JSON.stringify(invoiceData));
  
  try {
    console.log('🔍 Attempting to load HTML template...');
    const htmlTemplate = HtmlService.createTemplateFromFile('Invoice.html');
    console.log('✅ HTML template created successfully from Invoice.html');
    
    // Prepare data for the template
    htmlTemplate.bookingData = bookingData;
    htmlTemplate.invoiceData = invoiceData || { mode: 'NEW' };
    
    console.log('📊 Template bookingData assigned:', JSON.stringify(htmlTemplate.bookingData));
    console.log('📊 Template invoiceData assigned:', JSON.stringify(htmlTemplate.invoiceData));
    
    // Generate next invoice number if new invoice
    if (!invoiceData) {
      console.log('🔢 Generating new invoice number...');
      htmlTemplate.invoiceData.invoiceNumber = generateNextInvoiceNumber();
      htmlTemplate.invoiceData.invoiceDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
      console.log('📊 Generated invoice number:', htmlTemplate.invoiceData.invoiceNumber);
      console.log('📊 Set invoice date:', htmlTemplate.invoiceData.invoiceDate);
    }
    
    console.log('🔄 Evaluating HTML template...');
    const htmlOutput = htmlTemplate.evaluate()
      .setWidth(1200)
      .setHeight(800);
    console.log('✅ HTML output created successfully');
      
    // Create modal title with invoice number
    const invoiceNumber = htmlTemplate.invoiceData.invoiceNumber;
    const modalTitle = `Invoice & Cash Management - ${invoiceNumber}`;
    
    console.log('📊 Modal title:', modalTitle);
    console.log('🚀 Opening modal dialog...');
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, modalTitle);
    console.log('✅ Modal dialog opened successfully');
    
  } catch (error) {
    console.error('❌ ERROR in showInvoiceModal:', error);
    console.error('❌ Error stack:', error.stack);
    
    SpreadsheetApp.getUi().alert('Modal Error', 
      'Failed to open invoice modal: ' + error.message, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

// ======= GENERATE INVOICE NUMBER =======
function generateNextInvoiceNumber() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let invoicesSheet = ss.getSheetByName('Invoices');
  
  if (!invoicesSheet) {
    return 'INV-2026-001';
  }
  
  const currentYear = new Date().getFullYear();
  const lastRow = invoicesSheet.getLastRow();
  
  // If only header row or empty, start with 001
  if (lastRow <= 1) {
    return `INV-${currentYear}-001`;
  }
  
  const data = invoicesSheet.getRange(2, 1, lastRow - 1, invoicesSheet.getLastColumn()).getValues();
  
  // Find highest invoice number for current year
  let maxNumber = 0;
  data.forEach(row => {
    const invoiceNumber = row[INVOICE_COLUMNS.INVOICE_NUMBER];
    if (invoiceNumber && invoiceNumber.includes(currentYear)) {
      const numberPart = invoiceNumber.split('-')[2];
      if (numberPart) {
        maxNumber = Math.max(maxNumber, parseInt(numberPart));
      }
    }
  });
  
  const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
  return `INV-${currentYear}-${nextNumber}`;
}

// ======= CREATE INVOICES SHEET =======
function createInvoicesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Create Invoices sheet
  const invoicesSheet = ss.insertSheet('Invoices');
  const invoiceHeaders = [
    'Booking Group ID', 'Invoice ID', 'Invoice Number', 'Guest Name', 'Room Numbers',
    'Invoice Date', 'Subtotal', 'Tax Amount', 'Discount', 'Grand Total', 'Paid Amount',
    'Balance Due', 'Payment Method', 'Payment Status', 'Payment Notes', 'Created Date'
  ];
  invoicesSheet.getRange(1, 1, 1, invoiceHeaders.length).setValues([invoiceHeaders]);
  
  // Create InvoiceItems sheet
  const itemsSheet = ss.insertSheet('InvoiceItems');
  const itemHeaders = [
    'Invoice ID', 'Item ID', 'Service/Item', 'Category', 'Room Number', 'Quantity', 'Unit Price', 'Total Price', 'Item Date', 'Status'
  ];
  itemsSheet.getRange(1, 1, 1, itemHeaders.length).setValues([itemHeaders]);
  
  // Format headers
  invoicesSheet.getRange(1, 1, 1, invoiceHeaders.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
  itemsSheet.getRange(1, 1, 1, itemHeaders.length).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
}

// ======= SAVE INVOICE =======
function saveInvoice(invoiceData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let invoicesSheet = ss.getSheetByName('Invoices');
  let itemsSheet = ss.getSheetByName('InvoiceItems');
  
  // Create sheets if they don't exist
  if (!invoicesSheet || !itemsSheet) {
    createInvoicesSheet();
    invoicesSheet = ss.getSheetByName('Invoices');
    itemsSheet = ss.getSheetByName('InvoiceItems');
  }
  
  const invoiceId = invoiceData.invoiceId || Utilities.getUuid();
  const now = new Date();
  
  // Prepare invoice row data
  const invoiceRow = [
    invoiceData.bookingGroupId,
    invoiceId,
    invoiceData.invoiceNumber,
    invoiceData.guestName,
    invoiceData.roomNumbers,
    invoiceData.invoiceDate,
    invoiceData.subtotal,
    invoiceData.taxAmount,
    invoiceData.discount,
    invoiceData.grandTotal,
    invoiceData.paidAmount,
    invoiceData.balanceDue,
    invoiceData.paymentMethod,
    invoiceData.paymentStatus,
    invoiceData.paymentNotes,
    now
  ];
  
  // Save or update invoice
  if (invoiceData.mode === 'EDIT') {
    // Find and update existing invoice
    const invoicesLastRow = invoicesSheet.getLastRow();
    if (invoicesLastRow > 1) {
      const data = invoicesSheet.getRange(2, 1, invoicesLastRow - 1, invoicesSheet.getLastColumn()).getValues();
      const rowIndex = data.findIndex(row => row[INVOICE_COLUMNS.INVOICE_ID] === invoiceId);
      
      if (rowIndex >= 0) {
        invoicesSheet.getRange(rowIndex + 2, 1, 1, invoiceRow.length).setValues([invoiceRow]);
      }
    }
    
    // Delete existing items
    const itemsLastRow = itemsSheet.getLastRow();
    if (itemsLastRow > 1) {
      const itemsData = itemsSheet.getRange(2, 1, itemsLastRow - 1, itemsSheet.getLastColumn()).getValues();
      const itemRowsToDelete = [];
      
      itemsData.forEach((row, index) => {
        if (row[INVOICE_ITEMS_COLUMNS.INVOICE_ID] === invoiceId) {
          itemRowsToDelete.push(index + 2);
        }
      });
      
      // Delete in reverse order
      itemRowsToDelete.reverse().forEach(rowNum => {
        itemsSheet.deleteRow(rowNum);
      });
    }
    
  } else {
    // Add new invoice
    invoicesSheet.getRange(invoicesSheet.getLastRow() + 1, 1, 1, invoiceRow.length).setValues([invoiceRow]);
  }
  
  // Save invoice items
  const itemRows = invoiceData.items.map(item => [
    invoiceId,
    Utilities.getUuid(),
    item.service,
    item.category,
    item.room,
    item.quantity,
    item.unitPrice,
    item.total,
    now,
    item.status || 'Pending'
  ]);
  
  if (itemRows.length > 0) {
    itemsSheet.getRange(itemsSheet.getLastRow() + 1, 1, itemRows.length, itemRows[0].length).setValues(itemRows);
  }
  
  // ======= KITCHEN NOTIFICATION =======
  // Send restaurant items to kitchen chat
  try {
    const guestData = {
      guestName: invoiceData.guestName,
      rooms: invoiceData.roomNumbers
    };
    processKitchenItems(invoiceData, guestData);
  } catch (error) {
    console.error('❌ Kitchen notification failed:', error);
    // Don't fail the invoice save if kitchen notification fails
  }
  
  return { success: true, invoiceId: invoiceId, invoiceNumber: invoiceData.invoiceNumber };
}

// ======= CLEAR ALL INVOICE DATA (FOR TESTING) =======
function clearAllInvoiceData() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Clear Invoice Data', 
    'This will delete ALL invoice and invoice items data. This action cannot be undone.\n\nAre you sure?', 
    ui.ButtonSet.YES_NO);
    
  if (response !== ui.Button.YES) {
    return;
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const invoicesSheet = ss.getSheetByName('Invoices');
  const itemsSheet = ss.getSheetByName('InvoiceItems');
  
  try {
    // Clear invoice data (keep headers)
    if (invoicesSheet && invoicesSheet.getLastRow() > 1) {
      invoicesSheet.getRange(2, 1, invoicesSheet.getLastRow() - 1, invoicesSheet.getLastColumn()).clearContent();
    }
    
    // Clear invoice items data (keep headers)
    if (itemsSheet && itemsSheet.getLastRow() > 1) {
      itemsSheet.getRange(2, 1, itemsSheet.getLastRow() - 1, itemsSheet.getLastColumn()).clearContent();
    }
    
    ui.alert('Invoice Data Cleared', 
      'All invoice data has been cleared successfully.\nYou can now test with fresh invoices.', 
      ui.ButtonSet.OK);
      
  } catch (error) {
    ui.alert('Error', 
      `Failed to clear invoice data: ${error.message}`, 
      ui.ButtonSet.OK);
  }
}