/**
 * Book chart data fixtures for yoga parity tests.
 * Ported from PyJHora book_chart_data.py
 *
 * Each chart contains:
 *   dob: [year, month, day]
 *   tob: [hour, minute, second]
 *   place: { name, lat, lon, tz }
 *   dcf: divisional chart factor
 */

export interface PlaceData {
  name: string;
  lat: number;
  lon: number;
  tz: number;
}

export interface ChartData {
  dob: [number, number, number];
  tob: [number, number, number];
  place: PlaceData;
  dcf: number;
}

// Chart 1
export const chart1: ChartData = {
  dob: [2000, 4, 9],
  tob: [17, 55, 0],
  place: { name: 'unknown', lat: 42 + 30 / 60, lon: -(71 + 12 / 60), tz: -4.0 },
  dcf: 1,
};

// Chart 2 (same birth data as chart 1, D-16)
export const chart2: ChartData = {
  dob: [2000, 4, 9],
  tob: [17, 55, 0],
  place: { name: 'unknown', lat: 42 + 30 / 60, lon: -(71 + 12 / 60), tz: -4.0 },
  dcf: 16,
};

// Chart 3 - A.B. Vajpayee
export const chart3: ChartData = {
  dob: [1926, 12, 25],
  tob: [5, 12, 0],
  place: { name: 'unknown', lat: 26 + 14 / 60, lon: 78 + 10 / 60, tz: 5.5 },
  dcf: 1,
};

// Chart 4
export const chart4: ChartData = {
  dob: [1968, 3, 19],
  tob: [18, 30, 0],
  place: { name: 'unknown', lat: 17 + 7 / 60, lon: 82 + 19 / 60, tz: 5.5 },
  dcf: 1,
};

// Chart 5
export const chart5: ChartData = {
  dob: [2000, 4, 19],
  tob: [19, 21, 0],
  place: { name: 'unknown', lat: 42 + 40 / 60, lon: -(71 + 8 / 60), tz: -4.0 },
  dcf: 9,
};

// Chart 6 - PV Narasimha Rao
export const chart6: ChartData = {
  dob: [1921, 6, 21],
  tob: [12, 49, 0],
  place: { name: 'unknown', lat: 18 + 26 / 60, lon: 79 + 9 / 60, tz: 5 + 17 / 60 },
  dcf: 1,
};

// Chart 7 - Ronald Reagan
export const chart7: ChartData = {
  dob: [1911, 2, 6],
  tob: [2, 4, 0],
  place: { name: 'unknown', lat: 41 + 38 / 60, lon: -(89 + 47 / 60), tz: -6.0 },
  dcf: 1,
};

// Chart 8
export const chart8: ChartData = {
  dob: [1946, 12, 2],
  tob: [6, 45, 0],
  place: { name: 'unknown', lat: 38 + 6 / 60, lon: 15 + 39 / 60, tz: 1.0 },
  dcf: 1,
};

// Chart 9 - Chatrapati Shivaji
export const chart9: ChartData = {
  dob: [1630, 2, 19],
  tob: [18, 26, 0],
  place: { name: 'unknown', lat: 18 + 32 / 60, lon: 73 + 53 / 60, tz: 5.5 },
  dcf: 1,
};

// Chart 10 - Akbar
export const chart10: ChartData = {
  dob: [1542, 12, 4],
  tob: [3, 39, 0],
  place: { name: 'unknown', lat: 25 + 19 / 60, lon: 69 + 47 / 60, tz: 5.0 },
  dcf: 1,
};

// Chart 11
export const chart11: ChartData = {
  dob: [1921, 6, 28],
  tob: [13, 8, 0],
  place: { name: 'unknown', lat: 18 + 26 / 60, lon: 79 + 9 / 60, tz: 5.0 },
  dcf: 1,
};

// Chart 12
export const chart12: ChartData = {
  dob: [1958, 8, 16],
  tob: [7, 5, 0],
  place: { name: 'unknown', lat: 43 + 36 / 60, lon: -(83 + 53 / 60), tz: -4.0 },
  dcf: 10,
};

// Chart 14 - Rajiv Gandhi
export const chart14: ChartData = {
  dob: [1944, 8, 20],
  tob: [7, 11, 0],
  place: { name: 'unknown', lat: 18 + 58 / 60, lon: 72 + 49 / 60, tz: 5.5 },
  dcf: 3,
};

// Example 27 - Bill Cosby
export const example27: ChartData = {
  dob: [1937, 7, 12],
  tob: [0, 30, 0],
  place: { name: 'unknown', lat: 39 + 57 / 60, lon: -(75 + 10 / 60), tz: -5.0 },
  dcf: 3,
};

// ============================================================================
// Additional charts from raja_yoga.py test section
// ============================================================================

// Akbar chart (HouseChart format from raja_yoga.py test)
export const chart10AkbarHouseChart: string[] = [
  '', '', '1', '', '8', '', '4/5/6/L', '0', '3', '2', '7', '',
];

// Rajiv Gandhi chart (HouseChart format from raja_yoga.py test)
export const chart14RajivGandhiHouseChart: string[] = [
  '', '', '6', '7', 'L/0/1/3/4/5', '2', '', '', '', '8', '', '',
];

// Oprah Winfrey chart (HouseChart format from raja_yoga.py test)
export const chartOprahHouseChart: string[] = [
  '', '4', '', '8', '', '', '6', '1/2', '', '0/3/5/L/7', '', '',
];

// Salman Khan chart (HouseChart format from raja_yoga.py test)
export const chartSalmanKhanHouseChart: string[] = [
  '0/2/5', '', '7', '6', '', '', 'L/1', '', '8/4', '', '', '3',
];
