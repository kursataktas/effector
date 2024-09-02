import {printArray} from '../runner/text'
import {
  computeFn,
  union,
  value,
  computeVariant,
  computeVariants,
  bool,
  separate,
  flag,
  config,
  sortOrder,
  fmt,
  permute,
  none,
  not,
  every,
  some,
  matchUnion,
} from '../runner/manifold/operators'
import {
  Separate,
  Fn,
  Flag,
  Bool,
  Value,
  DataDecl,
  Union,
  BoolDecl,
} from 'runner/manifold/types'

export default () => {
  const goodFn = flag({sort: [true, false], name: 'goodFn'})
  const assertFnArgs = flag({
    sort: [false, true],
  })
  const testCase = union({
    oneOf: ['clock', 'source', 'source and clock'],
    sort: ['clock', 'source', 'source and clock'],
  })
  const targetIsArray = flag()
  const isClockOnly = bool({
    source: {testCase},
    true: {testCase: 'clock'},
    sort: [true, false],
  })
  const sourceIsShape = flag({
    sort: [false, true],
  })
  const clockIsArray = flag()
  /**
   * ```ts
   * type Exact = {a: number; b: string}
   * type ExactBad = {a: string; b: string}
   * type Narrow = {a: number}
   * type ExactNullable = {a: number; b: string} | null
   * type ExactNarrow = {a: number; b: string} | {a: number}
   * type ExactBadNarrow = {a: string; b: string} | {a: number}
   * type ExactExactBad = {a: number; b: string} | {a: string; b: string}
   * ```
   */
  const fnReturnType = union({
    oneOf: [
      'exact',
      'exact bad',
      'narrow',
      'exact nullable',
      'exact / narrow',
      'exact bad / narrow',
      'exact / exact bad',
    ],
    sort: [
      'exact',
      'exact bad',
      'narrow',
      'exact nullable',
      'exact / narrow',
      'exact bad / narrow',
      'exact / exact bad',
    ],
  })

  const fnCode = separate({
    source: {goodFn, assertFnArgs, testCase, fnReturnType},
    variant: {
      goodFn: {
        badFn: {goodFn: false},
        goodFn: {goodFn: true},
      },
      assertArgs: {
        assertOne: [
          {assertFnArgs: true, testCase: 'clock'},
          {assertFnArgs: true, testCase: 'source'},
        ],
        assertTwo: {assertFnArgs: true, testCase: 'source and clock'},
        noAssert: {assertFnArgs: false},
      },
      testCases: {
        oneArg: [{testCase: 'source'}, {testCase: 'clock'}],
        twoArg: {testCase: 'source and clock'},
      },
      returnType: {
        exact: {fnReturnType: 'exact'},
        exactBad: {fnReturnType: 'exact bad'},
        narrow: {fnReturnType: 'narrow'},
        exactNullable: {fnReturnType: 'exact nullable'},
        exactNarrow: {fnReturnType: 'exact / narrow'},
        exactBadNarrow: {fnReturnType: 'exact bad / narrow'},
        exactExactBad: {fnReturnType: 'exact / exact bad'},
      },
    } as const,
    cases: {
      badFn: value('null'),
      goodFn: {
        assertOne: value('({c, d}: DataExact) => ({a: c, b: d})'),
        assertTwo: value('({c}: DataSrc, {d}: DataClk) => ({a: c, b: d})'),
        noAssert: {
          oneArg: {
            exact: value('({c, d}) => ({a: c, b: d})'),
            exactBad: value('({d}) => ({a: "no", b: d})'),
            narrow: value('({c}) => ({a: c})'),
            exactNullable: value('({c, d}): ExactNullable => null as any'),
            exactNarrow: value('({c, d}): ExactNarrow => null as any'),
            exactBadNarrow: value('({c, d}): ExactBadNarrow => null as any'),
            exactExactBad: value('({c, d}): ExactExactBad => null as any'),
          },
          twoArg: {
            exact: value('({c}, {d}) => ({a: c, b: d})'),
            exactBad: value('(_, {d}) => ({a: "no", b: d})'),
            narrow: value('({c}) => ({a: c})'),
            exactNullable: value('({c}, {d}): ExactNullable => null as any'),
            exactNarrow: value('({c}, {d}): ExactNarrow => null as any'),
            exactBadNarrow: value('({c}, {d}): ExactBadNarrow => null as any'),
            exactExactBad: value('({c}, {d}): ExactExactBad => null as any'),
          },
        },
      },
    },
  })

  type TargetCases =
    | 'exact'
    | 'exactBad'
    | 'narrow'
    | 'exactNullable'
    | 'exactNarrow'
    | 'exactBadNarrow'
    | 'exactExactBad'

  const [targetCode, targetCases] = unitArray<TargetCases>({
    isArray: targetIsArray,
    cases: [
      'exact',
      'exactBad',
      'narrow',
      'exactNullable',
      'exactNarrow',
      'exactBadNarrow',
      'exactExactBad',
    ],
  })
  const [clockOnlyCode, clockOnlyCases] = unitArray({
    isArray: clockIsArray,
    // isActive: isClockOnly,
    cases: [
      'clockExact',
      'clockExactBad',
      'clockNarrow',
      'clockExactNullable',
      'clockExactNarrow',
      'clockExactBadNarrow',
      'clockExactExactBad',
    ],
  })
  // const clockOnlyCode = union([
  //   'clockExact',
  //   'clockExactBad',
  //   'clockNarrow',
  //   'clockExactNullable',
  //   'clockExactNarrow',
  //   'clockExactBadNarrow',
  //   'clockExactExactBad',
  // ])
  const clockCode = separate({
    source: {testCase},
    variant: {
      choose: {
        clockOnly: {testCase: 'clock'},
        both: {testCase: 'source and clock'},
      },
    } as const,
    cases: {
      clockOnly: clockOnlyCode,
      both: value('dataClock'),
    },
  })
  const sourceCode = separate({
    source: {testCase, sourceIsShape},
    variant: {
      testCase: {
        sourceOnly: {testCase: 'source'},
        both: {testCase: 'source and clock'},
      },
      sourceIsShape: {
        shape: {sourceIsShape: true},
        unit: {sourceIsShape: false},
      },
    } as const,
    cases: {
      sourceOnly: {
        shape: value('{c: $c, d: $d}'),
        unit: value('$dataExact'),
      },
      both: {
        shape: value('{c: $c}'),
        unit: value('$dataSrc'),
      },
    },
  })
  const clockNarrowCases = every([
    isClockOnly,
    some([
      clockOnlyCases.hasClockExactBadNarrow,
      clockOnlyCases.hasClockExactNarrow,
      clockOnlyCases.hasClockNarrow,
    ]),
  ])
  const clockExactBadCases = every([
    isClockOnly,
    some([
      clockOnlyCases.hasClockExactBad,
      clockOnlyCases.hasClockExactBadNarrow,
      clockOnlyCases.hasClockExactExactBad,
    ]),
  ])
  const clockNullableCases = every([
    isClockOnly,
    clockOnlyCases.hasClockExactNullable,
  ])
  const clockNarrowCasesOnly = every([
    clockNarrowCases,
    none([
      clockOnlyCases.hasClockExact,
      clockOnlyCases.hasClockExactBad,
      clockOnlyCases.hasClockExactExactBad,
      clockOnlyCases.hasClockExactNullable,
    ]),
  ])
  const clockExactBadCasesOnly = every([
    clockExactBadCases,
    none([
      clockOnlyCases.hasClockExact,
      clockOnlyCases.hasClockExactNarrow,
      clockOnlyCases.hasClockExactNullable,
      clockOnlyCases.hasClockNarrow,
    ]),
  ])
  const clockNullableCasesOnly = every([
    clockNullableCases,
    none([
      clockOnlyCases.hasClockExact,
      clockOnlyCases.hasClockExactBad,
      clockOnlyCases.hasClockExactBadNarrow,
      clockOnlyCases.hasClockExactExactBad,
      clockOnlyCases.hasClockExactNarrow,
      clockOnlyCases.hasClockNarrow,
    ]),
  ])
  const targetNarrowCases = some([
    targetCases.hasExactBadNarrow,
    targetCases.hasExactNarrow,
    targetCases.hasNarrow,
  ])
  const targetExactBadCases = some([
    targetCases.hasExactBad,
    targetCases.hasExactBadNarrow,
    targetCases.hasExactExactBad,
  ])
  const targetNarrowCasesOnly = every([
    targetNarrowCases,
    none([
      targetCases.hasExact,
      targetCases.hasExactBad,
      targetCases.hasExactExactBad,
      targetCases.hasExactNullable,
    ]),
  ])
  const targetExactBadCasesOnly = every([
    targetExactBadCases,
    none([
      targetCases.hasExact,
      targetCases.hasExactNarrow,
      targetCases.hasExactNullable,
      targetCases.hasNarrow,
    ]),
  ])
  const targetNullableCasesOnly = every([
    targetCases.hasExactNullable,
    none([
      targetCases.hasExact,
      targetCases.hasExactBad,
      targetCases.hasExactBadNarrow,
      targetCases.hasExactExactBad,
      targetCases.hasExactNarrow,
      targetCases.hasNarrow,
    ]),
  ])
  const fnReturnNarrowCases = matchUnion(fnReturnType, [
    'narrow',
    'exact / narrow',
    'exact bad / narrow',
  ])
  const fnReturnExactBadCases = matchUnion(fnReturnType, [
    'exact / exact bad',
    'exact bad',
    'exact bad / narrow',
  ])
  const fnReturnNullableCases = matchUnion(fnReturnType, 'exact nullable')
  function whenTargetMatchFn({
    target,
    fnReturn,
  }: {
    target: BoolDecl[]
    fnReturn: Array<typeof fnReturnType extends Union<infer T> ? T : never>
  }) {
    return every([some(target), matchUnion(fnReturnType, fnReturn)])
  }
  sortOrder([testCase, fnReturnType, goodFn])
  config({
    header,
    file: 'generated/sampleFn',
    usedMethods: ['createStore', 'createEvent', 'sample'],
    skipCases: [
      every([sourceIsShape, some([isClockOnly, clockIsArray])]),
      every([clockNarrowCasesOnly, targetNarrowCasesOnly]),
      every([clockExactBadCasesOnly, targetExactBadCasesOnly]),
      every([clockNullableCasesOnly, targetNullableCasesOnly]),
      every([fnReturnNarrowCases, targetNarrowCasesOnly]),
      every([fnReturnExactBadCases, targetExactBadCasesOnly]),
      every([fnReturnNullableCases, targetNullableCasesOnly]),
      every([
        isClockOnly,
        not(assertFnArgs),
        some([not(clockOnlyCases.hasClockExact), clockIsArray]),
      ]),
      every([clockIsArray, not(matchUnion(fnReturnType, 'exact'))]),
      every([
        assertFnArgs,
        some([not(goodFn), targetIsArray, not(targetCases.hasExact)]),
      ]),
      every([
        not(goodFn),
        some([not(targetCases.hasExact), clockIsArray, targetIsArray]),
      ]),
    ],
    grouping: {
      pass: every([
        goodFn,
        some([matchUnion(fnReturnType, 'exact'), assertFnArgs]),
        some([
          targetCases.hasExact,
          targetCases.hasExactExactBad,
          targetCases.hasExactNullable,
          targetCases.hasExactNarrow,
        ]),
        not(
          every([
            matchUnion(fnReturnType, 'exact'),
            some([
              targetCases.hasExactBad,
              targetCases.hasExactBadNarrow,
              // targetCases.hasNarrow,
            ]),
          ]),
        ),
        not(
          every([
            isClockOnly,
            some([
              clockOnlyCases.hasClockNarrow,
              clockOnlyCases.hasClockExactBad,
              clockOnlyCases.hasClockExactBadNarrow,
              clockOnlyCases.hasClockExactExactBad,
              clockOnlyCases.hasClockExactNarrow,
              clockOnlyCases.hasClockExactNullable,
            ]),
          ]),
        ),
      ]),
      getHash: {goodFn, assertFnArgs, testCase, fnReturnType},
      describeGroup: computeFn({
        source: {testCase, fnReturnType, goodFn, assertFnArgs},
        fn({testCase, fnReturnType, goodFn, assertFnArgs}) {
          if (!goodFn) return {description: 'bad fn', largeGroup: 'bad fn'}
          if (assertFnArgs)
            return {description: 'assert fn args', largeGroup: 'assert fn args'}
          return `${testCase} ${fnReturnType}`
        },
      }),
      tags: {goodFn, assertFnArgs, testCase, fnReturnType},
      createTestLines: {
        method: 'sample',
        shape: {
          source: sourceCode,
          clock: clockCode,
          target: {
            field: targetCode,
            markError: separate({
              source: {fnReturnType},
              variant: {
                _: {
                  exact: {fnReturnType: 'exact'},
                  exactBad: {fnReturnType: 'exact bad'},
                  exactNullable: {fnReturnType: 'exact nullable'},
                },
              } as const,
              cases: {
                exact: value<TargetCases[]>(['exactBad', 'exactBadNarrow']),
                exactBad: value<TargetCases[]>([
                  'exact',
                  'narrow',
                  'exactNullable',
                  'exactNarrow',
                ]),
                exactNullable: value<TargetCases[]>([
                  'exact',
                  'exactBad',
                  'exactBadNarrow',
                  'exactExactBad',
                  'exactNarrow',
                  'narrow',
                ]),
                _: value(false),
              },
            }),
          },
          fn: {
            field: fnCode,
            markError: bool({source: {goodFn}, true: {goodFn: false}}),
          },
        },
      },
    },
  })
}

