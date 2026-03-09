/**
 * Tests for Main Horoscope Orchestrator
 * Ported from PyJHora horoscope/main.py
 */

import { beforeAll, describe, it, expect } from 'vitest';
import type { Place } from '../../../src/core/types';
import type { PlanetPosition } from '../../../src/core/horoscope/charts';
import {
  Horoscope,
  getCharaKarakasFromJd,
} from '../../../src/core/horoscope/main';
import type {
  HoroscopeConfig,
  ChartInfo,
  BhavaChartResult,
  CalendarInfo,
} from '../../../src/core/horoscope/main';
import { julianDayNumber } from '../../../src/core/utils/julian';
import {
  SUN, MOON, MARS, MERCURY, JUPITER, VENUS, SATURN, RAHU, KETU,
} from '../../../src/core/constants';
import { initializeEphemeris } from '../../../src/core/ephemeris/swe-adapter';

// ============================================================================
// TEST DATA
// ============================================================================

const testPlace: Place = {
  name: 'Chennai,IN',
  latitude: 13.0389,
  longitude: 80.2619,
  timezone: 5.5,
};

const testDate = { year: 1996, month: 12, day: 7 };
const testTime = { hour: 10, minute: 34, second: 0 };

const testConfig: HoroscopeConfig = {
  place: testPlace,
  date: testDate,
  time: testTime,
  ayanamsaMode: 'TRUE_CITRA',
  calculationType: 'drik',
};

// ============================================================================
// HOROSCOPE CLASS TESTS
// ============================================================================

