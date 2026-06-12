/**
 * JD/Place convenience wrappers for yoga functions.
 * Each wrapper computes planet positions from (jd, place) and delegates
 * to the corresponding FromPlanetPositions function in yoga.ts.
 *
 * Matches Python's xxx_yoga_from_jd_place() functions in yoga.py.
 */

import type { PlanetPosition } from '../types';
import { Place } from '../types';
import {
  JUPITER,
  VENUS,
  HOUSE_2,
  HOUSE_STRENGTHS_OF_PLANETS,
  STRENGTH_EXALTED,
  PLANET_DEEP_EXALTATION_LONGITUDES,
  ASCENDANT_SYMBOL,
} from '../constants';
import { getPlanetLongitude } from '../panchanga/drik';
import { calculateTithi } from '../panchanga/drik';
import { getDivisionalChart, getBenefics, getMalefics, vaiseshikamsaDhasavargaOfPlanets } from './charts';
import { getHouseOwnerFromChart, getQuadrantsOfRaasi } from './house';
import {
  planetPositionsToChart,
  getPlanetToHouseDict,
  // 112 FromPlanetPositions functions
  adhiYogaFromPlanetPositions,
  amalaYogaFromPlanetPositions,
  amarananthaDhanaYogaFromPlanetPositions,
  amsaavataraYogaFromPlanetPositions,
  anaphaaYogaFromPlanetPositions,
  andhaYogaFromPlanetPositions,
  annadanaYogaFromPlanetPositions,
  anthyaVayasiDhanaYogaFromPlanetPositions,
  asatyavadiYogaFromPlanetPositions,
  ayatnadhanalabhaYogaFromPlanetPositions,
  bahudravyarjanaYogaFromPlanetPositions,
  bhaarathiYogaFromPlanetPositions,
  bhaaskaraYogaFromPlanetPositions,
  bhagyaMalikaYogaFromPlanetPositions,
  bheriYogaFromPlanetPositions,
  bhojanaSoukhyaYogaFromPlanetPositions,
  bhratrumooladdhanapraptiYogaFromPlanetPositions,
  brahmaYogaFromPlanetPositions,
  budhaYogaFromPlanetPositions,
  chaamaraYogaFromPlanetPositions,
  chandikaaYogaFromPlanetPositions,
  chapaYogaFromPlanetPositions,
  chatussagaraYogaFromPlanetPositions,
  damaYogaFromPlanetPositions,
  dehapushtiYogaFromPlanetPositions,
  dehasthoulyaYogaFromPlanetPositions,
  devendraYogaFromPlanetPositions,
  dhanaMalikaYogaFromPlanetPositions,
  dhanaYogaFromPlanetPositions,
  dharidhraYogaFromPlanetPositions,
  dhurYogaFromPlanetPositions,
  dhurdhuraYogaFromPlanetPositions,
  durmukhaYogaFromPlanetPositions,
  gajaKesariYogaFromPlanetPositions,
  gajaYogaFromPlanetPositions,
  gandharvaYogaFromPlanetPositions,
  garudaYogaFromPlanetPositions,
  goYogaFromPlanetPositions,
  golaYogaFromPlanetPositions,
  gouriYogaFromPlanetPositions,
  haraYogaFromPlanetPositions,
  hariYogaFromPlanetPositions,
  hariharaBrahmaYogaFromPlanetPositions,
  harshaYogaFromPlanetPositions,
  indraYogaFromPlanetPositions,
  jadaYogaFromPlanetPositions,
  jayaYogaFromPlanetPositions,
  kaahalaYogaFromPlanetPositions,
  kahalaYogaFromPlanetPositions,
  kalaanidhiYogaFromPlanetPositions,
  kalanidhiYogaFromPlanetPositions,
  kalatraMalikaYogaFromPlanetPositions,
  kalatramooladdhanaYogaFromPlanetPositions,
  kalpadrumaYogaFromPlanetPositions,
  karmaMalikaYogaFromPlanetPositions,
  kedaraYogaFromPlanetPositions,
  koormaYogaFromPlanetPositions,
  krisangaYogaFromPlanetPositions,
  kulavardhanaYogaFromPlanetPositions,
  kusumaYogaFromPlanetPositions,
  labhaMalikaYogaFromPlanetPositions,
  lagnaMalikaYogaFromPlanetPositions,
  lagnaadhiYogaFromPlanetPositions,
  lakshmiYogaFromPlanetPositions,
  maalaaYogaFromPlanetPositions,
  madhyaVayasiDhanaYogaFromPlanetPositions,
  mahabhagyaYogaFromPlanetPositions,
  makutaYogaFromPlanetPositions,
  marudYogaFromPlanetPositions,
  matrumooladdhanaYogaFromPlanetPositions,
  matsyaYogaFromPlanetPositions,
  mookaYogaFromPlanetPositions,
  netranasaYogaFromPlanetPositions,
  parannabhojanaYogaFromPlanetPositions,
  parijathaYogaFromPlanetPositions,
  parvataYogaFromPlanetPositions,
  pushkalaYogaFromPlanetPositions,
  putraMalikaYogaFromPlanetPositions,
  putramooladdhanaYogaFromPlanetPositions,
  rajalakshanaYogaFromPlanetPositions,
  randhraMalikaYogaFromPlanetPositions,
  raviYogaFromPlanetPositions,
  rogagrasthaYogaFromPlanetPositions,
  saaradaYogaFromPlanetPositions,
  sadaSancharaYogaFromPlanetPositions,
  sankhaYogaFromPlanetPositions,
  saralaYogaFromPlanetPositions,
  saraswathiYogaFromPlanetPositions,
  sareeraSoukhyaYogaFromPlanetPositions,
  sarpaYogaFromPlanetPositions,
  sarpagandaYogaFromPlanetPositions,
  satruMalikaYogaFromPlanetPositions,
  shatrumooladdhanaYogaFromPlanetPositions,
  sivaYogaFromPlanetPositions,
  sraddhannabhukthaYogaFromPlanetPositions,
  srikYogaFromPlanetPositions,
  subhaYogaFromPlanetPositions,
  sukhaMalikaYogaFromPlanetPositions,
  sulaYogaFromPlanetPositions,
  sumukhaYogaFromPlanetPositions,
  sunaphaaYogaFromPlanetPositions,
  swaveeryaddhanaYogaFromPlanetPositions,
  trilochanaYogaFromPlanetPositions,
  vallakiYogaFromPlanetPositions,
  vanchanaChoraBheethiYogaFromPlanetPositions,
  vasumathiYogaFromPlanetPositions,
  vidyutYogaFromPlanetPositions,
  vikramaMalikaYogaFromPlanetPositions,
  vimalaYogaFromPlanetPositions,
  vishnuYogaFromPlanetPositions,
  vyayaMalikaYogaFromPlanetPositions,
  yugaYogaFromPlanetPositions,
  yukthiSamanwithavagmiYogaFromPlanetPositions,
  type HouseChart,
} from './yoga';

