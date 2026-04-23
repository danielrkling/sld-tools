import { createSignal, onCleanup } from "solid-js";


// A nested child component
function TaskItem(props) {
  return html`<li class="task-item">
      <span style=${{
        "text-decoration": props.completed ? "line-through" : "none",
      }}>
        ${props.text}
      </span>
      <button onClick=${props.onDelete(props.id)}>Delete</button>
    </li>`;
}

// Main Component
export default function TodoApp() {
  // 3. JSX Return
  return jsx`<div class="todo-app">
      <h2>My SolidJS Todo List</h2>
      <form onSubmit=${addTask}>
        <input type="text" value=${inputText()} onInput=${(e) => setInputText(e.target.value)} placeholder="Add a new task..." />
        <button type="submit">Add Task</button>
      </form>
      <ul>
        <${For} each=${tasks()} fallback=${jsx`<p>No tasks yet!</p>`}>
          ${(task) =>
            jsx`<${TaskItem} id=${task.id} text=${task.text} completed=${task.completed} onDelete=${deleteTask} />`}
        </${For}>
      </ul>
      <footer>
        <strong>Total Tasks:</strong> ${tasks().length}
      </footer>
    </div>`;
}
