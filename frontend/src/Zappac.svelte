<script lang="ts">
  import {
    error,
    exec,
    history,
    input,
    parsedNodes,
    placeholderResult,
    result,
    variables,
  } from "./lib/state.js"
  import { onDestroy, onMount } from "svelte"
  import { numberFormat, parseInputText } from "./lib/formatting"
  import keysight from "keysight"

  let formatNumbers = true
  let inputText = ""
  let historyItems = []
  let inputField = []
  let cursor = -1

  type Node = {
    value: string
    classes: string[]
  }

  $: {
    inputText = $input
    historyItems = $history
    inputField = parseInputText(inputText, $parsedNodes, formatNumbers)
  }

  async function onInput(evt: KeyboardEvent) {
    const code = evt.keyCode
    const sight = keysight(evt)
    const key = sight.key

    // https://stackoverflow.com/a/12467610/3989287
    const printable =
      (code > 47 && code < 58) || // number keys
      code == 32 ||
      code == 13 || // spacebar & return key(s) (if you want to allow carriage returns)
      (code > 64 && code < 91) || // letter keys
      (code > 95 && code < 112) || // numpad keys
      (code > 185 && code < 193) || // ;=,-./` (in order)
      (code > 218 && code < 223) // [\]' (in order)

    if (key === "\n") {
      if (await exec(inputText)) {
        cursor = -1
      }
    } else if (key === "a" && evt.ctrlKey) {
      // Ctrl+a
      evt.preventDefault()
    } else if (key === "\b") {
      if (inputText.length > 0) {
        input.set(inputText.substring(0, inputText.length - 1))
      }
      evt.preventDefault()
    } else if (key === "up") {
      if (historyItems.length > cursor + 1) {
        cursor++
        input.set(historyItems[cursor].Input)
      }
    } else if (key === "down") {
      if (cursor >= 0) {
        cursor--

        if (cursor >= 0) {
          input.set(historyItems[cursor].Input)
        } else {
          input.set("")
        }
      }
    } else if (printable) {
      input.set(inputText + evt.key)
    }
  }

  onMount(() => {
    if (typeof window === "undefined") {
      return
    }

    window.addEventListener("keydown", onInput)
  })

  onDestroy(() => {
    if (typeof window === "undefined") {
      return
    }

    window.removeEventListener("keydown", onInput)
  })
</script>

<main>
  <div class={"input " + (inputText === "" ? "placeholder" : "")} title={inputText}>
    {#if inputField.length > 0}
      <!-- Important to keep these connected to not hallucinate spaces -->
      {#each inputField as node}<span class={node.classes.join(" ")}>{node.value}</span>{/each}
    {:else}
      Try e.g. help()
    {/if}
  </div>
  <div class="info">
    {#if $error}
      <div class="error">
        {$error}
      </div>
    {/if}
    {#if $placeholderResult !== ""}
      <div class="result placeholder">
        <span class="number">{numberFormat($placeholderResult, formatNumbers)}</span>
      </div>
    {:else if $result}
      <div class="result">
        <span class="number">{numberFormat($result, formatNumbers)}</span>
      </div>
    {/if}
    {#if $variables.length > 0}
      <div class="variables">
        {#each $variables as variable}
          <div class="variable-row">
            <span class="variable">{variable.name}</span> <span class="equals">=</span>
            <span class="number">{numberFormat(variable.value, formatNumbers)}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  {#if $history.length}
    <div class="history">
      {#each $history as item, idx}
        <div class={"history-row " + (idx === cursor ? "current" : "")}>
          <span class="history-input">{item.Input}</span>
          {#if !item.Input.includes("=")}
            <span class="equals">=</span>
            <span class="history-result">{numberFormat(item.Result || 0, formatNumbers)}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
  <div class="settings">
    <div class="content">
      <label>
        <input type="checkbox" bind:checked={formatNumbers} />
        Format numbers
      </label>
    </div>
  </div>
  <footer>
    <div class="content">
      Zappac is a calculator -
      <a href="https://github.com/cocreators-ee/zappac-app" target="_blank" rel="noreferrer"
        >GitHub</a
      >
    </div>
  </footer>
</main>

<style lang="scss">
  $padding: 0.25rem 0.5rem;
  $monospace: "JetBrains Mono Variable", sans-serif;

  main {
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .input {
    --wails-draggable: drag;
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    padding: $padding;
    color: white;
    font-family: $monospace;
    min-height: 1.325rem;

    &.placeholder {
      color: gray;
    }
  }

  .info {
    --wails-draggable: drag;
    flex-grow: 1;
    font-family: $monospace;

    .error {
      padding: $padding;
      background: #1c0000;
      color: #ff4385;

      &:first-letter {
        text-transform: capitalize;
      }
    }

    .result {
      padding: $padding;
      overflow-wrap: break-word;

      &.placeholder {
        opacity: 0.6;
      }
    }

    .variables {
      padding: $padding;
      margin-top: 1rem;

      .variable {
      }

      .equals {
        margin: 0 0.5rem;
      }

      .number {
        overflow-wrap: break-word;
      }
    }
  }

  .history {
    --wails-draggable: drag;
    font-family: $monospace;
    flex-shrink: 1;
    overflow: hidden;
    padding: $padding;
    color: #999;
    display: flex;
    flex-direction: column-reverse;

    .equals {
      color: #555;
    }

    .history-result {
      color: #92d2d5;
    }

    .current {
      color: #d0d0d0;
      text-decoration: underline;
    }
  }

  .settings {
    padding: $padding;
    border-top: 1px solid rgba(0, 0, 0, 0.3);

    .content {
      margin: 0.5rem 0;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 0.75rem;

      label,
      input {
        cursor: pointer;
      }
    }
  }

  label,
  footer {
    user-select: none;
  }

  footer {
    --wails-draggable: drag;
    padding: $padding;
    background: rgba(0, 0, 0, 0.2);
    border-top: 1px solid rgba(0, 0, 0, 0.3);

    .content {
      padding: 0.5rem 0;
    }

    a {
      color: #6ec7fc;
    }
  }

  /* "Syntax" highlighting */
  .operator {
    color: #8fff8f;
    font-weight: 700;
  }

  .assign,
  .equals {
    color: #7e7e7e;
  }

  .value,
  .number {
    color: #9dfcff;
  }

  // Should be after .value as some are .value.variable
  .variable {
    color: #00a5e0;
  }

  .unparsed {
    color: #7e7e7e;
  }
</style>