// ============================================================================
// HELPER: Compute planet positions from JD/Place
// ============================================================================

/**
 * Compute planet positions from Julian Day and place.
 * Mirrors the pattern used across dhasa modules (getPlanetPositionsArray).
 * Returns D1 positions if divisionalChartFactor=1, otherwise applies varga.
 */
function getPlanetPositions(
  jd: number,
  place: Place,
  divisionalChartFactor: number = 1,
): PlanetPosition[] {
  const d1Positions: PlanetPosition[] = [];
  for (let planet = 0; planet <= 8; planet++) {
    const longitude = getPlanetLongitude(jd, place, planet);
    d1Positions.push({
      planet,
      rasi: Math.floor(longitude / 30),
      longitude: longitude % 30,
    } as PlanetPosition);
  }
  if (divisionalChartFactor > 1) {
    return getDivisionalChart(d1Positions, divisionalChartFactor);
  }
  return d1Positions;
}

// ============================================================================
// SIMPLE WRAPPERS (107 functions)
// Pattern: compute pp from (jd, place, dcf), delegate to FromPlanetPositions
// ============================================================================

// @parity: py=adhi_yoga_from_jd_place
export function adhiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return adhiYogaFromPlanetPositions(pp);
}

// @parity: py=amala_yoga_from_jd_place
export function amalaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return amalaYogaFromPlanetPositions(pp);
}

// @parity: py=amaranantha_dhana_yoga_from_jd_place
export function amarananthaDhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return amarananthaDhanaYogaFromPlanetPositions(pp);
}

