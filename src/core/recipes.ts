import { DEFAULT_PILOTI_PARAMETERS, generatePiloti } from './generator'
import {
  normalizePilotiParameters,
  PILOTI_PARAMETER_SCHEMA,
} from './pilotiParameters'
import type { RecipeParameterSchema } from './parameterSchema'
import type { MassStudy, PilotiParameters, RecipeId } from './types'

interface RecipeDefinitionBase<Id extends RecipeId> {
  readonly id: Id
  readonly name: string
  readonly description: string
}

export interface ExecutableRecipeDefinition<
  Id extends RecipeId,
  Parameters extends object,
> extends RecipeDefinitionBase<Id> {
  readonly status: 'active'
  readonly parameterSchema: RecipeParameterSchema<Parameters>
  readonly defaultParameters: Readonly<Parameters>
  readonly normalizeParameters: (parameters: Parameters) => Parameters
  readonly generate: (parameters: Parameters) => MassStudy
}

export interface PlannedRecipeDefinition<Id extends RecipeId>
  extends RecipeDefinitionBase<Id> {
  readonly status: 'planned'
  readonly unavailableReason: string
}

export const PILOTI_RECIPE: ExecutableRecipeDefinition<
  'piloti',
  PilotiParameters
> = {
  id: 'piloti',
  name: 'Piloti',
  description: 'A heavy upper mass carried by faceted funnel supports.',
  status: 'active',
  parameterSchema: PILOTI_PARAMETER_SCHEMA,
  defaultParameters: DEFAULT_PILOTI_PARAMETERS,
  normalizeParameters: normalizePilotiParameters,
  generate: generatePiloti,
}

const PLANNED_REASON = 'This recipe generator is not implemented yet.'

export const RECIPE_DEFINITIONS = [
  {
    id: 'monolith',
    name: 'Monolith',
    description: 'One dominant mass cut by planes and deep voids.',
    status: 'planned',
    unavailableReason: PLANNED_REASON,
  },
  PILOTI_RECIPE,
  {
    id: 'silos',
    name: 'Silos',
    description: 'Clusters of monumental faceted storage towers.',
    status: 'planned',
    unavailableReason: PLANNED_REASON,
  },
  {
    id: 'ziggurat',
    name: 'Ziggurat',
    description: 'Stepped masses that shift, taper and turn.',
    status: 'planned',
    unavailableReason: PLANNED_REASON,
  },
  {
    id: 'lamella-tower',
    name: 'Lamella tower',
    description: 'Slender vertical plates with deep articulation.',
    status: 'planned',
    unavailableReason: PLANNED_REASON,
  },
  {
    id: 'gate',
    name: 'Gate',
    description: 'Two uprights composed around one dominant void.',
    status: 'planned',
    unavailableReason: PLANNED_REASON,
  },
] as const satisfies readonly (
  | ExecutableRecipeDefinition<'piloti', PilotiParameters>
  | PlannedRecipeDefinition<Exclude<RecipeId, 'piloti'>>
)[]

export function recipeDefinition(
  recipeId: RecipeId,
): (typeof RECIPE_DEFINITIONS)[number] {
  const definition = RECIPE_DEFINITIONS.find((recipe) => recipe.id === recipeId)
  if (!definition) throw new RangeError(`Unknown recipe "${recipeId}".`)
  return definition
}
