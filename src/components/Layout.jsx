export function Layout({ header, controls, viewport, editor }) {
  return (
    <div className="app-layout">
      <div className="app-header">{header}</div>
      <div className="app-controls">{controls}</div>
      <div className="app-viewport">{viewport}</div>
      <div className="app-editor">{editor}</div>
    </div>
  )
}
