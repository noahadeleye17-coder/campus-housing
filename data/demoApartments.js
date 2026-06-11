const demoApartments = [
  {
    _id: "demo-1",
    title: "Modern Studio Near Main Campus",
    price: 450000,
    location: "University Road, 8 minutes from campus gate",
    distanceFromCampus: 1.2,
    amenities: ["Wi-Fi", "Water", "Security", "Kitchenette"],
    image: "",
    coordinates: {
      latitude: 6.5244,
      longitude: 3.3792,
    },
    landlord: {
      name: "Demo Landlord",
      email: "landlord@example.com",
    },
  },
  {
    _id: "demo-2",
    title: "Shared 2-Bed Apartment",
    price: 320000,
    location: "Student Village Extension",
    distanceFromCampus: 2.4,
    amenities: ["Furnished", "Prepaid meter", "Water", "Wardrobe"],
    image: "",
    coordinates: {
      latitude: 6.5271,
      longitude: 3.3847,
    },
    landlord: {
      name: "Demo Agent",
      email: "agent@example.com",
    },
  },
  {
    _id: "demo-3",
    title: "Self-Contain Room",
    price: 280000,
    location: "South Gate Area",
    distanceFromCampus: 0.8,
    amenities: ["Private bathroom", "Tiles", "Water", "Secure compound"],
    image: "",
    coordinates: null,
    landlord: {
      name: "Demo Property Owner",
      email: "owner@example.com",
    },
  },
  {
    _id: "demo-4",
    title: "Quiet Mini Flat With Study Space",
    price: 520000,
    location: "North Gate Area",
    distanceFromCampus: 3.1,
    amenities: ["Study desk", "Kitchen", "Parking", "Security"],
    image: "",
    coordinates: {
      latitude: 6.5312,
      longitude: 3.3726,
    },
    landlord: {
      name: "Demo Housing Manager",
      email: "manager@example.com",
    },
  },
  {
    _id: "demo-5",
    title: "Budget Friendly Single Room",
    price: 180000,
    location: "Apatapiti Student Area",
    distanceFromCampus: 1.9,
    amenities: ["Shared bathroom", "Water", "Prepaid meter", "Gated compound"],
    image: "",
    coordinates: {
      latitude: 6.5198,
      longitude: 3.3881,
    },
    landlord: {
      name: "Demo Caretaker",
      email: "caretaker@example.com",
    },
  },
  {
    _id: "demo-6",
    title: "Premium 1-Bed Apartment",
    price: 750000,
    location: "West Gate Area",
    distanceFromCampus: 0.6,
    amenities: ["Air conditioning", "Private kitchen", "Backup power", "CCTV"],
    image: "",
    coordinates: {
      latitude: 6.5265,
      longitude: 3.3764,
    },
    landlord: {
      name: "Demo Property Group",
      email: "propertygroup@example.com",
    },
  },
];

module.exports = demoApartments;