// @parity: py=amsaavatara_yoga_from_jd_place
export function amsaavataraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return amsaavataraYogaFromPlanetPositions(pp);
}

// @parity: py=anaphaa_yoga_from_jd_place
export function anaphaaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return anaphaaYogaFromPlanetPositions(pp);
}

// @parity: py=andha_yoga_from_jd_place
export function andhaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return andhaYogaFromPlanetPositions(pp);
}

// @parity: py=annadana_yoga_from_jd_place
export function annadanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return annadanaYogaFromPlanetPositions(pp);
}

// @parity: py=anthya_vayasi_dhana_yoga_from_jd_place
export function anthyaVayasiDhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return anthyaVayasiDhanaYogaFromPlanetPositions(pp);
}

// @parity: py=asatyavadi_yoga_from_jd_place
export function asatyavadiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return asatyavadiYogaFromPlanetPositions(pp);
}

// @parity: py=ayatnadhanalabha_yoga_from_jd_place
export function ayatnadhanalabhaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return ayatnadhanalabhaYogaFromPlanetPositions(pp);
}

// @parity: py=bahudravyarjana_yoga_from_jd_place
export function bahudravyarjanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return bahudravyarjanaYogaFromPlanetPositions(pp);
}

// @parity: py=bhaarathi_yoga_from_jd_place
export function bhaarathiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return bhaarathiYogaFromPlanetPositions(pp);
}

// @parity: py=bhaaskara_yoga_from_jd_place
export function bhaaskaraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return bhaaskaraYogaFromPlanetPositions(pp);
}

// @parity: py=bhagya_malika_yoga_from_jd_place
export function bhagyaMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return bhagyaMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=bheri_yoga_from_jd_place
export function bheriYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return bheriYogaFromPlanetPositions(pp);
}

// @parity: py=bhojana_soukhya_yoga_from_jd_place
export function bhojanaSoukhyaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return bhojanaSoukhyaYogaFromPlanetPositions(pp);
}

// @parity: py=bhratrumooladdhanaprapti_yoga_from_jd_place
export function bhratrumooladdhanapraptiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return bhratrumooladdhanapraptiYogaFromPlanetPositions(pp);
}

// @parity: py=brahma_yoga_from_jd_place
export function brahmaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1, method = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return brahmaYogaFromPlanetPositions(pp, method);
}

// @parity: py=budha_yoga_from_jd_place
export function budhaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return budhaYogaFromPlanetPositions(pp);
}

// @parity: py=chaamara_yoga_from_jd_place
export function chaamaraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return chaamaraYogaFromPlanetPositions(pp);
}

// @parity: py=chandikaa_yoga_from_jd_place
export function chandikaaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return chandikaaYogaFromPlanetPositions(pp);
}

// @parity: py=chapa_yoga_from_jd_place
export function chapaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return chapaYogaFromPlanetPositions(pp);
}

// @parity: py=chatussagara_yoga_from_jd_place
export function chatussagaraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return chatussagaraYogaFromPlanetPositions(pp);
}

// @parity: py=dama_yoga_from_jd_place
export function damaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return damaYogaFromPlanetPositions(pp);
}

// @parity: py=dehapushti_yoga_from_jd_place
export function dehapushtiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return dehapushtiYogaFromPlanetPositions(pp);
}

// @parity: py=dehasthoulya_yoga_from_jd_place
export function dehasthoulyaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return dehasthoulyaYogaFromPlanetPositions(pp);
}

// @parity: py=devendra_yoga_from_jd_place
export function devendraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return devendraYogaFromPlanetPositions(pp);
}

// @parity: py=dhana_malika_yoga_from_jd_place
export function dhanaMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return dhanaMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=dhana_yoga_from_jd_place
export function dhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return dhanaYogaFromPlanetPositions(pp);
}

// @parity: py=dharidhra_yoga_from_jd_place
export function dharidhraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return dharidhraYogaFromPlanetPositions(pp);
}

// @parity: py=dhur_yoga_from_jd_place
export function dhurYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return dhurYogaFromPlanetPositions(pp);
}

// @parity: py=durmukha_yoga_from_jd_place
export function durmukhaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return durmukhaYogaFromPlanetPositions(pp);
}

// @parity: py=gaja_kesari_yoga_from_jd_place
export function gajaKesariYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return gajaKesariYogaFromPlanetPositions(pp);
}

