//=======Calendar Code ====
function generateReservationCalendar() {
  const ss = SpreadsheetApp.getActive();
  const calendarSheet = ss.getSheetByName("ReservationCalendar");
  const roomsSheet = ss.getSheetByName("Rooms");
  const reservationsSheet = ss.getSheetByName("Reservations");
  const tz = ss.getSpreadsheetTimeZone();

  const baseDate = calendarSheet.getRange("B1").getValue();
  if (!baseDate) return;

  const windowStart = new Date(baseDate);
  windowStart.setHours(0,0,0,0);

  const days = 30;
  const windowEnd = new Date(windowStart);
  windowEnd.setDate(windowEnd.getDate() + days);

  // ---------- RESET ----------
  const resetRange = calendarSheet.getRange(
    3, 3,
    calendarSheet.getMaxRows() - 2,
    calendarSheet.getMaxColumns() - 2
  );
  resetRange.breakApart().clearContent().clearNote().setBackground(null);

  // ---------- HEADERS ----------
  calendarSheet.getRange(2, 1, 1, 2).setValues([["Room", "Category"]]);

  for (let i = 0; i < days; i++) {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i);
    calendarSheet.getRange(2, i + 3)
      .setValue(Utilities.formatDate(d, tz, "dd-MMM-yy"))
      .setTextRotation(90)
      .setHorizontalAlignment("center");
  }

  // ---------- ROOMS ----------
  const rooms = roomsSheet
    .getRange(2, 1, roomsSheet.getLastRow() - 1, 2)
    .getValues();

  calendarSheet.getRange(3, 1, rooms.length, 2).setValues(rooms);

  // Build "106 — Deluxe with Mountain view"
  const roomKeyToRow = {};
  rooms.forEach((r, i) => {
    const key = `${r[ROOMS_COLUMNS.ROOM_NO]} — ${r[ROOMS_COLUMNS.CATEGORY]}`;
    roomKeyToRow[key] = i + 3;
  });

  // ---------- RESERVATIONS ----------
  const bookings = reservationsSheet
    .getRange(2, 1, reservationsSheet.getLastRow() - 1, reservationsSheet.getLastColumn())
    .getValues();

  bookings.forEach(b => {
    const roomKey = b[RESERVATION_COLUMNS.ROOM];  // "106 — Deluxe with Mountain view" 
    const status = b[RESERVATION_COLUMNS.STATUS];
    if (status !== "Confirmed") return;

    const row = roomKeyToRow[roomKey];
    if (!row) return;                // room not in Rooms sheet

    const checkin = new Date(b[RESERVATION_COLUMNS.CHECKIN]);
    const checkout = new Date(b[RESERVATION_COLUMNS.CHECKOUT]);
    checkin.setHours(0,0,0,0);
    checkout.setHours(0,0,0,0);

    if (checkout <= windowStart || checkin >= windowEnd) return;

    const visibleStart = checkin < windowStart ? windowStart : checkin;
    const visibleEnd = checkout > windowEnd ? windowEnd : checkout;

    const startIndex = Math.floor((visibleStart - windowStart) / 86400000);
    const endIndex = Math.floor((visibleEnd - windowStart) / 86400000) - 1;
    if (endIndex < startIndex) return;

    const noteText = [
      `Guest: ${b[RESERVATION_COLUMNS.GUEST]}`,
      `Phone: ${b[RESERVATION_COLUMNS.PHONE]}`,
      `Nights: ${b[RESERVATION_COLUMNS.NIGHTS]}`,
      `Status: ${b[RESERVATION_COLUMNS.STATUS]}`,
      `Adults: ${b[RESERVATION_COLUMNS.ADULTS]}`,
      `Children: ${b[RESERVATION_COLUMNS.CHILDREN]}`,
      `Plan: ${b[RESERVATION_COLUMNS.PLAN]}`,
      `Rate: ₹${b[RESERVATION_COLUMNS.RATE]}`,
      `Source: ${b[RESERVATION_COLUMNS.SOURCE]}`
    ].join("\n");

    calendarSheet
      .getRange(row, startIndex + 3, 1, endIndex - startIndex + 1)
      .merge()
      .setBackground("#23783b")
      .setNote(noteText)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle");
  });
}