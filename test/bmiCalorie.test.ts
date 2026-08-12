import { describe, it, expect } from 'vitest'
import {
  lbToKg,
  ftInToCm,
  calculateBmi,
  bmiCategory,
  calculateBmr,
  activityMultiplier,
  calculateTdee,
} from '@/utils/bmiCalorie'

describe('calculateBmi', () => {
  it('computes BMI from kg and cm', () => {
    expect(calculateBmi(70, 175)).toBeCloseTo(22.857, 3)
  })
})

describe('bmiCategory', () => {
  it('classifies underweight below 18.5', () => {
    expect(bmiCategory(18.49)).toBe('underweight')
  })

  it('classifies normal starting exactly at 18.5', () => {
    expect(bmiCategory(18.5)).toBe('normal')
  })

  it('classifies normal up to just below 25', () => {
    expect(bmiCategory(24.9)).toBe('normal')
  })

  it('classifies overweight starting exactly at 25', () => {
    expect(bmiCategory(25)).toBe('overweight')
  })

  it('classifies overweight up to just below 30', () => {
    expect(bmiCategory(29.9)).toBe('overweight')
  })

  it('classifies obese starting exactly at 30', () => {
    expect(bmiCategory(30)).toBe('obese')
  })

  it('classifies obese well above 30', () => {
    expect(bmiCategory(35)).toBe('obese')
  })
})

describe('calculateBmr', () => {
  it('computes BMR for a male reference case', () => {
    expect(calculateBmr(70, 175, 25, 'male')).toBeCloseTo(1673.75, 5)
  })

  it('computes BMR for a female reference case', () => {
    expect(calculateBmr(70, 175, 25, 'female')).toBeCloseTo(1507.75, 5)
  })
})

describe('activityMultiplier', () => {
  it('returns the correct multiplier per level', () => {
    expect(activityMultiplier('sedentary')).toBe(1.2)
    expect(activityMultiplier('light')).toBe(1.375)
    expect(activityMultiplier('moderate')).toBe(1.55)
    expect(activityMultiplier('active')).toBe(1.725)
    expect(activityMultiplier('very-active')).toBe(1.9)
  })
})

describe('calculateTdee', () => {
  const bmr = 1673.75

  it('scales BMR by the activity multiplier for each level', () => {
    expect(calculateTdee(bmr, 'sedentary')).toBeCloseTo(bmr * 1.2, 5)
    expect(calculateTdee(bmr, 'light')).toBeCloseTo(bmr * 1.375, 5)
    expect(calculateTdee(bmr, 'moderate')).toBeCloseTo(bmr * 1.55, 5)
    expect(calculateTdee(bmr, 'active')).toBeCloseTo(bmr * 1.725, 5)
    expect(calculateTdee(bmr, 'very-active')).toBeCloseTo(bmr * 1.9, 5)
  })
})

describe('lbToKg', () => {
  it('converts pounds to kilograms', () => {
    expect(lbToKg(154.324)).toBeCloseTo(70, 2)
  })

  it('round-trips with the inverse conversion', () => {
    const lb = 180
    const kg = lbToKg(lb)
    expect(kg / 0.45359237).toBeCloseTo(lb, 5)
  })
})

describe('ftInToCm', () => {
  it('converts feet and inches to centimeters', () => {
    expect(ftInToCm(5, 9)).toBeCloseTo(175.26, 2)
  })

  it('round-trips with the inverse conversion', () => {
    const totalIn = 5 * 12 + 9
    const cm = ftInToCm(5, 9)
    expect(cm / 2.54).toBeCloseTo(totalIn, 5)
  })
})
