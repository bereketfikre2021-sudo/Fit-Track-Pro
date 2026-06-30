/**
 * Built-in workout plan presets.
 * Each preset defines exercises (added to the library) and a schedule.
 * Shape matches the applyExerciseImport payload format.
 */

import { resolveEffectiveFitnessLevel } from './profileUtils'

export const PRESET_TEMPLATES = [
  {
    id: 'push-pull-legs',
    name: 'Push / Pull / Legs',
    description: 'Classic 3-day split targeting pushing muscles, pulling muscles, and legs separately.',
    tags: ['Intermediate', '3 days'],
    goal: 'muscle',
    days: ['Push', 'Pull', 'Legs'],
    payload: {
      version: 2,
      exercises: [
        // Push
        { name: 'Barbell Bench Press', exercisePhase: 'main', sets: '4', reps: '8', restTime: '90', equipment: 'Barbell', muscleGroups: ['Chest', 'Triceps', 'Shoulders'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Incline Dumbbell Press', exercisePhase: 'main', sets: '3', reps: '10', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Chest', 'Shoulders'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Overhead Press', exercisePhase: 'main', sets: '3', reps: '8', restTime: '90', equipment: 'Barbell', muscleGroups: ['Shoulders', 'Triceps'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Lateral Raises', exercisePhase: 'main', sets: '3', reps: '15', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Shoulders'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Tricep Pushdown', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Cable', muscleGroups: ['Triceps'], category: 'Strength', difficulty: 'Beginner' },
        // Pull
        { name: 'Pull-Up', exercisePhase: 'main', sets: '4', reps: '8', restTime: '90', equipment: 'Bodyweight', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Barbell Row', exercisePhase: 'main', sets: '4', reps: '8', restTime: '90', equipment: 'Barbell', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Seated Cable Row', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Cable', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Face Pull', exercisePhase: 'main', sets: '3', reps: '15', restTime: '45', equipment: 'Cable', muscleGroups: ['Shoulders', 'Back'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Barbell Curl', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Barbell', muscleGroups: ['Biceps'], category: 'Strength', difficulty: 'Beginner' },
        // Legs
        { name: 'Barbell Squat', exercisePhase: 'main', sets: '4', reps: '8', restTime: '120', equipment: 'Barbell', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Romanian Deadlift', exercisePhase: 'main', sets: '3', reps: '10', restTime: '90', equipment: 'Barbell', muscleGroups: ['Hamstrings', 'Glutes'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Leg Press', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Machine', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Leg Curl', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Machine', muscleGroups: ['Hamstrings'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Calf Raise', exercisePhase: 'main', sets: '4', reps: '15', restTime: '45', equipment: 'Machine', muscleGroups: ['Calves'], category: 'Strength', difficulty: 'Beginner' },
      ],
    },
    // schedule is built dynamically per day selection
    scheduleMap: {
      push: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Overhead Press', 'Lateral Raises', 'Tricep Pushdown'],
      pull: ['Pull-Up', 'Barbell Row', 'Seated Cable Row', 'Face Pull', 'Barbell Curl'],
      legs: ['Barbell Squat', 'Romanian Deadlift', 'Leg Press', 'Leg Curl', 'Calf Raise'],
    },
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    description: '4-day split alternating upper and lower body sessions for balanced development.',
    tags: ['Intermediate', '4 days'],
    goal: 'strength',
    days: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
    payload: {
      version: 2,
      exercises: [
        // Upper
        { name: 'Bench Press', exercisePhase: 'main', sets: '4', reps: '8', restTime: '90', equipment: 'Barbell', muscleGroups: ['Chest', 'Triceps'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Pendlay Row', exercisePhase: 'main', sets: '4', reps: '8', restTime: '90', equipment: 'Barbell', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Dumbbell Shoulder Press', exercisePhase: 'main', sets: '3', reps: '10', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Shoulders'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Lat Pulldown', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Cable', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Cable Fly', exercisePhase: 'main', sets: '3', reps: '15', restTime: '45', equipment: 'Cable', muscleGroups: ['Chest'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Hammer Curl', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Skull Crusher', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Barbell', muscleGroups: ['Triceps'], category: 'Strength', difficulty: 'Beginner' },
        // Lower
        { name: 'Squat', exercisePhase: 'main', sets: '4', reps: '8', restTime: '120', equipment: 'Barbell', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Deadlift', exercisePhase: 'main', sets: '3', reps: '6', restTime: '120', equipment: 'Barbell', muscleGroups: ['Hamstrings', 'Back', 'Glutes'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Bulgarian Split Squat', exercisePhase: 'main', sets: '3', reps: '10', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Nordic Curl', exercisePhase: 'main', sets: '3', reps: '8', restTime: '60', equipment: 'Bodyweight', muscleGroups: ['Hamstrings'], category: 'Strength', difficulty: 'Advanced' },
        { name: 'Hip Thrust', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Barbell', muscleGroups: ['Glutes'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Standing Calf Raise', exercisePhase: 'main', sets: '4', reps: '15', restTime: '45', equipment: 'Machine', muscleGroups: ['Calves'], category: 'Strength', difficulty: 'Beginner' },
      ],
    },
    scheduleMap: {
      upperA: ['Bench Press', 'Pendlay Row', 'Dumbbell Shoulder Press', 'Lat Pulldown', 'Hammer Curl', 'Skull Crusher'],
      lowerA: ['Squat', 'Romanian Deadlift', 'Bulgarian Split Squat', 'Hip Thrust', 'Standing Calf Raise'],
      upperB: ['Bench Press', 'Pendlay Row', 'Dumbbell Shoulder Press', 'Cable Fly', 'Lat Pulldown', 'Hammer Curl'],
      lowerB: ['Deadlift', 'Bulgarian Split Squat', 'Nordic Curl', 'Hip Thrust', 'Standing Calf Raise'],
    },
  },
  {
    id: 'full-body',
    name: 'Full Body',
    description: '3-day full body program hitting all major muscle groups every session. Great for beginners.',
    tags: ['Beginner', '3 days'],
    goal: 'strength',
    days: ['Day A', 'Day B', 'Day C'],
    payload: {
      version: 2,
      exercises: [
        { name: 'Goblet Squat', exercisePhase: 'main', sets: '3', reps: '10', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Dumbbell Row', exercisePhase: 'main', sets: '3', reps: '10', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Push-Up', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Bodyweight', muscleGroups: ['Chest', 'Triceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Dumbbell Lunge', exercisePhase: 'main', sets: '3', reps: '10', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Dumbbell Deadlift', exercisePhase: 'main', sets: '3', reps: '10', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Hamstrings', 'Back'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Arnold Press', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Shoulders'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Plank', exercisePhase: 'main', sets: '3', reps: '1', restTime: '45', isTimeBased: true, duration: '30', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Core'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Dumbbell Bicep Curl', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Tricep Dip', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Bodyweight', muscleGroups: ['Triceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Glute Bridge', exercisePhase: 'main', sets: '3', reps: '15', restTime: '45', equipment: 'Bodyweight', muscleGroups: ['Glutes'], category: 'Strength', difficulty: 'Beginner' },
      ],
    },
    scheduleMap: {
      dayA: ['Goblet Squat', 'Dumbbell Row', 'Push-Up', 'Dumbbell Bicep Curl', 'Tricep Dip', 'Plank'],
      dayB: ['Dumbbell Deadlift', 'Arnold Press', 'Dumbbell Lunge', 'Dumbbell Row', 'Glute Bridge', 'Plank'],
      dayC: ['Goblet Squat', 'Push-Up', 'Dumbbell Lunge', 'Arnold Press', 'Dumbbell Bicep Curl', 'Plank'],
    },
  },
  {
    id: 'bro-split',
    name: 'Bro Split',
    description: '5-day split dedicating each day to one muscle group. Classic bodybuilding style.',
    tags: ['Intermediate', '5 days'],
    goal: 'muscle',
    days: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
    payload: {
      version: 2,
      exercises: [
        // Chest
        { name: 'Flat Barbell Bench Press', exercisePhase: 'main', sets: '4', reps: '8', restTime: '90', equipment: 'Barbell', muscleGroups: ['Chest'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Incline Barbell Press', exercisePhase: 'main', sets: '4', reps: '10', restTime: '90', equipment: 'Barbell', muscleGroups: ['Chest'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Dumbbell Fly', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Chest'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Cable Crossover', exercisePhase: 'main', sets: '3', reps: '15', restTime: '45', equipment: 'Cable', muscleGroups: ['Chest'], category: 'Strength', difficulty: 'Beginner' },
        // Back
        { name: 'Deadlift', exercisePhase: 'main', sets: '4', reps: '6', restTime: '120', equipment: 'Barbell', muscleGroups: ['Back', 'Hamstrings'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Wide-Grip Pull-Up', exercisePhase: 'main', sets: '4', reps: '8', restTime: '90', equipment: 'Bodyweight', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'T-Bar Row', exercisePhase: 'main', sets: '3', reps: '10', restTime: '90', equipment: 'Barbell', muscleGroups: ['Back'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Straight-Arm Pulldown', exercisePhase: 'main', sets: '3', reps: '15', restTime: '45', equipment: 'Cable', muscleGroups: ['Back'], category: 'Strength', difficulty: 'Beginner' },
        // Shoulders
        { name: 'Seated Barbell Press', exercisePhase: 'main', sets: '4', reps: '8', restTime: '90', equipment: 'Barbell', muscleGroups: ['Shoulders'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Dumbbell Lateral Raise', exercisePhase: 'main', sets: '4', reps: '15', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Shoulders'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Rear Delt Fly', exercisePhase: 'main', sets: '3', reps: '15', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Shoulders', 'Back'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Upright Row', exercisePhase: 'main', sets: '3', reps: '12', restTime: '60', equipment: 'Barbell', muscleGroups: ['Shoulders', 'Traps'], category: 'Strength', difficulty: 'Intermediate' },
        // Arms
        { name: 'EZ Bar Curl', exercisePhase: 'main', sets: '4', reps: '10', restTime: '60', equipment: 'Barbell', muscleGroups: ['Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Incline Dumbbell Curl', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Close-Grip Bench Press', exercisePhase: 'main', sets: '4', reps: '10', restTime: '60', equipment: 'Barbell', muscleGroups: ['Triceps'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Overhead Tricep Extension', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Triceps'], category: 'Strength', difficulty: 'Beginner' },
        // Legs
        { name: 'Back Squat', exercisePhase: 'main', sets: '4', reps: '8', restTime: '120', equipment: 'Barbell', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Hack Squat', exercisePhase: 'main', sets: '3', reps: '12', restTime: '90', equipment: 'Machine', muscleGroups: ['Quads'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Leg Extension', exercisePhase: 'main', sets: '3', reps: '15', restTime: '45', equipment: 'Machine', muscleGroups: ['Quads'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Lying Leg Curl', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Machine', muscleGroups: ['Hamstrings'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Seated Calf Raise', exercisePhase: 'main', sets: '4', reps: '15', restTime: '45', equipment: 'Machine', muscleGroups: ['Calves'], category: 'Strength', difficulty: 'Beginner' },
      ],
    },
    scheduleMap: {
      chest: ['Flat Barbell Bench Press', 'Incline Barbell Press', 'Dumbbell Fly', 'Cable Crossover'],
      back: ['Deadlift', 'Wide-Grip Pull-Up', 'T-Bar Row', 'Straight-Arm Pulldown'],
      shoulders: ['Seated Barbell Press', 'Dumbbell Lateral Raise', 'Rear Delt Fly', 'Upright Row'],
      arms: ['EZ Bar Curl', 'Incline Dumbbell Curl', 'Close-Grip Bench Press', 'Overhead Tricep Extension'],
      legs: ['Back Squat', 'Hack Squat', 'Leg Extension', 'Lying Leg Curl', 'Seated Calf Raise'],
    },
  },

  // ─── Weight-loss focused templates ───────────────────────────────────────
  {
    id: 'fat-burn-circuit',
    name: 'Fat Burn Circuit',
    description: '3-day full-body circuit with high reps, short rest, and cardio bursts. Designed to maximise calorie burn for beginners targeting weight loss.',
    tags: ['Beginner', '3 days', 'Weight Loss'],
    goal: 'fat',
    days: ['Circuit A', 'Circuit B', 'Circuit C'],
    payload: {
      version: 2,
      exercises: [
        // Warmup
        { name: 'Jumping Jacks', exercisePhase: 'warmup', sets: '2', reps: '1', restTime: '15', isTimeBased: true, duration: '45', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Full Body'], category: 'Cardio', difficulty: 'Beginner' },
        { name: 'High Knees', exercisePhase: 'warmup', sets: '2', reps: '1', restTime: '15', isTimeBased: true, duration: '30', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Core', 'Quads'], category: 'Cardio', difficulty: 'Beginner' },
        // Main
        { name: 'Bodyweight Squat', exercisePhase: 'main', sets: '3', reps: '20', restTime: '30', equipment: 'Bodyweight', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Push-Up', exercisePhase: 'main', sets: '3', reps: '15', restTime: '30', equipment: 'Bodyweight', muscleGroups: ['Chest', 'Triceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Reverse Lunge', exercisePhase: 'main', sets: '3', reps: '12', restTime: '30', equipment: 'Bodyweight', muscleGroups: ['Quads', 'Glutes', 'Hamstrings'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Dumbbell Row', exercisePhase: 'main', sets: '3', reps: '15', restTime: '30', equipment: 'Dumbbell', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Mountain Climbers', exercisePhase: 'main', sets: '3', reps: '1', restTime: '30', isTimeBased: true, duration: '30', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Core', 'Shoulders'], category: 'Cardio', difficulty: 'Beginner' },
        { name: 'Glute Bridge', exercisePhase: 'main', sets: '3', reps: '20', restTime: '30', equipment: 'Bodyweight', muscleGroups: ['Glutes', 'Hamstrings'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Dumbbell Shoulder Press', exercisePhase: 'main', sets: '3', reps: '15', restTime: '30', equipment: 'Dumbbell', muscleGroups: ['Shoulders'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Plank', exercisePhase: 'main', sets: '3', reps: '1', restTime: '30', isTimeBased: true, duration: '30', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Core'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Burpee', exercisePhase: 'main', sets: '3', reps: '10', restTime: '45', equipment: 'Bodyweight', muscleGroups: ['Full Body'], category: 'Cardio', difficulty: 'Beginner' },
        // Cooldown
        { name: 'Standing Quad Stretch', exercisePhase: 'cooldown', sets: '1', reps: '1', restTime: '0', isTimeBased: true, duration: '30', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Quads'], category: 'Flexibility', difficulty: 'Beginner' },
        { name: 'Hip Flexor Stretch', exercisePhase: 'cooldown', sets: '1', reps: '1', restTime: '0', isTimeBased: true, duration: '30', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Hip Flexors'], category: 'Flexibility', difficulty: 'Beginner' },
      ],
    },
    scheduleMap: {
      circuitA: ['Jumping Jacks', 'High Knees', 'Bodyweight Squat', 'Push-Up', 'Mountain Climbers', 'Plank', 'Standing Quad Stretch'],
      circuitB: ['Jumping Jacks', 'High Knees', 'Reverse Lunge', 'Dumbbell Row', 'Glute Bridge', 'Burpee', 'Hip Flexor Stretch'],
      circuitC: ['Jumping Jacks', 'High Knees', 'Bodyweight Squat', 'Dumbbell Shoulder Press', 'Mountain Climbers', 'Plank', 'Burpee'],
    },
  },
  {
    id: 'metabolic-conditioning',
    name: 'Metabolic Conditioning',
    description: '4-day program combining compound strength moves with cardio finishers. Builds lean muscle while burning fat for intermediate trainees.',
    tags: ['Intermediate', '4 days', 'Weight Loss'],
    goal: 'fat',
    days: ['Lower Power', 'Upper Power', 'Lower Cardio', 'Upper Cardio'],
    payload: {
      version: 2,
      exercises: [
        // Warmup
        { name: 'Jump Rope', exercisePhase: 'warmup', sets: '2', reps: '1', restTime: '20', isTimeBased: true, duration: '60', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Full Body'], category: 'Cardio', difficulty: 'Beginner' },
        // Lower Power
        { name: 'Goblet Squat', exercisePhase: 'main', sets: '4', reps: '15', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Romanian Deadlift', exercisePhase: 'main', sets: '4', reps: '12', restTime: '60', equipment: 'Dumbbell', muscleGroups: ['Hamstrings', 'Glutes'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Walking Lunge', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Box Jump', exercisePhase: 'main', sets: '3', reps: '10', restTime: '60', equipment: 'Bodyweight', muscleGroups: ['Quads', 'Glutes', 'Calves'], category: 'Cardio', difficulty: 'Intermediate' },
        { name: 'Step-Up', exercisePhase: 'main', sets: '3', reps: '12', restTime: '45', equipment: 'Bodyweight', muscleGroups: ['Quads', 'Glutes'], category: 'Strength', difficulty: 'Beginner' },
        // Upper Power
        { name: 'Dumbbell Bench Press', exercisePhase: 'main', sets: '4', reps: '12', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Chest', 'Triceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Dumbbell Row', exercisePhase: 'main', sets: '4', reps: '12', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Back', 'Biceps'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Dumbbell Lateral Raise', exercisePhase: 'main', sets: '3', reps: '15', restTime: '30', equipment: 'Dumbbell', muscleGroups: ['Shoulders'], category: 'Strength', difficulty: 'Beginner' },
        { name: 'Renegade Row', exercisePhase: 'main', sets: '3', reps: '10', restTime: '45', equipment: 'Dumbbell', muscleGroups: ['Back', 'Core', 'Shoulders'], category: 'Strength', difficulty: 'Intermediate' },
        { name: 'Push-Up to T-Rotation', exercisePhase: 'main', sets: '3', reps: '10', restTime: '45', equipment: 'Bodyweight', muscleGroups: ['Chest', 'Core', 'Shoulders'], category: 'Strength', difficulty: 'Intermediate' },
        // Cardio finishers
        { name: 'Kettlebell Swing', exercisePhase: 'main', sets: '4', reps: '20', restTime: '30', equipment: 'Dumbbell', muscleGroups: ['Glutes', 'Hamstrings', 'Core'], category: 'Cardio', difficulty: 'Intermediate' },
        { name: 'Battle Rope Waves', exercisePhase: 'main', sets: '3', reps: '1', restTime: '30', isTimeBased: true, duration: '30', durationUnit: 'seconds', equipment: 'Other', muscleGroups: ['Shoulders', 'Core'], category: 'Cardio', difficulty: 'Intermediate' },
        { name: 'Sled Push', exercisePhase: 'main', sets: '4', reps: '1', restTime: '60', isTimeBased: true, duration: '20', durationUnit: 'seconds', equipment: 'Other', muscleGroups: ['Full Body'], category: 'Cardio', difficulty: 'Intermediate' },
        { name: 'Jump Squat', exercisePhase: 'main', sets: '3', reps: '15', restTime: '30', equipment: 'Bodyweight', muscleGroups: ['Quads', 'Glutes'], category: 'Cardio', difficulty: 'Beginner' },
        // Cooldown
        { name: 'Child\'s Pose', exercisePhase: 'cooldown', sets: '1', reps: '1', restTime: '0', isTimeBased: true, duration: '45', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Back', 'Hips'], category: 'Flexibility', difficulty: 'Beginner' },
        { name: 'Pigeon Pose', exercisePhase: 'cooldown', sets: '1', reps: '1', restTime: '0', isTimeBased: true, duration: '45', durationUnit: 'seconds', equipment: 'Bodyweight', muscleGroups: ['Hip Flexors', 'Glutes'], category: 'Flexibility', difficulty: 'Beginner' },
      ],
    },
    scheduleMap: {
      lowerPower: ['Jump Rope', 'Goblet Squat', 'Romanian Deadlift', 'Walking Lunge', 'Step-Up', 'Child\'s Pose'],
      upperPower: ['Jump Rope', 'Dumbbell Bench Press', 'Dumbbell Row', 'Renegade Row', 'Dumbbell Lateral Raise', 'Child\'s Pose'],
      lowerCardio: ['Jump Rope', 'Goblet Squat', 'Box Jump', 'Walking Lunge', 'Kettlebell Swing', 'Jump Squat', 'Pigeon Pose'],
      upperCardio: ['Jump Rope', 'Push-Up to T-Rotation', 'Dumbbell Row', 'Battle Rope Waves', 'Sled Push', 'Child\'s Pose'],
    },
  },
]

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function getPresetTemplateById(id) {
  return PRESET_TEMPLATES.find((p) => p.id === id) ?? null
}

/** Pick a default workout preset based on goal and fitness level. */
export function getRecommendedWorkoutTemplateId(profile = {}) {
  const goal = profile.goal || 'strength'
  const level = resolveEffectiveFitnessLevel(profile)
  if (goal === 'fat' || goal === 'endurance') {
    return level === 'beginner' ? 'fat-burn-circuit' : 'metabolic-conditioning'
  }
  if (level === 'beginner') return 'full-body'
  if (goal === 'muscle') return 'push-pull-legs'
  if (goal === 'strength') return 'upper-lower'
  return 'full-body'
}

export function defaultPresetDayMapping(preset, workoutDays = []) {
  const days = workoutDays.length > 0 ? workoutDays : DAYS_OF_WEEK
  const splitKeys = Object.keys(preset.scheduleMap)
  const mapping = {}
  splitKeys.forEach((key, i) => {
    mapping[key] = days[i % days.length]
  })
  return mapping
}

/** Build an exercise-import payload with schedule mapped to weekdays. */
export function buildPresetExercisePayload(preset, mapping) {
  const splitKeys = Object.keys(preset.scheduleMap)
  const schedule = {}

  splitKeys.forEach((key) => {
    const targetDay = mapping[key]
    if (!targetDay) return
    const exercises = preset.scheduleMap[key].map((name) => ({ name }))
    if (!schedule[targetDay]) {
      schedule[targetDay] = {
        note: `${preset.name} — ${key.replace(/([A-Z])/g, ' $1').trim()}`,
        exercises,
      }
    } else {
      schedule[targetDay].exercises.push(...exercises)
    }
  })

  return { ...preset.payload, schedule }
}