// @parity: py=gaja_yoga_from_jd_place
export function gajaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return gajaYogaFromPlanetPositions(pp);
}

// @parity: py=gandharva_yoga_from_jd_place
export function gandharvaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1, method = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return gandharvaYogaFromPlanetPositions(pp, method);
}

// @parity: py=garuda_yoga_from_jd_place
export function garudaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return garudaYogaFromPlanetPositions(pp);
}

// @parity: py=go_yoga_from_jd_place
export function goYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return goYogaFromPlanetPositions(pp);
}

// @parity: py=gola_yoga_from_jd_place
export function golaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return golaYogaFromPlanetPositions(pp);
}

// @parity: py=gouri_yoga_from_jd_place
export function gouriYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return gouriYogaFromPlanetPositions(pp);
}

// @parity: py=hara_yoga_from_jd_place
export function haraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return haraYogaFromPlanetPositions(pp);
}

// @parity: py=hari_yoga_from_jd_place
export function hariYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return hariYogaFromPlanetPositions(pp);
}

// @parity: py=harsha_yoga_from_jd_place
export function harshaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return harshaYogaFromPlanetPositions(pp);
}

// @parity: py=indra_yoga_from_jd_place
export function indraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return indraYogaFromPlanetPositions(pp);
}

// @parity: py=jada_yoga_from_jd_place
export function jadaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return jadaYogaFromPlanetPositions(pp);
}

// @parity: py=jaya_yoga_from_jd_place
export function jayaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return jayaYogaFromPlanetPositions(pp);
}

// @parity: py=kaahala_yoga_from_jd_place
export function kaahalaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kaahalaYogaFromPlanetPositions(pp);
}

// @parity: py=kahala_yoga_from_jd_place
export function kahalaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kahalaYogaFromPlanetPositions(pp);
}

// @parity: py=kalaanidhi_yoga_from_jd_place
export function kalaanidhiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kalaanidhiYogaFromPlanetPositions(pp);
}

// @parity: py=kalanidhi_yoga_from_jd_place
export function kalanidhiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kalanidhiYogaFromPlanetPositions(pp);
}

// @parity: py=kalatra_malika_yoga_from_jd_place
export function kalatraMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kalatraMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=kalatramooladdhana_yoga_from_jd_place
export function kalatramooladdhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kalatramooladdhanaYogaFromPlanetPositions(pp);
}

// @parity: py=kalpadruma_yoga_from_jd_place
export function kalpadrumaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kalpadrumaYogaFromPlanetPositions(pp);
}

// @parity: py=karma_malika_yoga_from_jd_place
export function karmaMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return karmaMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=kedara_yoga_from_jd_place
export function kedaraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kedaraYogaFromPlanetPositions(pp);
}

// @parity: py=koorma_yoga_from_jd_place
export function koormaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return koormaYogaFromPlanetPositions(pp);
}

// @parity: py=krisanga_yoga_from_jd_place
export function krisangaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return krisangaYogaFromPlanetPositions(pp);
}

// @parity: py=kulavardhana_yoga_from_jd_place
export function kulavardhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kulavardhanaYogaFromPlanetPositions(pp);
}

// @parity: py=kusuma_yoga_from_jd_place
export function kusumaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return kusumaYogaFromPlanetPositions(pp);
}

// @parity: py=labha_malika_yoga_from_jd_place
export function labhaMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return labhaMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=lagna_malika_yoga_from_jd_place
export function lagnaMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return lagnaMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=lagnaadhi_yoga_from_jd_place
export function lagnaadhiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return lagnaadhiYogaFromPlanetPositions(pp);
}

// @parity: py=lakshmi_yoga_from_jd_place
export function lakshmiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return lakshmiYogaFromPlanetPositions(pp);
}

// @parity: py=madhya_vayasi_dhana_yoga_from_jd_place
export function madhyaVayasiDhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return madhyaVayasiDhanaYogaFromPlanetPositions(pp);
}

// @parity: py=mahabhagya_yoga_from_jd_place
export function mahabhagyaYogaFromJdPlace(
  jd: number,
  place: Place,
  divisionalChartFactor = 1,
  gender: 'male' | 'female' = 'male',
  isDayBirth: boolean = true,
): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return mahabhagyaYogaFromPlanetPositions(pp, gender, isDayBirth);
}

