// Comprehensive Bangladesh Locations: 8 Divisions (বিভাগ) -> 64 Districts (জেলা)
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

// Backward compatibility helper
export function getAreasForCity(city: string): string[] {
  return getDistrictsForDivision(city);
}

