
export type UserRole = '管理員' | '一般用戶' | '付費用戶';

export type Language = 'zh-TW' | 'en' | 'zh-CN' | 'ja';

export interface User {
  email: string;
  password?: string; // Optional for social login
  role: UserRole;
  name?: string;
  phone?: string;
  subscriptionExpiry?: string | null; // ISO Date string
}

export interface Property {
  id: string;
  address: string;
  city?: string;
  district: string;
  type?: '公寓' | '電梯大樓' | '透天厝' | '華廈';
  price: number;
  size?: number; // in square meters
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  imageUrl: string;
  latitude?: number;
  longitude?: number;
  floor?: string;
  transactionDate?: string;
  remarks?: string;
}

export interface RealtorInfo {
    realtorName: string;
    branchName: string;
    address: string;
    analysis: string;
}

export interface ForeclosureInfo {
    address: string;
    auctionPrice: string;
    analysis: string;
}

export interface RentalInfo {
    address: string;
    monthlyRent: string;
    source: string;
}

export interface ValuationReport {
  estimatedPrice: number;
  pricePerSqm: number;
  confidence: string;
  marketSummary: string;
  pros: string[];
  cons: string[];
  amenitiesAnalysis: {
    schools: string;
    transport: string;
    shopping: string;
  };
  realtorAnalysis?: RealtorInfo[] | null;
  foreclosureAnalysis?: {
    summary: string;
    cases: ForeclosureInfo[];
  } | null;
  rentalYieldAnalysisData?: {
    summary: string;
    listings: RentalInfo[];
  } | null;
  inferredDetails?: {
    type: string;
    sizePing: number;
    floor: string;
    layout: string;
  };
}

export interface Filters {
  type: 'all' | '公寓' | '電梯大樓' | '透天厝' | '華廈';
  price: string;
  bedrooms: string;
  yearBuilt: string;
  pricePerSqm: string;
  size: string;
}

export interface ComparisonValuationState {
  report: ValuationReport | null;
  isLoading: boolean;
  error: string | null;
}

export interface ValuationHistoryItem {
  property: Property;
  report: ValuationReport;
  date: string;
}