// @parity: py=makuta_yoga_from_jd_place
export function makutaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return makutaYogaFromPlanetPositions(pp);
}

// @parity: py=marud_yoga_from_jd_place
export function marudYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return marudYogaFromPlanetPositions(pp);
}

// @parity: py=matrumooladdhana_yoga_from_jd_place
export function matrumooladdhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return matrumooladdhanaYogaFromPlanetPositions(pp);
}

// @parity: py=matsya_yoga_from_jd_place
export function matsyaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1, method = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return matsyaYogaFromPlanetPositions(pp, method);
}

// @parity: py=mooka_yoga_from_jd_place
export function mookaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return mookaYogaFromPlanetPositions(pp);
}

// @parity: py=netranasa_yoga_from_jd_place
export function netranasaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return netranasaYogaFromPlanetPositions(pp);
}

// @parity: py=parannabhojana_yoga_from_jd_place
export function parannabhojanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return parannabhojanaYogaFromPlanetPositions(pp);
}

// @parity: py=parijatha_yoga__from_jd_place
export function parijathaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return parijathaYogaFromPlanetPositions(pp);
}

// @parity: py=parvata_yoga_from_jd_place
export function parvataYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return parvataYogaFromPlanetPositions(pp);
}

// @parity: py=pushkala_yoga_from_jd_place
export function pushkalaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return pushkalaYogaFromPlanetPositions(pp);
}

// @parity: py=putra_malika_yoga_from_jd_place
export function putraMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return putraMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=putramooladdhana_yoga_from_jd_place
export function putramooladdhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return putramooladdhanaYogaFromPlanetPositions(pp);
}

// @parity: py=rajalakshana_yoga_from_jd_place
export function rajalakshanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return rajalakshanaYogaFromPlanetPositions(pp);
}

// @parity: py=randhra_malika_yoga_from_jd_place
export function randhraMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return randhraMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=ravi_yoga_from_jd_place
export function raviYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return raviYogaFromPlanetPositions(pp);
}

// @parity: py=rogagrastha_yoga_from_jd_place
export function rogagrasthaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return rogagrasthaYogaFromPlanetPositions(pp);
}

// @parity: py=saarada_yoga_from_jd_place
export function saaradaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return saaradaYogaFromPlanetPositions(pp);
}

// @parity: py=sada_sanchara_yoga_from_jd_place
export function sadaSancharaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sadaSancharaYogaFromPlanetPositions(pp);
}

// @parity: py=sankha_yoga_from_jd_place
export function sankhaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sankhaYogaFromPlanetPositions(pp);
}

// @parity: py=sarala_yoga_from_jd_place
export function saralaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return saralaYogaFromPlanetPositions(pp);
}

// @parity: py=saraswathi_yoga_from_jd_place
export function saraswathiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return saraswathiYogaFromPlanetPositions(pp);
}

// @parity: py=sareera_soukhya_yoga_from_jd_place
export function sareeraSoukhyaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sareeraSoukhyaYogaFromPlanetPositions(pp);
}

// @parity: py=sarpaganda_yoga_from_jd_place
export function sarpagandaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sarpagandaYogaFromPlanetPositions(pp);
}

// @parity: py=satru_malika_yoga_from_jd_place
export function satruMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return satruMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=shatrumooladdhana_yoga_from_jd_place
export function shatrumooladdhanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return shatrumooladdhanaYogaFromPlanetPositions(pp);
}

// @parity: py=siva_yoga_from_jd_place
export function sivaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sivaYogaFromPlanetPositions(pp);
}

// @parity: py=sraddhannabhuktha_yoga_from_jd_place
export function sraddhannabhukthaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sraddhannabhukthaYogaFromPlanetPositions(pp);
}

// @parity: py=srik_yoga_from_jd_place
export function srikYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return srikYogaFromPlanetPositions(pp);
}

// @parity: py=subha_yoga_from_jd_place
export function subhaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return subhaYogaFromPlanetPositions(pp);
}

// @parity: py=sukha_malika_yoga_from_jd_place
export function sukhaMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sukhaMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=sula_yoga_from_jd_place
export function sulaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sulaYogaFromPlanetPositions(pp);
}

// @parity: py=sumukha_yoga_from_jd_place
export function sumukhaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sumukhaYogaFromPlanetPositions(pp);
}

