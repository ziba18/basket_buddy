export type CategoryId = 'groceries' | 'produce' | 'cleaning' | 'household' | 'other';

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
  purchasedAt: number | null;
  purchasedLocation: string | null;
}

export interface PurchaseDetails {
  purchasedBy: string | null;
  purchasedPrice: number | null;
  purchasedAt: number | null;
  purchasedLocation: string | null;
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
