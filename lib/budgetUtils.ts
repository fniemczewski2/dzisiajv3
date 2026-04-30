import { BudgetCategory } from "../types";

export const calculateExpectedYearlyLimit = (
  category: BudgetCategory,
  currentMonthIndex: number,
  viewingYear: number 
): number => {
  const limits = category.monthly_amounts;
  if (!Array.isArray(limits) || limits.length !== 12) return 0;

  if (!category.is_monthly) {
    return limits[0] || 0;
  }

  const currentRealYear = new Date().getFullYear();
  if (viewingYear < currentRealYear) {
    return limits.reduce((sum, val) => sum + (val || 0), 0);
  }
  if (viewingYear > currentRealYear) {
      return limits.reduce((sum, val) => sum + (val || 0), 0);
  }
  const passedMonthsCount = currentMonthIndex + 1;
  const remainingMonthsCount = 12 - passedMonthsCount;

  let sumPassed = 0;
  for (let i = 0; i < passedMonthsCount; i++) {
    sumPassed += (limits[i] || 0);
  }

  const averagePassed = sumPassed / passedMonthsCount;
  const expectedRemaining = averagePassed * remainingMonthsCount;

  return sumPassed + expectedRemaining;
};

export const propagateMonthlyLimits = (
  currentLimits: number[], 
  targetMonthIndex: number, 
  newAmount: number,
  isMonthly: boolean
): number[] => {
  const updatedLimits = Array.isArray(currentLimits) && currentLimits.length === 12 
    ? [...currentLimits] 
    : new Array(12).fill(0);

  if (!isMonthly) {
    updatedLimits[0] = newAmount;
    for (let i = 1; i < 12; i++) {
      updatedLimits[i] = 0;
    }
    return updatedLimits;
  }

  for (let i = targetMonthIndex; i < 12; i++) {
    updatedLimits[i] = newAmount;
  }

  return updatedLimits;
};
