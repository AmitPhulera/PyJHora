declare module 'tz-lookup' {
  /** Returns the IANA timezone name (e.g. "Asia/Kolkata") for a lat/lon. */
  export default function tzLookup(latitude: number, longitude: number): string;
}
