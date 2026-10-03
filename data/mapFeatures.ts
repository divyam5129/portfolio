// Reference points labelled on the Trail Map (Sierra Nevada). Public, well-known values.

export type Peak = { name: string; lng: number; lat: number; ft: number };
export type Place = { name: string; lng: number; lat: number; anchor?: "start" | "end" };

export const peaks: Peak[] = [
  { name: "Half Dome", lng: -119.5332, lat: 37.7459, ft: 8839 },
  { name: "Cathedral Peak", lng: -119.4058, lat: 37.8475, ft: 10911 },
  { name: "Mount Dana", lng: -119.2209, lat: 37.8999, ft: 13061 },
  { name: "Mount Lyell", lng: -119.2715, lat: 37.7393, ft: 13114 },
  { name: "Mount Tallac", lng: -120.099, lat: 38.906, ft: 9735 },
  { name: "Freel Peak", lng: -119.9001, lat: 38.8577, ft: 10881 },
];

export const towns: Place[] = [
  { name: "Truckee", lng: -120.1833, lat: 39.328 },
  { name: "South Lake Tahoe", lng: -119.9772, lat: 38.9399 },
  { name: "Carson City", lng: -119.7674, lat: 39.1638 },
  { name: "Lee Vining", lng: -119.1207, lat: 37.9577 },
  { name: "Mammoth Lakes", lng: -118.9721, lat: 37.6485, anchor: "end" },
];

/** Hand-placed area labels (lng/lat of the label's start). */
export const areaLabels: (Place & { kind: "state" | "park" | "lake" })[] = [
  { name: "California", lng: -120.48, lat: 38.45, kind: "state" },
  { name: "Nevada", lng: -119.55, lat: 39.27, kind: "state" },
  { name: "Yosemite National Park", lng: -119.9, lat: 38.05, kind: "park" },
  { name: "Mono Lake", lng: -119.14, lat: 38.09, kind: "lake" },
];
