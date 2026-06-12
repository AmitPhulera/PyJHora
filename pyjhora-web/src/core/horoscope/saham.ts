/**
 * Saham (Arabic Parts) calculations
 * Port of Python jhora/horoscope/transit/saham.py
 *
 * Each saham follows formula: A - B + C
 * If C is not between B and A zodiacally, add 30 degrees.
 * For night births, most sahams swap A and B.
 *
 * All functions take Python-style planet positions:
 *   [['L', [rasi, longitude]], [0, [rasi, longitude]], ... [8, [rasi, longitude]]]
 * where index 0 is Lagna and index p+1 is planet p (Sun=0 .. Ketu=8),
 * longitude is within-rasi (0-30).
 */

import { MARS, JUPITER } from '../constants';
import { getHouseOwnerFromPlanetPositions } from './house';

/** Python-style planet positions: [planetId|'L', [rasi, longitudeWithinRasi]] */
export type SahamPlanetPositions = Array<[string | number, [number, number]]>;

// ============================================================================
// HELPERS
// ============================================================================

/** Python: saham_longitude = lambda pp,p: pp[p][1][0]*30+pp[p][1][1] */
const sahamLongitude = (pp: SahamPlanetPositions, i: number): number =>
    pp[i][1][0] * 30 + pp[i][1][1];

const lagnaLongitude = (pp: SahamPlanetPositions): number => sahamLongitude(pp, 0);
const sunLongitude = (pp: SahamPlanetPositions): number => sahamLongitude(pp, 1);
const moonLongitude = (pp: SahamPlanetPositions): number => sahamLongitude(pp, 2);
const marsLongitude = (pp: SahamPlanetPositions): number => sahamLongitude(pp, 3);
const mercuryLongitude = (pp: SahamPlanetPositions): number => sahamLongitude(pp, 4);
const jupiterLongitude = (pp: SahamPlanetPositions): number => sahamLongitude(pp, 5);
const venusLongitude = (pp: SahamPlanetPositions): number => sahamLongitude(pp, 6);
const saturnLongitude = (pp: SahamPlanetPositions): number => sahamLongitude(pp, 7);

/** Convert Python-style positions to object-style for house owner helpers */
const toObjectPositions = (
    pp: SahamPlanetPositions
): Array<{ planet: number; rasi: number; longitude: number }> =>
    pp
        .filter(([p]) => p !== 'L')
        .map(([p, [rasi, longitude]]) => ({ planet: Number(p), rasi, longitude }));

/**
 * Check if C's rasi lies zodiacally between B and A.
 * Iterates from B's rasi forward; if C is found before A, returns true.
 */
const isCBetweenBToA = (aLong: number, bLong: number, cLong: number): boolean => {
    const aRasi = Math.floor(aLong / 30);
    const bRasi = Math.floor(bLong / 30);
    const cRasi = Math.floor(cLong / 30);
    for (let n = bRasi; n < bRasi + 11; n++) {
        const nextN = (n + 1) % 12;
        if (nextN === cRasi) return true;
        if (nextN === aRasi) break;
    }
    return false;
};

/**
 * Common saham calculation: A - B + C with zodiacal check.
 * If nightTimeBirth, swaps A and B.
 */
const computeSaham = (
    aLong: number, bLong: number, cLong: number,
    nightTimeBirth: boolean
): number => {
    let result: number;
    if (nightTimeBirth) {
        result = bLong - aLong + cLong;
        if (!isCBetweenBToA(bLong, aLong, cLong)) result += 30;
    } else {
        result = aLong - bLong + cLong;
        if (!isCBetweenBToA(aLong, bLong, cLong)) result += 30;
    }
    return ((result % 360) + 360) % 360;
};

/**
 * Same-day-and-night saham (no swap): A - B + C
 */
const computeSahamNoSwap = (
    aLong: number, bLong: number, cLong: number
): number => {
    let result = aLong - bLong + cLong;
    if (!isCBetweenBToA(aLong, bLong, cLong)) result += 30;
    return ((result % 360) + 360) % 360;
};

// ============================================================================
// SAHAM FUNCTIONS
// ============================================================================

