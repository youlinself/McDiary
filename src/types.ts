export interface NutritionFood {
  productName: string;
  nutritionDescription: string;
  energyKj: number;
  energyKcal: number;
  protein: number;
  fat: number;
  carbohydrate: number;
  sodium: number;
  calcium: number;
}

export interface ComboItem {
  productCode: string;
  name: string;
  quantity: number;
}

export interface OrderProduct {
  productCode: string;
  productName: string;
  quantity: number;
  comboItemList?: ComboItem[];
}

export interface Order {
  orderId: string;
  orderType?: string;
  createTime: string;
  storeCode?: string;
  storeName: string;
  orderStatus: string;
  realTotalAmount: string;
  orderProductList: OrderProduct[];
}

export interface CalendarButton {
  status?: number;
  themeColor?: number;
  text?: string;
  subText?: string;
  color?: string;
  buttonStyle?: number;
}

export interface CalendarArticle {
  title?: string;
  content?: string;
  highlights?: string;
  imgList?: string[];
  buttonText?: string;
  buttonIcon?: string;
  appJumpUrl?: string;
}

export interface CalendarEvent {
  activityCode: string;
  activityStage?: number;
  eventType?: number;
  subscribeScene?: string;
  resourceId?: string;
  position?: string;
  showStyle?: number;
  activityTitle?: string;
  activityTag?: string;
  price?: string;
  priceSuffix?: string;
  activitySubTitle?: string;
  activityBgColor?: string;
  button?: CalendarButton;
  articleDto?: CalendarArticle;
  showType?: number;
}

export interface CalendarDay {
  date: string;
  dateText: string;
  today: boolean;
  events: CalendarEvent[];
}

export interface CalendarData {
  currentTime: string;
  dailyList: CalendarDay[];
  subscribedEvents?: unknown;
}

export interface NowInfo {
  date: string;
  datetime?: string;
  formatted?: string;
  dayOfWeek?: string;
  timezone?: string;
  timestamp?: number;
}
