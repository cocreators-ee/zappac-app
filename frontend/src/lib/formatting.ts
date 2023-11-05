import * as nodes from "./nodes"

export function parseInputText(inputText, parsedNodes, formatNumbers) {
  const result = []
  let lastPos = 0
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
    const start = node.Pos
    const end = right !== undefined ? right.Pos : start
    let value = inputText.substring(start, end)

    let classes = [node.NodeType]
    if (nodes.values.includes(node.NodeType)) {
      classes.push("value")
    }
    if (node.NodeType === "Number") {
      value = numberFormat(value, formatNumbers)
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

    lastPos = end
  })

  if (lastPos < inputText.length) {
    result.push({
      value: inputText.substr(lastPos),
      classes: ["unparsed"],
    })
  }

  return result
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