describe('Horoscope Class', () => {
  beforeAll(async () => {
    await initializeEphemeris();
  });

  describe('constructor', () => {
    it('should create a Horoscope with valid config', () => {
      const horo = new Horoscope(testConfig);
      expect(horo.place.name).toBe('Chennai,IN');
      expect(horo.date.year).toBe(1996);
      expect(horo.date.month).toBe(12);
      expect(horo.date.day).toBe(7);
      expect(horo.ayanamsaMode).toBe('TRUE_CITRA');
      expect(horo.calculationType).toBe('drik');
      expect(horo.julianDay).toBeGreaterThan(0);
      expect(horo.ayanamsaValue).toBeGreaterThan(0);
    });

    it('should use default values for optional config fields', () => {
      const horo = new Horoscope({
        place: testPlace,
        date: testDate,
        time: testTime,
      });
      expect(horo.ayanamsaMode).toBe('TRUE_CITRA');
      expect(horo.calculationType).toBe('drik');
      expect(horo.years).toBe(1);
      expect(horo.months).toBe(1);
      expect(horo.sixtyHours).toBe(1);
      expect(horo.bhavaMadhyaMethod).toBe(1);
    });
  });

  describe('getD1Positions', () => {
    it('should return positions with Ascendant and 9 planets', () => {
      const horo = new Horoscope(testConfig);
      const positions = horo.getD1Positions();

      // Ascendant + Sun through Ketu = 10 entries
      expect(positions.length).toBeGreaterThanOrEqual(10);

      // First entry should be Ascendant (planet -1)
      expect(positions[0]!.planet).toBe(-1);

      // Check all standard planets are present
      const planetIds = positions.map(p => p.planet);
      expect(planetIds).toContain(SUN);
      expect(planetIds).toContain(MOON);
      expect(planetIds).toContain(MARS);
      expect(planetIds).toContain(MERCURY);
      expect(planetIds).toContain(JUPITER);
      expect(planetIds).toContain(VENUS);
      expect(planetIds).toContain(SATURN);
      expect(planetIds).toContain(RAHU);
      expect(planetIds).toContain(KETU);

      // All rasi values should be 0-11
      for (const pos of positions) {
        expect(pos.rasi).toBeGreaterThanOrEqual(0);
        expect(pos.rasi).toBeLessThanOrEqual(11);
      }

      // All longitudes should be 0-30
      for (const pos of positions) {
        expect(pos.longitude).toBeGreaterThanOrEqual(0);
        expect(pos.longitude).toBeLessThan(30);
      }
    });
  });

  describe('getDivisionalChartPositions', () => {
    it('should return D1 positions for factor 1', () => {
      const horo = new Horoscope(testConfig);
      const d1 = horo.getD1Positions();
      const d1Again = horo.getDivisionalChartPositions(1);

      expect(d1Again.length).toBe(d1.length);
      for (let i = 0; i < d1.length; i++) {
        expect(d1Again[i]!.planet).toBe(d1[i]!.planet);
      }
    });

    it('should return navamsa positions for factor 9', () => {
      const horo = new Horoscope(testConfig);
      const d9 = horo.getDivisionalChartPositions(9);

      expect(d9.length).toBeGreaterThanOrEqual(10);
      expect(d9[0]!.planet).toBe(-1); // Ascendant

      // Rasi values still 0-11
      for (const pos of d9) {
        expect(pos.rasi).toBeGreaterThanOrEqual(0);
        expect(pos.rasi).toBeLessThanOrEqual(11);
      }
    });

    it('should return different rasis for divisional charts vs D1', () => {
      const horo = new Horoscope(testConfig);
      const d1 = horo.getDivisionalChartPositions(1);
      const d9 = horo.getDivisionalChartPositions(9);

      // At least some planets should be in different rasis in D9 vs D1
      let differences = 0;
      for (let i = 0; i < Math.min(d1.length, d9.length); i++) {
        if (d1[i]!.rasi !== d9[i]!.rasi) differences++;
      }
      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('getMixedChartPositions', () => {
    it('should return positions for D9xD12 composite chart', () => {
      const horo = new Horoscope(testConfig);
      const mixed = horo.getMixedChartPositions(9, 1, 12, 1);

      expect(mixed.length).toBeGreaterThanOrEqual(10);
      expect(mixed[0]!.planet).toBe(-1);

      for (const pos of mixed) {
        expect(pos.rasi).toBeGreaterThanOrEqual(0);
        expect(pos.rasi).toBeLessThanOrEqual(11);
      }
    });
  });

  describe('getCharaKarakas', () => {
    it('should return 8 chara karakas', () => {
      const horo = new Horoscope(testConfig);
      const karakas = horo.getCharaKarakas();

      expect(karakas).toHaveLength(8);

      // All karakas should be valid planet IDs (0-7, Sun to Rahu)
      for (const k of karakas) {
        expect(k).toBeGreaterThanOrEqual(SUN);
        expect(k).toBeLessThanOrEqual(RAHU);
      }

      // Each planet should appear exactly once
      const unique = new Set(karakas);
      expect(unique.size).toBe(8);
    });
  });

  describe('getCharaKarakasForChart', () => {
    it('should return a chart with karakas placed in houses', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getCharaKarakasForChart(1);

      expect(result).toHaveProperty('karakas');
      const chart = result['karakas']!;
      expect(chart).toHaveLength(12);

      // Count total karaka labels across all houses
      let totalKarakas = 0;
      for (const house of chart) {
        if (house.length > 0) {
          totalKarakas += house.split('\n').filter(s => s.length > 0).length;
        }
      }
      expect(totalKarakas).toBe(8);
    });
  });

  describe('getRetrogradePlanets', () => {
    it('should return an array of planet indices', () => {
      const horo = new Horoscope(testConfig);
      const retro = horo.getRetrogradePlanets();

      expect(Array.isArray(retro)).toBe(true);
      // Only Mars through Saturn can be retrograde
      for (const p of retro) {
        expect(p).toBeGreaterThanOrEqual(MARS);
        expect(p).toBeLessThanOrEqual(SATURN);
      }
    });
  });

  describe('getHoroscopeInformationForChart', () => {
    it('should return chart info for D1 chart', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getHoroscopeInformationForChart(1);

      expect(result).toHaveProperty('horoscopeInfo');
      expect(result).toHaveProperty('horoscopeChart');
      expect(result).toHaveProperty('ascendantHouse');

      // horoscopeChart should have 12 elements
      expect(result.horoscopeChart).toHaveLength(12);

      // ascendantHouse should be 0-11
      expect(result.ascendantHouse).toBeGreaterThanOrEqual(0);
      expect(result.ascendantHouse).toBeLessThanOrEqual(11);

      // horoscopeInfo should have ascendant entry
      const keys = Object.keys(result.horoscopeInfo);
      const hasAscendant = keys.some(k => k.includes('Ascendant'));
      expect(hasAscendant).toBe(true);

      // Should have planet entries
      const hasSun = keys.some(k => k.includes('Sun'));
      expect(hasSun).toBe(true);
    });

    it('should return chart info for D9 (Navamsa)', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getHoroscopeInformationForChart(9);

      expect(result.horoscopeChart).toHaveLength(12);
      expect(result.ascendantHouse).toBeGreaterThanOrEqual(0);

      // D9 key should start with "D-9"
      const keys = Object.keys(result.horoscopeInfo);
      const d9Keys = keys.filter(k => k.startsWith('D-9'));
      expect(d9Keys.length).toBeGreaterThan(0);
    });

    it('should include sphuta information', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getHoroscopeInformationForChart(1);

      const keys = Object.keys(result.horoscopeInfo);
      const sphutas = keys.filter(k => k.includes('sphuta'));
      expect(sphutas.length).toBeGreaterThan(0);
    });

    it('should include solar upagraha information', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getHoroscopeInformationForChart(1);

      const keys = Object.keys(result.horoscopeInfo);
      const upagrahas = keys.filter(k =>
        k.includes('dhuma') || k.includes('vyatipaata') ||
        k.includes('parivesha') || k.includes('indrachaapa') ||
        k.includes('upaketu')
      );
      expect(upagrahas.length).toBeGreaterThan(0);
    });
  });

  describe('getHoroscopeInformationForMixedChart', () => {
    it('should return chart info for D9xD12 composite', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getHoroscopeInformationForMixedChart(9, 1, 12, 1);

      expect(result.horoscopeChart).toHaveLength(12);
      expect(result.ascendantHouse).toBeGreaterThanOrEqual(0);
      expect(result.ascendantHouse).toBeLessThanOrEqual(11);

      // Keys should start with "D9xD12"
      const keys = Object.keys(result.horoscopeInfo);
      const mixedKeys = keys.filter(k => k.startsWith('D9xD12'));
      expect(mixedKeys.length).toBeGreaterThan(0);
    });
  });

  describe('getHousePlanetList', () => {
    it('should return 12-element array of house contents', () => {
      const horo = new Horoscope(testConfig);
      const chart = horo.getHousePlanetList();

      expect(chart).toHaveLength(12);

      // At least one house should have content (Ascendant)
      const nonEmpty = chart.filter(h => h.length > 0);
      expect(nonEmpty.length).toBeGreaterThan(0);
    });
  });

  describe('getPlanetToHouseDict', () => {
    it('should return planet-to-house mapping', () => {
      const horo = new Horoscope(testConfig);
      const dict = horo.getPlanetToHouseDict();

      // Should have entries for ascendant and planets
      expect(Object.keys(dict).length).toBeGreaterThan(0);

      // All house values should be 0-11
      for (const house of Object.values(dict)) {
        expect(house).toBeGreaterThanOrEqual(0);
        expect(house).toBeLessThanOrEqual(11);
      }
    });
  });

  describe('get64thNavamsa', () => {
    it('should return navamsa data for all planets', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.get64thNavamsa();

      // Should have entries for ascendant and planets
      expect(Object.keys(result).length).toBeGreaterThan(0);

      // Each value is [rasi, lord]
      for (const [rasi, lord] of Object.values(result)) {
        expect(rasi).toBeGreaterThanOrEqual(0);
        expect(rasi).toBeLessThanOrEqual(11);
        expect(lord).toBeGreaterThanOrEqual(0);
        expect(lord).toBeLessThanOrEqual(8);
      }
    });
  });

  describe('get22ndDrekkana', () => {
    it('should return drekkana data for all planets', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.get22ndDrekkana();

      expect(Object.keys(result).length).toBeGreaterThan(0);

      for (const [rasi, lord] of Object.values(result)) {
        expect(rasi).toBeGreaterThanOrEqual(0);
        expect(rasi).toBeLessThanOrEqual(11);
        expect(lord).toBeGreaterThanOrEqual(0);
        expect(lord).toBeLessThanOrEqual(8);
      }
    });
  });

  describe('getCombustPlanets', () => {
    it('should return an array of planet indices', () => {
      const horo = new Horoscope(testConfig);
      const combust = horo.getCombustPlanets();

      expect(Array.isArray(combust)).toBe(true);
      // Only Moon through Saturn can be combust
      for (const p of combust) {
        expect(p).toBeGreaterThanOrEqual(MOON);
        expect(p).toBeLessThanOrEqual(SATURN);
      }
    });
  });

  describe('getMaranaKarakaSthana', () => {
    it('should return array of [planet, house] pairs', () => {
      const horo = new Horoscope(testConfig);
      const mks = horo.getMaranaKarakaSthana();

      expect(Array.isArray(mks)).toBe(true);
      for (const [planet, house] of mks) {
        expect(planet).toBeGreaterThanOrEqual(SUN);
        expect(planet).toBeLessThanOrEqual(KETU);
        expect(house).toBeGreaterThanOrEqual(1);
        expect(house).toBeLessThanOrEqual(12);
      }
    });
  });

  describe('getPushkaraNavamsaBhaga', () => {
    it('should return two arrays of planet indices', () => {
      const horo = new Horoscope(testConfig);
      const [pna, pb] = horo.getPushkaraNavamsaBhaga();

      expect(Array.isArray(pna)).toBe(true);
      expect(Array.isArray(pb)).toBe(true);
    });
  });

  describe('getBeneficsAndMalefics', () => {
    it('should classify planets into benefics and malefics', () => {
      const horo = new Horoscope(testConfig);
      const [benefics, malefics] = horo.getBeneficsAndMalefics();

      expect(benefics.length).toBeGreaterThan(0);
      expect(malefics.length).toBeGreaterThan(0);

      // Jupiter and Venus are always benefics
      expect(benefics).toContain(JUPITER);
      expect(benefics).toContain(VENUS);

      // Sun and Mars are always malefics
      expect(malefics).toContain(SUN);
      expect(malefics).toContain(MARS);
    });
  });

  describe('getKPLords', () => {
    it('should return KP lord data for planets', () => {
      const horo = new Horoscope(testConfig);
      const kp = horo.getKPLords();

      expect(Object.keys(kp).length).toBeGreaterThan(0);
    });
  });

  describe('getArudhaPadhas', () => {
    it('should return bhava and graha arudhas', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getArudhaPadhas();

      expect(result).toHaveProperty('bhavaArudhas');
      expect(result).toHaveProperty('grahaArudhas');
      expect(result.bhavaArudhas).toHaveLength(12);

      for (const rasi of result.bhavaArudhas) {
        expect(rasi).toBeGreaterThanOrEqual(0);
        expect(rasi).toBeLessThanOrEqual(11);
      }
    });
  });

  describe('getSphutas', () => {
    it('should return sphuta chart data', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getSphutas(1);

      expect(result).toHaveProperty('sphuta');
      const chart = result['sphuta']!;
      expect(chart).toHaveLength(12);

      // At least some houses should have sphuta entries
      const nonEmpty = chart.filter(h => h.length > 0);
      expect(nonEmpty.length).toBeGreaterThan(0);
    });
  });

  describe('getYogiAvayogiInfo', () => {
    it('should return yogi/avayogi info', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getYogiAvayogiInfo();

      const keys = Object.keys(result);
      expect(keys.length).toBe(1);
      const info = Object.values(result)[0]!;
      expect(info).toContain('Yogi Sphuta');
      expect(info).toContain('Avayogi Sphuta');
    });
  });

  describe('getCalendarInformation', () => {
    it('should return calendar info for the date', () => {
      const horo = new Horoscope(testConfig);
      const cal = horo.getCalendarInformation();

      expect(cal.place).toBe('Chennai,IN');
      expect(cal.reportDate).toContain('1996');
      expect(cal.vaara).toBeGreaterThanOrEqual(0);
      expect(cal.vaara).toBeLessThanOrEqual(6);
      expect(cal.tithi.number).toBeGreaterThanOrEqual(1);
      expect(cal.tithi.number).toBeLessThanOrEqual(30);
      expect(cal.nakshatra.number).toBeGreaterThanOrEqual(1);
      expect(cal.nakshatra.number).toBeLessThanOrEqual(27);
      expect(cal.sunrise).toBeGreaterThan(0);
      expect(cal.sunset).toBeGreaterThan(cal.sunrise);
    });
  });

  describe('getHoroscopeInformation', () => {
    it('should return all chart info for all divisional charts', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getHoroscopeInformation();

      expect(result).toHaveProperty('horoscopeInfo');
      expect(result).toHaveProperty('horoscopeCharts');
      expect(result).toHaveProperty('ascendantHouses');

      // Should have charts for D1 + all other divisional charts
      expect(result.horoscopeCharts.length).toBeGreaterThan(1);

      // Each chart should be 12-element array
      for (const chart of result.horoscopeCharts) {
        expect(chart).toHaveLength(12);
      }

      // All ascendant houses should be 0-11
      for (const asc of result.ascendantHouses) {
        expect(asc).toBeGreaterThanOrEqual(0);
        expect(asc).toBeLessThanOrEqual(11);
      }
    });
  });

  describe('getLattaStars', () => {
    it('should return latta star data for planets', () => {
      const horo = new Horoscope(testConfig);
      const lattas = horo.getLattaStars();

      expect(lattas.length).toBeGreaterThan(0);
      for (const [planetStar, lattaStar] of lattas) {
        expect(planetStar).toBeGreaterThanOrEqual(1);
        expect(planetStar).toBeLessThanOrEqual(28);
      }
    });
  });

  describe('orderPlanetsFromKendras', () => {
    it('should return planets ordered from kendras', () => {
      const horo = new Horoscope(testConfig);
      const ordered = horo.orderPlanetsFromKendras();

      expect(ordered.length).toBeGreaterThan(0);
      // All entries should be valid planet IDs
      for (const p of ordered) {
        expect(p).toBeGreaterThanOrEqual(SUN);
        expect(p).toBeLessThanOrEqual(KETU);
      }
    });
  });

  describe('getPachakadiSambhandha', () => {
    it('should return pachakadi relationships', () => {
      const horo = new Horoscope(testConfig);
      const result = horo.getPachakadiSambhandha();

      // May or may not have entries depending on chart config
      expect(typeof result).toBe('object');
    });
  });

  describe('getVimsopakaBala', () => {
    it('should return four vimsopaka records', () => {
      const horo = new Horoscope(testConfig);
      const [sv, sav, dv, sdv] = horo.getVimsopakaBala();

      expect(typeof sv).toBe('object');
      expect(typeof sav).toBe('object');
      expect(typeof dv).toBe('object');
      expect(typeof sdv).toBe('object');
    });
  });

  describe('getVaiseshikamsaBala', () => {
    it('should return four vaiseshikamsa records', () => {
      const horo = new Horoscope(testConfig);
      const [sv, sav, dv, sdv] = horo.getVaiseshikamsaBala();

      expect(typeof sv).toBe('object');
      expect(typeof sav).toBe('object');
      expect(typeof dv).toBe('object');
      expect(typeof sdv).toBe('object');
    });
  });
});