/** 1. Punya (Fortune) - Moon - Sun + Lagna */
// @parity: py=punya_saham
export const punyaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    moonLongitude(pp), sunLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 2. Vidya (Education) - Sun - Moon + Lagna */
// @parity: py=vidya_saham
export const vidyaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    sunLongitude(pp), moonLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 3. Yasas (Fame) - Jupiter - PunyaSaham + Lagna */
// @parity: py=yasas_saham
export const yasasSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    jupiterLongitude(pp), punyaSaham(pp, nightTimeBirth), lagnaLongitude(pp), nightTimeBirth
);

/** 4. Mitra (Friend) - Jupiter - PunyaSaham + Venus */
// @parity: py=mitra_saham
export const mitraSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    jupiterLongitude(pp), punyaSaham(pp, nightTimeBirth), venusLongitude(pp), nightTimeBirth
);

/** 5. Mahatmya (Greatness) - PunyaSaham - Mars + Lagna */
// @parity: py=mahatmaya_saham
export const mahatmyaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    punyaSaham(pp, nightTimeBirth), marsLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 6. Asha (Desires) - Saturn - Mars + Lagna */
// @parity: py=asha_saham
export const ashaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    saturnLongitude(pp), marsLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 7. Samartha (Enterprise) - Mars - LagnaLord + Lagna
 *  If Mars owns lagna, use Jupiter as LagnaLord and flip night_time_birth */
// @parity: py=samartha_saham
export const samarthaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => {
    const lagnaHouse = pp[0][1][0];
    let lagnaLord = getHouseOwnerFromPlanetPositions(toObjectPositions(pp), lagnaHouse);
    let effectiveNight = nightTimeBirth;
    if (lagnaLord === MARS) {
        lagnaLord = JUPITER;
        effectiveNight = !effectiveNight;
    }
    const lagnaLordLong = sahamLongitude(pp, lagnaLord + 1);
    return computeSaham(
        marsLongitude(pp), lagnaLordLong, lagnaLongitude(pp), effectiveNight
    );
};

/** 8. Bhratri (Brothers) - Jupiter - Saturn + Lagna (same day/night) */
// @parity: py=bhratri_saham
export const bhratriSaham = (
    pp: SahamPlanetPositions
): number => computeSahamNoSwap(
    jupiterLongitude(pp), saturnLongitude(pp), lagnaLongitude(pp)
);

/** 9. Gaurava (Respect) - Jupiter - Moon + Sun */
// @parity: py=gaurava_saham
export const gauravaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    jupiterLongitude(pp), moonLongitude(pp), sunLongitude(pp), nightTimeBirth
);

/** 10. Pithri (Father) - Saturn - Sun + Lagna */
// @parity: py=pithri_saham
export const pithriSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    saturnLongitude(pp), sunLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 11. Rajya (Kingdom) - same as Pithri */
// @parity: py=rajya_saham
export const rajyaSaham = pithriSaham;

/** 12. Maathri (Mother) - Moon - Venus + Lagna */
// @parity: py=maathri_saham
export const maathriSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    moonLongitude(pp), venusLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 13. Puthra (Children) - Jupiter - Moon + Lagna */
// @parity: py=puthra_saham
export const puthraSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    jupiterLongitude(pp), moonLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 14. Jeeva (Life) - Saturn - Jupiter + Lagna */
// @parity: py=jeeva_saham
export const jeevaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    saturnLongitude(pp), jupiterLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 15. Karma (Action) - Mars - Mercury + Lagna */
// @parity: py=karma_saham
export const karmaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    marsLongitude(pp), mercuryLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 16. Roga (Disease) - Lagna - Moon + Lagna (same day/night, no between check) */
// @parity: py=roga_saham
export const rogaSaham = (
    pp: SahamPlanetPositions, _nightTimeBirth = false
): number => {
    const lagnaLong = lagnaLongitude(pp);
    return ((lagnaLong - moonLongitude(pp) + lagnaLong) % 360 + 360) % 360;
};

