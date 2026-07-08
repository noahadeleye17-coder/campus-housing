const demoApartments = [
  {
    _id: "demo-1",
    title: "Modern Studio Near Main Campus",
    propertyType: "Studio",
    price: 450000,
    location: "University Road, 8 minutes from campus gate",
    distanceFromCampus: 1.2,
    amenities: ["Wi-Fi", "Water", "Security", "Kitchenette"],
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    coordinates: {
      latitude: 7.2964,
      longitude: 5.1416,
    },
    landlord: {
      name: "Demo Landlord",
      email: "landlord@example.com",
    },
  },
  {
    _id: "demo-2",
    title: "Shared 2-Bed Apartment",
    propertyType: "Shared Apartment",
    price: 320000,
    location: "Student Village Extension",
    distanceFromCampus: 2.4,
    amenities: ["Furnished", "Prepaid meter", "Water", "Wardrobe"],
    images: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
    coordinates: {
      latitude: 7.3227,
      longitude: 5.1448,
    },
    landlord: {
      name: "Demo Agent",
      email: "agent@example.com",
    },
  },
  {
    _id: "demo-3",
    title: "Self-Contain Room",
    propertyType: "Self Contain",
    price: 280000,
    location: "South Gate Area",
    distanceFromCampus: 0.8,
    amenities: ["Private bathroom", "Tiles", "Water", "Secure compound"],
    images: [
      "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80",
    coordinates: null,
    landlord: {
      name: "Demo Property Owner",
      email: "owner@example.com",
    },
  },
  {
    _id: "demo-4",
    title: "Quiet Mini Flat With Study Space",
    propertyType: "1 Bedroom",
    price: 520000,
    location: "North Gate Area",
    distanceFromCampus: 3.1,
    amenities: ["Study desk", "Kitchen", "Parking", "Security"],
    images: [
      "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&q=80",
    coordinates: {
      latitude: 7.3319,
      longitude: 5.1310,
    },
    landlord: {
      name: "Demo Housing Manager",
      email: "manager@example.com",
    },
  },
  {
    _id: "demo-5",
    title: "Budget Friendly Single Room",
    propertyType: "Single Room",
    price: 180000,
    location: "Apatapiti Student Area",
    distanceFromCampus: 1.9,
    amenities: ["Shared bathroom", "Water", "Prepaid meter", "Gated compound"],
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80",
    coordinates: {
      latitude: 7.2919,
      longitude: 5.1219,
    },
    landlord: {
      name: "Demo Caretaker",
      email: "caretaker@example.com",
    },
  },
  {
    _id: "demo-6",
    title: "Premium 1-Bed Apartment",
    propertyType: "1 Bedroom",
    price: 750000,
    location: "West Gate Area",
    distanceFromCampus: 0.6,
    amenities: ["Air conditioning", "Private kitchen", "Backup power", "CCTV"],
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    ],
    image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    coordinates: {
      latitude: 7.3040,
      longitude: 5.1286,
    },
    landlord: {
      name: "Demo Property Group",
      email: "propertygroup@example.com",
    },
  },
];

module.exports = demoApartments;