// Comprehensive Bangladesh Locations & Delivery Rules

export type DeliveryZone = "inside_dhaka" | "dhaka_sub_area" | "outside_dhaka";

export interface DeliveryZoneOption {
  id: DeliveryZone;
  label: string;
  charge: number;
}

export const DELIVERY_ZONES: Record<DeliveryZone, DeliveryZoneOption> = {
  inside_dhaka: {
    id: "inside_dhaka",
    label: "ঢাকার ভিতরে",
    charge: 70,
  },
  dhaka_sub_area: {
    id: "dhaka_sub_area",
    label: "ঢাকার সাব-এরিয়া",
    charge: 120,
  },
  outside_dhaka: {
    id: "outside_dhaka",
    label: "ঢাকার বাইরে",
    charge: 150,
  },
};

// Sub-area keywords for Dhaka Sub-area (120 Tk): Savar, Dohar, Keraniganj, Gazipur, Narayanganj + Dhamrai, Tongi etc.
export const DHAKA_SUB_AREA_KEYWORDS = [
  "savar", "সাভার",
  "dohar", "দোহার",
  "keraniganj", "কেরানীগঞ্জ", "কেরানিগঞ্জ",
  "gazipur", "গাজীপুর",
  "narayanganj", "নারায়ণগঞ্জ", "নারায়ণগঞ্জ",
  "dhamrai", "ধামরাই",
  "tongi", "টঙ্গী", "টঙ্গি",
  "ashulia", "আশুলিয়া", "আশুলিয়া",
  "sonargaon", "সোনারগাঁ", "সোনারগাঁও",
  "siddhirganj", "সিদ্ধিরগঞ্জ",
  "fatullah", "ফতুল্লা",
  "nawabganj", "নবাবগঞ্জ",
];

// All 63 Outside Dhaka District keywords
export const OUTSIDE_DHAKA_DISTRICT_KEYWORDS = [
  "chattogram", "chittagong", "চট্টগ্রাম", "cox's bazar", "coxs bazar", "কক্সবাজার",
  "cumilla", "comilla", "কুমিল্লা", "feni", "ফেনী", "brahmanbaria", "ব্রাহ্মণবাড়িয়া", "ব্রাহ্মণবাড়িয়া",
  "chandpur", "চাঁদপুর", "noakhali", "নোয়াখালী", "নোয়াখালী", "lakshmipur", "লক্ষ্মীপুর",
  "bandarban", "বান্দরবান", "khagrachhari", "খাগড়াছড়ি", "খাগড়াছড়ি", "rangamati", "রাঙ্গামাটি", "রাঙামাটি",
  "rajshahi", "রাজশাহী", "bogura", "bogra", "বগুড়া", "বগুড়া", "pabna", "পাবনা",
  "sirajganj", "সিরাজগঞ্জ", "naogaon", "নওগাঁ", "natore", "নাটোর", "joypurhat", "জয়পুরহাট",
  "chapainawabganj", "চাঁপাইনবাবগঞ্জ", "khulna", "খুলনা", "jashore", "jessore", "যশোর",
  "kushtia", "কুষ্টিয়া", "কুষ্টিয়া", "satkhira", "সাতক্ষীরা", "bagerhat", "বাগেরহাট",
  "chuadanga", "চুয়াডাঙ্গা", "চুয়াডাঙ্গা", "jhenaidah", "ঝিনাইদহ", "magura", "মাগুরা",
  "meherpur", "মেহেরপুর", "narail", "নড়াইল", "নড়াইল", "barishal", "barisal", "বরিশাল",
  "barguna", "বরগুনা", "bhola", "ভোলা", "jhalokati", "jhalakathi", "ঝালকাঠি",
  "patuakhali", "পটুয়াখালী", "পটুয়াখালী", "pirojpur", "পিরোজপুর", "sylhet", "সিলেট",
  "moulvibazar", "moulvibazar", "মৌলভীবাজার", "habiganj", "হবিগঞ্জ", "sunamganj", "সুনামগঞ্জ",
  "rangpur", "রংপুর", "dinajpur", "দিনাজপুর", "gaibandha", "গাইবান্ধা", "kurigram", "কুড়িগ্রাম", "কুড়িগ্রাম",
  "lalmonirhat", "লালমনিরহাট", "nilphamari", "নীলফামারী", "panchagarh", "পঞ্চগড়", "পঞ্চগড়",
  "thakurgaon", "ঠাকুরগাঁও", "mymensingh", "ময়মনসিংহ", "ময়মনসিংহ", "jamalpur", "জামালপুর",
  "netrokona", "নেত্রকোনা", "sherpur", "শেরপুর", "tangail", "টাঙ্গাইল", "narsingdi", "নরসিংদী",
  "faridpur", "ফরিদপুর", "gopalganj", "গোপালগঞ্জ", "kishoreganj", "কিশোরগঞ্জ",
  "madaripur", "মাদারীপুর", "manikganj", "মানিকগঞ্জ", "munshiganj", "মুন্সীগঞ্জ", "মুন্সিগঞ্জ",
  "rajbari", "রাজবাড়ী", "রাজবাড়ী", "shariatpur", "শরীয়তপুর", "শরিয়তপুর"
];

