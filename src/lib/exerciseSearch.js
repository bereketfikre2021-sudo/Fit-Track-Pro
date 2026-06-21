import { filterExercisesByPhase } from './exercisePhase'
import {
  collectFilterOptions,
  buildExerciseSearchHaystack,
  exerciseMatchesMuscle,
  exerciseMatchesSplit,
  exerciseMatchesGoal,
  normalizeEquipment,
  exerciseMatchesLocation,
  sortExercises,
} from './exerciseTaxonomy'

export function filterExerciseLibrary(
  exercises,
  {
    phase,
    searchQuery = '',
    categoryFilter = '',
    muscleFilter = '',
    splitFilter = '',
    goalFilter = '',
    equipmentFilter = '',
    difficultyFilter = '',
    locationFilter = '',
    sortBy = 'name',
  } = {}
) {
  let list = phase ? filterExercisesByPhase(exercises, phase) : [...(exercises || [])]

  const q = searchQuery.trim().toLowerCase()
  if (q) {
    list = list.filter((ex) => buildExerciseSearchHaystack(ex).includes(q))
  }

  if (categoryFilter) {
    list = list.filter((ex) => ex.category === categoryFilter)
  }

  if (muscleFilter) {
    list = list.filter((ex) => exerciseMatchesMuscle(ex, muscleFilter))
  }

  if (splitFilter) {
    list = list.filter((ex) => exerciseMatchesSplit(ex, splitFilter))
  }

  if (goalFilter) {
    list = list.filter((ex) => exerciseMatchesGoal(ex, goalFilter))
  }

  if (equipmentFilter) {
    list = list.filter((ex) => normalizeEquipment(ex.equipment) === equipmentFilter)
  }

  if (difficultyFilter) {
    list = list.filter((ex) => ex.difficulty === difficultyFilter)
  }

  if (locationFilter) {
    list = list.filter((ex) => exerciseMatchesLocation(ex, locationFilter))
  }

  return sortExercises(list, sortBy)
}

export function getLibraryFilterOptions(exercises, options = {}) {
  return collectFilterOptions(exercises, options)
}
