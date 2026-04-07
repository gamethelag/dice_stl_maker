function GTLogo({ size = 32, color = '#FF8826' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <path
        fill={color}
        d="M 243.74998,79.473185 79.473185,243.74998 v 5.2e-4 12.49949 l 164.276795,164.2768 h 5.2e-4 12.49949 l 164.2768,-164.2768 V 243.7505 l -37.94446,-37.94446 -8.83873,-8.83925 -9.83868,8.83925 h -16.67754 l 37.94394,37.94394 v 12.50001 L 256.24999,385.17132 H 243.74998 L 114.82865,256.24999 V 243.74998 L 243.74998,114.82865 h 12.50001 l 47.98984,47.98984 h 35.35546 L 256.24999,79.473185 H 243.7505 Z m -21.78317,92.493575 -78.03296,78.03348 88.3884,88.38789 26.51673,-26.51621 -0.0336,-83.34478 h -41.43261 l -6.48436,17.25786 h 30.50201 v 48.17949 l -9.06818,9.06869 -53.03294,-53.13681 53.03294,-52.92958 h 35.35547 v 141.42134 l 25.00002,-25.00002 V 196.96679 h 54.86022 l 25.00002,-25.00003 z"
      />
    </svg>
  )
}

export function Header({ onExport, isBuilding, isExporting }) {
  return (
    <>
      <div className="app-brand">
        <GTLogo size={60} />
        <h1 className="app-title">GT's OpenDice</h1>
      </div>
      <button
        className="btn-export"
        onClick={onExport}
        disabled={isBuilding || isExporting}
      >
        {isExporting ? 'Exporting…' : isBuilding ? 'Building…' : 'Export STL'}
      </button>
    </>
  )
}