const header = `
// trigger types
type DataExact = {c: number; d: string}
type DataSrc = {c: number}
type DataClk = {d: string}

// fn return types
type Exact = {a: number; b: string}
type ExactBad = {a: string; b: string}
type Narrow = {a: number}
type ExactNullable = {a: number; b: string} | null
type ExactNarrow = {a: number; b: string} | {a: number}
type ExactBadNarrow = {a: string; b: string} | {a: number}
type ExactExactBad = {a: number; b: string} | {a: string; b: string}

const exact = createEvent<{a: number; b: string}>()
const exactBad = createEvent<{a: string; b: string}>()
const narrow = createEvent<{a: number}>()
const exactNullable = createEvent<{a: number; b: string} | null>()
const exactNarrow = createEvent<{a: number; b: string} | {a: number}>()
const exactBadNarrow = createEvent<{a: string; b: string} | {a: number}>()
const exactExactBad = createEvent<
  {a: number; b: string} | {a: string; b: string}
>()

const clockExact = createEvent<{c: number; d: string}>()
const clockExactBad = createEvent<{c: string; d: string}>()
const clockNarrow = createEvent<{c: number}>()
const clockExactNullable = createEvent<{c: number; d: string} | null>()
const clockExactNarrow = createEvent<{c: number; d: string} | {c: number}>()
const clockExactBadNarrow = createEvent<{c: string; d: string} | {c: number}>()
const clockExactExactBad = createEvent<
  {c: number; d: string} | {c: string; d: string}
>()

const dataClock = createEvent<{d: string}>()

const $c = createStore<number>(0)
const $d = createStore<string>('')

const $dataExact = createStore<{c: number; d: string}>({c: 0, d: ''})
const $dataSrc = createStore<{c: number}>({c: 0})
`

