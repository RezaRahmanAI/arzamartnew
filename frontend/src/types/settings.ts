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

export interface ShippingSettings {
  rules: ShippingRule[];
  defaultShippingMethodId: string;
  freeShippingThreshold: number;
  enableFreeShipping: boolean;
  cashOnDeliveryAvailable: boolean;
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
    websiteName: "",
    websiteShortName: "",
    tagline: "",
    description: "",
    websiteStatus: "live",
    maintenanceMessage: "",
    defaultLanguage: "English (US)",
    defaultCurrency: "BDT",
    currencySymbol: "৳",
    timeZone: "Asia/Dhaka",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12-hour",
  },
  branding: {
    headerLogo: "",
    footerLogo: "",
    darkLogo: "",
    lightLogo: "",
    favicon: "",
    mobileLogo: "",
    primaryColor: "#a62d24",
    secondaryColor: "#f5ede4",
    accentColor: "#e06b3a",
    buttonColor: "#a62d24",
    borderRadius: "0.75rem",
    fontFamily: "Inter, sans-serif",
  },
  contact: {
    companyName: "",
    ownerName: "",
    supportPhone: "",
    salesPhone: "",
    whatsAppNumber: "",
    emailAddress: "",
    supportEmail: "",
    officeAddress: "",
    googleMapEmbedUrl: "",
  },
  shipping: {
    rules: [],
    defaultShippingMethodId: "",
    freeShippingThreshold: 0,
    enableFreeShipping: false,
    cashOnDeliveryAvailable: true,
  },
  socialMedia: {
    platforms: [],
    sources: {},
  },
  business: {
    businessName: "",
    tradeLicenseNumber: "",
    binNumber: "",
    vatNumber: "",
    companyRegistrationNumber: "",
    businessEmail: "",
    businessPhone: "",
  },
  seo: {
    defaultMetaTitle: "",
    defaultMetaDescription: "",
    metaKeywords: "",
    openGraphImage: "",
    twitterCardImage: "",
    robotsTxtOptions: "",
    googleVerificationCode: "",
    facebookVerificationCode: "",
    googleAnalyticsId: "",
    googleTagManagerId: "",
    facebookPixelId: "",
    microsoftClarityId: "",
  },
  footer: {
    copyrightText: "",
    footerDescription: "",
    footerMenuLinks: [],
    paymentMethodsBadges: [],
    certifications: [],
    trustBadges: [],
    showFooterLogo: false,
    enableNewsletterToggle: false,
  },
  navigation: {
    headerMenu: [],
  },
  orders: {
    minimumOrderAmount: 0,
    maximumOrderAmount: 1000000,
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
  },
  notifications: {
    smsApiKey: "",
    smsSenderId: "",
    enableSMS: false,
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpSenderName: "",
    whatsAppApiConfig: "",
    whatsAppBusinessNumber: "",
  },
  advanced: {
    debugMode: false,
    apiLogging: false,
    maintenanceScheduler: "Disabled",
    cacheStatus: "Active",
    lastCacheRebuild: "",
  },
};
