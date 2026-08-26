/**
 * BMI / calorie arithmetic — pure, dependency-free (unit-tested in `test/`).
 */

export type UnitSystem = 'metric' | 'imperial'
export type Sex = 'female' | 'male'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'
export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese'

const LB_TO_KG = 0.45359237
const FT_TO_CM = 30.48
const IN_TO_CM = 2.54

export function lbToKg(lb: number): number {
  return lb * LB_TO_KG
}

export function ftInToCm(ft: number, inches: number): number {
  return ft * FT_TO_CM + inches * IN_TO_CM
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return 'underweight'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'overweight'
  return 'obese'
}

export function calculateBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  'very-active': 1.9,
}

export function activityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_MULTIPLIERS[level]
}

export function calculateTdee(bmr: number, level: ActivityLevel): number {
  return bmr * activityMultiplier(level)
}
