export type ParameterUnit = 'count' | 'kg/m3' | 'mm' | 'ratio' | 'seed'

interface ParameterDefinitionBase {
  readonly group: string
  readonly label: string
}

export interface NumericParameterDefinition
  extends ParameterDefinitionBase {
  readonly kind: 'number'
  readonly minimum: number
  readonly maximum: number
  readonly integer?: boolean
  readonly unit: ParameterUnit
}

export interface ChoiceParameterDefinition<Option extends string>
  extends ParameterDefinitionBase {
  readonly kind: 'choice'
  readonly options: readonly Option[]
}

export interface CollectionParameterDefinition
  extends ParameterDefinitionBase {
  readonly kind: 'collection'
  readonly itemIdentity: string
}

export type ParameterDefinition<Value> =
  [Value] extends [number]
    ? NumericParameterDefinition
    : [Value] extends [string]
      ? ChoiceParameterDefinition<Extract<Value, string>>
      : [Value] extends [readonly unknown[]]
        ? CollectionParameterDefinition
        : never

/** Every persisted recipe key must have one shared semantic definition. */
export type RecipeParameterSchema<Parameters extends object> = {
  readonly [Key in keyof Parameters]-?: ParameterDefinition<Parameters[Key]>
}
