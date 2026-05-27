/**
 * Investable on/off pill toggle.
 *
 * Props:
 *   checked    – boolean
 *   onChange   – () => void
 *   disabled   – boolean (optional)
 *   label      – accessible label string (optional, for screen readers)
 */
export default function Toggle({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ?? (checked ? 'Investable' : 'Non-investable')}
      disabled={disabled}
      onClick={onChange}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2',
        'focus-visible:ring-green-500 focus-visible:ring-offset-2',
        checked ? 'bg-green-500' : 'bg-gray-200',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow',
          'transform transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}
