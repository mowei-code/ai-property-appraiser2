
import type { Property, Language } from '../types';

// This file contains a static snapshot of real estate data.
// It serves as a reliable fallback to ensure the application can always initialize and function,
// even when live API calls via CORS proxies fail.

const TAIPEI_DAAN: Property[] = [
    // User-provided transactions for 羅斯福路二段79之1號
  {
    "id": "real_lvr_1",
    "address": "台北市大安區羅斯福路二段79之1號七樓之5",
    "district": "大安區",
    "type": "華廈",
    "price": 10000000,
    "size": 56.39, // 17.06坪
    "bedrooms": 1,
    "bathrooms": 1,
    "yearBuilt": 1986,
    "imageUrl": "https://picsum.photos/seed/real_lvr_1/800/600",
    "floor": "七層/十二層",
    "transactionDate": "2025-06-26",
    "remarks": "資料來源: 內政部實價登錄"
  },
  {
    "id": "real_lvr_2",
    "address": "台北市大安區羅斯福路二段79之1號五樓之6",
    "district": "大安區",
    "type": "華廈",
    "price": 11080000,
    "size": 39.80, // 12.04坪
    "bedrooms": 1,
    "bathrooms": 1,
    "yearBuilt": 1986,
    "imageUrl": "https://picsum.photos/seed/real_lvr_2/800/600",
    "floor": "五層/十二層",
    "transactionDate": "2025-05-21",
    "remarks": "資料來源: 內政部實價登錄"
  },
  {
    "id": "real_lvr_3",
    "address": "台北市大安區羅斯福路二段79之1號九樓",
    "district": "大安區",
    "type": "華廈",
    "price": 24880000,
    "size": 90.54, // 27.39坪
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 1988,
    "imageUrl": "https://picsum.photos/seed/real_lvr_3/800/600",
    "floor": "九層/十二層",
    "transactionDate": "2023-08-20",
    "remarks": "資料來源: 內政部實價登錄"
  },
  {
    "id": "real_lvr_4",
    "address": "台北市大安區羅斯福路二段79之1號九樓之4",
    "district": "大安區",
    "type": "華廈",
    "price": 10500000,
    "size": 41.12, // 12.44坪
    "bedrooms": 2,
    "bathrooms": 1,
    "yearBuilt": 1989,
    "imageUrl": "https://picsum.photos/seed/real_lvr_4/800/600",
    "floor": "九層/十二層",
    "transactionDate": "2022-06-06",
    "remarks": "資料來源: 內政部實價登錄"
  },
  {
    "id": "real_A1",
    "address": "台北市大安區信義路四段25號",
    "district": "大安區",
    "type": "電梯大樓",
    "price": 68000000,
    "size": 135.5,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 2015,
    "imageUrl": "https://picsum.photos/seed/realA1/800/600",
    "floor": "12樓/25樓",
    "transactionDate": "2023-11-05"
  },
  {
    "id": "real_A2",
    "address": "台北市大安區和平東路一段162號",
    "district": "大安區",
    "type": "公寓",
    "price": 18500000,
    "size": 88.1,
    "bedrooms": 3,
    "bathrooms": 1,
    "yearBuilt": 1985,
    "imageUrl": "https://picsum.photos/seed/realA2/800/600",
    "floor": "4樓/5樓",
    "transactionDate": "2024-01-20",
    "remarks": "親友間交易，價格偏低"
  },
  {
    "id": "real_A3",
    "address": "台北市大安區羅斯福路三段81巷",
    "district": "大安區",
    "type": "華廈",
    "price": 32000000,
    "size": 75.5,
    "bedrooms": 2,
    "bathrooms": 2,
    "yearBuilt": 2008,
    "imageUrl": "https://picsum.photos/seed/realA3/800/600",
    "floor": "5樓/10樓",
    "transactionDate": "2023-09-15"
  },
  {
    "id": "real_A4",
    "address": "台北市大安區復興南路一段300號",
    "district": "大安區",
    "type": "電梯大樓",
    "price": 85000000,
    "size": 180.2,
    "bedrooms": 4,
    "bathrooms": 3,
    "yearBuilt": 2018,
    "imageUrl": "https://picsum.photos/seed/realA4/800/600",
    "floor": "20樓/28樓",
    "transactionDate": "2024-02-01"
  },
  {
    "id": "real_A5",
    "address": "台北市大安區仁愛路四段112巷",
    "district": "大安區",
    "type": "電梯大樓",
    "price": 95000000,
    "size": 205.0,
    "bedrooms": 4,
    "bathrooms": 3,
    "yearBuilt": 2005,
    "imageUrl": "https://picsum.photos/seed/realA5/800/600",
    "floor": "9樓/14樓",
    "transactionDate": "2024-03-12"
  }
];

