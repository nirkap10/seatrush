// The shapes of the API's answers. Dates arrive as text (ISO format).

export interface Zone {
  id: number;
  name: string;
  fromRow: string;
  toRow: string;
  priceAgorot: number;
}

export type SeatStatus = 'available' | 'held' | 'sold';

export interface Seat {
  label: string;
  rowLetter: string;
  seatNumber: number;
  zoneId: number;
  status: SeatStatus;
}

export interface MyHold {
  id: number;
  expiresAt: string;
  seats: string[];
}

// GET /events/:id
export interface EventDetails {
  event: {
    id: number;
    name: string;
    venue: string;
    startsAt: string;
    dropAt: string;
  };
  zones: Zone[];
  seats: Seat[];
  myHolds: MyHold[];
  serverTime: string;
}

// POST /events/:id/holds and /holds/best-available
export interface NewHold {
  id: number;
  seats: string[];
  expiresAt: string;
}

// POST /holds/:id/checkout and GET /me/orders
export interface Order {
  id: number;
  eventId: number;
  eventName: string;
  venue: string;
  startsAt: string;
  totalAgorot: number;
  promoCode: string | null;
  discountAgorot: number;
  createdAt: string;
  seats: string[];
}
