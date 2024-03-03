import * as nodes from "./nodes"

const DEBUG_PARSE = false

export function parseInputText(inputText, parsedNodes, formatNumbers, cursorX) {
  const result = []
  let lastPos = 0
  let hasCursor = false
  let cursorNodePos = 0
  let cursorWithinNode = false

  DEBUG_PARSE && console.table(parsedNodes)

  function addCursor(nodePos, withinNode) {
    if (!hasCursor) {
      result.push({ value: "", classes: ["cursor"] })
      cursorNodePos = nodePos
      cursorWithinNode = withinNode
      hasCursor = true
    }
  }

  if (cursorX === 0) {
    addCursor(0, false)
  }

  function addNode(value, node) {
    let classes = [node.NodeType]
    if (nodes.values.includes(node.NodeType)) {
      classes.push("value")
    }
    if (node.NodeType === "Variable") {
      classes.push("variable")
    }
    if (node.NodeType === "Assign") {
      classes.push("assign")
    }
    if (nodes.functions.includes(node.NodeType)) {
      classes.push("function")
    }
    if (nodes.operators.includes(node.NodeType)) {
      classes.push("operator")
    }

    result.push({
      value: value,
      classes: classes,
    })
  }

  parsedNodes.forEach((node, idx) => {
    if (node.NodeType == "EOF" || node.NodeType == "ParsingStopped") {
      // Nothing much to do
      lastPos = node.Pos
      return
    }
    if (node.NodeType == "ParsingStopped") {
      // We should stop here because nothing after this is known
      lastPos = node.Pos
      return
    }

    const right = parsedNodes[idx + 1]
    let start = node.Pos
    const end = right !== undefined ? right.Pos : start + node.value.length
    let value = inputText.substring(start, end)
    if (node.NodeType === "Number") {
      value = numberFormat(value, formatNumbers)
    }

    if (start === cursorX) {
      addCursor(idx, false)
    } else if (!hasCursor && cursorX < end) {
      // Cursor within node, split it
      if (node.NodeType === "Number") {
        // Numbers include "imaginary" commas
        let split = cursorX - start
        // Move cursor forward by amount of commas to the left
        const commas = value.substring(0, split).split(",").length - 1
        split += commas
        if (value[split] === ",") {
          // If splitting left of a comma, jump to the right side of it
          split += 1
        }
        const left = value.substring(0, split)
        addNode(left, node)
        addCursor(idx, true)
        start = split
        value = value.substring(split)
      } else {
        const left = inputText.substring(start, cursorX)
        addNode(left, node)
        addCursor(idx, true)
        start = cursorX
        value = inputText.substring(start, end)
      }
    }

    DEBUG_PARSE && console.log(start, end, value)
    addNode(value, node)

    lastPos = end
  })

  if (lastPos < inputText.length) {
    result.push({
      value: inputText.substr(lastPos),
      classes: ["unparsed"],
    })
  }

  if (cursorX === inputText.length) {
    addCursor(parsedNodes.length, false)
  }

  DEBUG_PARSE && console.table(result)

  return {
    cursorWithinNode: cursorWithinNode,
    cursorNodePos: cursorNodePos,
    inputField: result,
  }
}

const NumberFormatter = new Intl.NumberFormat()

export function numberFormat(input: string, formatNumbers: boolean): string {
  if (!formatNumbers) {
    return input
  }

  // 0xff 0755 b0001
  if (input.length > 1 && ["0", "b"].includes(input[0])) {
    return input
  }

  // @ts-ignore
  const result = NumberFormatter.format(input)

  if (result === "NaN") {
    return input
  }

  return result
}
