package main

import (
	"context"

	"github.com/cocreators-ee/zappaclang"
)

// Config contains the stored GUI options
type Config struct {
	LastState string
}

// State is current state of zappac
type State struct {
	Err       string
	Result    string
	History   []HistoryItem
	Variables map[string]string
}

// HistoryItem is a single item in history
type HistoryItem struct {
	Input  string
	Result string
}

// ParseResult is the result of Parse()
type ParseResult struct {
	Nodes []zappaclang.Node
	Err   string
}

// ExecResult is the result of Exec()
type ExecResult struct {
	Ok    bool
	State *State
}

// App struct
type App struct {
	ctx   context.Context
	zs    *zappaclang.ZappacState
	state *State
}

// NewApp creates a new App application struct
func NewApp() *App {
	// Load app config
	config := Config{LastState: ""}
	zs := zappaclang.NewZappacState(config.LastState)

	app := &App{
		zs: zs,
		state: &State{
			Err:       "",
			Result:    "",
			History:   []HistoryItem{},
			Variables: map[string]string{},
		},
	}

	// zs.OnSave = app.onSave

	return app
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Called when ZappacState executes save(foo) -instructions
//func (a *App) onSave() {
//}

// GetState returns current state
func (a *App) GetState() *State {
	return a.state
}

// Parse parses
func (a *App) Parse(input string) ParseResult {
	nodes, err := zappaclang.Parse(input)
	errorText := ""
	if err != nil {
		errorText = err.Error()
	}
	pr := ParseResult{
		Nodes: nodes,
		Err:   errorText,
	}
	return pr
}

// Exec executes the given input
func (a *App) Exec(input string, updateVariables bool) ExecResult {
	er := ExecResult{
		Ok:    false,
		State: nil,
	}

	nodes, err := zappaclang.Parse(input)
	if err != nil {
		a.state.Err = err.Error()
		er.State = a.GetState()
		return er
	}

	result, err := a.zs.Exec(nodes, updateVariables)
	if err != nil {
		a.state.Err = err.Error()
		er.State = a.GetState()
		return er
	}

	a.state.Result = result
	a.state.Err = ""

	if updateVariables {
		a.state.History = append([]HistoryItem{{input, result}}, a.state.History...)
		a.state.Variables = map[string]string{}

		if nodes[0].Type() == zappaclang.NodeClear {
			a.state.History = []HistoryItem{}
		}

		for key, value := range a.zs.Variables {
			a.state.Variables[key] = value.String()
		}
	}

	er.Ok = true
	er.State = a.GetState()
	return er
}