// @parity: py=sunaphaa_yoga_from_jd_place
export function sunaphaaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return sunaphaaYogaFromPlanetPositions(pp);
}

// @parity: py=swaveeryaddhana_yoga_from_jd_place
export function swaveeryaddhanaYogaFromJdPlace(
  jd: number,
  place: Place,
  divisionalChartFactor = 1,
  chartNavamsa?: HouseChart,
  vaiseshikamsaScores?: Record<number, number>,
): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return swaveeryaddhanaYogaFromPlanetPositions(pp, chartNavamsa, vaiseshikamsaScores);
}

// @parity: py=trilochana_yoga_from_jd_place
export function trilochanaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return trilochanaYogaFromPlanetPositions(pp);
}

// @parity: py=vallaki_yoga_from_jd_place
export function vallakiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return vallakiYogaFromPlanetPositions(pp);
}

// @parity: py=vanchana_chora_bheethi_yoga_from_jd_place
export function vanchanaChoraBheethiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return vanchanaChoraBheethiYogaFromPlanetPositions(pp);
}

// @parity: py=vasumathi_yoga_from_jd_place
export function vasumathiYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return vasumathiYogaFromPlanetPositions(pp);
}

// @parity: py=vidyut_yoga_from_jd_place
export function vidyutYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return vidyutYogaFromPlanetPositions(pp);
}

// @parity: py=vikrama_malika_yoga_from_jd_place
export function vikramaMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return vikramaMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=vimala_yoga_from_jd_place
export function vimalaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return vimalaYogaFromPlanetPositions(pp);
}

// @parity: py=vishnu_yoga_from_jd_place
export function vishnuYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return vishnuYogaFromPlanetPositions(pp);
}

// @parity: py=vyaya_malika_yoga_from_jd_place
export function vyayaMalikaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return vyayaMalikaYogaFromPlanetPositions(pp);
}

// @parity: py=yuga_yoga_from_jd_place
export function yugaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  return yugaYogaFromPlanetPositions(pp);
}

// ============================================================================
// COMPLEX WRAPPERS (5 functions with non-trivial logic)
// ============================================================================

/**
 * Dhurdhura Yoga from JD/Place.
 * Python L220: Returns sunaphaa AND anaphaa (both must be true).
 * This differs from dhurdhuraYogaFromPlanetPositions which delegates to the chart-based version.
 */
// @parity: py=dhurdhura_yoga_from_jd_place
export function dhurdhuraYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const _sunaphaa = sunaphaaYogaFromJdPlace(jd, place, divisionalChartFactor);
  const _anaphaa = anaphaaYogaFromJdPlace(jd, place, divisionalChartFactor);
  return _sunaphaa && _anaphaa;
}

/**
 * Maalaa Yoga from JD/Place.
 * Python L391: Uses tithi-dependent benefics (charts.benefics) instead of
 * hardcoded natural benefics. Checks if 3 out of 4 kendras have benefics.
 */
// @parity: py=maalaa_yoga_from_jd_place
export function maalaaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  const chart = planetPositionsToChart(pp);
  const pToH = getPlanetToHouseDict(chart);

  // Get tithi-dependent benefics
  const tithiResult = calculateTithi(jd, place);
  const naturalBenefics = getBenefics(pp, tithiResult.number);

  const lagnaHouse = pToH[ASCENDANT_SYMBOL] ?? 0;
  const kendraHouses = getQuadrantsOfRaasi(lagnaHouse);

  let occupiedBeneficKendras = 0;
  for (const houseIndex of kendraHouses) {
    const planetsInHouse = (chart[houseIndex] || '').split('/').filter(Boolean);
    if (naturalBenefics.some(nb => planetsInHouse.includes(String(nb)))) {
      occupiedBeneficKendras++;
    }
  }
  return occupiedBeneficKendras === 3;
}

/**
 * Sarpa Yoga from JD/Place.
 * Python L425: Uses tithi-dependent malefics (charts.malefics) instead of
 * hardcoded natural malefics. Checks if 3 out of 4 kendras have malefics.
 */