/** 16a. Roga alternate - Saturn - Moon + Lagna */
// @parity: py=roga_sagam_1
export const rogaSaham1 = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    saturnLongitude(pp), moonLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 17. Kali (Great misfortune) - Jupiter - Mars + Lagna */
// @parity: py=kali_saham
export const kaliSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    jupiterLongitude(pp), marsLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 18. Sastra (Sciences) - Jupiter - Saturn + Mercury */
// @parity: py=sastra_saham
export const sastraSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    jupiterLongitude(pp), saturnLongitude(pp), mercuryLongitude(pp), nightTimeBirth
);

/** 19. Bandhu (Relatives) - Mercury - Moon + Lagna */
// @parity: py=bandhu_saham
export const bandhuSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    mercuryLongitude(pp), moonLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 20. Mrithyu (Death) - 8th house - Moon + Lagna (same day/night) */
// @parity: py=mrithyu_saham
export const mrithyuSaham = (
    pp: SahamPlanetPositions
): number => {
    const lagnaLong = lagnaLongitude(pp);
    return computeSahamNoSwap(lagnaLong + 210, moonLongitude(pp), lagnaLong);
};

/** 21. Paradesa (Foreign countries) - 9th house - 9th lord + Lagna (same day/night) */
// @parity: py=paradesa_saham
export const paradesaSaham = (
    pp: SahamPlanetPositions, _nightTimeBirth = false
): number => {
    const ascHouse = pp[0][1][0];
    const ninthHouse = (ascHouse + 8) % 12;
    const ninthLord = getHouseOwnerFromPlanetPositions(toObjectPositions(pp), ninthHouse);
    const lagnaLong = lagnaLongitude(pp);
    return computeSahamNoSwap(lagnaLong + 240, sahamLongitude(pp, ninthLord + 1), lagnaLong);
};

/** 22. Artha (Money) - 2nd house - 2nd lord + Lagna (same day/night) */
// @parity: py=artha_saham
export const arthaSaham = (
    pp: SahamPlanetPositions, _nightTimeBirth = false
): number => {
    const ascHouse = pp[0][1][0];
    const secondHouse = (ascHouse + 1) % 12;
    const secondLord = getHouseOwnerFromPlanetPositions(toObjectPositions(pp), secondHouse);
    const lagnaLong = lagnaLongitude(pp);
    return computeSahamNoSwap(lagnaLong + 30, sahamLongitude(pp, secondLord + 1), lagnaLong);
};

/** 23. Paradara (Adultery) - Venus - Sun + Lagna */
// @parity: py=paradara_saham
export const paradaraSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    venusLongitude(pp), sunLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 24. Vanika (Commerce) - Moon - Mercury + Lagna */
// @parity: py=vanika_saham
export const vanikaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    moonLongitude(pp), mercuryLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 25. Karyasiddhi (Success) - Saturn - Sun + Lord(SunSign); Night: Saturn - Moon + Lord(MoonSign) */
// @parity: py=karyasiddhi_saham
export const karyasiddhiSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => {
    const saturnLong = saturnLongitude(pp);
    if (nightTimeBirth) {
        const moonLong = moonLongitude(pp);
        const lordOfMoonSign = getHouseOwnerFromPlanetPositions(toObjectPositions(pp), pp[2][1][0]);
        const signLong = sahamLongitude(pp, lordOfMoonSign + 1);
        let result = saturnLong - moonLong + signLong;
        if (!isCBetweenBToA(saturnLong, moonLong, signLong)) result += 30;
        return ((result % 360) + 360) % 360;
    }
    const sunLong = sunLongitude(pp);
    const lordOfSunSign = getHouseOwnerFromPlanetPositions(toObjectPositions(pp), pp[1][1][0]);
    const signLong = sahamLongitude(pp, lordOfSunSign + 1);
    let result = saturnLong - sunLong + signLong;
    if (!isCBetweenBToA(saturnLong, sunLong, signLong)) result += 30;
    return ((result % 360) + 360) % 360;
};

