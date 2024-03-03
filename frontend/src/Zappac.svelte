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
  let cursorNodePos = 0
  let cursorWithinNode = false
  let cursorY = -1
  let cursorX = 0
  let nodes = []

  type Node = {
    value: string
    classes: string[]
  }

  $: {
    inputText = $input
    historyItems = $history
    const parseResult = parseInputText(inputText, $parsedNodes, formatNumbers, cursorX)
    cursorNodePos = parseResult.cursorNodePos
    inputField = parseResult.inputField
    cursorWithinNode = parseResult.cursorWithinNode
    nodes = $parsedNodes
  }

  function getPrevNode(cursorNode) {
    const prevNode = nodes[cursorNode - 1]
    if (prevNode.NodeType === "EOF") {
      return getPrevNode(cursorNode - 1)
    }
    return prevNode
  }

  function getNextNode(cursorNode) {
    const nextNode = nodes[cursorNode + 1]
    if (nextNode.NodeType === "EOF") {
      return undefined
    }
    return nextNode
  }

  function getLastNodePos() {
    let lastNodePos = nodes.length - 1
    if (nodes[lastNodePos].NodeType === "EOF") {
      lastNodePos -= 1
    }
    return lastNodePos
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
        cursorY = -1
        cursorX = inputText.length
      }
    } else if (key === "a" && evt.ctrlKey) {
      // Ctrl+a
      evt.preventDefault()
    } else if (key === "\b") {
      // backspace
      if (inputText.length > 0) {
        if (evt.ctrlKey) {
          let left, right
          if (cursorWithinNode) {
            // Deleting the start of this node
            const node = nodes[cursorNodePos]
            left = inputText.substring(0, node.Pos)
            right = inputText.substring(cursorX)
            cursorX = node.Pos
          } else {
            // Between nodes, deleting previous node
            const node = getPrevNode(cursorNodePos)
            left = inputText.substring(0, node.Pos)
            right = inputText.substring(cursorX)
            cursorX = node.Pos
          }
          input.set(left + right)
        } else {
          // Delete previous character
          const left = inputText.substring(0, Math.max(cursorX - 1, 0))
          const right = inputText.substring(cursorX)
          input.set(left + right)
          if (cursorX > 0) {
            cursorX -= 1
          }
        }
      }
      evt.preventDefault()
    } else if (key === "delete") {
      if (inputText.length > 0) {
        if (evt.ctrlKey) {
          let left = ""
          let right = ""

          if (cursorWithinNode) {
            // Delete from cursor to the end of this node
            const node = getNextNode(cursorNodePos)
            left = inputText.substring(0, cursorX)
            if (node) {
              right = inputText.substring(node.Pos)
            }
          } else {
            // Between nodes, delete next node
            const lastNodePos = getLastNodePos()
            left = inputText.substring(0, cursorX)
            if (cursorNodePos < lastNodePos) {
              right = inputText.substring(nodes[cursorNodePos + 1].Pos)
            }
          }
          input.set(left + right)
        } else {
          // Delete next character
          const left = inputText.substring(0, cursorX)
          const right = inputText.substring(cursorX + 1)
          input.set(left + right)
        }
      }
    } else if (key === "left") {
      if (cursorX > 0) {
        if (evt.ctrlKey) {
          if (cursorNodePos === 0) {
            // Within first node, move to start
            cursorX = 0
          } else {
            if (cursorWithinNode) {
              // Move to start of current node
              cursorX = nodes[cursorNodePos].Pos
            } else {
              // Between nodes, move to start of previous node
              const prevNode = getPrevNode(cursorNodePos)
              cursorX = prevNode.Pos
            }
          }
        } else {
          // Move 1 position left
          cursorX -= 1
        }
      }
    } else if (key === "right") {
      if (cursorX < inputText.length) {
        if (evt.ctrlKey) {
          const lastNodePos = getLastNodePos()
          if (cursorNodePos >= lastNodePos) {
            // At the last visible node, move to end
            cursorX = inputText.length
          } else {
            // Move to the start of the next node
            cursorX = getNextNode(cursorNodePos).Pos
          }
        } else {
          // Move 1 position right
          cursorX += 1
        }
      }
    } else if (key === "up") {
      if (historyItems.length > cursorY + 1) {
        cursorY++
        input.set(historyItems[cursorY].Input)
      }
    } else if (key === "down") {
      if (cursorY >= 0) {
        cursorY--

        if (cursorY >= 0) {
          input.set(historyItems[cursorY].Input)
        } else {
          input.set("")
        }
      }
    } else if (key === "home") {
      cursorX = 0
    } else if (key === "end") {
      cursorX = inputText.length
    } else if (printable) {
      const left = inputText.substring(0, cursorX)
      const right = inputText.substring(cursorX)
      input.set(left + evt.key + right)
      cursorX += evt.key.length
    } else {
      console.log(`Ignored ${key}`)
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
        <div class={"history-row " + (idx === cursorY ? "current" : "")}>
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

  @keyframes blink {
    0% {
      opacity: 1;
    }
    49% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 0;
    }
  }

  .cursor {
    display: inline-block;
    background-color: #ffffffc0;
    width: 2px;
    height: 0.75rem;
    animation: blink 1200ms linear infinite;
  }
</style>
