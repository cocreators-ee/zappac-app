import { writable } from "svelte/store"
import * as App from "../../wailsjs/go/main/App"
import { nodeType } from "./nodes"

type Variable = {
  name: string
  value: string
}

type HistoryItem = {
  Input: string
  Result: string
}

export const input = writable<string>("")
export const error = writable<string>("")
export const result = writable<string>("")
export const history = writable<HistoryItem[]>([])
export const variables = writable<Variable[]>([])
export const parsedNodes = writable<[]>([])
export const placeholderResult = writable<string>("")

function setStateResponse(state) {
  error.set(state.Error)
  result.set(state.Result)
  history.set(state.History)

  // Sort variables
  const vars = []
  const keys = Object.keys(state.Variables)
  keys.sort()
  for (let key of keys) {
    vars.push({
      name: key,
      value: state.Variables[key],
    })
  }

  variables.set(vars)
}

export async function getState() {
  const state = await App.GetState()
  setStateResponse(state)
}

export async function exec(inputText: string): Promise<boolean> {
  const execResult = await App.Exec(inputText, true)
  setStateResponse(execResult.State)
  if (execResult.Ok) {
    input.set("")
  }

  return execResult.Ok
}

export async function parse(inputText: string): Promise<boolean> {
  const parseResult = await App.Parse(inputText)
  error.set(parseResult.Err)

  const nodes = parseResult.Nodes.map((node) => {
    node.NodeType = nodeType[node.NodeType]
    return node
  })

  parsedNodes.set(nodes)

  return parseResult.Err === ""
}

getState().then(() => {
  console.log("Loaded initial state")
})

// Always when input changes, automatically run parsing
input.subscribe(async (inputText) => {
  if (await parse(inputText)) {
    // If parsing succeeds, do a proactive placeholder exec
    const execResult = await App.Exec(inputText, false)
    if (execResult.Ok) {
      placeholderResult.set(execResult.State.Result)
    } else {
      placeholderResult.set("")
    }
  }
})