// @parity: py=sarpa_yoga_from_jd_place
export function sarpaYogaFromJdPlace(jd: number, place: Place, divisionalChartFactor = 1): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  const chart = planetPositionsToChart(pp);
  const pToH = getPlanetToHouseDict(chart);

  // Get tithi-dependent malefics
  const tithiResult = calculateTithi(jd, place);
  const naturalMalefics = getMalefics(pp, tithiResult.number);

  const lagnaHouse = pToH[ASCENDANT_SYMBOL] ?? 0;
  const kendraHouses = getQuadrantsOfRaasi(lagnaHouse);

  let occupiedMaleficKendras = 0;
  for (const houseIndex of kendraHouses) {
    const planetsInHouse = (chart[houseIndex] || '').split('/').filter(Boolean);
    if (naturalMalefics.some(nm => planetsInHouse.includes(String(nm)))) {
      occupiedMaleficKendras++;
    }
  }
  return occupiedMaleficKendras === 3;
}

/**
 * Harihara Brahma Yoga from JD/Place.
 * Python L3650: Returns hari OR hara OR brahma (any one must be true).
 * Takes an optional method param for the brahma yoga calculation.
 */
// @parity: py=harihara_brahma_yoga_from_jd_place
export function hariharaBrahmaYogaFromJdPlace(
  jd: number,
  place: Place,
  divisionalChartFactor = 1,
  method = 1,
): boolean {
  const _hari = hariYogaFromJdPlace(jd, place, divisionalChartFactor);
  const _hara = haraYogaFromJdPlace(jd, place, divisionalChartFactor);
  const _brahma = brahmaYogaFromJdPlace(jd, place, divisionalChartFactor, method);
  return _hari || _hara || _brahma;
}

/**
 * Yukthi Samanwithavagmi Yoga #155 from JD/Place (private/internal).
 * Python L6191: Complex check involving:
 * 1. L2 (lord of 2nd house) must be in a kendra from lagna
 * 2. L2 must be at deep exaltation (paramochha)
 * 3. L2 must have Dasavarga Vaisheshikamsa score >= 6 (Paaraavataamsa)
 * 4. Jupiter or Venus must have score >= 5 (Simhaasanaamsa)
 */
export function yukthiSamanwithavagmiYoga155FromJdPlace(
  jd: number,
  place: Place,
  divisionalChartFactor = 1,
): boolean {
  const pp = getPlanetPositions(jd, place, divisionalChartFactor);
  const chart = planetPositionsToChart(pp);
  const pToH = getPlanetToHouseDict(chart);

  const ascHouse = pToH[ASCENDANT_SYMBOL] ?? 0;
  const h2 = (ascHouse + HOUSE_2) % 12;
  const l2 = getHouseOwnerFromChart(chart, h2);
  const l2House = pToH[l2] ?? 0;

  // Get Vaisheshikamsa Scores for Dasavarga
  const vScores = vaiseshikamsaDhasavargaOfPlanets(jd, place);

  // L2 must be in kendra (quadrants of lagna)
  if (!getQuadrantsOfRaasi(ascHouse).includes(l2House)) {
    return false;
  }

  // L2 must be at deep exaltation (paramochha)
  // Deep exaltation: planet's absolute longitude is within tolerance of its deep exaltation degree
  const DEEP_EXALTATION_TOLERANCE = 1.0; // 1 degree, matching Python
  if (l2 <= 6) {
    // Only Sun through Saturn have exaltation longitudes
    const ppEntry = pp.find(p => p.planet === l2);
    if (ppEntry) {
      const absLongitude = ppEntry.rasi * 30 + ppEntry.longitude;
      const deepExLon = PLANET_DEEP_EXALTATION_LONGITUDES[l2];
      if (Math.abs(absLongitude - deepExLon) > DEEP_EXALTATION_TOLERANCE) {
        return false;
      }
    } else {
      return false;
    }
  } else {
    // Rahu/Ketu: check using house strength matrix
    if (HOUSE_STRENGTHS_OF_PLANETS[l2][l2House] < STRENGTH_EXALTED) {
      return false;
    }
  }

  // Check Dasavarga Vaisheshikamsa requirements
  // Paaraavataamsa = score >= 6, Simhaasanaamsa = score >= 5
  const l2Score = vScores[l2]?.score ?? 0;
  const jupScore = vScores[JUPITER]?.score ?? 0;
  const venScore = vScores[VENUS]?.score ?? 0;

  const hasParvatamsa = l2Score >= 6;
  const hasSimhasanamsa = jupScore >= 5 || venScore >= 5;

  return hasParvatamsa && hasSimhasanamsa;
}
