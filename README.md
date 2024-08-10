## Summary

- Created a classic Tetris game using RxJS Observable streams and functional programming for efficient state management.
- Managed game state through RxJS Observable, using scan and merge operators to handle state transitions.
- Designed the game to progressively increase difficulty by accelerating block descent and adding obstacles.
- Implemented key features such as high score tracking, shape previews, and seamless game restarts without page reloads.
- Applied small, reusable, and pure functions to enhance code readability and maintainability.
- Utilized higher-order functions, currying, and function composition for optimized code execution.
- Explored advanced RxJS operators and developed custom Observables to enrich the gameplay experience.


## Usage

Setup (requires node.js):
```
> npm install
```

Start tests:
```
> npm test
```

Serve up the App (and ctrl-click the URL that appears in the console)
```
> npm run dev
```

## Implementing features

There are a few files you may wish to modify. The rest should **not** be modified as they are used for configuring the build.

`src/main.ts`
- Code file used as the entry point
- Most of your game logic should go here
- Contains main function that is called on page load

`src/style.css`
- Stylesheet
- You may edit this if you wish

`index.html`
- Main html file
- Contains scaffold of game window and some sample shapes
- Feel free to add to this, but avoid changing the existing code, especially the `id` fields

`test/*.test.ts`
- If you want to add tests, these go here
- Uses ![`vitest`](https://vitest.dev/api/)

We expect the core logic of your game to be in `src/main.ts`, however, you may elect to spread your code over multiple files. In this case, please use ![TS Modules](https://www.typescriptlang.org/docs/handbook/modules.html).

Avoid separating code into too many files as it makes it hard to mark. The maximum recommended code file structure would be something like

```
src/
  main.ts        -- main code logic inc. core game loop
  types.ts       -- common types and type aliases
  util.ts        -- util functions
  state.ts       -- state processing and transformation
  view.ts        -- rendering
  observable.ts  -- functions to create Observable streams
```
