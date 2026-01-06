// ======= ROOM AVAILABILITY SERVICE =======

// Get available rooms for given date range, excluding overlapping bookings
function getRoomsList(checkin, checkout, existingBookingGroupId) {
  const ss = SpreadsheetApp.getActive();
  const roomsSheet = ss.getSheetByName('Rooms');
  const resSheet = ss.getSheetByName('Reservations');

  // Rooms data: Room No, Category, Status
  const roomsData = roomsSheet.getRange(2, 1, roomsSheet.getLastRow() - 1, 3).getValues();

  // Reservations data: get full row data to access booking group IDs
  const allReservations = resSheet.getRange(2, 1, resSheet.getLastRow() - 1, resSheet.getLastColumn()).getValues();

  const newCheckin = checkin ? new Date(checkin) : null;
  const newCheckout = checkout ? new Date(checkout) : null;

  function normalize(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  const bookedRooms = new Set();

  // Check all reservations for conflicts
  allReservations.forEach((fullRow, index) => {
    const bookingGroupId = fullRow[RESERVATION_COLUMNS.BOOKING_GROUP_ID];
    const room = fullRow[RESERVATION_COLUMNS.ROOM];
    const start = fullRow[RESERVATION_COLUMNS.CHECKIN];
    const end = fullRow[RESERVATION_COLUMNS.CHECKOUT];
    const status = fullRow[RESERVATION_COLUMNS.STATUS];
    
    // Skip reservations from the same booking group when editing
    if (existingBookingGroupId && bookingGroupId === existingBookingGroupId) {
      return;
    }
    
    if (!room || !start || !end) {
      return;
    }
    
    if (!['Confirmed', 'Blocked'].includes(status)) {
      return;
    }

    const bookedStart = normalize(new Date(start));
    const bookedEnd = normalize(new Date(end));

    if (newCheckin && newCheckout && newCheckin < bookedEnd && newCheckout > bookedStart) {
      bookedRooms.add(String(room));
    }
  });

  // Filter available rooms
  const availableRooms = roomsData
    .filter(r => {
      const isAvailable = r[ROOMS_COLUMNS.STATUS] && r[ROOMS_COLUMNS.STATUS].toLowerCase() === 'available';
      return isAvailable;
    })
    .filter(r => {
      // Build the room key in the same format as stored in reservations: "106 — Deluxe with Mountain view"
      const roomKey = `${r[ROOMS_COLUMNS.ROOM_NO]} — ${r[ROOMS_COLUMNS.CATEGORY]}`;
      const isNotBlocked = !bookedRooms.has(roomKey);
      return isNotBlocked;
    });

  return availableRooms;
}