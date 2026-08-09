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
    tagline: "Elegance in Every Thread",
    description: "Premium Bangladeshi fashion & lifestyle brand providing high quality apparel.",
    websiteStatus: "live",
    maintenanceMessage: "We are undergoing scheduled maintenance. Please check back shortly!",
    defaultLanguage: "English (US)",
    defaultCurrency: "BDT",
    currencySymbol: "৳",
    timeZone: "Asia/Dhaka",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12-hour",
  },
  branding: {
    headerLogo: "/logo.png",
    footerLogo: "/logo.png",
    darkLogo: "/logo-dark.png",
    lightLogo: "/logo-light.png",
    favicon: "/favicon.ico",
    mobileLogo: "/logo-mobile.png",
    primaryColor: "#a62d24",
    secondaryColor: "#f5ede4",
    accentColor: "#e06b3a",
    buttonColor: "#a62d24",
    borderRadius: "0.75rem",
    fontFamily: "Inter, sans-serif",
  },
  contact: {
    companyName: "ARZAMART Ltd.",
    ownerName: "Arza Admin",
    supportPhone: "+880 1700-000000",
    salesPhone: "+880 1800-000000",
    whatsAppNumber: "+880 1700-000000",
    emailAddress: "info@alzeena.com",
    supportEmail: "support@alzeena.com",
    officeAddress: "House 42, Road 11, Block D, Banani, Dhaka-1213, Bangladesh",
    googleMapEmbedUrl: "https://maps.google.com/maps?q=Banani,Dhaka&t=&z=13&ie=UTF8&iwloc=&output=embed",
  },
  shipping: {
    rules: [
      {
        id: "ship_1",
        name: "Inside Dhaka",
        charge: 70,
        estimatedDeliveryTime: "24-48 Hours",
        status: "active",
        displayOrder: 1,
      },
      {
        id: "ship_2",
        name: "Sub Dhaka (Dhaka Suburbs)",
        charge: 100,
        estimatedDeliveryTime: "2-3 Days",
        status: "active",
        displayOrder: 2,
      },
      {
        id: "ship_3",
        name: "Outside Dhaka",
        charge: 130,
        estimatedDeliveryTime: "3-5 Days",
        status: "active",
        displayOrder: 3,
      },
      {
        id: "ship_4",
        name: "Express Delivery (Dhaka Only)",
        charge: 200,
        estimatedDeliveryTime: "Same Day (Within 12h)",
        status: "active",
        displayOrder: 4,
      },
    ],
    defaultShippingMethodId: "ship_1",
    freeShippingThreshold: 5000,
    enableFreeShipping: true,
    cashOnDeliveryAvailable: true,
  },
  socialMedia: {
    platforms: [
      { id: "soc_1", platform: "Facebook", url: "https://facebook.com/alzeena.official", iconName: "Facebook", displayOrder: 1, active: true },
      { id: "soc_2", platform: "Instagram", url: "https://instagram.com/alzeena.official", iconName: "Instagram", displayOrder: 2, active: true },
      { id: "soc_3", platform: "TikTok", url: "https://tiktok.com/@alzeena.bd", iconName: "Music2", displayOrder: 3, active: true },
      { id: "soc_4", platform: "WhatsApp", url: "https://wa.me/8801700000000", iconName: "MessageCircle", displayOrder: 4, active: true },
      { id: "soc_5", platform: "YouTube", url: "https://youtube.com/@alzeenabd", iconName: "Youtube", displayOrder: 5, active: true },
      { id: "soc_6", platform: "LinkedIn", url: "https://linkedin.com/company/alzeena", iconName: "Linkedin", displayOrder: 6, active: false },
      { id: "soc_7", platform: "X (Twitter)", url: "https://x.com/alzeena_bd", iconName: "Twitter", displayOrder: 7, active: false },
      { id: "soc_8", platform: "Telegram", url: "https://t.me/alzeena_official", iconName: "Send", displayOrder: 8, active: false },
      { id: "soc_9", platform: "Pinterest", url: "https://pinterest.com/alzeena", iconName: "Pin", displayOrder: 9, active: false },
    ],
    sources: {
      "Facebook Page": [
        "Alzeena Official FB Page",
        "Alzeena Fashion FB Page",
        "Alzeena Luxury FB Page",
        "Alzeena VIP FB Group",
        "Alzeena Clearance FB",
      ],
      "Instagram DM": [
        "Alzeena Main IG (@alzeena.official)",
        "Alzeena Fashion IG (@alzeena.fashion)",
        "Alzeena Studio IG (@alzeena.studio)",
        "Alzeena Outfits IG (@alzeena.outfits)",
      ],
      "WhatsApp": [
        "WhatsApp Hotline 1 (01700-000000)",
        "WhatsApp Sales Team (01800-000000)",
        "WhatsApp Customer Care",
        "WhatsApp VIP Orders",
      ],
      "TikTok": [
        "Alzeena Official TikTok (@alzeena.bd)",
        "Alzeena TikTok Shop",
        "Alzeena Live TikTok Channel",
      ],
      "Website": [
        "Alzeena Main Website (alzeena.com)",
        "Alzeena Checkout Landing Page",
        "Alzeena Seasonal Promo Page",
      ],
      "Phone Call": [
        "Hotline 1 (Sales Dept)",
        "Hotline 2 (Support Dept)",
        "Direct Incoming Call",
      ],
      "In-Store POS": [
        "Uttara Branch Outlet",
        "Dhanmondi Branch Outlet",
        "Mirpur Flagship Store",
        "Bashundhara City POS",
      ],
    },
  },
  business: {
    businessName: "Alzeena Fashion Limited",
    tradeLicenseNumber: "TRAD/DNCC/019283/2024",
    binNumber: "004928172-0101",
    vatNumber: "VAT-BD-928371",
    companyRegistrationNumber: "C-192837/2024",
    businessEmail: "billing@alzeena.com",
    businessPhone: "+880 2-9876543",
  },
  seo: {
    defaultMetaTitle: "Alzeena | Premium Fashion & Apparel Bangladesh",
    defaultMetaDescription: "Shop the latest premium traditional & contemporary fashion collection online at Alzeena Bangladesh.",
    metaKeywords: "fashion, dresses, alzeena, clothing, online shopping bangladesh, sarees, panjabi, kurti",
    openGraphImage: "/og-image.jpg",
    twitterCardImage: "/twitter-card.jpg",
    robotsTxtOptions: "User-agent: *\nAllow: /\nDisallow: /admin/",
    googleVerificationCode: "google-site-verification=abc123xyz456",
    facebookVerificationCode: "fb-domain-verification=fb1234567890",
    googleAnalyticsId: "G-ALZEENA123",
    googleTagManagerId: "GTM-ALZ999",
    facebookPixelId: "987654321098",
    microsoftClarityId: "clr_alz888",
  },
  footer: {
    copyrightText: "© 2026 Alzeena. All rights reserved. Built with passion in Bangladesh.",
    footerDescription: "Alzeena is your premier destination for authentic Bangladeshi fashion and apparel.",
    footerMenuLinks: [
      { label: "About Us", url: "/about" },
      { label: "Privacy Policy", url: "/privacy" },
      { label: "Terms of Service", url: "/terms" },
      { label: "Return & Refund Policy", url: "/refunds" },
      { label: "Shipping Policy", url: "/shipping" },
    ],
    paymentMethodsBadges: ["bKash", "Nagad", "Rocket", "Visa", "Mastercard", "Cash on Delivery"],
    certifications: ["ISO 9001 Certified", "100% Authentic Product Guarantee"],
    trustBadges: ["Secure SSL Payment", "Fast Nationwide Delivery", "Easy 7-Day Returns"],
    showFooterLogo: true,
    enableNewsletterToggle: true,
  },
  navigation: {
    headerMenu: [
      { id: "nav_1", label: "Panjabi", url: "/category/panjabi", type: "category", active: true, displayOrder: 1 },
      { id: "nav_2", label: "Saree", url: "/category/saree", type: "category", active: true, displayOrder: 2 },
      { id: "nav_3", label: "Salwar Kameez", url: "/category/salwar-kameez", type: "category", active: true, displayOrder: 3 },
      { id: "nav_4", label: "Kurti", url: "/category/kurti", type: "category", active: true, displayOrder: 4 },
      { id: "nav_5", label: "Offers", url: "/offers", type: "custom", active: true, displayOrder: 5 },
    ],
  },
  orders: {
    minimumOrderAmount: 200,
    maximumOrderAmount: 100000,
    allowGuestCheckout: true,
    requirePhoneVerification: false,
    enableCoupon: true,
    enableReferral: true,
    enableCOD: true,
    enableOnlinePayment: true,
    defaultOrderStatus: "Pending",
    orderIdPrefix: "ORD-",
    nextOrderNumber: 10001,
  },
  notifications: {
    smsApiKey: "sms_live_api_key_alz_8892",
    smsSenderId: "ALZEENA",
    enableSMS: true,
    smtpHost: "smtp.mailtrap.io",
    smtpPort: 587,
    smtpUsername: "alzeena_smtp_user",
    smtpPassword: "••••••••••••",
    smtpSenderName: "Alzeena Orders",
    whatsAppApiConfig: "wa_cloud_api_v18_token",
    whatsAppBusinessNumber: "+8801700000000",
  },
  advanced: {
    debugMode: false,
    apiLogging: true,
    maintenanceScheduler: "Disabled",
    cacheStatus: "Active (Memory & Redis Cached)",
    lastCacheRebuild: new Date().toISOString(),
  },
};