const NEW_TAIPEI_BANQIAO: Property[] = [
  {
    "id": "real_B1",
    "address": "新北市板橋區縣民大道二段10號",
    "district": "板橋區",
    "type": "電梯大樓",
    "price": 45000000,
    "size": 120.7,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 2012,
    "imageUrl": "https://picsum.photos/seed/realB1/800/600",
    "floor": "18樓/30樓",
    "transactionDate": "2023-12-10"
  },
  {
    "id": "real_B2",
    "address": "新北市板橋區中山路一段150號",
    "district": "板橋區",
    "type": "華廈",
    "price": 18500000,
    "size": 85.3,
    "bedrooms": 2,
    "bathrooms": 1,
    "yearBuilt": 1999,
    "imageUrl": "https://picsum.photos/seed/realB2/800/600",
    "floor": "7樓/12樓",
    "transactionDate": "2024-01-08"
  },
  {
    "id": "real_B3",
    "address": "新北市板橋區漢生東路270巷",
    "district": "板橋區",
    "type": "公寓",
    "price": 16000000,
    "size": 95.0,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 1988,
    "imageUrl": "https://picsum.photos/seed/realB3/800/600",
    "floor": "3樓/5樓",
    "transactionDate": "2023-10-25",
    "remarks": "含頂樓增建"
  },
  {
    "id": "real_B4",
    "address": "新北市板橋區新站路28號",
    "district": "板橋區",
    "type": "電梯大樓",
    "price": 62000000,
    "size": 155.8,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 2019,
    "imageUrl": "https://picsum.photos/seed/realB4/800/600",
    "floor": "25樓/34樓",
    "transactionDate": "2024-04-05"
  }
];

const NEW_TAIPEI_ZHONGHE: Property[] = [
  {
    "id": "real_ZH1",
    "address": "新北市中和區中正路7號七樓",
    "district": "中和區",
    "type": "華廈",
    "price": 21250000,
    "size": 158.94,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 1998,
    "imageUrl": "https://picsum.photos/seed/realZH1/800/600",
    "floor": "七層/十二層",
    "transactionDate": "2023-10-22",
    "remarks": "資料來源: 內政部實價登錄"
  },
  {
    "id": "real_ZH2",
    "address": "新北市中和區中山路三段122號十七樓",
    "district": "中和區",
    "type": "電梯大樓",
    "price": 26800000,
    "size": 173.88,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 1996,
    "imageUrl": "https://picsum.photos/seed/realZH2/800/600",
    "floor": "十七層/二十七層",
    "transactionDate": "2024-06-21",
    "remarks": "資料來源: 內政部實價登錄"
  },
  {
    "id": "real_ZH3",
    "address": "新北市中和區南山路122號十九樓",
    "district": "中和區",
    "type": "電梯大樓",
    "price": 30000000,
    "size": 164.00,
    "bedrooms": 4,
    "bathrooms": 2,
    "yearBuilt": 1999,
    "imageUrl": "https://picsum.photos/seed/realZH3/800/600",
    "floor": "十九層/二十六層",
    "transactionDate": "2024-04-20",
    "remarks": "資料來源: 內政部實價登錄"
  },
  {
    "id": "real_ZH4",
    "address": "新北市中和區中山路126號十一樓之一",
    "district": "中和區",
    "type": "華廈",
    "price": 24000000,
    "size": 190.28,
    "bedrooms": 4,
    "bathrooms": 2,
    "yearBuilt": 1998,
    "imageUrl": "https://picsum.photos/seed/realZH4/800/600",
    "floor": "十一層/二十五層",
    "transactionDate": "2023-09-15",
    "remarks": "資料來源: 內政部實價登錄"
  },
   {
    "id": "real_ZH5",
    "address": "新北市中和區景平路680號",
    "district": "中和區",
    "type": "電梯大樓",
    "price": 19800000,
    "size": 110.5,
    "bedrooms": 2,
    "bathrooms": 1,
    "yearBuilt": 2005,
    "imageUrl": "https://picsum.photos/seed/realZH5/800/600",
    "floor": "10樓/22樓",
    "transactionDate": "2024-05-10"
  }
];

