export type FounderUserBillingStatus = 'trial' | 'premium';

export type FounderUsersFilter = 'all' | FounderUserBillingStatus;

export interface FounderUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  registrationDate: string;
  billingStatus: FounderUserBillingStatus;
}

export interface FounderUsersPage {
  users: FounderUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FounderUsersQuery {
  page: number;
  pageSize: number;
  search: string;
  filter: FounderUsersFilter;
}
