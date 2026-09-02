import type { ResourcePool, WeatherType } from '../types.js';

export interface BalanceConfig {
  readonly startingResources: ResourcePool;
  readonly maxMedicine: number;
  readonly player: {
    readonly maxHp: number;
    readonly maxEnergy: number;
    readonly startingHunger: number;
    readonly startingThirst: number;
    readonly downMaxDays: number;
    readonly healthyMinHp: number;
    readonly injuryHpThreshold: number;
    readonly downHpThreshold: number;
  };
  readonly dailyConsumption: {
    readonly foodPerPlayer: number;
    readonly waterPerPlayer: number;
    readonly hunterFoodMultiplier: number;
    readonly emergencyMultiplier: number;
    readonly hungerGainUnfed: number;
    readonly thirstGainUnhydrated: number;
    readonly hungerReliefFed: number;
    readonly thirstReliefHydrated: number;
  };
  readonly timeline: {
    readonly rescueDay: number;
    readonly emergencyMaxDay: number;
    readonly normalRescueSignal: number;
    readonly earlyRescueSignal: number;
  };
  readonly weatherWeights: Record<WeatherType, number>;
  readonly actions: {
    readonly hunt: {
      readonly energyCost: number;
      readonly minFood: number;
      readonly maxFood: number;
      readonly hunterMultiplier: number;
      readonly rainMultiplier: number;
      readonly injuryChance: number;
    };
    readonly findWater: {
      readonly energyCost: number;
      readonly minWater: number;
      readonly maxWater: number;
      readonly rainBonusWater: number;
    };
    readonly gatherWood: {
      readonly energyCost: number;
      readonly minWood: number;
      readonly maxWood: number;
      readonly rainWoodPenalty: number;
      readonly builderBonusWood: number;
    };
    readonly explore: {
      readonly energyCost: number;
      readonly medicineChance: number;
      readonly scoutMedicineMultiplier: number;
      readonly scoutInjuryReduction: number;
      readonly stormInjuryMultiplier: number;
      readonly hazardChance: number;
    };
    readonly rest: {
      readonly energyRecovery: number;
      readonly hpRecovery: number;
    };
    readonly heal: {
      readonly energyCost: number;
      readonly medicineCost: number;
      readonly hpRestored: number;
      readonly medicHpBonus: number;
      readonly downRecoveryHp: number;
    };
    readonly buildSignal: {
      readonly energyCost: number;
      readonly woodCost: number;
      readonly builderWoodCost: number;
      readonly singleSignalGain: number;
      readonly maxDailySignalGain: number;
    };
  };
  readonly medicTeamInjuryReduction: number;
  readonly needsDamage: {
    readonly hungerHpDamage: number;
    readonly thirstHpDamage: number;
    readonly hungerThreshold: number;
    readonly thirstThreshold: number;
  };
  readonly ghost: {
    readonly maxInterventionsPerDay: number;
  };
}

export const DEFAULT_BALANCE_CONFIG: BalanceConfig = {
  startingResources: {
    food: 20,
    water: 20,
    wood: 10,
    medicine: 2,
  },
  maxMedicine: 3,
  player: {
    maxHp: 100,
    maxEnergy: 100,
    startingHunger: 20,
    startingThirst: 20,
    downMaxDays: 2,
    healthyMinHp: 61,
    injuryHpThreshold: 60,
    downHpThreshold: 20,
  },
  dailyConsumption: {
    foodPerPlayer: 3,
    waterPerPlayer: 3,
    hunterFoodMultiplier: 1.25,
    emergencyMultiplier: 1.5,
    hungerGainUnfed: 25,
    thirstGainUnhydrated: 25,
    hungerReliefFed: 30,
    thirstReliefHydrated: 30,
  },
  timeline: {
    rescueDay: 20,
    emergencyMaxDay: 23,
    normalRescueSignal: 80,
    earlyRescueSignal: 100,
  },
  weatherWeights: {
    Clear: 50,
    Rain: 35,
    Storm: 15,
  },
  actions: {
    hunt: {
      energyCost: 25,
      minFood: 4,
      maxFood: 8,
      hunterMultiplier: 1.4,
      rainMultiplier: 0.7,
      injuryChance: 0.15,
    },
    findWater: {
      energyCost: 20,
      minWater: 6,
      maxWater: 10,
      rainBonusWater: 2,
    },
    gatherWood: {
      energyCost: 20,
      minWood: 3,
      maxWood: 5,
      rainWoodPenalty: 2,
      builderBonusWood: 2,
    },
    explore: {
      energyCost: 30,
      medicineChance: 0.25,
      scoutMedicineMultiplier: 1.2,
      scoutInjuryReduction: 0.5,
      stormInjuryMultiplier: 2.0,
      hazardChance: 0.20,
    },
    rest: {
      energyRecovery: 40,
      hpRecovery: 10,
    },
    heal: {
      energyCost: 20,
      medicineCost: 1,
      hpRestored: 40,
      medicHpBonus: 20,
      downRecoveryHp: 30,
    },
    buildSignal: {
      energyCost: 30,
      woodCost: 5,
      builderWoodCost: 4,
      singleSignalGain: 8,
      maxDailySignalGain: 12,
    },
  },
  medicTeamInjuryReduction: 0.85,
  needsDamage: {
    hungerHpDamage: 5,
    thirstHpDamage: 8,
    hungerThreshold: 80,
    thirstThreshold: 80,
  },
  ghost: {
    maxInterventionsPerDay: 1,
  },
};
