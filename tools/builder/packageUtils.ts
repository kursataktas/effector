export function issueUrl(tag: string) {
  return `https://github.com/effector/effector/issues?q=is:issue+label:${tag}`
}

export function compiledFile(name: string) {
  return [`${name}.js`, `${name}.js.map`]
}

export function esmFile(name: string) {
  return [`${name}.mjs`, `${name}.mjs.map`]
}

export function getFiles(name: string) {
  return [
    'README.md',
    'LICENSE',
    'index.d.ts',
    //js files
    ...esmFile(name),
    ...compiledFile(`${name}.cjs`),
    ...compiledFile('compat'),
    `${name}.cjs.d.ts`,
    `${name}.mjs.d.ts`,
    'compat.d.ts',
  ]
}

/** usage: extensionlessExport('./inspector') */
export function extensionlessExport(path: string) {
  return {
    types: `${path}.d.ts`,
    import: `${path}.mjs`,
    require: `${path}.js`,
    default: `${path}.mjs`,
  }
}

/** usage: rootExport('./effector-react') */
export function rootExport(path: string) {
  return {
    types: `./index.d.ts`,
    import: `${path}.mjs`,
    require: `${path}.cjs.js`,
    default: `${path}.mjs`,
  }
}