const TAICHUNG_XITUN: Property[] = [
  {
    "id": "real_C1",
    "address": "台中市西屯區市政路100號",
    "district": "西屯區",
    "type": "電梯大樓",
    "price": 38000000,
    "size": 150.5,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 2017,
    "imageUrl": "https://picsum.photos/seed/realC1/800/600",
    "floor": "22樓/29樓",
    "transactionDate": "2023-11-20"
  },
  {
    "id": "real_C2",
    "address": "台中市西屯區逢甲路20巷",
    "district": "西屯區",
    "type": "透天厝",
    "price": 42000000,
    "size": 210.0,
    "bedrooms": 5,
    "bathrooms": 4,
    "yearBuilt": 2005,
    "imageUrl": "https://picsum.photos/seed/realC2/800/600",
    "floor": "1-4樓/4樓",
    "transactionDate": "2024-01-30"
  },
  {
    "id": "real_C3",
    "address": "台中市西屯區青海路二段200號",
    "district": "西屯區",
    "type": "華廈",
    "price": 17800000,
    "size": 102.5,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 2008,
    "imageUrl": "https://picsum.photos/seed/realC3/800/600",
    "floor": "6樓/14樓",
    "transactionDate": "2024-02-18"
  }
];

const KAOHSIUNG_ZUOYING: Property[] = [
  {
    "id": "real_D1",
    "address": "高雄市左營區博愛三路10號",
    "district": "左營區",
    "type": "電梯大樓",
    "price": 28000000,
    "size": 140.8,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 2016,
    "imageUrl": "https://picsum.photos/seed/realD1/800/600",
    "floor": "15樓/24樓",
    "transactionDate": "2023-12-01"
  },
  {
    "id": "real_D2",
    "address": "高雄市左營區富國路200號",
    "district": "左營區",
    "type": "華廈",
    "price": 15000000,
    "size": 105.2,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 2002,
    "imageUrl": "https://picsum.photos/seed/realD2/800/600",
    "floor": "8樓/12樓",
    "transactionDate": "2024-02-05"
  },
  {
    "id": "real_D3",
    "address": "高雄市左營區明誠二路330號",
    "district": "左營區",
    "type": "電梯大樓",
    "price": 21500000,
    "size": 125.5,
    "bedrooms": 3,
    "bathrooms": 2,
    "yearBuilt": 2014,
    "imageUrl": "https://picsum.photos/seed/realD3/800/600",
    "floor": "11樓/21樓",
    "transactionDate": "2024-03-22"
  }
];

const TAIPEI_ZHONGSHAN: Property[] = [
  { "id": "real_E1", "address": "台北市中山區南京東路三段200號", "district": "中山區", "type": "電梯大樓", "price": 55000000, "size": 130, "bedrooms": 3, "bathrooms": 2, "yearBuilt": 2010, "imageUrl": "https://picsum.photos/seed/realE1/800/600", "floor": "10樓/15樓", "transactionDate": "2024-01-15" },
  { "id": "real_E2", "address": "台北市中山區民生東路二段147巷", "district": "中山區", "type": "公寓", "price": 21000000, "size": 90, "bedrooms": 3, "bathrooms": 1, "yearBuilt": 1982, "imageUrl": "https://picsum.photos/seed/realE2/800/600", "floor": "3樓/5樓", "transactionDate": "2023-11-28" }
];

const TAIPEI_XINYI: Property[] = [
  { "id": "real_F1", "address": "台北市信義區信義路五段7號", "district": "信義區", "type": "電梯大樓", "price": 120000000, "size": 250, "bedrooms": 4, "bathrooms": 3, "yearBuilt": 2014, "imageUrl": "https://picsum.photos/seed/realF1/800/600", "floor": "50樓/91樓", "transactionDate": "2024-02-20" },
  { "id": "real_F2", "address": "台北市信義區松山路540巷", "district": "信義區", "type": "公寓", "price": 19500000, "size": 85, "bedrooms": 3, "bathrooms": 1, "yearBuilt": 1980, "imageUrl": "https://picsum.photos/seed/realF2/800/600", "floor": "2樓/4樓", "transactionDate": "2023-12-05" }
];