function unitArray<Cases extends string>({
  cases,
  isArray,
  isActive,
}: {
  cases: Cases[]
  isArray?: Flag | Bool | DataDecl<boolean>
  isActive?: Flag | Bool | DataDecl<boolean>
}) {
  if (!isArray) {
    isArray = value(true)
  }
  if (!isActive) {
    isActive = value(true)
  }
  const selectedItems = separate({
    source: {isArray, isActive},
    variant: {
      flag: {
        array: {isArray: true, isActive: true},
        item: {isArray: false, isActive: true},
      },
    },
    cases: {
      array: permute({
        items: cases,
        amount: {
          min: 2,
          max: 2,
        },
        noReorder: true,
        sort: cases,
      }),
      item: permute({
        items: cases,
        amount: {
          min: 1,
          max: 1,
        },
        noReorder: true,
        sort: cases,
      }),
      __: value([] as Cases[]),
    },
  })
  const currentValue = computeFn({
    source: {selectedItems, isArray},
    fn({selectedItems, isArray}) {
      if (isArray) {
        return selectedItems
      } else {
        return selectedItems[0]
      }
    },
  })
  const flags: {
    [K in Cases as `has${Capitalize<K>}`]: Fn<boolean>
  } = {} as any
  for (const key of cases) {
    const resultKey = `has${key[0].toUpperCase()}${key.slice(1)}`
    // @ts-expect-error
    flags[resultKey] = computeFn({
      source: {selectedItems, isActive},
      fn: ({selectedItems, isActive}) =>
        isActive ? selectedItems.includes(key) : false,
    })
  }
  return [currentValue, flags] as const
}
