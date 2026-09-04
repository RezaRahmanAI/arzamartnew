export interface GeneralSettings {
  websiteName: string;
  websiteShortName: string;
  tagline: string;
  description: string;
  websiteStatus: "live" | "maintenance";
  maintenanceMessage: string;
  defaultLanguage: string;
  defaultCurrency: string;
  currencySymbol: string;
  timeZone: string;
  dateFormat: string;
  timeFormat: string;
}

export interface BrandingSettings {
  headerLogo: string;
  footerLogo: string;
  darkLogo: string;
  lightLogo: string;
  favicon: string;
  mobileLogo: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  borderRadius: string;
  fontFamily: string;
  toastSuccessColor?: string;
  toastErrorColor?: string;
  toastInfoColor?: string;
}

export interface ContactSettings {
  companyName: string;
  ownerName: string;
  supportPhone: string;
  salesPhone: string;
  whatsAppNumber: string;
  emailAddress: string;
  supportEmail: string;
  officeAddress: string;
  googleMapEmbedUrl: string;
}

export interface ShippingRule {
  id: string;
  name: string;
  charge: number;
  estimatedDeliveryTime: string;
  status: "active" | "inactive";
  displayOrder: number;
}

export interface QuantityOfferRule {
  id: string;
  minQty: number;
  offerType: "free_delivery" | "fixed_discount" | "percentage_discount";
  discountAmount?: number;
  title: string;
  active: boolean;
}

export interface ShippingSettings {
  rules: ShippingRule[];
  defaultShippingMethodId: string;
  freeShippingThreshold: number;
  enableFreeShipping: boolean;
  cashOnDeliveryAvailable: boolean;
  quantityOffers?: QuantityOfferRule[];
}

export interface SocialPlatformLink {
  id: string;
  platform: string;
  url: string;
  iconName: string;
  displayOrder: number;
  active: boolean;
}

export interface SocialMediaSettings {
  platforms: SocialPlatformLink[];
  /**
   * Mapping of social source (e.g., "Facebook Page") to an array of page names/IDs.
   */
  sources: Record<string, string[]>;
}

export interface BusinessSettings {
  businessName: string;
  tradeLicenseNumber: string;
  binNumber: string;
  vatNumber: string;
  companyRegistrationNumber: string;
  businessEmail: string;
  businessPhone: string;
}

export interface SEOSettings {
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  metaKeywords: string;
  openGraphImage: string;
  twitterCardImage: string;
  robotsTxtOptions: string;
  googleVerificationCode: string;
  facebookVerificationCode: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  facebookPixelId: string;
  microsoftClarityId: string;
}

export interface FooterSettings {
  copyrightText: string;
  footerDescription: string;
  footerMenuLinks: Array<{ label: string; url: string }>;
  paymentMethodsBadges: string[];
  certifications: string[];
  trustBadges: string[];
  showFooterLogo: boolean;
  enableNewsletterToggle: boolean;
}

export interface OrderSettings {
  minimumOrderAmount: number;
  maximumOrderAmount: number;
  allowGuestCheckout: boolean;
  requirePhoneVerification: boolean;
  enableCoupon: boolean;
  enableReferral: boolean;
  enableCOD: boolean;
  enableOnlinePayment: boolean;
  defaultOrderStatus: string;
  orderIdPrefix: string;
  nextOrderNumber: number;
  incompleteOrderIdPrefix?: string;
  nextIncompleteOrderNumber?: number;
  preOrderIdPrefix?: string;
  nextPreOrderNumber?: number;
}

export interface NotificationSettings {
  smsApiKey: string;
  smsSenderId: string;
  enableSMS: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  smtpSenderName: string;
  whatsAppApiConfig: string;
  whatsAppBusinessNumber: string;
}

export interface AdvancedSettings {
  debugMode: boolean;
  apiLogging: boolean;
  maintenanceScheduler: string;
  cacheStatus: string;
  lastCacheRebuild: string;
}

export interface MenuItem {
  id: string;
  label: string;
  url: string;
  type: "category" | "custom" | "page";
  target?: "_self" | "_blank";
  active: boolean;
  displayOrder: number;
}

export interface NavigationSettings {
  headerMenu: MenuItem[];
}