const NEW_TAIPEI_XINDIAN: Property[] = [
  { "id": "real_G1", "address": "新北市新店區北新路三段100號", "district": "新店區", "type": "電梯大樓", "price": 32000000, "size": 115, "bedrooms": 3, "bathrooms": 2, "yearBuilt": 2015, "imageUrl": "https://picsum.photos/seed/realG1/800/600", "floor": "11樓/23樓", "transactionDate": "2024-03-10" },
  { "id": "real_G2", "address": "新北市新店區中正路500巷", "district": "新店區", "type": "公寓", "price": 14000000, "size": 92, "bedrooms": 3, "bathrooms": 1, "yearBuilt": 1989, "imageUrl": "https://picsum.photos/seed/realG2/800/600", "floor": "4樓/5樓", "transactionDate": "2023-11-11" }
];

const TAICHUNG_BEITUN: Property[] = [
  { "id": "real_H1", "address": "台中市北屯區崇德路三段50號", "district": "北屯區", "type": "電梯大樓", "price": 28000000, "size": 145, "bedrooms": 3, "bathrooms": 2, "yearBuilt": 2018, "imageUrl": "https://picsum.photos/seed/realH1/800/600", "floor": "16樓/24樓", "transactionDate": "2024-02-15" },
  { "id": "real_H2", "address": "台中市北屯區文心路四段800號", "district": "北屯區", "type": "華廈", "price": 15500000, "size": 100, "bedrooms": 3, "bathrooms": 2, "yearBuilt": 2005, "imageUrl": "https://picsum.photos/seed/realH2/800/600", "floor": "9樓/14樓", "transactionDate": "2023-12-22" }
];

const KAOHSIUNG_GUSHAN: Property[] = [
  { "id": "real_I1", "address": "高雄市鼓山區美術館路80號", "district": "鼓山區", "type": "電梯大樓", "price": 42000000, "size": 180, "bedrooms": 4, "bathrooms": 3, "yearBuilt": 2017, "imageUrl": "https://picsum.photos/seed/realI1/800/600", "floor": "20樓/28樓", "transactionDate": "2024-01-25" },
  { "id": "real_I2", "address": "高雄市鼓山區臨海二路10號", "district": "鼓山區", "type": "透天厝", "price": 35000000, "size": 190, "bedrooms": 5, "bathrooms": 4, "yearBuilt": 2008, "imageUrl": "https://picsum.photos/seed/realI2/800/600", "floor": "1-3樓/3樓", "transactionDate": "2023-10-30" }
];

const TAINAN_EAST: Property[] = [
  { "id": "real_J1", "address": "台南市東區中華東路三段300號", "district": "東區", "type": "電梯大樓", "price": 18000000, "size": 125, "bedrooms": 3, "bathrooms": 2, "yearBuilt": 2015, "imageUrl": "https://picsum.photos/seed/realJ1/800/600", "floor": "10樓/19樓", "transactionDate": "2024-04-01" },
  { "id": "real_J2", "address": "台南市東區大學路西段89號", "district": "東區", "type": "華廈", "price": 11000000, "size": 95, "bedrooms": 2, "bathrooms": 2, "yearBuilt": 2008, "imageUrl": "https://picsum.photos/seed/realJ2/800/600", "floor": "5樓/10樓", "transactionDate": "2023-12-15" }
];

const HSINCHU_EAST: Property[] = [
  { "id": "real_K1", "address": "新竹市東區關新路100號", "district": "東區", "type": "電梯大樓", "price": 25000000, "size": 110, "bedrooms": 3, "bathrooms": 2, "yearBuilt": 2018, "imageUrl": "https://picsum.photos/seed/realK1/800/600", "floor": "14樓/25樓", "transactionDate": "2024-03-20" },
  { "id": "real_K2", "address": "新竹市東區光復路一段50巷", "district": "東區", "type": "公寓", "price": 9800000, "size": 88, "bedrooms": 3, "bathrooms": 1, "yearBuilt": 1995, "imageUrl": "https://picsum.photos/seed/realK2/800/600", "floor": "2樓/5樓", "transactionDate": "2024-01-10" }
];