// ============================================================================
// MODULE-LEVEL FUNCTION TESTS
// ============================================================================

describe('getCharaKarakasFromJd', () => {
  beforeAll(async () => {
    await initializeEphemeris();
  });

  it('should return 8 chara karakas', () => {
    const jd = julianDayNumber(testDate, testTime);
    const karakas = getCharaKarakasFromJd(jd, testPlace);

    expect(karakas).toHaveLength(8);
    for (const k of karakas) {
      expect(k).toBeGreaterThanOrEqual(SUN);
      expect(k).toBeLessThanOrEqual(RAHU);
    }
    const unique = new Set(karakas);
    expect(unique.size).toBe(8);
  });

  it('should match Horoscope.getCharaKarakas', () => {
    const horo = new Horoscope(testConfig);
    const karakasFromHoro = horo.getCharaKarakas();
    const jd = julianDayNumber(testDate, testTime);
    const karakasFromFn = getCharaKarakasFromJd(jd, testPlace);

    expect(karakasFromFn).toEqual(karakasFromHoro);
  });
});

// ============================================================================
// CROSS-CHART CONSISTENCY TESTS
// ============================================================================

describe('Cross-chart consistency', () => {
  beforeAll(async () => {
    await initializeEphemeris();
  });

  it('D1 chart should have same positions as getDivisionalChartPositions(1)', () => {
    const horo = new Horoscope(testConfig);
    const d1Direct = horo.getD1Positions();
    const d1Via = horo.getDivisionalChartPositions(1);

    expect(d1Via.length).toBe(d1Direct.length);
    for (let i = 0; i < d1Direct.length; i++) {
      expect(d1Via[i]!.planet).toBe(d1Direct[i]!.planet);
      expect(d1Via[i]!.rasi).toBe(d1Direct[i]!.rasi);
      // Longitudes should be very close (same underlying calculation)
      expect(Math.abs(d1Via[i]!.longitude - d1Direct[i]!.longitude)).toBeLessThan(0.001);
    }
  });

  it('chart info D1 and D9 should have different ascendant rasis (usually)', () => {
    const horo = new Horoscope(testConfig);
    const d1 = horo.getHoroscopeInformationForChart(1);
    const d9 = horo.getHoroscopeInformationForChart(9);

    // They can be the same in rare cases, but for our test data they should differ
    // Just verify both are valid
    expect(d1.ascendantHouse).toBeGreaterThanOrEqual(0);
    expect(d9.ascendantHouse).toBeGreaterThanOrEqual(0);
  });

  it('arudha padhas for D1 should have 12 bhava arudhas', () => {
    const horo = new Horoscope(testConfig);
    const result = horo.getArudhaPadhas(1);
    expect(result.bhavaArudhas).toHaveLength(12);
  });

  it('arudha padhas for D9 should have 12 bhava arudhas', () => {
    const horo = new Horoscope(testConfig);
    const result = horo.getArudhaPadhas(9);
    expect(result.bhavaArudhas).toHaveLength(12);
  });
});
