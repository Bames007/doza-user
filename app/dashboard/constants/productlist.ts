import { MedicalProduct } from "./medicalShop";

//doza_user\app\dashboard\constants\productlist.ts
export const products: MedicalProduct[] = [
  // Monitoring Devices
  {
    id: "med1",
    name: "Omron Blood Pressure Monitor",
    description:
      "Clinically validated automatic upper arm monitor with irregular heartbeat detection.",
    price: 35000,
    category: "Monitoring Devices",
    brand: "Omron",
    sizes: ["Standard Cuff", "Large Cuff"],
    colors: ["White", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "med2",
    name: "Accu-Chek Active Glucose Meter",
    description:
      "Easy‑to‑use blood glucose monitoring system with no coding and fast results.",
    price: 15000,
    category: "Monitoring Devices",
    brand: "Accu-Chek",
    colors: ["Blue", "Silver"],
    imageUrl:
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med3",
    name: "Braun ThermoScan 7 Ear Thermometer",
    description:
      "Professional, accurate ear thermometer with pre‑warmed tip for comfort.",
    price: 28000,
    category: "Monitoring Devices",
    brand: "Braun",
    colors: ["White/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "med4",
    name: "Fingertip Pulse Oximeter",
    description:
      "Measures blood oxygen saturation and pulse rate, accurate and portable.",
    price: 12000,
    category: "Monitoring Devices",
    brand: "DozaMed",
    colors: ["Black", "Blue", "Red"],
    imageUrl:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med5",
    name: "Withings Body+ Smart Scale",
    description:
      "Wi‑Fi scale that measures weight, body fat, and cardiovascular health.",
    price: 65000,
    category: "Monitoring Devices",
    brand: "Withings",
    colors: ["White", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med6",
    name: "Samsung Galaxy Watch 6 (Health Edition)",
    description:
      "Advanced health tracking: ECG, blood pressure, sleep, and fitness.",
    price: 200000,
    category: "Monitoring Devices",
    brand: "Samsung",
    sizes: ["40mm", "44mm"],
    colors: ["Black", "Silver", "Gold"],
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    inStock: true,
  },
  // Mobility Aids
  {
    id: "med7",
    name: "Lightweight Folding Wheelchair",
    description:
      "Aluminium frame, padded armrests, and removable footrests for easy transport.",
    price: 120000,
    category: "Mobility Aids",
    brand: "DozaCare",
    sizes: ["Standard", "Bariatric"],
    colors: ["Black", "Red"],
    imageUrl:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "med8",
    name: "Adjustable Walker with Wheels",
    description:
      "Sturdy walker with 4 wheels, hand brakes, and a storage pouch.",
    price: 45000,
    category: "Mobility Aids",
    brand: "DozaCare",
    colors: ["Silver/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med9",
    name: "Forearm Crutches Pair",
    description:
      "Lightweight aluminium crutches with ergonomic grips and adjustable height.",
    price: 28000,
    category: "Mobility Aids",
    brand: "DozaCare",
    sizes: ["Standard", "Tall"],
    colors: ["Black", "Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med10",
    name: "Wooden Cane with Ergonomic Handle",
    description: "Classic wooden cane with a comfortable, non‑slip tip.",
    price: 8000,
    category: "Mobility Aids",
    brand: "DozaCare",
    sizes: ["Adjustable"],
    colors: ["Brown", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    inStock: true,
  },
  // First Aid
  {
    id: "med11",
    name: "Comprehensive First Aid Kit",
    description:
      "100‑piece kit for home, car, or travel – includes bandages, antiseptics, and tools.",
    price: 20000,
    category: "First Aid",
    brand: "DozaMed",
    colors: ["Red", "Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "med12",
    name: "Elastic Bandage Wrap (4 pack)",
    description:
      "Breathable elastic bandages for sprains and support, 4 sizes.",
    price: 5000,
    category: "First Aid",
    brand: "DozaMed",
    sizes: ["2 inch", "3 inch", "4 inch", "6 inch"],
    colors: ["Tan"],
    imageUrl:
      "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med13",
    name: "Instant Hot/Cold Pack (5 pack)",
    description: "Disposable packs that activate instantly for pain relief.",
    price: 4000,
    category: "First Aid",
    brand: "DozaMed",
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med14",
    name: "Antiseptic Wipes (100 wipes)",
    description:
      "Alcohol‑free, gentle wound cleansing wipes in a resealable pack.",
    price: 3500,
    category: "First Aid",
    brand: "DozaMed",
    colors: ["White/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
  // Personal Care
  {
    id: "med15",
    name: "Adult Diapers (Large, 30 count)",
    description: "High‑absorbency, comfortable diapers with leak guards.",
    price: 8000,
    category: "Personal Care",
    brand: "DozaCare",
    sizes: ["Medium", "Large", "Extra Large"],
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "med16",
    name: "Bedside Commode Chair",
    description:
      "Adjustable height commode with removable bucket and splash guard.",
    price: 55000,
    category: "Personal Care",
    brand: "DozaCare",
    colors: ["White/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1586015518255-b74b1773d2a0?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med17",
    name: "Shower Chair with Backrest",
    description: "Non‑slip, rust‑proof shower chair with adjustable legs.",
    price: 35000,
    category: "Personal Care",
    brand: "DozaCare",
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med18",
    name: "Moisturizing Lotion for Dry Skin (500ml)",
    description:
      "Hypoallergenic, fragrance‑free lotion recommended for sensitive skin.",
    price: 6000,
    category: "Personal Care",
    brand: "DozaMed",
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    inStock: true,
  },
  // Fitness & Wellness
  {
    id: "med19",
    name: "Resistance Bands Set (5 pcs)",
    description: "Different resistance levels for strength training and rehab.",
    price: 12000,
    category: "Fitness & Wellness",
    brand: "DozaFit",
    colors: ["Multi"],
    imageUrl:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med20",
    name: "Posture Corrector Brace",
    description:
      "Adjustable back brace for improved posture and shoulder support.",
    price: 9000,
    category: "Fitness & Wellness",
    brand: "DozaCare",
    sizes: ["S/M", "L/XL"],
    colors: ["Black", "Beige"],
    imageUrl:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "med21",
    name: "Percussion Massage Gun",
    description: "Deep tissue massage gun with 4 heads and adjustable speed.",
    price: 55000,
    category: "Fitness & Wellness",
    brand: "DozaFit",
    colors: ["Black", "Red"],
    imageUrl:
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "med22",
    name: "Non‑Slip Yoga Mat (6mm)",
    description: "Extra thick, eco‑friendly mat for yoga and floor exercises.",
    price: 10000,
    category: "Fitness & Wellness",
    brand: "DozaFit",
    colors: ["Purple", "Green", "Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  // Respiratory & Sleep
  {
    id: "med23",
    name: "ResMed AirSense 10 CPAP Machine",
    description: "Auto‑adjusting CPAP machine with humidifier for sleep apnea.",
    price: 350000,
    category: "Respiratory & Sleep",
    brand: "ResMed",
    colors: ["White"],
    imageUrl:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800",
    rating: 4.9,
    inStock: true,
    prescriptionRequired: true,
  },
  {
    id: "med24",
    name: "Portable Nebulizer",
    description:
      "Ultrasonic nebulizer for asthma and respiratory treatments, quiet and compact.",
    price: 45000,
    category: "Respiratory & Sleep",
    brand: "Omron",
    colors: ["White/Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800",
    rating: 4.7,
    inStock: true,
  },
  {
    id: "med25",
    name: "Cool Mist Humidifier (4L)",
    description:
      "Ultrasonic humidifier with adjustable mist output and essential oil tray.",
    price: 25000,
    category: "Respiratory & Sleep",
    brand: "DozaCare",
    colors: ["White", "Black"],
    imageUrl:
      "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&q=80&w=800",
    rating: 4.6,
    inStock: true,
  },
  {
    id: "med26",
    name: "Pulse Oximeter with Plethysmograph",
    description:
      "Accurate SpO2 and pulse rate monitoring with waveform display.",
    price: 18000,
    category: "Respiratory & Sleep",
    brand: "DozaMed",
    colors: ["Black", "Blue"],
    imageUrl:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800",
    rating: 4.8,
    inStock: true,
  },
];