export const MOCK_REAL_ESTATE_DATA: Record<string, Property[]> = {
    '台北-大安': TAIPEI_DAAN,
    '台北-信義': TAIPEI_XINYI,
    '台北-中山': TAIPEI_ZHONGSHAN,
    '台北-中正': TAIPEI_DAAN, // Using Daan as fallback
    '台北-松山': TAIPEI_ZHONGSHAN, // Using Zhongshan as fallback
    '新北-板橋': NEW_TAIPEI_BANQIAO,
    '新北-中和': NEW_TAIPEI_ZHONGHE,
    '新北-永和': NEW_TAIPEI_ZHONGHE, // Yonghe is adjacent to Zhonghe
    '新北-新店': NEW_TAIPEI_XINDIAN,
    '新北-新莊': NEW_TAIPEI_BANQIAO, // Using Banqiao as fallback
    '新北-三重': NEW_TAIPEI_BANQIAO, // Using Banqiao as fallback
    '台中-西屯': TAICHUNG_XITUN,
    '台中-南屯': TAICHUNG_XITUN, // Using Xitun as fallback
    '台中-北屯': TAICHUNG_BEITUN,
    '高雄-左營': KAOHSIUNG_ZUOYING,
    '高雄-鼓山': KAOHSIUNG_GUSHAN,
    '高雄-三民': KAOHSIUNG_ZUOYING, // Using Zuoying as fallback
    '台南-東': TAINAN_EAST,
    '台南-安平': TAINAN_EAST,
    '新竹-東': HSINCHU_EAST,
    '新竹-竹北': HSINCHU_EAST,
};


