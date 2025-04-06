// API response types
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  state?: string;
  vtpass_account_id?: string;
  vtpass_balance?: number;
  preferred_network?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  bvn?: string;
  occupation?: string;
  account_status?: string;
  kyc_level?: number;
  date_joined?: string;
}

export interface KYCStatus {
  kyc_level: number;
  account_status: string;
  is_bvn_verified: boolean;
  requirements: {
    next_level: number;
    missing_fields: string[];
  };
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  date_of_birth?: string;
  address?: string;
  state?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  bvn?: string;
  preferred_network?: string;
}

export interface SetPinData {
  pin: string;
  pin_confirm: string;
}

// Transaction type definition
export interface Transaction {
  id: string;
  type: string;
  service_type?: string;
  name: string;
  date: string;
  amount: string;
  status: 'completed' | 'successful' | 'pending' | 'failed';
  icon?: string | null;
}

// Dashboard stats type
export interface DashboardStats {
  this_month_spent: number;
  total_spent: number;
  recent_transactions: Transaction[];
}
