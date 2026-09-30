// Orders don't have a dedicated city field yet (PRD §7, Option A — a checkout "City" dropdown
// — is the recommended real fix). Until that lands, this makes a best-effort guess from the
// free-text delivery address so the heatmap has something real to show.

const CITIES = [
  "Greater Noida",
  "Navi Mumbai",
  "New Delhi",
  "Noida",
  "Gurugram",
  "Gurgaon",
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Bangalore",
  "Hyderabad",
  "Ahmedabad",
  "Chennai",
  "Kolkata",
  "Surat",
  "Pune",
  "Jaipur",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Kalyan",
  "Varanasi",
  "Srinagar",
  "Aurangabad",
  "Dhanbad",
  "Amritsar",
  "Prayagraj",
  "Allahabad",
  "Ranchi",
  "Howrah",
  "Coimbatore",
  "Jabalpur",
  "Gwalior",
  "Vijayawada",
  "Jodhpur",
  "Madurai",
  "Raipur",
  "Kota",
  "Guwahati",
  "Chandigarh",
].sort((a, b) => b.length - a.length); // longest first so "Greater Noida" wins over "Noida"

const CANONICAL: Record<string, string> = {
  Bangalore: "Bengaluru",
  Delhi: "New Delhi",
  Gurgaon: "Gurugram",
  Allahabad: "Prayagraj",
};

export function extractCity(address: string): string {
  const lower = address.toLowerCase();
  for (const city of CITIES) {
    if (lower.includes(city.toLowerCase())) {
      return CANONICAL[city] ?? city;
    }
  }
  return "Unspecified";
}