const translations: Record<Language, Record<string, Partial<Property>>> = {
    'en': {
        // TAIPEI_DAAN
        'real_lvr_1': { address: '7F-5, No. 79-1, Sec. 2, Roosevelt Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '7F/12F' },
        'real_lvr_2': { address: '5F-6, No. 79-1, Sec. 2, Roosevelt Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '5F/12F' },
        'real_lvr_3': { address: '9F, No. 79-1, Sec. 2, Roosevelt Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '9F/12F' },
        'real_lvr_4': { address: '9F-4, No. 79-1, Sec. 2, Roosevelt Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '9F/12F' },
        'real_A1': { address: 'No. 25, Sec. 4, Xinyi Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '12F/25F' },
        'real_A2': { address: 'No. 162, Sec. 1, Heping E. Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '4F/5F' },
        'real_A3': { address: 'Ln. 81, Sec. 3, Roosevelt Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '5F/10F' },
        'real_A4': { address: 'No. 300, Sec. 1, Fuxing S. Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '20F/28F' },
        'real_A5': { address: 'Ln. 112, Sec. 4, Ren\'ai Rd, Da\'an Dist., Taipei City', district: "Da'an District", floor: '9F/14F' },
        // NEW_TAIPEI_BANQIAO
        'real_B1': { address: 'No. 10, Sec. 2, Xianmin Blvd, Banqiao Dist., New Taipei City', district: 'Banqiao District', floor: '18F/30F' },
        'real_B2': { address: 'No. 150, Sec. 1, Zhongshan Rd, Banqiao Dist., New Taipei City', district: 'Banqiao District', floor: '7F/12F' },
        'real_B3': { address: 'Ln. 270, Hansheng E. Rd, Banqiao Dist., New Taipei City', district: 'Banqiao District', floor: '3F/5F' },
        'real_B4': { address: 'No. 28, Xinzhan Rd, Banqiao Dist., New Taipei City', district: 'Banqiao District', floor: '25F/34F' },
        // NEW_TAIPEI_ZHONGHE
        'real_ZH1': { address: '7F, No. 7, Zhongzheng Rd, Zhonghe Dist., New Taipei City', district: 'Zhonghe District', floor: '7F/12F' },
        'real_ZH2': { address: '17F, No. 122, Sec. 3, Zhongshan Rd, Zhonghe Dist., New Taipei City', district: 'Zhonghe District', floor: '17F/27F' },
        'real_ZH3': { address: '19F, No. 122, Nanshan Rd, Zhonghe Dist., New Taipei City', district: 'Zhonghe District', floor: '19F/26F' },
        'real_ZH4': { address: '11F-1, No. 126, Zhongshan Rd, Zhonghe Dist., New Taipei City', district: 'Zhonghe District', floor: '11F/25F' },
        'real_ZH5': { address: 'No. 680, Jingping Rd, Zhonghe Dist., New Taipei City', district: 'Zhonghe District', floor: '10F/22F' },
        // TAICHUNG_XITUN
        'real_C1': { address: 'No. 100, Shizheng Rd, Xitun Dist., Taichung City', district: 'Xitun District', floor: '22F/29F' },
        'real_C2': { address: 'Ln. 20, Fengjia Rd, Xitun Dist., Taichung City', district: 'Xitun District', floor: '1-4F/4F' },
        'real_C3': { address: 'No. 200, Sec. 2, Qinghai Rd, Xitun Dist., Taichung City', district: 'Xitun District', floor: '6F/14F' },
        // KAOHSIUNG_ZUOYING
        'real_D1': { address: 'No. 10, Sec. 3, Bo\'ai Rd, Zuoying Dist., Kaohsiung City', district: 'Zuoying District', floor: '15F/24F' },
        'real_D2': { address: 'No. 200, Fuguo Rd, Zuoying Dist., Kaohsiung City', district: 'Zuoying District', floor: '8F/12F' },
        'real_D3': { address: 'No. 330, Mingcheng 2nd Rd, Zuoying Dist., Kaohsiung City', district: 'Zuoying District', floor: '11F/21F' },
        // New Additions
        'real_E1': { address: 'No. 200, Sec. 3, Nanjing E. Rd, Zhongshan Dist., Taipei City', district: 'Zhongshan District', floor: '10F/15F' },
        'real_E2': { address: 'Ln. 147, Sec. 2, Minsheng E. Rd, Zhongshan Dist., Taipei City', district: 'Zhongshan District', floor: '3F/5F' },
        'real_F1': { address: 'No. 7, Sec. 5, Xinyi Rd, Xinyi Dist., Taipei City', district: 'Xinyi District', floor: '50F/91F' },
        'real_F2': { address: 'Ln. 540, Songshan Rd, Xinyi Dist., Taipei City', district: 'Xinyi District', floor: '2F/4F' },
        'real_G1': { address: 'No. 100, Sec. 3, Beixin Rd, Xindian Dist., New Taipei City', district: 'Xindian District', floor: '11F/23F' },
        'real_G2': { address: 'Ln. 500, Zhongzheng Rd, Xindian Dist., New Taipei City', district: 'Xindian District', floor: '4F/5F' },
        'real_H1': { address: 'No. 50, Sec. 3, Chongde Rd, Beitun Dist., Taichung City', district: 'Beitun District', floor: '16F/24F' },
        'real_H2': { address: 'No. 800, Sec. 4, Wenxin Rd, Beitun Dist., Taichung City', district: 'Beitun District', floor: '9F/14F' },
        'real_I1': { address: 'No. 80, Meishuguan Rd, Gushan Dist., Kaohsiung City', district: 'Gushan District', floor: '20F/28F' },
        'real_I2': { address: 'No. 10, Linhai 2nd Rd, Gushan Dist., Kaohsiung City', district: 'Gushan District', floor: '1-3F/3F' },
        'real_J1': { address: 'No. 300, Sec. 3, Zhonghua E. Rd, East Dist., Tainan City', district: 'East District', floor: '10F/19F' },
        'real_J2': { address: 'No. 89, Daxue Rd. W. Sec., East Dist., Tainan City', district: 'East District', floor: '5F/10F' },
        'real_K1': { address: 'No. 100, Guanxin Rd, East Dist., Hsinchu City', district: 'East District', floor: '14F/25F' },
        'real_K2': { address: 'Ln. 50, Sec. 1, Guangfu Rd, East Dist., Hsinchu City', district: 'East District', floor: '2F/5F' },
    },
    'zh-CN': {
        // TAIPEI_DAAN
        'real_lvr_1': { address: '台北市大安区罗斯福路二段79之1号七楼之5', district: "大安区", floor: '七层/十二层' },
        'real_lvr_2': { address: '台北市大安区罗斯福路二段79之1号五楼之6', district: "大安区", floor: '五层/十二层' },
        'real_lvr_3': { address: '台北市大安区罗斯福路二段79之1号九楼', district: "大安区", floor: '九层/十二层' },
        'real_lvr_4': { address: '台北市大安区罗斯福路二段79之1号九楼之4', district: "大安区", floor: '九层/十二层' },
        'real_A1': { address: '台北市大安区信义路四段25号', district: "大安区", floor: '12楼/25楼' },
        'real_A2': { address: '台北市大安区和平东路一段162号', district: "大安区", floor: '4楼/5楼' },
        'real_A3': { address: '台北市大安区罗斯福路三段81巷', district: "大安区", floor: '5楼/10楼' },
        'real_A4': { address: '台北市大安区复兴南路一段300号', district: "大安区", floor: '20楼/28楼' },
        'real_A5': { address: '台北市大安区仁爱路四段112巷', district: "大安区", floor: '9楼/14楼' },
        // NEW_TAIPEI_BANQIAO
        'real_B1': { address: '新北市板桥区县民大道二段10号', district: '板桥区', floor: '18楼/30楼' },
        'real_B2': { address: '新北市板桥区中山路一段150号', district: '板桥区', floor: '7楼/12楼' },
        'real_B3': { address: '新北市板桥区汉生东路270巷', district: '板桥区', floor: '3楼/5楼' },
        'real_B4': { address: '新北市板桥区新站路28号', district: '板桥区', floor: '25楼/34楼' },
        // NEW_TAIPEI_ZHONGHE
        'real_ZH1': { address: '新北市中和区中正路7号七楼', district: '中和区', floor: '七层/十二层' },
        'real_ZH2': { address: '新北市中和区中山路三段122号十七楼', district: '中和区', floor: '十七层/二十七层' },
        'real_ZH3': { address: '新北市中和区南山路122号十九楼', district: '中和区', floor: '十九层/二十六层' },
        'real_ZH4': { address: '新北市中和区中山路126号十一楼之一', district: '中和区', floor: '十一层/二十五层' },
        'real_ZH5': { address: '新北市中和区景平路680号', district: '中和区', floor: '10楼/22楼' },
        // TAICHUNG_XITUN
        'real_C1': { address: '台中市西屯区市政路100号', district: '西屯区', floor: '22楼/29楼' },
        'real_C2': { address: '台中市西屯区逢甲路20巷', district: '西屯区', floor: '1-4楼/4楼' },
        'real_C3': { address: '台中市西屯区青海路二段200号', district: '西屯区', floor: '6楼/14楼' },
        // KAOHSIUNG_ZUOYING
        'real_D1': { address: '高雄市左营区博爱三路10号', district: '左营区', floor: '15楼/24楼' },
        'real_D2': { address: '高雄市左营区富国路200号', district: '左营区', floor: '8楼/12楼' },
        'real_D3': { address: '高雄市左营区明诚二路330号', district: '左营区', floor: '11楼/21楼' },
        // New Additions
        'real_E1': { address: '台北市中山区南京东路三段200号', district: '中山区', floor: '10楼/15楼' },
        'real_E2': { address: '台北市中山区民生东路二段147巷', district: '中山区', floor: '3楼/5楼' },
        'real_F1': { address: '台北市信义区信义路五段7号', district: '信义区', floor: '50楼/91楼' },
        'real_F2': { address: '台北市信义区松山路540巷', district: '信义区', floor: '2楼/4楼' },
        'real_G1': { address: '新北市新店区北新路三段100号', district: '新店区', floor: '11楼/23楼' },
        'real_G2': { address: '新北市新店区中正路500巷', district: '新店区', floor: '4楼/5楼' },
        'real_H1': { address: '台中市北屯区崇德路三段50号', district: '北屯区', floor: '16楼/24楼' },
        'real_H2': { address: '台中市北屯区文心路四段800号', district: '北屯区', floor: '9楼/14楼' },
        'real_I1': { address: '高雄市鼓山区美术馆路80号', district: '鼓山区', floor: '20楼/28楼' },
        'real_I2': { address: '高雄市鼓山区临海二路10号', district: '鼓山区', floor: '1-3楼/3楼' },
        'real_J1': { address: '台南市东区中华东路三段300号', district: '东区', floor: '10楼/19楼' },
        'real_J2': { address: '台南市东区大学路西段89号', district: '东区', floor: '5楼/10楼' },
        'real_K1': { address: '新竹市东区关新路100号', district: '东区', floor: '14楼/25楼' },
        'real_K2': { address: '新竹市东区光复路一段50巷', district: '东区', floor: '2楼/5楼' },
    },
    'ja': {
        // TAIPEI_DAAN
        'real_lvr_1': { address: '台北市大安区羅斯福路二段79之1号7階の5', district: "大安区", floor: '7階/12階' },
        'real_lvr_2': { address: '台北市大安区羅斯福路二段79之1号5階の6', district: "大安区", floor: '5階/12階' },
        'real_lvr_3': { address: '台北市大安区羅斯福路二段79之1号9階', district: "大安区", floor: '9階/12階' },
        'real_lvr_4': { address: '台北市大安区羅斯福路二段79之1号9階の4', district: "大安区", floor: '9階/12階' },
        'real_A1': { address: '台北市大安区信義路四段25号', district: "大安区", floor: '12階/25階' },
        'real_A2': { address: '台北市大安区和平東路一段162号', district: "大安区", floor: '4階/5階' },
        'real_A3': { address: '台北市大安区羅斯福路三段81巷', district: "大安区", floor: '5階/10階' },
        'real_A4': { address: '台北市大安区復興南路一段300号', district: "大安区", floor: '20階/28階' },
        'real_A5': { address: '台北市大安区仁愛路四段112巷', district: "大安区", floor: '9階/14階' },
        // NEW_TAIPEI_BANQIAO
        'real_B1': { address: '新北市板橋区県民大道二段10号', district: '板橋区', floor: '18階/30階' },
        'real_B2': { address: '新北市板橋区中山路一段150号', district: '板橋区', floor: '7階/12階' },
        'real_B3': { address: '新北市板橋区漢生東路270巷', district: '板橋区', floor: '3階/5階' },
        'real_B4': { address: '新北市板橋区新站路28号', district: '板橋区', floor: '25階/34階' },
        // NEW_TAIPEI_ZHONGHE
        'real_ZH1': { address: '新北市中和区中正路7号7階', district: '中和区', floor: '7階/12階' },
        'real_ZH2': { address: '新北市中和区中山路三段122号17階', district: '中和区', floor: '17階/27階' },
        'real_ZH3': { address: '新北市中和区南山路122号19階', district: '中和区', floor: '19階/26階' },
        'real_ZH4': { address: '新北市中和区中山路126号11階の1', district: '中和区', floor: '11階/25階' },
        'real_ZH5': { address: '新北市中和区景平路680号', district: '中和区', floor: '10階/22階' },
        // TAICHUNG_XITUN
        'real_C1': { address: '台中市西屯区市政路100号', district: '西屯区', floor: '22階/29階' },
        'real_C2': { address: '台中市西屯区逢甲路20巷', district: '西屯区', floor: '1-4階/4階' },
        'real_C3': { address: '台中市西屯区青海路二段200号', district: '西屯区', floor: '6階/14階' },
        // KAOHSIUNG_ZUOYING
        'real_D1': { address: '高雄市左営区博愛三路10号', district: '左営区', floor: '15階/24階' },
        'real_D2': { address: '高雄市左営区富国路200号', district: '左営区', floor: '8階/12階' },
        'real_D3': { address: '高雄市左営区明誠二路330号', district: '左営区', floor: '11階/21階' },
        // New Additions
        'real_E1': { address: '台北市中山区南京東路三段200号', district: '中山区', floor: '10階/15階' },
        'real_E2': { address: '台北市中山区民生東路二段147巷', district: '中山区', floor: '3階/5階' },
        'real_F1': { address: '台北市信義区信義路五段7号', district: '信義区', floor: '50階/91階' },
        'real_F2': { address: '台北市信義区松山路540巷', district: '信義区', floor: '2階/4階' },
        'real_G1': { address: '新北市新店区北新路三段100号', district: '新店区', floor: '11階/23階' },
        'real_G2': { address: '新北市新店区中正路500巷', district: '新店区', floor: '4階/5階' },
        'real_H1': { address: '台中市北屯区崇徳路三段50号', district: '北屯区', floor: '16階/24階' },
        'real_H2': { address: '台中市北屯区文心路四段800号', district: '北屯区', floor: '9階/14階' },
        'real_I1': { address: '高雄市鼓山区美術館路80号', district: '鼓山区', floor: '20階/28階' },
        'real_I2': { address: '高雄市鼓山区臨海二路10号', district: '鼓山区', floor: '1-3階/3階' },
        'real_J1': { address: '台南市東区中華東路三段300号', district: '東区', floor: '10階/19階' },
        'real_J2': { address: '台南市東区大学路西段89号', district: '東区', floor: '5階/10階' },
        'real_K1': { address: '新竹市東区関新路100号', district: '東区', floor: '14階/25階' },
        'real_K2': { address: '新竹市東区光復路一段50巷', district: '東区', floor: '2階/5階' },
    },
    'zh-TW': {}, // No translation needed for default
};

export const translateMockData = (data: Property[], language: Language): Property[] => {
    if (language === 'zh-TW') {
        return data;
    }
    const langTranslations = translations[language] || {};
    return data.map(prop => {
        const translation = langTranslations[prop.id];
        if (translation) {
            return { ...prop, ...translation };
        }
        return prop;
    });
};