/** 26. Vivaha (Marriage) - Venus - Saturn + Lagna */
// @parity: py=vivaha_saham
export const vivahaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    venusLongitude(pp), saturnLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 27. Santapa (Sadness) - Saturn - Moon + 6th house */
// @parity: py=santapa_saham
export const santapaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    saturnLongitude(pp), moonLongitude(pp), lagnaLongitude(pp) + 150, nightTimeBirth
);

/** 28. Sraddha (Devotion) - Venus - Mars + Lagna */
// @parity: py=sraddha_saham
export const sraddhaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    venusLongitude(pp), marsLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 29. Preethi (Love) - SastraSaham - PunyaSaham + Lagna */
// @parity: py=preethi_saham
export const preethiSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    sastraSaham(pp, nightTimeBirth), punyaSaham(pp, nightTimeBirth),
    lagnaLongitude(pp), nightTimeBirth
);

/** 30. Jadya (Chronic disease) - Mars - Saturn + Mercury
 *  Note: Python has a subtle bug where %360 is inside the night block only.
 *  We replicate this behavior for parity. */
// @parity: py=jadya_saham
export const jadyaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => {
    const marsLong = marsLongitude(pp);
    const saturnLong = saturnLongitude(pp);
    const mercuryLong = mercuryLongitude(pp);
    let result = marsLong - saturnLong + mercuryLong;
    if (!isCBetweenBToA(marsLong, saturnLong, mercuryLong)) result += 30;
    if (nightTimeBirth) {
        result = saturnLong - marsLong + mercuryLong;
        if (!isCBetweenBToA(saturnLong, marsLong, mercuryLong)) result += 30;
        result = ((result % 360) + 360) % 360;
    }
    return result;
};

/** 31. Vyaapaara (Business) - Mars - Saturn + Lagna (same day/night) */
// @parity: py=vyaapaara_saham
export const vyaapaaraSaham = (
    pp: SahamPlanetPositions
): number => computeSahamNoSwap(
    marsLongitude(pp), saturnLongitude(pp), lagnaLongitude(pp)
);

/** 32. Sathru (Enemy) - Mars - Saturn + Lagna */
// @parity: py=sathru_saham
export const sathruSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    marsLongitude(pp), saturnLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 33. Jalapatna (Ocean crossing) - Cancer 15 deg - Saturn + Lagna */
// @parity: py=jalapatna_saham
export const jalapatnaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    105.0, // Cancer 15 degrees = 3*30 + 15
    saturnLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 34. Bandhana (Imprisonment) - PunyaSaham - Saturn + Lagna */
// @parity: py=bandhana_saham
export const bandhanaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    punyaSaham(pp, nightTimeBirth), saturnLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 35. Apamrithyu (Bad death) - 8th house - Mars + Lagna */
// @parity: py=apamrithyu_saham
export const apamrithyuSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => computeSaham(
    lagnaLongitude(pp) + 210, // 8th house
    marsLongitude(pp), lagnaLongitude(pp), nightTimeBirth
);

/** 36. Laabha (Material gains) - 11th house - 11th lord + Lagna */
// @parity: py=laabha_saham
export const laabhaSaham = (
    pp: SahamPlanetPositions, nightTimeBirth = false
): number => {
    const ascHouse = pp[0][1][0];
    const eleventhHouse = (ascHouse + 10) % 12;
    const eleventhLord = getHouseOwnerFromPlanetPositions(toObjectPositions(pp), eleventhHouse);
    const lagnaLong = lagnaLongitude(pp);
    const longEleventhHouse = lagnaLong + 300; // (11-1)*30
    const longEleventhLord = sahamLongitude(pp, eleventhLord + 1);
    if (nightTimeBirth) {
        let result = longEleventhLord - longEleventhHouse + lagnaLong;
        if (!isCBetweenBToA(longEleventhLord, longEleventhHouse, lagnaLong)) result += 30;
        return ((result % 360) + 360) % 360;
    }
    let result = longEleventhHouse - longEleventhLord + lagnaLong;
    if (!isCBetweenBToA(longEleventhHouse, longEleventhLord, lagnaLong)) result += 30;
    return ((result % 360) + 360) % 360;
};

// Re-export helper for testing
// @parity: py=_is_C_between_B_to_A
export { isCBetweenBToA };