export interface SystemSettings {
  general: GeneralSettings;
  branding: BrandingSettings;
  contact: ContactSettings;
  shipping: ShippingSettings;
  socialMedia: SocialMediaSettings;
  business: BusinessSettings;
  seo: SEOSettings;
  footer: FooterSettings;
  navigation: NavigationSettings;
  orders: OrderSettings;
  notifications: NotificationSettings;
  advanced: AdvancedSettings;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  section: keyof SystemSettings;
  fieldName: string;
  oldValue: string;
  newValue: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  general: {
    websiteName: "ARZAMART",
    websiteShortName: "ARZAMART",
    tagline: "Everyday Fashion in Bangladesh",
    description: "Cotton tees, linen shirts, panjabi and more. Cash on delivery nationwide.",
    websiteStatus: "live",
    maintenanceMessage: "We will be back shortly.",
    defaultLanguage: "English (US)",
    defaultCurrency: "BDT",
    currencySymbol: "৳",
    timeZone: "Asia/Dhaka",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12-hour",
  },
  branding: {
    headerLogo: "",
    footerLogo: "",
    darkLogo: "",
    lightLogo: "",
    favicon: "",
    mobileLogo: "",
    primaryColor: "#c23a22",
    secondaryColor: "#f6ede4",
    accentColor: "#ea580c",
    buttonColor: "#c23a22",
    borderRadius: "0.75rem",
    fontFamily: "Inter, sans-serif",
    toastSuccessColor: "#10b981",
    toastErrorColor: "#ef4444",
    toastInfoColor: "#3b82f6",
  },
  contact: {
    companyName: "ARZA Fashion",
    ownerName: "Arza Management",
    supportPhone: "+880 1800 000000",
    salesPhone: "+880 1800 000000",
    whatsAppNumber: "+880 1800 000000",
    emailAddress: "support@arzamart.com",
    supportEmail: "support@arzamart.com",
    officeAddress: "House #12, Road #4, Dhanmondi, Dhaka-1205, Bangladesh",
    googleMapEmbedUrl: "",
  },
  shipping: {
    rules: [
      { id: "inside-dhaka", name: "Inside Dhaka (ঢাকার ভিতরে)", charge: 60, estimatedDeliveryTime: "24-48 Hours", status: "active", displayOrder: 1 },
      { id: "outside-dhaka", name: "Outside Dhaka (ঢাকার বাইরে)", charge: 120, estimatedDeliveryTime: "2-3 Days", status: "active", displayOrder: 2 },
    ],
    defaultShippingMethodId: "inside-dhaka",
    freeShippingThreshold: 2000,
    enableFreeShipping: true,
    cashOnDeliveryAvailable: true,
    quantityOffers: [
      { id: "free-delivery-2", minQty: 2, offerType: "free_delivery", title: "২ পিস নিলে ডেলিভারি চার্জ ফ্রি!", active: true },
      { id: "discount-200-2", minQty: 2, offerType: "fixed_discount", discountAmount: 200, title: "২ পিস নিলে ২০০ টাকা ছাড়!", active: true },
      { id: "discount-300-3", minQty: 3, offerType: "fixed_discount", discountAmount: 300, title: "৩ পিস নিলে ৩০০ টাকা ছাড়!", active: true },
    ],
  },
  socialMedia: {
    platforms: [
      { id: "fb", platform: "Facebook", url: "https://facebook.com/arzamart", iconName: "Facebook", displayOrder: 1, active: true },
      { id: "insta", platform: "Instagram", url: "https://instagram.com/arzamart", iconName: "Instagram", displayOrder: 2, active: true },
      { id: "yt", platform: "YouTube", url: "", iconName: "Youtube", displayOrder: 3, active: false },
    ],
    sources: {
      "Facebook Page": ["ARZA Official", "ARZA Lifestyle"],
    },
  },
  business: {
    businessName: "ARZA Fashion Ltd.",
    tradeLicenseNumber: "TRAD/DNCC/012345/2024",
    binNumber: "001234567-0101",
    vatNumber: "1234567890",
    companyRegistrationNumber: "C-123456/2024",
    businessEmail: "business@arzamart.com",
    businessPhone: "+880 1800 000000",
  },
  seo: {
    defaultMetaTitle: "ARZA — Everyday Fashion in Bangladesh",
    defaultMetaDescription: "Cotton tees, linen shirts, panjabi and more. Cash on delivery nationwide.",
    metaKeywords: "fashion, clothing, bangladesh, tees, shirts, panjabi",
    openGraphImage: "",
    twitterCardImage: "",
    robotsTxtOptions: "User-agent: *\nAllow: /",
    googleVerificationCode: "",
    facebookVerificationCode: "",
    googleAnalyticsId: "",
    googleTagManagerId: "",
    facebookPixelId: "",
    microsoftClarityId: "",
  },
  footer: {
    copyrightText: "© 2026 ARZA. All rights reserved.",
    footerDescription: "Everyday premium fashion made in Bangladesh. Cash on delivery nationwide.",
    footerMenuLinks: [
      { label: "About Us", url: "/about" },
      { label: "Contact Us", url: "/contact" },
      { label: "Privacy Policy", url: "/privacy-policy" },
      { label: "Terms & Conditions", url: "/terms" },
    ],
    paymentMethodsBadges: ["bKash", "Nagad", "Cash on Delivery", "Visa", "Mastercard"],
    certifications: [],
    trustBadges: ["100% Original Products", "Fast Nationwide Delivery", "7 Days Easy Return"],
    showFooterLogo: true,
    enableNewsletterToggle: true,
  },
  navigation: {
    headerMenu: [],
  },
  orders: {
    minimumOrderAmount: 0,
    maximumOrderAmount: 100000,
    allowGuestCheckout: true,
    requirePhoneVerification: false,
    enableCoupon: true,
    enableReferral: false,
    enableCOD: true,
    enableOnlinePayment: true,
    defaultOrderStatus: "Pending",
    orderIdPrefix: "ORD-",
    nextOrderNumber: 10001,
    incompleteOrderIdPrefix: "INC-",
    nextIncompleteOrderNumber: 5001,
    preOrderIdPrefix: "PRE-",
    nextPreOrderNumber: 1001,
  },
  notifications: {
    smsApiKey: "",
    smsSenderId: "ARZA",
    enableSMS: false,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpSenderName: "ARZA Notifications",
    whatsAppApiConfig: "",
    whatsAppBusinessNumber: "+880 1800 000000",
  },
  advanced: {
    debugMode: false,
    apiLogging: false,
    maintenanceScheduler: "Disabled",
    cacheStatus: "Active",
    lastCacheRebuild: "",
  },
};
