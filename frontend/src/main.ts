import "./style.css"
import App from "./Zappac.svelte"

import "@fontsource-variable/jetbrains-mono"
import "@fontsource-variable/merriweather-sans"

const app = new App({
  target: document.getElementById("app"),
})

export default app
