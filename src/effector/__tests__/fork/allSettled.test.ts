import {
  createDomain,
  createEffect,
  createEvent,
  attach,
  fork,
  allSettled,
  sample,
  serialize,
  createStore,
  combine,
} from 'effector'

test('allSettled first argument validation', async () => {
  await expect(
    //@ts-expect-error
    allSettled(null, {scope: fork()}),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"first argument should be unit"`,
  )

  await expect(
    allSettled(
      createEffect(() => {}),
      {scope: fork()},
    ),
  ).resolves.toEqual({status: 'done', value: undefined})

  await expect(
    allSettled(createEvent(), {scope: fork()}),
  ).resolves.toBeUndefined()

  await expect(
    allSettled(createStore(0), {scope: fork(), params: 10}),
  ).resolves.toBeUndefined()

  await expect(
    // @ts-expect-error
    allSettled(createDomain(), {scope: fork()}),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"first argument accepts only effects, events, stores or scopes"`,
  )
})

test('derived units are not accepted', async () => {
  const $foo = createStore(0)
  const $bar = combine($foo, x => x)

  const trigger = createEvent()
  const derived = trigger.map(x => x)

  const scope = fork()

  await expect(
    // @ts-expect-error
    allSettled($bar, {scope, params: 1}),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"[allSettled] unit '$bar': unit should be targetable"`,
  )

  await expect(
    // @ts-expect-error
    allSettled(derived, {scope}),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"[allSettled] unit 'trigger → *': unit should be targetable"`,
  )
})

test('allSettled(scope)', async () => {
  const scope = fork()
  const requestFx = createEffect(() => new Promise(rs => setTimeout(rs, 400)))
  const $done = createStore(false)
  sample({
    clock: requestFx.done,
    target: $done,
    fn: () => true,
  })
  allSettled(requestFx, {scope})
  await allSettled(scope)
  expect(serialize(scope)).toMatchInlineSnapshot(`
    Object {
      "-es2ed7": true,
    }
  `)
})

describe('allSettled return value', () => {
  test('in case of effect resolving', async () => {
    const fx = createEffect(async () => 'ok')
    const scope = fork()
    const result = await allSettled(fx, {scope})
    expect(result).toEqual({status: 'done', value: 'ok'})
  })
  test('in case of effect rejecting', async () => {
    const fx = createEffect(async () => Promise.reject('err'))
    const scope = fork()
    const result = await allSettled(fx, {scope})
    expect(result).toEqual({status: 'fail', value: 'err'})
  })
  test('in case of event call', async () => {
    const event = createEvent()
    const scope = fork()
    const result = await allSettled(event, {scope})
    expect(result).toBe(undefined)
  })
  test('in case of store call', async () => {
    const $store = createStore('value')
    const scope = fork()
    const result = await allSettled($store, {scope, params: 'value in scope'})
    expect(result).toBe(undefined)
  })
  describe('attach support', () => {
    test('throw in original effect', async () => {
      const original = createEffect<void, any>(async () =>
        Promise.reject('err'),
      )
      const fx = attach({
        effect: original,
        mapParams: (_: void) => {},
      })
      const scope = fork()
      const result = await allSettled(fx, {scope})
      expect(result).toEqual({status: 'fail', value: 'err'})
    })
    test('throw in mapParams', async () => {
      const original = createEffect<void, any>(async () =>
        Promise.reject('err'),
      )
      const fx = attach({
        effect: original,
        mapParams(_: void) {
          throw 'mapParams error'
        },
      })
      const scope = fork()
      const result = await allSettled(fx, {scope})
      expect(result).toEqual({status: 'fail', value: 'mapParams error'})
    })
  })
})

describe('transactions', () => {
  test('add unit to domain during watch', async () => {
    const trigger = createEvent()
    const eff = createEffect(async () => {
      await new Promise(rs => setTimeout(rs, 50))
    })
    eff.done.watch(() => {
      const newEvent = createEvent()
    })
    sample({
      source: trigger,
      target: eff,
    })
    const scope = fork()
    await allSettled(trigger, {scope})
  })
  test('', async () => {
    const inner1 = createEffect(async (x: string) => {
      await new Promise(rs => setTimeout(rs, 50))
    })
    const inner2 = createEffect(async (x: string) => {
      await new Promise(rs => setTimeout(rs, 50))
    })
    const req1 = createEffect(async (x: string) => {
      await inner1(x)
      await inner2(x)
      await inner1(`${x} 2`)
    })
    const words = createStore<string[]>([]).on(
      inner2.done,
      (list, {params: word}) => [...list, word],
    )
    const trigger = createEvent<string>()
    const str = createStore('-').on(trigger, (_, x) => x)

    sample({
      source: str,
      target: req1,
    })

    const scope1 = fork()
    const promise1 = allSettled(trigger, {
      scope: scope1,
      params: 'a',
    })
    expect(() => {
      const inner1 = createEffect(async (x: string) => {
        await new Promise(rs => setTimeout(rs, 50))
      })
      const inner2 = createEffect(async (x: string) => {
        await new Promise(rs => setTimeout(rs, 40))
      })
      const req1 = createEffect(async (x: string) => {
        await Promise.all([inner1(x), inner2(x)])
      })
      const words = createStore<string[]>([]).on(
        inner2.done,
        (list, {params: word}) => [...list, word],
      )
      const str = createStore('-').on(trigger, (_, x) => x)

      sample({
        source: str,
        target: req1,
      })
    }).not.toThrow()
    const scope2 = fork()
    const promise2 = allSettled(trigger, {
      scope: scope2,
      params: 'b',
    })
    await promise1
    expect(() => {
      const inner1 = createEffect(async (x: string) => {
        await new Promise(rs => setTimeout(rs, 50))
      })
      const inner2 = createEffect(async (x: string) => {
        await new Promise(rs => setTimeout(rs, 50))
      })
      const req1 = createEffect(async (x: string) => {
        await inner1(x)
        await inner2(x)
      })
      const words = createStore<string[]>([]).on(
        inner2.done,
        (list, {params: word}) => [...list, word],
      )
      const str = createStore('-').on(trigger, (_, x) => x)

      sample({
        source: str,
        target: req1,
      })
    }).not.toThrow()
    await promise2
    expect(serialize(scope1)).toMatchInlineSnapshot(`
      Object {
        "-36m1p8": "a",
        "qutrpb": Array [
          "a",
        ],
      }
    `)
    expect(serialize(scope2)).toMatchInlineSnapshot(`
      Object {
        "-36m1p8": "b",
        "-7ytzr6": "b",
        "-bi6cil": Array [
          "b",
        ],
        "qutrpb": Array [
          "b",
        ],
      }
    `)
  })
  test('starting store is serialized', async () => {
    const $store = createStore('value')
    const scope = fork()

    await allSettled($store, {scope, params: 'value in scope'})
    expect(serialize(scope)).toMatchObject({
      [$store.sid as string]: 'value in scope',
    })
    expect(scope.getState($store)).toEqual('value in scope')
  })
  test('starting store is serialized with correct value, if affected twice', async () => {
    const $store = createStore('value')
    sample({
      source: $store,
      filter: str => !str.includes('1'),
      fn: str => str + '1',
      target: $store,
    })
    const scope = fork()

    await allSettled($store, {scope, params: 'value in scope'})
    expect(serialize(scope)).toMatchObject({
      [$store.sid as string]: 'value in scope1',
    })
    expect(scope.getState($store)).toEqual('value in scope1')
  })
})
