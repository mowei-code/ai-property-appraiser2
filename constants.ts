
import type { Property, Filters, Language } from './types';

// Declare the global variable injected by Vite
declare const __BUILD_DATE__: string;

export const APP_VERSION = "v.1120beta002";

// Use the injected build date if available (production build), otherwise use a fallback date (development)
export const APP_RELEASE_DATE = typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString().split('T')[0];

export const mockProperties: Property[] = [
  {
    id: 'prop1',
    address: '臺北市信義區信安街15巷1號',
    city: '臺北市',
    district: '信義區',
    type: '電梯大樓',
    price: 32000000,
    size: 105.6, // Approx 31.9坪
    bedrooms: 3,
    bathrooms: 2,
    yearBuilt: 2012,
    imageUrl: 'https://picsum.photos/seed/prop1/800/600',
    latitude: 25.0279034,
    longitude: 121.5583043,
    floor: '5樓 / 12樓',
  },
  {
    id: 'prop2',
    address: '新北市板橋區文化路一段100號',
    city: '新北市',
    district: '板橋區',
    type: '公寓',
    price: 12000000,
    size: 75,
    bedrooms: 2,
    bathrooms: 1,
    yearBuilt: 1998,
    imageUrl: 'https://picsum.photos/seed/prop2/800/600',
    latitude: 25.0142,
    longitude: 121.4678,
    floor: '4樓 / 5樓',
  },
  {
    id: 'prop3',
    address: '台中市西屯區台灣大道三段301號',
    city: '台中市',
    district: '西屯區',
    type: '華廈',
    price: 25000000,
    size: 120,
    bedrooms: 4,
    bathrooms: 2,
    yearBuilt: 2010,
    imageUrl: 'https://picsum.photos/seed/prop3/800/600',
    latitude: 24.1643,
    longitude: 120.6445,
    floor: '11樓 / 22樓',
  },
  {
    id: 'prop4',
    address: '高雄市左營區博愛二路777號',
    city: '高雄市',
    district: '左營區',
    type: '透天厝',
    price: 38000000,
    size: 200,
    bedrooms: 5,
    bathrooms: 4,
    yearBuilt: 2018,
    imageUrl: 'https://picsum.photos/seed/prop4/800/600',
    latitude: 22.6698,
    longitude: 120.3023,
    floor: '1-4樓 / 4樓',
  },
];

export const getMockProperties = (language: Language): Property[] => {
  const baseProperties: Property[] = JSON.parse(JSON.stringify(mockProperties));

  if (language === 'en') {
    // Prop 1 (Taipei)
    baseProperties[0].address = 'No. 1, Ln. 15, Xin\'an St., Xinyi Dist., Taipei City';
    baseProperties[0].city = 'Taipei City';
    baseProperties[0].district = 'Xinyi District';
    baseProperties[0].floor = '5F / 12F';
    // Prop 2 (New Taipei)
    baseProperties[1].address = 'No. 100, Section 1, Wenhua Rd, Banqiao District, New Taipei City';
    baseProperties[1].city = 'New Taipei City';
    baseProperties[1].district = 'Banqiao District';
    baseProperties[1].floor = '4F / 5F';
    // Prop 3 (Taichung)
    baseProperties[2].address = 'No. 301, Section 3, Taiwan Blvd, Xitun District, Taichung City';
    baseProperties[2].city = 'Taichung City';
    baseProperties[2].district = 'Xitun District';
    baseProperties[2].floor = '11F / 22F';
    // Prop 4 (Kaohsiung)
    baseProperties[3].address = 'No. 777, Bo\'ai 2nd Rd, Zuoying District, Kaohsiung City';
    baseProperties[3].city = 'Kaohsiung City';
    baseProperties[3].district = 'Zuoying District';
    baseProperties[3].floor = '1-4F / 4F';

    return baseProperties;
  }
  if (language === 'zh-CN') {
    baseProperties[0].address = '台北市信义区信安街15巷1号';
    baseProperties[0].city = '台北市';
    baseProperties[0].district = '信义区';
    baseProperties[0].floor = '5楼 / 12楼';

    baseProperties[1].address = '新北市板桥区文化路一段100号';
    baseProperties[1].city = '新北市';
    baseProperties[1].district = '板桥区';
    baseProperties[1].floor = '4楼 / 5楼';

    baseProperties[2].address = '台中市西屯区台湾大道三段301号';
    baseProperties[2].city = '台中市';
    baseProperties[2].district = '西屯区';
    baseProperties[2].floor = '11楼 / 22楼';

    baseProperties[3].address = '高雄市左营区博爱二路777号';
    baseProperties[3].city = '高雄市';
    baseProperties[3].district = '左营区';
    baseProperties[3].floor = '1-4楼 / 4楼';

    return baseProperties;
  }
  if (language === 'ja') {
    baseProperties[0].address = '台北市信義区信安街15巷1号';
    baseProperties[0].city = '台北市';
    baseProperties[0].district = '信義区';
    baseProperties[0].floor = '5階 / 12階';

    baseProperties[1].address = '新北市板橋区文化路一段100号';
    baseProperties[1].city = '新北市';
    baseProperties[1].district = '板橋区';
    baseProperties[1].floor = '4階 / 5階';

    baseProperties[2].address = '台中市西屯区台湾大道三段301号';
    baseProperties[2].city = '台中市';
    baseProperties[2].district = '西屯区';
    baseProperties[2].floor = '11階 / 22階';

    baseProperties[3].address = '高雄市左営区博愛二路777号';
    baseProperties[3].city = '高雄市';
    baseProperties[3].district = '左営区';
    baseProperties[3].floor = '1-4階 / 4階';

    return baseProperties;
  }

  return baseProperties; // For zh-TW
};

export const initialFilters: Filters = {
  type: 'all',
  price: 'all',
  bedrooms: 'all',
  yearBuilt: 'all',
  pricePerSqm: 'all',
  size: 'all',
};

export const PROPERTY_TYPES = ['公寓', '電梯大樓', '透天厝', '華廈'];

export const PRICE_RANGES = [
  { value: 'all', label: '所有價格' },
  { value: '0-1500', label: '1500萬以下' },
  { value: '1500-3000', label: '1500-3000萬' },
  { value: '3000-5000', label: '3000-5000萬' },
  { value: '5000+', label: '5000萬以上' },
];

export const BEDROOM_OPTIONS = [
  { value: 'all', label: '所有房型' },
  { value: '1', label: '1房' },
  { value: '2', label: '2房' },
  { value: '3', label: '3房' },
  { value: '4', label: '4房' },
  { value: '5+', label: '5房以上' },
];

export const YEAR_BUILT_RANGES = [
  { value: 'all', label: '所有屋齡' },
  { value: '0-5', label: '5年內' },
  { value: '5-10', label: '5-10年' },
  { value: '10-20', label: '10-20年' },
  { value: '20+', label: '20年以上' },
];

export const PRICE_PER_SQM_RANGES = [
  { value: 'all', label: '所有單價' },
  { value: '0-200000', label: '20萬/㎡ 以下' },
  { value: '200000-300000', label: '20-30萬/㎡' },
  { value: '300000-400000', label: '30-40萬/㎡' },
  { value: '400000+', label: '40萬/㎡ 以上' },
];

export const SIZE_RANGES = [
  { value: 'all', label: '任意坪數' },
  { value: '0-30', label: '30坪以下' },
  { value: '30-60', label: '30-60坪' },
  { value: '60+', label: '60坪以上' },
];