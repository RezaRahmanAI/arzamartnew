// Comprehensive Real Bangladesh Locations Data (City/District -> Real Thanas/Upazilas)
export const CITY_AREAS_MAP: Record<string, string[]> = {
  Dhaka: [
    "Uttara", "Gulshan", "Banani", "Dhanmondi", "Mirpur", "Mohammadpur", "Badda",
    "Rampura", "Khilgaon", "Motijheel", "Jatrabari", "Bashundhara", "Baridhara",
    "Tejgaon", "Farmgate", "Malibagh", "Mogbazar", "Elephant Road", "New Market",
    "Old Dhaka", "Lalbagh", "Keraniganj", "Savar", "Dhamrai", "Cantonment", "Kafrul",
    "Shahbagh", "Kamrangirchar", "Demra", "Kadamtali", "Hazaribagh", "Adabor",
    "Niketan", "Nikunja", "Dohar", "Nawabganj"
  ],
  Chattogram: [
    "Agrabad", "GEC Circle", "Nasirabad", "Halishahar", "Chawkbazar", "Khulshi",
    "Panchlaish", "Pahartali", "Bayazid", "Kotwali", "Patenga", "Chandgaon",
    "Double Mooring", "EPZ", "Bandar", "Hathazari", "Sitakunda", "Anwara",
    "Banshkhali", "Boalkhali", "Chandanaish", "Fatikchhari", "Lohagara", "Mirsharai",
    "Patiya", "Rangunia", "Raozan", "Sandwip", "Satkania"
  ],
  Sylhet: [
    "Zindabazar", "Chauhatta", "Ambarkhana", "Upa-Shahar", "Tilagarh", "Shibganj",
    "Subidbazar", "Bandarbazar", "Kadamtali", "South Surma", "Balaganj", "Beanibazar",
    "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur",
    "Kanaighat", "Sylhet Sadar", "Zakiganj"
  ],
  Gazipur: [
    "Tongi", "Chowrasta", "Board Bazar", "Gazipur Sadar", "Kaliakair", "Kaliganj",
    "Kapasia", "Sreepur", "Konabari"
  ],
  Narayanganj: [
    "Chashara", "Narayanganj Sadar", "Araihazar", "Bandar", "Rupganj", "Sonargaon",
    "Fatullah", "Siddhirganj", "Kanchpur"
  ],
  Comilla: [
    "Kandirpar", "Comilla Sadar", "Barura", "Brahmanpara", "Burichang", "Chandina",
    "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Muradnagar", "Nangalkot",
    "Titas"
  ],
  Khulna: [
    "Khulna Sadar", "Daulatpur", "Khalishpur", "Khan Jahan Ali", "Sonadanga", "Batiaghata",
    "Dacope", "Dumuria", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Terokhada"
  ],
  Rajshahi: [
    "Rajshahi Sadar", "Boalia", "Rajpara", "Shah Makhdum", "Motihar", "Bagha", "Bagmara",
    "Charghat", "Durgapur", "Godagari", "Mohanpur", "Paba", "Puthia", "Tanore"
  ],
  Barishal: [
    "Barishal Sadar", "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Gaurnadi",
    "Hizla", "Mehendigenj", "Muladi", "Wazirpur"
  ],
  Rangpur: [
    "Rangpur Sadar", "Badarganj", "Gangachhara", "Kaunia", "Mithapukur", "Pirgachha",
    "Pirganj", "Taraganj"
  ],
  Mymensingh: [
    "Mymensingh Sadar", "Bhaluka", "Trishal", "Gafargaon", "Muktagachha", "Fulbaria",
    "Gouripur", "Iswarganj", "Haluaghat", "Dhobaura", "Nandail", "Phulpur", "TaraKanda"
  ],
  Bogra: [
    "Bogra Sadar", "Adamdighi", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram",
    "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala"
  ],
  Feni: [
    "Feni Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Fulgazi", "Sonavazi"
  ],
  "Cox's Bazar": [
    "Cox's Bazar Sadar", "Chakaria", "Kutubdia", "Maheshkhali", "Ramu", "Teknaf", "Ukhia", "Pekua"
  ],
};

export const DEFAULT_CITIES = [
  "Dhaka", "Chattogram", "Sylhet", "Gazipur", "Narayanganj", "Comilla", "Khulna",
  "Rajshahi", "Barishal", "Rangpur", "Mymensingh", "Bogra", "Feni", "Cox's Bazar",
  "Noakhali", "Tangail", "Brahmanbaria", "Narsingdi", "Jamalpur", "Dinajpur",
  "Jessore", "Pabna", "Kushtia", "Faridpur", "Bagerhat", "Bandarban", "Barguna",
  "Bhola", "Chandpur", "Chapainawabganj", "Chuadanga", "Joypurhat", "Gaibandha",
  "Gopalganj", "Habiganj", "Jhalokati", "Jhenaidah", "Kurigram", "Lakshmipur",
  "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar",
  "Munshiganj", "Naogaon", "Narail", "Natore", "Netrokona", "Nilphamari",
  "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Shariatpur", "Sherpur",
  "Sirajganj", "Sunamganj", "Satkhira", "Thakurgaon"
];

export const DEFAULT_AREAS = [
  "Main Town / Sadar", "Bus Stand Area", "Market Area", "Station Road", "College Road"
];

export function getAreasForCity(city: string): string[] {
  if (!city) return DEFAULT_AREAS;
  return CITY_AREAS_MAP[city] || DEFAULT_AREAS;
}
