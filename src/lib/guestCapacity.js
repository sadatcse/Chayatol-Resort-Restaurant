// Plain, dependency-free helpers shared between API routes and client
// components for per-room guest capacity checks and primary-guest
// bookkeeping. Mirrors the convention of src/lib/customerHelper.js.

// A room-line's `room`/a guest's `customer` field may show up as a raw
// ObjectId, a string id, or a populated document — normalize to a string id.
export const resolveId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
};

export const countRoomGuests = (roomLine) => {
  return Array.isArray(roomLine?.guests) ? roomLine.guests.length : 0;
};

export const checkRoomCapacity = ({ guests, capacity, roomLabel }) => {
  const count = Array.isArray(guests) ? guests.length : 0;
  if (capacity === undefined || capacity === null) {
    return { ok: true, message: null };
  }
  if (count > capacity) {
    return {
      ok: false,
      message: `Room ${roomLabel || ""} allows a maximum of ${capacity} guest(s), but ${count} are assigned. Please remove ${count - capacity} guest(s) or choose a larger room.`
    };
  }
  return { ok: true, message: null };
};

// rooms: array of room-lines ({ room, guests, ... }).
// roomLookupById: Map or plain object keyed by room id -> room doc ({ roomNumber, roomType, capacity }).
export const validateRoomsGuestCapacity = (rooms, roomLookupById) => {
  if (!Array.isArray(rooms)) return { ok: true, message: null };

  for (let i = 0; i < rooms.length; i++) {
    const roomLine = rooms[i];
    const roomId = resolveId(roomLine.room);
    const roomDoc = roomId
      ? (roomLookupById instanceof Map ? roomLookupById.get(roomId) : roomLookupById?.[roomId])
      : null;

    if (!roomDoc || roomDoc.capacity === undefined || roomDoc.capacity === null) {
      continue; // room not resolved yet — nothing to validate against
    }

    const roomLabel = roomDoc.roomNumber || roomLine.roomType || `#${i + 1}`;
    const result = checkRoomCapacity({ guests: roomLine.guests, capacity: roomDoc.capacity, roomLabel });
    if (!result.ok) {
      return { ok: false, message: `Room requirement #${i + 1}: ${result.message}` };
    }
  }

  return { ok: true, message: null };
};

// Ensures exactly one room-line's guests array carries the primary guest
// (matching `primaryCustomerId`), auto-inserting it into room-line 0 when
// missing. Never mutates the input; returns a shallow clone.
export const reconcilePrimaryGuest = (rooms, primaryCustomerId) => {
  const safeRooms = Array.isArray(rooms) ? rooms : [];
  const clonedRooms = safeRooms.map((r) => ({
    ...r,
    guests: Array.isArray(r.guests) ? r.guests.map((g) => ({ ...g })) : []
  }));

  const primaryId = resolveId(primaryCustomerId);
  if (!primaryId || clonedRooms.length === 0) {
    return { rooms: clonedRooms, error: null };
  }

  const primaryEntries = [];
  clonedRooms.forEach((r, ri) => {
    r.guests.forEach((g, gi) => {
      if (g.isPrimary) primaryEntries.push({ ri, gi, customerId: resolveId(g.customer) });
    });
  });

  if (primaryEntries.length > 1) {
    return {
      rooms: clonedRooms,
      error: "Only one room can hold the primary guest. Please remove the duplicate primary-guest entry."
    };
  }

  if (primaryEntries.length === 1) {
    const entry = primaryEntries[0];
    if (entry.customerId !== primaryId) {
      return {
        rooms: clonedRooms,
        error: "The room marked as holding the primary guest doesn't match the reservation's billing customer. Please update or remove that entry."
      };
    }
    return { rooms: clonedRooms, error: null };
  }

  // No room-line flags a primary guest yet — auto-insert into room-line 0.
  const alreadyInRoomZero = clonedRooms[0].guests.some((g) => resolveId(g.customer) === primaryId);
  if (alreadyInRoomZero) {
    clonedRooms[0].guests = clonedRooms[0].guests.map((g) =>
      resolveId(g.customer) === primaryId ? { ...g, isPrimary: true } : g
    );
  } else {
    clonedRooms[0].guests = [
      { customer: primaryCustomerId, isPrimary: true, relationToPrimary: "" },
      ...clonedRooms[0].guests
    ];
  }

  return { rooms: clonedRooms, error: null };
};

// Client-side guest entries carry a populated `customer` object (for
// display). Before submitting to the API, collapse each back to a plain id
// so Mongoose can cast the ObjectId ref field.
export const serializeGuestsForSubmit = (guests) =>
  Array.isArray(guests)
    ? guests.map((g) => ({
        customer: resolveId(g.customer),
        isPrimary: !!g.isPrimary,
        relationToPrimary: g.relationToPrimary || ""
      }))
    : [];

export const serializeRoomsForSubmit = (rooms) =>
  Array.isArray(rooms)
    ? rooms.map((r) => ({ ...r, guests: serializeGuestsForSubmit(r.guests) }))
    : [];

// Flattens a stay's per-room guest lists into one row-per-guest, falling back
// to the stay's billing customer as an implicit primary guest for rooms that
// don't carry a guests[] array yet (older stays created before this feature).
// Used by both the on-screen Customer Profile Details view and its print
// output so a stay's family/companions (not just the primary guest) show up
// in both places consistently.
export const buildStayGuestRows = (stay) => {
  if (!stay || !Array.isArray(stay.rooms)) return [];

  const rows = [];
  stay.rooms.forEach((r) => {
    const roomLabel = r.room?.roomNumber || "N/A";
    if (Array.isArray(r.guests) && r.guests.length > 0) {
      r.guests.forEach((g) => {
        const cust = g.customer || {};
        rows.push({
          roomLabel,
          fullName: cust.fullName || "Guest",
          isPrimary: !!g.isPrimary,
          relationToPrimary: g.relationToPrimary || "",
          phoneNumber: cust.phoneNumber || "",
          identificationType: cust.identificationType || "",
          identificationNumber: cust.identificationNumber || ""
        });
      });
    } else if (stay.customer) {
      rows.push({
        roomLabel,
        fullName: stay.customer.fullName || "Guest",
        isPrimary: true,
        relationToPrimary: "",
        phoneNumber: stay.customer.phoneNumber || "",
        identificationType: stay.customer.identificationType || "",
        identificationNumber: stay.customer.identificationNumber || ""
      });
    }
  });

  return rows;
};
