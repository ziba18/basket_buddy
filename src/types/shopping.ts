export type CategoryId =
  | 'produce'
  | 'bakery'
  | 'meat'
  | 'dairy'
  | 'pantry'
  | 'frozen'
  | 'drinks'
  | 'snacks'
  | 'household'
  | 'cleaning'
  | 'other';

export type ListSortMode = 'category' | 'addedBy' | 'date';

export interface ShoppingItem {
  id: string;
  homeId: string;
  name: string;
  category: CategoryId;
  unit: string | null;
  quantity: string | null;
  done: boolean;
  addedBy: string | null;
  createdAt: number;
  purchasedBy: string | null;
  purchasedPrice: number | null;
  purchasedCurrency: string | null;
  purchasedAt: number | null;
  purchasedLocation: string | null;
}

export interface PurchaseDetails {
  purchasedBy: string | null;
  purchasedPrice: number | null;
  purchasedCurrency: string | null;
  purchasedAt: number | null;
  purchasedLocation: string | null;
}

export interface ItemEdits {
  name: string;
  category: CategoryId;
  unit: string | null;
  quantity: string | null;
}

export interface Profile {
  id: string;
  nickname: string;
}

export interface Home {
  id: string;
  name: string;
  inviteCode: string;
}

export interface HomeMember {
  userId: string;
  nickname: string;
  joinedAt: number;
}

export type AppointmentKind = 'date' | 'health' | 'reminder' | 'other';

export interface Appointment {
  id: string;
  homeId: string;
  title: string;
  kind: AppointmentKind;
  startsAt: number;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: number;
}

export interface AppointmentDraft {
  title: string;
  kind: AppointmentKind;
  startsAt: number;
  allDay: boolean;
  location: string | null;
  notes: string | null;
}