/**
 * Intelligent Delivery Zone Detector based on user's written address text
 * Checks Sub-Area first (Savar, Dohar, Keraniganj, Gazipur, Narayanganj -> 120 Tk)
 * Then Outside Dhaka districts -> 150 Tk
 * Default (any inside Dhaka address or blank) -> 70 Tk
 */
export function detectDeliveryZone(addressText: string): DeliveryZone {
  if (!addressText || typeof addressText !== "string") {
    return "inside_dhaka";
  }

  const clean = addressText.toLowerCase();

  // 1. Check Sub-area keywords (Savar, Dohar, Keraniganj, Gazipur, Narayanganj)
  for (const kw of DHAKA_SUB_AREA_KEYWORDS) {
    if (clean.includes(kw)) {
      return "dhaka_sub_area";
    }
  }

  // 2. Check Outside Dhaka district names
  for (const kw of OUTSIDE_DHAKA_DISTRICT_KEYWORDS) {
    if (clean.includes(kw)) {
      return "outside_dhaka";
    }
  }

  // 3. Default to inside Dhaka (70 Tk)
  return "inside_dhaka";
}

// 8 Divisions -> 64 Districts for backward compatibility/reference
export const BANGLADESH_DIVISIONS_DISTRICTS: Record<string, string[]> = {
  "Dhaka (ঢাকা)": [
    "Dhaka", "Gazipur", "Narayanganj", "Tangail", "Narsingdi", "Faridpur",
    "Gopalganj", "Kishoreganj", "Madaripur", "Manikganj", "Munshiganj", "Rajbari", "Shariatpur"
  ],
  "Chattogram (চট্টগ্রাম)": [
    "Chattogram", "Cox's Bazar", "Cumilla", "Feni", "Brahmanbaria", "Chandpur",
    "Noakhali", "Lakshmipur", "Bandarban", "Khagrachhari", "Rangamati"
  ],
  "Rajshahi (রাজশাহী)": [
    "Rajshahi", "Bogura", "Pabna", "Sirajganj", "Naogaon", "Natore", "Joypurhat", "Chapainawabganj"
  ],
  "Khulna (খুলনা)": [
    "Khulna", "Jashore", "Kushtia", "Satkhira", "Bagerhat", "Chuadanga", "Jhenaidah",
    "Magura", "Meherpur", "Narail"
  ],
  "Barishal (বরিশাল)": [
    "Barishal", "Barguna", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"
  ],
  "Sylhet (সিলেট)": [
    "Sylhet", "Moulvibazar", "Habiganj", "Sunamganj"
  ],
  "Rangpur (রংপুর)": [
    "Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Thakurgaon"
  ],
  "Mymensingh (ময়মনসিংহ)": [
    "Mymensingh", "Jamalpur", "Netrokona", "Sherpur"
  ],
};

export const BANGLADESH_DIVISIONS = Object.keys(BANGLADESH_DIVISIONS_DISTRICTS);
export const ALL_BANGLADESH_DISTRICTS = Object.values(BANGLADESH_DIVISIONS_DISTRICTS).flat();
export const DEFAULT_CITIES = ALL_BANGLADESH_DISTRICTS;
export const DEFAULT_AREAS = [
  "Main Town / Sadar", "Bus Stand Area", "Market Area", "Station Road", "College Road"
];

export function getDistrictsForDivision(division: string): string[] {
  if (!division) return BANGLADESH_DIVISIONS_DISTRICTS["Dhaka (ঢাকা)"] || [];
  return BANGLADESH_DIVISIONS_DISTRICTS[division] || BANGLADESH_DIVISIONS_DISTRICTS["Dhaka (ঢাকা)"] || [];
}

export function findDivisionForDistrict(district: string): string {
  if (!district) return "Dhaka (ঢাকা)";
  for (const [division, districts] of Object.entries(BANGLADESH_DIVISIONS_DISTRICTS)) {
    if (districts.some((d) => d.toLowerCase() === district.toLowerCase())) {
      return division;
    }
  }
  return "Dhaka (ঢাকা)";
}

export function getAreasForCity(city: string): string[] {
  return getDistrictsForDivision(city);
}

